/**
 * useEconomicDashboard Hook
 *
 * React hook that manages the holographic economic dashboard state.
 *
 * Aggregates pre-computed economic data pushed from the backend:
 *   - Inflation rate (CPI-style)
 *   - Gini coefficient (wealth inequality)
 *   - Currency velocity (transaction flow)
 *   - Faucet/sink ratios (creation vs destruction)
 *   - PID controller status (feedback stabilisation)
 *
 * Performance contract:
 *   - The hook does NOT poll, subscribe at 90Hz, or perform heavy computation.
 *   - All data arrives via imperative push methods, called by the integration
 *     layer at a maximum of 10Hz (FRAME_BUDGET.MAX_DATA_PUSH_RATE_HZ).
 *   - React state batching prevents per-push re-renders from exceeding budget.
 *   - Total per-frame cost of the dashboard overlay: < 0.5ms
 *     (FRAME_BUDGET.DASHBOARD_BUDGET_MS).
 *
 * VR Safety:
 *   This hook follows the same framework-agnostic pattern as
 *   useVRPerformance -- it provides imperative update methods and the
 *   caller is responsible for throttling data pushes. No direct subscriptions
 *   to any backend or manager are created inside the hook.
 *
 * @module economic-dashboard/useEconomicDashboard
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import type {
  EconomicDashboardState,
  EconomicDashboardActions,
  EconDashboardDisplayMode,
  EconDashboardPanel,
  InflationSnapshot,
  GiniSnapshot,
  VelocitySnapshot,
  FaucetSinkSnapshot,
  PIDControllerSnapshot,
  EconomicAlert,
} from './types';
import { createEconAlertId, FRAME_BUDGET } from './types';

// =============================================================================
// HOOK CONFIGURATION
// =============================================================================

export interface UseEconomicDashboardConfig {
  /** Initial display mode (default: 'full') */
  initialDisplayMode?: EconDashboardDisplayMode;
  /** Initially visible panels (default: all) */
  initialPanels?: EconDashboardPanel[];
  /** Data staleness threshold in ms (default: FRAME_BUDGET.STALENESS_THRESHOLD_MS) */
  stalenessThresholdMs?: number;
  /** Enable automatic alert generation (default: true) */
  enableAlerts?: boolean;
  /** Maximum retained alerts (default: FRAME_BUDGET.MAX_ALERTS) */
  maxAlerts?: number;
  /** Alert cooldown in ms (default: FRAME_BUDGET.ALERT_COOLDOWN_MS) */
  alertCooldownMs?: number;
}

const ALL_PANELS: EconDashboardPanel[] = [
  'inflation', 'gini', 'velocity', 'faucet-sink', 'pid', 'alerts',
];

const DEFAULT_CONFIG: Required<UseEconomicDashboardConfig> = {
  initialDisplayMode: 'full',
  initialPanels: ALL_PANELS,
  stalenessThresholdMs: FRAME_BUDGET.STALENESS_THRESHOLD_MS,
  enableAlerts: true,
  maxAlerts: FRAME_BUDGET.MAX_ALERTS,
  alertCooldownMs: FRAME_BUDGET.ALERT_COOLDOWN_MS,
};

// =============================================================================
// HOOK
// =============================================================================

export function useEconomicDashboard(
  config?: UseEconomicDashboardConfig,
): [EconomicDashboardState, EconomicDashboardActions] {
  const cfg = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    [config],
  );

  // -------------------------------------------------------
  // STATE
  // -------------------------------------------------------

  const [inflation, setInflation] = useState<InflationSnapshot | null>(null);
  const [gini, setGini] = useState<GiniSnapshot | null>(null);
  const [velocity, setVelocity] = useState<VelocitySnapshot | null>(null);
  const [faucetSink, setFaucetSink] = useState<FaucetSinkSnapshot | null>(null);
  const [pid, setPid] = useState<PIDControllerSnapshot | null>(null);
  const [alerts, setAlerts] = useState<EconomicAlert[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [displayMode, setDisplayModeState] = useState<EconDashboardDisplayMode>(
    cfg.initialDisplayMode,
  );
  const [visiblePanels, setVisiblePanels] = useState<Set<EconDashboardPanel>>(
    new Set(cfg.initialPanels),
  );
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(0);

  // Refs for alert cooldown tracking (O(1) per push, no per-frame cost)
  const lastAlertTimeRef = useRef<Record<string, number>>({});

  // -------------------------------------------------------
  // INTERNAL: ALERT GENERATION
  // -------------------------------------------------------

  const addAlert = useCallback(
    (params: Omit<EconomicAlert, 'id' | 'timestamp' | 'dismissed'>) => {
      const alert: EconomicAlert = {
        ...params,
        id: createEconAlertId(),
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
      params: Omit<EconomicAlert, 'id' | 'timestamp' | 'dismissed'>,
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

  const updateInflation = useCallback(
    (snapshot: InflationSnapshot) => {
      if (!isLive) return;
      setInflation(snapshot);
      setLastUpdateTimestamp(Date.now());

      maybeAlert('inflation_critical', snapshot.health === 'critical', {
        severity: 'critical',
        metric: 'inflation',
        message: `Inflation rate ${snapshot.currentRate.toFixed(2)}% is critically divergent from target ${snapshot.targetRate.toFixed(2)}%.`,
      });
      maybeAlert('inflation_warning', snapshot.health === 'warning', {
        severity: 'warning',
        metric: 'inflation',
        message: `Inflation rate ${snapshot.currentRate.toFixed(2)}% is outside acceptable bounds.`,
      });
    },
    [isLive, maybeAlert],
  );

  const updateGini = useCallback(
    (snapshot: GiniSnapshot) => {
      if (!isLive) return;
      setGini(snapshot);
      setLastUpdateTimestamp(Date.now());

      maybeAlert('gini_critical', snapshot.health === 'critical', {
        severity: 'critical',
        metric: 'gini',
        message: `Gini coefficient ${snapshot.coefficient.toFixed(3)} exceeds critical threshold. Wealth concentration dangerously high.`,
      });
    },
    [isLive, maybeAlert],
  );

  const updateVelocity = useCallback(
    (snapshot: VelocitySnapshot) => {
      if (!isLive) return;
      setVelocity(snapshot);
      setLastUpdateTimestamp(Date.now());

      maybeAlert('velocity_low', snapshot.health === 'warning' && snapshot.currentVelocity < snapshot.targetBand[0], {
        severity: 'warning',
        metric: 'velocity',
        message: `Currency velocity ${snapshot.currentVelocity.toFixed(2)} below minimum target ${snapshot.targetBand[0].toFixed(2)}. Economy may be stagnating.`,
      });
      maybeAlert('velocity_high', snapshot.health === 'warning' && snapshot.currentVelocity > snapshot.targetBand[1], {
        severity: 'warning',
        metric: 'velocity',
        message: `Currency velocity ${snapshot.currentVelocity.toFixed(2)} above maximum target ${snapshot.targetBand[1].toFixed(2)}. Possible speculative bubble.`,
      });
    },
    [isLive, maybeAlert],
  );

  const updateFaucetSink = useCallback(
    (snapshot: FaucetSinkSnapshot) => {
      if (!isLive) return;
      setFaucetSink(snapshot);
      setLastUpdateTimestamp(Date.now());

      maybeAlert('faucet_sink_imbalance', snapshot.health === 'critical', {
        severity: 'critical',
        metric: 'faucet_sink',
        message: `Faucet/sink ratio ${snapshot.ratio.toFixed(2)}x critically imbalanced. Net ${snapshot.ratio > 1 ? 'inflationary' : 'deflationary'} pressure.`,
      });
    },
    [isLive, maybeAlert],
  );

  const updatePID = useCallback(
    (snapshot: PIDControllerSnapshot) => {
      if (!isLive) return;
      setPid(snapshot);
      setLastUpdateTimestamp(Date.now());

      maybeAlert('pid_windup', snapshot.integralWindup, {
        severity: 'warning',
        metric: 'pid',
        message: `PID integral windup detected on ${snapshot.controlVariable}. Controller may be saturated.`,
      });
      maybeAlert('pid_critical', snapshot.health === 'critical', {
        severity: 'critical',
        metric: 'pid',
        message: `PID controller for ${snapshot.controlVariable} in critical state. Error: ${snapshot.error.toFixed(4)}.`,
      });
    },
    [isLive, maybeAlert],
  );

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

  const setDisplayMode = useCallback((mode: EconDashboardDisplayMode) => {
    setDisplayModeState(mode);
  }, []);

  const togglePanel = useCallback((panel: EconDashboardPanel) => {
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
  // ASSEMBLED STATE
  // -------------------------------------------------------

  const now = Date.now();
  const isStale = lastUpdateTimestamp > 0 && (now - lastUpdateTimestamp) > cfg.stalenessThresholdMs;

  const state: EconomicDashboardState = useMemo(
    () => ({
      inflation,
      gini,
      velocity,
      faucetSink,
      pid,
      alerts: alerts.filter((a) => !a.dismissed),
      isLive,
      displayMode,
      visiblePanels,
      lastUpdateTimestamp,
      stalenessThresholdMs: cfg.stalenessThresholdMs,
      isStale,
    }),
    [
      inflation,
      gini,
      velocity,
      faucetSink,
      pid,
      alerts,
      isLive,
      displayMode,
      visiblePanels,
      lastUpdateTimestamp,
      cfg.stalenessThresholdMs,
      isStale,
    ],
  );

  const actions: EconomicDashboardActions = useMemo(
    () => ({
      updateInflation,
      updateGini,
      updateVelocity,
      updateFaucetSink,
      updatePID,
      dismissAlert,
      clearAlerts,
      toggleLive,
      setDisplayMode,
      togglePanel,
    }),
    [
      updateInflation,
      updateGini,
      updateVelocity,
      updateFaucetSink,
      updatePID,
      dismissAlert,
      clearAlerts,
      toggleLive,
      setDisplayMode,
      togglePanel,
    ],
  );

  return [state, actions];
}
