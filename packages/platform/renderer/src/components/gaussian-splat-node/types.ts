/**
 * GaussianSplatNode Types
 *
 * Type definitions for the R3F GaussianSplatNode component that bridges
 * HoloScript's @gaussian_splat trait output to the HoloLand volumetric
 * rendering pipeline (GaussianSplatLoader + GaussianSplatLODManager).
 *
 * @module gaussian-splat-node/types
 */

// =============================================================================
// FORMAT & PLATFORM TYPES
// =============================================================================

/** Supported Gaussian splat file formats */
export type SplatFileFormat = 'ply' | 'splat' | 'spz' | 'ksplat';

/** Target platform for Gaussian budget enforcement */
export type GaussianPlatform = 'quest3' | 'pcvr' | 'desktop' | 'mobile' | 'custom';

/** LOD event types emitted during rendering */
export type LODEventType = 'lod-changed' | 'budget-exceeded' | 'budget-warning';

/** Loading phase indicators */
export type LoadingPhase =
  | 'idle'
  | 'downloading'
  | 'decompressing'
  | 'parsing'
  | 'building-lod'
  | 'uploading-gpu'
  | 'ready'
  | 'error';

// =============================================================================
// GAUSSIAN SPLAT CONFIG (from @holoscript/core trait)
// =============================================================================

/**
 * Configuration accepted from HoloScript's @gaussian_splat trait.
 * Maps to the GaussianSplatConfig interface in @holoscript/core.
 *
 * The R3F compiler emits JSX with this shape:
 * ```jsx
 * <GaussianSplatNode gaussianSplat={{
 *   url: '/scenes/garden.spz',
 *   format: 'spz',
 *   maxSplats: 500000,
 *   ...
 * }} />
 * ```
 */
export interface GaussianSplatNodeConfig {
  /** URL to the Gaussian splat file (required) */
  url: string;

  /** File format. Auto-detected from extension if not specified. */
  format?: SplatFileFormat;

  /** Maximum number of splats to load. Default: platform-dependent */
  maxSplats?: number;

  /** Splat size multiplier. Default: 1.0 */
  splatScale?: number;

  /** Opacity threshold for culling invisible splats. Default: 0.01 */
  alphaThreshold?: number;

  /** Spherical harmonics degree (0-3). Default: 0 */
  shDegree?: number;

  /** Sort frequency (frames between depth sorts). Default: 1 */
  sortFrequency?: number;

  /** Enable progressive/streaming loading. Default: true */
  streaming?: boolean;

  /** Max memory budget in MB. Default: platform-dependent */
  maxMemoryMB?: number;

  /** Quality preset. Default: 'medium' */
  quality?: 'low' | 'medium' | 'high' | 'ultra';

  // ─── Transform ──────────────────────────────────────────────────

  /** World position [x, y, z]. Default: [0, 0, 0] */
  position?: [number, number, number];

  /** Euler rotation [x, y, z] in radians. Default: [0, 0, 0] */
  rotation?: [number, number, number];

  /** Scale (uniform or [x, y, z]). Default: 1 */
  scale?: number | [number, number, number];

  // ─── LOD Configuration ──────────────────────────────────────────

  /** Enable octree-based LOD. Default: true */
  lodEnabled?: boolean;

  /** LOD octree depth. Default: 6 */
  lodDepth?: number;

  /** Power-law exponent for LOD thresholds. Default: 1.5 */
  lodPowerLawExponent?: number;

  /** Base distance for finest LOD level. Default: 2.0 */
  lodBaseDistance?: number;

  /** Max distance for coarsest LOD level. Default: 200.0 */
  lodMaxDistance?: number;

  // ─── Budget Configuration ───────────────────────────────────────

  /** Target platform for budget enforcement. Default: 'desktop' */
  platform?: GaussianPlatform;

  /** Custom Gaussian budget (overrides platform default). 0 = unlimited. */
  gaussianBudget?: number;

  /** Per-avatar reservation when in VR mode. Default: 60000 */
  perAvatarReservation?: number;

  /** Maximum simultaneous avatars. Default: 3 */
  maxAvatars?: number;
}

// =============================================================================
// PLATFORM BUDGET PRESETS
// =============================================================================

/** Gaussian budget limits per platform (research-backed: W.034) */
export const PLATFORM_BUDGETS: Record<GaussianPlatform, number> = {
  quest3: 180_000,
  pcvr: 500_000,
  desktop: 500_000,
  mobile: 80_000,
  custom: 0,
};

/** Max memory MB per platform */
export const PLATFORM_MEMORY_MB: Record<GaussianPlatform, number> = {
  quest3: 256,
  pcvr: 1024,
  desktop: 1024,
  mobile: 128,
  custom: 512,
};

/** Max splats per platform */
export const PLATFORM_MAX_SPLATS: Record<GaussianPlatform, number> = {
  quest3: 180_000,
  pcvr: 2_000_000,
  desktop: 2_000_000,
  mobile: 100_000,
  custom: 1_000_000,
};

// =============================================================================
// NODE STATE
// =============================================================================

/** LOD update result from the per-frame update cycle */
export interface LODUpdateEvent {
  type: LODEventType;
  level: number;
  totalLevels: number;
  visibleCount: number;
  totalCount: number;
  cameraDistance: number;
  budgetCapped: boolean;
  levelsDropped: number;
  availableBudget: number;
}

/** Loading progress event */
export interface LoadingProgressEvent {
  phase: LoadingPhase;
  progress: number; // 0..1
  loaded: number;
  total: number;
}

/** Complete state of the GaussianSplatNode */
export interface GaussianSplatNodeState {
  /** Current loading phase */
  phase: LoadingPhase;

  /** Loading progress (0..1) */
  progress: number;

  /** Total number of loaded splats */
  splatCount: number;

  /** Currently visible splats after LOD/budget enforcement */
  visibleSplats: number;

  /** Current LOD level (0 = highest detail) */
  lodLevel: number;

  /** Total available LOD levels */
  totalLodLevels: number;

  /** Whether budget capping is active */
  budgetCapped: boolean;

  /** Estimated GPU memory usage in MB */
  gpuMemoryMB: number;

  /** Current FPS (from frame timing) */
  fps: number;

  /** Frame time in milliseconds */
  frameTimeMs: number;

  /** Error message if phase === 'error' */
  error: string | null;

  /** Whether the node is in WebXR VR mode */
  isVRMode: boolean;

  /** Active avatar count for budget calculations */
  activeAvatars: number;
}

/** Default initial state */
export const DEFAULT_GAUSSIAN_SPLAT_NODE_STATE: GaussianSplatNodeState = {
  phase: 'idle',
  progress: 0,
  splatCount: 0,
  visibleSplats: 0,
  lodLevel: 0,
  totalLodLevels: 0,
  budgetCapped: false,
  gpuMemoryMB: 0,
  fps: 0,
  frameTimeMs: 0,
  error: null,
  isVRMode: false,
  activeAvatars: 0,
};

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/** Props for the GaussianSplatNode R3F component */
export interface GaussianSplatNodeProps {
  /** Gaussian splat configuration from the @gaussian_splat trait */
  gaussianSplat: GaussianSplatNodeConfig;

  /** Unique node ID (from HoloScript compiler output) */
  nodeId?: string;

  /** Whether the node is currently selected in the editor */
  isSelected?: boolean;

  /** Callback when loading completes */
  onLoaded?: (splatCount: number) => void;

  /** Callback when a loading error occurs */
  onError?: (error: string) => void;

  /** Callback for LOD change events */
  onLODChange?: (event: LODUpdateEvent) => void;

  /** Callback for loading progress updates */
  onProgress?: (event: LoadingProgressEvent) => void;

  /** Callback when budget is exceeded */
  onBudgetExceeded?: (event: LODUpdateEvent) => void;

  /** Whether to show a debug bounding box wireframe. Default: false */
  showBounds?: boolean;

  /** Whether to show LOD level debug coloring. Default: false */
  debugLOD?: boolean;

  /** Whether this node is visible. Default: true */
  visible?: boolean;

  /** Cast shadows. Default: false */
  castShadow?: boolean;

  /** Receive shadows. Default: false */
  receiveShadow?: boolean;
}
