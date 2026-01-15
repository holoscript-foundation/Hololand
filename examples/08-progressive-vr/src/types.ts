/**
 * Types for Progressive VR Demo
 */

export type ViewMode = 'desktop' | 'vr' | 'transitioning';

export type EnvironmentPreset = 'sunset' | 'night' | 'studio' | 'forest' | 'space';

export interface SceneState {
  lightIntensity: number;
  objectScale: number;
  rotationSpeed: number;
  environmentPreset: EnvironmentPreset;
  audioEnabled: boolean;
  selectedObject: string | null;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface SceneObject {
  id: string;
  name: string;
  type: 'mesh' | 'light' | 'camera';
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  visible: boolean;
}

export interface VRCapability {
  isVRSupported: boolean;
  vrSession: XRSession | null;
  isEnteringVR: boolean;
  enterVR: () => Promise<void>;
  exitVR: () => Promise<void>;
}
