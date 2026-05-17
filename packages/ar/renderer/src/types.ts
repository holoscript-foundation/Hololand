/**
 * @hololand/ar-renderer - Type Definitions
 *
 * Types for AR rendering, WebXR, and VRM avatars.
 */

// =============================================================================
// VECTOR & TRANSFORM TYPES
// =============================================================================

export interface Vector3 {
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

export interface Transform {
  position: Vector3;
  rotation: Quaternion;
  scale?: Vector3;
}

export interface Pose {
  position: Vector3;
  rotation: Quaternion;
}

// =============================================================================
// SKELETON & ANIMATION TYPES
// =============================================================================

export interface BoneTransform {
  name: string;
  position: Vector3;
  rotation: Quaternion;
}

export interface SkeletonPose {
  timestamp: number;
  rootTransform: Transform;
  bones: BoneTransform[];
}

/**
 * Standard VRM bone names
 */
export type VRMBoneName =
  | 'hips'
  | 'spine'
  | 'chest'
  | 'upperChest'
  | 'neck'
  | 'head'
  | 'leftShoulder'
  | 'leftUpperArm'
  | 'leftLowerArm'
  | 'leftHand'
  | 'rightShoulder'
  | 'rightUpperArm'
  | 'rightLowerArm'
  | 'rightHand'
  | 'leftUpperLeg'
  | 'leftLowerLeg'
  | 'leftFoot'
  | 'leftToes'
  | 'rightUpperLeg'
  | 'rightLowerLeg'
  | 'rightFoot'
  | 'rightToes'
  | 'leftThumbProximal'
  | 'leftThumbIntermediate'
  | 'leftThumbDistal'
  | 'leftIndexProximal'
  | 'leftIndexIntermediate'
  | 'leftIndexDistal'
  | 'leftMiddleProximal'
  | 'leftMiddleIntermediate'
  | 'leftMiddleDistal'
  | 'leftRingProximal'
  | 'leftRingIntermediate'
  | 'leftRingDistal'
  | 'leftLittleProximal'
  | 'leftLittleIntermediate'
  | 'leftLittleDistal'
  | 'rightThumbProximal'
  | 'rightThumbIntermediate'
  | 'rightThumbDistal'
  | 'rightIndexProximal'
  | 'rightIndexIntermediate'
  | 'rightIndexDistal'
  | 'rightMiddleProximal'
  | 'rightMiddleIntermediate'
  | 'rightMiddleDistal'
  | 'rightRingProximal'
  | 'rightRingIntermediate'
  | 'rightRingDistal'
  | 'rightLittleProximal'
  | 'rightLittleIntermediate'
  | 'rightLittleDistal'
  | 'leftEye'
  | 'rightEye'
  | 'jaw';

// =============================================================================
// AVATAR TYPES
// =============================================================================

export interface AvatarConfig {
  /** VRM model URL */
  vrmUrl: string;
  /** Initial scale */
  scale?: number;
  /** Enable IK retargeting */
  enableIK?: boolean;
  /** Enable expression blending */
  enableExpressions?: boolean;
  /** Enable look-at tracking */
  enableLookAt?: boolean;
}

export interface AvatarState {
  /** Avatar ID */
  id: string;
  /** Current transform */
  transform: Transform;
  /** Current pose */
  pose?: SkeletonPose;
  /** Active expression */
  expression?: string;
  /** Expression weight */
  expressionWeight?: number;
  /** Look-at target */
  lookAtTarget?: Vector3;
  /** Is visible */
  visible: boolean;
}

// =============================================================================
// WEBXR TYPES
// =============================================================================

export type XRSessionMode = 'inline' | 'immersive-vr' | 'immersive-ar';
export type XRReferenceSpaceType =
  | 'viewer'
  | 'local'
  | 'local-floor'
  | 'bounded-floor'
  | 'unbounded';

export interface XRSessionConfig {
  mode: XRSessionMode;
  requiredFeatures?: string[];
  optionalFeatures?: string[];
  referenceSpace: XRReferenceSpaceType;
}

export const DEFAULT_AR_SESSION_CONFIG: XRSessionConfig = {
  mode: 'immersive-ar',
  requiredFeatures: ['local-floor'],
  optionalFeatures: ['hand-tracking', 'hit-test', 'depth-sensing', 'light-estimation'],
  referenceSpace: 'local-floor',
};

// =============================================================================
// RENDERER TYPES
// =============================================================================

export interface RendererConfig {
  /** Canvas element */
  canvas?: HTMLCanvasElement;
  /** Enable antialiasing */
  antialias?: boolean;
  /** Enable alpha (transparent background for AR) */
  alpha?: boolean;
  /** Preserve drawing buffer for screenshots */
  preserveDrawingBuffer?: boolean;
  /** Pixel ratio (default: device pixel ratio) */
  pixelRatio?: number;
  /** Enable shadows */
  shadows?: boolean;
  /** Enable tone mapping */
  toneMapping?: boolean;
  /** Enable post-processing */
  postProcessing?: boolean;
}

export const DEFAULT_RENDERER_CONFIG: RendererConfig = {
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: false,
  shadows: true,
  toneMapping: true,
  postProcessing: false,
};

// =============================================================================
// IK TYPES
// =============================================================================

export interface IKTarget {
  bone: VRMBoneName;
  position: Vector3;
  rotation?: Quaternion;
  weight?: number;
}

export interface IKConfig {
  /** Max iterations per solve */
  maxIterations: number;
  /** Convergence tolerance */
  tolerance: number;
  /** Enable pole targets */
  usePoleTargets: boolean;
  /** Constraint limits */
  jointLimits: boolean;
}

export const DEFAULT_IK_CONFIG: IKConfig = {
  maxIterations: 10,
  tolerance: 0.001,
  usePoleTargets: true,
  jointLimits: true,
};
