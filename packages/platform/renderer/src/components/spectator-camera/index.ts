/**
 * Spectator Camera
 *
 * Non-XR spectator camera system for scene capture and preview.
 * Provides multi-mode camera control (orbit, fly, cinematic),
 * screenshot/capture functionality, and a full React UI panel.
 *
 * Component hierarchy:
 *   SpectatorCameraPanel (top-level UI component)
 *     -> useSpectatorCamera (React hook for state management)
 *       -> SpectatorCameraController (multi-mode camera control)
 *       -> SpectatorCaptureEngine (scene capture to PNG/JPEG/WebP)
 *
 * USE CASES:
 * - Generating screenshots/thumbnails of HoloLand worlds
 * - Cinematic flythrough recordings for content creation
 * - Spectator view for non-VR users observing VR sessions
 * - Marketing material and documentation image generation
 * - Automated thumbnail pipelines for world listings
 *
 * @module spectator-camera
 */

// Top-level panel
export { SpectatorCameraPanel } from './SpectatorCameraPanel';

// Controller
export {
  SpectatorCameraController,
  createSpectatorCameraController,
} from './SpectatorCameraController';

// Capture engine
export {
  SpectatorCaptureEngine,
  createSpectatorCaptureEngine,
} from './SpectatorCaptureEngine';

// React hook
export { useSpectatorCamera } from './useSpectatorCamera';

// Types
export type {
  // Camera
  SpectatorCameraMode,
  SpectatorCameraState,
  SpectatorOrbitConfig,
  SpectatorFlyConfig,
  SpectatorCinematicConfig,
  CinematicWaypoint,
  CinematicEasing,
  CinematicPlaybackState,
  // Capture
  CaptureFormat,
  CaptureResolutionPreset,
  SpectatorCaptureConfig,
  CaptureResult,
  CaptureHistoryEntry,
  // Status and metrics
  SpectatorStatus,
  SpectatorPerformanceMetrics,
  // Component and hook props
  SpectatorCameraPanelProps,
  UseSpectatorCameraConfig,
  SpectatorCameraHookState,
  SpectatorCameraHookActions,
  // Theme
  SpectatorCameraTheme,
} from './types';

// Constants
export {
  CAMERA_MODE_LABELS,
  CAMERA_MODE_DESCRIPTIONS,
  CAPTURE_RESOLUTION_PRESETS,
  DEFAULT_SPECTATOR_CAMERA_STATE,
  DEFAULT_ORBIT_CONFIG,
  DEFAULT_FLY_CONFIG,
  DEFAULT_CINEMATIC_CONFIG,
  DEFAULT_CAPTURE_CONFIG,
  DEFAULT_PLAYBACK_STATE,
  DEFAULT_SPECTATOR_THEME,
  EASING_FUNCTIONS,
} from './types';
