/**
 * Cinematic Camera Types
 *
 * Advanced cinematic camera control panel with keyframe timeline,
 * multi-curve interpolation (Catmull-Rom, Bezier, Hermite),
 * Remotion-based video export, and camera preset library.
 *
 * ARCHITECTURE:
 * Extends the spectator camera system with professional-grade
 * cinematic tooling. The keyframe timeline drives the
 * CinematicPathEngine which interpolates camera transforms
 * across time. The RemotionExportBridge renders each frame
 * via Remotion's server-side composition pipeline.
 *
 * ```
 *   CinematicCameraPanel (UI)
 *        |
 *        +---> useCinematicCamera (hook)
 *        |       |
 *        |       +---> CinematicPathEngine (interpolation)
 *        |       +---> RemotionExportBridge (video export)
 *        |
 *        +---> KeyframeTimeline (timeline UI)
 *        +---> CurveEditor (tangent/handle editing)
 *        +---> ExportPanel (Remotion controls)
 * ```
 *
 * @module cinematic-camera/types
 */

import type React from 'react';

// =============================================================================
// INTERPOLATION CURVES
// =============================================================================

/**
 * Supported interpolation curve types for camera path segments.
 *
 * - catmull-rom:   Passes through all control points. Good for smooth flythroughs.
 * - cubic-bezier:  4-point Bezier with explicit handles. Fine-grained control.
 * - hermite:       Position + tangent per keyframe. Cinematic standard.
 * - linear:        Straight line segments. Mechanical/robotic look.
 * - step:          Instant jump at keyframe boundary. Hard cuts.
 */
export type InterpolationCurve =
  | 'catmull-rom'
  | 'cubic-bezier'
  | 'hermite'
  | 'linear'
  | 'step';

export const INTERPOLATION_LABELS: Record<InterpolationCurve, string> = {
  'catmull-rom': 'Catmull-Rom',
  'cubic-bezier': 'Cubic Bezier',
  'hermite': 'Hermite',
  'linear': 'Linear',
  'step': 'Step (Hard Cut)',
};

// =============================================================================
// KEYFRAME
// =============================================================================

/**
 * A single keyframe on the cinematic timeline.
 * Stores full camera transform + interpolation metadata.
 */
export interface CinematicKeyframe {
  /** Unique keyframe ID */
  id: string;
  /** Time position on timeline in seconds */
  time: number;
  /** Camera position in world space */
  position: [number, number, number];
  /** Camera look-at target in world space */
  target: [number, number, number];
  /** Camera up vector (default [0,1,0]) */
  up: [number, number, number];
  /** Vertical field of view in degrees */
  fovY: number;
  /** Camera roll in degrees (0 = level horizon) */
  roll: number;
  /** Depth of field focus distance (0 = disabled) */
  dofFocusDistance: number;
  /** Depth of field aperture (f-stop, 0 = disabled) */
  dofAperture: number;
  /** Interpolation curve TO this keyframe from previous */
  interpolation: InterpolationCurve;
  /** Catmull-Rom tension (only used when interpolation = 'catmull-rom') */
  tension: number;
  /**
   * Bezier tangent handles (only used when interpolation = 'cubic-bezier').
   * [inTangent, outTangent] as Vec3 offsets from keyframe position.
   */
  bezierHandles: {
    inTangent: [number, number, number];
    outTangent: [number, number, number];
  };
  /**
   * Hermite tangent vectors (only used when interpolation = 'hermite').
   * Direction + magnitude of the curve at this keyframe.
   */
  hermiteTangent: [number, number, number];
  /** Optional label for this keyframe (displayed in timeline) */
  label?: string;
  /** Easing function for the time parameter */
  easing: CinematicEasingType;
}

/**
 * Easing types for keyframe time interpolation.
 */
export type CinematicEasingType =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'ease-in-quad'
  | 'ease-out-quad'
  | 'ease-in-out-quad'
  | 'ease-in-cubic'
  | 'ease-out-cubic'
  | 'ease-in-out-cubic'
  | 'ease-in-expo'
  | 'ease-out-expo'
  | 'ease-in-out-expo';

export const EASING_LABELS: Record<CinematicEasingType, string> = {
  'linear': 'Linear',
  'ease-in': 'Ease In',
  'ease-out': 'Ease Out',
  'ease-in-out': 'Ease In/Out',
  'ease-in-quad': 'Ease In (Quad)',
  'ease-out-quad': 'Ease Out (Quad)',
  'ease-in-out-quad': 'Ease In/Out (Quad)',
  'ease-in-cubic': 'Ease In (Cubic)',
  'ease-out-cubic': 'Ease Out (Cubic)',
  'ease-in-out-cubic': 'Ease In/Out (Cubic)',
  'ease-in-expo': 'Ease In (Expo)',
  'ease-out-expo': 'Ease Out (Expo)',
  'ease-in-out-expo': 'Ease In/Out (Expo)',
};

/**
 * Easing function implementations.
 */
export const CINEMATIC_EASING_FUNCTIONS: Record<CinematicEasingType, (t: number) => number> = {
  'linear': (t) => t,
  'ease-in': (t) => t * t,
  'ease-out': (t) => t * (2 - t),
  'ease-in-out': (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  'ease-in-quad': (t) => t * t,
  'ease-out-quad': (t) => 1 - (1 - t) * (1 - t),
  'ease-in-out-quad': (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  'ease-in-cubic': (t) => t * t * t,
  'ease-out-cubic': (t) => 1 - Math.pow(1 - t, 3),
  'ease-in-out-cubic': (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  'ease-in-expo': (t) => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
  'ease-out-expo': (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  'ease-in-out-expo': (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return t < 0.5
      ? Math.pow(2, 20 * t - 10) / 2
      : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
};

// =============================================================================
// CAMERA PRESETS
// =============================================================================

/**
 * Preset camera motion types.
 */
export type CameraPresetType =
  | 'orbit-360'
  | 'flythrough'
  | 'dolly-in'
  | 'dolly-out'
  | 'crane-up'
  | 'crane-down'
  | 'truck-left'
  | 'truck-right'
  | 'pedestal-up'
  | 'pedestal-down'
  | 'zoom-in'
  | 'zoom-out'
  | 'reveal'
  | 'pull-away'
  | 'dutch-tilt'
  | 'rack-focus';

export const CAMERA_PRESET_LABELS: Record<CameraPresetType, string> = {
  'orbit-360': '360 Orbit',
  'flythrough': 'Flythrough',
  'dolly-in': 'Dolly In',
  'dolly-out': 'Dolly Out',
  'crane-up': 'Crane Up',
  'crane-down': 'Crane Down',
  'truck-left': 'Truck Left',
  'truck-right': 'Truck Right',
  'pedestal-up': 'Pedestal Up',
  'pedestal-down': 'Pedestal Down',
  'zoom-in': 'Zoom In',
  'zoom-out': 'Zoom Out',
  'reveal': 'Reveal',
  'pull-away': 'Pull Away',
  'dutch-tilt': 'Dutch Tilt',
  'rack-focus': 'Rack Focus',
};

export const CAMERA_PRESET_DESCRIPTIONS: Record<CameraPresetType, string> = {
  'orbit-360': 'Full 360-degree orbit around the target at constant radius.',
  'flythrough': 'Smooth forward motion along a straight or curved path.',
  'dolly-in': 'Move camera toward the subject along the look axis.',
  'dolly-out': 'Move camera away from the subject along the look axis.',
  'crane-up': 'Raise camera vertically while maintaining horizontal look.',
  'crane-down': 'Lower camera vertically while maintaining horizontal look.',
  'truck-left': 'Slide camera laterally to the left.',
  'truck-right': 'Slide camera laterally to the right.',
  'pedestal-up': 'Raise camera and target together vertically.',
  'pedestal-down': 'Lower camera and target together vertically.',
  'zoom-in': 'Narrow FOV to simulate optical zoom toward subject.',
  'zoom-out': 'Widen FOV to simulate optical zoom away from subject.',
  'reveal': 'Start tight, pull back and pan to reveal the full scene.',
  'pull-away': 'Start close, slowly pull back to show context.',
  'dutch-tilt': 'Gradually rotate the camera roll for dramatic effect.',
  'rack-focus': 'Shift depth of field focus from foreground to background.',
};

/**
 * Configuration for applying a camera preset.
 */
export interface CameraPresetConfig {
  /** Preset type */
  type: CameraPresetType;
  /** Duration in seconds */
  duration: number;
  /** Target/focus point in world space */
  target: [number, number, number];
  /** Starting distance from target (for orbit/dolly) */
  startDistance: number;
  /** Ending distance from target (for orbit/dolly) */
  endDistance: number;
  /** Starting height (for crane/pedestal) */
  startHeight: number;
  /** Ending height (for crane/pedestal) */
  endHeight: number;
  /** Starting FOV (for zoom presets) */
  startFovY: number;
  /** Ending FOV (for zoom presets) */
  endFovY: number;
  /** Starting roll (for dutch tilt) */
  startRoll: number;
  /** Ending roll (for dutch tilt) */
  endRoll: number;
  /** Easing to apply */
  easing: CinematicEasingType;
  /** Number of keyframes to generate */
  keyframeCount: number;
}

export const DEFAULT_PRESET_CONFIG: CameraPresetConfig = {
  type: 'orbit-360',
  duration: 10,
  target: [0, 0, 0],
  startDistance: 8,
  endDistance: 8,
  startHeight: 3,
  endHeight: 3,
  startFovY: 50,
  endFovY: 50,
  startRoll: 0,
  endRoll: 0,
  easing: 'ease-in-out',
  keyframeCount: 8,
};

// =============================================================================
// CINEMATIC SEQUENCE
// =============================================================================

/**
 * A complete cinematic sequence (collection of keyframes + metadata).
 */
export interface CinematicSequence {
  /** Unique sequence ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Ordered keyframes (sorted by time) */
  keyframes: CinematicKeyframe[];
  /** Total duration in seconds (auto-computed from last keyframe time) */
  duration: number;
  /** Whether the sequence loops */
  loop: boolean;
  /** Global playback speed multiplier */
  playbackSpeed: number;
  /** Frames per second for export */
  fps: number;
  /** Creation timestamp */
  createdAt: number;
  /** Last modified timestamp */
  modifiedAt: number;
}

// =============================================================================
// TIMELINE STATE
// =============================================================================

/**
 * Playback state for the cinematic timeline.
 */
export interface CinematicPlaybackState {
  /** Whether playback is active */
  isPlaying: boolean;
  /** Whether playback is paused */
  isPaused: boolean;
  /** Current playhead time in seconds */
  currentTime: number;
  /** Current playhead progress (0-1) */
  progress: number;
  /** Current loop iteration count */
  loopCount: number;
  /** Index of the currently active keyframe segment */
  activeSegment: number;
  /** Frame count since playback started */
  frameCount: number;
}

export const DEFAULT_CINEMATIC_PLAYBACK: CinematicPlaybackState = {
  isPlaying: false,
  isPaused: false,
  currentTime: 0,
  progress: 0,
  loopCount: 0,
  activeSegment: 0,
  frameCount: 0,
};

// =============================================================================
// EVALUATED CAMERA STATE
// =============================================================================

/**
 * Fully evaluated camera state at a point in time.
 * This is what the path engine produces after interpolation.
 */
export interface EvaluatedCameraState {
  /** Camera position in world space */
  position: [number, number, number];
  /** Camera look-at target */
  target: [number, number, number];
  /** Camera up vector */
  up: [number, number, number];
  /** Vertical field of view */
  fovY: number;
  /** Camera roll in degrees */
  roll: number;
  /** Depth of field focus distance */
  dofFocusDistance: number;
  /** Depth of field aperture (f-stop) */
  dofAperture: number;
  /** Aspect ratio */
  aspect: number;
  /** Near clip plane */
  near: number;
  /** Far clip plane */
  far: number;
}

export const DEFAULT_EVALUATED_CAMERA: EvaluatedCameraState = {
  position: [5, 3, 5],
  target: [0, 0, 0],
  up: [0, 1, 0],
  fovY: 50,
  roll: 0,
  dofFocusDistance: 0,
  dofAperture: 0,
  aspect: 16 / 9,
  near: 0.1,
  far: 1000,
};

// =============================================================================
// REMOTION EXPORT CONFIGURATION
// =============================================================================

/**
 * Video export output formats.
 */
export type VideoExportFormat = 'mp4' | 'webm' | 'gif' | 'png-sequence';

export const VIDEO_FORMAT_LABELS: Record<VideoExportFormat, string> = {
  'mp4': 'MP4 (H.264)',
  'webm': 'WebM (VP9)',
  'gif': 'GIF (Animated)',
  'png-sequence': 'PNG Sequence',
};

/**
 * Video export resolution presets.
 */
export type VideoResolutionPreset = '720p' | '1080p' | '1440p' | '4k' | 'custom';

export const VIDEO_RESOLUTION_PRESETS: Record<
  Exclude<VideoResolutionPreset, 'custom'>,
  { width: number; height: number; label: string }
> = {
  '720p': { width: 1280, height: 720, label: '720p (1280x720)' },
  '1080p': { width: 1920, height: 1080, label: '1080p (1920x1080)' },
  '1440p': { width: 2560, height: 1440, label: '1440p (2560x1440)' },
  '4k': { width: 3840, height: 2160, label: '4K (3840x2160)' },
};

/**
 * FPS presets for video export.
 */
export type VideoFPSPreset = 24 | 25 | 30 | 48 | 60;

/**
 * Remotion video export configuration.
 */
export interface RemotionExportConfig {
  /** Output format */
  format: VideoExportFormat;
  /** Resolution preset */
  resolution: VideoResolutionPreset;
  /** Custom width (when resolution = 'custom') */
  customWidth: number;
  /** Custom height (when resolution = 'custom') */
  customHeight: number;
  /** Frames per second */
  fps: VideoFPSPreset;
  /** Video codec (for mp4: 'h264', for webm: 'vp9') */
  codec: string;
  /** CRF quality (0-51 for h264, lower = better quality, bigger file) */
  crf: number;
  /** Pixel format */
  pixelFormat: string;
  /** Whether to include audio track */
  includeAudio: boolean;
  /** Audio file path (if includeAudio) */
  audioPath: string;
  /** Remotion composition ID */
  compositionId: string;
  /** Output filename template */
  filenameTemplate: string;
  /** Whether to apply post-processing effects in export */
  applyPostProcessing: boolean;
  /** Supersampling factor for anti-aliasing (1-4) */
  supersampleFactor: number;
}

export const DEFAULT_REMOTION_EXPORT: RemotionExportConfig = {
  format: 'mp4',
  resolution: '1080p',
  customWidth: 1920,
  customHeight: 1080,
  fps: 30,
  codec: 'h264',
  crf: 18,
  pixelFormat: 'yuv420p',
  includeAudio: false,
  audioPath: '',
  compositionId: 'CinematicExport',
  filenameTemplate: 'hololand-cinematic-{date}-{time}',
  applyPostProcessing: true,
  supersampleFactor: 1,
};

/**
 * Export progress state.
 */
export interface ExportProgress {
  /** Export status */
  status: 'idle' | 'preparing' | 'rendering' | 'encoding' | 'complete' | 'error';
  /** Current frame being rendered */
  currentFrame: number;
  /** Total frames to render */
  totalFrames: number;
  /** Progress percentage 0-100 */
  percentage: number;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining: number;
  /** Elapsed time in seconds */
  elapsedTime: number;
  /** Error message if status is 'error' */
  errorMessage: string | null;
  /** Output file path or data URL when complete */
  outputUrl: string | null;
  /** Output file size in bytes */
  outputSizeBytes: number;
}

export const DEFAULT_EXPORT_PROGRESS: ExportProgress = {
  status: 'idle',
  currentFrame: 0,
  totalFrames: 0,
  percentage: 0,
  estimatedTimeRemaining: 0,
  elapsedTime: 0,
  errorMessage: null,
  outputUrl: null,
  outputSizeBytes: 0,
};

// =============================================================================
// TIMELINE UI STATE
// =============================================================================

/**
 * Which timeline panel section is expanded.
 */
export type TimelinePanelSection =
  | 'keyframes'
  | 'curves'
  | 'presets'
  | 'export'
  | 'properties';

/**
 * Selection state within the timeline.
 */
export interface TimelineSelection {
  /** Selected keyframe IDs */
  selectedKeyframes: string[];
  /** Whether multi-select is active (Ctrl/Cmd held) */
  isMultiSelect: boolean;
  /** Keyframe being dragged (null if none) */
  draggingKeyframe: string | null;
  /** Whether the playhead is being scrubbed */
  isScrubbing: boolean;
}

export const DEFAULT_TIMELINE_SELECTION: TimelineSelection = {
  selectedKeyframes: [],
  isMultiSelect: false,
  draggingKeyframe: null,
  isScrubbing: false,
};

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * CinematicCameraPanel component props.
 */
export interface CinematicCameraPanelProps {
  /** Callback to get the Three.js canvas for rendering */
  getCanvas?: () => HTMLCanvasElement | null;
  /** Callback to get the Three.js scene reference */
  getScene?: () => unknown;
  /** Callback to get the Three.js camera reference */
  getCamera?: () => unknown;
  /** Initial sequence to load */
  initialSequence?: Partial<CinematicSequence>;
  /** Export configuration override */
  exportConfig?: Partial<RemotionExportConfig>;
  /** Whether the panel starts collapsed */
  collapsed?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Custom style */
  style?: React.CSSProperties;
  /** Theme override */
  theme?: Partial<CinematicCameraTheme>;
  /** Callback when camera state changes (for integration with R3F) */
  onCameraUpdate?: (state: EvaluatedCameraState) => void;
  /** Callback when export completes */
  onExportComplete?: (url: string, sizeBytes: number) => void;
  /** Callback when a sequence is saved */
  onSequenceSave?: (sequence: CinematicSequence) => void;
  /** Whether Remotion is available (enables export panel) */
  remotionAvailable?: boolean;
  /** Remotion render function (if using Remotion server-side) */
  remotionRenderFn?: (config: RemotionRenderRequest) => Promise<RemotionRenderResult>;
}

/**
 * Request object passed to the Remotion render function.
 */
export interface RemotionRenderRequest {
  /** Composition ID */
  compositionId: string;
  /** Output format */
  format: VideoExportFormat;
  /** Video width */
  width: number;
  /** Video height */
  height: number;
  /** Frames per second */
  fps: number;
  /** Total number of frames */
  totalFrames: number;
  /** Duration in seconds */
  durationInSeconds: number;
  /** Camera keyframes serialized as JSON */
  keyframesJson: string;
  /** Codec */
  codec: string;
  /** CRF quality */
  crf: number;
  /** Pixel format */
  pixelFormat: string;
  /** Whether to include audio */
  includeAudio: boolean;
  /** Audio file path */
  audioPath: string;
  /** Post-processing enabled */
  applyPostProcessing: boolean;
  /** Supersampling factor */
  supersampleFactor: number;
  /** Output filename */
  outputFilename: string;
  /** Progress callback */
  onProgress?: (frame: number, totalFrames: number) => void;
}

/**
 * Result returned from Remotion render.
 */
export interface RemotionRenderResult {
  /** Success flag */
  success: boolean;
  /** Output URL or file path */
  outputUrl: string;
  /** File size in bytes */
  sizeBytes: number;
  /** Render time in seconds */
  renderTimeSeconds: number;
  /** Error message if not successful */
  error?: string;
}

// =============================================================================
// HOOK CONFIG
// =============================================================================

/**
 * Configuration for useCinematicCamera hook.
 */
export interface UseCinematicCameraConfig {
  /** Initial sequence */
  initialSequence?: Partial<CinematicSequence>;
  /** Export configuration */
  exportConfig?: Partial<RemotionExportConfig>;
  /** Whether to auto-play on mount */
  autoPlay?: boolean;
  /** Preview FPS (for real-time preview, separate from export FPS) */
  previewFPS?: number;
  /** Maximum undo history size */
  maxUndoHistory?: number;
}

/**
 * State returned by useCinematicCamera hook.
 */
export interface CinematicCameraHookState {
  /** Current sequence */
  sequence: CinematicSequence;
  /** Playback state */
  playback: CinematicPlaybackState;
  /** Current evaluated camera state */
  camera: EvaluatedCameraState;
  /** Timeline selection state */
  selection: TimelineSelection;
  /** Export progress */
  exportProgress: ExportProgress;
  /** Export config */
  exportConfig: RemotionExportConfig;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Error message */
  error: string | null;
}

/**
 * Actions returned by useCinematicCamera hook.
 */
export interface CinematicCameraHookActions {
  // Playback
  play: () => void;
  pause: () => void;
  stop: () => void;
  scrubTo: (time: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  toggleLoop: () => void;

  // Keyframes
  addKeyframe: (keyframe: Partial<CinematicKeyframe>) => string;
  updateKeyframe: (id: string, updates: Partial<CinematicKeyframe>) => void;
  removeKeyframe: (id: string) => void;
  duplicateKeyframe: (id: string) => string;
  captureKeyframe: () => string;

  // Selection
  selectKeyframe: (id: string, multi?: boolean) => void;
  deselectAll: () => void;

  // Presets
  applyPreset: (config: CameraPresetConfig) => void;

  // Sequence management
  setSequenceName: (name: string) => void;
  clearSequence: () => void;
  importSequence: (json: string) => void;
  exportSequenceJson: () => string;

  // Export
  setExportConfig: (config: Partial<RemotionExportConfig>) => void;
  startExport: (renderFn?: (config: RemotionRenderRequest) => Promise<RemotionRenderResult>) => Promise<void>;
  cancelExport: () => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
}

// =============================================================================
// THEME
// =============================================================================

/**
 * Theme for the cinematic camera UI.
 */
export interface CinematicCameraTheme {
  /** Panel background */
  bg: string;
  /** Section background */
  panelBg: string;
  /** Primary text */
  text: string;
  /** Secondary text */
  textSecondary: string;
  /** Accent color (buttons, active elements) */
  accent: string;
  /** Accent hover */
  accentHover: string;
  /** Success color */
  success: string;
  /** Warning color */
  warning: string;
  /** Error color */
  error: string;
  /** Border color */
  border: string;
  /** Button background */
  buttonBg: string;
  /** Button hover */
  buttonHover: string;
  /** Timeline track background */
  timelineTrack: string;
  /** Timeline playhead color */
  timelinePlayhead: string;
  /** Keyframe diamond color (unselected) */
  keyframeColor: string;
  /** Keyframe diamond color (selected) */
  keyframeSelected: string;
  /** Curve path color */
  curveColor: string;
  /** Export button accent */
  exportAccent: string;
  /** Font family */
  fontFamily: string;
  /** Base font size */
  fontSize: number;
  /** Panel width */
  panelWidth: number;
  /** Timeline height */
  timelineHeight: number;
}

export const DEFAULT_CINEMATIC_THEME: CinematicCameraTheme = {
  bg: '#08081a',
  panelBg: '#0f0f28',
  text: '#e0e0f0',
  textSecondary: '#7878aa',
  accent: '#818cf8',
  accentHover: '#6366f1',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  border: '#1e1e4e',
  buttonBg: '#16163e',
  buttonHover: '#22225e',
  timelineTrack: '#12122e',
  timelinePlayhead: '#f43f5e',
  keyframeColor: '#fbbf24',
  keyframeSelected: '#f97316',
  curveColor: '#818cf8',
  exportAccent: '#10b981',
  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  fontSize: 12,
  panelWidth: 420,
  timelineHeight: 80,
};

// =============================================================================
// UTILITY DEFAULTS
// =============================================================================

let _nextKeyframeId = 0;

export function generateKeyframeId(): string {
  return `kf_${Date.now()}_${_nextKeyframeId++}`;
}

export function generateSequenceId(): string {
  return `seq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultKeyframe(time: number, overrides?: Partial<CinematicKeyframe>): CinematicKeyframe {
  return {
    id: generateKeyframeId(),
    time,
    position: [5, 3, 5],
    target: [0, 0, 0],
    up: [0, 1, 0],
    fovY: 50,
    roll: 0,
    dofFocusDistance: 0,
    dofAperture: 0,
    interpolation: 'catmull-rom',
    tension: 0.5,
    bezierHandles: {
      inTangent: [-1, 0, 0],
      outTangent: [1, 0, 0],
    },
    hermiteTangent: [1, 0, 0],
    easing: 'ease-in-out',
    ...overrides,
  };
}

export function createDefaultSequence(overrides?: Partial<CinematicSequence>): CinematicSequence {
  const now = Date.now();
  return {
    id: generateSequenceId(),
    name: 'Untitled Sequence',
    keyframes: [],
    duration: 0,
    loop: false,
    playbackSpeed: 1.0,
    fps: 30,
    createdAt: now,
    modifiedAt: now,
    ...overrides,
  };
}
