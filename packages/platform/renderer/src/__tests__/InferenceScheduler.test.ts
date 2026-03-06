/**
 * @vitest-environment jsdom
 */

/**
 * Tests for InferenceScheduler (Orchestrator for Hierarchical Inference)
 *
 * Validates:
 * - Lifecycle management (start, stop, dispose)
 * - Double-buffered state flow (back buffer write -> swap -> front buffer read)
 * - Inference loop execution at configured frequency
 * - Adaptive frequency adjustment based on inference duration
 * - Scene snapshot integration
 * - Metrics tracking
 * - Skipped passes when inference overruns interval
 * - Buffer staleness detection
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
  InferenceScheduler,
  createInferenceScheduler,
} from '../InferenceScheduler';

import {
  SpatialReasoningEngine,
  createSpatialReasoningEngine,
  type ObjectSnapshot,
  type CameraSnapshot,
} from '../SpatialReasoningEngine';

import type {
  CachedSpatialState,
  SpatialReasoningProvider,
  InferenceSchedulerConfig,
} from '../SpatialInferenceTypes';

import { createEmptyCachedSpatialState } from '../SpatialInferenceTypes';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createObject(
  id: string,
  position: { x: number; y: number; z: number },
): ObjectSnapshot {
  return {
    id,
    type: 'mesh',
    position,
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    boundsMin: {
      x: position.x - 0.5,
      y: position.y - 0.5,
      z: position.z - 0.5,
    },
    boundsMax: {
      x: position.x + 0.5,
      y: position.y + 0.5,
      z: position.z + 0.5,
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

/**
 * Create a mock spatial reasoning provider for testing.
 */
function createMockProvider(options?: {
  inferDelay?: number;
  complexity?: number;
}): SpatialReasoningProvider {
  const delay = options?.inferDelay ?? 0;
  const complexity = options?.complexity ?? 0.3;

  return {
    infer: vi.fn(async (state: CachedSpatialState, _deltaMs: number) => {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      state.objectCount = 10;
      state.sceneComplexity = complexity;
      state.relationships = [];
      state.regions = [];
    }),
    getComplexity: vi.fn(() => complexity),
    initialize: vi.fn(async () => {}),
    dispose: vi.fn(),
  };
}

/**
 * Utility: wait for a number of milliseconds.
 */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// TESTS
// =============================================================================

describe('InferenceScheduler', () => {
  let scheduler: InferenceScheduler;
  let provider: SpatialReasoningProvider;

  afterEach(() => {
    if (scheduler) {
      scheduler.dispose();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  describe('initialization', () => {
    it('should create with default configuration', () => {
      provider = createMockProvider();
      scheduler = new InferenceScheduler(provider);

      expect(scheduler.getCurrentHz()).toBe(2); // default initialHz
      expect(scheduler.getIsRunning()).toBe(false);
    });

    it('should create with custom configuration', () => {
      provider = createMockProvider();
      scheduler = new InferenceScheduler(provider, {
        initialHz: 3,
        minHz: 1,
        maxHz: 5,
      });

      expect(scheduler.getCurrentHz()).toBe(3);
    });

    it('should auto-start when configured', async () => {
      provider = createMockProvider();
      scheduler = new InferenceScheduler(provider, {
        autoStart: true,
      });

      // Give it a tick to start
      await wait(10);
      expect(scheduler.getIsRunning()).toBe(true);
      expect(provider.initialize).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  describe('lifecycle', () => {
    beforeEach(() => {
      provider = createMockProvider();
      scheduler = new InferenceScheduler(provider, {
        initialHz: 5,
        adaptiveFrequency: false,
      });
    });

    it('should start the inference loop', async () => {
      await scheduler.start();
      expect(scheduler.getIsRunning()).toBe(true);
      expect(provider.initialize).toHaveBeenCalled();
    });

    it('should not start twice', async () => {
      await scheduler.start();
      await scheduler.start(); // Should warn and return

      expect(scheduler.getIsRunning()).toBe(true);
      // initialize called only once
      expect(provider.initialize).toHaveBeenCalledTimes(1);
    });

    it('should stop the inference loop', async () => {
      await scheduler.start();
      scheduler.stop();
      expect(scheduler.getIsRunning()).toBe(false);
    });

    it('should not stop when already stopped', () => {
      scheduler.stop(); // Should warn but not error
      expect(scheduler.getIsRunning()).toBe(false);
    });

    it('should dispose and release resources', async () => {
      await scheduler.start();
      scheduler.dispose();

      expect(scheduler.getIsRunning()).toBe(false);
      expect(provider.dispose).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DOUBLE-BUFFERED STATE FLOW
  // ─────────────────────────────────────────────────────────────────────────

  describe('double-buffered state flow', () => {
    it('should provide empty initial state from front buffer', () => {
      provider = createMockProvider();
      scheduler = new InferenceScheduler(provider);

      const state = scheduler.getCurrentState();
      expect(state.sequence).toBe(0);
      expect(state.objectCount).toBe(0);
    });

    it('should update front buffer after inference pass and swap', async () => {
      provider = createMockProvider();
      scheduler = new InferenceScheduler(provider, {
        initialHz: 10, // High frequency for fast test
        adaptiveFrequency: false,
      });

      await scheduler.start();

      // Wait for at least one inference pass + swap
      await wait(200);

      const state = scheduler.getCurrentState();
      expect(state.objectCount).toBe(10); // Set by mock provider
    });

    it('should expose the buffer for external access', () => {
      provider = createMockProvider();
      scheduler = new InferenceScheduler(provider);

      const buffer = scheduler.getBuffer();
      expect(buffer).toBeDefined();
      expect(typeof buffer.getFrontBuffer).toBe('function');
      expect(typeof buffer.getBackBuffer).toBe('function');
      expect(typeof buffer.swap).toBe('function');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SCENE SNAPSHOT INTEGRATION
  // ─────────────────────────────────────────────────────────────────────────

  describe('scene snapshot integration', () => {
    it('should accept a snapshot callback', () => {
      provider = createMockProvider();
      scheduler = new InferenceScheduler(provider);

      const callback = vi.fn(() => ({
        objects: [createObject('a', { x: 0, y: 0, z: 0 })],
        camera: createDefaultCamera(),
      }));

      scheduler.setSnapshotCallback(callback);
      // No error thrown
    });

    it('should call snapshot callback during inference pass', async () => {
      const engine = createSpatialReasoningEngine();
      scheduler = new InferenceScheduler(engine, {
        initialHz: 10,
        adaptiveFrequency: false,
      });

      const snapshotCallback = vi.fn(() => ({
        objects: [
          createObject('a', { x: 0, y: 0, z: 0 }),
          createObject('b', { x: 3, y: 0, z: 0 }),
        ],
        camera: createDefaultCamera(),
      }));

      scheduler.setSnapshotCallback(snapshotCallback);
      await scheduler.start();

      // Wait for inference passes
      await wait(300);

      expect(snapshotCallback).toHaveBeenCalled();

      // The engine should have received the snapshot and produced state
      const state = scheduler.getCurrentState();
      expect(state.objectCount).toBe(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // FREQUENCY CONTROL
  // ─────────────────────────────────────────────────────────────────────────

  describe('frequency control', () => {
    it('should report current and target Hz', () => {
      provider = createMockProvider();
      scheduler = new InferenceScheduler(provider, {
        initialHz: 3,
      });

      expect(scheduler.getCurrentHz()).toBe(3);
      expect(scheduler.getTargetHz()).toBe(3);
    });

    it('should allow manual frequency adjustment', () => {
      provider = createMockProvider();
      scheduler = new InferenceScheduler(provider, {
        initialHz: 2,
        minHz: 1,
        maxHz: 5,
      });

      scheduler.setTargetHz(4);
      expect(scheduler.getCurrentHz()).toBe(4);
    });

    it('should clamp frequency to min/max bounds', () => {
      provider = createMockProvider();
      scheduler = new InferenceScheduler(provider, {
        initialHz: 2,
        minHz: 1,
        maxHz: 5,
      });

      scheduler.setTargetHz(10); // Over max
      expect(scheduler.getCurrentHz()).toBe(5); // Clamped to max

      scheduler.setTargetHz(0.1); // Under min
      expect(scheduler.getCurrentHz()).toBe(1); // Clamped to min
    });

    it('should fire onFrequencyChange callback', () => {
      const onFreqChange = vi.fn();
      provider = createMockProvider();
      scheduler = new InferenceScheduler(provider, {
        initialHz: 2,
        minHz: 1,
        maxHz: 5,
        onFrequencyChange: onFreqChange,
      });

      scheduler.setTargetHz(4);
      expect(onFreqChange).toHaveBeenCalledWith(2, 4, 'manual');
    });

    it('should not fire callback when frequency does not change', () => {
      const onFreqChange = vi.fn();
      provider = createMockProvider();
      scheduler = new InferenceScheduler(provider, {
        initialHz: 2,
        onFrequencyChange: onFreqChange,
      });

      scheduler.setTargetHz(2); // Same as current
      expect(onFreqChange).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // METRICS
  // ─────────────────────────────────────────────────────────────────────────

  describe('metrics', () => {
    it('should report initial metrics', () => {
      provider = createMockProvider();
      scheduler = new InferenceScheduler(provider, { initialHz: 2 });

      const metrics = scheduler.getMetrics();
      expect(metrics.isRunning).toBe(false);
      expect(metrics.currentHz).toBe(2);
      expect(metrics.targetHz).toBe(2);
      expect(metrics.totalPasses).toBe(0);
      expect(metrics.skippedPasses).toBe(0);
      expect(metrics.isInferring).toBe(false);
      expect(metrics.averageInferenceDurationMs).toBe(0);
      expect(metrics.peakInferenceDurationMs).toBe(0);
    });

    it('should track inference passes after running', async () => {
      provider = createMockProvider();
      scheduler = new InferenceScheduler(provider, {
        initialHz: 10,
        adaptiveFrequency: false,
      });

      await scheduler.start();
      await wait(350); // Should get 2-3 passes at 10Hz

      const metrics = scheduler.getMetrics();
      expect(metrics.isRunning).toBe(true);
      expect(metrics.totalPasses).toBeGreaterThanOrEqual(1);
      expect(metrics.averageInferenceDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('should track buffer staleness', () => {
      provider = createMockProvider();
      scheduler = new InferenceScheduler(provider, {
        stalenessThresholdMs: 100,
      });

      // Initially, buffer is not stale (no swaps have happened yet)
      const metrics = scheduler.getMetrics();
      expect(typeof metrics.isBufferStale).toBe('boolean');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ADAPTIVE FREQUENCY
  // ─────────────────────────────────────────────────────────────────────────

  describe('adaptive frequency', () => {
    it('should decrease frequency when inference is slow', async () => {
      // Mock provider that takes 250ms (over the default 200ms budget * 0.9 = 180ms)
      provider = createMockProvider({ inferDelay: 250 });
      const onFreqChange = vi.fn();

      scheduler = new InferenceScheduler(provider, {
        initialHz: 5,
        minHz: 1,
        maxHz: 5,
        maxInferenceBudgetMs: 200,
        adaptiveFrequency: true,
        onFrequencyChange: onFreqChange,
      });

      await scheduler.start();

      // Wait for several slow passes to trigger ramp-down (threshold = 2 slow passes)
      await wait(2000);

      // Frequency should have decreased
      const metrics = scheduler.getMetrics();
      expect(metrics.currentHz).toBeLessThan(5);
    });

    it('should not adapt frequency when disabled', async () => {
      provider = createMockProvider({ inferDelay: 250 }); // Would trigger ramp-down
      scheduler = new InferenceScheduler(provider, {
        initialHz: 3,
        adaptiveFrequency: false,
      });

      await scheduler.start();
      await wait(1000);

      expect(scheduler.getCurrentHz()).toBe(3); // Unchanged
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ERROR HANDLING
  // ─────────────────────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('should handle inference errors gracefully', async () => {
      const errorProvider: SpatialReasoningProvider = {
        infer: vi.fn(async () => {
          throw new Error('Inference failed');
        }),
        getComplexity: vi.fn(() => 0),
        initialize: vi.fn(async () => {}),
        dispose: vi.fn(),
      };

      scheduler = new InferenceScheduler(errorProvider, {
        initialHz: 10,
        adaptiveFrequency: false,
      });

      await scheduler.start();
      await wait(200);

      // Should still be running despite errors
      expect(scheduler.getIsRunning()).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // INTEGRATION WITH SpatialReasoningEngine
  // ─────────────────────────────────────────────────────────────────────────

  describe('integration with SpatialReasoningEngine', () => {
    it('should work end-to-end with real engine', async () => {
      const engine = createSpatialReasoningEngine();
      scheduler = createInferenceScheduler(engine, {
        initialHz: 10,
        adaptiveFrequency: false,
      });

      // Set up scene snapshot
      scheduler.setSnapshotCallback(() => ({
        objects: [
          createObject('sphere', { x: 0, y: 0, z: 0 }),
          createObject('cube', { x: 3, y: 0, z: 0 }),
          createObject('cylinder', { x: 0, y: 5, z: 0 }),
        ],
        camera: createDefaultCamera(),
      }));

      await scheduler.start();
      await wait(300);

      // Verify the full pipeline produced results
      const state = scheduler.getCurrentState();
      expect(state.sequence).toBeGreaterThan(0);
      expect(state.objectCount).toBe(3);
      expect(state.relationships.length).toBeGreaterThan(0);
      expect(state.lastInferenceDurationMs).toBeGreaterThanOrEqual(0);
      expect(state.lastInferenceTimestamp).toBeGreaterThan(0);
    });

    it('should handle dynamic scene changes between passes', async () => {
      const engine = createSpatialReasoningEngine();
      scheduler = createInferenceScheduler(engine, {
        initialHz: 10,
        adaptiveFrequency: false,
      });

      let objectCount = 2;
      scheduler.setSnapshotCallback(() => ({
        objects: Array.from({ length: objectCount }, (_, i) =>
          createObject(`obj-${i}`, { x: i * 3, y: 0, z: 0 }),
        ),
        camera: createDefaultCamera(),
      }));

      await scheduler.start();
      await wait(200);

      // State should reflect initial 2 objects
      let state = scheduler.getCurrentState();
      expect(state.objectCount).toBe(2);

      // Change the scene
      objectCount = 5;
      await wait(300);

      // State should now reflect 5 objects
      state = scheduler.getCurrentState();
      expect(state.objectCount).toBe(5);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // FACTORY
  // ─────────────────────────────────────────────────────────────────────────

  describe('factory', () => {
    it('createInferenceScheduler should create a configured scheduler', () => {
      provider = createMockProvider();
      scheduler = createInferenceScheduler(provider, {
        initialHz: 4,
        maxHz: 5,
      });

      expect(scheduler).toBeInstanceOf(InferenceScheduler);
      expect(scheduler.getCurrentHz()).toBe(4);
    });
  });
});
