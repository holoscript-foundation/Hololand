/**
 * Tests for AgentStateWAL - Write-Ahead Log
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AgentStateWAL,
  getAgentStateWAL,
  resetAgentStateWAL,
} from '../AgentStateWAL.js';

describe('AgentStateWAL', () => {
  let wal: AgentStateWAL;

  beforeEach(() => {
    wal = new AgentStateWAL();
  });

  // =========================================================================
  // State Mutations
  // =========================================================================

  describe('set', () => {
    it('sets a simple state field', () => {
      wal.sceneEnter('brittney', 'world-1');
      wal.set('brittney', 'world-1', 'emotion', 'happy');

      const state = wal.replayState('brittney');
      expect(state.emotion).toBe('happy');
    });

    it('sets a nested state field', () => {
      wal.set('brittney', 'world-1', 'position.x', 10);
      wal.set('brittney', 'world-1', 'position.y', 20);
      wal.set('brittney', 'world-1', 'position.z', 30);

      const state = wal.replayState('brittney');
      expect(state.position).toEqual({ x: 10, y: 20, z: 30 });
    });

    it('overwrites existing values', () => {
      wal.set('brittney', 'world-1', 'emotion', 'happy');
      wal.set('brittney', 'world-1', 'emotion', 'curious');

      const state = wal.replayState('brittney');
      expect(state.emotion).toBe('curious');
    });

    it('tracks previous values', () => {
      wal.set('brittney', 'world-1', 'emotion', 'happy');
      wal.set('brittney', 'world-1', 'emotion', 'curious');

      const entries = wal.getEntries('brittney');
      const lastSet = entries.filter(e => e.operation === 'SET').pop();
      expect(lastSet?.previousValue).toBe('happy');
    });

    it('returns sequence number', () => {
      const seq1 = wal.set('brittney', 'world-1', 'a', 1);
      const seq2 = wal.set('brittney', 'world-1', 'b', 2);

      expect(seq2).toBeGreaterThan(seq1);
    });
  });

  describe('delete', () => {
    it('deletes a state field', () => {
      wal.set('brittney', 'world-1', 'emotion', 'happy');
      wal.delete('brittney', 'world-1', 'emotion');

      const state = wal.replayState('brittney');
      expect(state.emotion).toBeUndefined();
    });

    it('deletes nested fields', () => {
      wal.set('brittney', 'world-1', 'position.x', 10);
      wal.set('brittney', 'world-1', 'position.y', 20);
      wal.delete('brittney', 'world-1', 'position.x');

      const state = wal.replayState('brittney');
      expect((state.position as Record<string, unknown>).x).toBeUndefined();
      expect((state.position as Record<string, unknown>).y).toBe(20);
    });
  });

  describe('merge', () => {
    it('deep merges into existing object', () => {
      wal.set('brittney', 'world-1', 'memory', { shortTerm: 'hello' });
      wal.merge('brittney', 'world-1', 'memory', { longTerm: 'world' });

      const state = wal.replayState('brittney');
      expect(state.memory).toEqual({ shortTerm: 'hello', longTerm: 'world' });
    });

    it('creates object if path does not exist', () => {
      wal.merge('brittney', 'world-1', 'config', { debug: true });

      const state = wal.replayState('brittney');
      expect(state.config).toEqual({ debug: true });
    });
  });

  describe('push', () => {
    it('pushes to an array', () => {
      wal.set('brittney', 'world-1', 'history', []);
      wal.push('brittney', 'world-1', 'history', 'event-1');
      wal.push('brittney', 'world-1', 'history', 'event-2');

      const state = wal.replayState('brittney');
      expect(state.history).toEqual(['event-1', 'event-2']);
    });

    it('creates array if field does not exist', () => {
      wal.push('brittney', 'world-1', 'log', 'first');

      const state = wal.replayState('brittney');
      expect(state.log).toEqual(['first']);
    });
  });

  // =========================================================================
  // Scene Lifecycle
  // =========================================================================

  describe('scene lifecycle', () => {
    it('records scene enter', () => {
      wal.sceneEnter('brittney', 'world-1');

      expect(wal.getCurrentScene('brittney')).toBe('world-1');
    });

    it('records scene exit', () => {
      wal.sceneEnter('brittney', 'world-1');
      wal.sceneExit('brittney', 'world-1');

      const entries = wal.getEntries('brittney');
      expect(entries.some(e => e.operation === 'SCENE_EXIT')).toBe(true);
    });
  });

  describe('scene transition', () => {
    it('handles full scene transition', () => {
      wal.sceneEnter('brittney', 'world-1');
      wal.set('brittney', 'world-1', 'emotion', 'happy');
      wal.set('brittney', 'world-1', 'position', { x: 1, y: 2, z: 3 });

      const transition = wal.sceneTransition('brittney', 'world-1', 'world-2');

      expect(transition.fromSceneId).toBe('world-1');
      expect(transition.toSceneId).toBe('world-2');
      expect(transition.carriedState.emotion).toBe('happy');
      expect(transition.carriedState.position).toEqual({ x: 1, y: 2, z: 3 });
      expect(wal.getCurrentScene('brittney')).toBe('world-2');
    });

    it('preserves state across multiple transitions', () => {
      wal.sceneEnter('brittney', 'world-1');
      wal.set('brittney', 'world-1', 'level', 1);

      wal.sceneTransition('brittney', 'world-1', 'world-2');
      wal.set('brittney', 'world-2', 'level', 2);

      wal.sceneTransition('brittney', 'world-2', 'world-3');
      wal.set('brittney', 'world-3', 'level', 3);

      const state = wal.replayState('brittney');
      expect(state.level).toBe(3);
    });

    it('tracks transition history', () => {
      wal.sceneEnter('brittney', 'world-1');
      wal.sceneTransition('brittney', 'world-1', 'world-2');
      wal.sceneTransition('brittney', 'world-2', 'world-3');

      const transitions = wal.getTransitions('brittney');
      expect(transitions).toHaveLength(2);
      expect(transitions[0].fromSceneId).toBe('world-1');
      expect(transitions[0].toSceneId).toBe('world-2');
      expect(transitions[1].fromSceneId).toBe('world-2');
      expect(transitions[1].toSceneId).toBe('world-3');
    });

    it('calls onSceneTransition callback', () => {
      const callback = vi.fn();
      const walWithCallback = new AgentStateWAL({ onSceneTransition: callback });

      walWithCallback.sceneEnter('brittney', 'world-1');
      walWithCallback.sceneTransition('brittney', 'world-1', 'world-2');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          fromSceneId: 'world-1',
          toSceneId: 'world-2',
        }),
      );
    });
  });

  // =========================================================================
  // State Replay
  // =========================================================================

  describe('replayState', () => {
    it('replays all mutations in order', () => {
      wal.set('brittney', 'world-1', 'a', 1);
      wal.set('brittney', 'world-1', 'b', 2);
      wal.set('brittney', 'world-1', 'a', 3);

      const state = wal.replayState('brittney');
      expect(state.a).toBe(3);
      expect(state.b).toBe(2);
    });

    it('replays from checkpoint', () => {
      // Create many entries
      for (let i = 0; i < 50; i++) {
        wal.set('brittney', 'world-1', `field-${i}`, i);
      }

      wal.checkpoint('brittney');
      wal.set('brittney', 'world-1', 'after-checkpoint', true);

      const state = wal.replayState('brittney');
      expect(state['field-49']).toBe(49);
      expect(state['after-checkpoint']).toBe(true);
    });

    it('returns empty state for unknown agent', () => {
      const state = wal.replayState('unknown');
      expect(state).toEqual({});
    });

    it('isolates state between agents', () => {
      wal.set('brittney', 'world-1', 'role', 'assistant');
      wal.set('manager', 'world-1', 'role', 'manager');

      expect(wal.replayState('brittney').role).toBe('assistant');
      expect(wal.replayState('manager').role).toBe('manager');
    });
  });

  describe('replayStateAt', () => {
    it('replays state up to a specific sequence', () => {
      const seq1 = wal.set('brittney', 'world-1', 'emotion', 'happy');
      const seq2 = wal.set('brittney', 'world-1', 'emotion', 'sad');
      wal.set('brittney', 'world-1', 'emotion', 'curious');

      const state = wal.replayStateAt('brittney', seq1);
      expect(state.emotion).toBe('happy');

      const state2 = wal.replayStateAt('brittney', seq2);
      expect(state2.emotion).toBe('sad');
    });
  });

  // =========================================================================
  // Checkpoint
  // =========================================================================

  describe('checkpoint', () => {
    it('creates a checkpoint with full state', () => {
      wal.set('brittney', 'world-1', 'emotion', 'happy');
      wal.set('brittney', 'world-1', 'level', 5);

      const cp = wal.checkpoint('brittney');

      expect(cp.state.emotion).toBe('happy');
      expect(cp.state.level).toBe(5);
      expect(cp.schemaVersion).toBe(1);
    });

    it('calls onCheckpoint callback', () => {
      const callback = vi.fn();
      const walWithCallback = new AgentStateWAL({ onCheckpoint: callback });

      walWithCallback.set('brittney', 'world-1', 'test', true);
      walWithCallback.checkpoint('brittney');

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('auto-checkpoints after threshold', () => {
      const smallWal = new AgentStateWAL({ maxEntriesBeforeCheckpoint: 5 });

      for (let i = 0; i < 6; i++) {
        smallWal.set('brittney', 'world-1', `field-${i}`, i);
      }

      const metrics = smallWal.getMetrics();
      expect(metrics.totalCheckpoints).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // Undo
  // =========================================================================

  describe('undo', () => {
    it('undoes the last set operation', () => {
      wal.set('brittney', 'world-1', 'emotion', 'happy');
      wal.set('brittney', 'world-1', 'emotion', 'sad');

      wal.sceneEnter('brittney', 'world-1');
      const undone = wal.undo('brittney');

      expect(undone).not.toBeNull();
      const state = wal.replayState('brittney');
      expect(state.emotion).toBe('happy');
    });

    it('returns null when nothing to undo', () => {
      const undone = wal.undo('brittney');
      expect(undone).toBeNull();
    });

    it('returns null when tracking is disabled', () => {
      const noTrackWal = new AgentStateWAL({ trackPreviousValues: false });
      noTrackWal.set('brittney', 'world-1', 'emotion', 'happy');

      const undone = noTrackWal.undo('brittney');
      expect(undone).toBeNull();
    });
  });

  // =========================================================================
  // Query
  // =========================================================================

  describe('query', () => {
    it('gets entries for an agent', () => {
      wal.set('brittney', 'world-1', 'a', 1);
      wal.set('brittney', 'world-1', 'b', 2);
      wal.set('manager', 'world-1', 'c', 3);

      const entries = wal.getEntries('brittney');
      expect(entries).toHaveLength(2);
    });

    it('limits entries', () => {
      for (let i = 0; i < 10; i++) {
        wal.set('brittney', 'world-1', `f-${i}`, i);
      }

      const entries = wal.getEntries('brittney', 3);
      expect(entries).toHaveLength(3);
    });

    it('gets entries for a scene', () => {
      wal.set('brittney', 'world-1', 'a', 1);
      wal.set('brittney', 'world-2', 'b', 2);
      wal.set('manager', 'world-1', 'c', 3);

      const entries = wal.getEntriesForScene('world-1');
      expect(entries).toHaveLength(2);
    });

    it('gets tracked agents', () => {
      wal.set('brittney', 'world-1', 'a', 1);
      wal.set('manager', 'world-1', 'b', 2);

      const agents = wal.getTrackedAgents();
      expect(agents).toHaveLength(2);
      expect(agents).toContain('did:holo:brittney');
      expect(agents).toContain('did:holo:manager');
    });
  });

  // =========================================================================
  // Metrics
  // =========================================================================

  describe('metrics', () => {
    it('tracks WAL metrics', () => {
      wal.set('brittney', 'world-1', 'a', 1);
      wal.set('brittney', 'world-1', 'b', 2);
      wal.set('manager', 'world-1', 'c', 3);
      wal.checkpoint('brittney');
      wal.sceneTransition('brittney', 'world-1', 'world-2');

      const metrics = wal.getMetrics();

      expect(metrics.totalEntries).toBeGreaterThan(3);
      expect(metrics.totalCheckpoints).toBeGreaterThanOrEqual(1);
      expect(metrics.totalSceneTransitions).toBe(1);
      expect(metrics.uniqueAgents).toBe(2);
      expect(metrics.schemaVersion).toBe(1);
    });
  });

  // =========================================================================
  // Lifecycle
  // =========================================================================

  describe('lifecycle', () => {
    it('destroys all state', () => {
      wal.set('brittney', 'world-1', 'a', 1);
      wal.destroy();

      expect(wal.getEntries('brittney')).toHaveLength(0);
      expect(wal.replayState('brittney')).toEqual({});
    });
  });

  // =========================================================================
  // Singleton
  // =========================================================================

  describe('singleton', () => {
    beforeEach(() => {
      resetAgentStateWAL();
    });

    it('returns the same instance', () => {
      const a = getAgentStateWAL();
      const b = getAgentStateWAL();
      expect(a).toBe(b);
    });

    it('resets correctly', () => {
      const a = getAgentStateWAL();
      a.set('test', 'world-1', 'x', 1);
      resetAgentStateWAL();

      const b = getAgentStateWAL();
      expect(b.getTrackedAgents()).toHaveLength(0);
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================

  describe('edge cases', () => {
    it('handles deeply nested paths', () => {
      wal.set('brittney', 'world-1', 'a.b.c.d.e', 'deep');

      const state = wal.replayState('brittney');
      expect((state as any).a.b.c.d.e).toBe('deep');
    });

    it('handles complex objects as values', () => {
      const complex = {
        position: { x: 1, y: 2, z: 3 },
        inventory: ['sword', 'shield'],
        stats: { hp: 100, mp: 50 },
      };

      wal.set('brittney', 'world-1', 'data', complex);

      const state = wal.replayState('brittney');
      expect(state.data).toEqual(complex);
    });

    it('trims old entries when exceeding max', () => {
      const smallWal = new AgentStateWAL({ maxTotalEntries: 10 });

      for (let i = 0; i < 20; i++) {
        smallWal.set('brittney', 'world-1', `f-${i}`, i);
      }

      const metrics = smallWal.getMetrics();
      expect(metrics.totalEntries).toBeLessThanOrEqual(10);
    });
  });
});
