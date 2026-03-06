/**
 * useBundleMonitor Hook
 *
 * React hook that manages the Bundle Size Monitor dashboard state.
 * Tracks build snapshots, budget thresholds, historical trends,
 * and generates alerts for budget violations.
 *
 * The hook does NOT poll any build system. Instead, it provides
 * imperative push methods called by the CI/CD integration layer
 * when new build data arrives.
 *
 * @module bundle-monitor/useBundleMonitor
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import type {
  BundleMonitorState,
  BundleMonitorActions,
  BundleMonitorDisplayMode,
  BundleMonitorPanel,
  BundleAlert,
  BuildSnapshot,
  TrendDataPoint,
  NetworkPreset,
} from './types';
import {
  createBundleAlertId,
  formatSize,
  BM_FRAME_BUDGET,
} from './types';

// =============================================================================
// HOOK CONFIGURATION
// =============================================================================

export interface UseBundleMonitorConfig {
  /** Initial display mode (default: 'dashboard') */
  initialDisplayMode?: BundleMonitorDisplayMode;
  /** Initially visible panels */
  initialPanels?: BundleMonitorPanel[];
  /** Initial network preset (default: '4g') */
  initialNetworkPreset?: NetworkPreset;
  /** Maximum trend data points */
  maxTrendPoints?: number;
  /** Enable automatic alerts (default: true) */
  enableAlerts?: boolean;
  /** Maximum retained alerts */
  maxAlerts?: number;
  /** Alert cooldown in ms */
  alertCooldownMs?: number;
  /** Staleness threshold in ms */
  stalenessThresholdMs?: number;
}

const ALL_PANELS: BundleMonitorPanel[] = [
  'summary', 'chunks', 'load-times', 'trends', 'ci-status', 'alerts',
];

const DEFAULT_CONFIG: Required<UseBundleMonitorConfig> = {
  initialDisplayMode: 'dashboard',
  initialPanels: ALL_PANELS,
  initialNetworkPreset: '4g',
  maxTrendPoints: BM_FRAME_BUDGET.MAX_TREND_POINTS,
  enableAlerts: true,
  maxAlerts: BM_FRAME_BUDGET.MAX_ALERTS,
  alertCooldownMs: BM_FRAME_BUDGET.ALERT_COOLDOWN_MS,
  stalenessThresholdMs: BM_FRAME_BUDGET.STALENESS_THRESHOLD_MS,
};

// =============================================================================
// HOOK
// =============================================================================

export function useBundleMonitor(
  config?: UseBundleMonitorConfig,
): [BundleMonitorState, BundleMonitorActions] {
  const cfg = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    [config],
  );

  // -------------------------------------------------------
  // STATE
  // -------------------------------------------------------

  const [currentBuild, setCurrentBuild] = useState<BuildSnapshot | null>(null);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [alerts, setAlerts] = useState<BundleAlert[]>([]);
  const [networkPreset, setNetworkPresetState] = useState<NetworkPreset>(cfg.initialNetworkPreset);
  const [isLive, setIsLive] = useState(true);
  const [displayMode, setDisplayModeState] = useState<BundleMonitorDisplayMode>(
    cfg.initialDisplayMode,
  );
  const [visiblePanels, setVisiblePanels] = useState<Set<BundleMonitorPanel>>(
    new Set(cfg.initialPanels),
  );
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(0);

  // Refs for alert cooldown
  const lastAlertTimeRef = useRef<Record<string, number>>({});
  const previousBuildRef = useRef<BuildSnapshot | null>(null);

  // -------------------------------------------------------
  // INTERNAL: ALERT GENERATION
  // -------------------------------------------------------

  const addAlert = useCallback(
    (params: Omit<BundleAlert, 'id' | 'timestamp' | 'dismissed'>) => {
      const alert: BundleAlert = {
        ...params,
        id: createBundleAlertId(),
        timestamp: Date.now(),
        dismissed: false,
      };
      setAlerts((prev) => {
        const next = [alert, ...prev];
        return next.length > cfg.maxAlerts ? next.slice(0, cfg.maxAlerts) : next;
      });
    },
    [cfg.maxAlerts],
  );

  const maybeAlert = useCallback(
    (
      key: string,
      condition: boolean,
      params: Omit<BundleAlert, 'id' | 'timestamp' | 'dismissed'>,
    ) => {
      if (!cfg.enableAlerts || !condition) return;
      const now = Date.now();
      if ((now - (lastAlertTimeRef.current[key] ?? 0)) < cfg.alertCooldownMs) return;
      lastAlertTimeRef.current[key] = now;
      addAlert(params);
    },
    [cfg.enableAlerts, cfg.alertCooldownMs, addAlert],
  );

  // -------------------------------------------------------
  // ACTIONS
  // -------------------------------------------------------

  const pushBuild = useCallback(
    (build: BuildSnapshot) => {
      if (!isLive) return;

      const prevBuild = previousBuildRef.current;
      previousBuildRef.current = build;
      setCurrentBuild(build);
      setLastUpdateTimestamp(Date.now());

      // Add trend data point
      const trendPoint: TrendDataPoint = {
        timestamp: build.timestamp,
        buildId: build.buildId,
        commitHash: build.commitHash,
        totalGzipSize: build.totalGzipSize,
        budgetUtilization: build.budgetUtilization,
        chunkCount: build.chunkCount,
        ciStatus: build.ciStatus,
      };

      setTrendData((prev) => {
        const next = [...prev, trendPoint];
        if (next.length > cfg.maxTrendPoints) {
          return next.slice(next.length - cfg.maxTrendPoints);
        }
        return next;
      });

      // Budget exceeded alert
      maybeAlert(
        'budget_exceeded',
        build.budgetStatus === 'exceeded',
        {
          severity: 'critical',
          category: 'budget',
          message: `Bundle budget exceeded! Total ${formatSize(build.totalGzipSize)} (budget: ${formatSize(build.totalBudget)}, ${(build.budgetUtilization * 100).toFixed(0)}% utilization). ${build.exceededChunkCount} chunk(s) over budget.`,
        },
      );

      // Budget warning alert
      maybeAlert(
        'budget_warning',
        build.budgetStatus === 'warning',
        {
          severity: 'warning',
          category: 'budget',
          message: `Bundle approaching budget limit: ${formatSize(build.totalGzipSize)} / ${formatSize(build.totalBudget)} (${(build.budgetUtilization * 100).toFixed(0)}%).`,
        },
      );

      // CI failing alert
      maybeAlert(
        'ci_failing',
        build.ciStatus === 'failing',
        {
          severity: 'critical',
          category: 'ci',
          message: `CI/CD budget check FAILING for build ${build.commitHash} on ${build.branch}. Merge blocked.`,
        },
      );

      // Size regression alert (compared to previous build)
      if (prevBuild) {
        const delta = build.totalGzipSize - prevBuild.totalGzipSize;
        const deltaPercent = prevBuild.totalGzipSize > 0
          ? (delta / prevBuild.totalGzipSize) * 100
          : 0;

        maybeAlert(
          'size_regression',
          deltaPercent > 5,
          {
            severity: 'warning',
            category: 'regression',
            message: `Bundle size increased by ${formatSize(delta)} (+${deltaPercent.toFixed(1)}%) from previous build.`,
          },
        );
      }
    },
    [isLive, cfg.maxTrendPoints, maybeAlert],
  );

  const setNetworkPreset = useCallback((preset: NetworkPreset) => {
    setNetworkPresetState(preset);
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, dismissed: true } : a)),
    );
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const toggleLive = useCallback(() => {
    setIsLive((prev) => !prev);
  }, []);

  const setDisplayMode = useCallback((mode: BundleMonitorDisplayMode) => {
    setDisplayModeState(mode);
  }, []);

  const togglePanel = useCallback((panel: BundleMonitorPanel) => {
    setVisiblePanels((prev) => {
      const next = new Set(prev);
      if (next.has(panel)) {
        next.delete(panel);
      } else {
        next.add(panel);
      }
      return next;
    });
  }, []);

  // -------------------------------------------------------
  // COMPUTED
  // -------------------------------------------------------

  const now = Date.now();
  const isStale = lastUpdateTimestamp > 0 && (now - lastUpdateTimestamp) > cfg.stalenessThresholdMs;

  // -------------------------------------------------------
  // ASSEMBLED STATE
  // -------------------------------------------------------

  const state: BundleMonitorState = useMemo(
    () => ({
      currentBuild,
      trendData,
      alerts: alerts.filter((a) => !a.dismissed),
      networkPreset,
      isLive,
      displayMode,
      visiblePanels,
      lastUpdateTimestamp,
      isStale,
    }),
    [
      currentBuild,
      trendData,
      alerts,
      networkPreset,
      isLive,
      displayMode,
      visiblePanels,
      lastUpdateTimestamp,
      isStale,
    ],
  );

  const actions: BundleMonitorActions = useMemo(
    () => ({
      pushBuild,
      setNetworkPreset,
      dismissAlert,
      clearAlerts,
      toggleLive,
      setDisplayMode,
      togglePanel,
    }),
    [
      pushBuild,
      setNetworkPreset,
      dismissAlert,
      clearAlerts,
      toggleLive,
      setDisplayMode,
      togglePanel,
    ],
  );

  return [state, actions];
}
