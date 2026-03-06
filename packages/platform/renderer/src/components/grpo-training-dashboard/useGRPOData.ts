/**
 * useGRPOData Hook
 *
 * React hook that manages GRPO training dashboard state via WebSocket
 * for real-time updates and REST polling as a fallback.
 *
 * The hook provides:
 *   - WebSocket connection for live training metrics
 *   - REST polling fallback when WebSocket is unavailable
 *   - Automatic reconnection with exponential backoff + jitter
 *   - Mock data generator for development/demo mode
 *   - Event type validation with unknown field rejection
 *   - Imperative update methods for external data sources
 *
 * Data Flow:
 *   WebSocket (primary) -> parseEvent -> handleMessage -> state -> dashboard
 *   REST poll (fallback) -> parseEvent -> handleMessage -> state -> dashboard
 *   Mock generator (dev)  -> handleMessage -> state -> dashboard
 *
 * Reconnection strategy:
 *   delay = min(1000 * 2^attempt, maxDelay) + random(0, 1000) jitter
 *   Resets on successful connection.
 *
 * @module grpo-training-dashboard/useGRPOData
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type {
  GRPODashboardState,
  GRPODashboardActions,
  RewardDataPoint,
  KLDataPoint,
  CompletionGroup,
  ForgettingMetrics,
  GPUStats,
  TrainingParams,
  TrainingProgress,
  TrainingStatus,
} from './types';
import type { GRPOEvent } from './GRPOEventEmitter';
import type { GRPOMockDataGenerator } from './GRPOMockDataGenerator';
import { parseGRPOEvent } from './parseGRPOEvent';

// Re-export for convenience
export { parseGRPOEvent } from './parseGRPOEvent';

// =============================================================================
// HOOK CONFIGURATION
// =============================================================================

export interface UseGRPODataConfig {
  /** WebSocket URL for live training data (default: none, uses REST only) */
  wsUrl?: string;
  /** REST API base URL for polling (default: none) */
  restUrl?: string;
  /** REST polling interval in ms (default: 5000) */
  pollIntervalMs?: number;
  /** Maximum reward history data points to retain (default: 500) */
  maxRewardHistory?: number;
  /** Maximum KL history data points to retain (default: 500) */
  maxKLHistory?: number;
  /** Maximum completion groups to retain (default: 50) */
  maxCompletionGroups?: number;
  /** WebSocket reconnect max delay in ms (default: 30000) */
  wsReconnectMaxDelayMs?: number;
  /** Enable automatic polling when WS is disconnected (default: true) */
  enableFallbackPolling?: boolean;
  /**
   * Mock data generator for development/demo mode.
   * When provided, the hook will use mock data instead of connecting
   * to a real WebSocket or REST endpoint. The generator's events are
   * routed through the same handleMessage pipeline.
   */
  mockGenerator?: GRPOMockDataGenerator;
  /**
   * Jitter range in ms added to reconnection delay (default: 1000).
   * Prevents thundering herd when multiple dashboards reconnect
   * simultaneously after a server restart.
   */
  wsReconnectJitterMs?: number;
}

const DEFAULT_CONFIG: Required<Omit<UseGRPODataConfig, 'mockGenerator'>> & { mockGenerator?: GRPOMockDataGenerator } = {
  wsUrl: '',
  restUrl: '',
  pollIntervalMs: 5000,
  maxRewardHistory: 500,
  maxKLHistory: 500,
  maxCompletionGroups: 50,
  wsReconnectMaxDelayMs: 30000,
  enableFallbackPolling: true,
  wsReconnectJitterMs: 1000,
};

// =============================================================================
// INITIAL STATE
// =============================================================================

function createInitialState(): GRPODashboardState {
  return {
    rewardHistory: [],
    klHistory: [],
    completionGroups: [],
    forgettingMetrics: null,
    trainingStatus: 'paused',
    trainingParams: { temperature: 0.7, beta: 0.04 },
    progress: {
      currentStep: 0,
      totalSteps: 0,
      elapsedSeconds: 0,
      estimatedRemainingSeconds: 0,
    },
    gpuStats: null,
    connected: false,
    lastUpdateTimestamp: 0,
  };
}

// =============================================================================
// HOOK
// =============================================================================

export function useGRPOData(
  config?: UseGRPODataConfig,
): [GRPODashboardState, GRPODashboardActions] {
  const cfg = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    [config],
  );

  // State
  const [rewardHistory, setRewardHistory] = useState<RewardDataPoint[]>([]);
  const [klHistory, setKLHistory] = useState<KLDataPoint[]>([]);
  const [completionGroups, setCompletionGroups] = useState<CompletionGroup[]>([]);
  const [forgettingMetrics, setForgettingMetrics] = useState<ForgettingMetrics | null>(null);
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>('paused');
  const [trainingParams, setTrainingParams] = useState<TrainingParams>({ temperature: 0.7, beta: 0.04 });
  const [progress, setProgress] = useState<TrainingProgress>({
    currentStep: 0,
    totalSteps: 0,
    elapsedSeconds: 0,
    estimatedRemainingSeconds: 0,
  });
  const [gpuStats, setGPUStats] = useState<GPUStats | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(0);

  // Refs for WebSocket management
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------------------------------------------------
  // MESSAGE HANDLER (shared between WS, REST, and mock)
  // ---------------------------------------------------

  const handleMessage = useCallback(
    (data: Record<string, unknown>) => {
      const now = Date.now();
      setLastUpdateTimestamp(now);

      if (data.type === 'reward' && data.point) {
        const point = data.point as RewardDataPoint;
        setRewardHistory((prev) => {
          const next = [...prev, point];
          return next.length > cfg.maxRewardHistory
            ? next.slice(next.length - cfg.maxRewardHistory)
            : next;
        });
      }

      if (data.type === 'kl' && data.point) {
        const point = data.point as KLDataPoint;
        setKLHistory((prev) => {
          const next = [...prev, point];
          return next.length > cfg.maxKLHistory
            ? next.slice(next.length - cfg.maxKLHistory)
            : next;
        });
      }

      if (data.type === 'completion' && data.group) {
        const group = data.group as CompletionGroup;
        setCompletionGroups((prev) => {
          const next = [...prev, group];
          return next.length > cfg.maxCompletionGroups
            ? next.slice(next.length - cfg.maxCompletionGroups)
            : next;
        });
      }

      if (data.type === 'forgetting' && data.metrics) {
        setForgettingMetrics(data.metrics as ForgettingMetrics);
      }

      if (data.type === 'status' && typeof data.status === 'string') {
        setTrainingStatus(data.status as TrainingStatus);
      }

      if (data.type === 'params' && data.params) {
        setTrainingParams(data.params as TrainingParams);
      }

      if (data.type === 'progress' && data.progress) {
        setProgress(data.progress as TrainingProgress);
      }

      if (data.type === 'gpu' && data.stats) {
        setGPUStats(data.stats as GPUStats);
      }

      // Bulk snapshot (REST polling response or initial hydration)
      if (data.type === 'snapshot') {
        if (data.rewardHistory) setRewardHistory(data.rewardHistory as RewardDataPoint[]);
        if (data.klHistory) setKLHistory(data.klHistory as KLDataPoint[]);
        if (data.completionGroups) setCompletionGroups(data.completionGroups as CompletionGroup[]);
        if (data.forgettingMetrics) setForgettingMetrics(data.forgettingMetrics as ForgettingMetrics);
        if (data.trainingStatus) setTrainingStatus(data.trainingStatus as TrainingStatus);
        if (data.trainingParams) setTrainingParams(data.trainingParams as TrainingParams);
        if (data.progress) setProgress(data.progress as TrainingProgress);
        if (data.gpuStats) setGPUStats(data.gpuStats as GPUStats);
      }
    },
    [cfg.maxRewardHistory, cfg.maxKLHistory, cfg.maxCompletionGroups],
  );

  // ---------------------------------------------------
  // WEBSOCKET CONNECTION
  // ---------------------------------------------------

  const connectWebSocket = useCallback(() => {
    if (!cfg.wsUrl) return;

    try {
      const ws = new WebSocket(cfg.wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        reconnectAttemptRef.current = 0;

        // Stop polling if WS is connected
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          const validated = parseGRPOEvent(raw);
          if (validated) {
            handleMessage(validated);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;

        // Exponential backoff with jitter
        const attempt = reconnectAttemptRef.current;
        const baseDelay = Math.min(
          1000 * Math.pow(2, attempt),
          cfg.wsReconnectMaxDelayMs,
        );
        const jitter = Math.random() * (cfg.wsReconnectJitterMs ?? 1000);
        const delay = baseDelay + jitter;
        reconnectAttemptRef.current = attempt + 1;

        reconnectTimerRef.current = setTimeout(connectWebSocket, delay);

        // Start fallback polling
        if (cfg.enableFallbackPolling && cfg.restUrl && !pollTimerRef.current) {
          startPolling();
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // WebSocket constructor may throw
      setConnected(false);
    }
  }, [cfg.wsUrl, cfg.wsReconnectMaxDelayMs, cfg.wsReconnectJitterMs, cfg.enableFallbackPolling, cfg.restUrl, handleMessage]);

  // ---------------------------------------------------
  // REST POLLING
  // ---------------------------------------------------

  const fetchSnapshot = useCallback(async () => {
    if (!cfg.restUrl) return;
    try {
      const response = await fetch(cfg.restUrl);
      if (response.ok) {
        const data = await response.json();
        handleMessage({ type: 'snapshot', ...data });
        setConnected(true);
      }
    } catch {
      // Polling failure is non-critical
    }
  }, [cfg.restUrl, handleMessage]);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    fetchSnapshot();
    pollTimerRef.current = setInterval(fetchSnapshot, cfg.pollIntervalMs);
  }, [fetchSnapshot, cfg.pollIntervalMs]);

  // ---------------------------------------------------
  // MOCK DATA MODE
  // ---------------------------------------------------

  useEffect(() => {
    if (!cfg.mockGenerator) return;

    const generator = cfg.mockGenerator;

    // Route mock events through the same handleMessage pipeline
    const mockCallback = (event: GRPOEvent) => {
      handleMessage(event as unknown as Record<string, unknown>);
    };

    // Mark as connected since we have a data source
    setConnected(true);

    // Start the generator if not already running
    if (!generator.isRunning) {
      generator.start(mockCallback);
    }

    return () => {
      generator.stop();
    };
  }, [cfg.mockGenerator, handleMessage]);

  // ---------------------------------------------------
  // LIFECYCLE (WS + REST)
  // ---------------------------------------------------

  useEffect(() => {
    // Skip real connection setup if mock generator is active
    if (cfg.mockGenerator) return;

    if (cfg.wsUrl) {
      connectWebSocket();
    } else if (cfg.restUrl) {
      startPolling();
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
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [cfg.wsUrl, cfg.restUrl, cfg.mockGenerator, connectWebSocket, startPolling]);

  // ---------------------------------------------------
  // ACTIONS
  // ---------------------------------------------------

  const sendCommand = useCallback(
    (command: string, payload?: Record<string, unknown>) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ command, ...payload }));
      } else if (cfg.restUrl) {
        // Fallback to REST
        fetch(`${cfg.restUrl}/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command, ...payload }),
        }).catch(() => { /* best-effort */ });
      }
    },
    [cfg.restUrl],
  );

  const pauseTraining = useCallback(() => {
    sendCommand('pause');
    setTrainingStatus('paused');

    // Also pause mock generator if active
    if (cfg.mockGenerator?.isRunning) {
      cfg.mockGenerator.stop();
    }
  }, [sendCommand, cfg.mockGenerator]);

  const resumeTraining = useCallback(() => {
    sendCommand('resume');
    setTrainingStatus('running');

    // Also resume mock generator if it was stopped
    if (cfg.mockGenerator && !cfg.mockGenerator.isRunning) {
      cfg.mockGenerator.start((event) => {
        handleMessage(event as unknown as Record<string, unknown>);
      });
    }
  }, [sendCommand, cfg.mockGenerator, handleMessage]);

  const setTemperature = useCallback(
    (value: number) => {
      const clamped = Math.max(0.1, Math.min(2.0, value));
      sendCommand('set_temperature', { value: clamped });
      setTrainingParams((prev) => ({ ...prev, temperature: clamped }));
    },
    [sendCommand],
  );

  const setBeta = useCallback(
    (value: number) => {
      const clamped = Math.max(0.001, Math.min(0.2, value));
      sendCommand('set_beta', { value: clamped });
      setTrainingParams((prev) => ({ ...prev, beta: clamped }));
    },
    [sendCommand],
  );

  const triggerBenchmark = useCallback(() => {
    sendCommand('trigger_benchmark');
  }, [sendCommand]);

  const reconnect = useCallback(() => {
    // Close existing connections
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    reconnectAttemptRef.current = 0;

    if (cfg.mockGenerator) {
      // Restart mock generator
      cfg.mockGenerator.stop();
      setConnected(true);
      cfg.mockGenerator.start((event) => {
        handleMessage(event as unknown as Record<string, unknown>);
      });
    } else if (cfg.wsUrl) {
      connectWebSocket();
    } else if (cfg.restUrl) {
      startPolling();
    }
  }, [cfg.wsUrl, cfg.restUrl, cfg.mockGenerator, connectWebSocket, startPolling, handleMessage]);

  // ---------------------------------------------------
  // ASSEMBLED STATE
  // ---------------------------------------------------

  const state: GRPODashboardState = useMemo(
    () => ({
      rewardHistory,
      klHistory,
      completionGroups,
      forgettingMetrics,
      trainingStatus,
      trainingParams,
      progress,
      gpuStats,
      connected,
      lastUpdateTimestamp,
    }),
    [
      rewardHistory,
      klHistory,
      completionGroups,
      forgettingMetrics,
      trainingStatus,
      trainingParams,
      progress,
      gpuStats,
      connected,
      lastUpdateTimestamp,
    ],
  );

  const actions: GRPODashboardActions = useMemo(
    () => ({
      pauseTraining,
      resumeTraining,
      setTemperature,
      setBeta,
      triggerBenchmark,
      reconnect,
    }),
    [pauseTraining, resumeTraining, setTemperature, setBeta, triggerBenchmark, reconnect],
  );

  return [state, actions];
}
