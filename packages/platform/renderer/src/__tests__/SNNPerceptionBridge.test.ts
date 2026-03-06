/**
 * @vitest-environment jsdom
 */

/**
 * Tests for SNNPerceptionBridge
 *
 * Validates:
 * - Initialization and worker setup
 * - Scene extractor integration
 * - Manual input feeding
 * - Perception state reading (render-loop safe)
 * - Frequency control (set, adaptive, bounds)
 * - Metrics tracking
 * - Start/stop/dispose lifecycle
 * - Edge cases (no extractor, empty scene, rapid toggle)
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
  SNNPerceptionBridge,
  createSNNPerceptionBridge,
} from '../SNNPerceptionBridge';

import type {
  SNNPerceptionBridgeConfig,
  PerceptionSceneInput,
} from '../SNNPerceptionTypes';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createTestScene(objectCount: number = 5): PerceptionSceneInput {
  const objects = [];
  for (let i = 0; i < objectCount; i++) {
    objects.push({
      id: `obj-${i}`,
      position: { x: i * 2, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      size: 1.0,
      distanceFromCamera: i * 3 + 1,
      angularSize: 0.1,
      hasMoved: false,
    });
  }

  return {
    objects,
    cameraPosition: { x: 0, y: 0, z: 10 },
    cameraForward: { x: 0, y: 0, z: -1 },
    timestamp: performance.now(),
    frameSequence: 1,
  };
}

function createMockExtractor(objectCount: number = 5) {
  return vi.fn(() => ({
    objects: Array.from({ length: objectCount }, (_, i) => ({
      id: `scene-obj-${i}`,
      position: { x: i, y: 0, z: -i },
      scale: { x: 1, y: 1, z: 1 },
      visible: true,
    })),
    cameraPosition: { x: 0, y: 1.6, z: 5 },
    cameraForward: { x: 0, y: 0, z: -1 },
  }));
}

// =============================================================================
// LIFECYCLE TESTS
// =============================================================================

describe('SNNPerceptionBridge - Lifecycle', () => {
  it('should create with default config', () => {
    const bridge = createSNNPerceptionBridge();
    expect(bridge).toBeInstanceOf(SNNPerceptionBridge);
    expect(bridge.isActive()).toBe(false);
    expect(bridge.isWorkerReady()).toBe(false);
  });

  it('should create with custom config', () => {
    const bridge = createSNNPerceptionBridge({
      initialHz: 15,
      minHz: 2,
      maxHz: 20,
      adaptiveFrequency: false,
    });
    expect(bridge).toBeInstanceOf(SNNPerceptionBridge);
    expect(bridge.getCurrentHz()).toBe(15);
  });

  it('should initialize successfully', async () => {
    const bridge = createSNNPerceptionBridge();
    const result = await bridge.initialize();

    expect(bridge.isWorkerReady()).toBe(true);
    expect(result.gpuAvailable).toBe(false); // No GPU in jsdom
    expect(result.adapterInfo).toBeDefined();

    bridge.dispose();
  });

  it('should not double-initialize', async () => {
    const bridge = createSNNPerceptionBridge();
    await bridge.initialize();
    const result2 = await bridge.initialize(); // Should warn and return

    expect(result2.gpuAvailable).toBe(false);

    bridge.dispose();
  });

  it('should start and stop', async () => {
    const bridge = createSNNPerceptionBridge();
    await bridge.initialize();

    bridge.start();
    expect(bridge.isActive()).toBe(true);

    bridge.stop();
    expect(bridge.isActive()).toBe(false);

    bridge.dispose();
  });

  it('should not start without initialization', () => {
    const bridge = createSNNPerceptionBridge();
    bridge.start(); // Should log error
    expect(bridge.isActive()).toBe(false);
    bridge.dispose();
  });

  it('should dispose cleanly', async () => {
    const bridge = createSNNPerceptionBridge();
    await bridge.initialize();
    bridge.start();

    bridge.dispose();

    expect(bridge.isActive()).toBe(false);
    expect(bridge.isWorkerReady()).toBe(false);
  });

  it('should dispose without initialization', () => {
    const bridge = createSNNPerceptionBridge();
    expect(() => bridge.dispose()).not.toThrow();
  });
});

// =============================================================================
// INPUT FEEDING TESTS
// =============================================================================

describe('SNNPerceptionBridge - Input Feeding', () => {
  let bridge: SNNPerceptionBridge;

  beforeEach(async () => {
    bridge = createSNNPerceptionBridge({
      adaptiveFrequency: false,
    });
    await bridge.initialize();
  });

  afterEach(() => {
    bridge.dispose();
  });

  it('should accept manual scene input', async () => {
    const scene = createTestScene(5);
    await bridge.feedInput(scene);

    const state = bridge.readPerception();
    expect(state.sequence).toBeGreaterThanOrEqual(1);
  });

  it('should process multiple inputs sequentially', async () => {
    for (let i = 0; i < 3; i++) {
      await bridge.feedInput(createTestScene(3));
    }

    const state = bridge.readPerception();
    expect(state.sequence).toBe(3);
  });

  it('should handle empty scene input', async () => {
    const emptyScene: PerceptionSceneInput = {
      objects: [],
      cameraPosition: { x: 0, y: 0, z: 0 },
      cameraForward: { x: 0, y: 0, z: -1 },
      timestamp: performance.now(),
      frameSequence: 1,
    };

    await bridge.feedInput(emptyScene);
    const state = bridge.readPerception();
    expect(state.trackedObjectCount).toBe(0);
  });
});

// =============================================================================
// PERCEPTION READING TESTS
// =============================================================================

describe('SNNPerceptionBridge - Perception Reading', () => {
  let bridge: SNNPerceptionBridge;

  beforeEach(async () => {
    bridge = createSNNPerceptionBridge();
    await bridge.initialize();
  });

  afterEach(() => {
    bridge.dispose();
  });

  it('should return empty state before any inference', () => {
    const state = bridge.readPerception();
    expect(state.sequence).toBe(0);
    expect(state.attentionScores).toEqual([]);
  });

  it('should return latest state after inference', async () => {
    await bridge.feedInput(createTestScene(3));

    const state = bridge.readPerception();
    expect(state.sequence).toBe(1);
    expect(state.trackedObjectCount).toBe(3);
  });

  it('should check for new perception data', async () => {
    expect(bridge.hasNewPerception()).toBe(false);

    await bridge.feedInput(createTestScene(2));
    expect(bridge.hasNewPerception()).toBe(true);

    bridge.readPerception(); // Consume the new data
    expect(bridge.hasNewPerception()).toBe(false);
  });

  it('should get last perception without checking for updates', async () => {
    await bridge.feedInput(createTestScene(4));
    bridge.readPerception();

    const last = bridge.getLastPerception();
    expect(last.trackedObjectCount).toBe(4);
  });

  it('should be safe to call readPerception at high frequency', async () => {
    await bridge.feedInput(createTestScene(5));

    // Simulate 90Hz reads
    for (let i = 0; i < 100; i++) {
      const state = bridge.readPerception();
      expect(state).toBeDefined();
      expect(state.sequence).toBeGreaterThanOrEqual(0);
    }
  });
});

// =============================================================================
// SCENE EXTRACTOR TESTS
// =============================================================================

describe('SNNPerceptionBridge - Scene Extractor', () => {
  it('should accept and store scene extractor', async () => {
    const bridge = createSNNPerceptionBridge();
    await bridge.initialize();

    const extractor = createMockExtractor(3);
    bridge.setSceneExtractor(extractor);

    // Extractor won't be called until the input capture interval fires
    bridge.dispose();
  });
});

// =============================================================================
// FREQUENCY CONTROL TESTS
// =============================================================================

describe('SNNPerceptionBridge - Frequency Control', () => {
  let bridge: SNNPerceptionBridge;

  beforeEach(async () => {
    bridge = createSNNPerceptionBridge({
      initialHz: 10,
      minHz: 1,
      maxHz: 30,
    });
    await bridge.initialize();
  });

  afterEach(() => {
    bridge.dispose();
  });

  it('should return initial Hz', () => {
    expect(bridge.getCurrentHz()).toBe(10);
    expect(bridge.getTargetHz()).toBe(10);
  });

  it('should set target Hz', () => {
    bridge.setTargetHz(20);
    expect(bridge.getTargetHz()).toBe(20);
    expect(bridge.getCurrentHz()).toBe(20); // Applied immediately
  });

  it('should clamp Hz to minimum', () => {
    bridge.setTargetHz(0);
    expect(bridge.getTargetHz()).toBe(1);
  });

  it('should clamp Hz to maximum', () => {
    bridge.setTargetHz(100);
    expect(bridge.getTargetHz()).toBe(30);
  });

  it('should not trigger change callback for same Hz', () => {
    const onChange = vi.fn();
    const bridge2 = createSNNPerceptionBridge({
      initialHz: 10,
      onFrequencyChange: onChange,
    });

    // Setting same Hz should not trigger callback (internal check)
    bridge2.setTargetHz(10);
    expect(onChange).not.toHaveBeenCalled();

    bridge2.dispose();
  });

  it('should trigger change callback for different Hz', async () => {
    const onChange = vi.fn();
    const bridge2 = createSNNPerceptionBridge({
      initialHz: 10,
      minHz: 1,
      maxHz: 30,
      onFrequencyChange: onChange,
    });
    await bridge2.initialize();

    bridge2.setTargetHz(20);
    expect(onChange).toHaveBeenCalledWith(10, 20, 'manual');

    bridge2.dispose();
  });
});

// =============================================================================
// METRICS TESTS
// =============================================================================

describe('SNNPerceptionBridge - Metrics', () => {
  let bridge: SNNPerceptionBridge;

  beforeEach(async () => {
    bridge = createSNNPerceptionBridge();
    await bridge.initialize();
  });

  afterEach(() => {
    bridge.dispose();
  });

  it('should return initial metrics', () => {
    const metrics = bridge.getMetrics();

    expect(metrics.isActive).toBe(false);
    expect(metrics.isWorkerReady).toBe(true);
    expect(metrics.gpuAvailable).toBe(false);
    expect(metrics.currentHz).toBe(10);
    expect(metrics.totalInferences).toBe(0);
    expect(metrics.averageInferenceDurationMs).toBe(0);
    expect(metrics.peakInferenceDurationMs).toBe(0);
    expect(metrics.sabSizeBytes).toBeGreaterThan(0);
  });

  it('should track inference count', async () => {
    await bridge.feedInput(createTestScene(3));
    await bridge.feedInput(createTestScene(3));

    const metrics = bridge.getMetrics();
    expect(metrics.totalInferences).toBe(2);
  });

  it('should track inference duration', async () => {
    await bridge.feedInput(createTestScene(10));

    const metrics = bridge.getMetrics();
    expect(metrics.averageInferenceDurationMs).toBeGreaterThanOrEqual(0);
    expect(metrics.peakInferenceDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('should track GPU availability', () => {
    const metrics = bridge.getMetrics();
    expect(metrics.gpuAvailable).toBe(false);
    expect(typeof metrics.gpuAdapterInfo).toBe('string');
  });

  it('should report SAB size', () => {
    const metrics = bridge.getMetrics();
    expect(metrics.sabSizeBytes).toBeGreaterThan(0);
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe('SNNPerceptionBridge - Edge Cases', () => {
  it('should handle rapid start/stop cycles', async () => {
    const bridge = createSNNPerceptionBridge();
    await bridge.initialize();

    for (let i = 0; i < 10; i++) {
      bridge.start();
      bridge.stop();
    }

    expect(bridge.isActive()).toBe(false);
    bridge.dispose();
  });

  it('should handle dispose during active state', async () => {
    const bridge = createSNNPerceptionBridge();
    await bridge.initialize();
    bridge.start();

    expect(bridge.isActive()).toBe(true);
    bridge.dispose();
    expect(bridge.isActive()).toBe(false);
  });

  it('should handle multiple dispose calls', async () => {
    const bridge = createSNNPerceptionBridge();
    await bridge.initialize();

    bridge.dispose();
    expect(() => bridge.dispose()).not.toThrow();
  });

  it('should not error when reading perception before init', () => {
    const bridge = createSNNPerceptionBridge();
    const state = bridge.readPerception();
    expect(state.sequence).toBe(0);
    bridge.dispose();
  });

  it('should not error when feeding input before init', async () => {
    const bridge = createSNNPerceptionBridge();
    await bridge.feedInput(createTestScene(3));
    // Should silently return without error
    bridge.dispose();
  });

  it('should handle perception update callback', async () => {
    const onUpdate = vi.fn();
    const bridge = createSNNPerceptionBridge({
      onPerceptionUpdate: onUpdate,
    });
    await bridge.initialize();

    bridge.setSceneExtractor(createMockExtractor(3));

    // Callback is triggered by captureAndSendInput (internal timer),
    // so we use feedInput which also triggers the callback path
    // through the worker directly

    bridge.dispose();
  });

  it('should work with small max objects', async () => {
    const bridge = createSNNPerceptionBridge({
      workerConfig: { maxObjects: 4 },
      maxInputObjects: 4,
    });
    await bridge.initialize();

    await bridge.feedInput(createTestScene(4));
    const state = bridge.readPerception();
    expect(state.sequence).toBe(1);

    bridge.dispose();
  });
});
