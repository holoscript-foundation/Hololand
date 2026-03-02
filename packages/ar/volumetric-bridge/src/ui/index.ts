/**
 * UI Components for Volumetric Rendering Controls
 *
 * React components and hooks for controlling LOD quality, volumetric video
 * playback, and real-time rendering metrics display.
 *
 * Components:
 * - LODQualitySlider: Stepped slider mapping Low/Med/High/Ultra to octree depth + budget
 * - VolumetricTimeline: Scrubber timeline with keyframe indicators and bandwidth
 * - RenderingMetricsDisplay: Live Gaussian count, memory, FPS metrics panel
 * - QualityTierSelector: Segmented button for volumetric video quality tiers
 * - FPSHistoryGraph: Sparkline FPS history graph
 *
 * Hooks:
 * - useLODController: Manages LOD tier ↔ engine config mapping with VR auto-select
 * - useVolumetricTimeline: Bridges VolumetricVideoPlayer with timeline UI
 * - usePerformanceMetrics: Rolling FPS/memory/decode metrics from PerformanceMonitor
 *
 * @module volumetric-bridge/ui
 */

// Components
export { LODQualitySlider } from './LODQualitySlider';
export { VolumetricTimeline } from './VolumetricTimeline';
export { RenderingMetricsDisplay, FPSHistoryGraph } from './RenderingMetricsDisplay';
export { QualityTierSelector } from './QualityTierSelector';

// Hooks
export { useLODController } from './hooks/useLODController';
export { useVolumetricTimeline } from './hooks/useVolumetricTimeline';
export { usePerformanceMetrics } from './hooks/usePerformanceMetrics';

// Types
export { LOD_TIER_MAPPINGS } from './types';
export type {
  LODQualityTier,
  LODTierMapping,
  LODQualitySliderProps,
  RenderingMetrics,
  RenderingMetricsDisplayProps,
  TimelineKeyframe,
  VolumetricTimelineProps,
  QualityTierSelectorProps,
  LODControllerState,
  VolumetricTimelineState,
  PerformanceMetricsState,
} from './types';

export type { UseLODControllerOptions } from './hooks/useLODController';
export type { UseVolumetricTimelineOptions } from './hooks/useVolumetricTimeline';
export type { UsePerformanceMetricsOptions } from './hooks/usePerformanceMetrics';
