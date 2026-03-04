/**
 * @vitest-environment jsdom
 */

/**
 * Tests for GaussianBudgetManager (Layered Gaussian Splat Budget)
 *
 * Validates:
 * - Layer budget initialization (120K baked + 30K relightable + 10K interactive)
 * - Splat registration and rejection at capacity
 * - LOD level computation based on distance
 * - Foveated rendering bias
 * - Priority-based culling when over budget
 * - Cross-layer budget borrowing and lending
 * - Performance state transitions (nominal -> pressure -> critical -> emergency)
 * - Emergency shed behavior
 * - Device presets (Quest 2, Quest 3, PCVR, Desktop)
 * - Layer promotion (baked -> interactive)
 * - Metrics and reporting
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
  GaussianBudgetManager,
  createGaussianBudgetManager,
  createGaussianBudgetManagerForDevice,
  SPLAT_MEMORY_BYTES,
  SPLAT_RENDER_COST,
  type GaussianLayerType,
  type GaussianBudgetManagerConfig,
} from '../GaussianBudgetManager';

// =============================================================================
// HELPERS
// =============================================================================

function createTestManager(config?: GaussianBudgetManagerConfig): GaussianBudgetManager {
  return new GaussianBudgetManager({
    enableAdaptive: false, // Disable for deterministic tests
    verbose: false,
    ...config,
  });
}

function simulateFrame(
  manager: GaussianBudgetManager,
  frameTimeMs: number = 4.0,
  splatPositions?: Map<string, [number, number, number]>,
): void {
  manager.updateFrame({
    cameraPosition: [0, 1.7, 0],
    cameraForward: [0, 0, -1],
    frameTimeMs,
    splatPositions,
  });
}

// =============================================================================
// TESTS
// =============================================================================

describe('GaussianBudgetManager', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  describe('initialization', () => {
    it('should create with default Quest 3 budget: 160K total', () => {
      const manager = createTestManager();
      expect(manager.getTotalBudget()).toBe(160_000);
    });

    it('should have correct default layer budgets', () => {
      const manager = createTestManager();
      const bakedState = manager.getLayerState('baked');
      const relightableState = manager.getLayerState('relightable');
      const interactiveState = manager.getLayerState('interactive');

      expect(bakedState.maxSplats).toBe(120_000);
      expect(relightableState.maxSplats).toBe(30_000);
      expect(interactiveState.maxSplats).toBe(10_000);
    });

    it('should start with zero allocation', () => {
      const manager = createTestManager();
      const metrics = manager.getMetrics();

      expect(metrics.totalEffectiveSplats).toBe(0);
      expect(metrics.overallUtilization).toBe(0);
      expect(metrics.performanceState).toBe('nominal');
    });

    it('should accept custom layer budgets', () => {
      const manager = createTestManager({
        layers: {
          baked: { maxSplats: 200_000 },
          interactive: { maxSplats: 20_000 },
        },
      });

      expect(manager.getLayerState('baked').maxSplats).toBe(200_000);
      expect(manager.getLayerState('relightable').maxSplats).toBe(30_000); // unchanged
      expect(manager.getLayerState('interactive').maxSplats).toBe(20_000);
    });

    it('should use factory functions', () => {
      const m1 = createGaussianBudgetManager();
      expect(m1.getTotalBudget()).toBe(160_000);

      const m2 = createGaussianBudgetManagerForDevice('quest3');
      expect(m2.getTotalBudget()).toBe(160_000);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SPLAT REGISTRATION
  // ─────────────────────────────────────────────────────────────────────────

  describe('splat registration', () => {
    let manager: GaussianBudgetManager;

    beforeEach(() => {
      manager = createTestManager({ enableBorrowing: false });
    });

    it('should register a baked splat', () => {
      const result = manager.registerSplat({
        id: 'env_01',
        layer: 'baked',
        baseSplatCount: 50_000,
      });

      expect(result).toBe(true);
      const entry = manager.getSplat('env_01');
      expect(entry).toBeDefined();
      expect(entry!.layer).toBe('baked');
      expect(entry!.baseSplatCount).toBe(50_000);
      expect(entry!.isVisible).toBe(true);
    });

    it('should register splats across all layers', () => {
      manager.registerSplat({ id: 'baked1', layer: 'baked', baseSplatCount: 40_000 });
      manager.registerSplat({ id: 'relight1', layer: 'relightable', baseSplatCount: 15_000 });
      manager.registerSplat({ id: 'interact1', layer: 'interactive', baseSplatCount: 5_000 });

      expect(manager.getSplatIds()).toHaveLength(3);
      expect(manager.getLayerState('baked').allocatedSplats).toBe(40_000);
      expect(manager.getLayerState('relightable').allocatedSplats).toBe(15_000);
      expect(manager.getLayerState('interactive').allocatedSplats).toBe(5_000);
    });

    it('should reject splat that exceeds layer budget (no borrowing)', () => {
      const result = manager.registerSplat({
        id: 'too_big',
        layer: 'interactive',
        baseSplatCount: 15_000, // Interactive limit is 10K
      });

      expect(result).toBe(false);
      expect(manager.getSplat('too_big')).toBeUndefined();
    });

    it('should reject duplicate registration', () => {
      manager.registerSplat({ id: 'dup', layer: 'baked', baseSplatCount: 1000 });
      const result = manager.registerSplat({ id: 'dup', layer: 'baked', baseSplatCount: 2000 });

      expect(result).toBe(false);
    });

    it('should accept pinned splat even when over budget', () => {
      // Fill up interactive layer
      manager.registerSplat({ id: 'i1', layer: 'interactive', baseSplatCount: 10_000 });

      // Pinned splat should be accepted
      const result = manager.registerSplat({
        id: 'pinned_obj',
        layer: 'interactive',
        baseSplatCount: 2_000,
        pinned: true,
      });

      expect(result).toBe(true);
    });

    it('should unregister splat', () => {
      manager.registerSplat({ id: 'temp', layer: 'baked', baseSplatCount: 5_000 });
      expect(manager.getSplat('temp')).toBeDefined();

      const result = manager.unregisterSplat('temp');
      expect(result).toBe(true);
      expect(manager.getSplat('temp')).toBeUndefined();
    });

    it('should return false when unregistering non-existent splat', () => {
      expect(manager.unregisterSplat('ghost')).toBe(false);
    });

    it('should update splat count', () => {
      manager.registerSplat({ id: 'resized', layer: 'baked', baseSplatCount: 10_000 });
      manager.updateSplatCount('resized', 20_000);

      const entry = manager.getSplat('resized');
      expect(entry!.baseSplatCount).toBe(20_000);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // LOD COMPUTATION
  // ─────────────────────────────────────────────────────────────────────────

  describe('LOD computation', () => {
    it('should assign LOD 0 for nearby baked splats', () => {
      const manager = createTestManager({ foveated: { enabled: false } });
      manager.registerSplat({ id: 'close', layer: 'baked', baseSplatCount: 10_000 });

      const positions = new Map<string, [number, number, number]>();
      positions.set('close', [0, 1.7, -2]); // 2m away

      manager.updateFrame({
        cameraPosition: [0, 1.7, 0],
        cameraForward: [0, 0, -1],
        frameTimeMs: 4.0,
        splatPositions: positions,
      });

      const entry = manager.getSplat('close');
      expect(entry!.lodLevel).toBe(0);
      expect(entry!.effectiveSplatCount).toBe(10_000); // Full count
    });

    it('should assign higher LOD for distant baked splats', () => {
      const manager = createTestManager({ foveated: { enabled: false } });
      manager.registerSplat({ id: 'far', layer: 'baked', baseSplatCount: 10_000 });

      const positions = new Map<string, [number, number, number]>();
      positions.set('far', [0, 1.7, -40]); // 40m away

      manager.updateFrame({
        cameraPosition: [0, 1.7, 0],
        cameraForward: [0, 0, -1],
        frameTimeMs: 4.0,
        splatPositions: positions,
      });

      const entry = manager.getSplat('far');
      // At 40m, baked LOD should be level 2 or 3 (>30m threshold for level 3)
      expect(entry!.lodLevel).toBeGreaterThanOrEqual(2);
      expect(entry!.effectiveSplatCount).toBeLessThan(10_000);
    });

    it('should reduce effective splat count with LOD', () => {
      const manager = createTestManager({ foveated: { enabled: false } });
      manager.registerSplat({ id: 'medium', layer: 'baked', baseSplatCount: 20_000 });

      const positions = new Map<string, [number, number, number]>();
      positions.set('medium', [0, 1.7, -20]); // 20m

      manager.updateFrame({
        cameraPosition: [0, 1.7, 0],
        cameraForward: [0, 0, -1],
        frameTimeMs: 4.0,
        splatPositions: positions,
      });

      const entry = manager.getSplat('medium');
      // At 20m, baked LOD 2 (>15m threshold) => 0.2 multiplier => 4000 splats
      expect(entry!.effectiveSplatCount).toBeLessThan(20_000);
    });

    it('should use gentler LOD for interactive layer at same distance', () => {
      const manager = createTestManager({ foveated: { enabled: false } });
      manager.registerSplat({ id: 'baked_obj', layer: 'baked', baseSplatCount: 10_000 });
      manager.registerSplat({ id: 'interact_obj', layer: 'interactive', baseSplatCount: 10_000 });

      const positions = new Map<string, [number, number, number]>();
      positions.set('baked_obj', [0, 1.7, -8]); // 8m
      positions.set('interact_obj', [0, 1.7, -8]); // 8m

      manager.updateFrame({
        cameraPosition: [0, 1.7, 0],
        cameraForward: [0, 0, -1],
        frameTimeMs: 4.0,
        splatPositions: positions,
      });

      // At 8m:
      //   Baked:       8m >= 5m threshold -> LOD 1 (0.5x) = 5000
      //   Interactive: 8m < 10m threshold -> LOD 0 (1.0x) = 10000
      // Interactive keeps full quality at this distance (gentler LOD)
      const bakedEntry = manager.getSplat('baked_obj');
      const interactEntry = manager.getSplat('interact_obj');

      expect(bakedEntry!.lodLevel).toBe(1);
      expect(bakedEntry!.effectiveSplatCount).toBe(5_000);
      expect(interactEntry!.lodLevel).toBe(0);
      expect(interactEntry!.effectiveSplatCount).toBe(10_000);
      expect(interactEntry!.effectiveSplatCount).toBeGreaterThan(
        bakedEntry!.effectiveSplatCount,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // BUDGET ENFORCEMENT
  // ─────────────────────────────────────────────────────────────────────────

  describe('budget enforcement', () => {
    it('should cull lowest priority splats when over budget', () => {
      const manager = createTestManager({
        enableBorrowing: false,
        foveated: { enabled: false },
      });

      // Register 3 baked splats that fit within the 120K budget
      manager.registerSplat({ id: 'low', layer: 'baked', baseSplatCount: 40_000, priority: 1 });
      manager.registerSplat({ id: 'mid', layer: 'baked', baseSplatCount: 40_000, priority: 5 });
      manager.registerSplat({ id: 'high', layer: 'baked', baseSplatCount: 40_000, priority: 10 });
      // Total: 120K, exactly at budget

      // Now shrink the budget to 100K to trigger enforcement
      manager.setLayerBudget('baked', 100_000);

      // Provide close positions so LOD stays at 0
      const positions = new Map<string, [number, number, number]>();
      positions.set('low', [0, 1.7, -2]);
      positions.set('mid', [1, 1.7, -2]);
      positions.set('high', [-1, 1.7, -2]);

      manager.updateFrame({
        cameraPosition: [0, 1.7, 0],
        cameraForward: [0, 0, -1],
        frameTimeMs: 4.0,
        splatPositions: positions,
      });

      // Low priority should be culled first (need to shed 20K, 'low' is 40K so that covers it)
      const lowEntry = manager.getSplat('low');
      expect(lowEntry!.isVisible).toBe(false);

      // High priority should remain
      const highEntry = manager.getSplat('high');
      expect(highEntry!.isVisible).toBe(true);
    });

    it('should never cull pinned splats', () => {
      const manager = createTestManager({
        enableBorrowing: false,
        foveated: { enabled: false },
      });

      // Overfill interactive layer
      manager.registerSplat({
        id: 'pinned',
        layer: 'interactive',
        baseSplatCount: 8_000,
        priority: 1,
        pinned: true,
      });
      manager.registerSplat({
        id: 'unpinned',
        layer: 'interactive',
        baseSplatCount: 8_000,
        priority: 10,
      });

      simulateFrame(manager);

      // Pinned should remain visible even with lower priority
      expect(manager.getSplat('pinned')!.isVisible).toBe(true);
    });

    it('should restore culled splats when budget becomes available', () => {
      const manager = createTestManager({
        enableBorrowing: false,
        foveated: { enabled: false },
      });

      // Register two interactive objects that fit individually
      manager.registerSplat({ id: 'a', layer: 'interactive', baseSplatCount: 5_000, priority: 1 });
      manager.registerSplat({ id: 'b', layer: 'interactive', baseSplatCount: 5_000, priority: 5 });
      // Total: 10K = exactly at budget

      // Now shrink budget to 8K to force culling of 'a' (lower priority)
      manager.setLayerBudget('interactive', 8_000);

      const positions = new Map<string, [number, number, number]>();
      positions.set('a', [0, 1.7, -1]);
      positions.set('b', [1, 1.7, -1]);

      // First frame: 'a' should be culled (total 10K > 8K)
      manager.updateFrame({
        cameraPosition: [0, 1.7, 0],
        cameraForward: [0, 0, -1],
        frameTimeMs: 4.0,
        splatPositions: positions,
      });
      expect(manager.getSplat('a')!.isVisible).toBe(false);
      expect(manager.getSplat('b')!.isVisible).toBe(true);

      // Restore budget to 10K
      manager.setLayerBudget('interactive', 10_000);

      // Second frame: 'a' should be restored
      manager.updateFrame({
        cameraPosition: [0, 1.7, 0],
        cameraForward: [0, 0, -1],
        frameTimeMs: 4.0,
        splatPositions: positions,
      });
      expect(manager.getSplat('a')!.isVisible).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // BUDGET BORROWING
  // ─────────────────────────────────────────────────────────────────────────

  describe('budget borrowing', () => {
    it('should allow relightable to borrow from baked', () => {
      const manager = createTestManager({ enableBorrowing: true });

      // Fill relightable layer
      manager.registerSplat({ id: 'r1', layer: 'relightable', baseSplatCount: 25_000 });
      // This exceeds 30K relightable budget, should borrow from baked
      const result = manager.registerSplat({ id: 'r2', layer: 'relightable', baseSplatCount: 10_000 });

      expect(result).toBe(true); // Should succeed via borrowing
    });

    it('should not lend from interactive layer', () => {
      const manager = createTestManager({
        enableBorrowing: true,
        layers: {
          baked: { maxSplats: 10, canLend: false }, // Disable baked lending
          relightable: { maxSplats: 10, canLend: false }, // Disable relightable lending
        },
      });

      // Try to register more than interactive allows, with no other lenders
      const result = manager.registerSplat({
        id: 'overflow',
        layer: 'interactive',
        baseSplatCount: 15_000,
      });

      expect(result).toBe(false);
    });

    it('should track lent and borrowed amounts', () => {
      const manager = createTestManager({ enableBorrowing: true });

      // Use all relightable + borrow some
      manager.registerSplat({ id: 'r1', layer: 'relightable', baseSplatCount: 28_000 });
      manager.registerSplat({ id: 'r2', layer: 'relightable', baseSplatCount: 8_000 });

      const relState = manager.getLayerState('relightable');
      expect(relState.borrowedSplats).toBeGreaterThan(0);

      const bakedState = manager.getLayerState('baked');
      expect(bakedState.lentSplats).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PERFORMANCE MONITORING
  // ─────────────────────────────────────────────────────────────────────────

  describe('performance monitoring', () => {
    it('should start in nominal state', () => {
      const manager = createTestManager();
      expect(manager.getMetrics().performanceState).toBe('nominal');
    });

    it('should transition to pressure state on slow frames', () => {
      const manager = createTestManager();

      // Simulate 60 frames at 6.2ms (above 5.5ms * 1.1 = 6.05ms)
      for (let i = 0; i < 60; i++) {
        simulateFrame(manager, 6.2);
      }

      expect(manager.getMetrics().performanceState).toBe('pressure');
    });

    it('should transition to critical state on very slow frames', () => {
      const manager = createTestManager();

      // Simulate frames at 7.0ms (above 5.5ms * 1.25 = 6.875ms)
      for (let i = 0; i < 60; i++) {
        simulateFrame(manager, 7.0);
      }

      expect(manager.getMetrics().performanceState).toBe('critical');
    });

    it('should trigger emergency on extremely slow frames', () => {
      const manager = createTestManager();

      // Simulate frames at 8.5ms (above 5.5ms * 1.5 = 8.25ms)
      for (let i = 0; i < 60; i++) {
        simulateFrame(manager, 8.5);
      }

      expect(manager.getMetrics().performanceState).toBe('emergency');
    });

    it('should track average frame time', () => {
      const manager = createTestManager();

      for (let i = 0; i < 30; i++) {
        simulateFrame(manager, 5.0);
      }

      const avgTime = manager.getMetrics().avgFrameTimeMs;
      expect(avgTime).toBeCloseTo(5.0, 0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EMERGENCY SHED
  // ─────────────────────────────────────────────────────────────────────────

  describe('emergency shed', () => {
    it('should cull non-foveal objects during emergency', () => {
      const manager = createTestManager({
        foveated: { enabled: true, fovealAngleDeg: 10 },
      });

      // Register objects near and far
      manager.registerSplat({ id: 'near', layer: 'baked', baseSplatCount: 5_000 });
      manager.registerSplat({ id: 'far', layer: 'baked', baseSplatCount: 5_000 });

      const positions = new Map<string, [number, number, number]>();
      positions.set('near', [0, 1.7, -2]); // 2m = foveal
      positions.set('far', [0, 1.7, -20]); // 20m = peripheral

      // Trigger emergency with slow frames
      for (let i = 0; i < 60; i++) {
        manager.updateFrame({
          cameraPosition: [0, 1.7, 0],
          cameraForward: [0, 0, -1],
          gazeDirection: [0, 0, -1],
          splatPositions: positions,
          frameTimeMs: 9.0, // > 5.5 * 1.5 = emergency
        });
      }

      expect(manager.getMetrics().emergencyShedCount).toBeGreaterThan(0);
    });

    it('should preserve pinned objects during emergency', () => {
      const manager = createTestManager();

      manager.registerSplat({
        id: 'pinned_far',
        layer: 'baked',
        baseSplatCount: 5_000,
        pinned: true,
      });

      // Trigger emergency
      for (let i = 0; i < 60; i++) {
        simulateFrame(manager, 9.0);
      }

      // Pinned should still be visible
      expect(manager.getSplat('pinned_far')!.isVisible).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // LAYER PROMOTION
  // ─────────────────────────────────────────────────────────────────────────

  describe('layer promotion', () => {
    it('should promote splat from baked to interactive', () => {
      const manager = createTestManager();
      manager.registerSplat({ id: 'obj', layer: 'baked', baseSplatCount: 5_000 });

      const result = manager.promoteSplat('obj', 'interactive');
      expect(result).toBe(true);
      expect(manager.getSplat('obj')!.layer).toBe('interactive');
    });

    it('should reject promotion when target layer is full', () => {
      const manager = createTestManager({ enableBorrowing: false });

      // Fill interactive
      manager.registerSplat({ id: 'i1', layer: 'interactive', baseSplatCount: 10_000 });
      // Add baked
      manager.registerSplat({ id: 'baked1', layer: 'baked', baseSplatCount: 5_000 });

      const result = manager.promoteSplat('baked1', 'interactive');
      expect(result).toBe(false);
      expect(manager.getSplat('baked1')!.layer).toBe('baked'); // Unchanged
    });

    it('should be idempotent when promoting to same layer', () => {
      const manager = createTestManager();
      manager.registerSplat({ id: 'obj', layer: 'baked', baseSplatCount: 5_000 });

      const result = manager.promoteSplat('obj', 'baked');
      expect(result).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER LIST
  // ─────────────────────────────────────────────────────────────────────────

  describe('render list', () => {
    it('should return only visible splats', () => {
      const manager = createTestManager({
        enableBorrowing: false,
        foveated: { enabled: false },
      });

      manager.registerSplat({ id: 'vis', layer: 'baked', baseSplatCount: 5_000, priority: 10 });
      manager.registerSplat({ id: 'also_vis', layer: 'baked', baseSplatCount: 5_000, priority: 5 });

      simulateFrame(manager);

      const renderList = manager.getRenderList();
      expect(renderList.length).toBe(2);
      expect(renderList.every(e => e.isVisible)).toBe(true);
    });

    it('should sort interactive before relightable before baked', () => {
      const manager = createTestManager({ foveated: { enabled: false } });

      manager.registerSplat({ id: 'b', layer: 'baked', baseSplatCount: 1_000 });
      manager.registerSplat({ id: 'r', layer: 'relightable', baseSplatCount: 1_000 });
      manager.registerSplat({ id: 'i', layer: 'interactive', baseSplatCount: 1_000 });

      simulateFrame(manager);

      const renderList = manager.getRenderList();
      expect(renderList[0].layer).toBe('interactive');
      expect(renderList[1].layer).toBe('relightable');
      expect(renderList[2].layer).toBe('baked');
    });

    it('should sort by priority within same layer', () => {
      const manager = createTestManager({ foveated: { enabled: false } });

      manager.registerSplat({ id: 'low', layer: 'baked', baseSplatCount: 1_000, priority: 1 });
      manager.registerSplat({ id: 'high', layer: 'baked', baseSplatCount: 1_000, priority: 10 });

      simulateFrame(manager);

      const renderList = manager.getRenderList();
      const bakedEntries = renderList.filter(e => e.layer === 'baked');
      expect(bakedEntries[0].id).toBe('high');
      expect(bakedEntries[1].id).toBe('low');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DEVICE PRESETS
  // ─────────────────────────────────────────────────────────────────────────

  describe('device presets', () => {
    it('should apply Quest 3 preset (160K)', () => {
      const manager = createTestManager();
      manager.applyQuest3Preset();
      expect(manager.getTotalBudget()).toBe(160_000);
    });

    it('should apply Quest 2 preset (80K)', () => {
      const manager = createTestManager();
      manager.applyQuest2Preset();
      expect(manager.getTotalBudget()).toBe(80_000);
    });

    it('should apply PCVR preset (630K)', () => {
      const manager = createTestManager();
      manager.applyPCVRPreset();
      expect(manager.getTotalBudget()).toBe(630_000);
    });

    it('should apply Desktop preset (1.25M)', () => {
      const manager = createTestManager();
      manager.applyDesktopPreset();
      expect(manager.getTotalBudget()).toBe(1_250_000);
    });

    it('should create via factory for specific device', () => {
      const quest2 = createGaussianBudgetManagerForDevice('quest2');
      expect(quest2.getTotalBudget()).toBe(80_000);

      const pcvr = createGaussianBudgetManagerForDevice('pcvr');
      expect(pcvr.getTotalBudget()).toBe(630_000);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // METRICS AND REPORTING
  // ─────────────────────────────────────────────────────────────────────────

  describe('metrics and reporting', () => {
    it('should compute correct VRAM estimates', () => {
      const manager = createTestManager({ foveated: { enabled: false } });

      manager.registerSplat({ id: 'b', layer: 'baked', baseSplatCount: 10_000 });
      manager.registerSplat({ id: 'r', layer: 'relightable', baseSplatCount: 5_000 });
      manager.registerSplat({ id: 'i', layer: 'interactive', baseSplatCount: 2_000 });

      // Provide close positions so LOD stays at 0 (full splat counts preserved)
      const positions = new Map<string, [number, number, number]>();
      positions.set('b', [0, 1.7, -2]);
      positions.set('r', [1, 1.7, -2]);
      positions.set('i', [-1, 1.7, -1]);

      manager.updateFrame({
        cameraPosition: [0, 1.7, 0],
        cameraForward: [0, 0, -1],
        frameTimeMs: 4.0,
        splatPositions: positions,
      });

      const metrics = manager.getMetrics();

      // Baked VRAM: 10000 * 56 = 560,000 bytes
      expect(metrics.layers.baked.estimatedVRAMBytes).toBe(10_000 * SPLAT_MEMORY_BYTES.baked);
      // Relightable VRAM: 5000 * 96 = 480,000 bytes
      expect(metrics.layers.relightable.estimatedVRAMBytes).toBe(5_000 * SPLAT_MEMORY_BYTES.relightable);
      // Interactive VRAM: 2000 * 128 = 256,000 bytes
      expect(metrics.layers.interactive.estimatedVRAMBytes).toBe(2_000 * SPLAT_MEMORY_BYTES.interactive);
    });

    it('should generate report string', () => {
      const manager = createTestManager();
      manager.registerSplat({ id: 'test', layer: 'baked', baseSplatCount: 50_000 });

      const report = manager.generateReport();
      expect(report).toContain('GAUSSIAN SPLAT BUDGET REPORT');
      expect(report).toContain('BAKED');
      expect(report).toContain('RELIGHTABLE');
      expect(report).toContain('INTERACTIVE');
    });

    it('should track rebalance count', () => {
      const manager = createTestManager({ enableAdaptive: true, rebalanceIntervalMs: 0 });
      manager.registerSplat({ id: 'test', layer: 'baked', baseSplatCount: 1_000 });

      // Multiple frames should trigger rebalancing
      simulateFrame(manager, 4.0);
      simulateFrame(manager, 4.0);
      simulateFrame(manager, 4.0);

      expect(manager.getMetrics().rebalanceCount).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────────

  describe('runtime configuration', () => {
    it('should update layer budget at runtime', () => {
      const manager = createTestManager();
      manager.setLayerBudget('baked', 200_000);
      expect(manager.getLayerState('baked').maxSplats).toBe(200_000);
    });

    it('should update foveated config at runtime', () => {
      const manager = createTestManager();
      manager.setFoveatedConfig({ fovealAngleDeg: 15 });
      expect(manager.getConfig().foveated.fovealAngleDeg).toBe(15);
    });

    it('should update target frame time at runtime', () => {
      const manager = createTestManager();
      manager.setTargetFrameTime(8.0);
      expect(manager.getConfig().targetFrameTimeMs).toBe(8.0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EVENTS
  // ─────────────────────────────────────────────────────────────────────────

  describe('events', () => {
    it('should emit splat:registered event', () => {
      const manager = createTestManager();
      const handler = vi.fn();
      manager.on('splat:registered', handler);

      manager.registerSplat({ id: 'e1', layer: 'baked', baseSplatCount: 1_000 });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should emit splat:unregistered event', () => {
      const manager = createTestManager();
      const handler = vi.fn();
      manager.on('splat:unregistered', handler);

      manager.registerSplat({ id: 'e1', layer: 'baked', baseSplatCount: 1_000 });
      manager.unregisterSplat('e1');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should emit budget:layer_overflow when registration fails (no borrowing)', () => {
      const manager = new GaussianBudgetManager({
        enableAdaptive: false,
        enableBorrowing: false,
        verbose: false,
      });
      const handler = vi.fn();
      manager.on('budget:layer_overflow', handler);

      manager.registerSplat({ id: 'overflow', layer: 'interactive', baseSplatCount: 15_000 });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CLEANUP
  // ─────────────────────────────────────────────────────────────────────────

  describe('cleanup', () => {
    it('should clear all splats', () => {
      const manager = createTestManager();
      manager.registerSplat({ id: 'a', layer: 'baked', baseSplatCount: 1_000 });
      manager.registerSplat({ id: 'b', layer: 'relightable', baseSplatCount: 1_000 });

      manager.clear();

      expect(manager.getSplatIds()).toHaveLength(0);
      expect(manager.getMetrics().totalEffectiveSplats).toBe(0);
    });

    it('should dispose fully', () => {
      const manager = createTestManager();
      const handler = vi.fn();
      manager.on('splat:registered', handler);

      manager.dispose();

      // Should not emit after dispose
      manager.registerSplat({ id: 'post', layer: 'baked', baseSplatCount: 1_000 });
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // MEMORY CONSTANTS
  // ─────────────────────────────────────────────────────────────────────────

  describe('memory constants', () => {
    it('should have correct per-splat memory costs', () => {
      expect(SPLAT_MEMORY_BYTES.baked).toBe(56);
      expect(SPLAT_MEMORY_BYTES.relightable).toBe(96);
      expect(SPLAT_MEMORY_BYTES.interactive).toBe(128);
    });

    it('should have correct render cost weights', () => {
      expect(SPLAT_RENDER_COST.baked).toBe(1.0);
      expect(SPLAT_RENDER_COST.relightable).toBe(2.4);
      expect(SPLAT_RENDER_COST.interactive).toBe(3.6);
    });

    it('should estimate total VRAM for Quest 3 max budget', () => {
      // 120K * 56B + 30K * 96B + 10K * 128B
      const totalVRAM =
        120_000 * SPLAT_MEMORY_BYTES.baked +
        30_000 * SPLAT_MEMORY_BYTES.relightable +
        10_000 * SPLAT_MEMORY_BYTES.interactive;

      // Should be under 11MB (well within Quest 3 budget)
      expect(totalVRAM).toBeLessThan(11 * 1024 * 1024);
      // Exact: 6,720,000 + 2,880,000 + 1,280,000 = 10,880,000 bytes (~10.4MB)
      expect(totalVRAM).toBe(10_880_000);
    });
  });
});
