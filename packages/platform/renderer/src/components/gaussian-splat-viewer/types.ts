/**
 * GaussianSplatViewer - Shared Types
 *
 * Type definitions for the WebGPU Gaussian Splatting viewer with
 * WebSplatter wait-free radix sort architecture.
 *
 * ARCHITECTURE (WebSplatter, EG 2024):
 * ```
 *   PLY/Splat Data (CPU)
 *       |
 *       v
 *   [1] Covariance Precomputation (GPU, once)
 *       |
 *       v
 *   [2] View-Dependent Sort Key Generation (GPU, per frame)
 *       |   depth = dot(position - camera, forward)
 *       |   key = floatBitsToSortable(depth)
 *       |
 *       v
 *   [3] Wait-Free Radix Sort (GPU, per frame, O(n))
 *       |   Single-pass Onesweep variant
 *       |   No global barriers between digit passes
 *       |   4x 8-bit digit passes, 256-bin histogram
 *       |
 *       v
 *   [4] Quad-per-Splat Rasterization (GPU, per frame)
 *       |   Instanced quads oriented to camera
 *       |   2D Gaussian evaluation in fragment shader
 *       |   Alpha blending front-to-back
 *       |
 *       v
 *   Composited Frame (1920x1080 @ 60fps target)
 * ```
 *
 * Total budget: 16.67ms per frame at 60fps
 *
 * References:
 *   - WebSplatter (EG 2024): Wait-free radix sort for web-based 3DGS
 *   - 3D Gaussian Splatting (SIGGRAPH 2023): Original 3DGS paper
 *   - Onesweep (HPG 2022): Single-pass parallel radix sort
 *
 * @module gaussian-splat-viewer/types
 */

// =============================================================================
// VIEWER STATUS
// =============================================================================

/**
 * Status of the Gaussian splatting viewer pipeline.
 */
export type ViewerStatus =
  | 'idle'           // No data loaded
  | 'loading'        // Loading PLY/splat data
  | 'initializing'   // WebGPU device and pipeline creation
  | 'ready'          // Pipeline ready but not rendering
  | 'rendering'      // Active render loop
  | 'paused'         // Render loop paused
  | 'error'          // Fatal error
  | 'no-webgpu';     // WebGPU not available

// =============================================================================
// GAUSSIAN SPLAT DATA (PLY FORMAT)
// =============================================================================

/**
 * Parsed Gaussian splat cloud data from a PLY file.
 *
 * Standard 3DGS PLY layout per splat:
 *   - position:       3x float32 (x, y, z)
 *   - normal:         3x float32 (nx, ny, nz) -- often unused
 *   - SH DC:          3x float32 (f_dc_0, f_dc_1, f_dc_2)
 *   - SH rest:        45x float32 (f_rest_0 .. f_rest_44) for L3
 *   - opacity:        1x float32 (sigmoid-encoded)
 *   - scale:          3x float32 (log-encoded)
 *   - rotation:       4x float32 (quaternion wxyz)
 */
export interface SplatCloudData {
  /** Number of Gaussians in the cloud */
  count: number;
  /** Packed positions (count * 3 floats: x, y, z) */
  positions: Float32Array;
  /** Packed SH DC coefficients (count * 3 floats: r, g, b) */
  shDC: Float32Array;
  /** Packed SH rest coefficients (count * 45 floats for L3, or fewer) */
  shRest: Float32Array | null;
  /** Number of SH bands (0=DC only, 1=L1, 2=L2, 3=L3) */
  shDegree: number;
  /** Per-splat opacity values (count * 1 float, sigmoid-encoded) */
  opacities: Float32Array;
  /** Per-splat log-scale values (count * 3 floats) */
  scales: Float32Array;
  /** Per-splat rotation quaternions (count * 4 floats: w, x, y, z) */
  rotations: Float32Array;
  /** World-space bounding box min */
  boundsMin: [number, number, number];
  /** World-space bounding box max */
  boundsMax: [number, number, number];
  /** Center of bounding box */
  center: [number, number, number];
}

// =============================================================================
// GPU BUFFER LAYOUT
// =============================================================================

/**
 * GPU buffer handles for the rendering pipeline.
 */
export interface SplatGPUBuffers {
  /** Per-splat positions (vec3<f32>) */
  positions: GPUBuffer;
  /** Per-splat 2D covariance + color (precomputed each frame) */
  splatData: GPUBuffer;
  /** Sort keys (uint32 per splat, depth-encoded) */
  sortKeys: GPUBuffer;
  /** Sort values/indices (uint32 per splat) */
  sortValues: GPUBuffer;
  /** Sort keys output (ping-pong) */
  sortKeysOut: GPUBuffer;
  /** Sort values output (ping-pong) */
  sortValuesOut: GPUBuffer;
  /** Per-digit histogram bins (256 * workgroupCount uint32) */
  histogram: GPUBuffer;
  /** Global digit offsets (256 uint32) */
  digitOffsets: GPUBuffer;
  /** Uniform buffer for camera/projection data */
  uniforms: GPUBuffer;
  /** Per-splat opacity (float32) */
  opacities: GPUBuffer;
  /** Per-splat SH DC color (vec3<f32>) */
  colors: GPUBuffer;
  /** Per-splat scale (vec3<f32>) */
  scales: GPUBuffer;
  /** Per-splat rotation quaternion (vec4<f32>) */
  rotations: GPUBuffer;
}

// =============================================================================
// CAMERA STATE
// =============================================================================

/**
 * Camera state for the viewer.
 */
export interface CameraState {
  /** Camera position in world space */
  position: [number, number, number];
  /** Camera look-at target */
  target: [number, number, number];
  /** Camera up vector */
  up: [number, number, number];
  /** Field of view in degrees (vertical) */
  fovY: number;
  /** Near clip plane distance */
  near: number;
  /** Far clip plane distance */
  far: number;
  /** Aspect ratio (width / height) */
  aspect: number;
}

/**
 * Camera controller configuration.
 */
export interface CameraControllerConfig {
  /** Enable orbit rotation (default: true) */
  enableRotation: boolean;
  /** Enable zoom via scroll (default: true) */
  enableZoom: boolean;
  /** Enable pan via middle-click drag (default: true) */
  enablePan: boolean;
  /** Rotation speed multiplier (default: 1.0) */
  rotationSpeed: number;
  /** Zoom speed multiplier (default: 1.0) */
  zoomSpeed: number;
  /** Pan speed multiplier (default: 1.0) */
  panSpeed: number;
  /** Minimum zoom distance (default: 0.1) */
  minDistance: number;
  /** Maximum zoom distance (default: 100) */
  maxDistance: number;
  /** Enable damping/inertia (default: true) */
  enableDamping: boolean;
  /** Damping factor (default: 0.92) */
  dampingFactor: number;
}

// =============================================================================
// RENDER CONFIGURATION
// =============================================================================

/**
 * Rendering configuration for the Gaussian splatting viewer.
 */
export interface SplatRenderConfig {
  /** Target resolution width (default: canvas width) */
  width: number;
  /** Target resolution height (default: canvas height) */
  height: number;
  /** Background color [r, g, b, a] normalized (default: [0, 0, 0, 1]) */
  backgroundColor: [number, number, number, number];
  /** Maximum number of splats to render (default: 2_000_000) */
  maxSplats: number;
  /** Splat scale multiplier (default: 1.0) */
  splatScale: number;
  /** Opacity multiplier (default: 1.0) */
  opacityScale: number;
  /** Sort workgroup size (default: 256, must be power of 2) */
  sortWorkgroupSize: number;
  /** Enable transparency sorting every frame (default: true) */
  sortEveryFrame: boolean;
  /** Pixel ratio (default: devicePixelRatio) */
  pixelRatio: number;
  /** Target FPS (default: 60) */
  targetFPS: number;
  /** GPU power preference (default: 'high-performance') */
  powerPreference: GPUPowerPreference;
  /** Enable render stats overlay (default: false) */
  showStats: boolean;
}

// =============================================================================
// PERFORMANCE METRICS
// =============================================================================

/**
 * Per-frame performance metrics.
 */
export interface SplatFrameMetrics {
  /** Total frame time in ms */
  totalMs: number;
  /** Sort key generation compute time in ms */
  sortKeyGenMs: number;
  /** Radix sort compute time in ms */
  sortMs: number;
  /** Rasterization time in ms */
  rasterMs: number;
  /** Number of splats rendered */
  splatCount: number;
  /** Whether frame met 60fps budget (16.67ms) */
  withinBudget: boolean;
}

/**
 * Rolling performance statistics.
 */
export interface SplatRenderStats {
  /** Average frame time over window */
  avgFrameMs: number;
  /** Average FPS */
  avgFPS: number;
  /** 95th percentile frame time */
  p95FrameMs: number;
  /** Minimum frame time in window */
  minFrameMs: number;
  /** Maximum frame time in window */
  maxFrameMs: number;
  /** Average sort time */
  avgSortMs: number;
  /** Average raster time */
  avgRasterMs: number;
  /** Total splats loaded */
  totalSplats: number;
  /** GPU adapter info */
  adapterInfo: string;
  /** GPU VRAM estimate (bytes) */
  gpuMemoryBytes: number;
  /** Window size */
  windowSize: number;
}

// =============================================================================
// VIEWER STATE (for React hook)
// =============================================================================

/**
 * Combined viewer state returned by the useGaussianSplatViewer hook.
 */
export interface GaussianSplatViewerState {
  /** Current viewer status */
  status: ViewerStatus;
  /** Current camera state */
  camera: CameraState;
  /** Rolling performance stats */
  stats: SplatRenderStats | null;
  /** Last frame metrics */
  lastFrame: SplatFrameMetrics | null;
  /** Number of splats loaded */
  splatCount: number;
  /** Whether the data has been loaded */
  isLoaded: boolean;
  /** Error message if status is 'error' */
  error: string | null;
  /** GPU adapter info string */
  adapterInfo: string | null;
}

/**
 * Actions returned by the useGaussianSplatViewer hook.
 */
export interface GaussianSplatViewerActions {
  /** Load a PLY file from URL */
  loadPLY: (url: string) => Promise<void>;
  /** Load raw splat cloud data */
  loadData: (data: SplatCloudData) => Promise<void>;
  /** Start the render loop */
  startRendering: () => void;
  /** Stop the render loop */
  stopRendering: () => void;
  /** Pause/resume the render loop */
  togglePause: () => void;
  /** Reset camera to fit the scene */
  resetCamera: () => void;
  /** Set camera position and target */
  setCamera: (position: [number, number, number], target: [number, number, number]) => void;
  /** Update render config */
  setRenderConfig: (config: Partial<SplatRenderConfig>) => void;
  /** Force a single frame render */
  renderSingleFrame: () => void;
  /** Dispose all GPU resources */
  dispose: () => void;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Theme for the Gaussian splat viewer UI.
 */
export interface GaussianSplatViewerTheme {
  fontFamily: string;
  fontScale: number;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  containerBackground: string;
  cardBackground: string;
  borderColor: string;
  successColor: string;
  warningColor: string;
  errorColor: string;
  accentColor: string;
  gpuColor: string;
}

export const DEFAULT_GSPLAT_THEME: GaussianSplatViewerTheme = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontScale: 1.0,
  textPrimary: '#e0e0f0',
  textSecondary: '#9090b0',
  textMuted: '#606080',
  containerBackground: '#0a0a1a',
  cardBackground: '#12122a',
  borderColor: '#2a2a4a',
  successColor: '#22c55e',
  warningColor: '#eab308',
  errorColor: '#ef4444',
  accentColor: '#8b5cf6',
  gpuColor: '#06b6d4',
};

/**
 * Display modes for the viewer component.
 */
export type GaussianSplatDisplayMode =
  | 'fullscreen'  // Canvas fills entire container
  | 'embedded'    // Canvas with surrounding UI controls
  | 'overlay';    // Canvas with semi-transparent stats overlay

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

export const DEFAULT_CAMERA_STATE: CameraState = {
  position: [0, 0, 3],
  target: [0, 0, 0],
  up: [0, 1, 0],
  fovY: 50,
  near: 0.1,
  far: 1000,
  aspect: 16 / 9,
};

export const DEFAULT_CAMERA_CONTROLLER_CONFIG: CameraControllerConfig = {
  enableRotation: true,
  enableZoom: true,
  enablePan: true,
  rotationSpeed: 1.0,
  zoomSpeed: 1.0,
  panSpeed: 1.0,
  minDistance: 0.1,
  maxDistance: 100,
  enableDamping: true,
  dampingFactor: 0.92,
};

export const DEFAULT_RENDER_CONFIG: SplatRenderConfig = {
  width: 1920,
  height: 1080,
  backgroundColor: [0, 0, 0, 1],
  maxSplats: 2_000_000,
  splatScale: 1.0,
  opacityScale: 1.0,
  sortWorkgroupSize: 256,
  sortEveryFrame: true,
  pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio ?? 1 : 1,
  targetFPS: 60,
  powerPreference: 'high-performance',
  showStats: false,
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function formatMs(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}us`;
  if (ms < 100) return `${ms.toFixed(1)}ms`;
  return `${ms.toFixed(0)}ms`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function getStatusLabel(status: ViewerStatus): string {
  switch (status) {
    case 'idle': return 'Idle';
    case 'loading': return 'Loading';
    case 'initializing': return 'Initializing';
    case 'ready': return 'Ready';
    case 'rendering': return 'Rendering';
    case 'paused': return 'Paused';
    case 'error': return 'Error';
    case 'no-webgpu': return 'No WebGPU';
    default: return 'Unknown';
  }
}

export function getStatusColor(status: ViewerStatus, theme: GaussianSplatViewerTheme): string {
  switch (status) {
    case 'idle': return theme.textMuted;
    case 'loading': return theme.accentColor;
    case 'initializing': return theme.accentColor;
    case 'ready': return theme.accentColor;
    case 'rendering': return theme.successColor;
    case 'paused': return theme.warningColor;
    case 'error': return theme.errorColor;
    case 'no-webgpu': return theme.errorColor;
    default: return theme.textMuted;
  }
}
