/**
 * useCultureDashboard Hook
 *
 * React hook that manages the multi-agent cultural health dashboard state.
 *
 * Aggregates pre-computed cultural data pushed from the backend:
 *   - Composite cultural health score across five dimensions
 *   - Per-dimension breakdowns (alignment, collaboration, norms, diversity, resilience)
 *   - Agent cultural profiles and role classifications
 *   - Community norm compliance rates
 *   - Cultural health alerts
 *
 * Performance Contract:
 *   - The hook does NOT poll, subscribe at 90Hz, or perform heavy computation.
 *   - All data arrives via imperative push methods, called by the integration
 *     layer at a maximum of 10Hz (CULTURE_FRAME_BUDGET.MAX_DATA_PUSH_RATE_HZ).
 *   - React state batching prevents per-push re-renders from exceeding budget.
 *   - Total per-frame cost of the dashboard overlay: < 0.5ms
 *     (CULTURE_FRAME_BUDGET.DASHBOARD_BUDGET_MS).
 *
 * VR Safety:
 *   This hook follows the same framework-agnostic pattern as
 *   useEconomicDashboard -- it provides imperative update methods and the
 *   caller is responsible for throttling data pushes. No direct subscriptions
 *   to any backend or manager are created inside the hook.
 *
 * @module culture-dashboard/useCultureDashboard
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import type {
  CultureDashboardState,
  CultureDashboardActions,
  CultureDashboardDisplayMode,
  CultureDashboardPanel,
  CultureHealthSnapshot,
  AgentCultureProfile,
  CommunityNorm,
  CultureAlert,
} from './types';
import { createCultureAlertId, CULTURE_FRAME_BUDGET } from './types';

// =============================================================================
// HOOK CONFIGURATION
// =============================================================================

export interface UseCultureDashboardConfig {
  /** Initial display mode (default: 'full') */
  initialDisplayMode?: CultureDashboardDisplayMode;
  /** Initially visible panels (default: all) */
  initialPanels?: CultureDashboardPanel[];
  /** Data staleness threshold in ms (default: CULTURE_FRAME_BUDGET.STALENESS_THRESHOLD_MS) */
  stalenessThresholdMs?: number;
  /** Enable automatic alert generation (default: true) */
  enableAlerts?: boolean;
  /** Maximum retained alerts (default: CULTURE_FRAME_BUDGET.MAX_ALERTS) */
  maxAlerts?: number;
  /** Alert cooldown in ms (default: CULTURE_FRAME_BUDGET.ALERT_COOLDOWN_MS) */
  alertCooldownMs?: number;
  /** Maximum agent profiles to retain (default: CULTURE_FRAME_BUDGET.MAX_AGENT_PROFILES) */
  maxAgentProfiles?: number;
}

const ALL_PANELS: CultureDashboardPanel[] = [
  'health-gauge', 'dimensions', 'timeline', 'agents', 'norms', 'alerts',
];

const DEFAULT_CONFIG: Required<UseCultureDashboardConfig> = {
  initialDisplayMode: 'full',
  initialPanels: ALL_PANELS,
  stalenessThresholdMs: CULTURE_FRAME_BUDGET.STALENESS_THRESHOLD_MS,
  enableAlerts: true,
  maxAlerts: CULTURE_FRAME_BUDGET.MAX_ALERTS,
  alertCooldownMs: CULTURE_FRAME_BUDGET.ALERT_COOLDOWN_MS,
  maxAgentProfiles: CULTURE_FRAME_BUDGET.MAX_AGENT_PROFILES,
};

// =============================================================================
// HOOK
// =============================================================================

export function useCultureDashboard(
  config?: UseCultureDashboardConfig,
): [CultureDashboardState, CultureDashboardActions] {
  const cfg = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    [config],
  );

  // -------------------------------------------------------
  // STATE
  // -------------------------------------------------------

  const [health, setHealth] = useState<CultureHealthSnapshot | null>(null);
  const [agentProfiles, setAgentProfiles] = useState<AgentCultureProfile[]>([]);
  const [norms, setNorms] = useState<CommunityNorm[]>([]);
  const [alerts, setAlerts] = useState<CultureAlert[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [displayMode, setDisplayModeState] = useState<CultureDashboardDisplayMode>(
    cfg.initialDisplayMode,
  );
  const [visiblePanels, setVisiblePanels] = useState<Set<CultureDashboardPanel>>(
    new Set(cfg.initialPanels),
  );
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(0);

  // Refs for alert cooldown tracking (O(1) per push, no per-frame cost)
  const lastAlertTimeRef = useRef<Record<string, number>>({});

  // -------------------------------------------------------
  // INTERNAL: ALERT GENERATION
  // -------------------------------------------------------

  const addAlert = useCallback(
    (params: Omit<CultureAlert, 'id' | 'timestamp' | 'dismissed'>) => {
      const alert: CultureAlert = {
        ...params,
        id: createCultureAlertId(),
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
      params: Omit<CultureAlert, 'id' | 'timestamp' | 'dismissed'>,
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

  const updateHealth = useCallback(
    (snapshot: CultureHealthSnapshot) => {
      if (!isLive) return;
      setHealth(snapshot);
      setLastUpdateTimestamp(Date.now());

      // Generate alerts for critical dimensions
      maybeAlert('culture_critical', snapshot.health === 'critical', {
        severity: 'critical',
        dimension: 'general',
        message: `Cultural health critically low: composite score ${(snapshot.compositeScore * 100).toFixed(1)}%. Intervention may be required.`,
      });

      maybeAlert('culture_strained', snapshot.health === 'strained', {
        severity: 'warning',
        dimension: 'general',
        message: `Cultural health strained: composite score ${(snapshot.compositeScore * 100).toFixed(1)}%. Monitor for deterioration.`,
      });

      // Per-dimension critical alerts
      for (const [dim, dimSnapshot] of Object.entries(snapshot.dimensions)) {
        maybeAlert(
          `dim_critical_${dim}`,
          dimSnapshot.health === 'critical',
          {
            severity: 'critical',
            dimension: dim as CultureAlert['dimension'],
            message: `${dimSnapshot.dimension} dimension critically low at ${(dimSnapshot.score * 100).toFixed(1)}%.`,
          },
        );
      }
    },
    [isLive, maybeAlert],
  );

  const updateAgentProfiles = useCallback(
    (profiles: AgentCultureProfile[]) => {
      if (!isLive) return;
      // Limit profiles to configured maximum
      const limited = profiles.length > cfg.maxAgentProfiles
        ? profiles.slice(0, cfg.maxAgentProfiles)
        : profiles;
      setAgentProfiles(limited);
      setLastUpdateTimestamp(Date.now());

      // Alert on high disruptor count
      const disruptors = limited.filter((p) => p.role === 'disruptor');
      const disruptorRatio = limited.length > 0 ? disruptors.length / limited.length : 0;
      maybeAlert('high_disruptors', disruptorRatio > 0.2, {
        severity: 'warning',
        dimension: 'norm_adherence',
        message: `${disruptors.length} disruptor agents detected (${(disruptorRatio * 100).toFixed(0)}% of population). Norms may be destabilising.`,
      });
    },
    [isLive, cfg.maxAgentProfiles, maybeAlert],
  );

  const updateNorms = useCallback(
    (newNorms: CommunityNorm[]) => {
      if (!isLive) return;
      setNorms(newNorms);
      setLastUpdateTimestamp(Date.now());

      // Alert on norms with critical compliance
      for (const norm of newNorms) {
        maybeAlert(
          `norm_critical_${norm.id}`,
          norm.health === 'critical',
          {
            severity: 'critical',
            dimension: 'norm_adherence',
            message: `Norm "${norm.name}" compliance critically low at ${(norm.complianceRate * 100).toFixed(0)}%.`,
          },
        );
      }
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

  const setDisplayMode = useCallback((mode: CultureDashboardDisplayMode) => {
    setDisplayModeState(mode);
  }, []);

  const togglePanel = useCallback((panel: CultureDashboardPanel) => {
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

  const state: CultureDashboardState = useMemo(
    () => ({
      health,
      agentProfiles,
      norms,
      alerts: alerts.filter((a) => !a.dismissed),
      isLive,
      displayMode,
      visiblePanels,
      lastUpdateTimestamp,
      stalenessThresholdMs: cfg.stalenessThresholdMs,
      isStale,
    }),
    [
      health,
      agentProfiles,
      norms,
      alerts,
      isLive,
      displayMode,
      visiblePanels,
      lastUpdateTimestamp,
      cfg.stalenessThresholdMs,
      isStale,
    ],
  );

  const actions: CultureDashboardActions = useMemo(
    () => ({
      updateHealth,
      updateAgentProfiles,
      updateNorms,
      dismissAlert,
      clearAlerts,
      toggleLive,
      setDisplayMode,
      togglePanel,
    }),
    [
      updateHealth,
      updateAgentProfiles,
      updateNorms,
      dismissAlert,
      clearAlerts,
      toggleLive,
      setDisplayMode,
      togglePanel,
    ],
  );

  return [state, actions];
}
