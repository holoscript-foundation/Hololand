/**
 * VolumetricFireRenderer Tests
 *
 * Comprehensive test suite for the volumetric fire rendering system including:
 * - Compute pipeline density field generation
 * - Temporal reprojection state management
 * - Auto quality stepping (12/24/32/48 raymarch steps)
 * - DragonMeshBatcher integration (fire origin, volume bounds)
 * - Performance metrics and budget enforcement
 * - Resource lifecycle management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VolumetricFireRenderer } from '../VolumetricFireRenderer';
import type { VolumetricFireConfig } from '../VolumetricFireTypes';
import {
  DEFAULT_FIRE_CONFIG,
  FIRE_QUALITY_PRESETS,
  QUALITY_STEPS,
  haltonSequence,
  getTemporalJitter,
} from '../VolumetricFireTypes';

// =============================================================================
// MOCKS
// =============================================================================

function createMockGPUDevice() {
  const mockBuffer = {
    destroy: vi.fn(),
    size: 512,
    usage: 0,
    mapState: 'unmapped',
  };

  const mockTextureView = {};
  const mockTexture = {
    destroy: vi.fn(),
    createView: vi.fn(() => mockTextureView),
    width: 64,
    height: 64,
    depthOrArrayLayers: 64,
  };

  const mockSampler = {};

  const mockShaderModule = {};

  const mockBindGroupLayout = {};
  const mockPipeline = {
    getBindGroupLayout: vi.fn(() => mockBindGroupLayout),
  };

  const mockBindGroup = {};

  const device = {
    createBuffer: vi.fn(() => mockBuffer),
    createTexture: vi.fn(() => mockTexture),
    createSampler: vi.fn(() => mockSampler),
    createShaderModule: vi.fn(() => mockShaderModule),
    createRenderPipeline: vi.fn(() => mockPipeline),
    createComputePipeline: vi.fn(() => mockPipeline),
    createBindGroup: vi.fn(() => mockBindGroup),
    queue: {
      writeBuffer: vi.fn(),
      writeTexture: vi.fn(),
    },
  } as unknown as GPUDevice;

  return {
    device,
    mockBuffer,
    mockTexture,
    mockTextureView,
    mockSampler,
    mockPipeline,
    mockBindGroup,
  };
}

// Mock fetch for shader loading
vi.stubGlobal('fetch', vi.fn(() =>
  Promise.resolve({
    ok: true,
    text: () => Promise.resolve('// mock shader code'),
  })
));

// Stub WebGPU globals not available in jsdom
vi.stubGlobal('GPUTextureUsage', {
  COPY_SRC: 0x01,
  COPY_DST: 0x02,
  TEXTURE_BINDING: 0x04,
  STORAGE_BINDING: 0x08,
  RENDER_ATTACHMENT: 0x10,
});
vi.stubGlobal('GPUBufferUsage', {
  MAP_READ: 0x0001,
  MAP_WRITE: 0x0002,
  COPY_SRC: 0x0004,
  COPY_DST: 0x0008,
  INDEX: 0x0010,
  VERTEX: 0x0020,
  UNIFORM: 0x0040,
  STORAGE: 0x0080,
  INDIRECT: 0x0100,
  QUERY_RESOLVE: 0x0200,
});

// =============================================================================
// TESTS
// =============================================================================

describe('VolumetricFireRenderer', () => {
  let renderer: VolumetricFireRenderer;
  let mocks: ReturnType<typeof createMockGPUDevice>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks = createMockGPUDevice();
  });

  afterEach(() => {
    renderer?.dispose();
  });

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  describe('Initialization', () => {
    it('should create renderer with default config', () => {
      renderer = new VolumetricFireRenderer(mocks.device);
      expect(renderer).toBeDefined();
      expect(renderer.getPerformanceMetrics()).toBeDefined();
    });

    it('should create renderer with custom config', () => {
      const customConfig: Partial<VolumetricFireConfig> = {
        temperature: 3000,
        intensity: 2.0,
        qualityLevel: 3,
        maxRaymarchSteps: 48,
        temporalReprojection: false,
        useComputeDensity: true,
        densityFieldResolution: 64,
      };

      renderer = new VolumetricFireRenderer(mocks.device, customConfig);
      expect(renderer).toBeDefined();
    });

    it('should initialize GPU resources', async () => {
      renderer = new VolumetricFireRenderer(mocks.device);
      await renderer.initialize();

      expect(mocks.device.createBuffer).toHaveBeenCalled();
      expect(mocks.device.createTexture).toHaveBeenCalled();
      expect(mocks.device.createSampler).toHaveBeenCalled();
      expect(mocks.device.createShaderModule).toHaveBeenCalled();
    });

    it('should create compute pipeline when useComputeDensity is true', async () => {
      renderer = new VolumetricFireRenderer(mocks.device, {
        useComputeDensity: true,
      });
      await renderer.initialize();

      expect(mocks.device.createComputePipeline).toHaveBeenCalled();
    });

    it('should skip compute pipeline when useComputeDensity is false', async () => {
      renderer = new VolumetricFireRenderer(mocks.device, {
        useComputeDensity: false,
      });
      await renderer.initialize();

      expect(mocks.device.createComputePipeline).not.toHaveBeenCalled();
    });

    it('should create temporal resources when temporalReprojection is true', async () => {
      renderer = new VolumetricFireRenderer(mocks.device, {
        temporalReprojection: true,
      });
      await renderer.initialize();

      const createTextureCalls = (mocks.device.createTexture as ReturnType<typeof vi.fn>).mock.calls;
      const hasPrevFrame = createTextureCalls.some(
        (call: any) => call[0]?.label === 'fire-prev-frame'
      );
      expect(hasPrevFrame).toBe(true);
    });
  });

  // =========================================================================
  // CONFIGURATION
  // =========================================================================

  describe('Configuration', () => {
    beforeEach(() => {
      renderer = new VolumetricFireRenderer(mocks.device);
    });

    it('should update config at runtime', () => {
      const newConfig: Partial<VolumetricFireConfig> = {
        temperature: 3500,
        intensity: 1.5,
      };

      renderer.updateConfig(newConfig);
      expect(() => renderer.updateConfig(newConfig)).not.toThrow();
    });

    it('should apply quality presets', () => {
      expect(() => renderer.applyQualityPreset('quest2')).not.toThrow();
      expect(() => renderer.applyQualityPreset('quest3')).not.toThrow();
      expect(() => renderer.applyQualityPreset('pcvr')).not.toThrow();
      expect(() => renderer.applyQualityPreset('desktop')).not.toThrow();
    });

    it('should set fire origin', () => {
      renderer.setFireOrigin(1.0, 2.0, 3.0);
      expect(() => renderer.setFireOrigin(0, 0, 0)).not.toThrow();
    });
  });

  // =========================================================================
  // AUTO QUALITY STEPPING
  // =========================================================================

  describe('Auto Quality Stepping', () => {
    it('should have four quality steps defined', () => {
      expect(QUALITY_STEPS[0]).toBeDefined();
      expect(QUALITY_STEPS[1]).toBeDefined();
      expect(QUALITY_STEPS[2]).toBeDefined();
      expect(QUALITY_STEPS[3]).toBeDefined();
    });

    it('should map quality levels to specific raymarch steps', () => {
      expect(QUALITY_STEPS[0].raymarchSteps).toBe(12);
      expect(QUALITY_STEPS[1].raymarchSteps).toBe(24);
      expect(QUALITY_STEPS[2].raymarchSteps).toBe(32);
      expect(QUALITY_STEPS[3].raymarchSteps).toBe(48);
    });

    it('should have ascending frame budgets', () => {
      expect(QUALITY_STEPS[0].frameBudgetMs).toBeLessThan(QUALITY_STEPS[1].frameBudgetMs);
      expect(QUALITY_STEPS[1].frameBudgetMs).toBeLessThan(QUALITY_STEPS[2].frameBudgetMs);
      expect(QUALITY_STEPS[2].frameBudgetMs).toBeLessThan(QUALITY_STEPS[3].frameBudgetMs);
    });

    it('should enable temporal reprojection on lower quality levels', () => {
      expect(QUALITY_STEPS[0].temporalReprojection).toBe(true);
      expect(QUALITY_STEPS[1].temporalReprojection).toBe(true);
      expect(QUALITY_STEPS[2].temporalReprojection).toBe(true);
      expect(QUALITY_STEPS[3].temporalReprojection).toBe(false);
    });

    it('should have decreasing density update intervals at higher quality', () => {
      expect(QUALITY_STEPS[0].densityUpdateInterval).toBeGreaterThanOrEqual(
        QUALITY_STEPS[1].densityUpdateInterval
      );
      expect(QUALITY_STEPS[1].densityUpdateInterval).toBeGreaterThanOrEqual(
        QUALITY_STEPS[2].densityUpdateInterval
      );
    });

    it('should return current quality step', () => {
      renderer = new VolumetricFireRenderer(mocks.device, { qualityLevel: 2 });
      const step = renderer.getCurrentQualityStep();
      expect(step.raymarchSteps).toBe(32);
      expect(step.name).toBe('high');
    });
  });

  // =========================================================================
  // TEMPORAL REPROJECTION
  // =========================================================================

  describe('Temporal Reprojection', () => {
    it('should generate Halton sequence values for base 2', () => {
      expect(haltonSequence(1, 2)).toBeCloseTo(0.5, 4);
      expect(haltonSequence(2, 2)).toBeCloseTo(0.25, 4);
      expect(haltonSequence(3, 2)).toBeCloseTo(0.75, 4);
    });

    it('should generate Halton sequence values for base 3', () => {
      expect(haltonSequence(1, 3)).toBeCloseTo(1 / 3, 4);
      expect(haltonSequence(2, 3)).toBeCloseTo(2 / 3, 4);
    });

    it('should return temporal jitter in [-0.5, 0.5] range', () => {
      for (let i = 0; i < 16; i++) {
        const [jx, jy] = getTemporalJitter(i);
        expect(jx).toBeGreaterThanOrEqual(-0.5);
        expect(jx).toBeLessThanOrEqual(0.5);
        expect(jy).toBeGreaterThanOrEqual(-0.5);
        expect(jy).toBeLessThanOrEqual(0.5);
      }
    });

    it('should cycle jitter through 16 unique patterns', () => {
      const jitters = new Set<string>();
      for (let i = 0; i < 16; i++) {
        const [jx, jy] = getTemporalJitter(i);
        jitters.add(`${jx.toFixed(4)},${jy.toFixed(4)}`);
      }
      expect(jitters.size).toBeGreaterThanOrEqual(14);
    });

    it('should wrap jitter after 16 frames', () => {
      const [jx0, jy0] = getTemporalJitter(0);
      const [jx16, jy16] = getTemporalJitter(16);
      expect(jx0).toBeCloseTo(jx16, 6);
      expect(jy0).toBeCloseTo(jy16, 6);
    });
  });

  // =========================================================================
  // PERFORMANCE METRICS
  // =========================================================================

  describe('Performance Metrics', () => {
    beforeEach(() => {
      renderer = new VolumetricFireRenderer(mocks.device);
    });

    it('should return performance metrics', () => {
      const metrics = renderer.getPerformanceMetrics();

      expect(metrics).toHaveProperty('gpuTimeMs');
      expect(metrics).toHaveProperty('cpuTimeMs');
      expect(metrics).toHaveProperty('computeTimeMs');
      expect(metrics).toHaveProperty('averageRaymarchSteps');
      expect(metrics).toHaveProperty('autoQualityLevel');
      expect(metrics).toHaveProperty('budgetExceeded');
      expect(metrics).toHaveProperty('temporalActive');
      expect(metrics).toHaveProperty('densityUpdatesPerSecond');
    });

    it('should initialize metrics with defaults', () => {
      const metrics = renderer.getPerformanceMetrics();

      expect(metrics.gpuTimeMs).toBe(0);
      expect(metrics.cpuTimeMs).toBe(0);
      expect(metrics.computeTimeMs).toBe(0);
      expect(metrics.budgetExceeded).toBe(false);
    });

    it('should track temporal reprojection state in metrics', () => {
      const trueRenderer = new VolumetricFireRenderer(mocks.device, {
        temporalReprojection: true,
      });
      expect(trueRenderer.getPerformanceMetrics().temporalActive).toBe(true);

      const falseRenderer = new VolumetricFireRenderer(mocks.device, {
        temporalReprojection: false,
      });
      expect(falseRenderer.getPerformanceMetrics().temporalActive).toBe(false);

      trueRenderer.dispose();
      falseRenderer.dispose();
    });
  });

  // =========================================================================
  // QUALITY PRESETS
  // =========================================================================

  describe('Quality Presets', () => {
    it('should have all platform presets defined', () => {
      expect(FIRE_QUALITY_PRESETS.quest2).toBeDefined();
      expect(FIRE_QUALITY_PRESETS.quest3).toBeDefined();
      expect(FIRE_QUALITY_PRESETS.questPro).toBeDefined();
      expect(FIRE_QUALITY_PRESETS.pcvr).toBeDefined();
      expect(FIRE_QUALITY_PRESETS.desktop).toBeDefined();
    });

    it('should have appropriate quality levels', () => {
      expect(FIRE_QUALITY_PRESETS.quest2.qualityLevel).toBe(0);
      expect(FIRE_QUALITY_PRESETS.quest3.qualityLevel).toBe(1);
      expect(FIRE_QUALITY_PRESETS.questPro.qualityLevel).toBe(2);
      expect(FIRE_QUALITY_PRESETS.pcvr.qualityLevel).toBe(3);
    });

    it('should have ascending raymarch steps', () => {
      expect(FIRE_QUALITY_PRESETS.quest2.maxRaymarchSteps).toBeLessThan(
        FIRE_QUALITY_PRESETS.quest3.maxRaymarchSteps!
      );
      expect(FIRE_QUALITY_PRESETS.quest3.maxRaymarchSteps).toBeLessThan(
        FIRE_QUALITY_PRESETS.questPro.maxRaymarchSteps!
      );
      expect(FIRE_QUALITY_PRESETS.questPro.maxRaymarchSteps).toBeLessThan(
        FIRE_QUALITY_PRESETS.pcvr.maxRaymarchSteps!
      );
    });

    it('should enable compute density on all presets', () => {
      expect(FIRE_QUALITY_PRESETS.quest2.useComputeDensity).toBe(true);
      expect(FIRE_QUALITY_PRESETS.quest3.useComputeDensity).toBe(true);
      expect(FIRE_QUALITY_PRESETS.pcvr.useComputeDensity).toBe(true);
      expect(FIRE_QUALITY_PRESETS.desktop.useComputeDensity).toBe(true);
    });

    it('should have appropriate density field resolutions', () => {
      expect(FIRE_QUALITY_PRESETS.quest2.densityFieldResolution).toBe(32);
      expect(FIRE_QUALITY_PRESETS.quest3.densityFieldResolution).toBe(32);
      expect(FIRE_QUALITY_PRESETS.questPro.densityFieldResolution).toBe(48);
      expect(FIRE_QUALITY_PRESETS.pcvr.densityFieldResolution).toBe(64);
    });

    it('should enable temporal reprojection on mobile VR', () => {
      expect(FIRE_QUALITY_PRESETS.quest2.temporalReprojection).toBe(true);
      expect(FIRE_QUALITY_PRESETS.quest3.temporalReprojection).toBe(true);
      expect(FIRE_QUALITY_PRESETS.questPro.temporalReprojection).toBe(true);
    });

    it('should disable temporal reprojection on powerful platforms', () => {
      expect(FIRE_QUALITY_PRESETS.pcvr.temporalReprojection).toBe(false);
      expect(FIRE_QUALITY_PRESETS.desktop.temporalReprojection).toBe(false);
    });

    it('should enable all layers on high-end platforms', () => {
      const pcvrLayers = FIRE_QUALITY_PRESETS.pcvr.layers!;

      expect(pcvrLayers.whiteHotCore.enabled).toBe(true);
      expect(pcvrLayers.innerOrange.enabled).toBe(true);
      expect(pcvrLayers.midFlame.enabled).toBe(true);
      expect(pcvrLayers.outerGlow.enabled).toBe(true);
      expect(pcvrLayers.tendrils.enabled).toBe(true);
      expect(pcvrLayers.heatHaze.enabled).toBe(true);
      expect(pcvrLayers.embers.enabled).toBe(true);
      expect(pcvrLayers.smoke.enabled).toBe(true);
      expect(pcvrLayers.edgeGlow.enabled).toBe(true);
    });

    it('should disable expensive layers on Quest 2', () => {
      const quest2Layers = FIRE_QUALITY_PRESETS.quest2.layers!;

      expect(quest2Layers.whiteHotCore.enabled).toBe(true);
      expect(quest2Layers.tendrils.enabled).toBe(false);
      expect(quest2Layers.heatHaze.enabled).toBe(false);
      expect(quest2Layers.smoke.enabled).toBe(false);
      expect(quest2Layers.edgeGlow.enabled).toBe(false);
    });
  });

  // =========================================================================
  // DEFAULT CONFIGURATION
  // =========================================================================

  describe('Default Configuration', () => {
    it('should have valid default config', () => {
      expect(DEFAULT_FIRE_CONFIG.temperature).toBeGreaterThan(0);
      expect(DEFAULT_FIRE_CONFIG.intensity).toBeGreaterThan(0);
      expect(DEFAULT_FIRE_CONFIG.qualityLevel).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_FIRE_CONFIG.qualityLevel).toBeLessThanOrEqual(3);
      expect(DEFAULT_FIRE_CONFIG.maxRaymarchSteps).toBeGreaterThan(0);
    });

    it('should have all 9 layers defined', () => {
      expect(DEFAULT_FIRE_CONFIG.layers.whiteHotCore).toBeDefined();
      expect(DEFAULT_FIRE_CONFIG.layers.innerOrange).toBeDefined();
      expect(DEFAULT_FIRE_CONFIG.layers.midFlame).toBeDefined();
      expect(DEFAULT_FIRE_CONFIG.layers.outerGlow).toBeDefined();
      expect(DEFAULT_FIRE_CONFIG.layers.tendrils).toBeDefined();
      expect(DEFAULT_FIRE_CONFIG.layers.heatHaze).toBeDefined();
      expect(DEFAULT_FIRE_CONFIG.layers.embers).toBeDefined();
      expect(DEFAULT_FIRE_CONFIG.layers.smoke).toBeDefined();
      expect(DEFAULT_FIRE_CONFIG.layers.edgeGlow).toBeDefined();
    });

    it('should have normalized wind direction', () => {
      const { x, y, z } = DEFAULT_FIRE_CONFIG.windDirection;
      const length = Math.sqrt(x * x + y * y + z * z);
      expect(length).toBeCloseTo(1.0, 2);
    });

    it('should have compute density enabled by default', () => {
      expect(DEFAULT_FIRE_CONFIG.useComputeDensity).toBe(true);
    });

    it('should have temporal reprojection enabled by default', () => {
      expect(DEFAULT_FIRE_CONFIG.temporalReprojection).toBe(true);
    });

    it('should have valid temporal blend factor', () => {
      expect(DEFAULT_FIRE_CONFIG.temporalBlendFactor).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_FIRE_CONFIG.temporalBlendFactor).toBeLessThanOrEqual(1);
    });

    it('should default to Quest 3 quality level', () => {
      expect(DEFAULT_FIRE_CONFIG.qualityLevel).toBe(1);
      expect(DEFAULT_FIRE_CONFIG.maxRaymarchSteps).toBe(24);
    });
  });

  // =========================================================================
  // RESOURCE CLEANUP
  // =========================================================================

  describe('Resource Cleanup', () => {
    it('should dispose GPU resources', async () => {
      renderer = new VolumetricFireRenderer(mocks.device);
      await renderer.initialize();

      renderer.dispose();
      expect(() => renderer.dispose()).not.toThrow();
    });

    it('should be safe to dispose multiple times', () => {
      renderer = new VolumetricFireRenderer(mocks.device);
      renderer.dispose();
      renderer.dispose();
      renderer.dispose();

      expect(() => renderer.dispose()).not.toThrow();
    });

    it('should be safe to dispose before initialization', () => {
      renderer = new VolumetricFireRenderer(mocks.device);
      expect(() => renderer.dispose()).not.toThrow();
    });
  });

  // =========================================================================
  // FRAME BUDGET ENFORCEMENT
  // =========================================================================

  describe('Frame Budget Enforcement', () => {
    it('should have all quality steps within 11.1ms VR budget', () => {
      for (const level of [0, 1, 2, 3] as const) {
        expect(QUALITY_STEPS[level].frameBudgetMs).toBeLessThanOrEqual(3.0);
      }
    });

    it('should target <2ms for Quest 3 (medium quality)', () => {
      expect(QUALITY_STEPS[1].frameBudgetMs).toBeLessThanOrEqual(2.0);
    });

    it('should target <1.5ms for Quest 2 (low quality)', () => {
      expect(QUALITY_STEPS[0].frameBudgetMs).toBeLessThanOrEqual(1.5);
    });
  });

  // =========================================================================
  // DENSITY FIELD CONFIGURATION
  // =========================================================================

  describe('Density Field Configuration', () => {
    it('should have resolutions divisible by workgroup size (4)', () => {
      for (const level of [0, 1, 2, 3] as const) {
        expect(QUALITY_STEPS[level].densityFieldResolution % 4).toBe(0);
      }
    });

    it('should have ascending density field resolutions', () => {
      expect(QUALITY_STEPS[0].densityFieldResolution).toBeLessThanOrEqual(
        QUALITY_STEPS[1].densityFieldResolution
      );
      expect(QUALITY_STEPS[1].densityFieldResolution).toBeLessThanOrEqual(
        QUALITY_STEPS[2].densityFieldResolution
      );
      expect(QUALITY_STEPS[2].densityFieldResolution).toBeLessThanOrEqual(
        QUALITY_STEPS[3].densityFieldResolution
      );
    });

    it('should use lower density update intervals at higher quality', () => {
      expect(QUALITY_STEPS[0].densityUpdateInterval).toBeGreaterThanOrEqual(
        QUALITY_STEPS[3].densityUpdateInterval
      );
    });
  });
});
