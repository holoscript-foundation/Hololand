export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface PortalSize {
  width: number;
  height: number;
}

export interface PortalDestination {
  position: Vec3;
  rotation?: Quaternion;
  worldId?: string;
  room?: string;
  server?: string;
  linkedPortalId?: string;
}

export interface PortalConfig {
  id?: string;
  position: Vec3;
  rotation?: Quaternion;
  destination: PortalDestination;
  size?: PortalSize;
  color?: string;
  renderDistance?: number;
  label?: string;
}

export interface Portal extends Required<Omit<PortalConfig, 'id' | 'rotation' | 'size' | 'renderDistance'>> {
  id: string;
  rotation: Quaternion;
  size: PortalSize;
  renderDistance: number;
}

export interface PortalTraversalResult {
  portal: Portal;
  newPosition: Vec3;
  newRotation: Quaternion;
  newVelocity?: Vec3;
}

export interface PortalView {
  portal: Portal;
  position: Vec3;
  rotation: Quaternion;
  viewOffset?: [number, number, number, number];
}

export type PortalEvent = 'traversal' | 'crossServerTraversal';

export type PortalEventHandler = (portal: Portal, result: PortalTraversalResult) => void | Promise<void>;

export type ComfortLevel = 'none' | 'low' | 'medium' | 'high';

export interface TeleportConfig {
  fadeColor?: string;
  fadeDuration?: number;
  comfort?: ComfortLevel;
  snapTurn?: boolean;
  snapAngle?: number;
  vignette?: boolean;
}

export interface TeleportDestination {
  position: Vec3;
  rotation?: Quaternion;
}

export interface TeleportOptions extends Partial<TeleportConfig> {
  onComplete?: () => void;
}

export interface Teleportable {
  position: Vec3;
  previousPosition?: Vec3;
  rotation?: Quaternion;
  velocity?: Vec3;
}

export type TransitionType = 'fade' | 'wipe' | 'dissolve' | 'portal';

export interface TransitionConfig {
  defaultTransition?: TransitionType;
  loadingScreen?: boolean;
  minLoadingTime?: number;
}

export interface TransitionOptions {
  transition?: TransitionType;
  duration?: number;
  color?: string;
  direction?: 'left' | 'right' | 'up' | 'down';
  loadingScreen?: boolean;
  portalPosition?: Vec3;
  server?: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
}

export interface SceneLoadOptions {
  unloadCurrent?: boolean;
  preloadAssets?: boolean;
  onProgress?: (progress: number) => void;
}

export interface ComfortSettings {
  vignetteIntensity?: number;
  fovReduction?: number;
  snapTurnAngle?: number;
  tunnelVision?: boolean;
}
