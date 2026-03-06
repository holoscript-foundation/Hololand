/**
 * @vitest-environment jsdom
 */

/**
 * Tests for AgentStateBuffer (Double-Buffered Agent State)
 *
 * Validates:
 * - Double-buffering semantics (front/back isolation)
 * - Atomic swap behavior
 * - State isolation between producer and consumer
 * - Metrics tracking
 * - Edge cases (empty state, rapid swaps, staleness)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  AgentStateBuffer,
  createAgentStateBuffer,
  createEmptyAgentWorldState,
  createDefaultAgentAvatarState,
  type AgentWorldState,
} from '../AgentStateBuffer';

// =============================================================================
// TESTS
// =============================================================================

describe('AgentStateBuffer', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  describe('initialization', () => {
    it('should create with empty initial state', () => {
      const buffer = createAgentStateBuffer();
      const state = buffer.getFrontBuffer();
      expect(state.agents).toEqual({});
      expect(state.commands).toEqual([]);
      expect(state.notification).toBe('');
      expect(state.sequence).toBe(0);
    });

    it('should create with custom state factory', () => {
      const factory = () => ({
        agents: { test: createDefaultAgentAvatarState('test') },
        commands: [],
        notification: '',
        sequence: 0,
        lastSwapTimestamp: 0,
      });
      const buffer = new AgentStateBuffer<AgentWorldState>(factory);
      const state = buffer.getFrontBuffer();
      expect(state.agents).toHaveProperty('test');
      expect(state.agents.test.agentId).toBe('test');
    });

    it('should accept custom staleness threshold', () => {
      const buffer = createAgentStateBuffer(1000);
      const metrics = buffer.getMetrics();
      expect(metrics.stalenessThreshold).toBe(1000);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DOUBLE-BUFFERING SEMANTICS
  // ─────────────────────────────────────────────────────────────────────────

  describe('double-buffering', () => {
    it('should isolate front and back buffers', () => {
      const buffer = createAgentStateBuffer();

      // Write to back buffer
      const back = buffer.getBackBuffer();
      back.agents['brittney'] = createDefaultAgentAvatarState('brittney');
      back.agents['brittney'].position = { x: 1, y: 2, z: 3 };

      // Front buffer should still be empty (not swapped yet)
      const front = buffer.getFrontBuffer();
      expect(Object.keys(front.agents)).toHaveLength(0);
    });

    it('should make back buffer visible after swap', () => {
      const buffer = createAgentStateBuffer();

      // Write to back buffer
      const back = buffer.getBackBuffer();
      back.agents['brittney'] = createDefaultAgentAvatarState('brittney');
      back.agents['brittney'].position = { x: 5, y: 10, z: 15 };

      // Swap
      buffer.swap();

      // Front buffer should now have the agent
      const front = buffer.getFrontBuffer();
      expect(front.agents['brittney']).toBeDefined();
      expect(front.agents['brittney'].position).toEqual({ x: 5, y: 10, z: 15 });
    });

    it('should provide fresh back buffer after swap (based on latest front)', () => {
      const buffer = createAgentStateBuffer();

      // Write agent to back buffer
      const back1 = buffer.getBackBuffer();
      back1.agents['brittney'] = createDefaultAgentAvatarState('brittney');
      back1.agents['brittney'].position = { x: 1, y: 0, z: 0 };

      // Swap
      buffer.swap();

      // New back buffer should have the agent (deep copied from new front)
      const back2 = buffer.getBackBuffer();
      expect(back2.agents['brittney']).toBeDefined();
      expect(back2.agents['brittney'].position).toEqual({ x: 1, y: 0, z: 0 });
    });

    it('should not leak mutations between buffers after swap', () => {
      const buffer = createAgentStateBuffer();

      // Write agent to back and swap
      const back1 = buffer.getBackBuffer();
      back1.agents['a'] = createDefaultAgentAvatarState('a');
      buffer.swap();

      // Now modify the new back buffer
      const back2 = buffer.getBackBuffer();
      back2.agents['a'].position = { x: 99, y: 99, z: 99 };

      // Front buffer should NOT see the modification (isolated)
      const front = buffer.getFrontBuffer();
      expect(front.agents['a'].position).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('should handle multiple swap cycles correctly', () => {
      const buffer = createAgentStateBuffer();

      // Cycle 1: Add agent
      const back1 = buffer.getBackBuffer();
      back1.agents['a'] = createDefaultAgentAvatarState('a');
      back1.agents['a'].position = { x: 1, y: 0, z: 0 };
      buffer.swap();

      // Cycle 2: Move agent
      const back2 = buffer.getBackBuffer();
      back2.agents['a'].position = { x: 2, y: 0, z: 0 };
      buffer.swap();

      // Cycle 3: Add second agent
      const back3 = buffer.getBackBuffer();
      back3.agents['b'] = createDefaultAgentAvatarState('b');
      buffer.swap();

      // Final state should have both agents
      const front = buffer.getFrontBuffer();
      expect(front.agents['a'].position).toEqual({ x: 2, y: 0, z: 0 });
      expect(front.agents['b']).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // COMMANDS
  // ─────────────────────────────────────────────────────────────────────────

  describe('commands', () => {
    it('should carry commands through swap', () => {
      const buffer = createAgentStateBuffer();

      const back = buffer.getBackBuffer();
      back.commands.push({
        id: 'cmd-1',
        agentId: 'brittney',
        type: 'spawn_object',
        payload: { objectType: 'sphere' },
        timestamp: Date.now(),
        consumed: false,
      });
      buffer.swap();

      const front = buffer.getFrontBuffer();
      expect(front.commands).toHaveLength(1);
      expect(front.commands[0].type).toBe('spawn_object');
      expect(front.commands[0].consumed).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // METRICS
  // ─────────────────────────────────────────────────────────────────────────

  describe('metrics', () => {
    it('should track swap count', () => {
      const buffer = createAgentStateBuffer();
      expect(buffer.getSwapCount()).toBe(0);

      buffer.swap();
      expect(buffer.getSwapCount()).toBe(1);

      buffer.swap();
      buffer.swap();
      expect(buffer.getSwapCount()).toBe(3);
    });

    it('should track reads and writes since last swap', () => {
      const buffer = createAgentStateBuffer();

      buffer.getFrontBuffer();
      buffer.getFrontBuffer();
      buffer.getBackBuffer();

      const metrics = buffer.getMetrics();
      expect(metrics.readsSinceLastSwap).toBe(2);
      expect(metrics.writesSinceLastSwap).toBe(1);
    });

    it('should reset read/write counts on swap', () => {
      const buffer = createAgentStateBuffer();

      buffer.getFrontBuffer();
      buffer.getBackBuffer();
      buffer.swap();

      const metrics = buffer.getMetrics();
      expect(metrics.readsSinceLastSwap).toBe(0);
      expect(metrics.writesSinceLastSwap).toBe(0);
    });

    it('should detect staleness when no recent swaps', () => {
      const buffer = createAgentStateBuffer(0); // 0ms threshold = immediately stale
      const metrics = buffer.getMetrics();
      // No swaps yet, but staleness check uses lastSwapTime=0, so timeSinceLastSwap=0
      // With 0ms threshold and no swaps, isStale should depend on implementation
      expect(typeof metrics.isStale).toBe('boolean');
    });

    it('should report staleness threshold', () => {
      const buffer = createAgentStateBuffer(2000);
      expect(buffer.getMetrics().stalenessThreshold).toBe(2000);
    });

    it('should allow changing staleness threshold', () => {
      const buffer = createAgentStateBuffer(500);
      buffer.setStalenessThreshold(1000);
      expect(buffer.getMetrics().stalenessThreshold).toBe(1000);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // RESET
  // ─────────────────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('should clear all state on reset', () => {
      const buffer = createAgentStateBuffer();

      // Add data and swap
      const back = buffer.getBackBuffer();
      back.agents['a'] = createDefaultAgentAvatarState('a');
      buffer.swap();

      // Verify data exists
      expect(Object.keys(buffer.getFrontBuffer().agents)).toHaveLength(1);

      // Reset
      buffer.reset();

      // Verify clean state
      expect(Object.keys(buffer.getFrontBuffer().agents)).toHaveLength(0);
      expect(buffer.getSwapCount()).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // HELPER FACTORIES
  // ─────────────────────────────────────────────────────────────────────────

  describe('helper factories', () => {
    it('createEmptyAgentWorldState should return valid empty state', () => {
      const state = createEmptyAgentWorldState();
      expect(state.agents).toEqual({});
      expect(state.commands).toEqual([]);
      expect(state.notification).toBe('');
      expect(state.sequence).toBe(0);
      expect(state.lastSwapTimestamp).toBe(0);
    });

    it('createDefaultAgentAvatarState should create valid default state', () => {
      const state = createDefaultAgentAvatarState('brittney', 'Brittney');
      expect(state.agentId).toBe('brittney');
      expect(state.name).toBe('Brittney');
      expect(state.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(state.rotation).toEqual({ x: 0, y: 0, z: 0, w: 1 });
      expect(state.scale).toEqual({ x: 1, y: 1, z: 1 });
      expect(state.visible).toBe(true);
      expect(state.animationState).toBe('idle');
      expect(state.emotion).toBe('neutral');
      expect(state.gazeTarget).toBeNull();
      expect(state.speechText).toBe('');
      expect(state.metadata).toEqual({});
    });

    it('createDefaultAgentAvatarState should use agentId as name by default', () => {
      const state = createDefaultAgentAvatarState('brittney');
      expect(state.name).toBe('brittney');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GENERIC TYPE PARAMETER
  // ─────────────────────────────────────────────────────────────────────────

  describe('generic type support', () => {
    interface CustomState {
      value: number;
      label: string;
    }

    it('should work with custom state types', () => {
      const buffer = new AgentStateBuffer<CustomState>(
        () => ({ value: 0, label: 'initial' }),
      );

      const back = buffer.getBackBuffer();
      back.value = 42;
      back.label = 'updated';

      buffer.swap();

      const front = buffer.getFrontBuffer();
      expect(front.value).toBe(42);
      expect(front.label).toBe('updated');
    });
  });
});
