/**
 * useQualityGateDashboard Hook
 *
 * React hook that manages the quality gate dashboard state.
 * Aggregates data from autonomous agent workflows and provides
 * human escalation interfaces for Tier 3 approvals.
 *
 * The hook does NOT subscribe directly to any workflow manager.
 * Instead, it provides imperative update methods that the parent
 * component or integration layer calls when new data arrives.
 *
 * VR Safety:
 *   This hook uses React state batching and does NOT trigger
 *   re-renders at 90Hz. The caller should throttle updates to
 *   at most 10Hz (QG_FRAME_BUDGET.MAX_DATA_PUSH_RATE_HZ).
 *
 * @module quality-gate-dashboard/useQualityGateDashboard
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import type {
  QualityGateDashboardState,
  QualityGateDashboardActions,
  QualityGateDisplayMode,
  QualityGatePanel,
  QualityGateAlert,
  AgentWorkflow,
  EscalationRequest,
  TrustCalibration,
  ConfidenceTier,
  WorkflowStatus,
} from './types';
import {
  createQGAlertId,
  scoreToConfidenceTier,
  QG_FRAME_BUDGET,
} from './types';

// =============================================================================
// HOOK CONFIGURATION
// =============================================================================

export interface UseQualityGateDashboardConfig {
  /** Initial display mode (default: 'dashboard') */
  initialDisplayMode?: QualityGateDisplayMode;
  /** Initially visible panels (default: all) */
  initialPanels?: QualityGatePanel[];
  /** Data staleness threshold in ms */
  stalenessThresholdMs?: number;
  /** Enable automatic alert generation (default: true) */
  enableAlerts?: boolean;
  /** Maximum retained alerts */
  maxAlerts?: number;
  /** Alert cooldown in ms */
  alertCooldownMs?: number;
}

const ALL_PANELS: QualityGatePanel[] = [
  'tier-overview', 'workflows', 'failures', 'escalations', 'calibration', 'alerts',
];

const DEFAULT_CONFIG: Required<UseQualityGateDashboardConfig> = {
  initialDisplayMode: 'dashboard',
  initialPanels: ALL_PANELS,
  stalenessThresholdMs: QG_FRAME_BUDGET.STALENESS_THRESHOLD_MS,
  enableAlerts: true,
  maxAlerts: QG_FRAME_BUDGET.MAX_ALERTS,
  alertCooldownMs: QG_FRAME_BUDGET.ALERT_COOLDOWN_MS,
};

const EMPTY_TIER_COUNTS: Record<ConfidenceTier, number> = {
  tier1: 0,
  tier2: 0,
  tier3: 0,
};

const EMPTY_STATUS_COUNTS: Record<WorkflowStatus, number> = {
  running: 0,
  completed: 0,
  failed: 0,
  pending_approval: 0,
  paused: 0,
  cancelled: 0,
};

// =============================================================================
// HOOK
// =============================================================================

export function useQualityGateDashboard(
  config?: UseQualityGateDashboardConfig,
): [QualityGateDashboardState, QualityGateDashboardActions] {
  const cfg = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    [config],
  );

  // -------------------------------------------------------
  // STATE
  // -------------------------------------------------------

  const [workflows, setWorkflows] = useState<AgentWorkflow[]>([]);
  const [pendingEscalations, setPendingEscalations] = useState<EscalationRequest[]>([]);
  const [calibration, setCalibration] = useState<TrustCalibration | null>(null);
  const [alerts, setAlerts] = useState<QualityGateAlert[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [displayMode, setDisplayModeState] = useState<QualityGateDisplayMode>(
    cfg.initialDisplayMode,
  );
  const [visiblePanels, setVisiblePanels] = useState<Set<QualityGatePanel>>(
    new Set(cfg.initialPanels),
  );
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(0);

  // Refs for alert cooldown tracking
  const lastAlertTimeRef = useRef<Record<string, number>>({});

  // -------------------------------------------------------
  // INTERNAL: ALERT GENERATION
  // -------------------------------------------------------

  const addAlert = useCallback(
    (params: Omit<QualityGateAlert, 'id' | 'timestamp' | 'dismissed'>) => {
      const alert: QualityGateAlert = {
        ...params,
        id: createQGAlertId(),
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
      params: Omit<QualityGateAlert, 'id' | 'timestamp' | 'dismissed'>,
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

  const updateWorkflow = useCallback(
    (workflow: AgentWorkflow) => {
      if (!isLive) return;
      setWorkflows((prev) => {
        const idx = prev.findIndex((w) => w.id === workflow.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = workflow;
          return next;
        }
        return [...prev, workflow];
      });
      setLastUpdateTimestamp(Date.now());

      // Alert on failures
      maybeAlert(
        `failure_${workflow.id}`,
        workflow.status === 'failed',
        {
          severity: 'critical',
          category: 'failure',
          message: `Workflow "${workflow.workflowName}" (${workflow.agentName}) failed: ${workflow.failure?.message ?? 'Unknown error'}.`,
        },
      );

      // Alert on new Tier 3 escalations
      maybeAlert(
        `escalation_${workflow.id}`,
        workflow.status === 'pending_approval',
        {
          severity: 'warning',
          category: 'escalation',
          message: `Workflow "${workflow.workflowName}" requires human approval (confidence: ${(workflow.confidenceScore * 100).toFixed(0)}%).`,
        },
      );
    },
    [isLive, maybeAlert],
  );

  const removeWorkflow = useCallback(
    (workflowId: string) => {
      setWorkflows((prev) => prev.filter((w) => w.id !== workflowId));
    },
    [],
  );

  const addEscalation = useCallback(
    (escalation: EscalationRequest) => {
      if (!isLive) return;
      setPendingEscalations((prev) => {
        const idx = prev.findIndex((e) => e.id === escalation.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = escalation;
          return next;
        }
        return [...prev, escalation];
      });
      setLastUpdateTimestamp(Date.now());

      maybeAlert(
        `new_escalation_${escalation.id}`,
        !escalation.resolved,
        {
          severity: 'warning',
          category: 'escalation',
          message: `New escalation from agent ${escalation.agentId}: ${escalation.requestDescription}`,
        },
      );
    },
    [isLive, maybeAlert],
  );

  const resolveEscalation = useCallback(
    (
      escalationId: string,
      resolution: 'approved' | 'rejected' | 'deferred',
      resolvedBy: string,
    ) => {
      const now = Date.now();
      setPendingEscalations((prev) =>
        prev.map((e) =>
          e.id === escalationId
            ? { ...e, resolved: true, resolution, resolvedBy, resolvedAt: now }
            : e,
        ),
      );

      // Also update the associated workflow status
      setWorkflows((prev) =>
        prev.map((w) => {
          if (w.escalation?.id === escalationId) {
            const updatedEscalation = {
              ...w.escalation,
              resolved: true,
              resolution,
              resolvedBy,
              resolvedAt: now,
            };
            return {
              ...w,
              status: resolution === 'approved' ? 'running' as const : 'cancelled' as const,
              escalation: updatedEscalation,
              lastUpdateAt: now,
            };
          }
          return w;
        }),
      );
    },
    [],
  );

  const updateCalibration = useCallback(
    (newCalibration: TrustCalibration) => {
      if (!isLive) return;
      setCalibration(newCalibration);
      setLastUpdateTimestamp(Date.now());

      // Alert on poor calibration
      maybeAlert(
        'calibration_poor',
        newCalibration.calibrationScore < 0.6,
        {
          severity: 'warning',
          category: 'calibration',
          message: `Trust calibration score dropped to ${(newCalibration.calibrationScore * 100).toFixed(0)}%. Confidence thresholds may need adjustment.`,
        },
      );

      // Alert on high false negative rate
      const fnRate = newCalibration.totalDecisions > 0
        ? newCalibration.falseNegatives / newCalibration.totalDecisions
        : 0;
      maybeAlert(
        'calibration_fn',
        fnRate > 0.05,
        {
          severity: 'critical',
          category: 'calibration',
          message: `False negative rate at ${(fnRate * 100).toFixed(1)}% -- agent decisions that should have been escalated but were not.`,
        },
      );
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

  const setDisplayMode = useCallback((mode: QualityGateDisplayMode) => {
    setDisplayModeState(mode);
  }, []);

  const togglePanel = useCallback((panel: QualityGatePanel) => {
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
  // COMPUTED VALUES
  // -------------------------------------------------------

  const tierCounts = useMemo(() => {
    const counts = { ...EMPTY_TIER_COUNTS };
    for (const w of workflows) {
      counts[w.tier]++;
    }
    return counts;
  }, [workflows]);

  const statusCounts = useMemo(() => {
    const counts = { ...EMPTY_STATUS_COUNTS };
    for (const w of workflows) {
      counts[w.status]++;
    }
    return counts;
  }, [workflows]);

  const activeFailureCount = useMemo(
    () => workflows.filter((w) => w.status === 'failed').length,
    [workflows],
  );

  const now = Date.now();
  const isStale = lastUpdateTimestamp > 0 && (now - lastUpdateTimestamp) > cfg.stalenessThresholdMs;

  // -------------------------------------------------------
  // ASSEMBLED STATE
  // -------------------------------------------------------

  const state: QualityGateDashboardState = useMemo(
    () => ({
      workflows,
      pendingEscalations: pendingEscalations.filter((e) => !e.resolved),
      calibration,
      alerts: alerts.filter((a) => !a.dismissed),
      isLive,
      displayMode,
      visiblePanels,
      lastUpdateTimestamp,
      isStale,
      tierCounts,
      statusCounts,
      activeFailureCount,
    }),
    [
      workflows,
      pendingEscalations,
      calibration,
      alerts,
      isLive,
      displayMode,
      visiblePanels,
      lastUpdateTimestamp,
      isStale,
      tierCounts,
      statusCounts,
      activeFailureCount,
    ],
  );

  const actions: QualityGateDashboardActions = useMemo(
    () => ({
      updateWorkflow,
      removeWorkflow,
      addEscalation,
      resolveEscalation,
      updateCalibration,
      dismissAlert,
      clearAlerts,
      toggleLive,
      setDisplayMode,
      togglePanel,
    }),
    [
      updateWorkflow,
      removeWorkflow,
      addEscalation,
      resolveEscalation,
      updateCalibration,
      dismissAlert,
      clearAlerts,
      toggleLive,
      setDisplayMode,
      togglePanel,
    ],
  );

  return [state, actions];
}
