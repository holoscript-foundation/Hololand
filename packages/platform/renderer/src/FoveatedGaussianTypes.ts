/**
 * FoveatedGaussianTypes
 *
 * Type definitions for the VRSplat-style foveated Gaussian splatting pipeline
 * with StopThePop temporal stabilization.
 *
 * Architecture reference:
 *   - VRSplat (I3D 2025): Single-pass foveated rasterization with variable-resolution tiles
 *   - StopThePop (SIGGRAPH 2024): Hierarchical per-pixel re-sorting for view-consistent rendering
 *   - VR-Splatting (I3D 2025): Foveated radiance field rendering at 90Hz
 *
 * Target: 8-12ms stereo frame budget (72-90 FPS VR)
 *
 * @module FoveatedGaussianTypes
 */

// =============================================================================
// GAUSSIAN PRIMITIVE DATA
// =============================================================================

/**
 * Packed Gaussian splat data for GPU upload.
 *
 * Memory layout per splat (56 bytes for baked, matches GaussianBudgetManager):
 *   position:    12B (3x float32)
 *   covariance:  24B (6x float32, upper triangle of 3x3 symmetric matrix)
 *   sh_dc:       12B (3x float32, SH band 0 DC coefficients for RGB)
 *   opacity:      4B (1x float32)
 *   padding:      4B (alignment)
 */
export interface GaussianSplatData {
  /** Unique splat cloud identifier */
  id: string;
  /** Number of Gaussians in this cloud */
  count: number;
  /** Packed position data (count * 3 floats: x, y, z) */
  positions: Float32Array;
  /** Packed covariance matrices (count * 6 floats: upper triangle) */
  covariances: Float32Array;
  /** Spherical harmonics coefficients (count * shCoeffCount * 3 floats) */
  shCoeffs: Float32Array;
  /** Number of SH coefficients per Gaussian (1=DC, 4=L1, 9=L2, 16=L3) */
  shBands: 0 | 1 | 2 | 3;
  /** Per-splat opacity values (count * 1 float) */
  opacities: Float32Array;
  /** Optional: per-splat scale (count * 3 floats for anisotropic) */
  scales?: Float32Array;
  /** Optional: per-splat rotation quaternion (count * 4 floats) */
  rotations?: Float32Array;
  /** World-space bounding sphere center */
  boundCenter: [number, number, number];
  /** World-space bounding sphere radius */
  boundRadius: number;
}

/**
 * Per-Gaussian sort key used by StopThePop hierarchical sorting.
 * Packed into a single 64-bit value for efficient radix sort:
 *   bits [63:32] = depth (float32 reinterpreted as uint32, with sign flip)
 *   bits [31:0]  = gaussian index
 */
export interface SortKey {
  depth: number;
  index: number;
}

// =============================================================================
// FOVEATED RENDERING CONFIGURATION
// =============================================================================

/**
 * Foveated rendering region definition.
 *
 * VRSplat uses a three-zone model:
 *   - Foveal:      16x16 tiles, full resolution, full SH bands
 *   - Blend:       Transition zone with interpolated quality
 *   - Peripheral:  32x32 tiles at half resolution, DC-only SH
 */
export type FoveatedZone = 'foveal' | 'blend' | 'peripheral';

/**
 * Per-zone rendering quality parameters.
 */
export interface FoveatedZoneConfig {
  /** Zone identifier */
  zone: FoveatedZone;
  /** Tile size in pixels (16 for foveal, 32 for peripheral) */
  tileSize: number;
  /** Resolution scale factor (1.0 = full, 0.5 = half) */
  resolutionScale: number;
  /** Maximum SH band to evaluate (0=DC, 1=L1, 2=L2, 3=L3) */
  maxSHBand: number;
  /** Opacity threshold for early termination (1/255 for visual quality) */
  opacityThreshold: number;
  /** Maximum Gaussians per tile before culling */
  maxGaussiansPerTile: number;
  /** Whether to apply StopThePop hierarchical sorting in this zone */
  enableHierarchicalSort: boolean;
}

/**
 * Complete foveated rendering configuration.
 */
export interface FoveatedRenderConfig {
  /** Enable foveated rendering (requires eye tracking data) */
  enabled: boolean;
  /** Foveal region half-angle in degrees (default: 10, per VRSplat) */
  fovealAngleDeg: number;
  /** Blend zone width in degrees (default: 5, smooth transition) */
  blendZoneDeg: number;
  /** Per-zone quality configurations */
  zones: Record<FoveatedZone, FoveatedZoneConfig>;
  /** Gaze smoothing factor (0-1, higher = more smoothing, default: 0.3) */
  gazeSmoothingFactor: number;
  /** Fixed foveation point for non-eye-tracked HMDs (normalized 0-1) */
  fixedFoveationCenter?: [number, number];
  /** Per-eye independent foveation (true for eye-tracked HMDs) */
  perEyeFoveation: boolean;
}

// =============================================================================
// STOPTHEPOP SORTING CONFIGURATION
// =============================================================================

/**
 * StopThePop hierarchical sorting queue configuration.
 *
 * Three-level queue hierarchy (per the paper):
 *   Level 0: 4x4 tile queue (64 elements, managed by 16 threads)
 *   Level 1: 2x2 tile queue (8 elements per sub-tile)
 *   Level 2: Per-pixel queue (4 elements)
 *
 * Total sort window: 25-72 elements, providing temporal stability.
 */
export interface StopThePopConfig {
  /** Enable StopThePop per-pixel re-sorting */
  enabled: boolean;
  /** Level 0 queue size (tile-level, default: 64) */
  tileQueueSize: number;
  /** Level 1 queue size (sub-tile, default: 8) */
  subTileQueueSize: number;
  /** Level 2 queue size (per-pixel, default: 4) */
  pixelQueueSize: number;
  /** Enable hierarchical culling (removes ~44% of Gaussians per tile) */
  enableHierarchicalCulling: boolean;
  /** Culling opacity threshold (default: 1/255 = 0.00392) */
  cullingOpacityThreshold: number;
  /** Enable optimal depth evaluation (t_opt computation) */
  enableOptimalDepth: boolean;
  /** Fallback to simple z-sort when Gaussian count is below this threshold */
  simplesSortThreshold: number;
}

// =============================================================================
// RENDER PIPELINE STATE
// =============================================================================

/**
 * Per-eye rendering state for stereo VR.
 */
export interface EyeRenderState {
  /** Eye identifier */
  eye: 'left' | 'right';
  /** View matrix (4x4) */
  viewMatrix: Float32Array;
  /** Projection matrix (4x4) */
  projectionMatrix: Float32Array;
  /** Camera position in world space */
  cameraPosition: [number, number, number];
  /** Camera forward direction */
  cameraForward: [number, number, number];
  /** Gaze direction (from eye tracking or fixed center) */
  gazeDirection: [number, number, number];
  /** Render target width in pixels */
  width: number;
  /** Render target height in pixels */
  height: number;
  /** Horizontal tile count at foveal resolution */
  tileCountX: number;
  /** Vertical tile count at foveal resolution */
  tileCountY: number;
}

/**
 * Tile classification result from foveated zone determination.
 */
export interface TileClassification {
  /** Tile index (row-major) */
  tileIndex: number;
  /** Tile position in pixels (top-left corner) */
  tileX: number;
  tileY: number;
  /** Tile size in pixels */
  tileSize: number;
  /** Foveated zone this tile belongs to */
  zone: FoveatedZone;
  /** Blend factor (0 = fully peripheral, 1 = fully foveal) */
  blendFactor: number;
  /** Number of Gaussians intersecting this tile (after culling) */
  gaussianCount: number;
  /** Whether this tile was culled (no visible Gaussians) */
  culled: boolean;
}

/**
 * Sort buffer state for a single frame.
 * Pre-allocated to avoid per-frame allocation.
 */
export interface SortBufferState {
  /** Global sort keys (depth | index pairs) */
  keys: Uint32Array;
  /** Sorted Gaussian indices per tile */
  tileGaussianLists: Uint32Array;
  /** Tile-to-Gaussian offset table */
  tileOffsets: Uint32Array;
  /** Tile-to-Gaussian count table */
  tileCounts: Uint32Array;
  /** Total number of Gaussian-tile intersections */
  totalIntersections: number;
  /** Whether buffer is currently valid */
  valid: boolean;
}

// =============================================================================
// PERFORMANCE METRICS
// =============================================================================

/**
 * Detailed per-frame timing breakdown.
 */
export interface GaussianRenderTimings {
  /** Total frame time in milliseconds */
  totalMs: number;
  /** Frustum culling time (CPU) */
  frustumCullMs: number;
  /** Tile assignment + foveated zone classification */
  tileAssignMs: number;
  /** Depth sorting (radix sort or hierarchical) */
  sortMs: number;
  /** StopThePop per-pixel re-sorting overhead */
  hierarchicalResortMs: number;
  /** Alpha blending / splatting rasterization */
  rasterizeMs: number;
  /** Foveated blend zone interpolation */
  blendZoneMs: number;
  /** GPU readback / sync time */
  syncMs: number;
  /** Number of Gaussians submitted for rendering */
  gaussiansSubmitted: number;
  /** Number of Gaussians after frustum culling */
  gaussiansAfterCull: number;
  /** Number of Gaussians after tile-based StopThePop culling */
  gaussiansAfterTileCull: number;
  /** Number of tiles processed */
  tilesProcessed: number;
  /** Number of tiles in foveal zone */
  tilesFoveal: number;
  /** Number of tiles in peripheral zone */
  tilesPeripheral: number;
  /** Number of tiles culled (empty) */
  tilesCulled: number;
  /** Whether frame met the VR timing budget */
  withinBudget: boolean;
}

/**
 * Rolling performance statistics.
 */
export interface GaussianRenderStats {
  /** Average frame time over window */
  avgFrameMs: number;
  /** 95th percentile frame time */
  p95FrameMs: number;
  /** 99th percentile frame time */
  p99FrameMs: number;
  /** Minimum frame time in window */
  minFrameMs: number;
  /** Maximum frame time in window */
  maxFrameMs: number;
  /** Frame time standard deviation */
  stdDevMs: number;
  /** Percentage of frames within budget */
  withinBudgetPct: number;
  /** Average Gaussians rendered per frame */
  avgGaussiansRendered: number;
  /** Average tile culling efficiency */
  avgCullEfficiency: number;
  /** Average foveal tile ratio */
  avgFovealRatio: number;
  /** Performance state */
  state: 'excellent' | 'good' | 'marginal' | 'degraded' | 'critical';
  /** Number of frames in measurement window */
  windowSize: number;
}

// =============================================================================
// PIPELINE CONFIGURATION
// =============================================================================

/**
 * Complete foveated Gaussian rendering pipeline configuration.
 */
export interface FoveatedGaussianPipelineConfig {
  /** Target frame time budget in ms (default: 11.1 for 90Hz VR) */
  targetFrameTimeMs: number;
  /** Maximum total Gaussians across all clouds */
  maxGaussians: number;
  /** Maximum concurrent Gaussian clouds */
  maxClouds: number;
  /** Foveated rendering configuration */
  foveated: FoveatedRenderConfig;
  /** StopThePop sorting configuration */
  stopThePop: StopThePopConfig;
  /** Enable stereo rendering (true for VR) */
  stereoEnabled: boolean;
  /** Inter-pupillary distance in meters (default: 0.064) */
  ipd: number;
  /** Enable adaptive quality (reduce SH bands / resolution under pressure) */
  adaptiveQuality: boolean;
  /** Performance measurement window size in frames */
  perfWindowSize: number;
  /** Verbose debug logging */
  verbose: boolean;
  /** Pre-allocated sort buffer size (in Gaussian-tile intersection count) */
  sortBufferSize: number;
  /** Enable GPU-based radix sort (requires WebGPU) */
  gpuSort: boolean;
  /** Alpha blending saturation threshold (early termination when transmittance < this) */
  transmittanceThreshold: number;
}

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

/**
 * Default foveated zone configurations per VRSplat paper.
 */
export const DEFAULT_FOVEATED_ZONES: Record<FoveatedZone, FoveatedZoneConfig> = {
  foveal: {
    zone: 'foveal',
    tileSize: 16,
    resolutionScale: 1.0,
    maxSHBand: 3,
    opacityThreshold: 1 / 255,
    maxGaussiansPerTile: 256,
    enableHierarchicalSort: true,
  },
  blend: {
    zone: 'blend',
    tileSize: 16,
    resolutionScale: 0.75,
    maxSHBand: 2,
    opacityThreshold: 2 / 255,
    maxGaussiansPerTile: 192,
    enableHierarchicalSort: true,
  },
  peripheral: {
    zone: 'peripheral',
    tileSize: 32,
    resolutionScale: 0.5,
    maxSHBand: 0,
    opacityThreshold: 4 / 255,
    maxGaussiansPerTile: 128,
    enableHierarchicalSort: false,
  },
};

/**
 * Default StopThePop configuration per the paper.
 */
export const DEFAULT_STOPTHEPOP_CONFIG: StopThePopConfig = {
  enabled: true,
  tileQueueSize: 64,
  subTileQueueSize: 8,
  pixelQueueSize: 4,
  enableHierarchicalCulling: true,
  cullingOpacityThreshold: 1 / 255,
  enableOptimalDepth: true,
  simplesSortThreshold: 32,
};

/**
 * Default foveated rendering configuration.
 */
export const DEFAULT_FOVEATED_RENDER_CONFIG: FoveatedRenderConfig = {
  enabled: true,
  fovealAngleDeg: 10,
  blendZoneDeg: 5,
  zones: DEFAULT_FOVEATED_ZONES,
  gazeSmoothingFactor: 0.3,
  perEyeFoveation: true,
};

/**
 * Default full pipeline configuration targeting Quest 3 (90Hz stereo).
 */
export const DEFAULT_PIPELINE_CONFIG: FoveatedGaussianPipelineConfig = {
  targetFrameTimeMs: 11.1, // 90Hz
  maxGaussians: 500_000,
  maxClouds: 64,
  foveated: DEFAULT_FOVEATED_RENDER_CONFIG,
  stopThePop: DEFAULT_STOPTHEPOP_CONFIG,
  stereoEnabled: true,
  ipd: 0.064,
  adaptiveQuality: true,
  perfWindowSize: 90, // 1 second at 90Hz
  verbose: false,
  sortBufferSize: 4_000_000, // 4M Gaussian-tile intersections
  gpuSort: true,
  transmittanceThreshold: 1 / 255,
};

/**
 * Quest 3 optimized configuration (11.1ms budget, 90Hz).
 */
export const QUEST3_PIPELINE_CONFIG: FoveatedGaussianPipelineConfig = {
  ...DEFAULT_PIPELINE_CONFIG,
  targetFrameTimeMs: 11.1,
  maxGaussians: 160_000,
  foveated: {
    ...DEFAULT_FOVEATED_RENDER_CONFIG,
    zones: {
      foveal: { ...DEFAULT_FOVEATED_ZONES.foveal, maxGaussiansPerTile: 192 },
      blend: { ...DEFAULT_FOVEATED_ZONES.blend, maxGaussiansPerTile: 128 },
      peripheral: { ...DEFAULT_FOVEATED_ZONES.peripheral, maxGaussiansPerTile: 64 },
    },
  },
};

/**
 * PCVR high-end configuration (8ms budget, 120Hz).
 */
export const PCVR_PIPELINE_CONFIG: FoveatedGaussianPipelineConfig = {
  ...DEFAULT_PIPELINE_CONFIG,
  targetFrameTimeMs: 8.33,
  maxGaussians: 1_000_000,
  foveated: {
    ...DEFAULT_FOVEATED_RENDER_CONFIG,
    enabled: false, // Hardware foveated rendering
  },
  sortBufferSize: 16_000_000,
};

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Gaussian cloud registration parameters.
 */
export interface GaussianCloudParams {
  /** Unique cloud identifier */
  id: string;
  /** Gaussian splat data */
  data: GaussianSplatData;
  /** World transform matrix (4x4, column-major) */
  worldMatrix: Float32Array;
  /** Rendering layer (integrates with GaussianBudgetManager) */
  layer: 'baked' | 'relightable' | 'interactive';
  /** Rendering priority (higher = rendered first) */
  priority: number;
  /** Whether this cloud is pinned (never culled by budget manager) */
  pinned: boolean;
}

/**
 * Callback for pipeline events.
 */
export type PipelineEventType =
  | 'cloud:added'
  | 'cloud:removed'
  | 'cloud:updated'
  | 'quality:adapted'
  | 'budget:exceeded'
  | 'frame:over_budget'
  | 'frame:recovered'
  | 'sort:fallback'; // Fell back to simple sort from hierarchical

/**
 * Pipeline event payload.
 */
export interface PipelineEvent {
  type: PipelineEventType;
  timestamp: number;
  data: Record<string, unknown>;
}
