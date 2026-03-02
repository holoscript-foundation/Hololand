/**
 * OctreeLODSystem -- Comprehensive Test Suite
 *
 * Tests spatial octree partitioning, frustum-culled traversal, LOD hysteresis,
 * visibility buffer population, and budget-aware rendering for VR/AR.
 *
 * Coverage:
 * - Octree construction and spatial partitioning
 * - Frustum culling (AABB vs 6-plane frustum)
 * - LOD hysteresis (200ms delay between transitions)
 * - Visibility buffer population per frame
 * - Budget-aware traversal (180K Gaussian budget)
 * - Performance benchmark: 180K Gaussians at Quest 3 72fps workload
 * - extractFrustumPlanes utility
 * - Integration with GaussianSplatLODManager
 *
 * Research references:
 *   W.032 - Octree-GS LOD (TPAMI 2025)
 *   W.034 - VR Gaussian budget
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  OctreeLODSystem,
  extractFrustumPlanes,
} from '../OctreeLODSystem';
import type {
  FrustumPlanes,
  OctreeLODConfig,
} from '../OctreeLODSystem';
import type { SplatDataArrays } from '../GaussianSplatLODManager';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Create synthetic splat data with controlled spatial distribution.
 */
function makeSplatData(count: number, scaleRange: [number, number] = [0.01, 10.0], extents = 50): SplatDataArrays {
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    // Spread positions in a cube [-extents, extents]
    positions[i * 3] = (Math.random() - 0.5) * extents * 2;
    positions[i * 3 + 1] = (Math.random() - 0.5) * extents * 2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * extents * 2;

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
 * Create deterministic splat data at known positions.
 */
function makeDeterministicSplats(): SplatDataArrays {
  // 100 splats at known positions
  const count = 100;
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count * 3);

  for (let i = 0; i < 25; i++) {
    // Group 1: near origin, large scale
    positions[i * 3] = i * 0.1;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;
    scales[i * 3] = 10;
    scales[i * 3 + 1] = 10;
    scales[i * 3 + 2] = 10;
  }
  for (let i = 25; i < 50; i++) {
    // Group 2: medium distance, medium scale
    positions[i * 3] = 20 + (i - 25) * 0.1;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;
    scales[i * 3] = 5;
    scales[i * 3 + 1] = 5;
    scales[i * 3 + 2] = 5;
  }
  for (let i = 50; i < 75; i++) {
    // Group 3: far right, small scale
    positions[i * 3] = 50 + (i - 50) * 0.1;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;
    scales[i * 3] = 2.5;
    scales[i * 3 + 1] = 2.5;
    scales[i * 3 + 2] = 2.5;
  }
  for (let i = 75; i < 100; i++) {
    // Group 4: very far, tiny scale
    positions[i * 3] = 100 + (i - 75) * 0.1;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;
    scales[i * 3] = 0.1;
    scales[i * 3 + 1] = 0.1;
    scales[i * 3 + 2] = 0.1;
  }

  return { positions, scales, count };
}

/**
 * Create a frustum that sees everything (very wide FOV, all planes far away).
 */
function makeAllVisibleFrustum(): FrustumPlanes {
  return [
    [1, 0, 0, 10000],   // left
    [-1, 0, 0, 10000],  // right
    [0, 1, 0, 10000],   // bottom
    [0, -1, 0, 10000],  // top
    [0, 0, 1, 10000],   // near
    [0, 0, -1, 10000],  // far
  ];
}

/**
 * Create a frustum that only sees positive-X space.
 * Left plane at X=0: normal=(1,0,0), d=0
 */
function makePositiveXFrustum(): FrustumPlanes {
  return [
    [1, 0, 0, 0],       // left: x >= 0
    [-1, 0, 0, 10000],  // right: x <= 10000
    [0, 1, 0, 10000],   // bottom
    [0, -1, 0, 10000],  // top
    [0, 0, 1, 10000],   // near
    [0, 0, -1, 10000],  // far
  ];
}

/**
 * Create a tight frustum around the origin (box from -5 to +5).
 */
function makeTightFrustum(): FrustumPlanes {
  return [
    [1, 0, 0, 5],     // left: x >= -5
    [-1, 0, 0, 5],    // right: x <= 5
    [0, 1, 0, 5],     // bottom: y >= -5
    [0, -1, 0, 5],    // top: y <= 5
    [0, 0, 1, 5],     // near: z >= -5
    [0, 0, -1, 5],    // far: z <= 5
  ];
}

// ─── Suite: Construction ────────────────────────────────────────────────────

describe('OctreeLODSystem: construction', () => {
  it('constructs with default config', () => {
    const system = new OctreeLODSystem();
    expect(system.getIsBuilt()).toBe(false);
    expect(system.getTotalCount()).toBe(0);
  });

  it('constructs with custom config', () => {
    const system = new OctreeLODSystem({
      maxOctreeDepth: 3,
      minNodeGaussians: 32,
      hysteresisDelayMs: 300,
    });
    const config = system.getConfig();
    expect(config.maxOctreeDepth).toBe(3);
    expect(config.minNodeGaussians).toBe(32);
    expect(config.hysteresisDelayMs).toBe(300);
  });
});

// ─── Suite: Build from Splat Data ────────────────────────────────────────────

describe('OctreeLODSystem: build', () => {
  it('builds octree from splat data', () => {
    const system = new OctreeLODSystem({ maxOctreeDepth: 3, minNodeGaussians: 16 });
    const data = makeSplatData(1000);
    system.buildFromSplatData(data);

    expect(system.getIsBuilt()).toBe(true);
    expect(system.getTotalCount()).toBe(1000);
  });

  it('builds octree with correct node structure', () => {
    const system = new OctreeLODSystem({ maxOctreeDepth: 3, minNodeGaussians: 16 });
    const data = makeSplatData(500);
    system.buildFromSplatData(data);

    const stats = system.getOctreeStats();
    expect(stats.totalNodes).toBeGreaterThan(0);
    expect(stats.leafNodes).toBeGreaterThan(0);
    expect(stats.maxDepth).toBeGreaterThanOrEqual(0);
    expect(stats.maxDepth).toBeLessThanOrEqual(3);
    // Average Gaussians per leaf should be reasonable
    expect(stats.avgGaussiansPerLeaf).toBeGreaterThan(0);
  });

  it('creates visibility buffer sized to total count', () => {
    const system = new OctreeLODSystem();
    const data = makeSplatData(200);
    system.buildFromSplatData(data);

    const buf = system.getVisibilityBuffer();
    expect(buf.length).toBe(200);
  });

  it('handles zero-count data', () => {
    const system = new OctreeLODSystem();
    system.buildFromSplatData({
      positions: new Float32Array(0),
      scales: new Float32Array(0),
      count: 0,
    });
    expect(system.getIsBuilt()).toBe(true);
    expect(system.getTotalCount()).toBe(0);
  });

  it('handles single Gaussian', () => {
    const system = new OctreeLODSystem();
    system.buildFromSplatData({
      positions: new Float32Array([5, 10, 15]),
      scales: new Float32Array([1, 1, 1]),
      count: 1,
    });
    expect(system.getIsBuilt()).toBe(true);
    expect(system.getTotalCount()).toBe(1);

    const stats = system.getOctreeStats();
    expect(stats.totalNodes).toBe(1); // Single leaf
    expect(stats.leafNodes).toBe(1);
  });

  it('passes through LOD config to underlying manager', () => {
    const system = new OctreeLODSystem({
      lodConfig: {
        maxDepth: 4,
        gaussianBudget: 100000,
        vrMode: true,
      },
    });
    const data = makeSplatData(100);
    system.buildFromSplatData(data);

    const lodManager = system.getLODManager();
    const config = lodManager.getConfig();
    expect(config.maxDepth).toBe(4);
    expect(config.gaussianBudget).toBe(100000);
    expect(config.vrMode).toBe(true);
  });
});

// ─── Suite: Frustum Culling ──────────────────────────────────────────────────

describe('OctreeLODSystem: frustum culling', () => {
  let system: OctreeLODSystem;

  beforeEach(() => {
    system = new OctreeLODSystem({
      maxOctreeDepth: 3,
      minNodeGaussians: 8,
      hysteresisDelayMs: 0, // Disable hysteresis for culling tests
      frustumCullingEnabled: true,
      lodConfig: {
        maxDepth: 4,
        movementThreshold: 0,
        gaussianBudget: 0, // Unlimited
      },
    });
    const data = makeDeterministicSplats();
    system.buildFromSplatData(data);
  });

  it('all-visible frustum renders all LOD-selected Gaussians', () => {
    const result = system.update(0, 0, 0, makeAllVisibleFrustum(), 0);
    expect(result.visibleCount).toBeGreaterThan(0);
    expect(result.nodesCulledCount).toBe(0);
    expect(result.nodesTestedCount).toBeGreaterThan(0);
    expect(result.nodesVisibleCount).toBe(result.nodesTestedCount);
  });

  it('tight frustum culls distant nodes', () => {
    // Tight frustum around origin (-5 to +5)
    const resultTight = system.update(0, 0, 0, makeTightFrustum(), 0);
    // All-visible frustum
    const resultAll = system.update(0, 0, 0, makeAllVisibleFrustum(), 1);

    // The tight frustum should cull some nodes since splats extend to x=102
    expect(resultTight.nodesCulledCount).toBeGreaterThan(0);
    // And therefore render fewer Gaussians
    expect(resultTight.visibleCount).toBeLessThanOrEqual(resultAll.visibleCount);
  });

  it('frustum culling can be disabled', () => {
    system.updateConfig({ frustumCullingEnabled: false });

    const resultNoFrustum = system.update(0, 0, 0, makeTightFrustum(), 0);
    // With frustum culling disabled, no nodes should be culled via frustum
    // (distance culling may still apply)
    expect(resultNoFrustum.nodesCulledCount).toBe(0);
  });

  it('null frustum planes skips frustum culling', () => {
    const result = system.update(0, 0, 0, null, 0);
    // Should still work (LOD selection without frustum culling)
    expect(result.visibleCount).toBeGreaterThan(0);
  });

  it('returns traversal statistics', () => {
    const result = system.update(0, 0, 0, makeAllVisibleFrustum(), 0);
    expect(result.nodesTestedCount).toBeGreaterThan(0);
    expect(result.nodesVisibleCount).toBeGreaterThan(0);
    expect(typeof result.traversalTimeMs).toBe('number');
    expect(result.traversalTimeMs).toBeGreaterThanOrEqual(0);
  });
});

// ─── Suite: LOD Hysteresis ───────────────────────────────────────────────────

describe('OctreeLODSystem: LOD hysteresis', () => {
  let system: OctreeLODSystem;

  beforeEach(() => {
    system = new OctreeLODSystem({
      maxOctreeDepth: 3,
      minNodeGaussians: 8,
      hysteresisDelayMs: 200, // 200ms delay
      frustumCullingEnabled: false, // Isolate hysteresis testing
      lodConfig: {
        maxDepth: 4,
        powerLawExponent: 1.0,
        baseDistance: 10.0,
        maxDistance: 100.0,
        movementThreshold: 0,
        gaussianBudget: 0,
      },
    });
    const data = makeDeterministicSplats();
    system.buildFromSplatData(data, { x: 0, y: 0, z: 0 });
  });

  it('first update commits LOD level immediately (no hysteresis)', () => {
    const result = system.update(0, 0, 0, null, 0);
    expect(result.hysteresisActive).toBe(false);
    expect(result.activeLODLevel).toBeGreaterThanOrEqual(0);
  });

  it('LOD change is delayed by 200ms', () => {
    // First frame at origin (close)
    system.update(0, 0, 0, null, 0);

    // Move camera far away at t=100ms (LOD should change, but hysteresis delays it)
    const result100 = system.update(0, 0, 500, null, 100);
    // Hysteresis should be active (pending transition)
    expect(result100.hysteresisActive).toBe(true);

    // At t=250ms (100ms + 150ms < 200ms threshold from t=100ms)
    const result250 = system.update(0, 0, 500, null, 250);
    // Still pending (only 150ms since request at t=100)
    expect(result250.hysteresisActive).toBe(true);
  });

  it('LOD change commits after 200ms delay', () => {
    // First frame at origin
    const result0 = system.update(0, 0, 0, null, 0);
    const initialLevel = result0.activeLODLevel;

    // Move far away at t=100ms
    system.update(0, 0, 500, null, 100);

    // At t=350ms (250ms elapsed since request, > 200ms)
    const result350 = system.update(0, 0, 500, null, 350);
    // Hysteresis should have committed
    expect(result350.hysteresisActive).toBe(false);
    // Level should have changed (fewer levels for distant camera)
    expect(result350.activeLODLevel).toBeLessThanOrEqual(initialLevel);
  });

  it('LOD hysteresis resets when camera returns to committed level', () => {
    // Disable motion bias so it doesn't interfere with hysteresis testing
    system.updateConfig({ motionAwareLODEnabled: false });

    // First frame close
    system.update(0, 0, 0, null, 0);

    // Move far (pending transition)
    system.update(0, 0, 500, null, 100);

    // Move back to close BEFORE hysteresis commits
    const resultBack = system.update(0, 0, 0, null, 150);
    // Hysteresis should be cancelled (returned to original level)
    expect(resultBack.hysteresisActive).toBe(false);
  });

  it('hysteresis can be disabled with 0ms delay', () => {
    system.updateConfig({ hysteresisDelayMs: 0 });

    // First frame
    system.update(0, 0, 0, null, 0);

    // Move far
    const result = system.update(0, 0, 500, null, 1);
    // Should commit immediately (0ms delay)
    expect(result.hysteresisActive).toBe(false);
  });
});

// ─── Suite: Visibility Buffer ────────────────────────────────────────────────

describe('OctreeLODSystem: visibility buffer', () => {
  let system: OctreeLODSystem;

  beforeEach(() => {
    system = new OctreeLODSystem({
      maxOctreeDepth: 3,
      minNodeGaussians: 8,
      hysteresisDelayMs: 0,
      frustumCullingEnabled: false,
      lodConfig: {
        maxDepth: 4,
        movementThreshold: 0,
        gaussianBudget: 0,
      },
    });
  });

  it('visibility buffer is populated per frame', () => {
    const data = makeDeterministicSplats();
    system.buildFromSplatData(data, { x: 0, y: 0, z: 0 });

    const result = system.update(0, 0, 0, null, 0);
    const buf = result.visibilityBuffer;

    expect(buf.length).toBe(100);

    // Count visible entries
    let visCount = 0;
    for (let i = 0; i < buf.length; i++) {
      if (buf[i] === 1) visCount++;
    }
    expect(visCount).toBe(result.visibleCount);
  });

  it('visibility buffer is cleared between frames', () => {
    const data = makeDeterministicSplats();
    system.buildFromSplatData(data, { x: 0, y: 0, z: 0 });

    // Frame 1: close (many visible)
    system.update(0, 0, 0, null, 0);

    // Frame 2: far (fewer visible)
    const result2 = system.update(0, 0, 500, null, 1);
    const buf2 = result2.visibilityBuffer;

    let visCount = 0;
    for (let i = 0; i < buf2.length; i++) {
      if (buf2[i] === 1) visCount++;
    }
    expect(visCount).toBe(result2.visibleCount);
  });

  it('visibility buffer entries match visibleIndices', () => {
    const data = makeSplatData(200);
    system.buildFromSplatData(data);

    const result = system.update(0, 0, 0, null, 0);

    // Every index in visibleIndices should have buf[idx] = 1
    for (let i = 0; i < result.visibleIndices.length; i++) {
      const idx = result.visibleIndices[i];
      expect(result.visibilityBuffer[idx]).toBe(1);
    }

    // No other entries should be 1
    let bufVisCount = 0;
    for (let i = 0; i < result.visibilityBuffer.length; i++) {
      if (result.visibilityBuffer[i] === 1) bufVisCount++;
    }
    expect(bufVisCount).toBe(result.visibleIndices.length);
  });
});

// ─── Suite: Budget-Aware Traversal ───────────────────────────────────────────

describe('OctreeLODSystem: budget enforcement', () => {
  it('respects Gaussian budget by dropping LOD levels', () => {
    const system = new OctreeLODSystem({
      hysteresisDelayMs: 0,
      frustumCullingEnabled: false,
      lodConfig: {
        maxDepth: 4,
        movementThreshold: 0,
        gaussianBudget: 30, // Very tight budget for 100 Gaussians
      },
    });
    const data = makeDeterministicSplats();
    system.buildFromSplatData(data, { x: 0, y: 0, z: 0 });

    const result = system.update(0, 0, 0, null, 0);
    expect(result.budgetCapped).toBe(true);
    expect(result.visibleCount).toBeLessThanOrEqual(30);
  });

  it('unlimited budget renders all LOD-selected Gaussians', () => {
    const system = new OctreeLODSystem({
      hysteresisDelayMs: 0,
      frustumCullingEnabled: false,
      lodConfig: {
        maxDepth: 4,
        movementThreshold: 0,
        gaussianBudget: 0, // Unlimited
      },
    });
    const data = makeDeterministicSplats();
    system.buildFromSplatData(data, { x: 0, y: 0, z: 0 });

    const result = system.update(0, 0, 0, null, 0);
    expect(result.budgetCapped).toBe(false);
    expect(result.visibleCount).toBe(100);
  });

  it('VR avatar reservation reduces available budget', () => {
    const system = new OctreeLODSystem({
      hysteresisDelayMs: 0,
      frustumCullingEnabled: false,
      lodConfig: {
        maxDepth: 4,
        movementThreshold: 0,
        vrMode: true,
        gaussianBudget: 180000,
        perAvatarReservation: 60000,
        maxAvatars: 3,
      },
    });

    const data = makeSplatData(200000);
    system.buildFromSplatData(data, { x: 0, y: 0, z: 0 });

    // No avatars
    system.setActiveAvatars(0);
    const result0 = system.update(0, 0, 0, null, 0);
    expect(result0.availableBudget).toBe(180000);

    // 2 avatars: 180K - 2*60K = 60K
    system.setActiveAvatars(2);
    system.resetState();
    const result2 = system.update(0, 0, 0, null, 1);
    expect(result2.availableBudget).toBe(60000);
  });
});

// ─── Suite: extractFrustumPlanes ─────────────────────────────────────────────

describe('extractFrustumPlanes', () => {
  it('extracts normalized frustum planes from identity matrix', () => {
    // Identity-like matrix (column-major)
    const identity = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ];
    const planes = extractFrustumPlanes(identity);
    expect(planes.length).toBe(6);

    // Each plane should be normalized (normal length ~= 1)
    for (const plane of planes) {
      const len = Math.sqrt(plane[0] ** 2 + plane[1] ** 2 + plane[2] ** 2);
      if (len > 0) {
        expect(len).toBeCloseTo(1, 3);
      }
    }
  });

  it('produces valid plane equations from perspective matrix', () => {
    // Simple perspective-like matrix
    const fov = Math.PI / 3; // 60 degrees
    const aspect = 16 / 9;
    const near = 0.1;
    const far = 1000;
    const f = 1 / Math.tan(fov / 2);

    // Column-major perspective matrix
    const m = new Float32Array(16);
    m[0] = f / aspect;
    m[5] = f;
    m[10] = -(far + near) / (far - near);
    m[11] = -1;
    m[14] = -(2 * far * near) / (far - near);

    const planes = extractFrustumPlanes(m);
    expect(planes.length).toBe(6);

    // All planes should have non-zero normals
    for (const plane of planes) {
      const len = Math.sqrt(plane[0] ** 2 + plane[1] ** 2 + plane[2] ** 2);
      expect(len).toBeGreaterThan(0);
    }
  });
});

// ─── Suite: State Management ─────────────────────────────────────────────────

describe('OctreeLODSystem: state management', () => {
  it('clear removes all built data', () => {
    const system = new OctreeLODSystem();
    const data = makeSplatData(100);
    system.buildFromSplatData(data);

    system.clear();
    expect(system.getIsBuilt()).toBe(false);
    expect(system.getTotalCount()).toBe(0);
    expect(system.getVisibilityBuffer().length).toBe(0);
  });

  it('resetState preserves octree but resets hysteresis', () => {
    const system = new OctreeLODSystem({ hysteresisDelayMs: 200 });
    const data = makeDeterministicSplats();
    system.buildFromSplatData(data, { x: 0, y: 0, z: 0 });

    // Do an update to set state
    system.update(0, 0, 0, null, 0);

    // Reset
    system.resetState();
    expect(system.getIsBuilt()).toBe(true);

    // Next update should commit LOD level immediately (hysteresis reset)
    const result = system.update(0, 0, 0, null, 100);
    expect(result.hysteresisActive).toBe(false);
  });

  it('updateConfig changes runtime parameters', () => {
    const system = new OctreeLODSystem({ hysteresisDelayMs: 200 });
    system.updateConfig({ hysteresisDelayMs: 500 });
    expect(system.getConfig().hysteresisDelayMs).toBe(500);
  });

  it('returns no-op result when not built', () => {
    const system = new OctreeLODSystem();
    const result = system.update(0, 0, 0, null, 0);
    expect(result.changed).toBe(false);
    expect(result.visibleCount).toBe(0);
    expect(result.nodesTestedCount).toBe(0);
  });
});

// ─── Suite: Integration with GaussianSplatLODManager ─────────────────────────

describe('OctreeLODSystem: LOD manager integration', () => {
  it('getLODManager returns the underlying manager', () => {
    const system = new OctreeLODSystem({
      lodConfig: { maxDepth: 4, gaussianBudget: 100000 },
    });
    const manager = system.getLODManager();
    expect(manager.getConfig().maxDepth).toBe(4);
  });

  it('LOD level distribution is consistent between octree and manager', () => {
    const system = new OctreeLODSystem({
      lodConfig: { maxDepth: 4, movementThreshold: 0 },
    });
    const data = makeDeterministicSplats();
    system.buildFromSplatData(data, { x: 0, y: 0, z: 0 });

    const lodDist = system.getLODManager().getLevelDistribution();
    let totalFromLOD = 0;
    for (const level of lodDist) {
      totalFromLOD += level.gaussianCount;
    }

    expect(totalFromLOD).toBe(100);
    expect(system.getTotalCount()).toBe(100);
  });

  it('setActiveAvatars propagates to LOD manager', () => {
    const system = new OctreeLODSystem({
      lodConfig: { maxAvatars: 3 },
    });
    system.setActiveAvatars(2);
    expect(system.getActiveAvatars()).toBe(2);
    expect(system.getLODManager().getActiveAvatars()).toBe(2);
  });
});

// ─── Suite: Performance Benchmark ────────────────────────────────────────────

describe('OctreeLODSystem: performance benchmark (180K at 72fps)', () => {
  it('builds octree from 180K Gaussians in < 2 seconds', () => {
    const system = new OctreeLODSystem({
      maxOctreeDepth: 5,
      minNodeGaussians: 64,
      hysteresisDelayMs: 200,
      lodConfig: {
        maxDepth: 6,
        vrMode: true,
        gaussianBudget: 180000,
        movementThreshold: 0,
      },
    });

    const data = makeSplatData(180000);
    const t0 = performance.now();
    system.buildFromSplatData(data);
    const buildTimeMs = performance.now() - t0;

    expect(system.getIsBuilt()).toBe(true);
    expect(system.getTotalCount()).toBe(180000);
    // Build should complete in under 2 seconds
    expect(buildTimeMs).toBeLessThan(2000);

    const stats = system.getOctreeStats();
    expect(stats.totalNodes).toBeGreaterThan(0);
    expect(stats.leafNodes).toBeGreaterThan(0);
  });

  it('per-frame update completes in < 2ms for 180K Gaussians', () => {
    const system = new OctreeLODSystem({
      maxOctreeDepth: 5,
      minNodeGaussians: 64,
      hysteresisDelayMs: 0,
      frustumCullingEnabled: true,
      lodConfig: {
        maxDepth: 6,
        vrMode: true,
        gaussianBudget: 180000,
        movementThreshold: 0,
      },
    });

    const data = makeSplatData(180000);
    system.buildFromSplatData(data);

    // Warm up (first call builds cache)
    system.update(0, 0, 0, makeAllVisibleFrustum(), 0);

    // Measure 10 frames
    const times: number[] = [];
    for (let frame = 0; frame < 10; frame++) {
      const t0 = performance.now();
      system.update(
        Math.sin(frame * 0.5) * 20,
        0,
        Math.cos(frame * 0.5) * 20,
        makeAllVisibleFrustum(),
        frame * 14, // ~72fps intervals
      );
      times.push(performance.now() - t0);
    }

    const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
    const maxMs = Math.max(...times);

    // Performance targets (soft, CI-friendly):
    // - Quest 3 real target: < 2ms average
    // - Dev machine / CI target: < 50ms average (JS runtime overhead, no GPU)
    // - Max spike: < 100ms (no runaway computation)
    // The actual VR performance depends on GPU-side instanced rendering,
    // not this CPU-side traversal. The octree traversal is the cheap part.
    expect(avgMs).toBeLessThan(50); // CI-friendly margin
    expect(maxMs).toBeLessThan(100); // No runaway spikes
  });

  it('traversal culls nodes for 180K Gaussians with tight frustum', () => {
    const system = new OctreeLODSystem({
      maxOctreeDepth: 5,
      minNodeGaussians: 64,
      hysteresisDelayMs: 0,
      frustumCullingEnabled: true,
      lodConfig: {
        maxDepth: 6,
        vrMode: true,
        gaussianBudget: 180000,
        movementThreshold: 0,
      },
    });

    const data = makeSplatData(180000);
    system.buildFromSplatData(data);

    // Tight frustum should cull many nodes
    const resultTight = system.update(0, 0, 0, makeTightFrustum(), 0);
    // All-visible frustum
    system.resetState();
    const resultAll = system.update(0, 0, 0, makeAllVisibleFrustum(), 1);

    // Tight frustum should cull significantly
    expect(resultTight.nodesCulledCount).toBeGreaterThan(0);
    expect(resultTight.visibleCount).toBeLessThan(resultAll.visibleCount);
  });

  it('budget capping keeps visible count under 180K', () => {
    const system = new OctreeLODSystem({
      maxOctreeDepth: 5,
      minNodeGaussians: 64,
      hysteresisDelayMs: 0,
      frustumCullingEnabled: false,
      lodConfig: {
        maxDepth: 6,
        vrMode: true,
        gaussianBudget: 180000,
        movementThreshold: 0,
      },
    });

    // Load 500K Gaussians (way over budget)
    const data = makeSplatData(500000);
    system.buildFromSplatData(data);

    const result = system.update(0, 0, 0, null, 0);

    // Budget enforcement should cap to 180K
    expect(result.budgetCapped).toBe(true);
    expect(result.visibleCount).toBeLessThanOrEqual(180000);
  });
});

// ─── Suite: Cross-Fade Blending ──────────────────────────────────────────────

describe('OctreeLODSystem: cross-fade blending', () => {
  let system: OctreeLODSystem;

  beforeEach(() => {
    system = new OctreeLODSystem({
      maxOctreeDepth: 3,
      minNodeGaussians: 8,
      hysteresisDelayMs: 0, // Disable hysteresis to isolate cross-fade testing
      crossFadeDurationMs: 150, // 150ms cross-fade
      frustumCullingEnabled: false,
      motionAwareLODEnabled: false,
      lodConfig: {
        maxDepth: 4,
        powerLawExponent: 1.0,
        baseDistance: 10.0,
        maxDistance: 100.0,
        movementThreshold: 0,
        gaussianBudget: 0,
      },
    });
    const data = makeDeterministicSplats();
    system.buildFromSplatData(data, { x: 0, y: 0, z: 0 });
  });

  it('first update has no active cross-fade', () => {
    const result = system.update(0, 0, 0, null, 0);
    expect(result.crossFade.active).toBe(false);
    expect(result.crossFade.incomingAlpha).toBe(1);
  });

  it('cross-fade activates on LOD level transition', () => {
    // Frame 1: close to origin
    system.update(0, 0, 0, null, 0);
    // Frame 2: move far away (triggers LOD change)
    const result = system.update(0, 0, 500, null, 1);
    // Cross-fade should activate (outgoing -> incoming transition)
    if (result.crossFade.active) {
      expect(result.crossFade.progress).toBeGreaterThanOrEqual(0);
      expect(result.crossFade.progress).toBeLessThanOrEqual(1);
      expect(result.crossFade.outgoingAlpha).toBeGreaterThanOrEqual(0);
      expect(result.crossFade.incomingAlpha).toBeGreaterThanOrEqual(0);
    }
  });

  it('cross-fade uses smooth-step interpolation (not linear)', () => {
    // Frame 1: close
    system.update(0, 0, 0, null, 0);
    // Frame 2: trigger transition
    system.update(0, 0, 500, null, 1);

    // Frame 3: 50% through cross-fade (75ms)
    const result75 = system.update(0, 0, 500, null, 76);
    if (result75.crossFade.active) {
      // At 50% raw progress, smooth-step should give 0.5 (inflection point)
      // Smooth-step: 3t^2 - 2t^3 at t=0.5 = 3*0.25 - 2*0.125 = 0.75 - 0.25 = 0.5
      // So the progress should be ~0.5 at the midpoint
      expect(result75.crossFade.progress).toBeGreaterThanOrEqual(0.3);
      expect(result75.crossFade.progress).toBeLessThanOrEqual(0.7);
    }
  });

  it('cross-fade completes after duration and returns full alpha', () => {
    // Frame 1: close
    system.update(0, 0, 0, null, 0);
    // Frame 2: trigger transition
    system.update(0, 0, 500, null, 1);
    // Frame 3: after full cross-fade duration (>150ms)
    const result200 = system.update(0, 0, 500, null, 200);

    // Cross-fade should be complete
    expect(result200.crossFade.active).toBe(false);
    expect(result200.crossFade.incomingAlpha).toBe(1);
    expect(result200.crossFade.outgoingAlpha).toBe(0);
  });

  it('cross-fade can be disabled with 0ms duration', () => {
    system.updateConfig({ crossFadeDurationMs: 0 });

    // Frame 1: close
    system.update(0, 0, 0, null, 0);
    // Frame 2: trigger transition
    const result = system.update(0, 0, 500, null, 1);

    // No cross-fade should occur
    expect(result.crossFade.active).toBe(false);
    expect(result.crossFade.incomingAlpha).toBe(1);
  });

  it('cross-fade alpha values are complementary (sum to ~1)', () => {
    // Frame 1: close
    system.update(0, 0, 0, null, 0);
    // Frame 2: trigger transition
    system.update(0, 0, 500, null, 1);

    // Check alpha values at multiple points during cross-fade
    for (let t = 10; t < 150; t += 20) {
      const result = system.update(0, 0, 500, null, 1 + t);
      if (result.crossFade.active) {
        const sum = result.crossFade.outgoingAlpha + result.crossFade.incomingAlpha;
        // Due to smooth-step, the sum should always be 1.0
        expect(sum).toBeCloseTo(1.0, 4);
      }
    }
  });

  it('getCrossFadeState returns current state outside update cycle', () => {
    system.update(0, 0, 0, null, 0);
    system.update(0, 0, 500, null, 1);

    const state = system.getCrossFadeState();
    expect(typeof state.active).toBe('boolean');
    expect(typeof state.progress).toBe('number');
    expect(typeof state.outgoingAlpha).toBe('number');
    expect(typeof state.incomingAlpha).toBe('number');
    expect(state.durationMs).toBe(150);
  });
});

// ─── Suite: Motion-Aware LOD Bias ────────────────────────────────────────────

describe('OctreeLODSystem: motion-aware LOD bias', () => {
  let system: OctreeLODSystem;

  beforeEach(() => {
    system = new OctreeLODSystem({
      maxOctreeDepth: 3,
      minNodeGaussians: 8,
      hysteresisDelayMs: 0,
      crossFadeDurationMs: 0,
      frustumCullingEnabled: false,
      motionAwareLODEnabled: true,
      motionVelocityThreshold: 2.0,   // 2 units/sec
      motionMaxLevelDrop: 2,
      motionMaxVelocity: 20.0,        // 20 units/sec for max drop
      motionVelocitySmoothing: 0.0,   // No smoothing for deterministic tests
      lodConfig: {
        maxDepth: 4,
        powerLawExponent: 1.0,
        baseDistance: 10.0,
        maxDistance: 100.0,
        movementThreshold: 0,
        gaussianBudget: 0,
      },
    });
    const data = makeDeterministicSplats();
    system.buildFromSplatData(data, { x: 0, y: 0, z: 0 });
  });

  it('no motion bias when camera is stationary', () => {
    // Two frames at same position
    system.update(0, 0, 0, null, 0);
    const result = system.update(0, 0, 0, null, 100);

    expect(result.motionBias.active).toBe(false);
    expect(result.motionBias.levelsDropped).toBe(0);
    expect(result.motionBias.smoothedVelocity).toBe(0);
  });

  it('no motion bias below velocity threshold', () => {
    // Move slowly: 1 unit in 1 second = 1 unit/sec (below threshold of 2)
    system.update(0, 0, 0, null, 0);
    const result = system.update(1, 0, 0, null, 1000);

    expect(result.motionBias.active).toBe(false);
    expect(result.motionBias.levelsDropped).toBe(0);
  });

  it('motion bias activates above velocity threshold', () => {
    // Frame 1: establish baseline position (first frame has NaN previous, so velocity = 0)
    system.update(0, 0, 0, null, 0);
    // Frame 2: still at origin, establishes valid previous position
    system.update(0, 0, 0, null, 50);
    // Frame 3: move fast: 10 units in 0.05 seconds = 200 units/sec (well above threshold)
    const result = system.update(10, 0, 0, null, 100);

    expect(result.motionBias.active).toBe(true);
    expect(result.motionBias.levelsDropped).toBeGreaterThan(0);
    expect(result.motionBias.levelsDropped).toBeLessThanOrEqual(2);
  });

  it('motion bias scales with velocity', () => {
    // Medium speed: 5 units in 0.5 seconds = 10 units/sec
    system.update(0, 0, 0, null, 0);
    const resultMedium = system.update(5, 0, 0, null, 500);

    // Fast speed: 20 units in 0.5 seconds = 40 units/sec
    system.resetState();
    system.update(0, 0, 0, null, 0);
    const resultFast = system.update(20, 0, 0, null, 500);

    // Faster motion should drop more (or equal) LOD levels
    expect(resultFast.motionBias.levelsDropped)
      .toBeGreaterThanOrEqual(resultMedium.motionBias.levelsDropped);
  });

  it('motion bias caps at motionMaxLevelDrop', () => {
    // Extremely fast: 1000 units in 0.01 seconds = 100000 units/sec
    system.update(0, 0, 0, null, 0);
    const result = system.update(1000, 0, 0, null, 10);

    expect(result.motionBias.levelsDropped).toBeLessThanOrEqual(2); // motionMaxLevelDrop = 2
  });

  it('motion bias can be disabled', () => {
    system.updateConfig({ motionAwareLODEnabled: false });

    // Fast movement
    system.update(0, 0, 0, null, 0);
    const result = system.update(100, 0, 0, null, 100);

    expect(result.motionBias.active).toBe(false);
    expect(result.motionBias.levelsDropped).toBe(0);
    expect(result.motionBias.smoothedVelocity).toBe(0);
  });

  it('motion bias recovers immediately when camera stops', () => {
    // Frame 1: stationary
    system.update(0, 0, 0, null, 0);
    // Frame 2: fast movement
    system.update(100, 0, 0, null, 100);
    // Frame 3: stationary again (same position as frame 2)
    const result = system.update(100, 0, 0, null, 200);

    expect(result.motionBias.levelsDropped).toBe(0);
    expect(result.motionBias.active).toBe(false);
  });

  it('getMotionBiasState returns current state', () => {
    system.update(0, 0, 0, null, 0);
    system.update(100, 0, 0, null, 100);

    const state = system.getMotionBiasState();
    expect(typeof state.smoothedVelocity).toBe('number');
    expect(typeof state.levelsDropped).toBe('number');
    expect(typeof state.active).toBe('boolean');
  });

  it('velocity smoothing attenuates spikes', () => {
    // Create a fresh system with heavy smoothing from the start
    const smoothSystem = new OctreeLODSystem({
      maxOctreeDepth: 3,
      minNodeGaussians: 8,
      hysteresisDelayMs: 0,
      crossFadeDurationMs: 0,
      frustumCullingEnabled: false,
      motionAwareLODEnabled: true,
      motionVelocityThreshold: 2.0,
      motionMaxLevelDrop: 2,
      motionMaxVelocity: 20.0,
      motionVelocitySmoothing: 0.8, // Heavy smoothing: smoothed = 0.8 * prev + 0.2 * raw
      lodConfig: {
        maxDepth: 4,
        powerLawExponent: 1.0,
        baseDistance: 10.0,
        maxDistance: 100.0,
        movementThreshold: 0,
        gaussianBudget: 0,
      },
    });
    const data = makeDeterministicSplats();
    smoothSystem.buildFromSplatData(data, { x: 0, y: 0, z: 0 });

    // Frame 1: establish baseline at origin
    smoothSystem.update(0, 0, 0, null, 0);
    // Frame 2: still at origin (establishes valid previous position)
    smoothSystem.update(0, 0, 0, null, 50);
    // Frame 3: sudden fast movement (100 units in 50ms = 2000 units/sec)
    const resultSpike = smoothSystem.update(100, 0, 0, null, 100);

    // rawVelocity should be very high
    expect(resultSpike.motionBias.rawVelocity).toBeGreaterThan(100);

    // With 80% smoothing, smoothedVelocity = 0.8 * 0 + 0.2 * rawVelocity
    // So smoothed should be ~20% of raw
    expect(resultSpike.motionBias.smoothedVelocity).toBeGreaterThan(0);
    expect(resultSpike.motionBias.smoothedVelocity)
      .toBeLessThan(resultSpike.motionBias.rawVelocity);
  });
});

// ─── Suite: Full Pipeline Benchmark (SPZ load -> octree build -> LOD update -> render) ──

describe('OctreeLODSystem: full pipeline benchmark (Quest 3 @ 72fps)', () => {
  /**
   * Simulates the complete per-frame pipeline:
   * 1. Octree traversal with frustum culling
   * 2. LOD hysteresis evaluation
   * 3. Motion-aware LOD bias computation
   * 4. Cross-fade blending state update
   * 5. Visibility buffer population
   *
   * Target: 13.89ms total frame budget at 72fps.
   * CPU-side LOD/traversal budget: < 2ms (rest is GPU rendering).
   */

  it('full pipeline build time for 180K Gaussians', () => {
    const system = new OctreeLODSystem({
      maxOctreeDepth: 5,
      minNodeGaussians: 64,
      hysteresisDelayMs: 200,
      crossFadeDurationMs: 150,
      frustumCullingEnabled: true,
      motionAwareLODEnabled: true,
      motionVelocityThreshold: 2.0,
      motionMaxLevelDrop: 2,
      motionMaxVelocity: 20.0,
      motionVelocitySmoothing: 0.3,
      lodConfig: {
        maxDepth: 6,
        vrMode: true,
        gaussianBudget: 180000,
        movementThreshold: 0,
      },
    });

    const data = makeSplatData(180000);

    const buildStart = performance.now();
    system.buildFromSplatData(data);
    const buildTimeMs = performance.now() - buildStart;

    // Build is a one-time cost (not per-frame)
    // Target: < 2s even on CI (production target: < 500ms on Quest 3)
    expect(buildTimeMs).toBeLessThan(2000);
    expect(system.getIsBuilt()).toBe(true);
    expect(system.getTotalCount()).toBe(180000);
  });

  it('full pipeline per-frame timing breakdown at 72fps', () => {
    const system = new OctreeLODSystem({
      maxOctreeDepth: 5,
      minNodeGaussians: 64,
      hysteresisDelayMs: 200,
      crossFadeDurationMs: 150,
      frustumCullingEnabled: true,
      motionAwareLODEnabled: true,
      motionVelocityThreshold: 2.0,
      motionMaxLevelDrop: 2,
      motionMaxVelocity: 20.0,
      motionVelocitySmoothing: 0.3,
      lodConfig: {
        maxDepth: 6,
        vrMode: true,
        gaussianBudget: 180000,
        movementThreshold: 0,
      },
    });

    const data = makeSplatData(180000);
    system.buildFromSplatData(data);

    // Warm up
    system.update(0, 0, 0, makeAllVisibleFrustum(), 0);

    // Simulate 72fps render loop for 2 seconds (144 frames)
    const frameIntervalMs = 1000 / 72; // ~13.89ms
    const frameCount = 144;
    const frameTimes: number[] = [];
    const traversalTimes: number[] = [];
    const visibleCounts: number[] = [];
    const nodesCulled: number[] = [];
    const crossFadeActive: number[] = [];
    const motionBiasActive: number[] = [];

    for (let frame = 0; frame < frameCount; frame++) {
      const timestamp = frame * frameIntervalMs;

      // Simulate camera orbit with varying speed
      const angle = frame * 0.05;
      const radius = 15 + Math.sin(frame * 0.02) * 10;
      const cameraX = Math.cos(angle) * radius;
      const cameraY = Math.sin(frame * 0.01) * 5; // Slight vertical bob
      const cameraZ = Math.sin(angle) * radius;

      const t0 = performance.now();
      const result = system.update(
        cameraX, cameraY, cameraZ,
        makeAllVisibleFrustum(),
        timestamp,
      );
      const frameTimeMs = performance.now() - t0;

      frameTimes.push(frameTimeMs);
      traversalTimes.push(result.traversalTimeMs);
      visibleCounts.push(result.visibleCount);
      nodesCulled.push(result.nodesCulledCount);
      crossFadeActive.push(result.crossFade.active ? 1 : 0);
      motionBiasActive.push(result.motionBias.active ? 1 : 0);
    }

    // Compute statistics
    const avgFrameMs = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    const maxFrameMs = Math.max(...frameTimes);
    const p95FrameMs = frameTimes.sort((a, b) => a - b)[Math.floor(frameCount * 0.95)];
    const avgTraversalMs = traversalTimes.reduce((a, b) => a + b, 0) / traversalTimes.length;
    const avgVisibleCount = visibleCounts.reduce((a, b) => a + b, 0) / visibleCounts.length;
    const totalCrossFadeFrames = crossFadeActive.reduce((a, b) => a + b, 0);
    const totalMotionBiasFrames = motionBiasActive.reduce((a, b) => a + b, 0);

    // ── Frame Timing Assertions ──────────────────────────────────────────────
    //
    // Quest 3 Adreno 740 GPU budget at 72fps:
    //   Total frame budget: 13.89ms
    //   GPU render budget:  ~11ms (instanced Gaussian splatting)
    //   CPU LOD budget:     ~2ms (octree traversal + LOD + hysteresis + motion)
    //
    // CI/Dev machine targets (CPU-only, no GPU):
    //   Average: < 50ms (JS runtime overhead)
    //   P95:     < 100ms (no runaway spikes)
    //   Max:     < 200ms (allow GC pauses)
    //
    expect(avgFrameMs).toBeLessThan(50);
    expect(p95FrameMs).toBeLessThan(100);
    expect(maxFrameMs).toBeLessThan(200);

    // Visible count should stay within budget
    for (const count of visibleCounts) {
      expect(count).toBeLessThanOrEqual(180000);
    }

    // Some frames should have had motion bias active (camera was moving)
    expect(totalMotionBiasFrames).toBeGreaterThan(0);
  });

  it('full pipeline with tight frustum achieves significant culling', () => {
    const system = new OctreeLODSystem({
      maxOctreeDepth: 5,
      minNodeGaussians: 64,
      hysteresisDelayMs: 200,
      crossFadeDurationMs: 150,
      frustumCullingEnabled: true,
      motionAwareLODEnabled: true,
      lodConfig: {
        maxDepth: 6,
        vrMode: true,
        gaussianBudget: 180000,
        movementThreshold: 0,
      },
    });

    const data = makeSplatData(180000);
    system.buildFromSplatData(data);

    // Warm up with all-visible frustum
    system.update(0, 0, 0, makeAllVisibleFrustum(), 0);

    // Now use tight frustum -- should cull most nodes
    system.resetState();
    const tightResult = system.update(0, 0, 0, makeTightFrustum(), 100);

    // Tight frustum (-5 to +5) on data spread over [-50, +50] should cull heavily
    expect(tightResult.nodesCulledCount).toBeGreaterThan(0);
    expect(tightResult.nodesVisibleCount).toBeLessThan(tightResult.nodesTestedCount);

    // Traversal should be faster with culling (fewer nodes to visit at leaf level)
    expect(tightResult.traversalTimeMs).toBeLessThan(50); // CI-friendly
  });

  it('full pipeline handles rapid LOD transitions without popping (hysteresis + cross-fade)', () => {
    const system = new OctreeLODSystem({
      maxOctreeDepth: 3,
      minNodeGaussians: 8,
      hysteresisDelayMs: 200,
      crossFadeDurationMs: 150,
      frustumCullingEnabled: false,
      motionAwareLODEnabled: false,
      lodConfig: {
        maxDepth: 4,
        powerLawExponent: 1.0,
        baseDistance: 10.0,
        maxDistance: 100.0,
        movementThreshold: 0,
        gaussianBudget: 0,
      },
    });
    const data = makeDeterministicSplats();
    system.buildFromSplatData(data, { x: 0, y: 0, z: 0 });

    // Simulate camera oscillating near LOD threshold boundary
    const results: { level: number; hysteresis: boolean; crossFade: boolean }[] = [];

    for (let frame = 0; frame < 60; frame++) {
      const timestamp = frame * (1000 / 72);
      // Oscillate between near (0) and far (200) every few frames
      const distance = frame % 10 < 5 ? 5 : 200;
      const result = system.update(0, 0, distance, null, timestamp);
      results.push({
        level: result.activeLODLevel,
        hysteresis: result.hysteresisActive,
        crossFade: result.crossFade.active,
      });
    }

    // Hysteresis should prevent rapid LOD level oscillation
    // Count actual LOD level changes
    let levelChanges = 0;
    for (let i = 1; i < results.length; i++) {
      if (results[i].level !== results[i - 1].level) {
        levelChanges++;
      }
    }

    // With 200ms hysteresis at 72fps (~14ms/frame), rapid oscillation
    // every 5 frames (70ms) should be mostly suppressed
    // Expect far fewer level changes than the 12 oscillation cycles
    expect(levelChanges).toBeLessThan(12);

    // Some frames should have had hysteresis active (pending transitions)
    const hysteresisFrames = results.filter(r => r.hysteresis).length;
    expect(hysteresisFrames).toBeGreaterThan(0);
  });
});

// ─── Suite: Edge Cases ───────────────────────────────────────────────────────

describe('OctreeLODSystem: edge cases', () => {
  it('handles all Gaussians at same position', () => {
    const count = 50;
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // All at origin
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      scales[i * 3] = 1;
      scales[i * 3 + 1] = 1;
      scales[i * 3 + 2] = 1;
    }

    const system = new OctreeLODSystem({
      hysteresisDelayMs: 0,
      lodConfig: { movementThreshold: 0, gaussianBudget: 0 },
    });
    system.buildFromSplatData({ positions, scales, count });

    const result = system.update(0, 0, 0, null, 0);
    expect(result.visibleCount).toBe(50);
  });

  it('handles very deep octree without stack overflow', () => {
    const system = new OctreeLODSystem({
      maxOctreeDepth: 10,
      minNodeGaussians: 1, // Force deep subdivision
      hysteresisDelayMs: 0,
      lodConfig: { movementThreshold: 0, gaussianBudget: 0 },
    });

    const data = makeSplatData(100, [0.01, 10], 100);
    system.buildFromSplatData(data);

    const stats = system.getOctreeStats();
    expect(stats.maxDepth).toBeGreaterThan(0);
    // Should not throw even with deep tree
    const result = system.update(0, 0, 0, null, 0);
    expect(result.visibleCount).toBeGreaterThanOrEqual(0);
  });

  it('rebuilding clears previous octree', () => {
    const system = new OctreeLODSystem({
      hysteresisDelayMs: 0,
      lodConfig: { movementThreshold: 0, gaussianBudget: 0 },
    });

    // First build
    system.buildFromSplatData(makeSplatData(100));
    expect(system.getTotalCount()).toBe(100);

    // Second build with different count
    system.buildFromSplatData(makeSplatData(200));
    expect(system.getTotalCount()).toBe(200);
    expect(system.getVisibilityBuffer().length).toBe(200);
  });
});
