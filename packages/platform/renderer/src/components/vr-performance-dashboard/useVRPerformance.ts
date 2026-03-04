/**
 * useVRPerformance Hook
 *
 * React hook that manages the VR performance dashboard state.
 * Aggregates data from:
 *   - GaussianBudgetManager (layer budgets, utilization, lending)
 *   - FoveatedGaussianRenderer (per-frame timings, render stats)
 *
 * The hook does NOT subscribe directly to any manager. Instead, it
 * provides imperative update methods (pushFrameSample, updateBudgetMetrics)
 * that the parent component or integration layer calls when new data
 * arrives. This keeps the hook framework-agnostic and avoids coupling
 * to a specific manager instance.
 *
 * VR Safety:
 *   This hook uses React state batching and does NOT trigger re-renders
 *   at 90Hz. The caller should throttle updates (e.g., 10Hz for budget
 *   metrics, per-frame for timing samples that are batched into the
 *   rolling window).
 *
 * @module vr-performance-dashboard/useVRPerformance
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import type { GaussianBudgetMetrics } from '../../GaussianBudgetManager';
import type { GaussianRenderTimings, GaussianRenderStats } from '../../FoveatedGaussianTypes';
import type {
  VRPerformanceState,
  VRPerformanceActions,
  FrameTimeSample,
  PerformanceAlert,
} from './types';
import { createAlertId } from './types';

// =============================================================================
// HOOK CONFIGURATION
// =============================================================================

export interface UseVRPerformanceConfig {
  /** Maximum number of frame samples to retain (default: 120) */
  maxFrameSamples?: number;
  /** Target total frame time in ms (default: 11.1 for 90Hz) */
  targetFrameTimeMs?: number;
  /** Target splat rendering budget in ms (default: 5.5) */
  targetSplatBudgetMs?: number;
  /** Device preset name for display (default: 'Quest 3') */
  devicePreset?: string;
  /** Enable automatic alert generation (default: true) */
  enableAlerts?: boolean;
  /** Maximum number of retained alerts (default: 50) */
  maxAlerts?: number;
  /** Alert cooldown in ms to prevent spam (default: 2000) */
  alertCooldownMs?: number;
}

const DEFAULT_CONFIG: Required<UseVRPerformanceConfig> = {
  maxFrameSamples: 120,
  targetFrameTimeMs: 11.1,
  targetSplatBudgetMs: 5.5,
  devicePreset: 'Quest 3',
  enableAlerts: true,
  maxAlerts: 50,
  alertCooldownMs: 2000,
};

// =============================================================================
// HOOK
// =============================================================================

export function useVRPerformance(
  config?: UseVRPerformanceConfig,
): [VRPerformanceState, VRPerformanceActions] {
  const cfg = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    [config],
  );

  // State
  const [budgetMetrics, setBudgetMetrics] = useState<GaussianBudgetMetrics | null>(null);
  const [renderStats, setRenderStats] = useState<GaussianRenderStats | null>(null);
  const [frameSamples, setFrameSamples] = useState<FrameTimeSample[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [currentFps, setCurrentFps] = useState(0);
  const [targetFrameTimeMs, setTargetFrameTimeMsState] = useState(cfg.targetFrameTimeMs);

  // Refs for alert cooldown tracking
  const lastAlertTimeRef = useRef<Record<string, number>>({});
  const frameCountRef = useRef(0);
  const fpsWindowRef = useRef<number[]>([]);

  // ---------------------------------------------------
  // ACTIONS
  // ---------------------------------------------------

  const updateBudgetMetrics = useCallback(
    (metrics: GaussianBudgetMetrics) => {
      if (!isLive) return;
      setBudgetMetrics(metrics);

      // Generate alerts for state transitions
      if (cfg.enableAlerts) {
        const now = Date.now();
        const cooldown = cfg.alertCooldownMs;

        if (
          metrics.performanceState === 'emergency' &&
          (now - (lastAlertTimeRef.current['emergency'] ?? 0)) > cooldown
        ) {
          lastAlertTimeRef.current['emergency'] = now;
          addAlert({
            severity: 'critical',
            category: 'emergency',
            message: `Emergency shed triggered. Avg frame time: ${metrics.avgFrameTimeMs.toFixed(2)}ms (${metrics.emergencyShedCount} total sheds).`,
          });
        } else if (
          metrics.performanceState === 'critical' &&
          (now - (lastAlertTimeRef.current['critical'] ?? 0)) > cooldown
        ) {
          lastAlertTimeRef.current['critical'] = now;
          addAlert({
            severity: 'warning',
            category: 'frame_time',
            message: `Critical performance: avg frame time ${metrics.avgFrameTimeMs.toFixed(2)}ms (target: ${cfg.targetSplatBudgetMs}ms).`,
          });
        }

        // Budget overflow alerts
        const layers = ['baked', 'relightable', 'interactive'] as const;
        for (const layer of layers) {
          const s = metrics.layers[layer];
          if (
            s.utilization > 0.95 &&
            (now - (lastAlertTimeRef.current[`overflow_${layer}`] ?? 0)) > cooldown * 3
          ) {
            lastAlertTimeRef.current[`overflow_${layer}`] = now;
            addAlert({
              severity: 'warning',
              category: 'budget',
              message: `${layer} layer at ${(s.utilization * 100).toFixed(0)}% utilization (${s.allocatedSplats.toLocaleString()} / ${s.effectiveBudget.toLocaleString()} splats).`,
            });
          }
        }
      }
    },
    [isLive, cfg.enableAlerts, cfg.alertCooldownMs, cfg.targetSplatBudgetMs],
  );

  const pushFrameSample = useCallback(
    (timings: GaussianRenderTimings, frameNumber: number) => {
      if (!isLive) return;

      const sample: FrameTimeSample = {
        frameNumber,
        timestamp: Date.now(),
        timings,
      };

      setFrameSamples((prev) => {
        const next = [...prev, sample];
        if (next.length > cfg.maxFrameSamples) {
          return next.slice(next.length - cfg.maxFrameSamples);
        }
        return next;
      });

      // Update FPS calculation
      frameCountRef.current += 1;
      const now = performance.now();
      fpsWindowRef.current.push(now);

      // Keep 1 second of timestamps
      while (
        fpsWindowRef.current.length > 0 &&
        now - fpsWindowRef.current[0] > 1000
      ) {
        fpsWindowRef.current.shift();
      }
      setCurrentFps(fpsWindowRef.current.length);

      // Alert for sustained over-budget frames
      if (cfg.enableAlerts && !timings.withinBudget) {
        const recentOverBudget = frameSamples
          .slice(-10)
          .filter((s) => !s.timings.withinBudget).length;

        if (
          recentOverBudget >= 8 &&
          (Date.now() - (lastAlertTimeRef.current['sustained_over'] ?? 0)) > cfg.alertCooldownMs * 5
        ) {
          lastAlertTimeRef.current['sustained_over'] = Date.now();
          addAlert({
            severity: 'critical',
            category: 'frame_time',
            message: `${recentOverBudget}/10 recent frames over budget. Sustained performance degradation.`,
          });
        }
      }
    },
    [isLive, cfg.maxFrameSamples, cfg.enableAlerts, cfg.alertCooldownMs, frameSamples],
  );

  const updateRenderStats = useCallback(
    (stats: GaussianRenderStats) => {
      if (!isLive) return;
      setRenderStats(stats);
    },
    [isLive],
  );

  const addAlert = useCallback(
    (params: Omit<PerformanceAlert, 'id' | 'timestamp' | 'dismissed'>) => {
      const alert: PerformanceAlert = {
        ...params,
        id: createAlertId(),
        timestamp: Date.now(),
        dismissed: false,
      };

      setAlerts((prev) => {
        const next = [alert, ...prev];
        if (next.length > cfg.maxAlerts) {
          return next.slice(0, cfg.maxAlerts);
        }
        return next;
      });
    },
    [cfg.maxAlerts],
  );

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, dismissed: true } : a)),
    );
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const setTargetFrameTimeMs = useCallback((ms: number) => {
    setTargetFrameTimeMsState(ms);
  }, []);

  const toggleLive = useCallback(() => {
    setIsLive((prev) => !prev);
  }, []);

  // ---------------------------------------------------
  // ASSEMBLED STATE
  // ---------------------------------------------------

  const state: VRPerformanceState = useMemo(
    () => ({
      budgetMetrics,
      renderStats,
      frameSamples,
      targetFrameTimeMs,
      targetSplatBudgetMs: cfg.targetSplatBudgetMs,
      alerts: alerts.filter((a) => !a.dismissed),
      isLive,
      devicePreset: cfg.devicePreset,
      currentFps,
    }),
    [
      budgetMetrics,
      renderStats,
      frameSamples,
      targetFrameTimeMs,
      cfg.targetSplatBudgetMs,
      cfg.devicePreset,
      alerts,
      isLive,
      currentFps,
    ],
  );

  const actions: VRPerformanceActions = useMemo(
    () => ({
      updateBudgetMetrics,
      pushFrameSample,
      updateRenderStats,
      dismissAlert,
      clearAlerts,
      setTargetFrameTimeMs,
      toggleLive,
    }),
    [
      updateBudgetMetrics,
      pushFrameSample,
      updateRenderStats,
      dismissAlert,
      clearAlerts,
      setTargetFrameTimeMs,
      toggleLive,
    ],
  );

  return [state, actions];
}
