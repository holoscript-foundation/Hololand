/**
 * Type definitions for @hololand/renderer
 */

/**
 * Render modes for universal platform support (Phase 2)
 * - '3d': Standard 3D perspective rendering (default)
 * - '2d': Orthographic 2D rendering for desktop/mobile apps
 * - 'hybrid': 2D UI overlay on 3D world
 * - 'vr': Full WebXR VR mode
 * - 'ar': Augmented reality mode (WebXR AR)
 */
export type RenderMode = '2d' | '3d' | 'hybrid' | 'vr' | 'ar';

export interface RendererConfig {
  // Rendering mode (Phase 2: Universal Rendering)
  renderMode?: RenderMode;

  // Existing 3D options
  enableShadows?: boolean;
  enableVR?: boolean;
  enableControls?: boolean;
  antialias?: boolean;
  backgroundColor?: number;
  cameraPosition?: { x: number; y: number; z: number };
  cameraFov?: number;

  // 2D mode options (Phase 2)
  enable2D?: boolean;
  orthoSize?: number; // Size for orthographic camera

  // Hybrid mode options (Phase 2)
  enableHybrid?: boolean;
  uiCanvasElement?: HTMLCanvasElement; // Separate canvas for 2D UI overlay
}

export interface MaterialConfig {
  type: 'standard' | 'basic' | 'phong' | 'physical';
  color?: number | string;
  metalness?: number;
  roughness?: number;
  emissive?: number | string;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
}

export interface LightingConfig {
  type: 'ambient' | 'directional' | 'point' | 'spot';
  color: number | string;
  intensity: number;
  position?: { x: number; y: number; z: number };
  distance?: number;
  castShadow?: boolean;
}
