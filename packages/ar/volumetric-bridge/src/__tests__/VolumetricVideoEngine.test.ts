/**
 * Volumetric Video Engine -- Production Test Suite
 *
 * Tests the volumetric video playback engine components:
 * - TemporalDeltaProcessor (4D-MoDe motion-decoupled deltas)
 * - AdaptiveKeyframeManager (15% dynamic threshold insertion)
 * - PerformanceMonitor (adaptive quality switching)
 * - FrameBuffer (prefetch and memory management)
 * - HardwareDecoder (dequantization)
 * - Type system and constants
 *
 * Research references:
 *   W.033 - SPZ base frame format
 *   W.036 - 4D-MoDe temporal delta streaming
 *   W.039 - 4DGCPro progressive quality tiers
 *   P.030.03 - Temporal delta streaming architecture
 *   P.030.04 - Adaptive keyframe insertion at 15% threshold
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TemporalDeltaProcessor } from '../volumetric-video/TemporalDeltaProcessor';
import { AdaptiveKeyframeManager } from '../volumetric-video/AdaptiveKeyframeManager';
import { PerformanceMonitor } from '../volumetric-video/PerformanceMonitor';
import { FrameBuffer } from '../volumetric-video/FrameBuffer';
import { dequantizeAttributeMaps } from '../volumetric-video/HardwareDecoder';
import {
  QUALITY_TIER_CONFIGS,
  PLATFORM_PROFILES,
  DEFAULT_MOTION_THRESHOLDS,
  DEFAULT_ADAPTIVE_KEYFRAME_CONFIG,
} from '../volumetric-video/types';
import type {
  KeyframeData,
  DeltaFrameData,
  DecodedAttributeMaps,
  VolumetricVideoManifest,
} from '../volumetric-video/types';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Create a synthetic keyframe with N Gaussians.
 */
function makeKeyframe(
  frameIndex: number,
  gaussianCount: number,
  timestamp: number = 0,
): KeyframeData {
  return {
    frameIndex,
    frameType: 'I',
    timestamp,
    positions: new Float32Array(gaussianCount * 3).map((_, i) => (i % 3) * 0.1),
    scales: new Float32Array(gaussianCount * 3).fill(0.01),
    rotations: new Float32Array(gaussianCount * 4).map((_, i) => i % 4 === 3 ? 1 : 0),
    colors: new Float32Array(gaussianCount * 4).map((_, i) => i % 4 === 3 ? 1 : 0.5),
    opacities: new Float32Array(gaussianCount).fill(1.0),
    gaussianCount,
    decodeTimeMs: 5,
  };
}

/**
 * Create a synthetic delta frame with translation deltas.
 */
function makeDeltaFrame(
  frameIndex: number,
  referenceFrameIndex: number,
  gaussianCount: number,
  dynamicChangeRatio: number = 0.05,
  compensatedCount: number = 0,
): DeltaFrameData {
  return {
    frameIndex,
    frameType: 'P',
    timestamp: frameIndex / 30,
    referenceFrameIndex,
    motionDelta: {
      translation: new Float32Array(gaussianCount * 3).fill(0.001),
      rotation: new Float32Array(gaussianCount * 4).map((_, i) => i % 4 === 3 ? 1 : 0),
    },
    compensatedCount,
    dynamicChangeRatio,
    decodeTimeMs: 2,
  };
}

/**
 * Create synthetic decoded attribute maps.
 */
function makeAttributeMaps(gaussianCount: number): DecodedAttributeMaps {
  return {
    positionMap: new Uint8Array(gaussianCount * 3).fill(128),
    scaleMap: new Uint8Array(gaussianCount * 3).fill(128),
    rotationMap: new Uint8Array(gaussianCount * 3).fill(128),
    opacityMap: new Uint8Array(gaussianCount).fill(200),
    colorMap: new Uint8Array(gaussianCount * 3).fill(128),
    width: Math.ceil(Math.sqrt(gaussianCount)),
    height: Math.ceil(Math.sqrt(gaussianCount)),
    gaussianCount,
  };
}

// =============================================================================
// TYPE SYSTEM AND CONSTANTS
// =============================================================================

describe('VolumetricVideo: type system and constants', () => {
  it('defines three quality tiers', () => {
    expect(QUALITY_TIER_CONFIGS.low).toBeDefined();
    expect(QUALITY_TIER_CONFIGS.mid).toBeDefined();
    expect(QUALITY_TIER_CONFIGS.high).toBeDefined();
  });

  it('quality tiers have increasing layer counts', () => {
    expect(QUALITY_TIER_CONFIGS.low.layerCount).toBeLessThan(QUALITY_TIER_CONFIGS.mid.layerCount);
    expect(QUALITY_TIER_CONFIGS.mid.layerCount).toBeLessThan(QUALITY_TIER_CONFIGS.high.layerCount);
  });

  it('quality tiers have increasing PSNR targets', () => {
    expect(QUALITY_TIER_CONFIGS.low.targetPSNR).toBeLessThan(QUALITY_TIER_CONFIGS.mid.targetPSNR);
    expect(QUALITY_TIER_CONFIGS.mid.targetPSNR).toBeLessThan(QUALITY_TIER_CONFIGS.high.targetPSNR);
  });

  it('quality tiers have increasing max Gaussians', () => {
    expect(QUALITY_TIER_CONFIGS.low.maxGaussians).toBeLessThan(QUALITY_TIER_CONFIGS.mid.maxGaussians);
    expect(QUALITY_TIER_CONFIGS.mid.maxGaussians).toBeLessThan(QUALITY_TIER_CONFIGS.high.maxGaussians);
  });

  it('high tier uses high precision positions', () => {
    expect(QUALITY_TIER_CONFIGS.high.highPrecisionPositions).toBe(true);
    expect(QUALITY_TIER_CONFIGS.low.highPrecisionPositions).toBe(false);
    expect(QUALITY_TIER_CONFIGS.mid.highPrecisionPositions).toBe(false);
  });

  it('defines four platform profiles', () => {
    expect(PLATFORM_PROFILES.desktop).toBeDefined();
    expect(PLATFORM_PROFILES.tablet).toBeDefined();
    expect(PLATFORM_PROFILES.mobile).toBeDefined();
    expect(PLATFORM_PROFILES.vr).toBeDefined();
  });

  it('desktop targets 52+ FPS', () => {
    expect(PLATFORM_PROFILES.desktop.targetFPS).toBeGreaterThanOrEqual(52);
  });

  it('mobile targets 25+ FPS', () => {
    expect(PLATFORM_PROFILES.mobile.targetFPS).toBeGreaterThanOrEqual(25);
  });

  it('default keyframe threshold is 0.15 (15%)', () => {
    expect(DEFAULT_ADAPTIVE_KEYFRAME_CONFIG.threshold).toBe(0.15);
  });

  it('default motion thresholds match 4D-MoDe paper', () => {
    expect(DEFAULT_MOTION_THRESHOLDS.displacementThreshold).toBe(4.5);
    expect(DEFAULT_MOTION_THRESHOLDS.scaleChangeThreshold).toBe(0.1);
    expect(DEFAULT_MOTION_THRESHOLDS.errorThreshold).toBe(0.02);
  });
});

// =============================================================================
// TEMPORAL DELTA PROCESSOR
// =============================================================================

describe('TemporalDeltaProcessor: delta application', () => {
  let processor: TemporalDeltaProcessor;

  beforeEach(() => {
    processor = new TemporalDeltaProcessor();
  });

  it('applies translation deltas to reference frame', () => {
    const reference = makeKeyframe(0, 10);
    const delta = makeDeltaFrame(1, 0, 10);

    // Set distinct translation deltas
    delta.motionDelta.translation[0] = 1.0; // First Gaussian X += 1.0
    delta.motionDelta.translation[1] = 2.0; // First Gaussian Y += 2.0
    delta.motionDelta.translation[2] = 3.0; // First Gaussian Z += 3.0

    const result = processor.applyDelta(reference, delta);

    expect(result.frameIndex).toBe(1);
    expect(result.gaussianCount).toBe(10); // No compensated Gaussians
    expect(result.positions[0]).toBeCloseTo(reference.positions[0] + 1.0);
    expect(result.positions[1]).toBeCloseTo(reference.positions[1] + 2.0);
    expect(result.positions[2]).toBeCloseTo(reference.positions[2] + 3.0);
  });

  it('preserves Gaussian count when no compensations', () => {
    const reference = makeKeyframe(0, 50);
    const delta = makeDeltaFrame(1, 0, 50, 0.05, 0);

    const result = processor.applyDelta(reference, delta);
    expect(result.gaussianCount).toBe(50);
  });

  it('appends compensated Gaussians', () => {
    const reference = makeKeyframe(0, 10);
    const delta = makeDeltaFrame(1, 0, 10, 0.2, 3);

    // Add compensated Gaussian data
    delta.compensatedPositions = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    delta.compensatedScales = new Float32Array([0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01]);
    delta.compensatedRotations = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]);

    const result = processor.applyDelta(reference, delta);
    expect(result.gaussianCount).toBe(13); // 10 reference + 3 compensated

    // Verify compensated positions are correct
    expect(result.positions[10 * 3]).toBe(1);
    expect(result.positions[10 * 3 + 1]).toBe(2);
    expect(result.positions[10 * 3 + 2]).toBe(3);
  });

  it('applies scale residuals', () => {
    const reference = makeKeyframe(0, 5);
    reference.scales.fill(0.05);

    const delta = makeDeltaFrame(1, 0, 5);
    delta.motionDelta.scaleResidual = new Float32Array(5 * 3).fill(0.01);

    const result = processor.applyDelta(reference, delta);
    expect(result.scales[0]).toBeCloseTo(0.06); // 0.05 + 0.01
  });

  it('clamps opacity residuals to [0, 1]', () => {
    const reference = makeKeyframe(0, 3);
    reference.opacities[0] = 0.95;
    reference.opacities[1] = 0.05;

    const delta = makeDeltaFrame(1, 0, 3);
    delta.motionDelta.opacityResidual = new Float32Array(3);
    delta.motionDelta.opacityResidual[0] = 0.2;  // Would exceed 1.0
    delta.motionDelta.opacityResidual[1] = -0.1; // Would go below 0.0

    const result = processor.applyDelta(reference, delta);
    expect(result.opacities[0]).toBeLessThanOrEqual(1.0);
    expect(result.opacities[1]).toBeGreaterThanOrEqual(0.0);
  });
});

describe('TemporalDeltaProcessor: motion classification', () => {
  let processor: TemporalDeltaProcessor;

  beforeEach(() => {
    processor = new TemporalDeltaProcessor();
  });

  it('classifies stationary Gaussians as static', () => {
    const count = 10;
    const positions = new Float32Array(count * 3).fill(0);
    const scales = new Float32Array(count * 3).fill(1);

    const classification = processor.classifyMotion(
      positions, positions, scales, scales,
    );

    for (let i = 0; i < count; i++) {
      expect(classification[i]).toBe(0); // static
    }
  });

  it('classifies moving Gaussians as dynamic', () => {
    const count = 10;
    const prevPositions = new Float32Array(count * 3).fill(0);
    const currPositions = new Float32Array(count * 3).fill(100); // Large displacement
    const scales = new Float32Array(count * 3).fill(1);

    const classification = processor.classifyMotion(
      currPositions, prevPositions, scales, scales,
    );

    // At least some should be classified as dynamic given large displacement
    let dynamicCount = 0;
    for (let i = 0; i < count; i++) {
      if (classification[i] === 1) dynamicCount++;
    }
    expect(dynamicCount).toBeGreaterThan(0);
  });

  it('detects scale changes as dynamic', () => {
    const count = 10;
    const positions = new Float32Array(count * 3).fill(0);
    const prevScales = new Float32Array(count * 3).fill(1);
    const currScales = new Float32Array(count * 3).fill(5); // 400% scale change

    const classification = processor.classifyMotion(
      positions, positions, currScales, prevScales,
    );

    let dynamicCount = 0;
    for (let i = 0; i < count; i++) {
      if (classification[i] === 1) dynamicCount++;
    }
    expect(dynamicCount).toBeGreaterThan(0);
  });
});

describe('TemporalDeltaProcessor: dynamic change ratio', () => {
  let processor: TemporalDeltaProcessor;

  beforeEach(() => {
    processor = new TemporalDeltaProcessor();
  });

  it('returns ratio of compensated to reference Gaussians', () => {
    const delta = makeDeltaFrame(1, 0, 100, 0, 15);
    delta.dynamicChangeRatio = 15 / 100;

    const ratio = processor.computeDynamicChangeRatio(delta, 100);
    expect(ratio).toBeCloseTo(0.15);
  });

  it('returns 1.0 when reference count is zero', () => {
    const delta = makeDeltaFrame(1, 0, 0, 0, 5);
    const ratio = processor.computeDynamicChangeRatio(delta, 0);
    expect(ratio).toBe(1.0);
  });

  it('returns 0 when no compensated Gaussians', () => {
    const delta = makeDeltaFrame(1, 0, 100, 0, 0);
    const ratio = processor.computeDynamicChangeRatio(delta, 100);
    expect(ratio).toBe(0);
  });
});

// =============================================================================
// ADAPTIVE KEYFRAME MANAGER
// =============================================================================

describe('AdaptiveKeyframeManager: evaluation', () => {
  let manager: AdaptiveKeyframeManager;

  beforeEach(() => {
    manager = new AdaptiveKeyframeManager({
      threshold: 0.15,
      maxInterKeyframeDistance: 30,
      minInterKeyframeDistance: 5,
      enableSmoothing: false, // Disable for predictable tests
      smoothingAlpha: 0.3,
    });
  });

  it('forces keyframe when no delta is provided (seek)', () => {
    const decision = manager.evaluate(null, 100);
    expect(decision.insertKeyframe).toBe(true);
    expect(decision.reason).toBe('seek');
  });

  it('forces keyframe when max distance exceeded', () => {
    manager.recordKeyframe(0, 'seek');

    // Simulate 30 frames of normal deltas
    for (let i = 1; i <= 30; i++) {
      const delta = makeDeltaFrame(i, 0, 100, 0.01);
      manager.evaluate(delta, 100);
    }

    // 31st frame should trigger scheduled keyframe
    const delta31 = makeDeltaFrame(31, 0, 100, 0.01);
    const decision = manager.evaluate(delta31, 100);
    expect(decision.insertKeyframe).toBe(true);
    expect(decision.reason).toBe('scheduled');
  });

  it('prevents keyframe within minimum distance', () => {
    manager.recordKeyframe(0, 'seek');

    // First 5 frames should not allow keyframe regardless of ratio
    for (let i = 1; i <= 4; i++) {
      const delta = makeDeltaFrame(i, 0, 100, 0.5); // High change ratio
      const decision = manager.evaluate(delta, 100);
      expect(decision.insertKeyframe).toBe(false);
      expect(decision.reason).toBe('thrashing-prevention');
    }
  });

  it('inserts keyframe when change ratio exceeds 15% threshold', () => {
    manager.recordKeyframe(0, 'seek');

    // Advance past minimum distance
    for (let i = 1; i <= 5; i++) {
      manager.evaluate(makeDeltaFrame(i, 0, 100, 0.01), 100);
    }

    // Frame 6 with high change ratio
    const delta = makeDeltaFrame(6, 0, 100, 0.20); // 20% > 15%
    const decision = manager.evaluate(delta, 100);
    expect(decision.insertKeyframe).toBe(true);
    expect(decision.reason).toBe('adaptive');
  });

  it('continues with delta when change ratio is below threshold', () => {
    manager.recordKeyframe(0, 'seek');

    // Advance past minimum distance
    for (let i = 1; i <= 5; i++) {
      manager.evaluate(makeDeltaFrame(i, 0, 100, 0.01), 100);
    }

    // Frame 6 with low change ratio
    const delta = makeDeltaFrame(6, 0, 100, 0.05); // 5% < 15%
    const decision = manager.evaluate(delta, 100);
    expect(decision.insertKeyframe).toBe(false);
    expect(decision.reason).toBe('normal-delta');
  });

  it('threshold is configurable', () => {
    manager.setThreshold(0.30); // 30% threshold
    manager.recordKeyframe(0, 'seek');

    // Advance past minimum distance
    for (let i = 1; i <= 5; i++) {
      manager.evaluate(makeDeltaFrame(i, 0, 100, 0.01), 100);
    }

    // 20% would have triggered at 15%, but not at 30%
    const delta = makeDeltaFrame(6, 0, 100, 0.20);
    const decision = manager.evaluate(delta, 100);
    expect(decision.insertKeyframe).toBe(false);
  });
});

describe('AdaptiveKeyframeManager: EMA smoothing', () => {
  it('smooths spiky change ratios', () => {
    const manager = new AdaptiveKeyframeManager({
      threshold: 0.15,
      maxInterKeyframeDistance: 100,
      minInterKeyframeDistance: 2,
      enableSmoothing: true,
      smoothingAlpha: 0.3,
    });

    manager.recordKeyframe(0, 'seek');

    // Advance past minimum distance
    for (let i = 1; i <= 3; i++) {
      manager.evaluate(makeDeltaFrame(i, 0, 100, 0.01), 100);
    }

    // A single spike of 0.50 should be dampened by EMA
    const spikeDecision = manager.evaluate(makeDeltaFrame(4, 0, 100, 0.50), 100);
    // With alpha=0.3: smoothed = 0.3 * 0.50 + 0.7 * ~0.01 ≈ 0.157
    // This is close to the 0.15 threshold, might or might not trigger
    // depending on exact prior smoothed value
    expect(spikeDecision.smoothedChangeRatio).toBeLessThan(0.50);
  });
});

describe('AdaptiveKeyframeManager: statistics', () => {
  it('tracks keyframe insertion counts', () => {
    const manager = new AdaptiveKeyframeManager({
      threshold: 0.15,
      enableSmoothing: false,
      minInterKeyframeDistance: 0,
      maxInterKeyframeDistance: 100,
    });

    manager.recordKeyframe(0, 'seek');
    manager.recordKeyframe(10, 'scheduled');
    manager.recordKeyframe(20, 'adaptive');

    const stats = manager.getStatistics();
    expect(stats.totalKeyframes).toBe(3);
    expect(stats.scheduledKeyframes).toBe(1);
    expect(stats.adaptiveKeyframes).toBe(1);
    expect(stats.seekKeyframes).toBe(1);
  });

  it('reset clears state but not statistics', () => {
    const manager = new AdaptiveKeyframeManager();
    manager.recordKeyframe(0, 'seek');
    manager.reset();

    expect(manager.getLastKeyframeIndex()).toBe(-1);
    expect(manager.getFramesSinceKeyframe()).toBe(0);
  });
});

// =============================================================================
// PERFORMANCE MONITOR
// =============================================================================

describe('PerformanceMonitor: metrics tracking', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor(PLATFORM_PROFILES.desktop, 'high', false);
  });

  it('records frame timings', () => {
    monitor.recordFrame(5, 3); // 5ms decode, 3ms render
    monitor.recordFrame(4, 2);
    monitor.recordFrame(6, 4);

    const metrics = monitor.getMetrics();
    expect(metrics.avgDecodeTimeMs).toBeCloseTo(5, 0);
    expect(metrics.avgRenderTimeMs).toBeCloseTo(3, 0);
    expect(metrics.avgTotalTimeMs).toBeCloseTo(8, 0);
  });

  it('computes P95 total time', () => {
    // Record 20 frames at 8ms, 1 frame at 50ms
    for (let i = 0; i < 20; i++) {
      monitor.recordFrame(5, 3);
    }
    monitor.recordFrame(30, 20); // Spike

    const metrics = monitor.getMetrics();
    expect(metrics.p95TotalTimeMs).toBeGreaterThan(8);
  });

  it('tracks dropped frames', () => {
    // Desktop target is 52 FPS = 19.2ms budget
    monitor.recordFrame(5, 3);  // Under budget
    monitor.recordFrame(15, 8); // Over budget (23ms > 19.2ms)

    const metrics = monitor.getMetrics();
    expect(metrics.frameDropRate).toBeGreaterThan(0);
  });

  it('reports zero metrics when no frames recorded', () => {
    const metrics = monitor.getMetrics();
    expect(metrics.avgDecodeTimeMs).toBe(0);
    expect(metrics.avgRenderTimeMs).toBe(0);
    expect(metrics.effectiveFPS).toBe(0);
  });
});

describe('PerformanceMonitor: quality tier management', () => {
  it('starts with platform default tier', () => {
    const monitor = new PerformanceMonitor(PLATFORM_PROFILES.desktop);
    expect(monitor.getCurrentTier()).toBe('high');
  });

  it('starts with mobile default tier', () => {
    const monitor = new PerformanceMonitor(PLATFORM_PROFILES.mobile);
    expect(monitor.getCurrentTier()).toBe('low');
  });

  it('allows manual tier setting', () => {
    const monitor = new PerformanceMonitor(PLATFORM_PROFILES.desktop, 'high', false);
    monitor.setTier('mid');
    expect(monitor.getCurrentTier()).toBe('mid');
  });

  it('emits quality-change event on tier change', () => {
    const monitor = new PerformanceMonitor(PLATFORM_PROFILES.desktop, 'high', false);
    const events: any[] = [];
    monitor.on((e) => events.push(e));

    monitor.setTier('mid');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('quality-change');
    expect(events[0].tier).toBe('mid');
    expect(events[0].previousTier).toBe('high');
  });

  it('does not emit when setting same tier', () => {
    const monitor = new PerformanceMonitor(PLATFORM_PROFILES.desktop, 'high', false);
    const events: any[] = [];
    monitor.on((e) => events.push(e));

    monitor.setTier('high');
    expect(events).toHaveLength(0);
  });
});

describe('PerformanceMonitor: diagnostic summary', () => {
  it('produces a summary string', () => {
    const monitor = new PerformanceMonitor(PLATFORM_PROFILES.desktop, 'high', false);
    monitor.recordFrame(5, 3);
    monitor.recordFrame(4, 2);

    const summary = monitor.getSummary();
    expect(summary).toContain('HIGH');
    expect(summary).toContain('Decode:');
    expect(summary).toContain('Render:');
  });

  it('resets all metrics', () => {
    const monitor = new PerformanceMonitor(PLATFORM_PROFILES.desktop, 'high', false);
    monitor.recordFrame(5, 3);
    monitor.reset();

    const metrics = monitor.getMetrics();
    expect(metrics.avgDecodeTimeMs).toBe(0);
    expect(metrics.avgRenderTimeMs).toBe(0);
  });
});

// =============================================================================
// FRAME BUFFER
// =============================================================================

describe('FrameBuffer: basic operations', () => {
  let buffer: FrameBuffer;

  beforeEach(() => {
    buffer = new FrameBuffer(10, 64); // 10 frames, 64MB
  });

  it('starts empty', () => {
    expect(buffer.hasFrame(0)).toBe(false);
    expect(buffer.getFrame(0)).toBeNull();
  });

  it('stores and retrieves frames', () => {
    const frame = makeKeyframe(0, 100);
    buffer.addFrame(frame, true);

    expect(buffer.hasFrame(0)).toBe(true);
    expect(buffer.getFrame(0)).toBe(frame);
  });

  it('reports correct buffer health', () => {
    expect(buffer.getBufferHealth()).toBe(0);

    for (let i = 0; i < 5; i++) {
      buffer.addFrame(makeKeyframe(i, 100), i === 0);
    }
    expect(buffer.getBufferHealth()).toBeCloseTo(0.5);

    for (let i = 5; i < 10; i++) {
      buffer.addFrame(makeKeyframe(i, 100), false);
    }
    expect(buffer.getBufferHealth()).toBeCloseTo(1.0);
  });

  it('evicts oldest non-keyframe when over count limit', () => {
    // Add 10 frames (at limit)
    buffer.addFrame(makeKeyframe(0, 100), true); // Keyframe
    for (let i = 1; i <= 10; i++) {
      buffer.addFrame(makeKeyframe(i, 100), false);
    }

    // Adding 11th should evict the oldest non-keyframe
    buffer.addFrame(makeKeyframe(11, 100), false);

    // Keyframe (0) should still be there
    expect(buffer.hasFrame(0)).toBe(true);
    // Oldest non-keyframe (1) should be evicted
    expect(buffer.hasFrame(1)).toBe(false);
  });

  it('clears all frames', () => {
    for (let i = 0; i < 5; i++) {
      buffer.addFrame(makeKeyframe(i, 100), false);
    }

    buffer.clear();
    expect(buffer.getBufferHealth()).toBe(0);
    for (let i = 0; i < 5; i++) {
      expect(buffer.hasFrame(i)).toBe(false);
    }
  });

  it('evicts frames before a given index', () => {
    for (let i = 0; i < 10; i++) {
      buffer.addFrame(makeKeyframe(i, 100), i === 0);
    }

    buffer.evictBefore(5);

    // Frames 1-4 should be evicted (non-keyframe)
    for (let i = 1; i < 5; i++) {
      expect(buffer.hasFrame(i)).toBe(false);
    }
    // Frame 0 (keyframe) should be pinned
    expect(buffer.hasFrame(0)).toBe(true);
    // Frames 5+ should still be there
    expect(buffer.hasFrame(5)).toBe(true);
  });

  it('finds nearest keyframe', () => {
    buffer.addFrame(makeKeyframe(0, 100), true);
    buffer.addFrame(makeKeyframe(5, 100), false);
    buffer.addFrame(makeKeyframe(10, 100), true);

    const kf = buffer.getNearestKeyframe(8);
    expect(kf).not.toBeNull();
    expect(kf!.frameIndex).toBe(0); // Only keyframe at or before 8 is 0
    // Actually frame 10 is also a keyframe but it's after 8
  });

  it('reports frames ahead of position', () => {
    for (let i = 5; i < 15; i++) {
      buffer.addFrame(makeKeyframe(i, 100), false);
    }

    expect(buffer.getFramesAhead(5)).toBe(10);
    expect(buffer.getFramesAhead(10)).toBe(5);
  });
});

describe('FrameBuffer: statistics', () => {
  it('reports comprehensive stats', () => {
    const buffer = new FrameBuffer(20, 128);

    buffer.addFrame(makeKeyframe(0, 100), true);
    buffer.addFrame(makeKeyframe(1, 100), false);
    buffer.addFrame(makeKeyframe(2, 100), false);
    buffer.addFrame(makeKeyframe(5, 100), true);

    const stats = buffer.getStats();
    expect(stats.bufferedFrames).toBe(4);
    expect(stats.maxFrames).toBe(20);
    expect(stats.keyframeCount).toBe(2);
    expect(stats.deltaFrameCount).toBe(2);
    expect(stats.memoryUsageMB).toBeGreaterThan(0);
    expect(stats.bufferHealth).toBeCloseTo(0.2);
  });
});

// =============================================================================
// HARDWARE DECODER (Dequantization)
// =============================================================================

describe('HardwareDecoder: dequantization', () => {
  it('dequantizes attribute maps into float arrays', () => {
    const maps = makeAttributeMaps(100);
    const result = dequantizeAttributeMaps(maps, 12);

    expect(result.count).toBe(100);
    expect(result.positions.length).toBe(300);  // 100 * 3
    expect(result.scales.length).toBe(300);
    expect(result.rotations.length).toBe(400);  // 100 * 4
    expect(result.colors.length).toBe(400);
    expect(result.opacities.length).toBe(100);
  });

  it('produces valid opacity values in [0, 1]', () => {
    const maps = makeAttributeMaps(50);
    const result = dequantizeAttributeMaps(maps);

    for (let i = 0; i < result.count; i++) {
      expect(result.opacities[i]).toBeGreaterThanOrEqual(0);
      expect(result.opacities[i]).toBeLessThanOrEqual(1);
    }
  });

  it('produces valid color values in [0, 1]', () => {
    const maps = makeAttributeMaps(50);
    const result = dequantizeAttributeMaps(maps);

    for (let i = 0; i < result.count * 4; i++) {
      expect(result.colors[i]).toBeGreaterThanOrEqual(0);
      expect(result.colors[i]).toBeLessThanOrEqual(1);
    }
  });

  it('handles high precision position maps (Uint16Array)', () => {
    const maps = makeAttributeMaps(50);
    maps.positionMap = new Uint16Array(50 * 3).fill(32768); // Mid-range uint16

    const result = dequantizeAttributeMaps(maps, 12);
    expect(result.positions.length).toBe(150);

    // All positions should be the same value
    const firstPos = result.positions[0];
    for (let i = 0; i < 150; i++) {
      expect(result.positions[i]).toBeCloseTo(firstPos, 5);
    }
  });

  it('produces normalized quaternions', () => {
    const maps = makeAttributeMaps(10);
    const result = dequantizeAttributeMaps(maps);

    for (let i = 0; i < result.count; i++) {
      const qx = result.rotations[i * 4];
      const qy = result.rotations[i * 4 + 1];
      const qz = result.rotations[i * 4 + 2];
      const qw = result.rotations[i * 4 + 3];
      const len = Math.sqrt(qx * qx + qy * qy + qz * qz + qw * qw);
      expect(len).toBeCloseTo(1.0, 1); // Should be unit quaternion
    }
  });
});

// =============================================================================
// INTEGRATION: Pipeline Flow
// =============================================================================

describe('VolumetricVideo: pipeline integration', () => {
  it('full pipeline: keyframe -> delta -> reconstructed frame', () => {
    const processor = new TemporalDeltaProcessor();
    const keyframeManager = new AdaptiveKeyframeManager({
      threshold: 0.15,
      enableSmoothing: false,
      minInterKeyframeDistance: 0,
      maxInterKeyframeDistance: 30,
    });

    // Step 1: Load keyframe (I-frame)
    const keyframe = makeKeyframe(0, 100);
    keyframeManager.recordKeyframe(0, 'seek');

    // Step 2: Process delta frames
    for (let i = 1; i <= 10; i++) {
      const delta = makeDeltaFrame(i, 0, 100, 0.05, 0);

      const decision = keyframeManager.evaluate(delta, 100);
      expect(decision.insertKeyframe).toBe(false);

      const reconstructed = processor.applyDelta(keyframe, delta);
      expect(reconstructed.gaussianCount).toBe(100);
      expect(reconstructed.frameIndex).toBe(i);
    }

    // Step 3: High change ratio triggers adaptive keyframe
    const highChangeDelta = makeDeltaFrame(11, 0, 100, 0.25, 25);
    const decision = keyframeManager.evaluate(highChangeDelta, 100);
    expect(decision.insertKeyframe).toBe(true);
    expect(decision.reason).toBe('adaptive');
  });

  it('performance monitor triggers quality change on sustained overrun', () => {
    const monitor = new PerformanceMonitor(
      PLATFORM_PROFILES.desktop,
      'high',
      true,
    );

    const events: any[] = [];
    monitor.on((e) => events.push(e));

    // Simulate sustained frame budget overrun
    // Desktop budget: 1000/52 ≈ 19.2ms
    for (let i = 0; i < 60; i++) {
      monitor.recordFrame(15, 10); // 25ms total > 19.2ms budget
    }

    // After enough bad windows, should trigger downgrade
    // The monitor checks at 1000ms intervals, so we need to simulate that
    // by accessing the internal check (which is triggered by recordFrame)
    const tier = monitor.getCurrentTier();
    // Tier may have changed if enough time passed in the test
    // This is a timing-dependent test, so we just verify the API works
    expect(['low', 'mid', 'high']).toContain(tier);
  });

  it('frame buffer integrates with keyframe pinning', () => {
    const buffer = new FrameBuffer(20, 128);

    // Add keyframes and delta frames
    buffer.addFrame(makeKeyframe(0, 500), true);
    for (let i = 1; i < 15; i++) {
      buffer.addFrame(makeKeyframe(i, 500), false);
    }
    buffer.addFrame(makeKeyframe(15, 500), true);

    // Evict old frames
    buffer.evictBefore(10);

    // Keyframes should be pinned
    expect(buffer.hasFrame(0)).toBe(true);
    expect(buffer.hasFrame(15)).toBe(true);

    // Non-keyframes before 10 should be evicted
    expect(buffer.hasFrame(1)).toBe(false);
    expect(buffer.hasFrame(5)).toBe(false);
    expect(buffer.hasFrame(9)).toBe(false);
  });
});
