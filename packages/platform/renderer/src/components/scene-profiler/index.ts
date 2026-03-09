/**
 * VR Scene Profiler
 *
 * Real-time performance profiling dashboard for VR scenes.
 * Displays draw call budget, mesh batching, LOD distribution,
 * volumetric fire metrics, foveated rendering state, and frame budget analysis.
 *
 * @module scene-profiler
 */

export { SceneProfilerDashboard } from './SceneProfilerDashboard';
export { useSceneProfiler } from './useSceneProfiler';

export type { UseSceneProfilerConfig } from './useSceneProfiler';

export type {
  SceneProfilerPanel,
  ProfilerDisplayMode,
  ProfilerFrameSample,
  BatchingStatus,
  LODStatus,
  VolumetricFireStatus,
  BudgetHealthStatus,
  SceneProfilerState,
  SceneProfilerActions,
  SceneProfilerDashboardProps,
  SceneProfilerTheme,
} from './types';

export {
  DEFAULT_SCENE_PROFILER_THEME,
  FRAME_BUDGET_90HZ,
  FRAME_BUDGET_60HZ,
  MAX_FRAME_HISTORY,
  BUDGET_HEALTH_THRESHOLDS,
  PANEL_LABELS,
  BATCH_TYPE_LABELS,
  BATCH_TYPE_COLORS,
} from './types';
