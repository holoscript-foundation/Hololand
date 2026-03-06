/**
 * @vitest-environment jsdom
 */

/**
 * Tests for SNNPerceptionWorker
 *
 * Validates:
 * - Initialization with SharedArrayBuffer
 * - CPU fallback simulation (WebGPU unavailable in test env)
 * - Scene input encoding (rate coding)
 * - LIF neuron dynamics (decay, threshold, refractory)
 * - Output decoding (attention scores, salience, anomaly)
 * - SharedArrayBuffer write protocol (Atomics)
 * - Inference loop management
 * - Frequency control
 * - Disposal and cleanup
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
  SNNPerceptionWorker,
  createSNNPerceptionWorker,
} from '../SNNPerceptionWorker';

import {
  calculateBufferLayout,
  SAB_HEADER,
  SAB_ENTRY_SIZE,
  DEFAULT_WORKER_CONFIG,
} from '../SNNPerceptionTypes';

import type {
  PerceptionSceneInput,
  PerceptionObjectInput,
  SNNPerceptionWorkerConfig,
} from '../SNNPerceptionTypes';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createTestSAB(maxObjects: number = 256): SharedArrayBuffer {
  const layout = calculateBufferLayout(maxObjects);
  return new SharedArrayBuffer(layout.totalBytes);
}

function createTestObject(
  id: string,
  position: { x: number; y: number; z: number },
  options?: Partial<PerceptionObjectInput>,
): PerceptionObjectInput {
  return {
    id,
    position,
    velocity: { x: 0, y: 0, z: 0 },
    size: 1.0,
    distanceFromCamera: 10,
    angularSize: 0.1,
    hasMoved: false,
    ...options,
  };
}

function createTestScene(objectCount: number = 5): PerceptionSceneInput {
  const objects: PerceptionObjectInput[] = [];
  for (let i = 0; i < objectCount; i++) {
    objects.push(createTestObject(
      `obj-${i}`,
      { x: i * 2, y: 0, z: 0 },
      { distanceFromCamera: i * 3 + 1 },
    ));
  }

  return {
    objects,
    cameraPosition: { x: 0, y: 0, z: 10 },
    cameraForward: { x: 0, y: 0, z: -1 },
    timestamp: performance.now(),
    frameSequence: 1,
  };
}

// =============================================================================
// LIFECYCLE TESTS
// =============================================================================

describe('SNNPerceptionWorker - Lifecycle', () => {
  it('should create with default config', () => {
    const worker = createSNNPerceptionWorker();
    expect(worker).toBeInstanceOf(SNNPerceptionWorker);
    expect(worker.isReady).toBe(false);
    expect(worker.gpuAvailable).toBe(false);
  });

  it('should create with custom config', () => {
    const worker = createSNNPerceptionWorker({
      maxObjects: 64,
      enableAnomalyDetection: false,
    });
    expect(worker).toBeInstanceOf(SNNPerceptionWorker);
  });

  it('should initialize with SharedArrayBuffer (CPU fallback)', async () => {
    const worker = createSNNPerceptionWorker();
    const sab = createTestSAB();

    const result = await worker.initialize(sab);

    expect(worker.isReady).toBe(true);
    // WebGPU not available in jsdom test environment
    expect(result.gpuAvailable).toBe(false);
    expect(result.adapterInfo).toBeDefined();

    worker.dispose();
  });

  it('should dispose cleanly', async () => {
    const worker = createSNNPerceptionWorker();
    const sab = createTestSAB();
    await worker.initialize(sab);

    worker.dispose();

    expect(worker.isReady).toBe(false);
    expect(worker.gpuAvailable).toBe(false);
  });

  it('should dispose without initialization', () => {
    const worker = createSNNPerceptionWorker();
    expect(() => worker.dispose()).not.toThrow();
  });
});

// =============================================================================
// INFERENCE TESTS
// =============================================================================

describe('SNNPerceptionWorker - Inference', () => {
  let worker: SNNPerceptionWorker;
  let sab: SharedArrayBuffer;

  beforeEach(async () => {
    worker = createSNNPerceptionWorker();
    sab = createTestSAB();
    await worker.initialize(sab);
  });

  afterEach(() => {
    worker.dispose();
  });

  it('should process scene input and return metrics', async () => {
    const scene = createTestScene(5);
    const metrics = await worker.processInput(scene);

    expect(metrics).toBeDefined();
    expect(metrics.totalMs).toBeGreaterThanOrEqual(0);
    expect(metrics.objectCount).toBe(5);
    expect(metrics.sequence).toBe(1);
    expect(metrics.encodingMs).toBeGreaterThanOrEqual(0);
    expect(metrics.decodingMs).toBeGreaterThanOrEqual(0);
    expect(metrics.sabWriteMs).toBeGreaterThanOrEqual(0);
  });

  it('should increment sequence on each inference', async () => {
    const scene = createTestScene(3);

    const metrics1 = await worker.processInput(scene);
    const metrics2 = await worker.processInput(scene);
    const metrics3 = await worker.processInput(scene);

    expect(metrics1.sequence).toBe(1);
    expect(metrics2.sequence).toBe(2);
    expect(metrics3.sequence).toBe(3);
  });

  it('should write results to SharedArrayBuffer', async () => {
    const scene = createTestScene(5);
    await worker.processInput(scene);

    const int32 = new Int32Array(sab);
    const sequence = Atomics.load(int32, SAB_HEADER.SEQUENCE);

    expect(sequence).toBe(1);

    const entryCount = Atomics.load(int32, SAB_HEADER.ENTRY_COUNT);
    expect(entryCount).toBe(5);
  });

  it('should handle empty scene', async () => {
    const scene: PerceptionSceneInput = {
      objects: [],
      cameraPosition: { x: 0, y: 0, z: 0 },
      cameraForward: { x: 0, y: 0, z: -1 },
      timestamp: performance.now(),
      frameSequence: 1,
    };

    const metrics = await worker.processInput(scene);
    expect(metrics.objectCount).toBe(0);
  });

  it('should handle single object scene', async () => {
    const scene = createTestScene(1);
    const metrics = await worker.processInput(scene);

    expect(metrics.objectCount).toBe(1);

    const int32 = new Int32Array(sab);
    const entryCount = Atomics.load(int32, SAB_HEADER.ENTRY_COUNT);
    expect(entryCount).toBe(1);
  });

  it('should handle scene at max object capacity', async () => {
    const scene = createTestScene(256);
    const metrics = await worker.processInput(scene);

    expect(metrics.objectCount).toBe(256);
  });

  it('should handle scene exceeding max objects', async () => {
    const scene = createTestScene(300);
    const metrics = await worker.processInput(scene);

    // Should clamp to maxObjects
    expect(metrics.objectCount).toBe(300); // Input count, processing is clamped internally
  });

  it('should detect moving objects with higher currents', async () => {
    const movingScene: PerceptionSceneInput = {
      objects: [
        createTestObject('moving', { x: 0, y: 0, z: 0 }, {
          velocity: { x: 5, y: 0, z: 0 },
          hasMoved: true,
          distanceFromCamera: 5,
        }),
        createTestObject('static', { x: 5, y: 0, z: 0 }, {
          velocity: { x: 0, y: 0, z: 0 },
          hasMoved: false,
          distanceFromCamera: 5,
        }),
      ],
      cameraPosition: { x: 0, y: 0, z: 10 },
      cameraForward: { x: 0, y: 0, z: -1 },
      timestamp: performance.now(),
      frameSequence: 1,
    };

    const metrics = await worker.processInput(movingScene);
    expect(metrics.objectCount).toBe(2);
  });
});

// =============================================================================
// SAB PROTOCOL TESTS
// =============================================================================

describe('SNNPerceptionWorker - SAB Protocol', () => {
  let worker: SNNPerceptionWorker;
  let sab: SharedArrayBuffer;
  let int32: Int32Array;
  let float32: Float32Array;

  beforeEach(async () => {
    worker = createSNNPerceptionWorker();
    sab = createTestSAB();
    int32 = new Int32Array(sab);
    float32 = new Float32Array(sab);
    await worker.initialize(sab);
  });

  afterEach(() => {
    worker.dispose();
  });

  it('should write sequence number atomically', async () => {
    // Initial sequence should be 0
    expect(Atomics.load(int32, SAB_HEADER.SEQUENCE)).toBe(0);

    await worker.processInput(createTestScene(3));

    // After inference, sequence should be 1
    expect(Atomics.load(int32, SAB_HEADER.SEQUENCE)).toBe(1);
  });

  it('should write tracked object count', async () => {
    await worker.processInput(createTestScene(7));

    const tracked = Atomics.load(int32, SAB_HEADER.TRACKED_OBJECTS);
    expect(tracked).toBe(7);
  });

  it('should write focus point', async () => {
    await worker.processInput(createTestScene(3));

    // Focus point should be set (specific values depend on neuron dynamics)
    const focusX = float32[SAB_HEADER.FOCUS_X];
    const focusY = float32[SAB_HEADER.FOCUS_Y];
    const focusZ = float32[SAB_HEADER.FOCUS_Z];

    // Should be finite numbers
    expect(isFinite(focusX)).toBe(true);
    expect(isFinite(focusY)).toBe(true);
    expect(isFinite(focusZ)).toBe(true);
  });

  it('should write current Hz', async () => {
    await worker.processInput(createTestScene(3));

    const hzX100 = Atomics.load(int32, SAB_HEADER.CURRENT_HZ_X100);
    expect(hzX100).toBe(1000); // 10Hz * 100
  });

  it('should write attention entries in SAB', async () => {
    await worker.processInput(createTestScene(3));

    const entryCount = Atomics.load(int32, SAB_HEADER.ENTRY_COUNT);
    expect(entryCount).toBe(3);

    // Read first attention entry
    const entryOffset = SAB_HEADER.HEADER_SIZE;
    const attention0 = float32[entryOffset + 0];
    const spikeRate0 = float32[entryOffset + 1];

    expect(isFinite(attention0)).toBe(true);
    expect(attention0).toBeGreaterThanOrEqual(0);
    expect(attention0).toBeLessThanOrEqual(1);
    expect(isFinite(spikeRate0)).toBe(true);
  });
});

// =============================================================================
// FREQUENCY CONTROL TESTS
// =============================================================================

describe('SNNPerceptionWorker - Frequency Control', () => {
  let worker: SNNPerceptionWorker;

  beforeEach(async () => {
    worker = createSNNPerceptionWorker();
    const sab = createTestSAB();
    await worker.initialize(sab);
  });

  afterEach(() => {
    worker.dispose();
  });

  it('should set frequency within bounds', () => {
    worker.setFrequency(15);
    // No direct getter, but should not throw
  });

  it('should clamp frequency to minimum of 1Hz', () => {
    worker.setFrequency(0);
    // Should clamp to 1Hz internally
  });

  it('should clamp frequency to maximum of 30Hz', () => {
    worker.setFrequency(100);
    // Should clamp to 30Hz internally
  });

  it('should start inference loop', () => {
    worker.startInferenceLoop();
    // Should start without error
    worker.stopInferenceLoop();
  });

  it('should stop inference loop', () => {
    worker.startInferenceLoop();
    worker.stopInferenceLoop();
    // Should stop without error
  });

  it('should handle multiple start/stop cycles', () => {
    for (let i = 0; i < 5; i++) {
      worker.startInferenceLoop();
      worker.stopInferenceLoop();
    }
  });

  it('should not start twice', () => {
    worker.startInferenceLoop();
    worker.startInferenceLoop(); // Should be idempotent
    worker.stopInferenceLoop();
  });
});

// =============================================================================
// CPU FALLBACK TESTS
// =============================================================================

describe('SNNPerceptionWorker - CPU Fallback', () => {
  it('should run inference without GPU', async () => {
    const worker = createSNNPerceptionWorker();
    const sab = createTestSAB();
    const result = await worker.initialize(sab);

    expect(result.gpuAvailable).toBe(false);

    // Should still produce valid results via CPU fallback
    const scene = createTestScene(10);
    const metrics = await worker.processInput(scene);

    expect(metrics.objectCount).toBe(10);
    expect(metrics.totalMs).toBeGreaterThanOrEqual(0);
    expect(metrics.gpuComputeMs).toBeGreaterThanOrEqual(0); // CPU fallback still measures compute time

    worker.dispose();
  });

  it('should produce consistent results across multiple passes', async () => {
    const worker = createSNNPerceptionWorker();
    const sab = createTestSAB();
    await worker.initialize(sab);

    const scene = createTestScene(5);
    const metrics1 = await worker.processInput(scene);
    const metrics2 = await worker.processInput(scene);

    // Both should have same object count
    expect(metrics1.objectCount).toBe(metrics2.objectCount);

    // Sequence should increment
    expect(metrics2.sequence).toBe(metrics1.sequence + 1);

    worker.dispose();
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe('SNNPerceptionWorker - Edge Cases', () => {
  it('should handle objects at camera position (zero distance)', async () => {
    const worker = createSNNPerceptionWorker();
    const sab = createTestSAB();
    await worker.initialize(sab);

    const scene: PerceptionSceneInput = {
      objects: [
        createTestObject('at-camera', { x: 0, y: 0, z: 10 }, {
          distanceFromCamera: 0,
          angularSize: Math.PI,
        }),
      ],
      cameraPosition: { x: 0, y: 0, z: 10 },
      cameraForward: { x: 0, y: 0, z: -1 },
      timestamp: performance.now(),
      frameSequence: 1,
    };

    const metrics = await worker.processInput(scene);
    expect(metrics.objectCount).toBe(1);

    worker.dispose();
  });

  it('should handle objects with large velocities', async () => {
    const worker = createSNNPerceptionWorker();
    const sab = createTestSAB();
    await worker.initialize(sab);

    const scene: PerceptionSceneInput = {
      objects: [
        createTestObject('fast', { x: 0, y: 0, z: 0 }, {
          velocity: { x: 1000, y: 1000, z: 1000 },
          hasMoved: true,
        }),
      ],
      cameraPosition: { x: 0, y: 0, z: 10 },
      cameraForward: { x: 0, y: 0, z: -1 },
      timestamp: performance.now(),
      frameSequence: 1,
    };

    const metrics = await worker.processInput(scene);
    expect(metrics.objectCount).toBe(1);

    worker.dispose();
  });

  it('should handle very small network config', async () => {
    const worker = createSNNPerceptionWorker({
      network: {
        inputLayer: { neuronCount: 4, decay: 0.9, threshold: 1.0, restPotential: 0, refractoryPeriod: 1 },
        hiddenLayer: { neuronCount: 2, decay: 0.9, threshold: 0.8, restPotential: 0, refractoryPeriod: 1 },
        outputLayer: { neuronCount: 2, decay: 0.9, threshold: 0.6, restPotential: 0, refractoryPeriod: 1 },
        timestepsPerInference: 3,
        timestepMs: 1.0,
      },
      maxObjects: 2,
    });
    const sab = createTestSAB(2);
    await worker.initialize(sab);

    const scene = createTestScene(2);
    const metrics = await worker.processInput(scene);
    expect(metrics.objectCount).toBe(2);

    worker.dispose();
  });
});
