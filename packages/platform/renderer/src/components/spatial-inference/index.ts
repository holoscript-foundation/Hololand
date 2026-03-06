/**
 * Spatial Inference Component Library
 *
 * React components for managing and visualizing the WebGPU-accelerated
 * spatial AI inference pipeline. Wraps SpatialInferenceComputePipeline,
 * SpatialReasoningEngine, and InferenceScheduler with a React-friendly
 * API.
 *
 * Components:
 * - SpatialInference:     Full dashboard/compact/overlay component
 * - useSpatialInference:  React hook for pipeline lifecycle management
 *
 * @module spatial-inference
 */

// Types and utilities
export type {
  PipelineStatus,
  PipelineEventSeverity,
  PipelineEvent,
  SpatialInferenceTheme,
  SpatialInferenceDisplayMode,
  SpatialInferencePanel,
  SpatialInferenceState,
  SpatialInferenceActions,
} from './types';

export {
  DEFAULT_SPATIAL_INFERENCE_THEME,
  getStatusLabel,
  getStatusColor,
  formatMs,
  formatBytes,
  createEventId,
} from './types';

// SpatialInference component
export { SpatialInference } from './SpatialInference';
export type { SpatialInferenceProps } from './SpatialInference';

// useSpatialInference hook
export { useSpatialInference } from './useSpatialInference';
export type { UseSpatialInferenceConfig } from './useSpatialInference';
