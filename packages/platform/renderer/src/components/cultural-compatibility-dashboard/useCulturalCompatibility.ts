/**
 * useCulturalCompatibility Hook
 *
 * React hook managing the Cultural Compatibility Dashboard state.
 * Handles WebSocket connections to CulturalHealthWebSocket for real-time
 * snapshot ingestion, and exposes imperative push methods for all dashboard
 * sub-panels: cooperation matrix, profiles, norm convergence, drift alerts,
 * and population health.
 *
 * WebSocket Integration:
 *   - Connects to CulturalHealthWebSocket at the configured URL
 *   - Subscribes to all subsystems (norm_adoption, cooperation, drift, etc.)
 *   - Processes incoming snapshots into dashboard-specific state
 *   - Auto-reconnects on disconnect with configurable backoff
 *   - Tracks connection status for UI indicators
 *
 * Performance Contract:
 *   - No computation heavier than O(n) in state updates (n = agent count)
 *   - React state batching prevents per-push excessive re-renders
 *   - WebSocket message parsing is O(1) per message (JSON.parse)
 *   - All heavy analysis done server-side; hook is pure data relay
 *
 * @module cultural-compatibility-dashboard/useCulturalCompatibility
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type {
  CulturalCompatibilityState,
  CulturalCompatibilityActions,
  CompatibilityDisplayMode,
  CooperationMatrix,
  CompatibilityProfile,
  NormConvergenceState,
  DriftAlert,
  PopulationHealthState,
} from './types';
import {
  COMPATIBILITY_FRAME_BUDGET,
  createCompatibilityAlertId,
  classifyHealthLevel,
  NORM_CHART_COLORS,
} from './types';
import type {
  CulturalHealthSnapshot,
  CulturalHealthMessage,
  CulturalDimension,
  TimeSample,
} from '../../CulturalHealthTypes';

// =============================================================================
// HOOK CONFIGURATION
// =============================================================================

export interface UseCulturalCompatibilityConfig {
  /** WebSocket URL for CulturalHealthWebSocket (default: null = no auto-connect) */
  wsUrl?: string | null;
  /** Initial display mode (default: 'full') */
  initialDisplayMode?: CompatibilityDisplayMode;
  /** Data staleness threshold in ms */
  stalenessThresholdMs?: number;
  /** Maximum drift alerts retained */
  maxDriftAlerts?: number;
  /** Alert cooldown in ms */
  alertCooldownMs?: number;
  /** Maximum profiles displayed */
  maxProfiles?: number;
  /** Maximum heatmap agents */
  maxHeatmapAgents?: number;
  /** Auto-reconnect on WebSocket disconnect */
  autoReconnect?: boolean;
  /** Maximum reconnect attempts */
  maxReconnectAttempts?: number;
  /** Reconnect interval in ms */
  reconnectIntervalMs?: number;
}

const DEFAULT_CONFIG: Required<UseCulturalCompatibilityConfig> = {
  wsUrl: null,
  initialDisplayMode: 'full',
  stalenessThresholdMs: COMPATIBILITY_FRAME_BUDGET.STALENESS_THRESHOLD_MS,
  maxDriftAlerts: COMPATIBILITY_FRAME_BUDGET.MAX_DRIFT_ALERTS,
  alertCooldownMs: COMPATIBILITY_FRAME_BUDGET.ALERT_COOLDOWN_MS,
  maxProfiles: COMPATIBILITY_FRAME_BUDGET.MAX_PROFILES,
  maxHeatmapAgents: COMPATIBILITY_FRAME_BUDGET.MAX_HEATMAP_AGENTS,
  autoReconnect: true,
  maxReconnectAttempts: COMPATIBILITY_FRAME_BUDGET.MAX_RECONNECT_ATTEMPTS,
  reconnectIntervalMs: COMPATIBILITY_FRAME_BUDGET.RECONNECT_INTERVAL_MS,
};

// =============================================================================
// HOOK
// =============================================================================

export function useCulturalCompatibility(
  config?: UseCulturalCompatibilityConfig,
): [CulturalCompatibilityState, CulturalCompatibilityActions] {
  const cfg = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    [config],
  );

  // -------------------------------------------------------
  // STATE
  // -------------------------------------------------------

  const [cooperationMatrix, setCooperationMatrix] = useState<CooperationMatrix | null>(null);
  const [profiles, setProfiles] = useState<CompatibilityProfile[]>([]);
  const [normConvergence, setNormConvergence] = useState<NormConvergenceState | null>(null);
  const [driftAlerts, setDriftAlerts] = useState<DriftAlert[]>([]);
  const [populationHealth, setPopulationHealth] = useState<PopulationHealthState | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected');
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(0);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [displayMode, setDisplayModeState] = useState<CompatibilityDisplayMode>(
    cfg.initialDisplayMode,
  );

  // Refs for WebSocket and reconnect management
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAlertTimeRef = useRef<Record<string, number>>({});

  // -------------------------------------------------------
  // WEBSOCKET MANAGEMENT
  // -------------------------------------------------------

  const connectWebSocket = useCallback(() => {
    if (!cfg.wsUrl) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionStatus('connecting');

    try {
      const ws = new WebSocket(cfg.wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
        reconnectCountRef.current = 0;

        // Subscribe to all subsystems
        ws.send(JSON.stringify({
          type: 'subscribe',
          payload: {
            subsystems: ['norm_adoption', 'cooperation', 'drift', 'boundary', 'metanorm', 'alerts'],
          },
        }));
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!isLive) return;
        try {
          const message = JSON.parse(event.data as string) as CulturalHealthMessage;
          handleWebSocketMessage(message);
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        wsRef.current = null;

        // Auto-reconnect
        if (cfg.autoReconnect && reconnectCountRef.current < cfg.maxReconnectAttempts) {
          reconnectCountRef.current++;
          reconnectTimerRef.current = setTimeout(
            connectWebSocket,
            cfg.reconnectIntervalMs,
          );
        }
      };

      ws.onerror = () => {
        setConnectionStatus('error');
      };
    } catch {
      setConnectionStatus('error');
    }
  }, [cfg.wsUrl, cfg.autoReconnect, cfg.maxReconnectAttempts, cfg.reconnectIntervalMs, isLive]);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((message: CulturalHealthMessage) => {
    switch (message.type) {
      case 'snapshot': {
        const snapshot = message.payload as CulturalHealthSnapshot;
        processSnapshotInternal(snapshot);
        break;
      }
      case 'alert': {
        const alert = message.payload as {
          id: string;
          severity: 'info' | 'warning' | 'critical';
          subsystem: string;
          message: string;
          timestamp: number;
        };
        if (alert.subsystem === 'drift') {
          pushDriftAlertInternal({
            id: alert.id,
            severity: alert.severity,
            dimension: 'competition_cooperation',
            message: alert.message,
            timestamp: alert.timestamp,
            driftMagnitude: 0,
            driftDirection: 0,
            currentPosition: 0,
            previousPosition: 0,
            acknowledged: false,
            affectedAgentCount: 0,
          });
        }
        break;
      }
      case 'pong':
        // Keep-alive response, no action needed
        break;
      default:
        break;
    }
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (cfg.wsUrl) {
      connectWebSocket();
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [cfg.wsUrl, connectWebSocket]);

  // -------------------------------------------------------
  // INTERNAL: SNAPSHOT PROCESSING
  // -------------------------------------------------------

  const processSnapshotInternal = useCallback((snapshot: CulturalHealthSnapshot) => {
    setLastUpdateTimestamp(Date.now());

    // Extract norm convergence from snapshot
    const normEntries = Object.entries(snapshot.norms);
    if (normEntries.length > 0) {
      const normConvergenceData: NormConvergenceState = {
        norms: normEntries.slice(0, 20).map(([normId, norm], index) => ({
          normId,
          normName: norm.description || normId,
          currentAdoptionRate: norm.adoptionRate,
          lifecycleState: norm.lifecycleState,
          trend: norm.adoptionTrend.slice(-COMPATIBILITY_FRAME_BUDGET.MAX_TREND_SAMPLES),
          color: NORM_CHART_COLORS[index % NORM_CHART_COLORS.length],
        })),
        averageConvergence: snapshot.averageAdoptionRate,
        isPopulationConverging: snapshot.averageAdoptionRate > 0.5,
        lastUpdateTimestamp: snapshot.lastUpdateTimestamp,
      };
      setNormConvergence(normConvergenceData);
    }

    // Extract drift alerts from cultural drift state
    const driftState = snapshot.culturalDrift;
    if (driftState.isTransitioning) {
      const dimensions = Object.keys(driftState.dimensions) as CulturalDimension[];
      for (const dim of dimensions) {
        const vector = driftState.dimensions[dim];
        if (vector.magnitude > 0.03) {
          const now = Date.now();
          const key = `drift_${dim}`;
          if ((now - (lastAlertTimeRef.current[key] ?? 0)) >= cfg.alertCooldownMs) {
            lastAlertTimeRef.current[key] = now;
            pushDriftAlertInternal({
              id: createCompatibilityAlertId(),
              severity: vector.magnitude > 0.08 ? 'critical' : vector.magnitude > 0.05 ? 'warning' : 'info',
              dimension: dim,
              message: `Cultural drift detected on ${dim.replace(/_/g, ' ')}: magnitude ${(vector.magnitude * 100).toFixed(1)}%`,
              timestamp: now,
              driftMagnitude: vector.magnitude,
              driftDirection: vector.direction,
              currentPosition: vector.currentPosition,
              previousPosition: vector.previousPosition,
              acknowledged: false,
              affectedAgentCount: snapshot.populationSize,
            });
          }
        }
      }
    }

    // Extract population health
    const popHealth: PopulationHealthState = {
      totalAgents: snapshot.populationSize,
      activeAgents: snapshot.populationSize,
      modelBreakdown: [],
      overallCooperation: snapshot.populationCooperation.smoothedCooperationRatio,
      overallHealth: classifyHealthLevel(snapshot.overallHealthScore),
      diversityIndex: snapshot.boundaryPermeability.networkConnectivity,
      stabilityScore: snapshot.culturalDrift.overallStability,
      lastUpdateTimestamp: snapshot.lastUpdateTimestamp,
    };

    // Build model breakdown from group cooperation data
    const groupEntries = Object.entries(snapshot.groupCooperation);
    if (groupEntries.length > 0) {
      popHealth.modelBreakdown = groupEntries.map(([groupId, coop]) => ({
        modelFamily: groupId,
        agentCount: coop.uniqueCooperatingPairs,
        averageCooperation: coop.smoothedCooperationRatio,
        averageNormAdherence: snapshot.averageAdoptionRate,
        crossModelCompatibility: coop.reciprocityIndex,
        health: classifyHealthLevel(coop.smoothedCooperationRatio),
        cooperationTrend: coop.cooperationTrend.slice(-COMPATIBILITY_FRAME_BUDGET.MAX_TREND_SAMPLES),
      }));
    }

    setPopulationHealth(popHealth);
  }, [cfg.alertCooldownMs]);

  // -------------------------------------------------------
  // INTERNAL: DRIFT ALERT MANAGEMENT
  // -------------------------------------------------------

  const pushDriftAlertInternal = useCallback((alert: DriftAlert) => {
    setDriftAlerts((prev) => {
      const next = [alert, ...prev];
      return next.length > cfg.maxDriftAlerts ? next.slice(0, cfg.maxDriftAlerts) : next;
    });
  }, [cfg.maxDriftAlerts]);

  // -------------------------------------------------------
  // ACTIONS (External API)
  // -------------------------------------------------------

  const updateCooperationMatrix = useCallback(
    (matrix: CooperationMatrix) => {
      if (!isLive) return;
      // Limit matrix to configured max agents
      if (matrix.agentIds.length > cfg.maxHeatmapAgents) {
        const limitedIds = matrix.agentIds.slice(0, cfg.maxHeatmapAgents);
        const limitedNames = matrix.agentNames.slice(0, cfg.maxHeatmapAgents);
        const limitedSet = new Set(limitedIds);
        const limitedCells = matrix.cells.filter(
          (c) => limitedSet.has(c.agentA) && limitedSet.has(c.agentB),
        );
        setCooperationMatrix({
          ...matrix,
          agentIds: limitedIds,
          agentNames: limitedNames,
          cells: limitedCells,
        });
      } else {
        setCooperationMatrix(matrix);
      }
      setLastUpdateTimestamp(Date.now());
    },
    [isLive, cfg.maxHeatmapAgents],
  );

  const updateProfiles = useCallback(
    (newProfiles: CompatibilityProfile[]) => {
      if (!isLive) return;
      const limited = newProfiles.length > cfg.maxProfiles
        ? newProfiles.slice(0, cfg.maxProfiles)
        : newProfiles;
      setProfiles(limited);
      setLastUpdateTimestamp(Date.now());
    },
    [isLive, cfg.maxProfiles],
  );

  const updateNormConvergence = useCallback(
    (convergence: NormConvergenceState) => {
      if (!isLive) return;
      setNormConvergence(convergence);
      setLastUpdateTimestamp(Date.now());
    },
    [isLive],
  );

  const pushDriftAlert = useCallback(
    (alert: DriftAlert) => {
      if (!isLive) return;
      pushDriftAlertInternal(alert);
    },
    [isLive, pushDriftAlertInternal],
  );

  const acknowledgeDriftAlert = useCallback((id: string) => {
    setDriftAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)),
    );
  }, []);

  const clearDriftAlerts = useCallback(() => {
    setDriftAlerts([]);
  }, []);

  const updatePopulationHealth = useCallback(
    (health: PopulationHealthState) => {
      if (!isLive) return;
      setPopulationHealth(health);
      setLastUpdateTimestamp(Date.now());
    },
    [isLive],
  );

  const selectAgent = useCallback((agentId: string | null) => {
    setSelectedAgentId(agentId);
  }, []);

  const toggleLive = useCallback(() => {
    setIsLive((prev) => !prev);
  }, []);

  const setDisplayMode = useCallback((mode: CompatibilityDisplayMode) => {
    setDisplayModeState(mode);
  }, []);

  const processSnapshot = useCallback(
    (snapshot: CulturalHealthSnapshot) => {
      if (!isLive) return;
      processSnapshotInternal(snapshot);
    },
    [isLive, processSnapshotInternal],
  );

  // -------------------------------------------------------
  // ASSEMBLED STATE
  // -------------------------------------------------------

  const now = Date.now();
  const isStale = lastUpdateTimestamp > 0 && (now - lastUpdateTimestamp) > cfg.stalenessThresholdMs;

  const state: CulturalCompatibilityState = useMemo(
    () => ({
      cooperationMatrix,
      profiles,
      normConvergence,
      driftAlerts: driftAlerts.filter((a) => !a.acknowledged),
      populationHealth,
      isLive,
      connectionStatus,
      lastUpdateTimestamp,
      isStale,
      selectedAgentId,
      displayMode,
    }),
    [
      cooperationMatrix,
      profiles,
      normConvergence,
      driftAlerts,
      populationHealth,
      isLive,
      connectionStatus,
      lastUpdateTimestamp,
      isStale,
      selectedAgentId,
      displayMode,
    ],
  );

  const actions: CulturalCompatibilityActions = useMemo(
    () => ({
      updateCooperationMatrix,
      updateProfiles,
      updateNormConvergence,
      pushDriftAlert,
      acknowledgeDriftAlert,
      clearDriftAlerts,
      updatePopulationHealth,
      selectAgent,
      toggleLive,
      setDisplayMode,
      processSnapshot,
    }),
    [
      updateCooperationMatrix,
      updateProfiles,
      updateNormConvergence,
      pushDriftAlert,
      acknowledgeDriftAlert,
      clearDriftAlerts,
      updatePopulationHealth,
      selectAgent,
      toggleLive,
      setDisplayMode,
      processSnapshot,
    ],
  );

  return [state, actions];
}
