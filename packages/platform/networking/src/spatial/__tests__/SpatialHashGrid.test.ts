/**
 * Tests for SpatialHashGrid, PriorityAccumulator, InterestManager, BandwidthAllocator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialHashGrid } from '../SpatialHashGrid';
import { PriorityAccumulator } from '../PriorityAccumulator';
import { InterestManager } from '../InterestManager';
import { BandwidthAllocator } from '../BandwidthAllocator';

// =============================================================================
// SpatialHashGrid
// =============================================================================

describe('SpatialHashGrid', () => {
  let grid: SpatialHashGrid;

  beforeEach(() => {
    grid = new SpatialHashGrid({ cellSize: 10 });
  });

  it('inserts and queries entities', () => {
    grid.insert({ entityId: 'e1', position: { x: 5, y: 5, z: 5 }, radius: 1 });
    const results = grid.queryRadius({ x: 5, y: 5, z: 5 }, 10);
    expect(results).toContain('e1');
  });

  it('finds entities within radius', () => {
    grid.insert({ entityId: 'near', position: { x: 3, y: 0, z: 0 }, radius: 0 });
    grid.insert({ entityId: 'far', position: { x: 100, y: 0, z: 0 }, radius: 0 });
    const results = grid.queryRadius({ x: 0, y: 0, z: 0 }, 10);
    expect(results).toContain('near');
    expect(results).not.toContain('far');
  });

  it('updates entity position', () => {
    grid.insert({ entityId: 'e1', position: { x: 0, y: 0, z: 0 }, radius: 0 });
    grid.insert({ entityId: 'e1', position: { x: 50, y: 0, z: 0 }, radius: 0 });
    const near = grid.queryRadius({ x: 0, y: 0, z: 0 }, 5);
    expect(near).not.toContain('e1');
    const far = grid.queryRadius({ x: 50, y: 0, z: 0 }, 5);
    expect(far).toContain('e1');
  });

  it('removes entities', () => {
    grid.insert({ entityId: 'e1', position: { x: 0, y: 0, z: 0 }, radius: 0 });
    grid.remove('e1');
    expect(grid.getEntityCount()).toBe(0);
    expect(grid.queryRadius({ x: 0, y: 0, z: 0 }, 100)).toHaveLength(0);
  });

  it('queries nearest sorted by distance', () => {
    grid.insert({ entityId: 'e1', position: { x: 10, y: 0, z: 0 }, radius: 0 });
    grid.insert({ entityId: 'e2', position: { x: 2, y: 0, z: 0 }, radius: 0 });
    grid.insert({ entityId: 'e3', position: { x: 5, y: 0, z: 0 }, radius: 0 });
    const nearest = grid.queryNearest({ x: 0, y: 0, z: 0 }, 2, 100);
    expect(nearest[0]).toBe('e2');
    expect(nearest[1]).toBe('e3');
    expect(nearest.length).toBe(2);
  });

  it('handles entities with large radius', () => {
    grid.insert({ entityId: 'big', position: { x: 50, y: 0, z: 0 }, radius: 45 });
    const results = grid.queryRadius({ x: 0, y: 0, z: 0 }, 10);
    expect(results).toContain('big');
  });

  it('converts world to cell coordinates', () => {
    const cell = grid.worldToCell({ x: 15, y: -5, z: 25 });
    expect(cell.x).toBe(1);
    expect(cell.y).toBe(-1);
    expect(cell.z).toBe(2);
  });

  it('clears all entities', () => {
    grid.insert({ entityId: 'e1', position: { x: 0, y: 0, z: 0 }, radius: 0 });
    grid.insert({ entityId: 'e2', position: { x: 10, y: 10, z: 10 }, radius: 0 });
    grid.clear();
    expect(grid.getEntityCount()).toBe(0);
    expect(grid.getCellCount()).toBe(0);
  });
});

// =============================================================================
// PriorityAccumulator
// =============================================================================

describe('PriorityAccumulator', () => {
  let accum: PriorityAccumulator;

  beforeEach(() => {
    accum = new PriorityAccumulator(undefined, 0.1, 100);
  });

  it('updates and retrieves priority', () => {
    accum.updateFactors('e1', { distance: 10, velocity: 5, interaction: 0.5, relevance: 0.8, staleness: 0 });
    expect(accum.getPriority('e1')).toBeGreaterThan(0);
  });

  it('closer entities get higher priority', () => {
    accum.updateFactors('near', { distance: 5 });
    accum.updateFactors('far', { distance: 100 });
    expect(accum.getPriority('near')).toBeGreaterThan(accum.getPriority('far'));
  });

  it('returns entities sorted by priority', () => {
    accum.updateFactors('low', { distance: 100, interaction: 0 });
    accum.updateFactors('high', { distance: 1, interaction: 1 });
    const sorted = accum.getByPriority();
    expect(sorted[0].entityId).toBe('high');
  });

  it('accumulates staleness over ticks', () => {
    accum.updateFactors('e1', { distance: 10 });
    const p1 = accum.getPriority('e1');
    // Simulate time passing
    const entry = accum.getByPriority()[0];
    entry.lastUpdateTime -= 5000; // 5 seconds ago
    accum.accumulateTick();
    expect(accum.getPriority('e1')).toBeGreaterThan(p1);
  });

  it('consumes priority after update sent', () => {
    accum.updateFactors('e1', { distance: 10, staleness: 5 });
    accum.consumePriority('e1');
    expect(accum.getPriority('e1')).toBe(0);
  });

  it('removes entities', () => {
    accum.updateFactors('e1', { distance: 10 });
    accum.removeEntity('e1');
    expect(accum.getEntityCount()).toBe(0);
  });
});

// =============================================================================
// BandwidthAllocator
// =============================================================================

describe('BandwidthAllocator', () => {
  let allocator: BandwidthAllocator;

  beforeEach(() => {
    allocator = new BandwidthAllocator({ totalBudgetBytesPerSec: 100_000 });
  });

  it('allocates bandwidth for a viewer', () => {
    const alloc = allocator.allocate('v1', [
      { entityId: 'e1', priority: 10 },
      { entityId: 'e2', priority: 5 },
    ]);
    expect(alloc.entityAllocations.length).toBe(2);
    expect(alloc.allocatedBytesPerSec).toBeGreaterThan(0);
  });

  it('higher priority gets more bandwidth', () => {
    const alloc = allocator.allocate('v1', [
      { entityId: 'high', priority: 100 },
      { entityId: 'low', priority: 1 },
    ]);
    const highAlloc = alloc.entityAllocations.find((a) => a.entityId === 'high')!;
    const lowAlloc = alloc.entityAllocations.find((a) => a.entityId === 'low')!;
    expect(highAlloc.bytesPerSec).toBeGreaterThan(lowAlloc.bytesPerSec);
  });

  it('tracks total usage', () => {
    allocator.allocate('v1', [{ entityId: 'e1', priority: 10 }]);
    expect(allocator.getTotalUsed()).toBeGreaterThan(0);
    expect(allocator.getUtilization()).toBeGreaterThan(0);
    expect(allocator.getUtilization()).toBeLessThanOrEqual(1);
  });

  it('releases bandwidth', () => {
    allocator.allocate('v1', [{ entityId: 'e1', priority: 10 }]);
    allocator.release('v1');
    expect(allocator.getTotalUsed()).toBe(0);
    expect(allocator.getAllocationCount()).toBe(0);
  });

  it('clears all allocations', () => {
    allocator.allocate('v1', [{ entityId: 'e1', priority: 10 }]);
    allocator.allocate('v2', [{ entityId: 'e2', priority: 10 }]);
    allocator.clear();
    expect(allocator.getTotalUsed()).toBe(0);
  });
});

// =============================================================================
// InterestManager
// =============================================================================

describe('InterestManager', () => {
  let manager: InterestManager;

  beforeEach(() => {
    manager = new InterestManager({ defaultViewRadius: 50, maxEntitiesPerUpdate: 10, cellSize: 10 });
  });

  it('adds entities and viewers', () => {
    manager.updateEntity({ entityId: 'e1', position: { x: 0, y: 0, z: 0 }, radius: 1 });
    manager.updateViewer({
      viewerId: 'v1',
      position: { x: 0, y: 0, z: 0 },
      viewDirection: { x: 1, y: 0, z: 0 },
      viewRadius: 50,
    });
    expect(manager.getEntityCount()).toBe(1);
    expect(manager.getViewerCount()).toBe(1);
  });

  it('computes interest set for viewer', () => {
    manager.updateEntity({ entityId: 'near', position: { x: 5, y: 0, z: 0 }, radius: 1 });
    manager.updateEntity({ entityId: 'far', position: { x: 200, y: 0, z: 0 }, radius: 1 });
    manager.updateViewer({
      viewerId: 'v1',
      position: { x: 0, y: 0, z: 0 },
      viewDirection: { x: 1, y: 0, z: 0 },
      viewRadius: 50,
    });

    const interestSet = manager.computeInterestSet('v1');
    expect(interestSet.entities.length).toBe(1);
    expect(interestSet.entities[0].entityId).toBe('near');
  });

  it('limits entities per update', () => {
    for (let i = 0; i < 20; i++) {
      manager.updateEntity({
        entityId: `e${i}`,
        position: { x: i, y: 0, z: 0 },
        radius: 0,
      });
    }
    manager.updateViewer({
      viewerId: 'v1',
      position: { x: 10, y: 0, z: 0 },
      viewDirection: { x: 1, y: 0, z: 0 },
      viewRadius: 50,
    });

    const interestSet = manager.computeInterestSet('v1');
    expect(interestSet.entities.length).toBeLessThanOrEqual(10);
  });

  it('returns empty set for unknown viewer', () => {
    const set = manager.computeInterestSet('unknown');
    expect(set.entities.length).toBe(0);
  });

  it('removes entities and viewers', () => {
    manager.updateEntity({ entityId: 'e1', position: { x: 0, y: 0, z: 0 }, radius: 1 });
    manager.removeEntity('e1');
    expect(manager.getEntityCount()).toBe(0);

    manager.updateViewer({
      viewerId: 'v1',
      position: { x: 0, y: 0, z: 0 },
      viewDirection: { x: 1, y: 0, z: 0 },
      viewRadius: 50,
    });
    manager.removeViewer('v1');
    expect(manager.getViewerCount()).toBe(0);
  });
});
