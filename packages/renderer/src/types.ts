/**
 * Type definitions for @hololand/renderer
 */

export interface RendererConfig {
  enableShadows?: boolean;
  enableVR?: boolean;
  enableControls?: boolean;
  antialias?: boolean;
  backgroundColor?: number;
  cameraPosition?: { x: number; y: number; z: number };
  cameraFov?: number;
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
