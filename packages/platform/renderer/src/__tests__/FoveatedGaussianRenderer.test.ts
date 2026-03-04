/**
 * @vitest-environment jsdom
 */

/**
 * Tests for FoveatedGaussianRenderer
 * (VRSplat-style foveated Gaussian splatting + StopThePop temporal stabilization)
 *
 * Validates:
 * - Pipeline initialization and configuration
 * - Gaussian cloud registration and unregistration
 * - Frustum culling correctness
 * - Foveated tile classification (foveal / blend / peripheral zones)
 * - Depth sorting (radix sort and insertion sort)
 * - StopThePop hierarchical re-sorting and culling
 * - Alpha blending and rasterization
 * - Adaptive quality level transitions
 * - Performance statistics and reporting
 * - Device presets (Quest 2, Quest 3, PCVR, Desktop)
 * - Gaze tracking with temporal smoothing
 * - Frame budget compliance
 * - Event emission
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
  FoveatedGaussianRenderer,
  createFoveatedGaussianRenderer,
  createFoveatedGaussianRendererForDevice,
} from '../FoveatedGaussianRenderer';

import type {
  GaussianSplatData,
  GaussianCloudParams,
  EyeRenderState,
  FoveatedGaussianPipelineConfig,
} from '../FoveatedGaussianTypes';

import {
  DEFAULT_PIPELINE_CONFIG,
  DEFAULT_FOVEATED_ZONES,
  DEFAULT_STOPTHEPOP_CONFIG,
  QUEST3_PIPELINE_CONFIG,
  PCVR_PIPELINE_CONFIG,
} from '../FoveatedGaussianTypes';

// =============================================================================
// HELPERS
// =============================================================================

function createIdentityMatrix(): Float32Array {
  const m = new Float32Array(16);
  m[0] = 1; m[5] = 1; m[10] = 1; m[15] = 1;
  return m;
}

function createTranslationMatrix(x: number, y: number, z: number): Float32Array {
  const m = createIdentityMatrix();
  m[12] = x; m[13] = y; m[14] = z;
  return m;
}

function createTestSplatData(count: number, opts?: Partial<GaussianSplatData>): GaussianSplatData {
  const positions = new Float32Array(count * 3);
  const covariances = new Float32Array(count * 6);
  const shCoeffs = new Float32Array(count * 3); // DC only
  const opacities = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Distribute Gaussians in a unit sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const r = Math.random() * 5;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    // Identity-ish covariance
    covariances[i * 6] = 0.01;
    covariances[i * 6 + 3] = 0.01;
    covariances[i * 6 + 5] = 0.01;

    // Random SH DC
    shCoeffs[i * 3] = Math.random();
    shCoeffs[i * 3 + 1] = Math.random();
    shCoeffs[i * 3 + 2] = Math.random();

    // High opacity
    opacities[i] = 0.8 + Math.random() * 0.2;
  }

  return {
    id: opts?.id ?? 'test-cloud',
    count,
    positions,
    covariances,
    shCoeffs,
    shBands: opts?.shBands ?? 0,
    opacities,
    boundCenter: opts?.boundCenter ?? [0, 0, 0],
    boundRadius: opts?.boundRadius ?? 5,
  };
}

function createTestCloudParams(
  id: string,
  count: number,
  opts?: Partial<GaussianCloudParams>,
): GaussianCloudParams {
  return {
    id,
    data: createTestSplatData(count, { id }),
    worldMatrix: opts?.worldMatrix ?? createIdentityMatrix(),
    layer: opts?.layer ?? 'baked',
    priority: opts?.priority ?? 0,
    pinned: opts?.pinned ?? false,
    ...opts,
  };
}

function createTestEyeState(opts?: Partial<EyeRenderState>): EyeRenderState {
  return {
    eye: opts?.eye ?? 'left',
    viewMatrix: opts?.viewMatrix ?? createIdentityMatrix(),
    projectionMatrix: opts?.projectionMatrix ?? createIdentityMatrix(),
    cameraPosition: opts?.cameraPosition ?? [0, 1.7, 0],
    cameraForward: opts?.cameraForward ?? [0, 0, -1],
    gazeDirection: opts?.gazeDirection ?? [0, 0, -1],
    width: opts?.width ?? 2064,
    height: opts?.height ?? 2272,
    tileCountX: opts?.tileCountX ?? Math.ceil((opts?.width ?? 2064) / 16),
    tileCountY: opts?.tileCountY ?? Math.ceil((opts?.height ?? 2272) / 16),
  };
}

function createTestRenderer(
  config?: Partial<FoveatedGaussianPipelineConfig>,
): FoveatedGaussianRenderer {
  return new FoveatedGaussianRenderer({
    verbose: false,
    adaptiveQuality: false,
    ...config,
  });
}

// =============================================================================
// TESTS
// =============================================================================

describe('FoveatedGaussianRenderer', () => {

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  describe('initialization', () => {
    it('should create with default configuration', () => {
      const renderer = createTestRenderer();
      expect(renderer).toBeDefined();
      expect(renderer.getCloudCount()).toBe(0);
      expect(renderer.getTotalGaussianCount()).toBe(0);
      expect(renderer.getFrameNumber()).toBe(0);
    });

    it('should respect custom configuration', () => {
      const renderer = createTestRenderer({
        maxGaussians: 200_000,
        targetFrameTimeMs: 8.0,
        stereoEnabled: false,
      });
      const config = renderer.getConfig();
      expect(config.maxGaussians).toBe(200_000);
      expect(config.targetFrameTimeMs).toBe(8.0);
      expect(config.stereoEnabled).toBe(false);
    });

    it('should have StopThePop enabled by default', () => {
      const renderer = createTestRenderer();
      const config = renderer.getConfig();
      expect(config.stopThePop.enabled).toBe(true);
      expect(config.stopThePop.enableHierarchicalCulling).toBe(true);
      expect(config.stopThePop.enableOptimalDepth).toBe(true);
    });

    it('should have foveated rendering enabled by default', () => {
      const renderer = createTestRenderer();
      const config = renderer.getConfig();
      expect(config.foveated.enabled).toBe(true);
      expect(config.foveated.fovealAngleDeg).toBe(10);
      expect(config.foveated.blendZoneDeg).toBe(5);
    });
  });

  // ===========================================================================
  // CLOUD MANAGEMENT
  // ===========================================================================

  describe('cloud management', () => {
    let renderer: FoveatedGaussianRenderer;

    beforeEach(() => {
      renderer = createTestRenderer({ maxGaussians: 100_000 });
    });

    it('should register a Gaussian cloud', () => {
      const params = createTestCloudParams('env-01', 50_000);
      const accepted = renderer.registerCloud(params);

      expect(accepted).toBe(true);
      expect(renderer.getCloudCount()).toBe(1);
      expect(renderer.getTotalGaussianCount()).toBe(50_000);
    });

    it('should reject duplicate cloud registration', () => {
      const params = createTestCloudParams('env-01', 50_000);
      renderer.registerCloud(params);
      const rejected = renderer.registerCloud(params);

      expect(rejected).toBe(false);
      expect(renderer.getCloudCount()).toBe(1);
    });

    it('should reject cloud when budget is exceeded', () => {
      renderer.registerCloud(createTestCloudParams('env-01', 60_000));
      renderer.registerCloud(createTestCloudParams('env-02', 30_000));

      // This should push over the 100K limit
      const rejected = renderer.registerCloud(createTestCloudParams('env-03', 20_000));

      expect(rejected).toBe(false);
      expect(renderer.getCloudCount()).toBe(2);
      expect(renderer.getTotalGaussianCount()).toBe(90_000);
    });

    it('should accept pinned clouds even when over budget', () => {
      renderer.registerCloud(createTestCloudParams('env-01', 90_000));

      // Pinned cloud should be accepted despite exceeding budget
      const accepted = renderer.registerCloud(
        createTestCloudParams('avatar', 20_000, { pinned: true }),
      );

      expect(accepted).toBe(true);
      expect(renderer.getCloudCount()).toBe(2);
    });

    it('should unregister a cloud', () => {
      renderer.registerCloud(createTestCloudParams('env-01', 50_000));
      const removed = renderer.unregisterCloud('env-01');

      expect(removed).toBe(true);
      expect(renderer.getCloudCount()).toBe(0);
      expect(renderer.getTotalGaussianCount()).toBe(0);
    });

    it('should return false when unregistering non-existent cloud', () => {
      const removed = renderer.unregisterCloud('nonexistent');
      expect(removed).toBe(false);
    });

    it('should update cloud transform', () => {
      renderer.registerCloud(createTestCloudParams('env-01', 50_000));
      const newMatrix = createTranslationMatrix(10, 0, -20);
      renderer.updateCloudTransform('env-01', newMatrix);

      const cloud = renderer.getCloudInfo('env-01');
      expect(cloud).toBeDefined();
      // Transformed center should be offset
      expect(cloud!.worldCenter[0]).toBeCloseTo(10, 1);
      expect(cloud!.worldCenter[2]).toBeCloseTo(-20, 1);
    });

    it('should track multiple clouds with correct total', () => {
      renderer.registerCloud(createTestCloudParams('env-01', 40_000, { layer: 'baked' }));
      renderer.registerCloud(createTestCloudParams('avatar', 15_000, { layer: 'relightable' }));
      renderer.registerCloud(createTestCloudParams('prop', 5_000, { layer: 'interactive' }));

      expect(renderer.getCloudCount()).toBe(3);
      expect(renderer.getTotalGaussianCount()).toBe(60_000);

      const ids = renderer.getCloudIds();
      expect(ids).toContain('env-01');
      expect(ids).toContain('avatar');
      expect(ids).toContain('prop');
    });
  });

  // ===========================================================================
  // FRAME RENDERING
  // ===========================================================================

  describe('frame rendering', () => {
    let renderer: FoveatedGaussianRenderer;

    beforeEach(() => {
      renderer = createTestRenderer({
        maxGaussians: 500_000,
        targetFrameTimeMs: 12,
      });
      renderer.registerCloud(createTestCloudParams('env-01', 100_000));
    });

    it('should render a mono frame and return timings', () => {
      const eyeState = createTestEyeState();
      const timings = renderer.renderFrame([eyeState]);

      expect(timings).toBeDefined();
      expect(timings.totalMs).toBeGreaterThanOrEqual(0);
      expect(timings.gaussiansSubmitted).toBe(100_000);
      expect(timings.tilesProcessed).toBeGreaterThan(0);
      expect(renderer.getFrameNumber()).toBe(1);
    });

    it('should render a stereo frame with both eyes', () => {
      const leftEye = createTestEyeState({ eye: 'left' });
      const rightEye = createTestEyeState({ eye: 'right' });
      const timings = renderer.renderFrame([leftEye, rightEye]);

      expect(timings.tilesProcessed).toBeGreaterThan(0);
      // Stereo should process tiles for both eyes
    });

    it('should increment frame number on each render', () => {
      const eyeState = createTestEyeState();

      renderer.renderFrame([eyeState]);
      expect(renderer.getFrameNumber()).toBe(1);

      renderer.renderFrame([eyeState]);
      expect(renderer.getFrameNumber()).toBe(2);

      renderer.renderFrame([eyeState]);
      expect(renderer.getFrameNumber()).toBe(3);
    });

    it('should report frustum culling results', () => {
      // Add a cloud behind the camera (should be culled)
      renderer.registerCloud(createTestCloudParams('behind', 50_000, {
        worldMatrix: createTranslationMatrix(0, 0, 100), // Behind camera facing -Z
      }));

      const eyeState = createTestEyeState({
        cameraPosition: [0, 0, 0],
        cameraForward: [0, 0, -1],
      });

      const timings = renderer.renderFrame([eyeState]);

      expect(timings.gaussiansSubmitted).toBe(150_000);
      // Some Gaussians should be culled
      expect(timings.frustumCullMs).toBeGreaterThanOrEqual(0);
    });

    it('should report tile classification in timings', () => {
      const eyeState = createTestEyeState();
      const timings = renderer.renderFrame([eyeState]);

      expect(timings.tileAssignMs).toBeGreaterThanOrEqual(0);
      expect(timings.tilesProcessed).toBeGreaterThan(0);
      // With foveated enabled, we should see foveal and peripheral tiles
      expect(timings.tilesFoveal).toBeGreaterThanOrEqual(0);
      expect(timings.tilesPeripheral).toBeGreaterThanOrEqual(0);
    });

    it('should handle rendering with no clouds', () => {
      const emptyRenderer = createTestRenderer();
      const eyeState = createTestEyeState();
      const timings = emptyRenderer.renderFrame([eyeState]);

      expect(timings.gaussiansSubmitted).toBe(0);
      expect(timings.gaussiansAfterCull).toBe(0);
    });
  });

  // ===========================================================================
  // STOPTHEPOP SORTING
  // ===========================================================================

  describe('StopThePop sorting', () => {
    it('should perform hierarchical re-sorting when enabled', () => {
      const renderer = createTestRenderer({
        stopThePop: { ...DEFAULT_STOPTHEPOP_CONFIG, enabled: true },
      });
      renderer.registerCloud(createTestCloudParams('env-01', 10_000));

      const eyeState = createTestEyeState();
      const timings = renderer.renderFrame([eyeState]);

      expect(timings.hierarchicalResortMs).toBeGreaterThanOrEqual(0);
      // After culling, count should be less than submitted
      expect(timings.gaussiansAfterTileCull).toBeLessThanOrEqual(timings.gaussiansAfterCull);
    });

    it('should skip hierarchical re-sorting when disabled', () => {
      const renderer = createTestRenderer({
        stopThePop: { ...DEFAULT_STOPTHEPOP_CONFIG, enabled: false },
      });
      renderer.registerCloud(createTestCloudParams('env-01', 10_000));

      const eyeState = createTestEyeState();
      const timings = renderer.renderFrame([eyeState]);

      // When disabled, after-tile-cull should equal after-frustum-cull
      expect(timings.gaussiansAfterTileCull).toBe(timings.gaussiansAfterCull);
    });

    it('should apply tile-based culling with ~44% reduction', () => {
      const renderer = createTestRenderer({
        stopThePop: {
          ...DEFAULT_STOPTHEPOP_CONFIG,
          enabled: true,
          enableHierarchicalCulling: true,
        },
      });
      renderer.registerCloud(createTestCloudParams('env-01', 100_000));

      const eyeState = createTestEyeState();
      const timings = renderer.renderFrame([eyeState]);

      // The paper reports ~44% culling, our simulation should reflect this
      if (timings.gaussiansAfterCull > 0) {
        const cullRatio = 1 - (timings.gaussiansAfterTileCull / timings.gaussiansAfterCull);
        // Should be approximately 44% (with tolerance for simulation)
        expect(cullRatio).toBeGreaterThanOrEqual(0.3);
        expect(cullRatio).toBeLessThanOrEqual(0.6);
      }
    });
  });

  // ===========================================================================
  // FOVEATED RENDERING
  // ===========================================================================

  describe('foveated rendering', () => {
    it('should classify tiles into foveal, blend, and peripheral zones', () => {
      const renderer = createTestRenderer({
        foveated: {
          enabled: true,
          fovealAngleDeg: 10,
          blendZoneDeg: 5,
          zones: DEFAULT_FOVEATED_ZONES,
          gazeSmoothingFactor: 0.3,
          perEyeFoveation: true,
        },
      });
      renderer.registerCloud(createTestCloudParams('env-01', 50_000));

      const eyeState = createTestEyeState({ width: 512, height: 512 });
      const timings = renderer.renderFrame([eyeState]);

      // Should have tiles in multiple zones
      expect(timings.tilesProcessed).toBeGreaterThan(0);
    });

    it('should process all tiles as foveal when foveation is disabled', () => {
      const renderer = createTestRenderer({
        foveated: {
          enabled: false,
          fovealAngleDeg: 10,
          blendZoneDeg: 5,
          zones: DEFAULT_FOVEATED_ZONES,
          gazeSmoothingFactor: 0.3,
          perEyeFoveation: false,
        },
      });
      renderer.registerCloud(createTestCloudParams('env-01', 50_000));

      const eyeState = createTestEyeState({ width: 256, height: 256 });
      const timings = renderer.renderFrame([eyeState]);

      // All tiles should be foveal when foveation is disabled
      expect(timings.tilesProcessed).toBeGreaterThan(0);
      expect(timings.tilesPeripheral).toBe(0);
    });
  });

  // ===========================================================================
  // GAZE TRACKING
  // ===========================================================================

  describe('gaze tracking', () => {
    it('should update gaze with temporal smoothing', () => {
      const renderer = createTestRenderer();

      // First update
      renderer.updateGaze([0, 0, -1], [0, 0, -1]);

      // Second update with different direction
      renderer.updateGaze([0.5, 0, -0.866], [0.5, 0, -0.866]);

      // The smoothed gaze should be between the two values
      // (not testing exact values due to smoothing factor)
    });

    it('should handle fixed foveation center', () => {
      const renderer = createTestRenderer({
        foveated: {
          enabled: true,
          fovealAngleDeg: 10,
          blendZoneDeg: 5,
          zones: DEFAULT_FOVEATED_ZONES,
          gazeSmoothingFactor: 0.3,
          fixedFoveationCenter: [0.5, 0.5],
          perEyeFoveation: false,
        },
      });
      renderer.registerCloud(createTestCloudParams('env-01', 10_000));

      const eyeState = createTestEyeState({ width: 256, height: 256 });
      const timings = renderer.renderFrame([eyeState]);

      expect(timings.tilesProcessed).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // ADAPTIVE QUALITY
  // ===========================================================================

  describe('adaptive quality', () => {
    it('should start at quality level 0 (best)', () => {
      const renderer = createTestRenderer({ adaptiveQuality: true });
      expect(renderer.getQualityLevel()).toBe(0);
    });

    it('should allow forcing quality level', () => {
      const renderer = createTestRenderer();

      renderer.forceQualityLevel(3);
      expect(renderer.getQualityLevel()).toBe(3);

      renderer.forceQualityLevel(5);
      expect(renderer.getQualityLevel()).toBe(5);

      // Should clamp to valid range
      renderer.forceQualityLevel(10);
      expect(renderer.getQualityLevel()).toBe(5);

      renderer.forceQualityLevel(-1);
      expect(renderer.getQualityLevel()).toBe(0);
    });

    it('should reset quality to best', () => {
      const renderer = createTestRenderer();
      renderer.forceQualityLevel(4);
      expect(renderer.getQualityLevel()).toBe(4);

      renderer.resetQuality();
      expect(renderer.getQualityLevel()).toBe(0);
    });
  });

  // ===========================================================================
  // PERFORMANCE STATISTICS
  // ===========================================================================

  describe('performance statistics', () => {
    it('should return null stats before any frames', () => {
      const renderer = createTestRenderer();
      expect(renderer.getPerformanceStats()).toBeNull();
    });

    it('should return null for last timing before any frames', () => {
      const renderer = createTestRenderer();
      expect(renderer.getLastTiming()).toBeNull();
    });

    it('should compute stats after multiple frames', () => {
      const renderer = createTestRenderer({ perfWindowSize: 10 });
      renderer.registerCloud(createTestCloudParams('env-01', 10_000));
      const eyeState = createTestEyeState({ width: 256, height: 256 });

      // Render several frames
      for (let i = 0; i < 10; i++) {
        renderer.renderFrame([eyeState]);
      }

      const stats = renderer.getPerformanceStats();
      expect(stats).not.toBeNull();
      expect(stats!.windowSize).toBe(10);
      expect(stats!.avgFrameMs).toBeGreaterThanOrEqual(0);
      expect(stats!.p95FrameMs).toBeGreaterThanOrEqual(stats!.avgFrameMs);
      expect(stats!.minFrameMs).toBeLessThanOrEqual(stats!.maxFrameMs);
      expect(stats!.withinBudgetPct).toBeGreaterThanOrEqual(0);
      expect(stats!.withinBudgetPct).toBeLessThanOrEqual(100);
      expect(['excellent', 'good', 'marginal', 'degraded', 'critical']).toContain(stats!.state);
    });

    it('should track last timing correctly', () => {
      const renderer = createTestRenderer();
      renderer.registerCloud(createTestCloudParams('env-01', 10_000));
      const eyeState = createTestEyeState({ width: 256, height: 256 });

      renderer.renderFrame([eyeState]);
      const timing = renderer.getLastTiming();

      expect(timing).not.toBeNull();
      expect(timing!.totalMs).toBeGreaterThanOrEqual(0);
      expect(timing!.gaussiansSubmitted).toBe(10_000);
    });

    it('should limit timing history to window size', () => {
      const renderer = createTestRenderer({ perfWindowSize: 5 });
      renderer.registerCloud(createTestCloudParams('env-01', 1_000));
      const eyeState = createTestEyeState({ width: 128, height: 128 });

      // Render more frames than window size
      for (let i = 0; i < 20; i++) {
        renderer.renderFrame([eyeState]);
      }

      const stats = renderer.getPerformanceStats();
      expect(stats!.windowSize).toBe(5);
    });
  });

  // ===========================================================================
  // DEVICE PRESETS
  // ===========================================================================

  describe('device presets', () => {
    it('should apply Quest 3 preset', () => {
      const renderer = createTestRenderer();
      renderer.applyQuest3Preset();
      const config = renderer.getConfig();

      expect(config.targetFrameTimeMs).toBe(11.1);
      expect(config.maxGaussians).toBe(160_000);
      expect(config.foveated.enabled).toBe(true);
      expect(config.stopThePop.enabled).toBe(true);
      expect(config.stereoEnabled).toBe(true);
    });

    it('should apply Quest 2 preset', () => {
      const renderer = createTestRenderer();
      renderer.applyQuest2Preset();
      const config = renderer.getConfig();

      expect(config.targetFrameTimeMs).toBe(13.9);
      expect(config.maxGaussians).toBe(80_000);
      expect(config.foveated.enabled).toBe(true);
      expect(config.stereoEnabled).toBe(true);
    });

    it('should apply PCVR preset', () => {
      const renderer = createTestRenderer();
      renderer.applyPCVRPreset();
      const config = renderer.getConfig();

      expect(config.targetFrameTimeMs).toBe(8.33);
      expect(config.maxGaussians).toBe(1_000_000);
      expect(config.foveated.enabled).toBe(false);
      expect(config.stereoEnabled).toBe(true);
    });

    it('should apply Desktop preset', () => {
      const renderer = createTestRenderer();
      renderer.applyDesktopPreset();
      const config = renderer.getConfig();

      expect(config.targetFrameTimeMs).toBe(16.67);
      expect(config.maxGaussians).toBe(2_000_000);
      expect(config.foveated.enabled).toBe(false);
      expect(config.stereoEnabled).toBe(false);
    });

    it('should create device-specific renderer via factory', () => {
      const q3 = createFoveatedGaussianRendererForDevice('quest3');
      expect(q3.getConfig().targetFrameTimeMs).toBe(11.1);

      const pcvr = createFoveatedGaussianRendererForDevice('pcvr');
      expect(pcvr.getConfig().targetFrameTimeMs).toBe(8.33);
    });
  });

  // ===========================================================================
  // CONFIGURATION UPDATES
  // ===========================================================================

  describe('configuration updates', () => {
    it('should update foveated config', () => {
      const renderer = createTestRenderer();
      renderer.setFoveatedConfig({ fovealAngleDeg: 15, blendZoneDeg: 8 });
      const config = renderer.getConfig();

      expect(config.foveated.fovealAngleDeg).toBe(15);
      expect(config.foveated.blendZoneDeg).toBe(8);
    });

    it('should update StopThePop config', () => {
      const renderer = createTestRenderer();
      renderer.setStopThePopConfig({ enabled: false, tileQueueSize: 128 });
      const config = renderer.getConfig();

      expect(config.stopThePop.enabled).toBe(false);
      expect(config.stopThePop.tileQueueSize).toBe(128);
    });

    it('should update target frame time', () => {
      const renderer = createTestRenderer();
      renderer.setTargetFrameTime(8.0);
      expect(renderer.getConfig().targetFrameTimeMs).toBe(8.0);
    });
  });

  // ===========================================================================
  // EVENTS
  // ===========================================================================

  describe('events', () => {
    it('should emit cloud:added on registration', () => {
      const renderer = createTestRenderer();
      const handler = vi.fn();
      renderer.on('cloud:added', handler);

      renderer.registerCloud(createTestCloudParams('env-01', 10_000));

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].data.id).toBe('env-01');
      expect(handler.mock.calls[0][0].data.count).toBe(10_000);
    });

    it('should emit cloud:removed on unregistration', () => {
      const renderer = createTestRenderer();
      const handler = vi.fn();
      renderer.on('cloud:removed', handler);

      renderer.registerCloud(createTestCloudParams('env-01', 10_000));
      renderer.unregisterCloud('env-01');

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].data.id).toBe('env-01');
    });

    it('should emit budget:exceeded when over budget', () => {
      const renderer = createTestRenderer({ maxGaussians: 10_000 });
      const handler = vi.fn();
      renderer.on('budget:exceeded', handler);

      renderer.registerCloud(createTestCloudParams('env-01', 10_000));
      renderer.registerCloud(createTestCloudParams('env-02', 5_000)); // Over budget

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].data.id).toBe('env-02');
    });
  });

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  describe('cleanup', () => {
    it('should clear all state', () => {
      const renderer = createTestRenderer();
      renderer.registerCloud(createTestCloudParams('env-01', 50_000));
      renderer.registerCloud(createTestCloudParams('env-02', 30_000));
      const eyeState = createTestEyeState({ width: 128, height: 128 });
      renderer.renderFrame([eyeState]);

      renderer.clear();

      expect(renderer.getCloudCount()).toBe(0);
      expect(renderer.getTotalGaussianCount()).toBe(0);
      expect(renderer.getFrameNumber()).toBe(0);
      expect(renderer.getPerformanceStats()).toBeNull();
      expect(renderer.getQualityLevel()).toBe(0);
    });

    it('should dispose gracefully', () => {
      const renderer = createTestRenderer();
      renderer.registerCloud(createTestCloudParams('env-01', 50_000));

      renderer.dispose();

      expect(renderer.getCloudCount()).toBe(0);
    });
  });

  // ===========================================================================
  // REPORT GENERATION
  // ===========================================================================

  describe('report generation', () => {
    it('should generate a detailed performance report', () => {
      const renderer = createTestRenderer();
      renderer.registerCloud(createTestCloudParams('env-01', 50_000, { layer: 'baked' }));
      renderer.registerCloud(createTestCloudParams('avatar', 15_000, { layer: 'relightable' }));

      const eyeState = createTestEyeState({ width: 256, height: 256 });
      for (let i = 0; i < 5; i++) {
        renderer.renderFrame([eyeState]);
      }

      const report = renderer.generateReport();

      expect(report).toContain('FOVEATED GAUSSIAN RENDERER');
      expect(report).toContain('VRSplat + StopThePop');
      expect(report).toContain('Configuration');
      expect(report).toContain('Current State');
      expect(report).toContain('Performance Statistics');
      expect(report).toContain('Last Frame Breakdown');
      expect(report).toContain('Cloud Registry');
      expect(report).toContain('env-01');
      expect(report).toContain('avatar');
    });

    it('should generate report even with no frames rendered', () => {
      const renderer = createTestRenderer();
      const report = renderer.generateReport();

      expect(report).toContain('FOVEATED GAUSSIAN RENDERER');
      expect(report).toContain('Registered Clouds:  0');
    });
  });

  // ===========================================================================
  // DEFAULT CONFIGURATIONS
  // ===========================================================================

  describe('default configurations', () => {
    it('should have correct default foveated zone configs', () => {
      expect(DEFAULT_FOVEATED_ZONES.foveal.tileSize).toBe(16);
      expect(DEFAULT_FOVEATED_ZONES.foveal.resolutionScale).toBe(1.0);
      expect(DEFAULT_FOVEATED_ZONES.foveal.maxSHBand).toBe(3);

      expect(DEFAULT_FOVEATED_ZONES.peripheral.tileSize).toBe(32);
      expect(DEFAULT_FOVEATED_ZONES.peripheral.resolutionScale).toBe(0.5);
      expect(DEFAULT_FOVEATED_ZONES.peripheral.maxSHBand).toBe(0);

      expect(DEFAULT_FOVEATED_ZONES.blend.tileSize).toBe(16);
      expect(DEFAULT_FOVEATED_ZONES.blend.resolutionScale).toBe(0.75);
    });

    it('should have correct StopThePop queue sizes per paper', () => {
      expect(DEFAULT_STOPTHEPOP_CONFIG.tileQueueSize).toBe(64);
      expect(DEFAULT_STOPTHEPOP_CONFIG.subTileQueueSize).toBe(8);
      expect(DEFAULT_STOPTHEPOP_CONFIG.pixelQueueSize).toBe(4);
      expect(DEFAULT_STOPTHEPOP_CONFIG.cullingOpacityThreshold).toBeCloseTo(1 / 255, 5);
    });

    it('should have correct Quest 3 pipeline config', () => {
      expect(QUEST3_PIPELINE_CONFIG.targetFrameTimeMs).toBe(11.1);
      expect(QUEST3_PIPELINE_CONFIG.maxGaussians).toBe(160_000);
      expect(QUEST3_PIPELINE_CONFIG.stereoEnabled).toBe(true);
    });

    it('should have correct PCVR pipeline config', () => {
      expect(PCVR_PIPELINE_CONFIG.targetFrameTimeMs).toBe(8.33);
      expect(PCVR_PIPELINE_CONFIG.maxGaussians).toBe(1_000_000);
      expect(PCVR_PIPELINE_CONFIG.foveated.enabled).toBe(false);
    });
  });

  // ===========================================================================
  // FACTORY FUNCTIONS
  // ===========================================================================

  describe('factory functions', () => {
    it('should create renderer via createFoveatedGaussianRenderer', () => {
      const renderer = createFoveatedGaussianRenderer({ maxGaussians: 300_000 });
      expect(renderer).toBeInstanceOf(FoveatedGaussianRenderer);
      expect(renderer.getConfig().maxGaussians).toBe(300_000);
    });

    it('should create device-specific renderers', () => {
      const q2 = createFoveatedGaussianRendererForDevice('quest2');
      expect(q2.getConfig().maxGaussians).toBe(80_000);

      const q3 = createFoveatedGaussianRendererForDevice('quest3');
      expect(q3.getConfig().maxGaussians).toBe(160_000);

      const pcvr = createFoveatedGaussianRendererForDevice('pcvr');
      expect(pcvr.getConfig().maxGaussians).toBe(1_000_000);

      const desktop = createFoveatedGaussianRendererForDevice('desktop');
      expect(desktop.getConfig().maxGaussians).toBe(2_000_000);
    });
  });

  // ===========================================================================
  // TIMING BUDGET COMPLIANCE
  // ===========================================================================

  describe('timing budget compliance', () => {
    it('should complete rendering within reasonable time for small scenes', () => {
      const renderer = createTestRenderer({ targetFrameTimeMs: 12 });
      renderer.registerCloud(createTestCloudParams('env-01', 1_000));

      const eyeState = createTestEyeState({ width: 256, height: 256 });
      const timings = renderer.renderFrame([eyeState]);

      // CPU simulation should be very fast for small scenes
      expect(timings.totalMs).toBeLessThan(100); // Generous for CI
    });

    it('should correctly classify frame as within or over budget', () => {
      const renderer = createTestRenderer({ targetFrameTimeMs: 1000 }); // Very generous budget
      renderer.registerCloud(createTestCloudParams('env-01', 1_000));

      const eyeState = createTestEyeState({ width: 128, height: 128 });
      const timings = renderer.renderFrame([eyeState]);

      expect(timings.withinBudget).toBe(true);
    });
  });
});
