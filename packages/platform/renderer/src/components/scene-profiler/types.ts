/**
 * VR Scene Profiler Types
 *
 * Type definitions for the real-time VR scene performance profiling dashboard.
 * Displays draw call budget, mesh batching status, LOD distribution,
 * volumetric fire metrics, and foveated rendering state.
 *
 * @module scene-profiler/types
 */

import type { ScenePerformanceBudget, VRTargetPlatform } from '../../VRScenePerformanceBudget';
import type { BatchingPlan, BatchGroupType, CreatureBodyRegion } from '../../DragonMeshBatcher';
import type { CreatureFoveatedMetrics } from '../../CreatureFoveatedProfile';

// =============================================================================
// DASHBOARD STATE
// =============================================================================

/**
 * Panel identifiers for the scene profiler dashboard
 */
export type SceneProfilerPanel =
  | 'overview'
  | 'draw-calls'
  | 'batching'
  | 'lod'
  | 'volumetric'
  | 'foveated'
  | 'frame-budget';

/**
 * Display mode for the profiler
 */
export type ProfilerDisplayMode = 'compact' | 'expanded' | 'fullscreen';

/**
 * Frame time sample for real-time chart
 */
export interface ProfilerFrameSample {
  /** Timestamp (ms) */
  timestamp: number;
  /** Total frame time (ms) */
  frameTimeMs: number;
  /** Scene rendering time (ms) */
  sceneRenderMs: number;
  /** Volumetric effects time (ms) */
  volumetricMs: number;
  /** Animation/physics time (ms) */
  animationMs: number;
  /** Post-processing time (ms) */
  postProcessMs: number;
  /** Draw call count */
  drawCalls: number;
  /** Triangle count */
  triangles: number;
  /** Active LOD level distribution */
  lodDistribution: Record<number, number>;
}

/**
 * Batching status for display
 */
export interface BatchingStatus {
  /** Total input meshes */
  inputMeshes: number;
  /** Total output draw calls */
  outputDrawCalls: number;
  /** Reduction percentage */
  reductionPercent: number;
  /** Batching groups by type */
  groupsByType: Record<BatchGroupType, number>;
  /** Groups by body region */
  groupsByRegion: Record<CreatureBodyRegion, number>;
  /** Whether batching is active */
  active: boolean;
}

/**
 * LOD status for display
 */
export interface LODStatus {
  /** Total managed objects */
  totalObjects: number;
  /** LOD level distribution */
  lodDistribution: Record<number, number>;
  /** Foveal zone objects */
  fovealObjects: number;
  /** Peripheral zone objects */
  peripheralObjects: number;
  /** Memory savings (MB) */
  memorySavingsMB: number;
  /** Average LOD update time (ms) */
  avgUpdateTimeMs: number;
}

/**
 * Volumetric fire status
 */
export interface VolumetricFireStatus {
  /** Whether volumetric fire is active */
  active: boolean;
  /** Current quality level (0-3) */
  qualityLevel: number;
  /** GPU time (ms) */
  gpuTimeMs: number;
  /** Raymarch steps */
  raymarchSteps: number;
  /** Budget exceeded */
  budgetExceeded: boolean;
  /** Active fire layers */
  activeLayers: number;
  /** Replaced mesh count */
  replacedMeshes: number;
}

/**
 * Budget health status
 */
export type BudgetHealthStatus = 'healthy' | 'warning' | 'critical' | 'exceeded';

/**
 * Complete scene profiler state
 */
export interface SceneProfilerState {
  /** Scene name */
  sceneName: string;
  /** Target platform */
  platform: VRTargetPlatform;
  /** Target FPS */
  targetFPS: number;
  /** Current FPS */
  currentFPS: number;
  /** Frame budget (ms) */
  frameBudgetMs: number;
  /** Current frame time (ms) */
  currentFrameTimeMs: number;
  /** Budget health status */
  budgetHealth: BudgetHealthStatus;
  /** Budget utilization (%) */
  budgetUtilization: number;
  /** Frame time history */
  frameHistory: ProfilerFrameSample[];
  /** Static performance budget analysis */
  performanceBudget: ScenePerformanceBudget | null;
  /** Batching status */
  batching: BatchingStatus;
  /** LOD status */
  lod: LODStatus;
  /** Volumetric fire status */
  volumetricFire: VolumetricFireStatus;
  /** Foveated rendering metrics */
  foveated: CreatureFoveatedMetrics | null;
  /** Active panel */
  activePanel: SceneProfilerPanel;
  /** Display mode */
  displayMode: ProfilerDisplayMode;
}

/**
 * Scene profiler actions
 */
export interface SceneProfilerActions {
  /** Set active panel */
  setActivePanel: (panel: SceneProfilerPanel) => void;
  /** Set display mode */
  setDisplayMode: (mode: ProfilerDisplayMode) => void;
  /** Run performance budget analysis */
  runAnalysis: (platform?: VRTargetPlatform) => void;
  /** Reset frame history */
  resetHistory: () => void;
  /** Toggle batching */
  toggleBatching: () => void;
  /** Force LOD level */
  forceLOD: (level: number) => void;
  /** Toggle volumetric fire */
  toggleVolumetricFire: () => void;
  /** Set fire quality */
  setFireQuality: (level: 0 | 1 | 2 | 3) => void;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Scene profiler dashboard component props
 */
export interface SceneProfilerDashboardProps {
  /** Scene name */
  sceneName?: string;
  /** Target platform */
  platform?: VRTargetPlatform;
  /** Initial display mode */
  displayMode?: ProfilerDisplayMode;
  /** Initial active panel */
  activePanel?: SceneProfilerPanel;
  /** Frame time data source (call periodically with new samples) */
  onRequestFrameData?: () => ProfilerFrameSample | null;
  /** Performance budget analysis result */
  performanceBudget?: ScenePerformanceBudget;
  /** Batching plan */
  batchingPlan?: BatchingPlan;
  /** Foveated metrics */
  foveatedMetrics?: CreatureFoveatedMetrics;
  /** Custom CSS class */
  className?: string;
  /** Whether profiler is visible */
  visible?: boolean;
}

// =============================================================================
// THEME
// =============================================================================

/**
 * Scene profiler theme
 */
export interface SceneProfilerTheme {
  /** Background color */
  bg: string;
  /** Panel background */
  panelBg: string;
  /** Text color */
  text: string;
  /** Accent color */
  accent: string;
  /** Healthy status color */
  healthy: string;
  /** Warning status color */
  warning: string;
  /** Critical status color */
  critical: string;
  /** Exceeded status color */
  exceeded: string;
  /** Chart grid color */
  grid: string;
  /** Border color */
  border: string;
  /** Font family */
  fontFamily: string;
  /** Font size (px) */
  fontSize: number;
}

/**
 * Default scene profiler theme (dark mode, VR-optimized contrast)
 */
export const DEFAULT_SCENE_PROFILER_THEME: SceneProfilerTheme = {
  bg: '#0a0a1a',
  panelBg: '#121228',
  text: '#e0e0f0',
  accent: '#6366f1',
  healthy: '#22c55e',
  warning: '#f59e0b',
  critical: '#ef4444',
  exceeded: '#dc2626',
  grid: '#1a1a3e',
  border: '#2a2a4e',
  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  fontSize: 12,
};

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Frame budget at 90Hz (ms)
 */
export const FRAME_BUDGET_90HZ = 11.1;

/**
 * Frame budget at 60Hz (ms)
 */
export const FRAME_BUDGET_60HZ = 16.6;

/**
 * Maximum frame history length
 */
export const MAX_FRAME_HISTORY = 300; // 300 frames = ~3.3 seconds at 90Hz

/**
 * Budget health thresholds (% of budget)
 */
export const BUDGET_HEALTH_THRESHOLDS = {
  healthy: 70,    // < 70% utilization
  warning: 85,    // 70-85% utilization
  critical: 95,   // 85-95% utilization
  exceeded: 100,  // > 100% utilization
};

/**
 * Panel labels for UI
 */
export const PANEL_LABELS: Record<SceneProfilerPanel, string> = {
  overview: 'Overview',
  'draw-calls': 'Draw Calls',
  batching: 'Mesh Batching',
  lod: 'LOD System',
  volumetric: 'Volumetric Fire',
  foveated: 'Foveated Rendering',
  'frame-budget': 'Frame Budget',
};

/**
 * Batch type labels for UI
 */
export const BATCH_TYPE_LABELS: Record<BatchGroupType, string> = {
  'static-merge': 'Static Merge',
  'instanced': 'Instanced',
  'dynamic-group': 'Dynamic Group',
  'volumetric-fire': 'Volumetric Fire',
  'gpu-particle': 'GPU Particles',
  'billboard': 'Billboards',
  'unbatched': 'Unbatched',
};

/**
 * Batch type colors for charts
 */
export const BATCH_TYPE_COLORS: Record<BatchGroupType, string> = {
  'static-merge': '#22c55e',
  'instanced': '#3b82f6',
  'dynamic-group': '#f59e0b',
  'volumetric-fire': '#ef4444',
  'gpu-particle': '#a855f7',
  'billboard': '#ec4899',
  'unbatched': '#6b7280',
};
