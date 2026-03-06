/**
 * Spatial Inference UI - Shared Types
 *
 * Type definitions for the SpatialInference React component family.
 * These types bridge the SpatialInferenceComputePipeline (WebGPU backend)
 * and InferenceScheduler (timing orchestrator) to the React rendering layer.
 *
 * @module spatial-inference/types
 */

import type {
  CachedSpatialState,
  InferenceSchedulerMetrics,
  SpatialRelationship,
  SpatialRegion,
  OcclusionState,
  SpatialLabel,
} from '../../SpatialInferenceTypes';

import type {
  SpatialInferenceComputeMetrics,
} from '../../SpatialInferenceComputePipeline';

// =============================================================================
// PIPELINE STATUS
// =============================================================================

/**
 * Status of the spatial inference pipeline.
 */
export type PipelineStatus =
  | 'idle'           // Not started
  | 'initializing'   // WebGPU/engine initialization in progress
  | 'ready'          // Pipeline initialized, waiting for data
  | 'running'        // Actively computing inferences
  | 'paused'         // Temporarily suspended
  | 'error'          // Initialization or runtime error
  | 'fallback';      // WebGPU unavailable, using CPU fallback

/**
 * Severity levels for pipeline events.
 */
export type PipelineEventSeverity = 'info' | 'warning' | 'error';

/**
 * A pipeline event for the activity log.
 */
export interface PipelineEvent {
  /** Unique event identifier */
  id: string;
  /** Event timestamp */
  timestamp: number;
  /** Event severity */
  severity: PipelineEventSeverity;
  /** Human-readable event message */
  message: string;
  /** Optional structured data */
  data?: Record<string, unknown>;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Theme for spatial inference UI components.
 */
export interface SpatialInferenceTheme {
  /** Base font family */
  fontFamily: string;
  /** Font size scale factor (1.0 = default) */
  fontScale: number;
  /** Border radius for cards and panels */
  borderRadius: string;
  /** Background color for component containers */
  containerBackground: string;
  /** Card background color */
  cardBackground: string;
  /** Primary text color */
  textPrimary: string;
  /** Secondary text color */
  textSecondary: string;
  /** Muted text color */
  textMuted: string;
  /** Border color */
  borderColor: string;
  /** Success/running color */
  successColor: string;
  /** Warning color */
  warningColor: string;
  /** Error color */
  errorColor: string;
  /** Info/accent color */
  accentColor: string;
  /** GPU compute indicator color */
  gpuColor: string;
  /** CPU fallback indicator color */
  cpuColor: string;
}

/**
 * Default theme for spatial inference components.
 */
export const DEFAULT_SPATIAL_INFERENCE_THEME: SpatialInferenceTheme = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontScale: 1.0,
  borderRadius: '8px',
  containerBackground: '#0a0a1a',
  cardBackground: '#12122a',
  textPrimary: '#e0e0f0',
  textSecondary: '#9090b0',
  textMuted: '#606080',
  borderColor: '#2a2a4a',
  successColor: '#22c55e',
  warningColor: '#eab308',
  errorColor: '#ef4444',
  accentColor: '#6366f1',
  gpuColor: '#06b6d4',
  cpuColor: '#f59e0b',
};

/**
 * Display mode for the SpatialInference component.
 */
export type SpatialInferenceDisplayMode =
  | 'dashboard'     // Full dashboard with all panels
  | 'compact'       // Compact status bar
  | 'metrics-only'  // Only performance metrics
  | 'overlay';      // Transparent overlay for VR HUD

/**
 * Panels that can be shown/hidden in the dashboard view.
 */
export type SpatialInferencePanel =
  | 'status'           // Pipeline status and controls
  | 'metrics'          // Performance metrics (Hz, duration, etc.)
  | 'relationships'    // Detected spatial relationships list
  | 'regions'          // Spatial regions/clusters
  | 'gpu'              // GPU compute pipeline stats
  | 'activity';        // Event activity log

// =============================================================================
// HOOK RETURN TYPES
// =============================================================================

/**
 * Combined state returned by the useSpatialInference hook.
 */
export interface SpatialInferenceState {
  /** Current pipeline status */
  status: PipelineStatus;
  /** Whether GPU compute is being used (vs CPU fallback) */
  isGPUAccelerated: boolean;
  /** Current cached spatial state from the front buffer */
  spatialState: CachedSpatialState | null;
  /** Scheduler metrics */
  schedulerMetrics: InferenceSchedulerMetrics | null;
  /** GPU compute pipeline metrics */
  computeMetrics: SpatialInferenceComputeMetrics | null;
  /** Recent pipeline events */
  events: PipelineEvent[];
  /** Error message if status is 'error' */
  error: string | null;
}

/**
 * Actions returned by the useSpatialInference hook.
 */
export interface SpatialInferenceActions {
  /** Initialize the pipeline (WebGPU + scheduler) */
  initialize: () => Promise<void>;
  /** Start the inference loop */
  start: () => Promise<void>;
  /** Stop the inference loop */
  stop: () => void;
  /** Pause/resume the inference loop */
  togglePause: () => void;
  /** Force a single inference pass */
  forceSinglePass: () => Promise<void>;
  /** Adjust the target inference frequency */
  setTargetHz: (hz: number) => void;
  /** Dispose all resources */
  dispose: () => void;
  /** Clear the event log */
  clearEvents: () => void;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get a human-readable label for a pipeline status.
 */
export function getStatusLabel(status: PipelineStatus): string {
  switch (status) {
    case 'idle': return 'Idle';
    case 'initializing': return 'Initializing';
    case 'ready': return 'Ready';
    case 'running': return 'Running';
    case 'paused': return 'Paused';
    case 'error': return 'Error';
    case 'fallback': return 'CPU Fallback';
    default: return 'Unknown';
  }
}

/**
 * Get a color for a pipeline status from the theme.
 */
export function getStatusColor(status: PipelineStatus, theme: SpatialInferenceTheme): string {
  switch (status) {
    case 'idle': return theme.textMuted;
    case 'initializing': return theme.accentColor;
    case 'ready': return theme.accentColor;
    case 'running': return theme.successColor;
    case 'paused': return theme.warningColor;
    case 'error': return theme.errorColor;
    case 'fallback': return theme.cpuColor;
    default: return theme.textMuted;
  }
}

/**
 * Format milliseconds to a display string.
 */
export function formatMs(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}us`;
  if (ms < 100) return `${ms.toFixed(1)}ms`;
  return `${ms.toFixed(0)}ms`;
}

/**
 * Format byte count to human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

/**
 * Create a unique event ID.
 */
export function createEventId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}
