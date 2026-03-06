/**
 * useSpatialInference Hook
 *
 * React hook that manages the full spatial inference pipeline lifecycle:
 * - SpatialInferenceComputePipeline (WebGPU compute shaders)
 * - SpatialReasoningEngine (CPU fallback)
 * - InferenceScheduler (timing orchestration + double buffer)
 *
 * Provides reactive state updates at a controlled polling rate (not 90Hz)
 * so React re-renders don't interfere with the VR render loop.
 *
 * ARCHITECTURE:
 * ```
 *   useSpatialInference() hook
 *        |
 *        |-- SpatialInferenceComputePipeline (WebGPU, optional)
 *        |-- SpatialReasoningEngine (CPU, always available)
 *        |-- InferenceScheduler (1-5Hz timing loop)
 *        |       |
 *        |       |-- AgentStateBuffer<CachedSpatialState> (double-buffered)
 *        |
 *        |-- React state polling (500ms interval, NOT tied to inference Hz)
 * ```
 *
 * The hook polls the front buffer and scheduler metrics at a low frequency
 * (2Hz default) to update React state. This is intentionally slower than
 * the inference rate to avoid unnecessary React re-renders.
 *
 * @module spatial-inference/useSpatialInference
 */

import { useState, useRef, useCallback, useEffect } from 'react';

import {
  SpatialInferenceComputePipeline,
  createSpatialInferenceComputePipeline,
} from '../../SpatialInferenceComputePipeline';
import type { SpatialInferenceComputeConfig } from '../../SpatialInferenceComputePipeline';

import {
  SpatialReasoningEngine,
  createSpatialReasoningEngine,
} from '../../SpatialReasoningEngine';
import type { SpatialReasoningEngineConfig } from '../../SpatialReasoningEngine';

import {
  InferenceScheduler,
  createInferenceScheduler,
} from '../../InferenceScheduler';
import type { InferenceSchedulerConfig } from '../../SpatialInferenceTypes';

import type {
  SpatialInferenceState,
  SpatialInferenceActions,
  PipelineStatus,
  PipelineEvent,
} from './types';

import {
  createEventId,
} from './types';

// =============================================================================
// HOOK CONFIGURATION
// =============================================================================

/**
 * Configuration for the useSpatialInference hook.
 */
export interface UseSpatialInferenceConfig {
  /** WebGPU compute pipeline configuration */
  compute?: SpatialInferenceComputeConfig;
  /** Spatial reasoning engine configuration (CPU) */
  reasoning?: SpatialReasoningEngineConfig;
  /** Inference scheduler configuration */
  scheduler?: InferenceSchedulerConfig;
  /** How often to poll state for React updates (ms, default: 500) */
  reactPollingIntervalMs?: number;
  /** Maximum number of events to retain in the log (default: 100) */
  maxEvents?: number;
  /** Whether to auto-initialize on mount (default: false) */
  autoInitialize?: boolean;
  /** Whether to auto-start after initialization (default: false) */
  autoStart?: boolean;
  /** Whether to prefer GPU compute when available (default: true) */
  preferGPU?: boolean;
}

const DEFAULT_HOOK_CONFIG: Required<UseSpatialInferenceConfig> = {
  compute: {},
  reasoning: {},
  scheduler: {},
  reactPollingIntervalMs: 500,
  maxEvents: 100,
  autoInitialize: false,
  autoStart: false,
  preferGPU: true,
};

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * React hook for managing the spatial inference pipeline.
 *
 * @param config - Hook configuration
 * @returns [state, actions] tuple
 *
 * @example
 * ```tsx
 * const [state, actions] = useSpatialInference({
 *   autoInitialize: true,
 *   autoStart: true,
 *   scheduler: { initialHz: 3 },
 * });
 *
 * // state.spatialState has the latest CachedSpatialState
 * // state.status shows pipeline health
 * // actions.setTargetHz(5) adjusts frequency
 * ```
 */
export function useSpatialInference(
  config?: UseSpatialInferenceConfig,
): [SpatialInferenceState, SpatialInferenceActions] {
  const resolvedConfig = { ...DEFAULT_HOOK_CONFIG, ...config };

  // ─── Refs (stable across renders, no re-render triggers) ───────────

  const computePipelineRef = useRef<SpatialInferenceComputePipeline | null>(null);
  const reasoningEngineRef = useRef<SpatialReasoningEngine | null>(null);
  const schedulerRef = useRef<InferenceScheduler | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventsRef = useRef<PipelineEvent[]>([]);
  const isDisposedRef = useRef(false);

  // ─── React State (triggers re-renders at polling rate) ─────────────

  const [state, setState] = useState<SpatialInferenceState>({
    status: 'idle',
    isGPUAccelerated: false,
    spatialState: null,
    schedulerMetrics: null,
    computeMetrics: null,
    events: [],
    error: null,
  });

  // ─── Event Logger ──────────────────────────────────────────────────

  const addEvent = useCallback((
    severity: PipelineEvent['severity'],
    message: string,
    data?: Record<string, unknown>,
  ) => {
    const event: PipelineEvent = {
      id: createEventId(),
      timestamp: Date.now(),
      severity,
      message,
      data,
    };
    eventsRef.current = [event, ...eventsRef.current].slice(0, resolvedConfig.maxEvents);
  }, [resolvedConfig.maxEvents]);

  // ─── State Polling ─────────────────────────────────────────────────

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;

    pollingIntervalRef.current = setInterval(() => {
      if (isDisposedRef.current) return;

      const scheduler = schedulerRef.current;
      const computePipeline = computePipelineRef.current;

      if (!scheduler) return;

      const spatialState = scheduler.getCurrentState();
      const schedulerMetrics = scheduler.getMetrics();
      const computeMetrics = computePipeline?.isReady()
        ? computePipeline.getMetrics()
        : null;

      setState(prev => ({
        ...prev,
        spatialState: { ...spatialState } as typeof spatialState extends Readonly<infer T> ? T : never,
        schedulerMetrics,
        computeMetrics,
        events: [...eventsRef.current],
      }));
    }, resolvedConfig.reactPollingIntervalMs);
  }, [resolvedConfig.reactPollingIntervalMs]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // ─── Actions ───────────────────────────────────────────────────────

  const initialize = useCallback(async () => {
    if (isDisposedRef.current) return;

    setState(prev => ({ ...prev, status: 'initializing', error: null }));
    addEvent('info', 'Initializing spatial inference pipeline');

    try {
      // Step 1: Create the reasoning engine (CPU, always available)
      const engine = createSpatialReasoningEngine(resolvedConfig.reasoning);
      reasoningEngineRef.current = engine;
      addEvent('info', 'Spatial reasoning engine created (CPU)');

      // Step 2: Try to create the GPU compute pipeline
      let gpuReady = false;
      if (resolvedConfig.preferGPU) {
        const pipeline = createSpatialInferenceComputePipeline(resolvedConfig.compute);
        gpuReady = await pipeline.initialize();

        if (gpuReady) {
          computePipelineRef.current = pipeline;
          const metrics = pipeline.getMetrics();
          addEvent('info', `WebGPU compute pipeline ready: ${metrics.adapterInfo}`, {
            adapter: metrics.adapterInfo,
          });
        } else {
          pipeline.dispose();
          addEvent('warning', 'WebGPU unavailable, using CPU fallback');
        }
      }

      // Step 3: Create the inference scheduler with the engine
      const scheduler = createInferenceScheduler(engine, {
        ...resolvedConfig.scheduler,
        onFrequencyChange: (oldHz, newHz, reason) => {
          addEvent('info', `Inference frequency: ${oldHz.toFixed(1)}Hz -> ${newHz.toFixed(1)}Hz (${reason})`);
          resolvedConfig.scheduler?.onFrequencyChange?.(oldHz, newHz, reason);
        },
      });
      schedulerRef.current = scheduler;

      const status: PipelineStatus = gpuReady ? 'ready' : 'fallback';
      setState(prev => ({
        ...prev,
        status,
        isGPUAccelerated: gpuReady,
        error: null,
      }));
      addEvent('info', `Pipeline initialized (${gpuReady ? 'GPU' : 'CPU'})`);

    } catch (error) {
      const errorMsg = String(error);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: errorMsg,
      }));
      addEvent('error', `Initialization failed: ${errorMsg}`);
    }
  }, [resolvedConfig, addEvent]);

  const start = useCallback(async () => {
    const scheduler = schedulerRef.current;
    if (!scheduler) {
      addEvent('warning', 'Cannot start: pipeline not initialized');
      return;
    }

    await scheduler.start();
    setState(prev => ({ ...prev, status: 'running' }));
    startPolling();
    addEvent('info', `Inference loop started at ${scheduler.getCurrentHz()}Hz`);
  }, [addEvent, startPolling]);

  const stop = useCallback(() => {
    const scheduler = schedulerRef.current;
    if (!scheduler) return;

    scheduler.stop();
    stopPolling();
    setState(prev => ({ ...prev, status: 'ready' }));
    addEvent('info', 'Inference loop stopped');
  }, [addEvent, stopPolling]);

  const togglePause = useCallback(() => {
    const scheduler = schedulerRef.current;
    if (!scheduler) return;

    if (scheduler.getIsRunning()) {
      scheduler.stop();
      setState(prev => ({ ...prev, status: 'paused' }));
      addEvent('info', 'Inference loop paused');
    } else {
      scheduler.start();
      setState(prev => ({ ...prev, status: 'running' }));
      addEvent('info', 'Inference loop resumed');
    }
  }, [addEvent]);

  const forceSinglePass = useCallback(async () => {
    addEvent('info', 'Force single pass requested');
    // The scheduler does not currently expose a "run one pass" method.
    // We simulate it by starting, waiting for one pass, and stopping.
    const scheduler = schedulerRef.current;
    if (!scheduler) return;

    const wasRunning = scheduler.getIsRunning();
    if (!wasRunning) {
      await scheduler.start();
      // Wait for one interval cycle
      await new Promise(resolve => setTimeout(resolve, Math.ceil(1000 / scheduler.getCurrentHz()) + 50));
      scheduler.stop();
    }
    addEvent('info', 'Single pass completed');
  }, [addEvent]);

  const setTargetHz = useCallback((hz: number) => {
    const scheduler = schedulerRef.current;
    if (!scheduler) return;

    scheduler.setTargetHz(hz);
    addEvent('info', `Target frequency set to ${hz.toFixed(1)}Hz`);
  }, [addEvent]);

  const dispose = useCallback(() => {
    isDisposedRef.current = true;
    stopPolling();

    schedulerRef.current?.dispose();
    computePipelineRef.current?.dispose();
    reasoningEngineRef.current?.dispose();

    schedulerRef.current = null;
    computePipelineRef.current = null;
    reasoningEngineRef.current = null;

    setState({
      status: 'idle',
      isGPUAccelerated: false,
      spatialState: null,
      schedulerMetrics: null,
      computeMetrics: null,
      events: [],
      error: null,
    });
    eventsRef.current = [];
    addEvent('info', 'Pipeline disposed');
  }, [addEvent, stopPolling]);

  const clearEvents = useCallback(() => {
    eventsRef.current = [];
    setState(prev => ({ ...prev, events: [] }));
  }, []);

  // ─── Auto-initialize on mount ──────────────────────────────────────

  useEffect(() => {
    if (resolvedConfig.autoInitialize) {
      initialize().then(() => {
        if (resolvedConfig.autoStart) {
          start();
        }
      });
    }

    return () => {
      // Cleanup on unmount
      isDisposedRef.current = true;
      stopPolling();
      schedulerRef.current?.dispose();
      computePipelineRef.current?.dispose();
      reasoningEngineRef.current?.dispose();
    };
    // Intentionally run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Return ────────────────────────────────────────────────────────

  const actions: SpatialInferenceActions = {
    initialize,
    start,
    stop,
    togglePause,
    forceSinglePass,
    setTargetHz,
    dispose,
    clearEvents,
  };

  return [state, actions];
}
