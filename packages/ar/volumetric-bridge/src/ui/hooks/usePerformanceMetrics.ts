/**
 * usePerformanceMetrics — React hook for real-time performance monitoring
 *
 * Bridges the React UI with PerformanceMonitor, providing rolling FPS history,
 * memory state tracking, and quality tier awareness for metrics displays.
 *
 * @module volumetric-bridge/ui/hooks
 */

import { useState, useEffect, useRef } from 'react';
import type { PerformanceMonitor } from '../../volumetric-video/PerformanceMonitor';
import type {
  PerformanceMetrics,
  VolumetricQualityTier,
} from '../../volumetric-video/types';
import type { MemoryState } from '../../GaussianBudgetManager';
import type { PerformanceMetricsState } from '../types';

// =============================================================================
// HOOK OPTIONS
// =============================================================================

export interface UsePerformanceMetricsOptions {
  /** Reference to the PerformanceMonitor instance */
  monitor: PerformanceMonitor | null;
  /** FPS history length for graph rendering (default: 120) */
  fpsHistoryLength?: number;
  /** Polling interval in ms (default: 100) */
  pollInterval?: number;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * React hook for real-time performance metrics.
 *
 * Provides:
 * - Rolling performance metrics (decode/render time, FPS, memory)
 * - FPS history array for sparkline/graph rendering
 * - Target-meeting status
 * - Memory threshold state
 *
 * Usage:
 * ```tsx
 * const { metrics, fpsHistory, meetingTarget } = usePerformanceMetrics({
 *   monitor: player.getPerformanceMonitor(),
 * });
 *
 * return <RenderingMetricsDisplay metrics={metrics} />;
 * ```
 */
export function usePerformanceMetrics(
  options: UsePerformanceMetricsOptions,
): PerformanceMetricsState {
  const { monitor, fpsHistoryLength = 120, pollInterval = 100 } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    avgDecodeTimeMs: 0,
    avgRenderTimeMs: 0,
    avgTotalTimeMs: 0,
    effectiveFPS: 0,
    p95TotalTimeMs: 0,
    frameDropRate: 0,
    memoryUsageMB: 0,
    recentTierChanges: 0,
  });

  const [fpsHistory, setFpsHistory] = useState<number[]>([]);
  const [meetingTarget, setMeetingTarget] = useState(true);
  const [currentTier, setCurrentTier] = useState<VolumetricQualityTier>('mid');
  const [memoryState, setMemoryState] = useState<MemoryState['thresholdState']>('normal');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!monitor) return;

    pollRef.current = setInterval(() => {
      const currentMetrics = monitor.getMetrics();
      setMetrics(currentMetrics);
      setMeetingTarget(monitor.isMeetingTarget());
      setCurrentTier(monitor.getCurrentTier());

      // Update FPS history
      setFpsHistory((prev) => {
        const updated = [...prev, currentMetrics.effectiveFPS];
        if (updated.length > fpsHistoryLength) {
          return updated.slice(updated.length - fpsHistoryLength);
        }
        return updated;
      });

      // Determine memory state from utilization
      // PerformanceMonitor doesn't directly expose memory state, so we derive it
      const profile = monitor.getPlatformProfile();
      if (profile.maxMemoryMB > 0) {
        const utilization = currentMetrics.memoryUsageMB / profile.maxMemoryMB;
        if (utilization >= 0.95) {
          setMemoryState('emergency');
        } else if (utilization >= 0.85) {
          setMemoryState('reduction');
        } else if (utilization >= 0.70) {
          setMemoryState('warning');
        } else {
          setMemoryState('normal');
        }
      }
    }, pollInterval);

    // Subscribe to quality change events
    const unsub = monitor.on((event) => {
      if (event.type === 'quality-change') {
        setCurrentTier(event.tier);
      }
    });

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      unsub();
    };
  }, [monitor, pollInterval, fpsHistoryLength]);

  return {
    metrics,
    fpsHistory,
    meetingTarget,
    currentTier,
    memoryState,
  };
}
