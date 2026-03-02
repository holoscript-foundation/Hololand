/**
 * Volumetric Video Playback Engine — Type Definitions
 *
 * Types for the volumetric video pipeline combining:
 * - SPZ base frames (Niantic compressed Gaussian splats)
 * - 4D-MoDe temporal delta streaming (motion-decoupled compression)
 * - 4DGCPro progressive quality tiers (H.264 hardware decode)
 * - Adaptive keyframe insertion at 15% dynamic threshold
 *
 * Research references:
 *   W.033 - SPZ base frame format for volumetric video I-frames
 *   W.036 - 4D-MoDe motion decomposition temporal deltas
 *   W.039 - 4DGCPro progressive quality with H.264 hardware decode
 *   P.030.03 - Temporal delta streaming architecture
 *   P.030.04 - Adaptive keyframe insertion strategy
 *
 * @module volumetric-bridge/volumetric-video
 */

// =============================================================================
// QUALITY TIERS (4DGCPro Progressive)
// =============================================================================

/**
 * Progressive quality tiers from 4DGCPro.
 * Each tier trades quality for bandwidth/decode cost.
 * A single bitstream supports all tiers via hierarchical layer selection.
 */
export type VolumetricQualityTier = 'low' | 'mid' | 'high';

/**
 * Quality tier configuration derived from 4DGCPro benchmarks.
 */
export interface QualityTierConfig {
  /** Human-readable tier name */
  readonly tier: VolumetricQualityTier;
  /** Number of hierarchical Gaussian layers to include (out of 6 total) */
  readonly layerCount: number;
  /** Target PSNR in dB */
  readonly targetPSNR: number;
  /** Approximate per-frame size in KB */
  readonly approxFrameSizeKB: number;
  /** Maximum Gaussians to render at this tier */
  readonly maxGaussians: number;
  /** Whether to use uint16 (true) or uint8 (false) for position precision */
  readonly highPrecisionPositions: boolean;
}

/**
 * Predefined quality tier configurations based on 4DGCPro paper benchmarks.
 */
export const QUALITY_TIER_CONFIGS: Record<VolumetricQualityTier, QualityTierConfig> = {
  low: {
    tier: 'low',
    layerCount: 2,
    targetPSNR: 27.69,
    approxFrameSizeKB: 330,
    maxGaussians: 50_000,
    highPrecisionPositions: false,
  },
  mid: {
    tier: 'mid',
    layerCount: 4,
    targetPSNR: 28.68,
    approxFrameSizeKB: 660,
    maxGaussians: 150_000,
    highPrecisionPositions: false,
  },
  high: {
    tier: 'high',
    layerCount: 6,
    targetPSNR: 29.47,
    approxFrameSizeKB: 1310,
    maxGaussians: 500_000,
    highPrecisionPositions: true,
  },
};

// =============================================================================
// PLATFORM TARGETS
// =============================================================================

/**
 * Target platform for performance optimization.
 */
export type TargetPlatform = 'desktop' | 'tablet' | 'mobile' | 'vr';

/**
 * Platform performance profile with FPS targets.
 */
export interface PlatformProfile {
  readonly platform: TargetPlatform;
  /** Target FPS (desktop: 52+, mobile: 25+) */
  readonly targetFPS: number;
  /** Maximum decode time budget in ms */
  readonly maxDecodeTimeMs: number;
  /** Maximum render time budget in ms */
  readonly maxRenderTimeMs: number;
  /** Default quality tier for this platform */
  readonly defaultTier: VolumetricQualityTier;
  /** Maximum memory budget in MB */
  readonly maxMemoryMB: number;
}

/**
 * Platform profiles matching 4DGCPro benchmarks with project targets.
 * Desktop: 52+ FPS (19.2ms budget)
 * Mobile: 25+ FPS (40ms budget)
 */
export const PLATFORM_PROFILES: Record<TargetPlatform, PlatformProfile> = {
  desktop: {
    platform: 'desktop',
    targetFPS: 52,
    maxDecodeTimeMs: 10,
    maxRenderTimeMs: 5,
    defaultTier: 'high',
    maxMemoryMB: 512,
  },
  tablet: {
    platform: 'tablet',
    targetFPS: 35,
    maxDecodeTimeMs: 16,
    maxRenderTimeMs: 14,
    defaultTier: 'mid',
    maxMemoryMB: 256,
  },
  mobile: {
    platform: 'mobile',
    targetFPS: 25,
    maxDecodeTimeMs: 20,
    maxRenderTimeMs: 15,
    defaultTier: 'low',
    maxMemoryMB: 128,
  },
  vr: {
    platform: 'vr',
    targetFPS: 72,
    maxDecodeTimeMs: 5,
    maxRenderTimeMs: 4,
    defaultTier: 'mid',
    maxMemoryMB: 256,
  },
};

// =============================================================================
// FRAME TYPES
// =============================================================================

/**
 * Frame type following H.264 convention used by 4DGCPro.
 * I-frames: Full SPZ keyframes (independently decodable)
 * P-frames: Temporal delta frames (depends on previous frame)
 * No B-frames per 4DGCPro specification.
 */
export type FrameType = 'I' | 'P';

/**
 * Motion decomposition classification per 4D-MoDe.
 * Each Gaussian is classified as static (background) or dynamic (foreground).
 */
export type GaussianMotionClass = 'static' | 'dynamic';

/**
 * Per-Gaussian motion delta from 4D-MoDe temporal encoding.
 * Translation + rotation increments predicted by motion grid.
 */
export interface GaussianMotionDelta {
  /** Translation delta (dx, dy, dz) */
  translation: Float32Array;  // N*3
  /** Rotation delta as quaternion (dx, dy, dz, dw) */
  rotation: Float32Array;     // N*4
  /** Scale residual (dsx, dsy, dsz) — only for dynamic Gaussians */
  scaleResidual?: Float32Array;  // N*3
  /** Opacity residual — only for dynamic Gaussians */
  opacityResidual?: Float32Array;  // N
  /** Color residual (dr, dg, db) — only for dynamic Gaussians */
  colorResidual?: Float32Array;  // N*3
}

/**
 * Decoded keyframe (I-frame) data.
 * Contains full Gaussian attribute set from SPZ decompression.
 */
export interface KeyframeData {
  /** Frame index in the sequence */
  frameIndex: number;
  /** Frame type (always 'I' for keyframes) */
  frameType: 'I';
  /** Timestamp in seconds */
  timestamp: number;
  /** Gaussian positions (xyz) */
  positions: Float32Array;     // N*3
  /** Gaussian scales (sx, sy, sz) */
  scales: Float32Array;        // N*3
  /** Gaussian rotations (quaternion xyzw) */
  rotations: Float32Array;     // N*4
  /** Gaussian colors (rgba) */
  colors: Float32Array;        // N*4
  /** Gaussian opacities */
  opacities: Float32Array;     // N
  /** Total Gaussian count */
  gaussianCount: number;
  /** Per-Gaussian motion classification */
  motionClasses?: Uint8Array;  // N (0=static, 1=dynamic)
  /** Decode time in milliseconds */
  decodeTimeMs: number;
}

/**
 * Decoded delta frame (P-frame) data.
 * Contains motion deltas relative to the reference frame.
 */
export interface DeltaFrameData {
  /** Frame index in the sequence */
  frameIndex: number;
  /** Frame type (always 'P' for delta frames) */
  frameType: 'P';
  /** Timestamp in seconds */
  timestamp: number;
  /** Index of the reference frame this delta is relative to */
  referenceFrameIndex: number;
  /** Motion deltas for existing Gaussians */
  motionDelta: GaussianMotionDelta;
  /** Indices of Gaussians that were compensated (newly spawned) */
  compensatedIndices?: Uint32Array;
  /** Positions for compensated Gaussians */
  compensatedPositions?: Float32Array;
  /** Scales for compensated Gaussians */
  compensatedScales?: Float32Array;
  /** Rotations for compensated Gaussians */
  compensatedRotations?: Float32Array;
  /** Colors for compensated Gaussians */
  compensatedColors?: Float32Array;
  /** Number of newly compensated Gaussians */
  compensatedCount: number;
  /** Ratio of new-to-existing dynamic Gaussians (for keyframe insertion decision) */
  dynamicChangeRatio: number;
  /** Decode time in milliseconds */
  decodeTimeMs: number;
}

/**
 * Union type for any decoded frame.
 */
export type DecodedFrame = KeyframeData | DeltaFrameData;

// =============================================================================
// STREAM MANIFEST
// =============================================================================

/**
 * Volumetric video stream manifest.
 * Describes the structure of a volumetric video for progressive streaming.
 */
export interface VolumetricVideoManifest {
  /** Format version identifier */
  version: string;
  /** Total duration in seconds */
  duration: number;
  /** Frame rate (target playback FPS) */
  frameRate: number;
  /** Total frame count */
  frameCount: number;
  /** Number of hierarchical Gaussian layers (4DGCPro: 6) */
  layerCount: number;
  /** Maximum Gaussian count across all frames */
  maxGaussianCount: number;
  /** Spherical harmonics degree (0-3) */
  shDegree: number;
  /** SPZ fractional bits for fixed-point positions */
  fractionalBits: number;
  /** Keyframe interval (frames between I-frames, 0 = adaptive only) */
  keyframeInterval: number;
  /** Dynamic change ratio threshold for adaptive keyframe insertion */
  keyframeThreshold: number;
  /** Available quality tiers in this stream */
  availableTiers: VolumetricQualityTier[];
  /** Per-frame index for random access */
  frameIndex: FrameIndexEntry[];
  /** Base URL for frame data chunks */
  baseUrl: string;
}

/**
 * Index entry for a single frame in the manifest.
 */
export interface FrameIndexEntry {
  /** Frame index */
  index: number;
  /** Frame type */
  type: FrameType;
  /** Byte offset in the stream */
  byteOffset: number;
  /** Byte length of this frame's data */
  byteLength: number;
  /** Timestamp in seconds */
  timestamp: number;
  /** Reference frame index (for P-frames) */
  referenceFrame?: number;
  /** Gaussian count in this frame */
  gaussianCount: number;
  /** Per-tier byte ranges within this frame */
  tierRanges: Record<VolumetricQualityTier, { offset: number; length: number }>;
}

// =============================================================================
// PLAYER CONFIGURATION
// =============================================================================

/**
 * Configuration for the VolumetricVideoPlayer.
 */
export interface VolumetricVideoPlayerConfig {
  /** URL to the stream manifest */
  manifestUrl: string;
  /** Target platform for performance tuning */
  platform?: TargetPlatform;
  /** Quality tier override (default: auto from platform) */
  qualityTier?: VolumetricQualityTier;
  /** Enable adaptive quality switching based on decode performance */
  adaptiveQuality?: boolean;
  /** Adaptive keyframe threshold (default: 0.15 per 4D-MoDe) */
  keyframeThreshold?: number;
  /** Buffer size in frames (how many frames to prefetch) */
  bufferSize?: number;
  /** Enable H.264 hardware decode path (default: true) */
  enableHardwareDecode?: boolean;
  /** Maximum memory budget in MB (overrides platform default) */
  maxMemoryMB?: number;
  /** Maximum Gaussian count (overrides tier default) */
  maxGaussians?: number;
  /** Whether to loop playback */
  loop?: boolean;
  /** Auto-play on load */
  autoplay?: boolean;
  /** Playback speed multiplier (default: 1.0) */
  playbackSpeed?: number;
  /** Enable motion decomposition (static/dynamic separation from 4D-MoDe) */
  enableMotionDecomposition?: boolean;
  /** Transform to apply to the rendered Gaussians */
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
}

// =============================================================================
// PLAYER STATE
// =============================================================================

/**
 * Playback state of the volumetric video player.
 */
export type PlaybackState = 'idle' | 'loading' | 'buffering' | 'playing' | 'paused' | 'seeking' | 'ended' | 'error';

/**
 * Detailed player status snapshot.
 */
export interface PlayerStatus {
  /** Current playback state */
  state: PlaybackState;
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Current frame index */
  currentFrame: number;
  /** Total frame count */
  totalFrames: number;
  /** Current quality tier */
  qualityTier: VolumetricQualityTier;
  /** Effective FPS (actual rendering rate) */
  effectiveFPS: number;
  /** Decode time for last frame in ms */
  lastDecodeTimeMs: number;
  /** Render time for last frame in ms */
  lastRenderTimeMs: number;
  /** Total pipeline time for last frame in ms */
  lastTotalTimeMs: number;
  /** Number of frames in the prefetch buffer */
  bufferedFrames: number;
  /** Current Gaussian count being rendered */
  activeGaussianCount: number;
  /** Number of keyframes decoded so far */
  keyframesDecoded: number;
  /** Number of delta frames decoded so far */
  deltaFramesDecoded: number;
  /** Whether adaptive quality is active */
  adaptiveQualityActive: boolean;
  /** Whether hardware decode is being used */
  hardwareDecodeActive: boolean;
  /** Memory usage in MB */
  memoryUsageMB: number;
  /** Dropped frame count */
  droppedFrames: number;
  /** Whether motion decomposition separated static/dynamic */
  motionDecompositionActive: boolean;
}

// =============================================================================
// EVENTS
// =============================================================================

/**
 * Events emitted by the volumetric video player.
 */
export type VolumetricVideoEvent =
  | { type: 'manifest-loaded'; manifest: VolumetricVideoManifest }
  | { type: 'state-change'; state: PlaybackState; previousState: PlaybackState }
  | { type: 'frame-decoded'; frame: DecodedFrame }
  | { type: 'frame-rendered'; frameIndex: number; renderTimeMs: number }
  | { type: 'keyframe-inserted'; frameIndex: number; reason: 'scheduled' | 'adaptive' | 'seek' }
  | { type: 'quality-change'; tier: VolumetricQualityTier; previousTier: VolumetricQualityTier; reason: string }
  | { type: 'buffer-update'; bufferedFrames: number; bufferHealthPercent: number }
  | { type: 'progress'; currentTime: number; duration: number }
  | { type: 'ended' }
  | { type: 'error'; error: Error; recoverable: boolean }
  | { type: 'performance-warning'; message: string; metric: string; value: number; threshold: number };

export type VolumetricVideoEventHandler = (event: VolumetricVideoEvent) => void;

// =============================================================================
// DECODE PIPELINE INTERFACES
// =============================================================================

/**
 * Interface for the H.264 hardware decoder abstraction.
 * Wraps WebCodecs VideoDecoder for 4DGCPro frame decoding.
 */
export interface IHardwareDecoder {
  /** Whether hardware decode is supported and initialized */
  readonly isSupported: boolean;
  /** Initialize the decoder for the given stream parameters */
  initialize(config: HardwareDecoderConfig): Promise<void>;
  /** Decode a compressed frame buffer into Gaussian attribute maps */
  decode(encodedData: ArrayBuffer, frameType: FrameType): Promise<DecodedAttributeMaps>;
  /** Flush pending frames */
  flush(): Promise<void>;
  /** Release all resources */
  dispose(): void;
}

/**
 * Configuration for the H.264 hardware decoder.
 */
export interface HardwareDecoderConfig {
  /** Codec string (e.g. 'avc1.640028' for H.264 High Profile Level 4.0) */
  codec: string;
  /** Width of the attribute map texture */
  codedWidth: number;
  /** Height of the attribute map texture */
  codedHeight: number;
  /** Color format (4DGCPro uses YUV 4:4:4) */
  colorFormat: 'yuv444' | 'yuv420';
  /** Number of reference frames (4DGCPro: 3) */
  referenceFrames: number;
  /** Hardware acceleration preference */
  hardwareAcceleration: 'prefer-hardware' | 'prefer-software' | 'no-preference';
}

/**
 * Decoded attribute maps from H.264 frames.
 * 4DGCPro encodes Gaussian attributes as stacked 2D single-channel maps.
 */
export interface DecodedAttributeMaps {
  /** Position attributes (uint16 or uint8 depending on tier) */
  positionMap: Uint8Array | Uint16Array;
  /** Scale attributes (uint8) */
  scaleMap: Uint8Array;
  /** Rotation attributes (uint8) */
  rotationMap: Uint8Array;
  /** Opacity attributes (uint8) */
  opacityMap: Uint8Array;
  /** Color attributes (uint8) */
  colorMap: Uint8Array;
  /** Map width */
  width: number;
  /** Map height */
  height: number;
  /** Number of valid Gaussians encoded */
  gaussianCount: number;
}

// =============================================================================
// TEMPORAL DELTA PIPELINE
// =============================================================================

/**
 * Interface for the temporal delta processor (4D-MoDe pipeline).
 */
export interface ITemporalDeltaProcessor {
  /** Apply a delta frame to a reference keyframe, producing the reconstructed frame */
  applyDelta(reference: KeyframeData, delta: DeltaFrameData): KeyframeData;
  /** Classify Gaussians as static/dynamic based on motion thresholds */
  classifyMotion(
    currentPositions: Float32Array,
    previousPositions: Float32Array,
    currentScales: Float32Array,
    previousScales: Float32Array,
    thresholds: MotionClassificationThresholds,
  ): Uint8Array;
  /** Calculate the dynamic change ratio for adaptive keyframe decisions */
  computeDynamicChangeRatio(
    delta: DeltaFrameData,
    referenceGaussianCount: number,
  ): number;
}

/**
 * Thresholds for motion classification per 4D-MoDe.
 */
export interface MotionClassificationThresholds {
  /** Normalized displacement threshold (default: 4.5) */
  displacementThreshold: number;
  /** Scale change threshold (default: 0.1) */
  scaleChangeThreshold: number;
  /** Error refinement threshold (default: 0.02) */
  errorThreshold: number;
  /** KNN majority voting K (default: 5) */
  knnK: number;
}

/**
 * Default motion classification thresholds from 4D-MoDe paper.
 */
export const DEFAULT_MOTION_THRESHOLDS: MotionClassificationThresholds = {
  displacementThreshold: 4.5,
  scaleChangeThreshold: 0.1,
  errorThreshold: 0.02,
  knnK: 5,
};

// =============================================================================
// ADAPTIVE KEYFRAME INSERTION
// =============================================================================

/**
 * Configuration for adaptive keyframe insertion per P.030.04.
 * Combines 4D-MoDe's dynamic change ratio with a configurable threshold.
 */
export interface AdaptiveKeyframeConfig {
  /**
   * Dynamic change ratio threshold for triggering keyframe insertion.
   * When the ratio of new dynamic Gaussians to existing dynamics exceeds
   * this threshold, a new keyframe is forced.
   * Default: 0.15 (15%) per 4D-MoDe paper specification.
   */
  threshold: number;
  /**
   * Maximum frames between forced keyframes regardless of motion.
   * Acts as a safety net for seek performance.
   * Default: 30 (1 second at 30fps)
   */
  maxInterKeyframeDistance: number;
  /**
   * Minimum frames between keyframes to prevent thrashing.
   * Default: 5
   */
  minInterKeyframeDistance: number;
  /**
   * Enable exponential moving average smoothing of the change ratio
   * to prevent single-frame spikes from causing unnecessary keyframes.
   * Default: true
   */
  enableSmoothing: boolean;
  /**
   * EMA alpha for smoothing (0-1, higher = more responsive).
   * Default: 0.3
   */
  smoothingAlpha: number;
}

/**
 * Default adaptive keyframe configuration.
 */
export const DEFAULT_ADAPTIVE_KEYFRAME_CONFIG: AdaptiveKeyframeConfig = {
  threshold: 0.15,
  maxInterKeyframeDistance: 30,
  minInterKeyframeDistance: 5,
  enableSmoothing: true,
  smoothingAlpha: 0.3,
};

// =============================================================================
// PERFORMANCE METRICS
// =============================================================================

/**
 * Rolling performance metrics for adaptive quality decisions.
 */
export interface PerformanceMetrics {
  /** Average decode time over recent window (ms) */
  avgDecodeTimeMs: number;
  /** Average render time over recent window (ms) */
  avgRenderTimeMs: number;
  /** Average total pipeline time (ms) */
  avgTotalTimeMs: number;
  /** Effective FPS */
  effectiveFPS: number;
  /** 95th percentile total time (ms) */
  p95TotalTimeMs: number;
  /** Frame drop rate (0-1) */
  frameDropRate: number;
  /** Current memory usage (MB) */
  memoryUsageMB: number;
  /** Number of quality tier changes in the last 10 seconds */
  recentTierChanges: number;
}
