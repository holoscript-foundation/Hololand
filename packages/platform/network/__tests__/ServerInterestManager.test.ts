import { describe, it, expect, beforeEach } from 'vitest';
import {
  ServerInterestManager,
  type ServerInterestConfig,
} from '../src/ServerInterestManager';
import type { Vector3, SyncState, StateSnapshot } from '../src/types';

function v(x: number, y: number, z: number): Vector3 {
  return { x, y, z };
}

function makeState(
  objectId: string,
  position?: Vector3,
  extra?: Partial<SyncState>
): SyncState {
  return {
    objectId,
    position,
    timestamp: Date.now(),
    sequence: 0,
    ...extra,
  };
}

function makeSnapshot(states: SyncState[]): StateSnapshot {
  return { timestamp: Date.now(), sequence: 1, states };
}

describe('ServerInterestManager', () => {
  let manager: ServerInterestManager;

  beforeEach(() => {
    manager = new ServerInterestManager({
      defaultViewDistance: 100,
      cellSize: 50,
      priorityLevels: 3,
    });
  });

  // ==========================================================================
  // Construction
  // ==========================================================================

  describe('constructor', () => {
    it('creates with default config', () => {
      const m = new ServerInterestManager();
      const stats = m.getStats();
      expect(stats.viewerCount).toBe(0);
      expect(stats.entityCount).toBe(0);
    });

    it('applies custom config', () => {
      const m = new ServerInterestManager({
        defaultViewDistance: 200,
        cellSize: 100,
      });
      // Verify by adding a viewer at default distance
      m.addViewer('v1', v(0, 0, 0), 'room1');
      m.addEntity('e1', v(150, 0, 0));
      expect(m.isRelevantTo('v1', 'e1')).toBe(true); // 150 < 200
    });

    it('auto-extends priority rate multipliers', () => {
      const m = new ServerInterestManager({
        priorityLevels: 5,
        priorityRateMultipliers: [1, 2],
      });
      // 5 levels but only 2 multipliers → should auto-extend to 5
      m.addViewer('v1', v(0, 0, 0), 'room1');
      m.addEntity('e1', v(90, 0, 0)); // low priority
      // Should not crash
      const relevant = m.getRelevantEntities('v1');
      expect(relevant.length).toBe(1);
    });
  });

  // ==========================================================================
  // Viewer lifecycle
  // ==========================================================================

  describe('viewer lifecycle', () => {
    it('adds a viewer', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      expect(manager.hasViewer('v1')).toBe(true);
      expect(manager.getStats().viewerCount).toBe(1);
    });

    it('removes a viewer', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      manager.removeViewer('v1');
      expect(manager.hasViewer('v1')).toBe(false);
      expect(manager.getStats().viewerCount).toBe(0);
    });

    it('updates viewer position', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      manager.updateViewerPosition('v1', v(50, 0, 0));
      const viewer = manager.getViewer('v1');
      expect(viewer!.position).toEqual(v(50, 0, 0));
    });

    it('sets viewer distance', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      manager.setViewerDistance('v1', 200);
      const viewer = manager.getViewer('v1');
      expect(viewer!.viewDistance).toBe(200);
    });

    it('getViewer returns undefined for unknown viewer', () => {
      expect(manager.getViewer('ghost')).toBeUndefined();
    });

    it('getViewer returns a copy', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      const viewer = manager.getViewer('v1')!;
      viewer.position.x = 999;
      expect(manager.getViewer('v1')!.position.x).toBe(0);
    });

    it('updateViewerPosition is no-op for unknown viewer', () => {
      // Should not throw
      manager.updateViewerPosition('ghost', v(0, 0, 0));
    });

    it('setViewerDistance is no-op for unknown viewer', () => {
      manager.setViewerDistance('ghost', 200);
    });

    it('uses custom view distance per viewer', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1', 50);
      manager.addEntity('e1', v(75, 0, 0));
      expect(manager.isRelevantTo('v1', 'e1')).toBe(false); // 75 > 50
    });
  });

  // ==========================================================================
  // Entity lifecycle
  // ==========================================================================

  describe('entity lifecycle', () => {
    it('adds an entity', () => {
      manager.addEntity('e1', v(10, 0, 0));
      expect(manager.hasEntity('e1')).toBe(true);
      expect(manager.getStats().entityCount).toBe(1);
    });

    it('updates entity position', () => {
      manager.addEntity('e1', v(10, 0, 0));
      manager.updateEntityPosition('e1', v(50, 0, 0));
      expect(manager.hasEntity('e1')).toBe(true);
    });

    it('removes an entity', () => {
      manager.addEntity('e1', v(10, 0, 0));
      manager.removeEntity('e1');
      expect(manager.hasEntity('e1')).toBe(false);
    });

    it('removeEntity also clears always-relevant flag', () => {
      manager.addEntity('e1', v(10, 0, 0));
      manager.markAlwaysRelevant('e1');
      manager.removeEntity('e1');
      expect(manager.isAlwaysRelevant('e1')).toBe(false);
    });
  });

  // ==========================================================================
  // Always-relevant entities
  // ==========================================================================

  describe('always-relevant entities', () => {
    it('marks entity as always relevant', () => {
      manager.addEntity('global', v(1000, 0, 0));
      manager.markAlwaysRelevant('global');
      expect(manager.isAlwaysRelevant('global')).toBe(true);
    });

    it('unmarks entity', () => {
      manager.addEntity('global', v(1000, 0, 0));
      manager.markAlwaysRelevant('global');
      manager.unmarkAlwaysRelevant('global');
      expect(manager.isAlwaysRelevant('global')).toBe(false);
    });

    it('always-relevant entities are relevant regardless of distance', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      manager.addEntity('global', v(10000, 0, 0)); // way beyond view distance
      manager.markAlwaysRelevant('global');
      expect(manager.isRelevantTo('v1', 'global')).toBe(true);
    });

    it('always-relevant entities appear in getRelevantEntities', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      manager.addEntity('global', v(10000, 0, 0));
      manager.markAlwaysRelevant('global');
      const relevant = manager.getRelevantEntities('v1');
      const globalEntity = relevant.find((r) => r.entityId === 'global');
      expect(globalEntity).toBeDefined();
      expect(globalEntity!.priority).toBe(0);
      expect(globalEntity!.shouldUpdate).toBe(true);
    });

    it('always-relevant entities always get shouldUpdate=true', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      manager.addEntity('global', v(500, 0, 0));
      manager.markAlwaysRelevant('global');

      // Tick multiple times — always relevant should always update
      for (let i = 0; i < 10; i++) {
        manager.tick();
        const relevant = manager.getRelevantEntities('v1');
        const globalEntity = relevant.find((r) => r.entityId === 'global');
        expect(globalEntity!.shouldUpdate).toBe(true);
      }
    });
  });

  // ==========================================================================
  // Priority calculation
  // ==========================================================================

  describe('calculatePriority', () => {
    it('returns 0 (high) for close entities (≤33%)', () => {
      expect(manager.calculatePriority(0, 100)).toBe(0);
      expect(manager.calculatePriority(33, 100)).toBe(0);
    });

    it('returns 1 (medium) for mid-range entities (≤66%)', () => {
      expect(manager.calculatePriority(34, 100)).toBe(1);
      expect(manager.calculatePriority(66, 100)).toBe(1);
    });

    it('returns 2 (low) for far entities (≤100%)', () => {
      expect(manager.calculatePriority(67, 100)).toBe(2);
      expect(manager.calculatePriority(100, 100)).toBe(2);
    });

    it('returns -1 for out-of-range entities', () => {
      expect(manager.calculatePriority(101, 100)).toBe(-1);
      expect(manager.calculatePriority(500, 100)).toBe(-1);
    });

    it('returns 0 for zero distance', () => {
      expect(manager.calculatePriority(0, 100)).toBe(0);
    });
  });

  // ==========================================================================
  // Rate throttling
  // ==========================================================================

  describe('shouldUpdateThisTick', () => {
    it('priority 0 updates every tick', () => {
      for (let i = 0; i < 5; i++) {
        manager.tick();
        expect(manager.shouldUpdateThisTick(0)).toBe(true);
      }
    });

    it('priority 1 updates every 2nd tick', () => {
      const updates: boolean[] = [];
      for (let i = 0; i < 4; i++) {
        manager.tick();
        updates.push(manager.shouldUpdateThisTick(1));
      }
      // tickCount: 1,2,3,4 — mod 2: 1%2=1(false), 2%2=0(true), 3%2=1(false), 4%2=0(true)
      expect(updates).toEqual([false, true, false, true]);
    });

    it('priority 2 updates every 4th tick', () => {
      const updates: boolean[] = [];
      for (let i = 0; i < 8; i++) {
        manager.tick();
        updates.push(manager.shouldUpdateThisTick(2));
      }
      // Only tick 4 and 8 should be true (tickCount % 4 === 0)
      const trueCount = updates.filter(Boolean).length;
      expect(trueCount).toBe(2);
    });

    it('returns false for negative priority', () => {
      manager.tick();
      expect(manager.shouldUpdateThisTick(-1)).toBe(false);
    });

    it('returns false for priority beyond configured levels', () => {
      manager.tick();
      expect(manager.shouldUpdateThisTick(99)).toBe(false);
    });
  });

  // ==========================================================================
  // getRelevantEntities
  // ==========================================================================

  describe('getRelevantEntities', () => {
    it('returns entities within view distance', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      manager.addEntity('close', v(30, 0, 0));
      manager.addEntity('far', v(200, 0, 0));
      manager.tick(); // tick so shouldUpdate can be true

      const relevant = manager.getRelevantEntities('v1');
      const ids = relevant.map((r) => r.entityId);
      expect(ids).toContain('close');
      expect(ids).not.toContain('far');
    });

    it('returns empty for unknown viewer', () => {
      expect(manager.getRelevantEntities('ghost')).toEqual([]);
    });

    it('assigns correct priorities based on distance', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      manager.addEntity('high', v(20, 0, 0)); // ~20% → priority 0
      manager.addEntity('medium', v(50, 0, 0)); // 50% → priority 1
      manager.addEntity('low', v(80, 0, 0)); // 80% → priority 2
      manager.tick();

      const relevant = manager.getRelevantEntities('v1');
      const byId = Object.fromEntries(relevant.map((r) => [r.entityId, r]));

      expect(byId['high'].priority).toBe(0);
      expect(byId['medium'].priority).toBe(1);
      expect(byId['low'].priority).toBe(2);
    });

    it('includes distance in results', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      manager.addEntity('e1', v(30, 40, 0)); // distance = 50
      manager.tick();

      const relevant = manager.getRelevantEntities('v1');
      expect(relevant[0].distance).toBeCloseTo(50, 1);
    });

    it('applies bandwidth budget', () => {
      const budgetManager = new ServerInterestManager({
        defaultViewDistance: 100,
        cellSize: 50,
        maxEntitiesPerViewer: 3,
      });

      budgetManager.addViewer('v1', v(0, 0, 0), 'room1');
      for (let i = 0; i < 10; i++) {
        budgetManager.addEntity(`e${i}`, v(i * 5, 0, 0));
      }
      budgetManager.tick();

      const relevant = budgetManager.getRelevantEntities('v1');
      expect(relevant.length).toBeLessThanOrEqual(3);
    });

    it('budget prioritizes closer entities', () => {
      const budgetManager = new ServerInterestManager({
        defaultViewDistance: 100,
        cellSize: 50,
        maxEntitiesPerViewer: 2,
      });

      budgetManager.addViewer('v1', v(0, 0, 0), 'room1');
      budgetManager.addEntity('close', v(10, 0, 0));
      budgetManager.addEntity('mid', v(50, 0, 0));
      budgetManager.addEntity('far', v(90, 0, 0));
      budgetManager.tick();

      const relevant = budgetManager.getRelevantEntities('v1');
      const ids = relevant.map((r) => r.entityId);
      expect(ids).toContain('close');
      // mid should be preferred over far
      expect(ids).toContain('mid');
    });

    it('does not double-count always-relevant entities in spatial query', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      manager.addEntity('e1', v(10, 0, 0));
      manager.markAlwaysRelevant('e1');
      manager.tick();

      const relevant = manager.getRelevantEntities('v1');
      const e1Entries = relevant.filter((r) => r.entityId === 'e1');
      expect(e1Entries.length).toBe(1);
    });
  });

  // ==========================================================================
  // isRelevantTo
  // ==========================================================================

  describe('isRelevantTo', () => {
    it('returns true for entity within view distance', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      manager.addEntity('close', v(50, 0, 0));
      expect(manager.isRelevantTo('v1', 'close')).toBe(true);
    });

    it('returns false for entity beyond view distance', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      manager.addEntity('far', v(200, 0, 0));
      expect(manager.isRelevantTo('v1', 'far')).toBe(false);
    });

    it('returns true for always-relevant entity', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      manager.addEntity('global', v(10000, 0, 0));
      manager.markAlwaysRelevant('global');
      expect(manager.isRelevantTo('v1', 'global')).toBe(true);
    });

    it('returns false for unknown viewer', () => {
      manager.addEntity('e1', v(0, 0, 0));
      expect(manager.isRelevantTo('ghost', 'e1')).toBe(false);
    });

    it('returns false for unknown entity', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      expect(manager.isRelevantTo('v1', 'ghost')).toBe(false);
    });
  });

  // ==========================================================================
  // filterSnapshotForViewer
  // ==========================================================================

  describe('filterSnapshotForViewer', () => {
    it('filters snapshot to only relevant entities', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      manager.addEntity('close', v(20, 0, 0));
      manager.addEntity('far', v(500, 0, 0));
      manager.tick();

      const snapshot = makeSnapshot([
        makeState('close', v(20, 0, 0)),
        makeState('far', v(500, 0, 0)),
      ]);

      const filtered = manager.filterSnapshotForViewer('v1', snapshot);
      const ids = filtered.states.map((s) => s.objectId);
      expect(ids).toContain('close');
      expect(ids).not.toContain('far');
    });

    it('returns empty snapshot for unknown viewer', () => {
      const snapshot = makeSnapshot([makeState('e1', v(0, 0, 0))]);
      const filtered = manager.filterSnapshotForViewer('ghost', snapshot);
      expect(filtered.states).toEqual([]);
    });

    it('preserves snapshot metadata', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      manager.addEntity('e1', v(10, 0, 0));
      manager.tick();

      const snapshot: StateSnapshot = {
        timestamp: 12345,
        sequence: 42,
        states: [makeState('e1', v(10, 0, 0))],
      };

      const filtered = manager.filterSnapshotForViewer('v1', snapshot);
      expect(filtered.timestamp).toBe(12345);
      expect(filtered.sequence).toBe(42);
    });

    it('includes always-relevant entities in filtered snapshot', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      manager.addEntity('global', v(10000, 0, 0));
      manager.markAlwaysRelevant('global');
      manager.tick();

      const snapshot = makeSnapshot([makeState('global', v(10000, 0, 0))]);
      const filtered = manager.filterSnapshotForViewer('v1', snapshot);
      expect(filtered.states.map((s) => s.objectId)).toContain('global');
    });

    it('respects rate throttling in filtered snapshot', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      manager.addEntity('medium', v(50, 0, 0)); // priority 1 → updates every 2nd tick
      // Don't tick → tickCount=0, multiplier=2, 0%2=0 → should update
      // Actually we need tick to advance

      const snapshot = makeSnapshot([makeState('medium', v(50, 0, 0))]);

      // Tick 1: tickCount=1, 1%2=1 → shouldUpdate=false for priority 1
      manager.tick();
      const filtered1 = manager.filterSnapshotForViewer('v1', snapshot);
      const included1 = filtered1.states.find((s) => s.objectId === 'medium');

      // Tick 2: tickCount=2, 2%2=0 → shouldUpdate=true for priority 1
      manager.tick();
      const filtered2 = manager.filterSnapshotForViewer('v1', snapshot);
      const included2 = filtered2.states.find((s) => s.objectId === 'medium');

      // At least one of these should be included, at least one excluded
      // (demonstrating that rate throttling works)
      const results = [!!included1, !!included2];
      expect(results).toContain(true);
      expect(results).toContain(false);
    });

    it('handles empty snapshot', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      manager.tick();
      const snapshot = makeSnapshot([]);
      const filtered = manager.filterSnapshotForViewer('v1', snapshot);
      expect(filtered.states).toEqual([]);
    });
  });

  // ==========================================================================
  // Multi-viewer scenarios
  // ==========================================================================

  describe('multi-viewer', () => {
    it('different viewers see different entities', () => {
      manager.addViewer('left', v(-50, 0, 0), 'room1');
      manager.addViewer('right', v(50, 0, 0), 'room1');
      manager.addEntity('leftObj', v(-60, 0, 0));
      manager.addEntity('rightObj', v(60, 0, 0));
      manager.tick();

      const leftRelevant = manager.getRelevantEntities('left');
      const rightRelevant = manager.getRelevantEntities('right');

      const leftIds = leftRelevant.map((r) => r.entityId);
      const rightIds = rightRelevant.map((r) => r.entityId);

      expect(leftIds).toContain('leftObj');
      expect(leftIds).not.toContain('rightObj');
      expect(rightIds).toContain('rightObj');
      expect(rightIds).not.toContain('leftObj');
    });

    it('shared entity visible to overlapping viewers', () => {
      manager.addViewer('v1', v(-20, 0, 0), 'room1');
      manager.addViewer('v2', v(20, 0, 0), 'room1');
      manager.addEntity('shared', v(0, 0, 0));
      manager.tick();

      expect(manager.isRelevantTo('v1', 'shared')).toBe(true);
      expect(manager.isRelevantTo('v2', 'shared')).toBe(true);
    });

    it('each viewer gets different filtered snapshot', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      manager.addViewer('v2', v(200, 0, 0), 'room1');
      manager.addEntity('nearV1', v(10, 0, 0));
      manager.addEntity('nearV2', v(210, 0, 0));
      manager.tick();

      const snapshot = makeSnapshot([
        makeState('nearV1', v(10, 0, 0)),
        makeState('nearV2', v(210, 0, 0)),
      ]);

      const f1 = manager.filterSnapshotForViewer('v1', snapshot);
      const f2 = manager.filterSnapshotForViewer('v2', snapshot);

      expect(f1.states.map((s) => s.objectId)).toContain('nearV1');
      expect(f1.states.map((s) => s.objectId)).not.toContain('nearV2');
      expect(f2.states.map((s) => s.objectId)).toContain('nearV2');
      expect(f2.states.map((s) => s.objectId)).not.toContain('nearV1');
    });
  });

  // ==========================================================================
  // syncFromStates
  // ==========================================================================

  describe('syncFromStates', () => {
    it('adds new entities from state map', () => {
      const states = new Map<string, SyncState>();
      states.set('e1', makeState('e1', v(10, 0, 0)));
      states.set('e2', makeState('e2', v(20, 0, 0)));
      manager.syncFromStates(states);
      expect(manager.hasEntity('e1')).toBe(true);
      expect(manager.hasEntity('e2')).toBe(true);
    });

    it('updates existing entities from state map', () => {
      manager.addEntity('e1', v(0, 0, 0));
      const states = new Map<string, SyncState>();
      states.set('e1', makeState('e1', v(50, 0, 0)));
      manager.syncFromStates(states);
      // Entity should still exist and be updated
      expect(manager.hasEntity('e1')).toBe(true);
    });

    it('skips states without position', () => {
      const states = new Map<string, SyncState>();
      states.set('noPos', makeState('noPos'));
      manager.syncFromStates(states);
      expect(manager.hasEntity('noPos')).toBe(false);
    });
  });

  // ==========================================================================
  // clearRoom
  // ==========================================================================

  describe('clearRoom', () => {
    it('removes viewers from specified room', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      manager.addViewer('v2', v(0, 0, 0), 'room2');
      manager.clearRoom('room1');
      expect(manager.hasViewer('v1')).toBe(false);
      expect(manager.hasViewer('v2')).toBe(true);
    });

    it('does not affect viewers in other rooms', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      manager.addViewer('v2', v(0, 0, 0), 'room2');
      manager.clearRoom('room1');
      expect(manager.getStats().viewerCount).toBe(1);
    });
  });

  // ==========================================================================
  // clear
  // ==========================================================================

  describe('clear', () => {
    it('removes all viewers, entities, and resets tick', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      manager.addEntity('e1', v(10, 0, 0));
      manager.markAlwaysRelevant('e1');
      manager.tick();
      manager.tick();
      manager.clear();

      const stats = manager.getStats();
      expect(stats.viewerCount).toBe(0);
      expect(stats.entityCount).toBe(0);
      expect(stats.alwaysRelevantCount).toBe(0);
      expect(manager.getTickCount()).toBe(0);
    });
  });

  // ==========================================================================
  // Stats
  // ==========================================================================

  describe('getStats', () => {
    it('reports correct counts', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      manager.addViewer('v2', v(10, 0, 0), 'room1');
      manager.addEntity('e1', v(5, 0, 0));
      manager.addEntity('e2', v(15, 0, 0));
      manager.markAlwaysRelevant('e1');

      const stats = manager.getStats();
      expect(stats.viewerCount).toBe(2);
      expect(stats.entityCount).toBe(2);
      expect(stats.alwaysRelevantCount).toBe(1);
      expect(stats.gridStats.entityCount).toBe(2);
    });
  });

  // ==========================================================================
  // Tick counter
  // ==========================================================================

  describe('tick', () => {
    it('increments tick counter', () => {
      expect(manager.getTickCount()).toBe(0);
      manager.tick();
      expect(manager.getTickCount()).toBe(1);
      manager.tick();
      expect(manager.getTickCount()).toBe(2);
    });
  });

  // ==========================================================================
  // Dynamic scenarios
  // ==========================================================================

  describe('dynamic scenarios', () => {
    it('entity becomes relevant as viewer approaches', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      manager.addEntity('e1', v(200, 0, 0));
      expect(manager.isRelevantTo('v1', 'e1')).toBe(false);

      manager.updateViewerPosition('v1', v(150, 0, 0));
      expect(manager.isRelevantTo('v1', 'e1')).toBe(true);
    });

    it('entity becomes irrelevant as viewer moves away', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      manager.addEntity('e1', v(50, 0, 0));
      expect(manager.isRelevantTo('v1', 'e1')).toBe(true);

      manager.updateViewerPosition('v1', v(-200, 0, 0));
      expect(manager.isRelevantTo('v1', 'e1')).toBe(false);
    });

    it('entity moves into viewer range', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');
      manager.addEntity('e1', v(200, 0, 0));
      expect(manager.isRelevantTo('v1', 'e1')).toBe(false);

      manager.updateEntityPosition('e1', v(50, 0, 0));
      expect(manager.isRelevantTo('v1', 'e1')).toBe(true);
    });

    it('handles many entities efficiently', () => {
      manager.addViewer('v1', v(0, 0, 0), 'room1');

      // Add 1000 entities spread across space
      for (let i = 0; i < 1000; i++) {
        manager.addEntity(
          `e${i}`,
          v(
            Math.random() * 1000 - 500,
            Math.random() * 1000 - 500,
            Math.random() * 1000 - 500
          )
        );
      }
      manager.tick();

      const start = performance.now();
      const relevant = manager.getRelevantEntities('v1');
      const elapsed = performance.now() - start;

      // Should complete in well under 100ms even with 1000 entities
      expect(elapsed).toBeLessThan(100);
      // Only a fraction should be relevant (viewDistance=100 in 1000x1000x1000 space)
      expect(relevant.length).toBeLessThan(1000);
    });
  });
});
