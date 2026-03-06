/**
 * @vitest-environment jsdom
 */

/**
 * Tests for SpatialInferenceComputePipeline (WebGPU Compute Shader Backend)
 *
 * Validates:
 * - Initialization with WebGPU availability checks
 * - Graceful fallback when WebGPU is unavailable
 * - Position upload and uniform buffer management
 * - Compute pipeline creation and dispatch
 * - Pairwise distance computation
 * - Relationship classification
 * - Result readback and parsing
 * - Metrics tracking
 * - Resource cleanup on dispose
 *
 * NOTE: These tests run in jsdom (no real WebGPU). We mock the WebGPU API
 * to validate the pipeline's control flow, buffer management, and error
 * handling without requiring a real GPU.
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
  SpatialInferenceComputePipeline,
  createSpatialInferenceComputePipeline,
  REL_TYPE_BITS,
} from '../SpatialInferenceComputePipeline';

import type {
  SpatialInferenceComputeConfig,
  GPURelationshipResult,
} from '../SpatialInferenceComputePipeline';

import type { ObjectSnapshot, CameraSnapshot } from '../SpatialReasoningEngine';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createObjectSnapshot(
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

// =============================================================================
// MOCK WebGPU API
// =============================================================================

function createMockGPUBuffer(size: number): GPUBuffer {
  const mappedData = new ArrayBuffer(size);

  return {
    size,
    usage: 0,
    mapState: 'unmapped' as GPUBufferMapState,
    label: '',
    destroy: vi.fn(),
    getMappedRange: vi.fn(() => mappedData),
    mapAsync: vi.fn(() => Promise.resolve()),
    unmap: vi.fn(),
  } as unknown as GPUBuffer;
}

function createMockGPUDevice(): GPUDevice {
  const mockPipeline = {
    getBindGroupLayout: vi.fn(() => ({} as GPUBindGroupLayout)),
  } as unknown as GPUComputePipeline;

  const mockPassEncoder = {
    setPipeline: vi.fn(),
    setBindGroup: vi.fn(),
    dispatchWorkgroups: vi.fn(),
    end: vi.fn(),
  };

  const mockCommandEncoder = {
    beginComputePass: vi.fn(() => mockPassEncoder),
    copyBufferToBuffer: vi.fn(),
    finish: vi.fn(() => ({} as GPUCommandBuffer)),
  };

  return {
    createShaderModule: vi.fn(() => ({} as GPUShaderModule)),
    createComputePipeline: vi.fn(() => mockPipeline),
    createBuffer: vi.fn((descriptor: GPUBufferDescriptor) => createMockGPUBuffer(descriptor.size)),
    createBindGroup: vi.fn(() => ({} as GPUBindGroup)),
    createCommandEncoder: vi.fn(() => mockCommandEncoder),
    queue: {
      writeBuffer: vi.fn(),
      submit: vi.fn(),
    },
    lost: Promise.resolve({ reason: undefined, message: '' }) as unknown as Promise<GPUDeviceLostInfo>,
    destroy: vi.fn(),
  } as unknown as GPUDevice;
}

function createMockGPUAdapter(device: GPUDevice): GPUAdapter {
  return {
    requestDevice: vi.fn(() => Promise.resolve(device)),
    info: {
      vendor: 'Test',
      architecture: 'Mock',
      device: 'TestGPU',
      description: 'Mock GPU for testing',
    },
    features: new Set() as GPUSupportedFeatures,
    limits: {} as GPUSupportedLimits,
    requestAdapterInfo: vi.fn(),
  } as unknown as GPUAdapter;
}

function setupMockWebGPU(): { device: GPUDevice; adapter: GPUAdapter } {
  const device = createMockGPUDevice();
  const adapter = createMockGPUAdapter(device);

  Object.defineProperty(navigator, 'gpu', {
    value: {
      requestAdapter: vi.fn(() => Promise.resolve(adapter)),
    },
    writable: true,
    configurable: true,
  });

  return { device, adapter };
}

function removeMockWebGPU(): void {
  Object.defineProperty(navigator, 'gpu', {
    value: undefined,
    writable: true,
    configurable: true,
  });
}

// =============================================================================
// TESTS
// =============================================================================

describe('SpatialInferenceComputePipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    removeMockWebGPU();
  });

  afterEach(() => {
    removeMockWebGPU();
  });

  // ─── Construction ────────────────────────────────────────────────

  describe('construction', () => {
    it('should create with default configuration', () => {
      const pipeline = new SpatialInferenceComputePipeline();
      expect(pipeline.isReady()).toBe(false);
    });

    it('should create with custom configuration', () => {
      const config: SpatialInferenceComputeConfig = {
        maxObjects: 2048,
        maxRelationships: 4096,
        nearThreshold: 10.0,
      };
      const pipeline = new SpatialInferenceComputePipeline(config);
      expect(pipeline.isReady()).toBe(false);
    });

    it('should create via factory function', () => {
      const pipeline = createSpatialInferenceComputePipeline({
        workgroupSize: 128,
      });
      expect(pipeline).toBeInstanceOf(SpatialInferenceComputePipeline);
      expect(pipeline.isReady()).toBe(false);
    });
  });

  // ─── Initialization ──────────────────────────────────────────────

  describe('initialization', () => {
    it('should return false when WebGPU is not available', async () => {
      removeMockWebGPU();
      const pipeline = new SpatialInferenceComputePipeline();
      const result = await pipeline.initialize();
      expect(result).toBe(false);
      expect(pipeline.isReady()).toBe(false);
    });

    it('should return false when no adapter is found', async () => {
      Object.defineProperty(navigator, 'gpu', {
        value: { requestAdapter: vi.fn(() => Promise.resolve(null)) },
        writable: true,
        configurable: true,
      });

      const pipeline = new SpatialInferenceComputePipeline();
      const result = await pipeline.initialize();
      expect(result).toBe(false);
      expect(pipeline.isReady()).toBe(false);
    });

    it('should initialize successfully with mock WebGPU', async () => {
      const { device } = setupMockWebGPU();

      const pipeline = new SpatialInferenceComputePipeline();
      const result = await pipeline.initialize();

      expect(result).toBe(true);
      expect(pipeline.isReady()).toBe(true);

      // Should have created shader modules
      expect(device.createShaderModule).toHaveBeenCalledTimes(2); // distance + classify
      expect(device.createComputePipeline).toHaveBeenCalledTimes(2);

      // Should have allocated buffers
      expect(device.createBuffer).toHaveBeenCalled();

      pipeline.dispose();
    });

    it('should capture adapter info', async () => {
      setupMockWebGPU();
      const pipeline = new SpatialInferenceComputePipeline();
      await pipeline.initialize();

      const metrics = pipeline.getMetrics();
      expect(metrics.adapterInfo).toContain('Test');
      expect(metrics.adapterInfo).toContain('Mock');

      pipeline.dispose();
    });

    it('should handle initialization errors gracefully', async () => {
      Object.defineProperty(navigator, 'gpu', {
        value: {
          requestAdapter: vi.fn(() => Promise.reject(new Error('GPU crash'))),
        },
        writable: true,
        configurable: true,
      });

      const pipeline = new SpatialInferenceComputePipeline();
      const result = await pipeline.initialize();
      expect(result).toBe(false);
      expect(pipeline.isReady()).toBe(false);
    });
  });

  // ─── Compute: Relationships ──────────────────────────────────────

  describe('computeRelationships', () => {
    it('should return null when pipeline is not ready', async () => {
      const pipeline = new SpatialInferenceComputePipeline();
      const objects = [
        createObjectSnapshot('a', { x: 0, y: 0, z: 0 }),
        createObjectSnapshot('b', { x: 1, y: 0, z: 0 }),
      ];
      const result = await pipeline.computeRelationships(objects, createDefaultCamera());
      expect(result).toBeNull();
    });

    it('should return empty array for fewer than 2 objects', async () => {
      setupMockWebGPU();
      const pipeline = new SpatialInferenceComputePipeline();
      await pipeline.initialize();

      const result = await pipeline.computeRelationships(
        [createObjectSnapshot('a', { x: 0, y: 0, z: 0 })],
        createDefaultCamera(),
      );
      expect(result).toEqual([]);

      pipeline.dispose();
    });

    it('should dispatch compute passes for valid input', async () => {
      const { device } = setupMockWebGPU();
      const pipeline = new SpatialInferenceComputePipeline();
      await pipeline.initialize();

      const objects = [
        createObjectSnapshot('a', { x: 0, y: 0, z: 0 }),
        createObjectSnapshot('b', { x: 3, y: 0, z: 0 }),
        createObjectSnapshot('c', { x: 0, y: 5, z: 0 }),
      ];

      await pipeline.computeRelationships(objects, createDefaultCamera());

      // Should have created command encoder
      expect(device.createCommandEncoder).toHaveBeenCalled();

      // Should have submitted work
      expect(device.queue.submit).toHaveBeenCalled();

      // Should have uploaded positions
      expect(device.queue.writeBuffer).toHaveBeenCalled();

      pipeline.dispose();
    });

    it('should track metrics after compute', async () => {
      setupMockWebGPU();
      const pipeline = new SpatialInferenceComputePipeline();
      await pipeline.initialize();

      const objects = [
        createObjectSnapshot('a', { x: 0, y: 0, z: 0 }),
        createObjectSnapshot('b', { x: 3, y: 0, z: 0 }),
      ];

      await pipeline.computeRelationships(objects, createDefaultCamera());

      const metrics = pipeline.getMetrics();
      expect(metrics.totalPasses).toBe(1);
      expect(metrics.lastComputeMs).toBeGreaterThanOrEqual(0);

      pipeline.dispose();
    });

    it('should clamp object count to maxObjects', async () => {
      const { device } = setupMockWebGPU();
      const config: SpatialInferenceComputeConfig = { maxObjects: 3 };
      const pipeline = new SpatialInferenceComputePipeline(config);
      await pipeline.initialize();

      const objects = Array.from({ length: 10 }, (_, i) =>
        createObjectSnapshot(`obj-${i}`, { x: i * 2, y: 0, z: 0 }),
      );

      await pipeline.computeRelationships(objects, createDefaultCamera());

      // Should only upload 3 object positions (maxObjects = 3)
      const writeBufferCalls = (device.queue.writeBuffer as ReturnType<typeof vi.fn>).mock.calls;
      // First writeBuffer call should be positions
      const positionWriteData = writeBufferCalls.find(
        (call: unknown[]) => call[2] instanceof Float32Array && (call[2] as Float32Array).length === 3 * 4,
      );
      // Verify we capped to 3 objects
      expect(positionWriteData).toBeDefined();

      pipeline.dispose();
    });
  });

  // ─── Compute: Pairwise Distances ─────────────────────────────────

  describe('computePairwiseDistances', () => {
    it('should return null when pipeline is not ready', async () => {
      const pipeline = new SpatialInferenceComputePipeline();
      const result = await pipeline.computePairwiseDistances([
        createObjectSnapshot('a', { x: 0, y: 0, z: 0 }),
        createObjectSnapshot('b', { x: 1, y: 0, z: 0 }),
      ]);
      expect(result).toBeNull();
    });

    it('should return empty array for fewer than 2 objects', async () => {
      setupMockWebGPU();
      const pipeline = new SpatialInferenceComputePipeline();
      await pipeline.initialize();

      const result = await pipeline.computePairwiseDistances([
        createObjectSnapshot('a', { x: 0, y: 0, z: 0 }),
      ]);
      expect(result).toBeInstanceOf(Float32Array);
      expect(result!.length).toBe(0);

      pipeline.dispose();
    });

    it('should dispatch distance-only compute pass', async () => {
      const { device } = setupMockWebGPU();
      const pipeline = new SpatialInferenceComputePipeline();
      await pipeline.initialize();

      const objects = [
        createObjectSnapshot('a', { x: 0, y: 0, z: 0 }),
        createObjectSnapshot('b', { x: 3, y: 4, z: 0 }),
      ];

      await pipeline.computePairwiseDistances(objects);

      expect(device.createCommandEncoder).toHaveBeenCalled();
      expect(device.queue.submit).toHaveBeenCalled();

      pipeline.dispose();
    });
  });

  // ─── REL_TYPE_BITS ───────────────────────────────────────────────

  describe('REL_TYPE_BITS', () => {
    it('should have correct bitmask values', () => {
      expect(REL_TYPE_BITS.near).toBe(0x001);
      expect(REL_TYPE_BITS.far).toBe(0x002);
      expect(REL_TYPE_BITS.above).toBe(0x004);
      expect(REL_TYPE_BITS.below).toBe(0x008);
      expect(REL_TYPE_BITS.left_of).toBe(0x010);
      expect(REL_TYPE_BITS.right_of).toBe(0x020);
      expect(REL_TYPE_BITS.in_front_of).toBe(0x040);
      expect(REL_TYPE_BITS.behind).toBe(0x080);
      expect(REL_TYPE_BITS.adjacent).toBe(0x100);
      expect(REL_TYPE_BITS.aligned).toBe(0x200);
    });

    it('should have unique values for each type', () => {
      const values = Object.values(REL_TYPE_BITS);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it('should support bitwise combination', () => {
      const nearAndAbove = REL_TYPE_BITS.near | REL_TYPE_BITS.above;
      expect(nearAndAbove & REL_TYPE_BITS.near).toBe(REL_TYPE_BITS.near);
      expect(nearAndAbove & REL_TYPE_BITS.above).toBe(REL_TYPE_BITS.above);
      expect(nearAndAbove & REL_TYPE_BITS.far).toBe(0);
    });
  });

  // ─── Metrics ─────────────────────────────────────────────────────

  describe('metrics', () => {
    it('should return initial metrics for uninitialized pipeline', () => {
      const pipeline = new SpatialInferenceComputePipeline();
      const metrics = pipeline.getMetrics();

      expect(metrics.isReady).toBe(false);
      expect(metrics.totalPasses).toBe(0);
      expect(metrics.averageComputeMs).toBe(0);
      expect(metrics.peakComputeMs).toBe(0);
      expect(metrics.gpuMemoryBytes).toBe(0);
    });

    it('should track GPU memory after initialization', async () => {
      setupMockWebGPU();
      const pipeline = new SpatialInferenceComputePipeline();
      await pipeline.initialize();

      const metrics = pipeline.getMetrics();
      expect(metrics.isReady).toBe(true);
      expect(metrics.gpuMemoryBytes).toBeGreaterThan(0);

      pipeline.dispose();
    });

    it('should accumulate pass metrics', async () => {
      setupMockWebGPU();
      const pipeline = new SpatialInferenceComputePipeline();
      await pipeline.initialize();

      const objects = [
        createObjectSnapshot('a', { x: 0, y: 0, z: 0 }),
        createObjectSnapshot('b', { x: 1, y: 0, z: 0 }),
      ];

      await pipeline.computeRelationships(objects, createDefaultCamera());
      await pipeline.computeRelationships(objects, createDefaultCamera());
      await pipeline.computeRelationships(objects, createDefaultCamera());

      const metrics = pipeline.getMetrics();
      expect(metrics.totalPasses).toBe(3);
      expect(metrics.averageObjectCount).toBe(2);

      pipeline.dispose();
    });
  });

  // ─── Dispose ─────────────────────────────────────────────────────

  describe('dispose', () => {
    it('should clean up all resources', async () => {
      const { device } = setupMockWebGPU();
      const pipeline = new SpatialInferenceComputePipeline();
      await pipeline.initialize();

      expect(pipeline.isReady()).toBe(true);

      pipeline.dispose();

      expect(pipeline.isReady()).toBe(false);
      expect(device.destroy).toHaveBeenCalledTimes(1);
    });

    it('should be safe to call dispose multiple times', () => {
      const pipeline = new SpatialInferenceComputePipeline();
      pipeline.dispose();
      pipeline.dispose(); // Should not throw
    });

    it('should return null from compute after dispose', async () => {
      setupMockWebGPU();
      const pipeline = new SpatialInferenceComputePipeline();
      await pipeline.initialize();
      pipeline.dispose();

      const result = await pipeline.computeRelationships(
        [
          createObjectSnapshot('a', { x: 0, y: 0, z: 0 }),
          createObjectSnapshot('b', { x: 1, y: 0, z: 0 }),
        ],
        createDefaultCamera(),
      );
      expect(result).toBeNull();
    });
  });
});
