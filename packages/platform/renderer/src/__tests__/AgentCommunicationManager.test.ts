/**
 * @vitest-environment jsdom
 */

/**
 * Tests for AgentCommunicationManager
 *
 * Validates:
 * - Off-render-loop message processing
 * - Agent connect/disconnect lifecycle
 * - State update merging
 * - Command queuing and consumption
 * - Update loop start/stop
 * - Metrics tracking
 * - Buffer integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  AgentCommunicationManager,
  createAgentCommunicationManager,
  type AgentMessage,
} from '../AgentCommunicationManager';

// =============================================================================
// TESTS
// =============================================================================

describe('AgentCommunicationManager', () => {
  let manager: AgentCommunicationManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new AgentCommunicationManager({ updateHz: 30 });
  });

  afterEach(() => {
    manager.dispose();
    vi.useRealTimers();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  describe('initialization', () => {
    it('should initialize without errors', () => {
      const mgr = createAgentCommunicationManager();
      expect(mgr).toBeDefined();
      expect(mgr.getIsRunning()).toBe(false);
      mgr.dispose();
    });

    it('should auto-start when configured', () => {
      const mgr = new AgentCommunicationManager({ autoStart: true });
      expect(mgr.getIsRunning()).toBe(true);
      mgr.dispose();
    });

    it('should not be running by default', () => {
      expect(manager.getIsRunning()).toBe(false);
    });

    it('should have zero connected agents initially', () => {
      expect(manager.getConnectedAgentCount()).toBe(0);
      expect(manager.getConnectedAgentIds()).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // LIFECYCLE (START / STOP)
  // ─────────────────────────────────────────────────────────────────────────

  describe('lifecycle', () => {
    it('should start and stop the update loop', () => {
      manager.start();
      expect(manager.getIsRunning()).toBe(true);

      manager.stop();
      expect(manager.getIsRunning()).toBe(false);
    });

    it('should warn when starting while already running', () => {
      manager.start();
      manager.start(); // Should warn, not error
      expect(manager.getIsRunning()).toBe(true);
    });

    it('should warn when stopping while already stopped', () => {
      manager.stop(); // Should warn, not error
      expect(manager.getIsRunning()).toBe(false);
    });

    it('should clean up on dispose', () => {
      manager.start();
      manager.connectAgent('test');
      manager.dispose();

      expect(manager.getIsRunning()).toBe(false);
      expect(manager.getConnectedAgentCount()).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AGENT CONNECT / DISCONNECT
  // ─────────────────────────────────────────────────────────────────────────

  describe('agent connect/disconnect', () => {
    it('should connect an agent', () => {
      manager.start();
      manager.connectAgent('brittney', 'Brittney');

      // Advance timer to process messages
      vi.advanceTimersByTime(100);

      expect(manager.isAgentConnected('brittney')).toBe(true);
      expect(manager.getConnectedAgentCount()).toBe(1);
    });

    it('should disconnect an agent', () => {
      manager.start();
      manager.connectAgent('brittney');
      vi.advanceTimersByTime(100);

      manager.disconnectAgent('brittney');
      vi.advanceTimersByTime(100);

      expect(manager.isAgentConnected('brittney')).toBe(false);
      expect(manager.getConnectedAgentCount()).toBe(0);
    });

    it('should handle multiple agents', () => {
      manager.start();
      manager.connectAgent('brittney', 'Brittney');
      manager.connectAgent('builder', 'Builder');
      manager.connectAgent('manager', 'Manager');
      vi.advanceTimersByTime(100);

      expect(manager.getConnectedAgentCount()).toBe(3);
      expect(manager.getConnectedAgentIds()).toContain('brittney');
      expect(manager.getConnectedAgentIds()).toContain('builder');
      expect(manager.getConnectedAgentIds()).toContain('manager');
    });

    it('should call onAgentConnected callback', () => {
      const onConnected = vi.fn();
      const mgr = new AgentCommunicationManager({
        updateHz: 30,
        onAgentConnected: onConnected,
      });
      mgr.start();
      mgr.connectAgent('brittney');
      vi.advanceTimersByTime(100);

      expect(onConnected).toHaveBeenCalledWith('brittney');
      mgr.dispose();
    });

    it('should call onAgentDisconnected callback', () => {
      const onDisconnected = vi.fn();
      const mgr = new AgentCommunicationManager({
        updateHz: 30,
        onAgentDisconnected: onDisconnected,
      });
      mgr.start();
      mgr.connectAgent('brittney');
      vi.advanceTimersByTime(100);
      mgr.disconnectAgent('brittney');
      vi.advanceTimersByTime(100);

      expect(onDisconnected).toHaveBeenCalledWith('brittney');
      mgr.dispose();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // STATE UPDATES
  // ─────────────────────────────────────────────────────────────────────────

  describe('state updates', () => {
    it('should update agent position', () => {
      manager.start();
      manager.connectAgent('brittney');
      vi.advanceTimersByTime(100);

      manager.updateAgentState('brittney', {
        position: { x: 5, y: 10, z: 15 },
      });
      vi.advanceTimersByTime(100);

      const state = manager.getCurrentState();
      expect(state.agents['brittney'].position).toEqual({ x: 5, y: 10, z: 15 });
    });

    it('should update agent emotion', () => {
      manager.start();
      manager.connectAgent('brittney');
      vi.advanceTimersByTime(100);

      manager.updateAgentState('brittney', { emotion: 'happy' });
      vi.advanceTimersByTime(100);

      const state = manager.getCurrentState();
      expect(state.agents['brittney'].emotion).toBe('happy');
    });

    it('should update agent visibility', () => {
      manager.start();
      manager.connectAgent('brittney');
      vi.advanceTimersByTime(100);

      manager.updateAgentState('brittney', { visible: false });
      vi.advanceTimersByTime(100);

      const state = manager.getCurrentState();
      expect(state.agents['brittney'].visible).toBe(false);
    });

    it('should update agent speech text', () => {
      manager.start();
      manager.connectAgent('brittney');
      vi.advanceTimersByTime(100);

      manager.updateAgentState('brittney', { speechText: 'Hello world!' });
      vi.advanceTimersByTime(100);

      const state = manager.getCurrentState();
      expect(state.agents['brittney'].speechText).toBe('Hello world!');
    });

    it('should auto-connect agent on state update if not connected', () => {
      manager.start();

      // Update without prior connect
      manager.updateAgentState('unknown-agent', {
        position: { x: 1, y: 2, z: 3 },
      });
      vi.advanceTimersByTime(100);

      expect(manager.isAgentConnected('unknown-agent')).toBe(true);
      const state = manager.getCurrentState();
      expect(state.agents['unknown-agent'].position).toEqual({ x: 1, y: 2, z: 3 });
    });

    it('should merge partial updates without overwriting other fields', () => {
      manager.start();
      manager.connectAgent('brittney');
      vi.advanceTimersByTime(100);

      // Update position
      manager.updateAgentState('brittney', {
        position: { x: 1, y: 0, z: 0 },
      });
      vi.advanceTimersByTime(100);

      // Update emotion (should not reset position)
      manager.updateAgentState('brittney', { emotion: 'curious' });
      vi.advanceTimersByTime(100);

      const state = manager.getCurrentState();
      expect(state.agents['brittney'].position).toEqual({ x: 1, y: 0, z: 0 });
      expect(state.agents['brittney'].emotion).toBe('curious');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // COMMANDS
  // ─────────────────────────────────────────────────────────────────────────

  describe('commands', () => {
    it('should queue a command', () => {
      manager.start();
      const cmdId = manager.queueCommand('brittney', 'spawn_object', {
        objectType: 'sphere',
      });
      vi.advanceTimersByTime(100);

      expect(cmdId).toBeDefined();
      expect(cmdId).toContain('cmd-brittney-');
    });

    it('should make commands consumable', () => {
      manager.start();
      manager.queueCommand('brittney', 'highlight', { target: 'obj1' });
      vi.advanceTimersByTime(100);

      const commands = manager.consumeCommands();
      expect(commands).toHaveLength(1);
      expect(commands[0].type).toBe('highlight');
      expect(commands[0].agentId).toBe('brittney');
    });

    it('should not return consumed commands again', () => {
      manager.start();
      manager.queueCommand('brittney', 'highlight', {});
      vi.advanceTimersByTime(100);

      // First consumption
      const first = manager.consumeCommands();
      expect(first).toHaveLength(1);

      // Second consumption should be empty
      const second = manager.consumeCommands();
      expect(second).toHaveLength(0);
    });

    it('should handle multiple commands in sequence', () => {
      manager.start();
      manager.queueCommand('brittney', 'spawn', { type: 'cube' });
      manager.queueCommand('brittney', 'highlight', { color: 'red' });
      manager.queueCommand('builder', 'navigate', { target: [0, 0, 0] });
      vi.advanceTimersByTime(100);

      const commands = manager.consumeCommands();
      expect(commands).toHaveLength(3);
      expect(commands.map((c) => c.type)).toEqual(['spawn', 'highlight', 'navigate']);
    });

    it('should call onCommandQueued callback', () => {
      const onQueued = vi.fn();
      const mgr = new AgentCommunicationManager({
        updateHz: 30,
        onCommandQueued: onQueued,
      });
      mgr.start();
      mgr.queueCommand('brittney', 'test', {});
      vi.advanceTimersByTime(100);

      expect(onQueued).toHaveBeenCalled();
      expect(onQueued.mock.calls[0][0].type).toBe('test');
      mgr.dispose();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // RAW MESSAGE API
  // ─────────────────────────────────────────────────────────────────────────

  describe('raw message API', () => {
    it('should process raw connect messages', () => {
      manager.start();
      manager.onMessage({
        type: 'connect',
        agentId: 'test-agent',
        timestamp: Date.now(),
        payload: { name: 'Test Agent' },
      });
      vi.advanceTimersByTime(100);

      expect(manager.isAgentConnected('test-agent')).toBe(true);
    });

    it('should process raw state update messages', () => {
      manager.start();
      manager.connectAgent('agent1');
      vi.advanceTimersByTime(100);

      manager.onMessage({
        type: 'state_update',
        agentId: 'agent1',
        timestamp: Date.now(),
        payload: {
          position: { x: 10, y: 20, z: 30 },
          animationState: 'walking',
        },
      });
      vi.advanceTimersByTime(100);

      const state = manager.getCurrentState();
      expect(state.agents['agent1'].position).toEqual({ x: 10, y: 20, z: 30 });
      expect(state.agents['agent1'].animationState).toBe('walking');
    });

    it('should process heartbeat messages', () => {
      manager.start();
      manager.connectAgent('agent1');
      vi.advanceTimersByTime(100);

      const now = Date.now();
      manager.onMessage({
        type: 'heartbeat',
        agentId: 'agent1',
        timestamp: now,
        payload: {},
      });
      vi.advanceTimersByTime(100);

      const state = manager.getCurrentState();
      expect(state.agents['agent1'].lastUpdateTimestamp).toBe(now);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // BUFFER INTEGRATION
  // ─────────────────────────────────────────────────────────────────────────

  describe('buffer integration', () => {
    it('should provide access to the underlying buffer', () => {
      const buffer = manager.getBuffer();
      expect(buffer).toBeDefined();
    });

    it('should swap buffer when messages are processed', () => {
      const onSwap = vi.fn();
      const mgr = new AgentCommunicationManager({
        updateHz: 30,
        onBufferSwap: onSwap,
      });
      mgr.start();
      mgr.connectAgent('test');
      vi.advanceTimersByTime(100);

      expect(onSwap).toHaveBeenCalled();
      mgr.dispose();
    });

    it('should not swap buffer when no messages are queued', () => {
      const onSwap = vi.fn();
      const mgr = new AgentCommunicationManager({
        updateHz: 30,
        onBufferSwap: onSwap,
      });
      mgr.start();
      // No messages queued
      vi.advanceTimersByTime(100);

      // Should not swap since there were no messages
      expect(onSwap).not.toHaveBeenCalled();
      mgr.dispose();
    });

    it('should increment sequence on each swap', () => {
      manager.start();
      manager.connectAgent('a');
      vi.advanceTimersByTime(100);

      const state1 = manager.getCurrentState();
      const seq1 = state1.sequence;

      manager.updateAgentState('a', { emotion: 'happy' });
      vi.advanceTimersByTime(100);

      const state2 = manager.getCurrentState();
      expect(state2.sequence).toBeGreaterThan(seq1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // METRICS
  // ─────────────────────────────────────────────────────────────────────────

  describe('metrics', () => {
    it('should track total messages processed', () => {
      manager.start();
      manager.connectAgent('a');
      manager.updateAgentState('a', { emotion: 'test' });
      vi.advanceTimersByTime(100);

      const metrics = manager.getMetrics();
      expect(metrics.totalMessagesProcessed).toBe(2); // connect + update
    });

    it('should report connected agent count', () => {
      manager.start();
      manager.connectAgent('a');
      manager.connectAgent('b');
      vi.advanceTimersByTime(100);

      const metrics = manager.getMetrics();
      expect(metrics.connectedAgents).toBe(2);
    });

    it('should report update Hz', () => {
      const metrics = manager.getMetrics();
      expect(metrics.updateHz).toBe(30);
    });

    it('should report running state', () => {
      expect(manager.getMetrics().isRunning).toBe(false);
      manager.start();
      expect(manager.getMetrics().isRunning).toBe(true);
    });

    it('should include buffer metrics', () => {
      const metrics = manager.getMetrics();
      expect(metrics.bufferMetrics).toBeDefined();
      expect(metrics.bufferMetrics).toHaveProperty('totalSwaps');
      expect(metrics.bufferMetrics).toHaveProperty('isStale');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EDGE CASES
  // ─────────────────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('should handle message overflow gracefully', () => {
      // Queue more messages than the max (1000)
      for (let i = 0; i < 1100; i++) {
        manager.onMessage({
          type: 'heartbeat',
          agentId: 'test',
          timestamp: Date.now(),
          payload: {},
        });
      }

      // Should not throw, oldest messages dropped
      manager.start();
      vi.advanceTimersByTime(100);
      expect(manager.getMetrics().totalMessagesProcessed).toBeLessThanOrEqual(1100);
    });

    it('should handle disconnect of non-connected agent', () => {
      manager.start();
      manager.disconnectAgent('nonexistent');
      vi.advanceTimersByTime(100);
      // Should not throw
      expect(manager.getConnectedAgentCount()).toBe(0);
    });

    it('should handle rapid connect/disconnect cycles', () => {
      manager.start();

      for (let i = 0; i < 10; i++) {
        manager.connectAgent('cycle-agent');
        manager.disconnectAgent('cycle-agent');
      }

      vi.advanceTimersByTime(100);

      // Final state: agent should be disconnected
      expect(manager.isAgentConnected('cycle-agent')).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // FACTORY
  // ─────────────────────────────────────────────────────────────────────────

  describe('factory function', () => {
    it('should create a manager via factory', () => {
      const mgr = createAgentCommunicationManager({ updateHz: 60 });
      expect(mgr).toBeDefined();
      expect(mgr.getMetrics().updateHz).toBe(60);
      mgr.dispose();
    });
  });
});
