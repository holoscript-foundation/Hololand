/**
 * useSceneProfiler
 *
 * React hook for VR scene performance profiling.
 * Manages frame time history, budget analysis, and profiler state.
 *
 * @module scene-profiler/useSceneProfiler
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  SceneProfilerState,
  SceneProfilerActions,
  SceneProfilerPanel,
  ProfilerDisplayMode,
  ProfilerFrameSample,
  BudgetHealthStatus,
} from './types';
import {
  FRAME_BUDGET_90HZ,
  FRAME_BUDGET_60HZ,
  MAX_FRAME_HISTORY,
  BUDGET_HEALTH_THRESHOLDS,
} from './types';
import type { VRTargetPlatform, ScenePerformanceBudget } from '../../VRScenePerformanceBudget';
import { analyzeScenePerformanceBudget, createDragonMeshDescriptors } from '../../VRScenePerformanceBudget';
import type { BatchingPlan } from '../../DragonMeshBatcher';
import type { CreatureFoveatedMetrics } from '../../CreatureFoveatedProfile';

// =============================================================================
// HOOK CONFIGURATION
// =============================================================================

/**
 * Configuration for the scene profiler hook
 */
export interface UseSceneProfilerConfig {
  /** Scene name */
  sceneName?: string;
  /** Target platform */
  platform?: VRTargetPlatform;
  /** Initial display mode */
  displayMode?: ProfilerDisplayMode;
  /** Initial active panel */
  activePanel?: SceneProfilerPanel;
  /** Auto-run analysis on mount */
  autoAnalyze?: boolean;
  /** Frame sample interval (ms) */
  sampleIntervalMs?: number;
  /** External batching plan */
  batchingPlan?: BatchingPlan | null;
  /** External foveated metrics */
  foveatedMetrics?: CreatureFoveatedMetrics | null;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * React hook for VR scene performance profiling.
 *
 * @example
 * ```tsx
 * const { state, actions } = useSceneProfiler({
 *   sceneName: 'Inferno Wyrm',
 *   platform: 'quest3',
 *   autoAnalyze: true,
 * });
 *
 * return <SceneProfilerDashboard {...state} {...actions} />;
 * ```
 */
export function useSceneProfiler(
  config: UseSceneProfilerConfig = {}
): { state: SceneProfilerState; actions: SceneProfilerActions } {
  const {
    sceneName = 'Unknown Scene',
    platform = 'quest3',
    displayMode: initialDisplayMode = 'compact',
    activePanel: initialActivePanel = 'overview',
    autoAnalyze = false,
    sampleIntervalMs = 100,
    batchingPlan = null,
    foveatedMetrics = null,
  } = config;

  const frameBudgetMs = platform === 'desktop' ? FRAME_BUDGET_60HZ : FRAME_BUDGET_90HZ;
  const targetFPS = platform === 'desktop' ? 60 : 90;

  // State
  const [activePanel, setActivePanel] = useState<SceneProfilerPanel>(initialActivePanel);
  const [displayModeState, setDisplayMode] = useState<ProfilerDisplayMode>(initialDisplayMode);
  const [frameHistory, setFrameHistory] = useState<ProfilerFrameSample[]>([]);
  const [performanceBudget, setPerformanceBudget] = useState<ScenePerformanceBudget | null>(null);
  const [batchingActive, setBatchingActive] = useState(true);
  const [volumetricFireActive, setVolumetricFireActive] = useState(true);
  const [fireQuality, setFireQuality] = useState<0 | 1 | 2 | 3>(1);
  const [currentFPS, setCurrentFPS] = useState(0);
  const [currentFrameTimeMs, setCurrentFrameTimeMs] = useState(0);

  // Refs for animation frame tracking
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef(performance.now());
  const rafRef = useRef<number>(0);

  // Calculate budget health
  const budgetUtilization = frameBudgetMs > 0 ? (currentFrameTimeMs / frameBudgetMs) * 100 : 0;
  const budgetHealth: BudgetHealthStatus =
    budgetUtilization > BUDGET_HEALTH_THRESHOLDS.exceeded ? 'exceeded' :
    budgetUtilization > BUDGET_HEALTH_THRESHOLDS.critical ? 'critical' :
    budgetUtilization > BUDGET_HEALTH_THRESHOLDS.warning ? 'warning' : 'healthy';

  // Run performance analysis
  const runAnalysis = useCallback((targetPlatform?: VRTargetPlatform) => {
    const meshDescriptors = createDragonMeshDescriptors();
    const budget = analyzeScenePerformanceBudget(
      sceneName,
      meshDescriptors,
      targetPlatform || platform
    );
    setPerformanceBudget(budget);
  }, [sceneName, platform]);

  // Auto-analyze on mount
  useEffect(() => {
    if (autoAnalyze) {
      runAnalysis();
    }
  }, [autoAnalyze, runAnalysis]);

  // FPS tracking via requestAnimationFrame
  useEffect(() => {
    let running = true;

    const measureFrame = () => {
      if (!running) return;

      const now = performance.now();
      const dt = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      frameTimesRef.current.push(dt);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      // Calculate FPS every ~500ms
      if (frameTimesRef.current.length >= 30) {
        const avgDt = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
        setCurrentFPS(Math.round(1000 / avgDt));
        setCurrentFrameTimeMs(+avgDt.toFixed(2));
      }

      rafRef.current = requestAnimationFrame(measureFrame);
    };

    rafRef.current = requestAnimationFrame(measureFrame);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Batching status derived from plan
  const batchingStatus = batchingPlan ? {
    inputMeshes: batchingPlan.inputMeshes,
    outputDrawCalls: batchingPlan.outputDrawCalls,
    reductionPercent: batchingPlan.reductionPercent,
    groupsByType: batchingPlan.groupsByType,
    groupsByRegion: batchingPlan.groupsByRegion,
    active: batchingActive,
  } : {
    inputMeshes: 163,
    outputDrawCalls: 163,
    reductionPercent: 0,
    groupsByType: {
      'static-merge': 0, instanced: 0, 'dynamic-group': 0,
      'volumetric-fire': 0, 'gpu-particle': 0, billboard: 0, unbatched: 163,
    },
    groupsByRegion: {} as any,
    active: false,
  };

  // LOD status (placeholder - would come from LOD manager in production)
  const lodStatus = {
    totalObjects: 28, // procedural geometry objects
    lodDistribution: { 0: 28, 1: 0, 2: 0, 3: 0 },
    fovealObjects: 0,
    peripheralObjects: 0,
    memorySavingsMB: 0,
    avgUpdateTimeMs: 0,
  };

  // Volumetric fire status
  const volumetricFireStatus = {
    active: volumetricFireActive,
    qualityLevel: fireQuality,
    gpuTimeMs: volumetricFireActive ? [1.2, 1.5, 1.8, 2.0][fireQuality] : 0,
    raymarchSteps: [12, 24, 32, 48][fireQuality],
    budgetExceeded: false,
    activeLayers: volumetricFireActive ? 9 : 0,
    replacedMeshes: volumetricFireActive ? 9 : 0,
  };

  // Compose state
  const state: SceneProfilerState = {
    sceneName,
    platform,
    targetFPS,
    currentFPS,
    frameBudgetMs,
    currentFrameTimeMs,
    budgetHealth,
    budgetUtilization,
    frameHistory,
    performanceBudget,
    batching: batchingStatus,
    lod: lodStatus,
    volumetricFire: volumetricFireStatus,
    foveated: foveatedMetrics || null,
    activePanel,
    displayMode: displayModeState,
  };

  // Actions
  const actions: SceneProfilerActions = {
    setActivePanel,
    setDisplayMode,
    runAnalysis,
    resetHistory: () => setFrameHistory([]),
    toggleBatching: () => setBatchingActive(v => !v),
    forceLOD: (_level: number) => { /* Would call lodManager.forceLOD */ },
    toggleVolumetricFire: () => setVolumetricFireActive(v => !v),
    setFireQuality,
  };

  return { state, actions };
}
