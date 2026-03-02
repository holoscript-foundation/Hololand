/**
 * UI Component Types for LOD Controls and Volumetric Video Timeline
 *
 * Shared type definitions for React components that interface with:
 * - GaussianSplatLODManager (octree depth + budget mapping)
 * - GaussianBudgetManager (per-frame budget enforcement)
 * - VolumetricVideoPlayer (timeline, keyframes, quality tiers)
 * - PerformanceMonitor (FPS, decode/render times, memory)
 *
 * @module volumetric-bridge/ui
 */

import type { GaussianLODConfig, LODUpdateResult } from '../GaussianSplatLODManager';
import type {
  GaussianBudgetConfig,
  BudgetEnforcementResult,
  MemoryState,
} from '../GaussianBudgetManager';
import type {
  VolumetricQualityTier,
  PlaybackState,
  PlayerStatus,
  PerformanceMetrics,
  FrameIndexEntry,
  VolumetricVideoManifest,
} from '../volumetric-video/types';

// =============================================================================
// LOD QUALITY TIERS
// =============================================================================

/**
 * LOD quality tier labels exposed to the user.
 * Each maps to a specific octree depth + Gaussian budget configuration.
 */
export type LODQualityTier = 'low' | 'medium' | 'high' | 'ultra';

/**
 * Mapping from user-facing LOD quality tier to engine configuration.
 * Defines octree depth, Gaussian budget, and distance thresholds.
 */
export interface LODTierMapping {
  /** User-facing tier label */
  readonly tier: LODQualityTier;
  /** Display label for UI */
  readonly label: string;
  /** Octree depth (LOD levels available) */
  readonly octreeDepth: number;
  /** Gaussian budget (0 = unlimited) */
  readonly gaussianBudget: number;
  /** Power-law exponent for threshold spacing */
  readonly powerLawExponent: number;
  /** Maximum render distance */
  readonly maxDistance: number;
  /** Estimated GPU memory in MB */
  readonly estimatedMemoryMB: number;
  /** Target FPS for this tier */
  readonly targetFPS: number;
  /** Description for tooltip/accessibility */
  readonly description: string;
}

/**
 * Predefined LOD tier mappings.
 * Values derived from GaussianSplatLODManager presets and research:
 *   W.034 - VR Gaussian budget
 *   P.030.05 - VR Gaussian Budget Management
 */
export const LOD_TIER_MAPPINGS: Record<LODQualityTier, LODTierMapping> = {
  low: {
    tier: 'low',
    label: 'Low',
    octreeDepth: 3,
    gaussianBudget: 50_000,
    powerLawExponent: 2.0,
    maxDistance: 50,
    estimatedMemoryMB: 3,
    targetFPS: 90,
    description: 'Minimal detail. Best for mobile VR or low-end devices.',
  },
  medium: {
    tier: 'medium',
    label: 'Med',
    octreeDepth: 4,
    gaussianBudget: 100_000,
    powerLawExponent: 1.5,
    maxDistance: 100,
    estimatedMemoryMB: 6,
    targetFPS: 72,
    description: 'Balanced quality and performance. Recommended for Quest 3.',
  },
  high: {
    tier: 'high',
    label: 'High',
    octreeDepth: 6,
    gaussianBudget: 180_000,
    powerLawExponent: 1.5,
    maxDistance: 200,
    estimatedMemoryMB: 11,
    targetFPS: 60,
    description: 'High fidelity rendering. Suitable for PC VR and desktop.',
  },
  ultra: {
    tier: 'ultra',
    label: 'Ultra',
    octreeDepth: 8,
    gaussianBudget: 0, // unlimited
    powerLawExponent: 1.5,
    maxDistance: 500,
    estimatedMemoryMB: 30,
    targetFPS: 30,
    description: 'Maximum quality, no budget limits. Desktop only.',
  },
};

// =============================================================================
// LOD SLIDER PROPS
// =============================================================================

/**
 * Props for the LOD Quality Slider component.
 */
export interface LODQualitySliderProps {
  /** Currently selected LOD quality tier */
  value: LODQualityTier;
  /** Callback when user changes the tier */
  onChange: (tier: LODQualityTier) => void;
  /** Whether the slider is disabled */
  disabled?: boolean;
  /** Whether VR mode is active (auto-selects appropriate tier) */
  vrMode?: boolean;
  /** Current LOD update result from the manager (for live metrics) */
  lodResult?: LODUpdateResult;
  /** Current budget enforcement result (for budget metrics) */
  budgetResult?: BudgetEnforcementResult;
  /** Show inline metrics below the slider */
  showMetrics?: boolean;
  /** Custom CSS class name */
  className?: string;
  /** Orientation: horizontal (default) or vertical */
  orientation?: 'horizontal' | 'vertical';
  /** Size variant */
  size?: 'compact' | 'default' | 'large';
  /** Accessible label */
  'aria-label'?: string;
}

// =============================================================================
// METRICS DISPLAY PROPS
// =============================================================================

/**
 * Real-time rendering metrics for display.
 */
export interface RenderingMetrics {
  /** Active Gaussian count being rendered */
  gaussianCount: number;
  /** Estimated GPU memory usage in MB */
  memoryMB: number;
  /** Current FPS */
  fps: number;
  /** Whether budget capping is active */
  budgetCapped: boolean;
  /** Current active LOD level */
  activeLODLevel: number;
  /** Total LOD levels available */
  totalLODLevels: number;
  /** Number of LOD levels dropped due to budget */
  levelsDropped: number;
  /** Memory threshold state */
  memoryState: MemoryState['thresholdState'];
}

/**
 * Props for the rendering metrics display component.
 */
export interface RenderingMetricsDisplayProps {
  /** Current rendering metrics */
  metrics: RenderingMetrics;
  /** Layout variant */
  layout?: 'inline' | 'panel' | 'minimal';
  /** Show memory bar */
  showMemoryBar?: boolean;
  /** Show FPS graph */
  showFPSGraph?: boolean;
  /** Update interval in ms (default: 100) */
  updateInterval?: number;
  /** Custom CSS class name */
  className?: string;
}

// =============================================================================
// VOLUMETRIC TIMELINE PROPS
// =============================================================================

/**
 * Keyframe indicator data for the timeline.
 */
export interface TimelineKeyframe {
  /** Frame index */
  frameIndex: number;
  /** Time position in seconds */
  time: number;
  /** Keyframe type */
  type: 'scheduled' | 'adaptive' | 'seek';
  /** Whether this is the currently active keyframe */
  active: boolean;
}

/**
 * Props for the Volumetric Video Timeline component.
 */
export interface VolumetricTimelineProps {
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Callback when user seeks to a new time */
  onSeek: (time: number) => void;
  /** Current playback state */
  playbackState: PlaybackState;
  /** Callback for play/pause toggle */
  onPlayPause: () => void;
  /** Keyframe positions for indicator display */
  keyframes?: TimelineKeyframe[];
  /** Frame index entries from the manifest (for I/P frame visualization) */
  frameIndex?: FrameIndexEntry[];
  /** Current quality tier */
  qualityTier?: VolumetricQualityTier;
  /** Buffered time ranges (start, end) in seconds */
  bufferedRanges?: Array<[number, number]>;
  /** Current bandwidth usage in Kbps */
  bandwidthKbps?: number;
  /** Whether the timeline is disabled */
  disabled?: boolean;
  /** Show frame-type strip (I/P frame visualization) */
  showFrameStrip?: boolean;
  /** Show bandwidth overlay */
  showBandwidth?: boolean;
  /** Custom CSS class name */
  className?: string;
}

// =============================================================================
// QUALITY TIER SELECTOR PROPS
// =============================================================================

/**
 * Props for the Volumetric Quality Tier Selector component.
 */
export interface QualityTierSelectorProps {
  /** Currently selected quality tier */
  value: VolumetricQualityTier;
  /** Callback when user changes the tier */
  onChange: (tier: VolumetricQualityTier) => void;
  /** Whether adaptive quality is enabled */
  adaptiveEnabled?: boolean;
  /** Callback to toggle adaptive quality */
  onAdaptiveToggle?: (enabled: boolean) => void;
  /** Current performance metrics */
  metrics?: PerformanceMetrics;
  /** Current bandwidth in Kbps */
  bandwidthKbps?: number;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Custom CSS class name */
  className?: string;
}

// =============================================================================
// HOOK RETURN TYPES
// =============================================================================

/**
 * Return type for the useLODController hook.
 */
export interface LODControllerState {
  /** Current LOD quality tier */
  currentTier: LODQualityTier;
  /** Set the LOD quality tier */
  setTier: (tier: LODQualityTier) => void;
  /** Current LOD configuration applied */
  config: Readonly<GaussianLODConfig>;
  /** Latest LOD update result */
  lodResult: LODUpdateResult | null;
  /** Latest budget enforcement result */
  budgetResult: BudgetEnforcementResult | null;
  /** Current rendering metrics */
  metrics: RenderingMetrics;
  /** Whether VR mode is active */
  vrMode: boolean;
  /** Set VR mode */
  setVRMode: (enabled: boolean) => void;
  /** Whether the LOD system is built and ready */
  isReady: boolean;
}

/**
 * Return type for the useVolumetricTimeline hook.
 */
export interface VolumetricTimelineState {
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Current playback state */
  playbackState: PlaybackState;
  /** Keyframe positions */
  keyframes: TimelineKeyframe[];
  /** Buffered time ranges */
  bufferedRanges: Array<[number, number]>;
  /** Current bandwidth in Kbps */
  bandwidthKbps: number;
  /** Current quality tier */
  qualityTier: VolumetricQualityTier;
  /** Player status snapshot */
  playerStatus: PlayerStatus | null;
  /** Play/pause toggle */
  togglePlayPause: () => void;
  /** Seek to a time */
  seek: (time: number) => void;
  /** Set quality tier */
  setQualityTier: (tier: VolumetricQualityTier) => void;
  /** Toggle adaptive quality */
  setAdaptiveQuality: (enabled: boolean) => void;
}

/**
 * Return type for the usePerformanceMetrics hook.
 */
export interface PerformanceMetricsState {
  /** Current performance metrics from the monitor */
  metrics: PerformanceMetrics;
  /** FPS history for graph rendering */
  fpsHistory: number[];
  /** Whether the platform target is being met */
  meetingTarget: boolean;
  /** Current quality tier */
  currentTier: VolumetricQualityTier;
  /** Current memory state */
  memoryState: MemoryState['thresholdState'];
}
