/**
 * Cinematic Camera
 *
 * Advanced cinematic camera control panel with keyframe timeline,
 * multi-curve interpolation, Remotion video export, and camera presets.
 *
 * Component hierarchy:
 *   CinematicCameraPanel (top-level UI component)
 *     -> useCinematicCamera (React hook for state management)
 *       -> CinematicPathEngine (multi-curve interpolation engine)
 *       -> RemotionExportBridge (video export via Remotion or MediaRecorder)
 *       -> CameraPresetLibrary (preset camera motion generators)
 *
 * USE CASES:
 * - Professional cinematic flythrough creation for HoloLand worlds
 * - Video export for content creation and marketing
 * - Keyframe-based camera animation with curve editing
 * - Preset-driven camera motions (orbit, dolly, crane, etc.)
 * - Remotion server-side rendering for high-quality video output
 * - Client-side MediaRecorder fallback for browser-only export
 *
 * @module cinematic-camera
 */

// Top-level panel
export { CinematicCameraPanel } from './CinematicCameraPanel';

// Path interpolation engine
export {
  CinematicPathEngine,
  createCinematicPathEngine,
} from './CinematicPathEngine';

// Remotion export bridge
export {
  RemotionExportBridge,
  createRemotionExportBridge,
} from './RemotionExportBridge';

// Camera preset library
export {
  generatePresetKeyframes,
  getDefaultPresetConfig,
  getAllPresetTypes,
  PRESET_CATEGORIES,
} from './CameraPresetLibrary';

// React hook
export { useCinematicCamera } from './useCinematicCamera';

// Types
export type {
  // Interpolation
  InterpolationCurve,
  // Keyframes
  CinematicKeyframe,
  CinematicEasingType,
  // Presets
  CameraPresetType,
  CameraPresetConfig,
  // Sequence
  CinematicSequence,
  // Playback
  CinematicPlaybackState,
  // Camera state
  EvaluatedCameraState,
  // Export
  VideoExportFormat,
  VideoResolutionPreset,
  VideoFPSPreset,
  RemotionExportConfig,
  RemotionRenderRequest,
  RemotionRenderResult,
  ExportProgress,
  // Timeline UI
  TimelinePanelSection,
  TimelineSelection,
  // Component props
  CinematicCameraPanelProps,
  UseCinematicCameraConfig,
  CinematicCameraHookState,
  CinematicCameraHookActions,
  // Theme
  CinematicCameraTheme,
} from './types';

// Constants
export {
  INTERPOLATION_LABELS,
  EASING_LABELS,
  CINEMATIC_EASING_FUNCTIONS,
  CAMERA_PRESET_LABELS,
  CAMERA_PRESET_DESCRIPTIONS,
  VIDEO_FORMAT_LABELS,
  VIDEO_RESOLUTION_PRESETS,
  DEFAULT_CINEMATIC_THEME,
  DEFAULT_CINEMATIC_PLAYBACK,
  DEFAULT_EVALUATED_CAMERA,
  DEFAULT_REMOTION_EXPORT,
  DEFAULT_EXPORT_PROGRESS,
  DEFAULT_TIMELINE_SELECTION,
  DEFAULT_PRESET_CONFIG,
  createDefaultKeyframe,
  createDefaultSequence,
  generateKeyframeId,
  generateSequenceId,
} from './types';
