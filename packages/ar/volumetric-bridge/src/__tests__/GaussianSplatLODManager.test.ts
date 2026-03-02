/**
 * GaussianSplatLODManager -- Production Test Suite
 *
 * Tests runtime LOD management for Gaussian Splatting scenes:
 * - Build from splat data (scale-based LOD assignment)
 * - Camera-distance LOD selection
 * - Power-law threshold computation
 * - Budget-aware level capping
 * - VR mode with avatar reservations
 * - Movement threshold optimization
 * - Preset configurations
 * - Diagnostics and metrics
 *
 * Research references:
 *   W.032 - Octree-GS LOD (TPAMI 2025)
 *   W.034 - VR Gaussian budget
 *   P.030.01 - Hierarchical LOD pattern
 *   P.030.05 - VR Budget Management pattern
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  GaussianSplatLODManager,
  SplatDataArrays,
  VR_OPTIMIZED_CONFIG,
  VR_CONSERVATIVE_CONFIG,
  DESKTOP_CONFIG,
} from '../GaussianSplatLODManager';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Create synthetic splat data with controlled scale distribution.
 * Generates splats at various scales to populate multiple LOD levels.
 */
function makeSplatData(count: number, scaleRange: [number, number] = [0.01, 10.0]): SplatDataArrays {
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    // Spread positions in a cube [-50, 50]
    positions[i * 3] = (Math.random() - 0.5) * 100;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

    // Scale decreases with index (simulating coarse-to-fine)
    const t = i / count;
    const s = scaleRange[1] * Math.pow(1 - t, 2) + scaleRange[0];
    scales[i * 3] = s;
    scales[i * 3 + 1] = s * 0.8;
    scales[i * 3 + 2] = s * 0.6;
  }

  return { positions, scales, count };
}

/**
 * Create deterministic splat data for predictable tests.
 */
function makeDeterministicSplats(): SplatDataArrays {
  // 100 splats: 25 at scale ~10 (LOD 0), 25 at ~5 (LOD 1), 25 at ~2.5 (LOD 2), 25 at ~1 (LOD 3+)
  const count = 100;
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count * 3);

  for (let i = 0; i < 25; i++) {
    // Level 0: large scale
    positions[(i) * 3] = i;
    scales[(i) * 3] = 10;
    scales[(i) * 3 + 1] = 10;
    scales[(i) * 3 + 2] = 10;
  }
  for (let i = 25; i < 50; i++) {
    // Level 1: half scale
    positions[(i) * 3] = i;
    scales[(i) * 3] = 5;
    scales[(i) * 3 + 1] = 5;
    scales[(i) * 3 + 2] = 5;
  }
  for (let i = 50; i < 75; i++) {
    // Level 2: quarter scale
    positions[(i) * 3] = i;
    scales[(i) * 3] = 2.5;
    scales[(i) * 3 + 1] = 2.5;
    scales[(i) * 3 + 2] = 2.5;
  }
  for (let i = 75; i < 100; i++) {
    // Level 3+: small scale
    positions[(i) * 3] = i;
    scales[(i) * 3] = 0.1;
    scales[(i) * 3 + 1] = 0.1;
    scales[(i) * 3 + 2] = 0.1;
  }

  return { positions, scales, count };
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('GaussianSplatLODManager: construction', () => {
  it('constructs with default config', () => {
    const manager = new GaussianSplatLODManager();
    expect(manager.getIsBuilt()).toBe(false);
    expect(manager.getTotalGaussianCount()).toBe(0);
  });

  it('constructs with VR optimized preset', () => {
    const manager = new GaussianSplatLODManager(VR_OPTIMIZED_CONFIG);
    const config = manager.getConfig();
    expect(config.vrMode).toBe(true);
    expect(config.gaussianBudget).toBe(180000);
    expect(config.perAvatarReservation).toBe(60000);
  });

  it('constructs with VR conservative preset', () => {
    const manager = new GaussianSplatLODManager(VR_CONSERVATIVE_CONFIG);
    const config = manager.getConfig();
    expect(config.gaussianBudget).toBe(100000);
    expect(config.maxAvatars).toBe(2);
  });

  it('constructs with desktop preset', () => {
    const manager = new GaussianSplatLODManager(DESKTOP_CONFIG);
    const config = manager.getConfig();
    expect(config.vrMode).toBe(false);
    expect(config.gaussianBudget).toBe(0);
  });
});

describe('GaussianSplatLODManager: build from splat data', () => {
  it('builds from splat data and marks as built', () => {
    const manager = new GaussianSplatLODManager({ maxDepth: 4 });
    const data = makeSplatData(1000);
    manager.buildFromSplatData(data);
    expect(manager.getIsBuilt()).toBe(true);
    expect(manager.getTotalGaussianCount()).toBe(1000);
  });

  it('distributes splats across LOD levels', () => {
    const manager = new GaussianSplatLODManager({ maxDepth: 4 });
    const data = makeDeterministicSplats();
    manager.buildFromSplatData(data);

    const dist = manager.getLevelDistribution();
    expect(dist.length).toBe(4);

    // Level 0 should have the large-scale splats
    expect(dist[0].gaussianCount).toBe(25);
    // Level 1 should have the medium-scale splats
    expect(dist[1].gaussianCount).toBe(25);
    // Level 2 should have the smaller-scale splats
    expect(dist[2].gaussianCount).toBe(25);
    // Level 3 should have the smallest-scale splats
    expect(dist[3].gaussianCount).toBe(25);
  });

  it('handles single-scale splat data', () => {
    const count = 50;
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = i;
      scales[i * 3] = 1.0;
      scales[i * 3 + 1] = 1.0;
      scales[i * 3 + 2] = 1.0;
    }
    const manager = new GaussianSplatLODManager({ maxDepth: 4 });
    manager.buildFromSplatData({ positions, scales, count });
    expect(manager.getTotalGaussianCount()).toBe(50);
    // All same scale -> all at level 0
    const dist = manager.getLevelDistribution();
    expect(dist[0].gaussianCount).toBe(50);
  });

  it('accepts optional scene center override', () => {
    const manager = new GaussianSplatLODManager();
    const data = makeSplatData(100);
    manager.buildFromSplatData(data, { x: 10, y: 20, z: 30 });
    expect(manager.getIsBuilt()).toBe(true);
  });
});

describe('GaussianSplatLODManager: LOD selection', () => {
  let manager: GaussianSplatLODManager;

  beforeEach(() => {
    manager = new GaussianSplatLODManager({
      maxDepth: 4,
      powerLawExponent: 1.0, // linear for predictable tests
      baseDistance: 10.0,
      maxDistance: 100.0,
      movementThreshold: 0.0, // always re-evaluate
    });
    const data = makeDeterministicSplats();
    manager.buildFromSplatData(data, { x: 0, y: 0, z: 0 });
  });

  it('camera at scene center selects all levels', () => {
    const result = manager.update(0, 0, 0);
    expect(result.cameraDistance).toBeCloseTo(0, 1);
    // All thresholds > 0, so all levels selected
    expect(result.activeLODLevel).toBe(3);
    expect(result.visibleCount).toBe(100);
    expect(result.budgetCapped).toBe(false);
  });

  it('camera far away selects fewer levels', () => {
    const result = manager.update(0, 0, 200);
    expect(result.cameraDistance).toBeCloseTo(200, 1);
    // Beyond all thresholds -> only level 0
    expect(result.activeLODLevel).toBe(0);
    expect(result.visibleCount).toBe(25);
  });

  it('returns changed=true on first call', () => {
    const result = manager.update(0, 0, 0);
    // First call always changes since lastCameraX starts as NaN
    expect(result.changed).toBe(true);
  });

  it('returns changed=false when camera has not moved', () => {
    // Set a movement threshold
    manager.updateConfig({ movementThreshold: 1.0 });
    manager.update(50, 0, 0); // First call
    const result = manager.update(50, 0, 0); // Same position
    expect(result.changed).toBe(false);
  });

  it('returns thresholds array', () => {
    const thresholds = manager.getThresholds();
    expect(thresholds.length).toBe(4);
    // Linear thresholds with base=10, max=100
    for (let i = 1; i < thresholds.length; i++) {
      expect(thresholds[i]).toBeGreaterThan(thresholds[i - 1]);
    }
  });
});

describe('GaussianSplatLODManager: budget capping', () => {
  it('drops deepest levels when over budget', () => {
    const manager = new GaussianSplatLODManager({
      maxDepth: 4,
      powerLawExponent: 1.0,
      baseDistance: 10.0,
      maxDistance: 100.0,
      gaussianBudget: 60, // Very tight: 100 splats won't fit
      movementThreshold: 0,
    });
    const data = makeDeterministicSplats();
    manager.buildFromSplatData(data, { x: 0, y: 0, z: 0 });

    const result = manager.update(0, 0, 0);
    expect(result.budgetCapped).toBe(true);
    expect(result.levelsDropped).toBeGreaterThan(0);
    expect(result.visibleCount).toBeLessThanOrEqual(60);
  });

  it('does not cap when budget is unlimited (0)', () => {
    const manager = new GaussianSplatLODManager({
      maxDepth: 4,
      gaussianBudget: 0,
      movementThreshold: 0,
    });
    const data = makeDeterministicSplats();
    manager.buildFromSplatData(data, { x: 0, y: 0, z: 0 });

    const result = manager.update(0, 0, 0);
    expect(result.budgetCapped).toBe(false);
    expect(result.visibleCount).toBe(100);
  });
});

describe('GaussianSplatLODManager: VR mode with avatars', () => {
  let manager: GaussianSplatLODManager;

  beforeEach(() => {
    manager = new GaussianSplatLODManager({
      ...VR_OPTIMIZED_CONFIG,
      maxDepth: 4,
      powerLawExponent: 1.0,
      baseDistance: 10,
      maxDistance: 100,
      movementThreshold: 0,
    });
  });

  it('avatar reservation reduces available budget', () => {
    // Build with lots of splats
    const data = makeSplatData(200000);
    manager.buildFromSplatData(data, { x: 0, y: 0, z: 0 });

    // No avatars: full 180K budget
    manager.setActiveAvatars(0);
    const result0 = manager.update(0, 0, 0);
    expect(result0.availableBudget).toBe(180000);

    // 2 avatars: 180K - 2*60K = 60K available
    manager.setActiveAvatars(2);
    manager.resetState(); // Force re-evaluation
    const result2 = manager.update(0, 0, 0);
    expect(result2.availableBudget).toBe(60000);
  });

  it('clamps avatar count to maxAvatars', () => {
    manager.setActiveAvatars(10);
    expect(manager.getActiveAvatars()).toBe(3); // maxAvatars = 3
  });

  it('selectLOD accepts avatarCount override', () => {
    const data = makeSplatData(200000);
    manager.buildFromSplatData(data, { x: 0, y: 0, z: 0 });
    manager.setActiveAvatars(0);

    // Override with 1 avatar: 180K - 60K = 120K
    const result = manager.update(0, 0, 0, 1);
    expect(result.availableBudget).toBe(120000);
  });
});

describe('GaussianSplatLODManager: configuration', () => {
  it('updateConfig recomputes thresholds', () => {
    const manager = new GaussianSplatLODManager({ maxDepth: 4, maxDistance: 100 });
    const before = [...manager.getThresholds()];
    manager.updateConfig({ maxDistance: 500 });
    const after = manager.getThresholds();
    expect(after[after.length - 1]).toBeGreaterThan(before[before.length - 1]);
  });

  it('updateConfig forces re-evaluation on next update', () => {
    const manager = new GaussianSplatLODManager({ maxDepth: 4, movementThreshold: 100 });
    const data = makeDeterministicSplats();
    manager.buildFromSplatData(data, { x: 0, y: 0, z: 0 });

    manager.update(0, 0, 0); // First update
    manager.update(0, 0, 0); // Second, no change expected due to movement threshold
    manager.updateConfig({ maxDistance: 50 }); // Config change
    const result = manager.update(0, 0, 0); // Should force re-eval
    expect(result.changed).toBe(true);
  });
});

describe('GaussianSplatLODManager: clear and reset', () => {
  it('clear removes all built data', () => {
    const manager = new GaussianSplatLODManager();
    const data = makeSplatData(100);
    manager.buildFromSplatData(data);
    manager.clear();
    expect(manager.getIsBuilt()).toBe(false);
    expect(manager.getTotalGaussianCount()).toBe(0);
  });

  it('resetState preserves built data but forces re-evaluation', () => {
    const manager = new GaussianSplatLODManager({ movementThreshold: 0 });
    const data = makeDeterministicSplats();
    manager.buildFromSplatData(data, { x: 0, y: 0, z: 0 });
    manager.update(0, 0, 0);
    manager.resetState();
    expect(manager.getIsBuilt()).toBe(true);
    const result = manager.update(0, 0, 0);
    expect(result.changed).toBe(true);
  });

  it('returns no-op result when not built', () => {
    const manager = new GaussianSplatLODManager();
    const result = manager.update(0, 0, 0);
    expect(result.changed).toBe(false);
    expect(result.visibleCount).toBe(0);
  });
});

describe('GaussianSplatLODManager: edge cases', () => {
  it('handles zero-count splat data', () => {
    const manager = new GaussianSplatLODManager();
    manager.buildFromSplatData({
      positions: new Float32Array(0),
      scales: new Float32Array(0),
      count: 0,
    });
    expect(manager.getIsBuilt()).toBe(true);
    expect(manager.getTotalGaussianCount()).toBe(0);
    const result = manager.update(0, 0, 0);
    expect(result.visibleCount).toBe(0);
  });

  it('handles single splat', () => {
    const manager = new GaussianSplatLODManager({ maxDepth: 2, movementThreshold: 0 });
    manager.buildFromSplatData({
      positions: new Float32Array([10, 20, 30]),
      scales: new Float32Array([1, 1, 1]),
      count: 1,
    });
    const result = manager.update(10, 20, 30);
    expect(result.visibleCount).toBe(1);
  });

  it('VR conservative budget works correctly', () => {
    const manager = new GaussianSplatLODManager(VR_CONSERVATIVE_CONFIG);
    const config = manager.getConfig();
    expect(config.gaussianBudget).toBe(100000);
    expect(config.perAvatarReservation).toBe(30000);
    expect(config.maxAvatars).toBe(2);

    manager.setActiveAvatars(2);
    // 100K - 2*30K = 40K available
    const data = makeSplatData(80000);
    manager.buildFromSplatData(data, { x: 0, y: 0, z: 0 });
    const result = manager.update(0, 0, 0);
    expect(result.availableBudget).toBe(40000);
    expect(result.budgetCapped).toBe(true);
  });

  it('grouping with anchorsGroupSize > 1', () => {
    const manager = new GaussianSplatLODManager({
      maxDepth: 4,
      anchorsGroupSize: 5,
      movementThreshold: 0,
    });
    const data = makeDeterministicSplats();
    manager.buildFromSplatData(data, { x: 0, y: 0, z: 0 });

    const dist = manager.getLevelDistribution();
    // 25 splats per level / group size 5 = 5 anchors per level
    expect(dist[0].anchorCount).toBe(5);
    // But total Gaussians should still be 25 per level
    expect(dist[0].gaussianCount).toBe(25);
  });
});
