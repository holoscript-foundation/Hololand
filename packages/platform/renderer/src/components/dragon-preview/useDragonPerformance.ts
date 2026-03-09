/**
 * useDragonPerformance
 *
 * React hook for tracking real-time performance metrics of the dragon preview scene.
 * Measures triangle count, draw calls, FPS, frame time, and fire GPU time.
 * Computes a health status (healthy/warning/critical/exceeded) based on thresholds.
 *
 * Designed to run inside an R3F Canvas context via useFrame.
 *
 * @module dragon-preview/useDragonPerformance
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  DragonPerformanceMetrics,
  DragonLODLevel,
  FireQualityLevel,
} from './types';
import { LOD_LEVEL_INFO, DRAGON_PERF_THRESHOLDS } from './types';
import type { BudgetHealthStatus } from '../scene-profiler/types';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Configuration for the dragon performance hook
 */
export interface UseDragonPerformanceConfig {
  /** Target FPS for health calculation (default: 60) */
  targetFPS?: number;
  /** Base triangle count at LOD 0 (default: 163000 from Inferno Wyrm spec) */
  baseTriangleCount?: number;
  /** Base draw call count at LOD 0 (default: 163 from DragonMeshBatcher) */
  baseDrawCallCount?: number;
  /** Whether batching is active (reduces draw calls) */
  batchingActive?: boolean;
  /** Batched draw call count when batching is on */
  batchedDrawCallCount?: number;
}

// =============================================================================
// ESTIMATED METRICS PER LOD + FIRE QUALITY
// =============================================================================

/**
 * Estimated GPU time for fire pass at each quality level (ms)
 */
const FIRE_GPU_TIME_ESTIMATES: Record<FireQualityLevel, number> = {
  0: 0.8,
  1: 1.5,
  2: 2.0,
  3: 3.2,
};

/**
 * Estimated memory usage at each LOD level (MB)
 */
const MEMORY_ESTIMATES: Record<DragonLODLevel, number> = {
  0: 128,
  1: 72,
  2: 38,
  3: 16,
};

// =============================================================================
// HEALTH CALCULATION
// =============================================================================

/**
 * Determine overall health status from metrics
 */
function computeHealth(
  triangles: number,
  drawCalls: number,
  fps: number,
): BudgetHealthStatus {
  const t = DRAGON_PERF_THRESHOLDS;

  // Critical if any metric is in critical range
  if (
    triangles > t.triangles.critical ||
    drawCalls > t.drawCalls.critical ||
    fps < t.fps.critical
  ) {
    return 'critical';
  }

  // Warning if any metric is in warning range
  if (
    triangles > t.triangles.warning ||
    drawCalls > t.drawCalls.warning ||
    fps < t.fps.warning
  ) {
    return 'warning';
  }

  // Exceeded if FPS drops below 10
  if (fps > 0 && fps < 10) {
    return 'exceeded';
  }

  return 'healthy';
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook return type
 */
export interface UseDragonPerformanceReturn {
  /** Current performance metrics */
  metrics: DragonPerformanceMetrics;
  /** Update metrics based on current LOD and fire settings */
  updateForLOD: (lod: DragonLODLevel, fireQuality: FireQualityLevel, fireEnabled: boolean) => void;
  /** Inject real renderer stats (from R3F useFrame gl.info) */
  updateFromRenderer: (info: {
    triangles: number;
    drawCalls: number;
    fps: number;
    frameTimeMs: number;
  }) => void;
  /** Reset metrics */
  reset: () => void;
}

/**
 * React hook for tracking dragon preview performance metrics.
 *
 * Provides both estimated metrics (based on LOD/fire settings) and
 * real metrics (injected from the R3F render loop). When real metrics
 * are available, they take precedence.
 *
 * @example
 * ```tsx
 * const { metrics, updateForLOD, updateFromRenderer } = useDragonPerformance();
 *
 * useFrame(({ gl }) => {
 *   const info = gl.info.render;
 *   updateFromRenderer({
 *     triangles: info.triangles,
 *     drawCalls: info.calls,
 *     fps: currentFPS,
 *     frameTimeMs: currentFrameTime,
 *   });
 * });
 * ```
 */
export function useDragonPerformance(
  config: UseDragonPerformanceConfig = {},
): UseDragonPerformanceReturn {
  const {
    targetFPS = 60,
    baseTriangleCount = 163_000,
    baseDrawCallCount = 163,
    batchingActive = false,
    batchedDrawCallCount = 18,
  } = config;

  // FPS tracking
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameRef = useRef(performance.now());
  const rafRef = useRef<number>(0);

  const [metrics, setMetrics] = useState<DragonPerformanceMetrics>({
    triangleCount: baseTriangleCount,
    drawCallCount: batchingActive ? batchedDrawCallCount : baseDrawCallCount,
    fps: 0,
    frameTimeMs: 0,
    health: 'healthy',
    fireGpuTimeMs: 0,
    memoryEstimateMB: MEMORY_ESTIMATES[0],
  });

  // FPS measurement via requestAnimationFrame
  useEffect(() => {
    let running = true;

    const measure = () => {
      if (!running) return;

      const now = performance.now();
      const dt = now - lastFrameRef.current;
      lastFrameRef.current = now;

      frameTimesRef.current.push(dt);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      if (frameTimesRef.current.length >= 10) {
        const avgDt =
          frameTimesRef.current.reduce((a, b) => a + b, 0) /
          frameTimesRef.current.length;
        const fps = Math.round(1000 / avgDt);
        const frameTimeMs = +avgDt.toFixed(2);

        setMetrics((prev) => ({
          ...prev,
          fps,
          frameTimeMs,
          health: computeHealth(prev.triangleCount, prev.drawCallCount, fps),
        }));
      }

      rafRef.current = requestAnimationFrame(measure);
    };

    rafRef.current = requestAnimationFrame(measure);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const updateForLOD = useCallback(
    (lod: DragonLODLevel, fireQuality: FireQualityLevel, fireEnabled: boolean) => {
      const lodInfo = LOD_LEVEL_INFO[lod];
      const triangleCount = Math.round(baseTriangleCount * (lodInfo.trianglePercent / 100));
      const drawCallCount = batchingActive
        ? Math.max(5, Math.round(batchedDrawCallCount * (lodInfo.trianglePercent / 100)))
        : Math.round(baseDrawCallCount * (lodInfo.trianglePercent / 100));
      const fireGpuTimeMs = fireEnabled ? FIRE_GPU_TIME_ESTIMATES[fireQuality] : 0;
      const memoryEstimateMB = MEMORY_ESTIMATES[lod];

      setMetrics((prev) => ({
        ...prev,
        triangleCount,
        drawCallCount,
        fireGpuTimeMs,
        memoryEstimateMB,
        health: computeHealth(triangleCount, drawCallCount, prev.fps),
      }));
    },
    [baseTriangleCount, baseDrawCallCount, batchingActive, batchedDrawCallCount],
  );

  const updateFromRenderer = useCallback(
    (info: { triangles: number; drawCalls: number; fps: number; frameTimeMs: number }) => {
      setMetrics((prev) => ({
        ...prev,
        triangleCount: info.triangles,
        drawCallCount: info.drawCalls,
        fps: info.fps,
        frameTimeMs: info.frameTimeMs,
        health: computeHealth(info.triangles, info.drawCalls, info.fps),
      }));
    },
    [],
  );

  const reset = useCallback(() => {
    frameTimesRef.current = [];
    setMetrics({
      triangleCount: baseTriangleCount,
      drawCallCount: batchingActive ? batchedDrawCallCount : baseDrawCallCount,
      fps: 0,
      frameTimeMs: 0,
      health: 'healthy',
      fireGpuTimeMs: 0,
      memoryEstimateMB: MEMORY_ESTIMATES[0],
    });
  }, [baseTriangleCount, baseDrawCallCount, batchingActive, batchedDrawCallCount]);

  return { metrics, updateForLOD, updateFromRenderer, reset };
}
