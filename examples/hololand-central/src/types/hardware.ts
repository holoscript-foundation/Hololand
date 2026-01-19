/**
 * Hardware Abstraction Layer (HAL) Types
 * 
 * Defines TypeScript interfaces for VR hardware capabilities across
 * Quest 2, Quest 3, Quest Pro, PCVR, and Vision Pro devices.
 * 
 * Based on: Holoverse gaps.txt - Hardware Capabilities Matrix
 */

export interface HardwareCapabilities {
  handTracking: HandTrackingCapability;
  eyeTracking: EyeTrackingCapability | null;
  faceTracking: FaceTrackingCapability | null;
  bodyTracking: BodyTrackingCapability | null;
  passthrough: PassthroughCapability | null;
  spatialAnchors: SpatialAnchorCapability | null;
  haptics: HapticsCapability;
  voice: VoiceCapability;
  depth: DepthSensorCapability | null;
  deviceType: DeviceType;
}

export type DeviceType = 'quest-2' | 'quest-3' | 'quest-pro' | 'pcvr' | 'vision-pro' | 'unknown';

export interface HandTrackingCapability {
  available: boolean;
  quality: 'basic' | 'good' | 'excellent';
  joints: number; // 25 for full hand skeleton (WebXR standard)
  gestures: GestureName[];
}

export type GestureName = 'pinch' | 'grab' | 'point' | 'fist' | 'open' | 'thumbs_up';

export interface EyeTrackingCapability {
  available: boolean;
  gazePoint: boolean; // Can track where user is looking
  pupilDilation: boolean; // Advanced feature (Quest Pro+)
  blinkDetection: boolean;
}

export interface FaceTrackingCapability {
  available: boolean;
  expressionCount: number; // Number of facial expressions tracked
  requiresConsent: true; // Always requires consent
}

export interface BodyTrackingCapability {
  available: boolean;
  method: 'ai-estimated' | 'tracker-based' | 'camera-based';
  joints: number; // 22 for full body skeleton
  confidence: number; // 0-1 confidence score
  requiresConsent: true; // Always requires consent
}

export interface PassthroughCapability {
  available: boolean;
  colorPassthrough: boolean; // True for Quest 3+, false for Quest 2
  depthEstimation: boolean; // Can estimate real-world depth
}

export interface SpatialAnchorCapability {
  available: boolean;
  persistent: boolean; // Can save anchors across sessions
  maxAnchors: number;
}

export interface HapticsCapability {
  available: boolean;
  controllers: boolean; // Controller vibration
  handTracking: boolean; // Hand tracking haptics (future)
}

export interface VoiceCapability {
  available: boolean;
  wakeWord: boolean; // "Hey Meta" or similar
  continuousListening: boolean;
}

export interface DepthSensorCapability {
  available: boolean;
  type: 'lidar' | 'tof' | 'stereoscopic' | null;
  range: number; // meters
}

/**
 * Body Tracking Consent
 */
export interface BodyTrackingConsent {
  granted: boolean;
  level: 'none' | 'hands' | 'upper' | 'full';
  timestamp: number;
  expiresAt: number | null;
}

/**
 * Hand Tracking Data (WebXR XRHand format)
 */
export interface HandTrackingData {
  hand: 'left' | 'right';
  joints: HandJoint[];
  gesture: GestureName | null;
  confidence: number;
}

export interface HandJoint {
  name: XRHandJointName;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  radius: number;
}

// Standard WebXR hand joint names
export type XRHandJointName = 
  | 'wrist'
  | 'thumb-metacarpal' | 'thumb-phalanx-proximal' | 'thumb-phalanx-distal' | 'thumb-tip'
  | 'index-finger-metacarpal' | 'index-finger-phalanx-proximal' | 'index-finger-phalanx-intermediate' | 'index-finger-phalanx-distal' | 'index-finger-tip'
  | 'middle-finger-metacarpal' | 'middle-finger-phalanx-proximal' | 'middle-finger-phalanx-intermediate' | 'middle-finger-phalanx-distal' | 'middle-finger-tip'
  | 'ring-finger-metacarpal' | 'ring-finger-phalanx-proximal' | 'ring-finger-phalanx-intermediate' | 'ring-finger-phalanx-distal' | 'ring-finger-tip'
  | 'pinky-finger-metacarpal' | 'pinky-finger-phalanx-proximal' | 'pinky-finger-phalanx-intermediate' | 'pinky-finger-phalanx-distal' | 'pinky-finger-tip';

/**
 * Body Tracking Data
 */
export interface BodyTrackingData {
  joints: BodyJoint[];
  confidence: number;
  method: 'ai-estimated' | 'tracker-based' | 'camera-based';
}

export interface BodyJoint {
  name: BodyJointName;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  confidence: number;
}

export type BodyJointName =
  | 'head' | 'neck'
  | 'left-shoulder' | 'right-shoulder'
  | 'left-elbow' | 'right-elbow'
  | 'left-wrist' | 'right-wrist'
  | 'spine-upper' | 'spine-middle' | 'spine-lower'
  | 'pelvis'
  | 'left-hip' | 'right-hip'
  | 'left-knee' | 'right-knee'
  | 'left-ankle' | 'right-ankle'
  | 'left-foot' | 'right-foot';

/**
 * Eye Tracking Data
 */
export interface EyeTrackingData {
  gazePoint: { x: number; y: number; z: number } | null;
  gazeDirection: { x: number; y: number; z: number } | null;
  pupilDilation: number | null; // 0-1
  blinkState: 'open' | 'closed' | 'half';
}
