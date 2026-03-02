/**
 * @hololand/volumetric-bridge
 *
 * Unified loader for volumetric content — Gaussian Splatting, photogrammetry,
 * NeRF, point clouds, and volumetric video playback.
 * Outputs Three.js Object3D for scene integration.
 *
 * Volumetric Video Playback Engine:
 * - SPZ base frame loading (I-frames via Niantic compressed Gaussian splats)
 * - 4D-MoDe temporal delta streaming (motion-decoupled P-frames)
 * - 4DGCPro progressive quality tiers (H.264 hardware decode)
 * - Adaptive keyframe insertion at 15% dynamic threshold
 * - Performance-adaptive quality switching (52+ FPS desktop, 25+ FPS mobile)
 *
 * NeRF-to-GS Capture Flow:
 * - NeRF feature extraction for Gaussian Splatting initialization
 * - Static/dynamic decomposition with lookahead temporal classification
 * - V2NeRF-style hybrid representation (GS surfaces + volumetric NeRF)
 * - V3C MIV (MPEG Immersive Video) fallback path for legacy decoders
 *
 * @module volumetric-bridge
 */

// Types
export type {
  VolumetricSourceType,
  NerfFormat,
  SplatFormat,
  PhotogrammetryFormat,
  VolumetricLoadConfig,
  NerfConfig,
  GaussianSplatConfig,
  PhotogrammetryConfig,
  VolumetricLoadResult,
  VolumetricMetadata,
  VolumetricEvent,
  VolumetricEventHandler,
  IVolumetricLoader,
} from './types';

// Loaders
export { GaussianSplatLoader } from './GaussianSplatLoader';
export { PhotogrammetryLoader } from './PhotogrammetryLoader';

// Bridge (unified loader)
export { VolumetricBridge, loadVolumetric } from './VolumetricBridge';

// LOD Manager (octree-based LOD for Gaussian Splatting)
export {
  GaussianSplatLODManager,
  VR_OPTIMIZED_CONFIG,
  VR_CONSERVATIVE_CONFIG,
  DESKTOP_CONFIG,
} from './GaussianSplatLODManager';
export type {
  SplatDataArrays,
  GaussianLODConfig,
  LODUpdateResult,
} from './GaussianSplatLODManager';

// Octree LOD System (spatial partitioning + frustum culling + hysteresis)
export {
  OctreeLODSystem,
  extractFrustumPlanes,
} from './OctreeLODSystem';
export type {
  AABB,
  FrustumPlanes,
  OctreeLODConfig,
  OctreeLODUpdateResult,
  CrossFadeState,
  MotionLODBiasState,
} from './OctreeLODSystem';

// Budget Manager (per-frame Gaussian budget enforcement for VR/AR)
export {
  GaussianBudgetManager,
  BUDGET_VR_OPTIMIZED,
  BUDGET_VR_CONSERVATIVE,
  BUDGET_DESKTOP,
  BUDGET_UNLIMITED,
} from './GaussianBudgetManager';
export type {
  GaussianBudgetConfig,
  MemoryThresholds,
  BudgetScene,
  BudgetAvatar,
  BudgetEnforcementResult,
  SceneAllocation,
  MemoryState,
  BudgetEvent,
  BudgetEventHandler,
} from './GaussianBudgetManager';

// Volumetric Video Playback Engine
// SPZ base frames + 4D-MoDe temporal delta streaming + 4DGCPro progressive quality
export {
  VolumetricVideoPlayer,
  HardwareDecoder,
  dequantizeAttributeMaps,
  TemporalDeltaProcessor,
  AdaptiveKeyframeManager,
  FrameBuffer,
  PerformanceMonitor,
  QUALITY_TIER_CONFIGS,
  PLATFORM_PROFILES,
  DEFAULT_MOTION_THRESHOLDS,
  DEFAULT_ADAPTIVE_KEYFRAME_CONFIG,
} from './volumetric-video';
export type {
  VolumetricQualityTier,
  QualityTierConfig,
  TargetPlatform,
  PlatformProfile,
  FrameType,
  GaussianMotionClass,
  GaussianMotionDelta,
  KeyframeData,
  DeltaFrameData,
  DecodedFrame,
  VolumetricVideoManifest,
  FrameIndexEntry,
  VolumetricVideoPlayerConfig,
  PlaybackState,
  PlayerStatus,
  VolumetricVideoEvent,
  VolumetricVideoEventHandler,
  IHardwareDecoder,
  HardwareDecoderConfig,
  DecodedAttributeMaps,
  ITemporalDeltaProcessor,
  MotionClassificationThresholds,
  AdaptiveKeyframeConfig,
  PerformanceMetrics,
  KeyframeDecision,
} from './volumetric-video';

// =============================================================================
// UI COMPONENTS (React)
// =============================================================================
// LOD quality slider, volumetric timeline, metrics display, quality tier selector
// Requires React as a peer dependency (optional — tree-shaken if unused)

export {
  LODQualitySlider,
  VolumetricTimeline,
  RenderingMetricsDisplay,
  FPSHistoryGraph,
  QualityTierSelector,
  useLODController,
  useVolumetricTimeline,
  usePerformanceMetrics,
  LOD_TIER_MAPPINGS,
} from './ui';

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
  UseLODControllerOptions,
  UseVolumetricTimelineOptions,
  UsePerformanceMetricsOptions,
} from './ui';

// =============================================================================
// NERF-TO-GS CAPTURE FLOW
// =============================================================================
// NeRF feature extraction -> GS initialization -> Static/dynamic decomposition
// -> V2NeRF hybrid representation -> V3C MIV fallback encoding

export {
  // Capture Flow Orchestrator
  NeRFToGSCaptureFlow,

  // NeRF Feature Extraction
  NeRFFeatureExtractor,
  BakedDensityGridQuery,
  HttpNeRFQuery,

  // Static/Dynamic Decomposition
  StaticDynamicDecomposer,

  // Hybrid NeRF-GS Representation
  HybridNeRFGSRepresentation,

  // V3C MIV Fallback
  V3CMIVFallbackEncoder,
  generateOrbitalViews,
} from './nerf-to-gs';

export type {
  // NeRF Feature Extraction Types
  NeRFModelFormat,
  NeRFSample,
  NeRFFeatureExtractionConfig,
  NeRFFeatureExtractionResult,
  NeRFExtractionMetadata,
  INeRFDensityQuery,

  // Static/Dynamic Decomposition Types
  MotionClass,
  GaussianMotionDescriptor,
  DecompositionConfig,
  DecompositionResult,
  DecompositionStats,

  // Hybrid Representation Types
  RegionRenderMode,
  HybridRegion,
  HybridRepresentationConfig,
  HybridRepresentationResult,
  HybridAnalysisStats,
  VolumetricTrigger,

  // V3C MIV Fallback Types
  V3CProfile,
  MIVAtlasConfig,
  V3CMIVFallbackConfig,
  V3CMIVFallbackResult,
  V3CBitstreamMetadata,
  MIVEncodingStats,
  MIVAtlasPatch,
  MIVSourceView,

  // Capture Flow Types
  CaptureFlowStage,
  CaptureFlowProgress,
  NeRFToGSCaptureConfig,
  NeRFToGSCaptureResult,
  CaptureFlowPipelineStats,
  CaptureFlowEventHandler,
  TemporalFrameProvider,
} from './nerf-to-gs';
