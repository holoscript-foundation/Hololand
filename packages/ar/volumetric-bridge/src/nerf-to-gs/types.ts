/**
 * NeRF-to-GS Capture Flow Types
 *
 * Type definitions for the NeRF feature extraction, Gaussian initialization,
 * static/dynamic decomposition, hybrid representation, and V3C MIV fallback path.
 *
 * Research references:
 *   - NeRF-GS (ICCV 2025): Joint NeRF + 3DGS optimization with feature alignment
 *   - DeGauss (ICCV 2025): Dynamic-static decomposition with Gaussian splatting
 *   - HybridNeRF (CVPR 2024): Adaptive volumetric surface rendering
 *   - MPEG V3C / MIV (ISO/IEC 23090-5): Visual volumetric video-based coding
 *   - DeSiRe-GS (CVPR 2025): 4D street Gaussians for static-dynamic decomposition
 *
 * @module volumetric-bridge/nerf-to-gs
 */

// =============================================================================
// NERF FEATURE EXTRACTION
// =============================================================================

/**
 * NeRF model format supported for feature extraction.
 */
export type NeRFModelFormat =
  | 'instant_ngp'    // NVIDIA Instant-NGP hash grid
  | 'nerfacto'       // Nerfstudio nerfacto
  | 'mipnerf360'     // Mip-NeRF 360
  | 'tensorf'        // TensoRF (VM decomposition)
  | 'zip_nerf'       // Zip-NeRF
  | 'custom';        // Custom checkpoint with density/color query interface

/**
 * Queried sample from a NeRF model at a 3D position.
 */
export interface NeRFSample {
  /** World-space position */
  position: [number, number, number];
  /** Density (sigma) at this point */
  density: number;
  /** RGB color at this point (view-independent, averaged) */
  color: [number, number, number];
  /** Spherical harmonics coefficients (degree 0-3) */
  shCoeffs?: Float32Array;
  /** Gradient of density (for normal estimation) */
  densityGradient?: [number, number, number];
}

/**
 * Configuration for NeRF feature extraction.
 */
export interface NeRFFeatureExtractionConfig {
  /** NeRF model format. */
  format: NeRFModelFormat;
  /** URL or path to the NeRF checkpoint. */
  checkpointUrl: string;
  /** Scene bounding box: [minX, minY, minZ, maxX, maxY, maxZ]. */
  sceneBounds: [number, number, number, number, number, number];
  /**
   * Density threshold to filter low-density samples.
   * Points below this threshold are not converted to Gaussians.
   * Default: 0.5
   */
  densityThreshold: number;
  /**
   * Voxel grid resolution for initial sampling.
   * Higher = more initial points but slower extraction.
   * Default: 128 (128^3 = ~2M samples)
   */
  gridResolution: number;
  /**
   * Maximum number of Gaussians to generate from NeRF.
   * Default: 500_000
   */
  maxGaussians: number;
  /**
   * Number of importance-sampled refinement passes.
   * Each pass doubles density in high-gradient regions.
   * Default: 2
   */
  refinementPasses: number;
  /**
   * SH degree for color representation (0-3).
   * 0 = view-independent color (fastest)
   * 3 = full view-dependent effects (best quality)
   * Default: 0
   */
  shDegree: number;
  /**
   * Whether to estimate surface normals from density gradients.
   * Useful for initializing Gaussian orientations.
   * Default: true
   */
  estimateNormals: boolean;
  /**
   * Scale factor applied to Gaussian covariance from density field.
   * Lower = tighter Gaussians, sharper details.
   * Default: 1.0
   */
  covarianceScale: number;
}

/**
 * Result of NeRF feature extraction -- parallel arrays ready for GS initialization.
 */
export interface NeRFFeatureExtractionResult {
  /** XYZ positions (N * 3) */
  positions: Float32Array;
  /** SH color coefficients or RGB (N * channels) */
  colors: Float32Array;
  /** Gaussian scales initialized from density field (N * 3) */
  scales: Float32Array;
  /** Gaussian rotations initialized from density gradients (N * 4, quaternions) */
  rotations: Float32Array;
  /** Opacity initialized from density via sigmoid (N) */
  opacities: Float32Array;
  /** Raw density values (N) -- useful for decomposition */
  densities: Float32Array;
  /** Density gradients (N * 3) -- useful for normal-based ops */
  densityGradients?: Float32Array;
  /** Number of extracted Gaussians */
  count: number;
  /** Extraction metadata */
  metadata: NeRFExtractionMetadata;
}

export interface NeRFExtractionMetadata {
  /** Total voxels sampled */
  totalSamples: number;
  /** Samples that passed density threshold */
  aboveThreshold: number;
  /** Final Gaussian count (after downsampling) */
  finalCount: number;
  /** Extraction time in milliseconds */
  extractionTimeMs: number;
  /** Scene bounding box used */
  sceneBounds: [number, number, number, number, number, number];
  /** Grid resolution used */
  gridResolution: number;
  /** Density threshold used */
  densityThreshold: number;
}

// =============================================================================
// STATIC / DYNAMIC DECOMPOSITION
// =============================================================================

/**
 * Motion classification for a Gaussian splat.
 */
export type MotionClass =
  | 'static'           // No motion across temporal window
  | 'quasi_static'     // Negligible motion (e.g., swaying vegetation)
  | 'dynamic_rigid'    // Rigid body motion (e.g., moving car)
  | 'dynamic_deform'   // Deformable motion (e.g., person walking)
  | 'transient';       // Appears/disappears (e.g., shadow, reflection)

/**
 * Per-Gaussian motion descriptor from temporal analysis.
 */
export interface GaussianMotionDescriptor {
  /** Index in the original Gaussian array */
  gaussianIndex: number;
  /** Classified motion type */
  motionClass: MotionClass;
  /** Motion magnitude (world units per second) */
  motionMagnitude: number;
  /** Motion direction (unit vector, for rigid bodies) */
  motionDirection: [number, number, number];
  /** Confidence in the classification (0-1) */
  confidence: number;
  /** Number of temporal frames analyzed */
  framesAnalyzed: number;
  /**
   * Lookahead prediction: expected position at t+dt.
   * Used for temporal interpolation and motion compensation.
   */
  predictedPosition?: [number, number, number];
  /**
   * Temporal consistency score: how stable is this classification
   * across the lookahead window. 1.0 = perfectly consistent.
   */
  temporalConsistency: number;
}

/**
 * Configuration for static/dynamic decomposition.
 */
export interface DecompositionConfig {
  /**
   * Number of future frames to analyze for lookahead classification.
   * Higher = more accurate but slower and more memory.
   * Default: 8
   */
  lookaheadFrames: number;
  /**
   * Temporal window size (seconds) for motion analysis.
   * Default: 1.0
   */
  temporalWindowSec: number;
  /**
   * Motion magnitude threshold for static classification (world units/sec).
   * Below this = static. Default: 0.01
   */
  staticThreshold: number;
  /**
   * Motion magnitude threshold for quasi-static classification.
   * Between staticThreshold and this = quasi_static. Default: 0.05
   */
  quasiStaticThreshold: number;
  /**
   * Opacity variance threshold for transient detection.
   * High variance in opacity across frames = transient. Default: 0.3
   */
  transientOpacityThreshold: number;
  /**
   * Rigid body motion detection: max residual after fitting
   * rigid transform (SE3). Below this = rigid. Default: 0.02
   */
  rigidResidualThreshold: number;
  /**
   * Minimum confidence for classification to be accepted.
   * Below this, Gaussian defaults to 'dynamic_deform'. Default: 0.6
   */
  minConfidence: number;
  /**
   * Whether to use density gradient alignment for improved classification.
   * Requires density gradients from NeRF extraction. Default: true
   */
  useDensityGradients: boolean;
  /**
   * Spatial neighborhood radius for coherent classification.
   * Nearby Gaussians should have similar motion classes. Default: 0.1
   */
  spatialCoherenceRadius: number;
}

/**
 * Result of static/dynamic decomposition.
 */
export interface DecompositionResult {
  /** Per-Gaussian motion descriptors */
  descriptors: GaussianMotionDescriptor[];
  /** Indices of static Gaussians */
  staticIndices: Uint32Array;
  /** Indices of quasi-static Gaussians */
  quasiStaticIndices: Uint32Array;
  /** Indices of rigid-dynamic Gaussians */
  rigidDynamicIndices: Uint32Array;
  /** Indices of deformable-dynamic Gaussians */
  deformDynamicIndices: Uint32Array;
  /** Indices of transient Gaussians */
  transientIndices: Uint32Array;
  /** Total Gaussians analyzed */
  totalGaussians: number;
  /** Decomposition statistics */
  stats: DecompositionStats;
}

export interface DecompositionStats {
  staticCount: number;
  quasiStaticCount: number;
  rigidDynamicCount: number;
  deformDynamicCount: number;
  transientCount: number;
  averageConfidence: number;
  decompositionTimeMs: number;
  framesAnalyzed: number;
}

// =============================================================================
// HYBRID REPRESENTATION (V2NeRF-Style)
// =============================================================================

/**
 * Region classification for hybrid NeRF-GS rendering.
 * Determines whether a region should use volumetric (NeRF) or surface (GS) rendering.
 */
export type RegionRenderMode = 'gaussian_splat' | 'volumetric_nerf' | 'hybrid_blend';

/**
 * A spatial region with its rendering mode assignment.
 */
export interface HybridRegion {
  /** Axis-aligned bounding box: [minX, minY, minZ, maxX, maxY, maxZ] */
  bounds: [number, number, number, number, number, number];
  /** Which representation to use for this region */
  renderMode: RegionRenderMode;
  /** Surface confidence: how well GS approximates this region (0-1) */
  surfaceConfidence: number;
  /** Volumetric complexity: how much this region needs volumetric rendering (0-1) */
  volumetricComplexity: number;
  /** Blending weight for hybrid regions (0 = full GS, 1 = full NeRF) */
  nerfBlendWeight: number;
  /** Number of Gaussians assigned to this region */
  gaussianCount: number;
  /** Octree depth of this region */
  octreeDepth: number;
}

/**
 * Configuration for the hybrid NeRF-GS representation.
 */
export interface HybridRepresentationConfig {
  /**
   * Octree subdivision depth for spatial partitioning.
   * Higher = finer region classification. Default: 5
   */
  octreeDepth: number;
  /**
   * Surface confidence threshold below which volumetric rendering kicks in.
   * Default: 0.7
   */
  surfaceConfidenceThreshold: number;
  /**
   * Volumetric complexity threshold above which volumetric rendering is preferred.
   * Default: 0.5
   */
  volumetricComplexityThreshold: number;
  /**
   * Maximum fraction of the scene that can use volumetric rendering.
   * Budget constraint for performance. Default: 0.15 (15%)
   */
  maxVolumetricFraction: number;
  /**
   * Ray marching steps for volumetric regions. Default: 64
   */
  volumetricMarchSteps: number;
  /**
   * Blend transition width (world units) at region boundaries. Default: 0.1
   */
  blendTransitionWidth: number;
  /**
   * Whether to use the density field for surface confidence estimation.
   * Requires NeRF density access. Default: true
   */
  useDensityForConfidence: boolean;
  /**
   * Categories of difficult regions that trigger volumetric rendering.
   */
  volumetricTriggers: VolumetricTrigger[];
}

/**
 * Conditions that trigger volumetric rendering for a region.
 */
export type VolumetricTrigger =
  | 'semi_transparent'    // Glass, smoke, fog
  | 'thin_structure'      // Hair, grass, wire
  | 'high_frequency'      // Fine texture details lost in GS
  | 'specular_reflection' // Mirror-like surfaces
  | 'subsurface_scatter'  // Skin, marble, wax
  | 'volumetric_media';   // Clouds, fire, underwater caustics

/**
 * Result of hybrid representation analysis.
 */
export interface HybridRepresentationResult {
  /** All classified regions */
  regions: HybridRegion[];
  /** Regions using GS rendering (majority, fast) */
  gsRegions: HybridRegion[];
  /** Regions using volumetric rendering (minority, quality) */
  nerfRegions: HybridRegion[];
  /** Regions using blended rendering */
  blendRegions: HybridRegion[];
  /** Fraction of volume using volumetric rendering */
  volumetricFraction: number;
  /** Estimated rendering cost multiplier vs pure GS */
  estimatedCostMultiplier: number;
  /** Analysis metadata */
  stats: HybridAnalysisStats;
}

export interface HybridAnalysisStats {
  totalRegions: number;
  gsRegionCount: number;
  nerfRegionCount: number;
  blendRegionCount: number;
  totalGaussiansInGS: number;
  volumetricVoxelCount: number;
  analysisTimeMs: number;
}

// =============================================================================
// V3C MIV FALLBACK PATH
// =============================================================================

/**
 * MPEG V3C profile for MIV encoding.
 */
export type V3CProfile =
  | 'miv_main'           // MVD (Multi-View + Depth)
  | 'miv_geometry_absent' // No geometry, decoder-side depth estimation
  | 'miv_extended';       // MPI (Multi-Plane Images)

/**
 * Atlas packing configuration for MIV encoding.
 */
export interface MIVAtlasConfig {
  /** Atlas texture resolution [width, height]. Default: [2048, 2048] */
  atlasResolution: [number, number];
  /** Maximum number of atlas pages. Default: 4 */
  maxAtlasPages: number;
  /** Patch packing strategy. Default: 'row_first' */
  packingStrategy: 'row_first' | 'best_fit' | 'guillotine';
  /** Minimum patch size in pixels. Default: 32 */
  minPatchSize: number;
  /** Padding between patches in pixels. Default: 2 */
  patchPadding: number;
}

/**
 * Configuration for V3C MIV fallback encoding.
 */
export interface V3CMIVFallbackConfig {
  /** V3C profile to use. Default: 'miv_main' */
  profile: V3CProfile;
  /** Source camera views for MVD encoding. */
  sourceViews: MIVSourceView[];
  /** Atlas packing configuration. */
  atlas: MIVAtlasConfig;
  /**
   * Depth quantization bits (8, 10, or 16). Default: 16
   */
  depthBits: 8 | 10 | 16;
  /**
   * Near/far depth range for quantization. Default: [0.1, 100.0]
   */
  depthRange: [number, number];
  /**
   * Texture codec for atlas encoding. Default: 'h264'
   * 'h264' = hardware decode available, 'hevc' = better quality
   */
  textureCodec: 'h264' | 'hevc' | 'vvc' | 'raw';
  /**
   * Quality parameter for texture encoding (0-51 for H.264/HEVC). Default: 22
   */
  textureQuality: number;
  /**
   * Whether to include occupancy maps for sparse views. Default: true
   */
  includeOccupancy: boolean;
  /**
   * Whether to generate a pruning mask to skip redundant patches. Default: true
   */
  enablePruning: boolean;
  /**
   * Maximum bitrate in kbps for the MIV stream. Default: 10000 (10 Mbps)
   */
  maxBitrateKbps: number;
}

/**
 * A source camera view for MIV encoding.
 */
export interface MIVSourceView {
  /** View identifier */
  viewId: string;
  /** Camera intrinsics: [fx, fy, cx, cy] */
  intrinsics: [number, number, number, number];
  /** Camera extrinsics: 4x4 view matrix (column-major) */
  extrinsics: Float32Array; // 16 elements
  /** Image resolution [width, height] */
  resolution: [number, number];
  /** Depth map URL or inline data */
  depthMapUrl?: string;
  depthMapData?: Float32Array;
  /** Color texture URL or inline data */
  textureUrl?: string;
  textureData?: Uint8Array;
  /** Whether this is a basic (kept) or additional (prunable) view */
  isBasicView: boolean;
}

/**
 * A patch in the MIV atlas.
 */
export interface MIVAtlasPatch {
  /** Source view this patch came from */
  sourceViewId: string;
  /** Region in source view: [x, y, width, height] */
  sourceRegion: [number, number, number, number];
  /** Position in atlas page: [x, y] */
  atlasPosition: [number, number];
  /** Size in atlas: [width, height] */
  atlasSize: [number, number];
  /** Atlas page index */
  atlasPage: number;
  /** Rotation applied to fit patch (0, 90, 180, 270) */
  rotation: 0 | 90 | 180 | 270;
  /** Depth range for this patch: [near, far] */
  depthRange: [number, number];
}

/**
 * Result of V3C MIV fallback encoding.
 */
export interface V3CMIVFallbackResult {
  /** Encoded atlas textures (RGBA, per page) */
  atlasTextures: Uint8Array[];
  /** Encoded depth atlas (per page) */
  atlasDepths: Uint8Array[];
  /** Occupancy maps (per page, optional) */
  atlasOccupancy?: Uint8Array[];
  /** Patch layout metadata */
  patches: MIVAtlasPatch[];
  /** V3C bitstream metadata (JSON-serializable for manifest) */
  v3cMetadata: V3CBitstreamMetadata;
  /** Encoding statistics */
  stats: MIVEncodingStats;
}

export interface V3CBitstreamMetadata {
  profile: V3CProfile;
  atlasCount: number;
  atlasResolution: [number, number];
  sourceViewCount: number;
  basicViewCount: number;
  patchCount: number;
  depthBits: number;
  depthRange: [number, number];
  textureCodec: string;
  totalSizeBytes: number;
}

export interface MIVEncodingStats {
  encodingTimeMs: number;
  atlasUtilization: number; // fraction of atlas pixels used (0-1)
  patchCount: number;
  prunedPatchCount: number;
  totalSizeBytes: number;
  bitrateKbps: number;
}

// =============================================================================
// CAPTURE FLOW ORCHESTRATOR
// =============================================================================

/**
 * Stage in the NeRF-to-GS capture flow pipeline.
 */
export type CaptureFlowStage =
  | 'idle'
  | 'nerf_loading'
  | 'feature_extraction'
  | 'gaussian_initialization'
  | 'decomposition'
  | 'hybrid_analysis'
  | 'miv_encoding'
  | 'finalization'
  | 'complete'
  | 'error';

/**
 * Progress event from the capture flow pipeline.
 */
export interface CaptureFlowProgress {
  stage: CaptureFlowStage;
  stageProgress: number; // 0-1 within current stage
  overallProgress: number; // 0-1 across all stages
  message: string;
  timestamp: number;
}

/**
 * Configuration for the full NeRF-to-GS capture flow.
 */
export interface NeRFToGSCaptureConfig {
  /** NeRF feature extraction configuration */
  nerfExtraction: NeRFFeatureExtractionConfig;
  /** Static/dynamic decomposition configuration (optional, for dynamic scenes) */
  decomposition?: DecompositionConfig;
  /** Hybrid representation configuration (optional) */
  hybridRepresentation?: HybridRepresentationConfig;
  /** V3C MIV fallback configuration (optional) */
  mivFallback?: V3CMIVFallbackConfig;
  /**
   * Whether to include temporal frames for dynamic decomposition.
   * If false, all Gaussians are treated as static. Default: false
   */
  enableDynamicDecomposition: boolean;
  /**
   * Whether to generate hybrid representation analysis.
   * If false, pure GS rendering is used. Default: false
   */
  enableHybridRepresentation: boolean;
  /**
   * Whether to generate V3C MIV fallback stream.
   * Enables legacy decoder compatibility. Default: false
   */
  enableMIVFallback: boolean;
  /**
   * Optional temporal frame provider for dynamic scenes.
   * Called to get NeRF features at different timestamps.
   */
  temporalFrameProvider?: TemporalFrameProvider;
}

/**
 * Provides NeRF features at different timestamps for temporal analysis.
 */
export interface TemporalFrameProvider {
  /** Get available frame timestamps */
  getTimestamps(): number[];
  /** Get NeRF features at a specific timestamp */
  getFeaturesAtTime(timestamp: number): Promise<NeRFFeatureExtractionResult>;
}

/**
 * Full result of the NeRF-to-GS capture flow.
 */
export interface NeRFToGSCaptureResult {
  /** Initialized Gaussian splat data (positions, colors, scales, rotations, opacities) */
  gaussianData: NeRFFeatureExtractionResult;
  /** Decomposition result (if enabled) */
  decomposition?: DecompositionResult;
  /** Hybrid representation analysis (if enabled) */
  hybridRepresentation?: HybridRepresentationResult;
  /** V3C MIV fallback data (if enabled) */
  mivFallback?: V3CMIVFallbackResult;
  /** Pipeline execution statistics */
  pipelineStats: CaptureFlowPipelineStats;
}

export interface CaptureFlowPipelineStats {
  totalTimeMs: number;
  stageTimings: Record<CaptureFlowStage, number>;
  gaussianCount: number;
  staticGaussianCount: number;
  dynamicGaussianCount: number;
  volumetricRegionCount: number;
  mivAtlasCount: number;
  estimatedMemoryMB: number;
}

/**
 * Event handler for capture flow events.
 */
export type CaptureFlowEventHandler = (event: CaptureFlowProgress) => void;
