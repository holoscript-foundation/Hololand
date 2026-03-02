/**
 * Volumetric Video Playback Engine
 *
 * A complete pipeline for volumetric video playback combining:
 * - SPZ base frame loading (I-frames via Niantic compressed Gaussian splats)
 * - 4D-MoDe temporal delta streaming (motion-decoupled P-frames)
 * - 4DGCPro progressive quality tiers (H.264 hardware decode)
 * - Adaptive keyframe insertion at 15% dynamic threshold
 * - Performance-adaptive quality switching (52+ FPS desktop, 25+ FPS mobile)
 *
 * @example
 * ```typescript
 * import { VolumetricVideoPlayer } from '@hololand/volumetric-bridge/volumetric-video';
 *
 * const player = new VolumetricVideoPlayer({
 *   manifestUrl: '/assets/volumetric/scene.manifest.json',
 *   platform: 'desktop',
 *   adaptiveQuality: true,
 *   keyframeThreshold: 0.15,
 * });
 *
 * const mesh = await player.load();
 * scene.add(mesh);
 * player.play();
 *
 * // In render loop:
 * player.update();
 *
 * // Cleanup:
 * player.dispose();
 * ```
 *
 * @module volumetric-bridge/volumetric-video
 */

// =============================================================================
// PLAYER
// =============================================================================

export { VolumetricVideoPlayer } from './VolumetricVideoPlayer';

// =============================================================================
// SUBSYSTEMS
// =============================================================================

export { HardwareDecoder, dequantizeAttributeMaps } from './HardwareDecoder';
export { TemporalDeltaProcessor } from './TemporalDeltaProcessor';
export { AdaptiveKeyframeManager } from './AdaptiveKeyframeManager';
export type { KeyframeDecision } from './AdaptiveKeyframeManager';
export { FrameBuffer } from './FrameBuffer';
export { PerformanceMonitor } from './PerformanceMonitor';

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Quality tiers
  VolumetricQualityTier,
  QualityTierConfig,
  // Platform
  TargetPlatform,
  PlatformProfile,
  // Frames
  FrameType,
  GaussianMotionClass,
  GaussianMotionDelta,
  KeyframeData,
  DeltaFrameData,
  DecodedFrame,
  // Manifest
  VolumetricVideoManifest,
  FrameIndexEntry,
  // Player
  VolumetricVideoPlayerConfig,
  PlaybackState,
  PlayerStatus,
  // Events
  VolumetricVideoEvent,
  VolumetricVideoEventHandler,
  // Hardware decoder
  IHardwareDecoder,
  HardwareDecoderConfig,
  DecodedAttributeMaps,
  // Temporal delta
  ITemporalDeltaProcessor,
  MotionClassificationThresholds,
  // Adaptive keyframe
  AdaptiveKeyframeConfig,
  // Performance
  PerformanceMetrics,
} from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

export {
  QUALITY_TIER_CONFIGS,
  PLATFORM_PROFILES,
  DEFAULT_MOTION_THRESHOLDS,
  DEFAULT_ADAPTIVE_KEYFRAME_CONFIG,
} from './types';
