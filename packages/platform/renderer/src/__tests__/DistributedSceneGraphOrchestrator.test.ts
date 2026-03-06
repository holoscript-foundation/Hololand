/**
 * @vitest-environment jsdom
 */

/**
 * Tests for DistributedSceneGraphOrchestrator (MA3DSG Integration Layer)
 *
 * Validates:
 * - Agent registration and unregistration
 * - Observation submission and buffering
 * - Full inference pipeline (build -> merge -> extract -> state)
 * - SpatialReasoningProvider interface compliance
 * - Multi-agent observation processing
 * - Metrics collection
 * - Event system
 * - CachedSpatialState population
 * - Complexity scoring
 * - Dispose and cleanup
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
  DistributedSceneGraphOrchestrator,
  createDistributedSceneGraphOrchestrator,
} from '../DistributedSceneGraphOrchestrator';
import { createEmptyCachedSpatialState } from '../SpatialInferenceTypes';
import type { ObjectSnapshot, CameraSnapshot } from '../SpatialReasoningEngine';
import type { CachedSpatialState } from '../SpatialInferenceTypes';
import type { DistributedSceneGraphEvent } from '../DistributedSceneGraphTypes';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createSnapshot(
  id: string,
  label: string,
  position: { x: number; y: number; z: number },
  size: number = 1,
): ObjectSnapshot {
  return {
    id,
    type: 'mesh',
    label,
    position,
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    boundsMin: {
      x: position.x - size / 2,
      y: position.y - size / 2,
      z: position.z - size / 2,
    },
    boundsMax: {
      x: position.x + size / 2,
      y: position.y + size / 2,
      z: position.z + size / 2,
    },
    visible: true,
  };
}

function createDefaultCamera(): CameraSnapshot {
  return {
    position: { x: 0, y: 0, z: 10 },
    forward: { x: 0, y: 0, z: -1 },
    up: { x: 0, y: 1, z: 0 },
    right: { x: 1, y: 0, z: 0 },
    fov: 75,
    near: 0.1,
    far: 1000,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('DistributedSceneGraphOrchestrator', () => {
  let orchestrator: DistributedSceneGraphOrchestrator;

  beforeEach(() => {
    orchestrator = new DistributedSceneGraphOrchestrator();
  });

  // ─── Construction ─────────────────────────────────────────────────────────

  describe('construction', () => {
    it('should create orchestrator with no agents', () => {
      expect(orchestrator.getRegisteredAgentIds()).toHaveLength(0);
    });

    it('should accept custom configuration', () => {
      const custom = new DistributedSceneGraphOrchestrator({
        maxAgents: 16,
        neighborDistanceThreshold: 10,
      });
      expect(custom.getRegisteredAgentIds()).toHaveLength(0);
    });

    it('should implement SpatialReasoningProvider interface', () => {
      expect(typeof orchestrator.infer).toBe('function');
      expect(typeof orchestrator.getComplexity).toBe('function');
      expect(typeof orchestrator.initialize).toBe('function');
      expect(typeof orchestrator.dispose).toBe('function');
    });
  });

  // ─── Factory ──────────────────────────────────────────────────────────────

  describe('factory', () => {
    it('should create orchestrator via factory function', () => {
      const o = createDistributedSceneGraphOrchestrator();
      expect(o.getRegisteredAgentIds()).toHaveLength(0);
    });
  });

  // ─── Agent Registration ───────────────────────────────────────────────────

  describe('agent registration', () => {
    it('should register an agent', () => {
      orchestrator.registerAgent('agent-1');
      expect(orchestrator.isAgentRegistered('agent-1')).toBe(true);
      expect(orchestrator.getRegisteredAgentIds()).toContain('agent-1');
    });

    it('should register multiple agents', () => {
      orchestrator.registerAgent('agent-1');
      orchestrator.registerAgent('agent-2');
      orchestrator.registerAgent('agent-3');

      expect(orchestrator.getRegisteredAgentIds()).toHaveLength(3);
    });

    it('should handle duplicate registration gracefully', () => {
      orchestrator.registerAgent('agent-1');
      orchestrator.registerAgent('agent-1'); // Should not throw

      expect(orchestrator.getRegisteredAgentIds()).toHaveLength(1);
    });

    it('should throw when max agents exceeded', () => {
      const limited = new DistributedSceneGraphOrchestrator({ maxAgents: 2 });
      limited.registerAgent('agent-1');
      limited.registerAgent('agent-2');

      expect(() => limited.registerAgent('agent-3')).toThrow('Maximum agent count');
    });

    it('should unregister an agent', () => {
      orchestrator.registerAgent('agent-1');
      orchestrator.unregisterAgent('agent-1');

      expect(orchestrator.isAgentRegistered('agent-1')).toBe(false);
      expect(orchestrator.getRegisteredAgentIds()).toHaveLength(0);
    });
  });

  // ─── Observation Submission ───────────────────────────────────────────────

  describe('observation submission', () => {
    it('should accept observations from registered agents', () => {
      orchestrator.registerAgent('agent-1');
      orchestrator.submitObservations('agent-1', [
        createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
      ]);
      // No error means success
    });

    it('should auto-register agents on first observation', () => {
      orchestrator.submitObservations('agent-new', [
        createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
      ]);

      expect(orchestrator.isAgentRegistered('agent-new')).toBe(true);
    });

    it('should accept camera state', () => {
      orchestrator.setCamera(createDefaultCamera());
      // No error means success
    });
  });

  // ─── Inference Pipeline ───────────────────────────────────────────────────

  describe('inference pipeline', () => {
    it('should run full inference pipeline', async () => {
      const state = createEmptyCachedSpatialState();

      orchestrator.submitObservations('agent-1', [
        createSnapshot('table', 'table', { x: 0, y: 0, z: 0 }),
        createSnapshot('chair', 'chair', { x: 2, y: 0, z: 0 }),
      ]);

      await orchestrator.infer(state, 500);

      expect(state.sequence).toBe(1);
      expect(state.objectCount).toBeGreaterThan(0);
      expect(state.lastInferenceDurationMs).toBeGreaterThanOrEqual(0);
      expect(state.lastInferenceTimestamp).toBeGreaterThan(0);
    });

    it('should populate relationships in CachedSpatialState', async () => {
      const state = createEmptyCachedSpatialState();

      orchestrator.submitObservations('agent-1', [
        createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
        createSnapshot('obj-2', 'chair', { x: 2, y: 0, z: 0 }),
      ]);

      await orchestrator.infer(state, 500);

      expect(state.relationships.length).toBeGreaterThanOrEqual(0);
    });

    it('should populate scene summary in CachedSpatialState', async () => {
      const state = createEmptyCachedSpatialState();

      orchestrator.submitObservations('agent-1', [
        createSnapshot('obj-1', 'table', { x: -5, y: 0, z: 0 }),
        createSnapshot('obj-2', 'chair', { x: 5, y: 3, z: 0 }),
      ]);

      await orchestrator.infer(state, 500);

      expect(state.objectCount).toBe(2);
      expect(state.sceneComplexity).toBeGreaterThanOrEqual(0);
      expect(state.sceneComplexity).toBeLessThanOrEqual(1);
      expect(state.sceneCenterOfMass).toBeDefined();
      expect(state.sceneExtents).toBeDefined();
    });

    it('should handle empty observations gracefully', async () => {
      const state = createEmptyCachedSpatialState();

      await orchestrator.infer(state, 500);

      expect(state.sequence).toBe(1);
      expect(state.objectCount).toBe(0);
      expect(state.relationships).toHaveLength(0);
    });

    it('should increment sequence on each infer call', async () => {
      const state = createEmptyCachedSpatialState();

      orchestrator.submitObservations('agent-1', [
        createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
      ]);

      await orchestrator.infer(state, 500);
      expect(state.sequence).toBe(1);

      orchestrator.submitObservations('agent-1', [
        createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
      ]);

      await orchestrator.infer(state, 500);
      expect(state.sequence).toBe(2);
    });
  });

  // ─── Multi-Agent Inference ────────────────────────────────────────────────

  describe('multi-agent inference', () => {
    it('should process observations from multiple agents', async () => {
      const state = createEmptyCachedSpatialState();

      // Two agents observing different areas
      orchestrator.submitObservations('agent-1', [
        createSnapshot('table', 'table', { x: 0, y: 0, z: 0 }),
        createSnapshot('chair-a', 'chair', { x: 2, y: 0, z: 0 }),
      ]);

      orchestrator.submitObservations('agent-2', [
        createSnapshot('desk', 'desk', { x: 20, y: 0, z: 0 }),
        createSnapshot('monitor', 'monitor', { x: 20, y: 1.5, z: 0 }),
      ]);

      await orchestrator.infer(state, 500);

      // Should have nodes from both agents
      expect(state.objectCount).toBe(4);
    });

    it('should handle overlapping observations from agents', async () => {
      const state = createEmptyCachedSpatialState();

      // Both agents see the same scene area
      orchestrator.submitObservations('agent-1', [
        createSnapshot('table', 'table', { x: 0, y: 0, z: 0 }),
        createSnapshot('chair', 'chair', { x: 2, y: 0, z: 0 }),
      ]);

      orchestrator.submitObservations('agent-2', [
        createSnapshot('table', 'table', { x: 0.1, y: 0, z: 0.1 }),
        createSnapshot('lamp', 'lamp', { x: 0, y: 3, z: 0 }),
      ]);

      await orchestrator.infer(state, 500);

      // Global graph should have merged overlapping nodes
      expect(state.objectCount).toBeGreaterThan(0);
      expect(state.objectCount).toBeLessThanOrEqual(4); // Some may merge
    });
  });

  // ─── Complexity ───────────────────────────────────────────────────────────

  describe('complexity', () => {
    it('should return 0 complexity for empty graph', () => {
      expect(orchestrator.getComplexity()).toBe(0);
    });

    it('should update complexity after inference', async () => {
      const state = createEmptyCachedSpatialState();

      orchestrator.submitObservations('agent-1', [
        createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
        createSnapshot('obj-2', 'chair', { x: 2, y: 0, z: 0 }),
        createSnapshot('obj-3', 'lamp', { x: 0, y: 3, z: 0 }),
      ]);

      await orchestrator.infer(state, 500);

      expect(orchestrator.getComplexity()).toBeGreaterThan(0);
    });
  });

  // ─── Metrics ──────────────────────────────────────────────────────────────

  describe('metrics', () => {
    it('should provide comprehensive metrics', async () => {
      const state = createEmptyCachedSpatialState();

      orchestrator.registerAgent('agent-1');
      orchestrator.submitObservations('agent-1', [
        createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
      ]);

      await orchestrator.infer(state, 500);

      const metrics = orchestrator.getMetrics();

      expect(metrics.activeAgents).toBe(1);
      expect(metrics.globalNodeCount).toBeGreaterThanOrEqual(0);
      expect(metrics.globalEdgeCount).toBeGreaterThanOrEqual(0);
      expect(metrics.agentGraphSizes).toBeDefined();
      expect(metrics.agentGraphSizes['agent-1']).toBeDefined();
      expect(metrics.totalMerges).toBeGreaterThanOrEqual(0);
      expect(metrics.spatialExtent).toBeGreaterThanOrEqual(0);
    });

    it('should track per-agent graph sizes', async () => {
      const state = createEmptyCachedSpatialState();

      orchestrator.submitObservations('agent-1', [
        createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
        createSnapshot('obj-2', 'chair', { x: 2, y: 0, z: 0 }),
      ]);

      orchestrator.submitObservations('agent-2', [
        createSnapshot('obj-3', 'desk', { x: 10, y: 0, z: 0 }),
      ]);

      await orchestrator.infer(state, 500);

      const metrics = orchestrator.getMetrics();
      expect(metrics.agentGraphSizes['agent-1'].nodes).toBe(2);
      expect(metrics.agentGraphSizes['agent-2'].nodes).toBe(1);
    });
  });

  // ─── Event System ─────────────────────────────────────────────────────────

  describe('event system', () => {
    it('should emit agent_registered events', () => {
      const events: DistributedSceneGraphEvent[] = [];
      orchestrator.addEventListener(e => events.push(e));

      orchestrator.registerAgent('agent-1');

      const registered = events.filter(e => e.type === 'agent_registered');
      expect(registered).toHaveLength(1);
      expect(registered[0].agentId).toBe('agent-1');
    });

    it('should emit agent_unregistered events', () => {
      const events: DistributedSceneGraphEvent[] = [];
      orchestrator.registerAgent('agent-1');
      orchestrator.addEventListener(e => events.push(e));

      orchestrator.unregisterAgent('agent-1');

      const unregistered = events.filter(e => e.type === 'agent_unregistered');
      expect(unregistered).toHaveLength(1);
    });

    it('should emit local_graph_updated on inference', async () => {
      const events: DistributedSceneGraphEvent[] = [];
      orchestrator.addEventListener(e => events.push(e));

      const state = createEmptyCachedSpatialState();

      orchestrator.submitObservations('agent-1', [
        createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
      ]);

      await orchestrator.infer(state, 500);

      const updated = events.filter(e => e.type === 'local_graph_updated');
      expect(updated.length).toBeGreaterThan(0);
    });

    it('should emit merge events on inference', async () => {
      const events: DistributedSceneGraphEvent[] = [];
      orchestrator.addEventListener(e => events.push(e));

      const state = createEmptyCachedSpatialState();

      orchestrator.submitObservations('agent-1', [
        createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
      ]);

      await orchestrator.infer(state, 500);

      const mergeStarted = events.filter(e => e.type === 'merge_started');
      const mergeCompleted = events.filter(e => e.type === 'merge_completed');
      expect(mergeStarted.length).toBeGreaterThan(0);
      expect(mergeCompleted.length).toBeGreaterThan(0);
    });

    it('should remove event listeners', () => {
      const events: DistributedSceneGraphEvent[] = [];
      const listener = (e: DistributedSceneGraphEvent) => events.push(e);

      orchestrator.addEventListener(listener);
      orchestrator.registerAgent('agent-1');
      expect(events.length).toBeGreaterThan(0);

      const countBefore = events.length;
      orchestrator.removeEventListener(listener);
      orchestrator.registerAgent('agent-2');
      expect(events.length).toBe(countBefore); // No new events
    });

    it('should not emit events when emitEvents is false', () => {
      const quietOrchestrator = new DistributedSceneGraphOrchestrator({
        emitEvents: false,
      });

      const events: DistributedSceneGraphEvent[] = [];
      quietOrchestrator.addEventListener(e => events.push(e));
      quietOrchestrator.registerAgent('agent-1');

      expect(events).toHaveLength(0);
    });
  });

  // ─── Global Graph Access ──────────────────────────────────────────────────

  describe('global graph access', () => {
    it('should provide access to global graph', async () => {
      const state = createEmptyCachedSpatialState();

      orchestrator.submitObservations('agent-1', [
        createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
      ]);

      await orchestrator.infer(state, 500);

      const globalGraph = orchestrator.getGlobalGraph();
      expect(globalGraph).toBeDefined();
      expect(globalGraph.nodes.size).toBeGreaterThan(0);
    });

    it('should provide access to last extraction result', async () => {
      const state = createEmptyCachedSpatialState();

      orchestrator.submitObservations('agent-1', [
        createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
        createSnapshot('obj-2', 'chair', { x: 2, y: 0, z: 0 }),
      ]);

      await orchestrator.infer(state, 500);

      const result = orchestrator.getLastExtractionResult();
      expect(result).not.toBeNull();
      expect(result!.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── Initialize and Dispose ───────────────────────────────────────────────

  describe('initialize and dispose', () => {
    it('should initialize successfully', async () => {
      await orchestrator.initialize();
      // No error means success
    });

    it('should clean up on dispose', async () => {
      orchestrator.registerAgent('agent-1');
      orchestrator.registerAgent('agent-2');

      const state = createEmptyCachedSpatialState();
      orchestrator.submitObservations('agent-1', [
        createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
      ]);
      await orchestrator.infer(state, 500);

      orchestrator.dispose();

      expect(orchestrator.getRegisteredAgentIds()).toHaveLength(0);
      expect(orchestrator.getLastExtractionResult()).toBeNull();
    });
  });

  // ─── Edge Cases ───────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('should handle single object observation', async () => {
      const state = createEmptyCachedSpatialState();

      orchestrator.submitObservations('agent-1', [
        createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
      ]);

      await orchestrator.infer(state, 500);
      expect(state.objectCount).toBe(1);
    });

    it('should handle large number of objects', async () => {
      const state = createEmptyCachedSpatialState();

      const snapshots: ObjectSnapshot[] = [];
      for (let i = 0; i < 50; i++) {
        snapshots.push(
          createSnapshot(`obj-${i}`, 'box', {
            x: (i % 10) * 2,
            y: Math.floor(i / 10) * 2,
            z: 0,
          }),
        );
      }

      orchestrator.submitObservations('agent-1', snapshots);
      await orchestrator.infer(state, 500);

      expect(state.objectCount).toBe(50);
      expect(state.lastInferenceDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle repeated infer calls', async () => {
      const state = createEmptyCachedSpatialState();

      for (let i = 0; i < 5; i++) {
        orchestrator.submitObservations('agent-1', [
          createSnapshot('obj-1', 'table', { x: i * 0.1, y: 0, z: 0 }),
        ]);
        await orchestrator.infer(state, 500);
      }

      expect(state.sequence).toBe(5);
    });
  });
});
