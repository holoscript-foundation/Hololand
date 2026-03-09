/**
 * Spectator Camera Types
 *
 * Type definitions for the non-XR spectator camera system.
 * Provides scene capture, multi-mode camera control (orbit, fly, cinematic),
 * and screenshot/recording functionality for HoloLand worlds.
 *
 * USE CASES:
 * - Generating screenshots/thumbnails of HoloLand worlds
 * - Cinematic flythrough recordings for content creation
 * - Spectator view for non-VR users observing VR sessions
 * - Marketing and documentation material generation
 * - Automated scene thumbnail pipelines
 *
 * ARCHITECTURE:
 * The spectator camera operates entirely outside the XR render loop.
 * It renders to an offscreen canvas (or a visible preview canvas),
 * completely decoupled from the VR headset camera. This avoids any
 * performance impact on the 90Hz VR render path.
 *
 * ```
 *   HoloLand Scene Graph (shared)
 *        |
 *        +---> [VR Camera]  (XR session, 90Hz)     <-- untouched
 *        |
 *        +---> [Spectator Camera]  (offscreen, 30-60Hz)
 *                  |
 *                  v
 *              Capture Engine
 *                  |
 *                  +---> PNG/JPEG screenshot
 *                  +---> WebM video recording (future)
 *                  +---> Thumbnail generation
 * ```
 *
 * @module spectator-camera/types
 */

import type React from 'react';

// =============================================================================
// CAMERA MODES
// =============================================================================

/**
 * Camera control modes for the spectator camera.
 *
 * - orbit:     Standard orbit camera around a target point (mouse drag/scroll)
 * - fly:       Free-flight WASD + mouse look (FPS-style navigation)
 * - cinematic: Automated camera path following a spline curve
 */
export type SpectatorCameraMode = 'orbit' | 'fly' | 'cinematic';

/**
 * Labels for camera modes (for UI display).
 */
export const CAMERA_MODE_LABELS: Record<SpectatorCameraMode, string> = {
  orbit: 'Orbit',
  fly: 'Fly',
  cinematic: 'Cinematic',
};

/**
 * Descriptions for each camera mode.
 */
export const CAMERA_MODE_DESCRIPTIONS: Record<SpectatorCameraMode, string> = {
  orbit: 'Orbit around a target point. Left-drag to rotate, scroll to zoom, middle-drag to pan.',
  fly: 'Free-flight navigation. WASD to move, mouse to look, Shift for speed boost.',
  cinematic: 'Automated camera path along a spline curve. Adjust speed and playback controls.',
};

// =============================================================================
// CAMERA STATE
// =============================================================================

/**
 * Full spectator camera state.
 */
export interface SpectatorCameraState {
  /** Camera position in world space [x, y, z] */
  position: [number, number, number];
  /** Camera look-at target (orbit mode) or forward direction (fly mode) */
  target: [number, number, number];
  /** Camera up vector */
  up: [number, number, number];
  /** Vertical field of view in degrees */
  fovY: number;
  /** Near clip plane */
  near: number;
  /** Far clip plane */
  far: number;
  /** Aspect ratio (width / height) */
  aspect: number;
  /** Current control mode */
  mode: SpectatorCameraMode;
}

/**
 * Default spectator camera state.
 */
export const DEFAULT_SPECTATOR_CAMERA_STATE: SpectatorCameraState = {
  position: [5, 3, 5],
  target: [0, 0, 0],
  up: [0, 1, 0],
  fovY: 50,
  near: 0.1,
  far: 1000,
  aspect: 16 / 9,
  mode: 'orbit',
};

// =============================================================================
// ORBIT MODE CONFIG
// =============================================================================

/**
 * Configuration for orbit camera mode.
 */
export interface SpectatorOrbitConfig {
  /** Rotation speed multiplier (default: 1.0) */
  rotationSpeed: number;
  /** Zoom speed multiplier (default: 1.0) */
  zoomSpeed: number;
  /** Pan speed multiplier (default: 1.0) */
  panSpeed: number;
  /** Minimum zoom distance (default: 0.5) */
  minDistance: number;
  /** Maximum zoom distance (default: 200) */
  maxDistance: number;
  /** Enable inertia damping (default: true) */
  enableDamping: boolean;
  /** Damping factor 0-1 (default: 0.92) */
  dampingFactor: number;
  /** Auto-rotate speed in radians per second (0 = disabled) */
  autoRotateSpeed: number;
}

export const DEFAULT_ORBIT_CONFIG: SpectatorOrbitConfig = {
  rotationSpeed: 1.0,
  zoomSpeed: 1.0,
  panSpeed: 1.0,
  minDistance: 0.5,
  maxDistance: 200,
  enableDamping: true,
  dampingFactor: 0.92,
  autoRotateSpeed: 0,
};

// =============================================================================
// FLY MODE CONFIG
// =============================================================================

/**
 * Configuration for fly camera mode.
 */
export interface SpectatorFlyConfig {
  /** Base movement speed in units per second (default: 5.0) */
  moveSpeed: number;
  /** Speed boost multiplier when Shift is held (default: 3.0) */
  sprintMultiplier: number;
  /** Mouse look sensitivity (default: 0.002) */
  lookSensitivity: number;
  /** Enable vertical movement via Q/E keys (default: true) */
  enableVertical: boolean;
  /** Damping factor for velocity decay (default: 0.9) */
  moveDamping: number;
}

export const DEFAULT_FLY_CONFIG: SpectatorFlyConfig = {
  moveSpeed: 5.0,
  sprintMultiplier: 3.0,
  lookSensitivity: 0.002,
  enableVertical: true,
  moveDamping: 0.9,
};

// =============================================================================
// CINEMATIC MODE CONFIG
// =============================================================================

/**
 * A waypoint on a cinematic camera path.
 */
export interface CinematicWaypoint {
  /** Position in world space */
  position: [number, number, number];
  /** Look-at target in world space */
  target: [number, number, number];
  /** FOV at this waypoint (optional, interpolated) */
  fovY?: number;
  /** Duration to reach this waypoint from previous (seconds) */
  duration: number;
  /** Easing function name */
  easing: CinematicEasing;
}

/**
 * Easing functions for cinematic interpolation.
 */
export type CinematicEasing =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'ease-in-cubic'
  | 'ease-out-cubic'
  | 'ease-in-out-cubic';

/**
 * Configuration for cinematic camera mode.
 */
export interface SpectatorCinematicConfig {
  /** Ordered list of waypoints defining the camera path */
  waypoints: CinematicWaypoint[];
  /** Whether to loop the path (default: false) */
  loop: boolean;
  /** Playback speed multiplier (default: 1.0) */
  playbackSpeed: number;
  /** Whether to use Catmull-Rom spline interpolation for smooth paths (default: true) */
  smoothPath: boolean;
  /** Tension parameter for Catmull-Rom spline (default: 0.5) */
  splineTension: number;
}

export const DEFAULT_CINEMATIC_CONFIG: SpectatorCinematicConfig = {
  waypoints: [
    {
      position: [5, 3, 5],
      target: [0, 0, 0],
      fovY: 50,
      duration: 3,
      easing: 'ease-in-out',
    },
    {
      position: [-5, 2, 3],
      target: [0, 1, 0],
      fovY: 45,
      duration: 4,
      easing: 'ease-in-out',
    },
    {
      position: [0, 6, -5],
      target: [0, 0, 0],
      fovY: 55,
      duration: 3,
      easing: 'ease-in-out-cubic',
    },
  ],
  loop: true,
  playbackSpeed: 1.0,
  smoothPath: true,
  splineTension: 0.5,
};

// =============================================================================
// CAPTURE CONFIGURATION
// =============================================================================

/**
 * Image format for scene capture.
 */
export type CaptureFormat = 'png' | 'jpeg' | 'webp';

/**
 * Predefined capture resolution presets.
 */
export type CaptureResolutionPreset =
  | '720p'   // 1280x720
  | '1080p'  // 1920x1080
  | '1440p'  // 2560x1440
  | '4k'     // 3840x2160
  | 'square' // 1024x1024
  | 'thumbnail' // 256x256
  | 'custom';

/**
 * Resolution dimensions for capture presets.
 */
export const CAPTURE_RESOLUTION_PRESETS: Record<
  Exclude<CaptureResolutionPreset, 'custom'>,
  { width: number; height: number; label: string }
> = {
  '720p': { width: 1280, height: 720, label: '720p (1280x720)' },
  '1080p': { width: 1920, height: 1080, label: '1080p (1920x1080)' },
  '1440p': { width: 2560, height: 1440, label: '1440p (2560x1440)' },
  '4k': { width: 3840, height: 2160, label: '4K (3840x2160)' },
  'square': { width: 1024, height: 1024, label: 'Square (1024x1024)' },
  'thumbnail': { width: 256, height: 256, label: 'Thumbnail (256x256)' },
};

/**
 * Configuration for scene capture.
 */
export interface SpectatorCaptureConfig {
  /** Image format (default: 'png') */
  format: CaptureFormat;
  /** JPEG/WebP quality 0-1 (default: 0.92) */
  quality: number;
  /** Resolution preset or custom dimensions */
  resolution: CaptureResolutionPreset;
  /** Custom width (used when resolution is 'custom') */
  customWidth: number;
  /** Custom height (used when resolution is 'custom') */
  customHeight: number;
  /** Whether to include UI overlays in capture (default: false) */
  includeOverlays: boolean;
  /** Whether to apply post-processing in capture (default: true) */
  applyPostProcessing: boolean;
  /** Transparent background (PNG only, default: false) */
  transparentBackground: boolean;
  /** Supersampling factor for anti-aliasing (1-4, default: 1) */
  supersampleFactor: number;
  /** Auto-download after capture (default: true) */
  autoDownload: boolean;
  /** Filename template (supports {date}, {time}, {mode}, {resolution}) */
  filenameTemplate: string;
}

export const DEFAULT_CAPTURE_CONFIG: SpectatorCaptureConfig = {
  format: 'png',
  quality: 0.92,
  resolution: '1080p',
  customWidth: 1920,
  customHeight: 1080,
  includeOverlays: false,
  applyPostProcessing: true,
  transparentBackground: false,
  supersampleFactor: 1,
  autoDownload: true,
  filenameTemplate: 'hololand-capture-{date}-{time}',
};

// =============================================================================
// CAPTURE RESULT
// =============================================================================

/**
 * Result of a scene capture operation.
 */
export interface CaptureResult {
  /** The captured image as a data URL */
  dataUrl: string;
  /** The captured image as a Blob */
  blob: Blob;
  /** Width of the captured image */
  width: number;
  /** Height of the captured image */
  height: number;
  /** Image format used */
  format: CaptureFormat;
  /** File size in bytes */
  sizeBytes: number;
  /** Time taken to capture (ms) */
  captureTimeMs: number;
  /** Filename (generated from template) */
  filename: string;
  /** Timestamp of capture */
  timestamp: number;
  /** Camera state at time of capture */
  cameraState: SpectatorCameraState;
}

// =============================================================================
// CAPTURE HISTORY
// =============================================================================

/**
 * Metadata for a stored capture (lightweight, without blob data).
 */
export interface CaptureHistoryEntry {
  /** Unique capture ID */
  id: string;
  /** Thumbnail data URL (small preview) */
  thumbnailDataUrl: string;
  /** Full image data URL */
  dataUrl: string;
  /** Capture dimensions */
  width: number;
  height: number;
  /** Format used */
  format: CaptureFormat;
  /** File size */
  sizeBytes: number;
  /** Capture timestamp */
  timestamp: number;
  /** Camera state at capture */
  cameraState: SpectatorCameraState;
}

// =============================================================================
// SPECTATOR STATUS
// =============================================================================

/**
 * Status of the spectator camera system.
 */
export type SpectatorStatus =
  | 'inactive'       // Camera not initialized
  | 'ready'          // Camera ready, not rendering
  | 'previewing'     // Active preview rendering
  | 'capturing'      // Capture in progress
  | 'playing'        // Cinematic playback active
  | 'paused'         // Cinematic playback paused
  | 'error';         // Error state

// =============================================================================
// CINEMATIC PLAYBACK STATE
// =============================================================================

/**
 * Playback state for cinematic mode.
 */
export interface CinematicPlaybackState {
  /** Whether playback is active */
  isPlaying: boolean;
  /** Whether playback is paused */
  isPaused: boolean;
  /** Current progress 0-1 */
  progress: number;
  /** Current waypoint index */
  currentWaypoint: number;
  /** Total number of waypoints */
  totalWaypoints: number;
  /** Elapsed time in seconds */
  elapsedTime: number;
  /** Total path duration in seconds */
  totalDuration: number;
  /** Current loop count */
  loopCount: number;
}

export const DEFAULT_PLAYBACK_STATE: CinematicPlaybackState = {
  isPlaying: false,
  isPaused: false,
  progress: 0,
  currentWaypoint: 0,
  totalWaypoints: 0,
  elapsedTime: 0,
  totalDuration: 0,
  loopCount: 0,
};

// =============================================================================
// PERFORMANCE METRICS
// =============================================================================

/**
 * Performance metrics for the spectator camera rendering.
 */
export interface SpectatorPerformanceMetrics {
  /** Current FPS of the spectator render */
  fps: number;
  /** Frame time in ms */
  frameTimeMs: number;
  /** Resolution being rendered */
  renderWidth: number;
  renderHeight: number;
  /** Whether rendering is within budget */
  withinBudget: boolean;
  /** Number of captures taken this session */
  captureCount: number;
  /** Total memory used by capture history (bytes) */
  historyMemoryBytes: number;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * SpectatorCameraPanel component props.
 */
export interface SpectatorCameraPanelProps {
  /** Callback invoked to get the current renderer canvas for capture */
  getCanvas?: () => HTMLCanvasElement | null;
  /** Initial camera state override */
  initialCamera?: Partial<SpectatorCameraState>;
  /** Initial capture config override */
  initialCaptureConfig?: Partial<SpectatorCaptureConfig>;
  /** Orbit mode config override */
  orbitConfig?: Partial<SpectatorOrbitConfig>;
  /** Fly mode config override */
  flyConfig?: Partial<SpectatorFlyConfig>;
  /** Cinematic mode config override */
  cinematicConfig?: Partial<SpectatorCinematicConfig>;
  /** Whether the panel starts collapsed */
  collapsed?: boolean;
  /** Layout direction */
  layout?: 'horizontal' | 'vertical';
  /** Custom CSS class */
  className?: string;
  /** Custom style */
  style?: React.CSSProperties;
  /** Theme override */
  theme?: Partial<SpectatorCameraTheme>;
  /** Callback when a capture is completed */
  onCapture?: (result: CaptureResult) => void;
  /** Callback when camera state changes */
  onCameraChange?: (state: SpectatorCameraState) => void;
  /** Maximum number of captures to keep in history */
  maxHistorySize?: number;
}

// =============================================================================
// HOOK CONFIG
// =============================================================================

/**
 * Configuration for the useSpectatorCamera hook.
 */
export interface UseSpectatorCameraConfig {
  /** Initial camera state */
  initialCamera?: Partial<SpectatorCameraState>;
  /** Initial capture config */
  captureConfig?: Partial<SpectatorCaptureConfig>;
  /** Orbit mode config */
  orbitConfig?: Partial<SpectatorOrbitConfig>;
  /** Fly mode config */
  flyConfig?: Partial<SpectatorFlyConfig>;
  /** Cinematic mode config */
  cinematicConfig?: Partial<SpectatorCinematicConfig>;
  /** Maximum capture history entries (default: 20) */
  maxHistory?: number;
  /** Target FPS for spectator preview rendering (default: 30) */
  previewFPS?: number;
}

/**
 * State returned by useSpectatorCamera hook.
 */
export interface SpectatorCameraHookState {
  /** Current status */
  status: SpectatorStatus;
  /** Current camera state */
  camera: SpectatorCameraState;
  /** Current capture config */
  captureConfig: SpectatorCaptureConfig;
  /** Cinematic playback state */
  playback: CinematicPlaybackState;
  /** Performance metrics */
  performance: SpectatorPerformanceMetrics;
  /** Capture history */
  history: CaptureHistoryEntry[];
  /** Error message if status is 'error' */
  error: string | null;
}

/**
 * Actions returned by useSpectatorCamera hook.
 */
export interface SpectatorCameraHookActions {
  /** Set camera mode */
  setMode: (mode: SpectatorCameraMode) => void;
  /** Set camera position and target */
  setCamera: (position: [number, number, number], target: [number, number, number]) => void;
  /** Set camera field of view */
  setFovY: (fov: number) => void;
  /** Reset camera to default position */
  resetCamera: () => void;
  /** Update capture configuration */
  setCaptureConfig: (config: Partial<SpectatorCaptureConfig>) => void;
  /** Capture the current scene */
  capture: (canvas: HTMLCanvasElement) => Promise<CaptureResult>;
  /** Clear capture history */
  clearHistory: () => void;
  /** Remove a specific capture from history */
  removeCapture: (id: string) => void;
  /** Download a capture from history */
  downloadCapture: (entry: CaptureHistoryEntry) => void;
  /** Start cinematic playback */
  playCinematic: () => void;
  /** Pause cinematic playback */
  pauseCinematic: () => void;
  /** Stop cinematic playback (reset to start) */
  stopCinematic: () => void;
  /** Set cinematic playback speed */
  setPlaybackSpeed: (speed: number) => void;
  /** Add a waypoint to the cinematic path */
  addWaypoint: (waypoint: CinematicWaypoint) => void;
  /** Remove a waypoint by index */
  removeWaypoint: (index: number) => void;
  /** Set orbit auto-rotate speed */
  setAutoRotate: (speed: number) => void;
}

// =============================================================================
// THEME
// =============================================================================

/**
 * Theme for the spectator camera UI.
 */
export interface SpectatorCameraTheme {
  /** Panel background color */
  bg: string;
  /** Card/section background */
  panelBg: string;
  /** Primary text color */
  text: string;
  /** Secondary/muted text color */
  textSecondary: string;
  /** Accent color for active elements */
  accent: string;
  /** Success color */
  success: string;
  /** Warning color */
  warning: string;
  /** Error/critical color */
  error: string;
  /** Border color */
  border: string;
  /** Button background */
  buttonBg: string;
  /** Button hover background */
  buttonHover: string;
  /** Capture button accent */
  captureAccent: string;
  /** Font family */
  fontFamily: string;
  /** Base font size */
  fontSize: number;
  /** Panel width (px) */
  panelWidth: number;
  /** Preview height (px) */
  previewHeight: number;
}

/**
 * Default dark theme consistent with HoloLand studio aesthetic.
 */
export const DEFAULT_SPECTATOR_THEME: SpectatorCameraTheme = {
  bg: '#0a0a1a',
  panelBg: '#121228',
  text: '#e0e0f0',
  textSecondary: '#8888aa',
  accent: '#6366f1',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  border: '#2a2a4e',
  buttonBg: '#1a1a3e',
  buttonHover: '#2a2a5e',
  captureAccent: '#e11d48',
  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  fontSize: 12,
  panelWidth: 340,
  previewHeight: 200,
};

// =============================================================================
// EASING FUNCTIONS
// =============================================================================

/**
 * Easing function implementations.
 */
export const EASING_FUNCTIONS: Record<CinematicEasing, (t: number) => number> = {
  'linear': (t: number) => t,
  'ease-in': (t: number) => t * t,
  'ease-out': (t: number) => t * (2 - t),
  'ease-in-out': (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  'ease-in-cubic': (t: number) => t * t * t,
  'ease-out-cubic': (t: number) => (--t) * t * t + 1,
  'ease-in-out-cubic': (t: number) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
};
