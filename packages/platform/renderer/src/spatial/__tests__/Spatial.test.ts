import { describe, it, expect } from 'vitest';
import { OctreePartition } from '../OctreePartition';
import { RenderLocalityManager } from '../RenderLocalityManager';
import { StreamingZone } from '../StreamingZone';

describe('OctreePartition', () => {
  it('inserts and queries entities', () => {
    const tree = new OctreePartition(100);
    tree.insert('e1', { x: 5, y: 5, z: 5 });
    tree.insert('e2', { x: 80, y: 80, z: 80 });
    const nearby = tree.queryRadius({ x: 0, y: 0, z: 0 }, 20);
    expect(nearby).toContain('e1');
    expect(nearby).not.toContain('e2');
  });

  it('removes entities', () => {
    const tree = new OctreePartition(100);
    tree.insert('e1', { x: 5, y: 5, z: 5 });
    tree.remove('e1');
    expect(tree.getEntityCount()).toBe(0);
  });
});

describe('RenderLocalityManager', () => {
  it('queries within locality radius', () => {
    const mgr = new RenderLocalityManager(200, 50);
    mgr.addEntity({ id: 'near', position: { x: 10, y: 0, z: 0 }, renderPriority: 1 });
    mgr.addEntity({ id: 'far', position: { x: 100, y: 0, z: 0 }, renderPriority: 1 });
    const result = mgr.queryLocality({ x: 0, y: 0, z: 0 });
    expect(result.visibleEntities).toContain('near');
    expect(result.visibleEntities).not.toContain('far');
  });
});

describe('StreamingZone', () => {
  it('identifies active zones', () => {
    const sz = new StreamingZone();
    sz.addZone({ zoneId: 'z1', center: { x: 0, y: 0, z: 0 }, radius: 50, priority: 1, assetIds: ['a1'] });
    const active = sz.getActiveZones({ x: 10, y: 0, z: 0 });
    expect(active.length).toBe(1);
    expect(sz.getAssetsToLoad({ x: 10, y: 0, z: 0 })).toContain('a1');
  });
});
