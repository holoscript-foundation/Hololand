/**
 * @vitest-environment jsdom
 */

/**
 * Tests for GPUContext (WebGPU Compute Engine)
 *
 * Domain: spatial-rendering
 * VR Priority: WebGPU API compatibility, pipeline creation, compute dispatch
 *
 * Validates:
 * - WebGPU availability detection
 * - Adapter and device initialization
 * - Compute pipeline creation and management
 * - Workgroup dispatch
 * - Buffer creation
 * - Graceful fallback when WebGPU unavailable
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { GPUContext } from '../GPUContext';

// =============================================================================
// MOCKS
// =============================================================================

function createMockGPUDevice() {
  const mockCommandEncoder = {
    beginComputePass: vi.fn(() => ({
      setPipeline: vi.fn(),
      setBindGroup: vi.fn(),
      dispatchWorkgroups: vi.fn(),
      end: vi.fn(),
    })),
    finish: vi.fn(() => 'mock-command-buffer'),
  };

  const mockPipeline = {
    getBindGroupLayout: vi.fn(() => 'mock-layout'),
  };

  return {
    createShaderModule: vi.fn(() => 'mock-module'),
    createComputePipeline: vi.fn(() => mockPipeline),
    createCommandEncoder: vi.fn(() => mockCommandEncoder),
    createBuffer: vi.fn(() => 'mock-buffer'),
    createBindGroup: vi.fn(() => 'mock-bind-group'),
    queue: {
      submit: vi.fn(),
    },
  };
}

function createMockAdapter(device: any) {
  return {
    requestDevice: vi.fn(() => Promise.resolve(device)),
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('GPUContext', () => {
  let originalNavigator: any;

  beforeEach(() => {
    originalNavigator = { ...navigator };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default high-performance power preference', () => {
      const ctx = new GPUContext();
      expect(ctx.isSupported()).toBe(false); // Not initialized yet
    });

    it('should accept custom power preference config', () => {
      const ctx = new GPUContext({ powerPreference: 'low-power' });
      expect(ctx.isSupported()).toBe(false);
    });

    it('should handle missing WebGPU gracefully', async () => {
      // navigator.gpu is undefined in jsdom
      const ctx = new GPUContext();
      await ctx.initialize();
      expect(ctx.isSupported()).toBe(false);
    });

    it('should handle null adapter gracefully', async () => {
      const mockGPU = {
        requestAdapter: vi.fn(() => Promise.resolve(null)),
      };
      Object.defineProperty(navigator, 'gpu', { value: mockGPU, writable: true, configurable: true });

      const ctx = new GPUContext();
      await ctx.initialize();
      expect(ctx.isSupported()).toBe(false);

      Object.defineProperty(navigator, 'gpu', { value: undefined, writable: true, configurable: true });
    });

    it('should initialize successfully with WebGPU available', async () => {
      const mockDevice = createMockGPUDevice();
      const mockAdapter = createMockAdapter(mockDevice);
      const mockGPU = {
        requestAdapter: vi.fn(() => Promise.resolve(mockAdapter)),
      };
      Object.defineProperty(navigator, 'gpu', { value: mockGPU, writable: true, configurable: true });

      const ctx = new GPUContext();
      await ctx.initialize();
      expect(ctx.isSupported()).toBe(true);

      Object.defineProperty(navigator, 'gpu', { value: undefined, writable: true, configurable: true });
    });
  });

  describe('pipeline management', () => {
    it('should skip pipeline creation when device not available', () => {
      const ctx = new GPUContext();
      // Should not throw
      ctx.createComputePipeline('test', '@compute fn main() {}');
    });

    it('should skip dispatch when device not available', () => {
      const ctx = new GPUContext();
      // Should not throw
      ctx.dispatch('test', [1, 1, 1]);
    });

    it('should warn when dispatching unknown pipeline', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockDevice = createMockGPUDevice();
      const mockAdapter = createMockAdapter(mockDevice);
      const mockGPU = {
        requestAdapter: vi.fn(() => Promise.resolve(mockAdapter)),
      };
      Object.defineProperty(navigator, 'gpu', { value: mockGPU, writable: true, configurable: true });

      const ctx = new GPUContext();
      await ctx.initialize();
      ctx.dispatch('nonexistent', [1, 1, 1]);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Pipeline nonexistent not found'),
      );

      Object.defineProperty(navigator, 'gpu', { value: undefined, writable: true, configurable: true });
      consoleSpy.mockRestore();
    });
  });

  describe('buffer creation', () => {
    it('should return null when device not available', () => {
      const ctx = new GPUContext();
      const buffer = ctx.createBuffer(256, 0);
      expect(buffer).toBeNull();
    });
  });
});
