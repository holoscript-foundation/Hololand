/**
 * @hololand/gestures - Types
 * Hand gesture and body pose recognition types
 */

// ============================================================================
// Math Types
// ============================================================================

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

export interface Transform {
  position: Vec3;
  rotation: Quaternion;
  scale?: Vec3;
}

// ============================================================================
// Hand Tracking Types
// ============================================================================

/**
 * Hand joint identifiers (XR Hand standard)
 */
export enum HandJoint {
  WRIST = 'wrist',
  THUMB_METACARPAL = 'thumb-metacarpal',
  THUMB_PHALANX_PROXIMAL = 'thumb-phalanx-proximal',
  THUMB_PHALANX_DISTAL = 'thumb-phalanx-distal',
  THUMB_TIP = 'thumb-tip',
  INDEX_METACARPAL = 'index-finger-metacarpal',
  INDEX_PHALANX_PROXIMAL = 'index-finger-phalanx-proximal',
  INDEX_PHALANX_INTERMEDIATE = 'index-finger-phalanx-intermediate',
  INDEX_PHALANX_DISTAL = 'index-finger-phalanx-distal',
  INDEX_TIP = 'index-finger-tip',
  MIDDLE_METACARPAL = 'middle-finger-metacarpal',
  MIDDLE_PHALANX_PROXIMAL = 'middle-finger-phalanx-proximal',
  MIDDLE_PHALANX_INTERMEDIATE = 'middle-finger-phalanx-intermediate',
  MIDDLE_PHALANX_DISTAL = 'middle-finger-phalanx-distal',
  MIDDLE_TIP = 'middle-finger-tip',
  RING_METACARPAL = 'ring-finger-metacarpal',
  RING_PHALANX_PROXIMAL = 'ring-finger-phalanx-proximal',
  RING_PHALANX_INTERMEDIATE = 'ring-finger-phalanx-intermediate',
  RING_PHALANX_DISTAL = 'ring-finger-phalanx-distal',
  RING_TIP = 'ring-finger-tip',
  PINKY_METACARPAL = 'pinky-finger-metacarpal',
  PINKY_PHALANX_PROXIMAL = 'pinky-finger-phalanx-proximal',
  PINKY_PHALANX_INTERMEDIATE = 'pinky-finger-phalanx-intermediate',
  PINKY_PHALANX_DISTAL = 'pinky-finger-phalanx-distal',
  PINKY_TIP = 'pinky-finger-tip',
}

export enum FingerName {
  THUMB = 'thumb',
  INDEX = 'index',
  MIDDLE = 'middle',
  RING = 'ring',
  PINKY = 'pinky',
}

export interface HandJointData {
  position: Vec3;
  rotation: Quaternion;
  radius?: number;
}

export interface FingerState {
  name: FingerName;
  isExtended: boolean;
  curlAmount: number; // 0-1, how curled
  spreadAngle: number; // angle from center axis
  tipPosition: Vec3;
  tipVelocity: Vec3;
}

export interface HandPose {
  handedness: 'left' | 'right';
  joints: Map<HandJoint, HandJointData>;
  fingers: FingerState[];
  palmPosition: Vec3;
  palmRotation: Quaternion;
  palmVelocity: Vec3;
  palmNormal: Vec3;
  wristPosition: Vec3;
  pinchStrength: number; // 0-1
  grabStrength: number; // 0-1
  confidence: number; // 0-1
  timestamp: number;
}

export interface HandData {
  left?: HandPose;
  right?: HandPose;
  timestamp: number;
}

// ============================================================================
// Gesture Types
// ============================================================================

export enum GestureType {
  // Static gestures
  PINCH = 'pinch',
  GRAB = 'grab',
  POINT = 'point',
  FIST = 'fist',
  OPEN_PALM = 'open_palm',
  THUMBS_UP = 'thumbs_up',
  THUMBS_DOWN = 'thumbs_down',
  PEACE = 'peace',
  OK = 'ok',
  ROCK = 'rock',
  CALL_ME = 'call_me',

  // Motion gestures
  SWIPE_LEFT = 'swipe_left',
  SWIPE_RIGHT = 'swipe_right',
  SWIPE_UP = 'swipe_up',
  SWIPE_DOWN = 'swipe_down',
  PUSH = 'push',
  PULL = 'pull',
  ROTATE_CW = 'rotate_cw',
  ROTATE_CCW = 'rotate_ccw',
  WAVE = 'wave',

  // Two-handed gestures
  SCALE_UP = 'scale_up',
  SCALE_DOWN = 'scale_down',
  CLAP = 'clap',
  FRAME = 'frame',

  // Custom
  CUSTOM = 'custom',
}

export interface GestureResult {
  gesture: GestureType;
  customName?: string;
  handedness: 'left' | 'right' | 'both';
  confidence: number;
  startPosition: Vec3;
  endPosition?: Vec3;
  velocity?: Vec3;
  scaleFactor?: number;
  rotationAngle?: number;
  duration: number;
  timestamp: number;
}

export interface GestureConfig {
  /** Minimum confidence to trigger (0-1) */
  confidenceThreshold: number;
  /** Pinch threshold (0-1) */
  pinchThreshold: number;
  /** Grab threshold (0-1) */
  grabThreshold: number;
  /** Swipe distance threshold (meters) */
  swipeDistanceThreshold: number;
  /** Swipe velocity threshold (m/s) */
  swipeVelocityThreshold: number;
  /** Enable motion gestures */
  enableMotionGestures: boolean;
  /** Enable two-handed gestures */
  enableTwoHandedGestures: boolean;
  /** Debounce time (ms) */
  debounceTime: number;
}

export interface HandGestureRecognizerConfig extends GestureConfig {
  /** Finger extension threshold (0-1) */
  fingerExtensionThreshold: number;
  /** Finger curl threshold (0-1) */
  fingerCurlThreshold: number;
  /** Custom gesture definitions */
  customGestures: CustomGestureDefinition[];
}

export interface CustomGestureDefinition {
  name: string;
  handedness: 'left' | 'right' | 'both';
  fingerStates: {
    thumb?: 'extended' | 'curled' | 'any';
    index?: 'extended' | 'curled' | 'any';
    middle?: 'extended' | 'curled' | 'any';
    ring?: 'extended' | 'curled' | 'any';
    pinky?: 'extended' | 'curled' | 'any';
  };
  pinchRange?: { min: number; max: number };
  grabRange?: { min: number; max: number };
  palmOrientation?: { direction: Vec3; threshold: number };
}

export const DEFAULT_HAND_RECOGNIZER_CONFIG: HandGestureRecognizerConfig = {
  confidenceThreshold: 0.7,
  pinchThreshold: 0.8,
  grabThreshold: 0.7,
  swipeDistanceThreshold: 0.1,
  swipeVelocityThreshold: 0.5,
  enableMotionGestures: true,
  enableTwoHandedGestures: true,
  debounceTime: 300,
  fingerExtensionThreshold: 0.6,
  fingerCurlThreshold: 0.4,
  customGestures: [],
};

// ============================================================================
// Gesture Sequence Types
// ============================================================================

export interface GestureSequenceStep {
  gesture: GestureType;
  handedness?: 'left' | 'right' | 'both';
  maxDuration?: number;
  minDuration?: number;
}

export interface GestureSequence {
  name: string;
  steps: GestureSequenceStep[];
  timeout: number;
  loopable?: boolean;
}

export interface SequenceProgress {
  sequence: string;
  currentStep: number;
  totalSteps: number;
  startTime: number;
  lastStepTime: number;
  completed: boolean;
}

export const GESTURE_SEQUENCE_PRESETS: Record<string, GestureSequence> = {
  doubleTap: {
    name: 'doubleTap',
    steps: [
      { gesture: GestureType.PINCH, maxDuration: 200 },
      { gesture: GestureType.OPEN_PALM, maxDuration: 300 },
      { gesture: GestureType.PINCH, maxDuration: 200 },
    ],
    timeout: 1000,
  },
  swipeAndHold: {
    name: 'swipeAndHold',
    steps: [
      { gesture: GestureType.SWIPE_RIGHT },
      { gesture: GestureType.GRAB, minDuration: 500 },
    ],
    timeout: 2000,
  },
  pinchRotate: {
    name: 'pinchRotate',
    steps: [
      { gesture: GestureType.PINCH },
      { gesture: GestureType.ROTATE_CW },
    ],
    timeout: 1500,
  },
};

// ============================================================================
// Body Tracking Types
// ============================================================================

export enum BodyJoint {
  HEAD = 'head',
  NECK = 'neck',
  CHEST = 'chest',
  SPINE = 'spine',
  HIPS = 'hips',
  LEFT_SHOULDER = 'left_shoulder',
  LEFT_ELBOW = 'left_elbow',
  LEFT_WRIST = 'left_wrist',
  LEFT_HAND = 'left_hand',
  RIGHT_SHOULDER = 'right_shoulder',
  RIGHT_ELBOW = 'right_elbow',
  RIGHT_WRIST = 'right_wrist',
  RIGHT_HAND = 'right_hand',
  LEFT_HIP = 'left_hip',
  LEFT_KNEE = 'left_knee',
  LEFT_ANKLE = 'left_ankle',
  LEFT_FOOT = 'left_foot',
  RIGHT_HIP = 'right_hip',
  RIGHT_KNEE = 'right_knee',
  RIGHT_ANKLE = 'right_ankle',
  RIGHT_FOOT = 'right_foot',
}

export interface BodyJointData {
  position: Vec3;
  rotation: Quaternion;
  confidence: number;
  velocity?: Vec3;
}

export interface BodyPose {
  joints: Map<BodyJoint, BodyJointData>;
  height: number;
  facing: Vec3;
  velocity: Vec3;
  timestamp: number;
  confidence: number;
}

export enum BodyGesture {
  JUMPING = 'jumping',
  CROUCHING = 'crouching',
  REACHING_UP = 'reaching_up',
  REACHING_FORWARD = 'reaching_forward',
  LEANING_LEFT = 'leaning_left',
  LEANING_RIGHT = 'leaning_right',
  TURNING_LEFT = 'turning_left',
  TURNING_RIGHT = 'turning_right',
  WAVING = 'waving',
  T_POSE = 't_pose',
  A_POSE = 'a_pose',
}

export enum BodyStance {
  STANDING = 'standing',
  SITTING = 'sitting',
  KNEELING = 'kneeling',
  LYING = 'lying',
  UNKNOWN = 'unknown',
}

export enum BodyTrackingMode {
  HEAD_ONLY = 'head_only',
  UPPER_BODY = 'upper_body',
  FULL_BODY = 'full_body',
}

export interface BodyGestureResult {
  gesture: BodyGesture;
  stance: BodyStance;
  confidence: number;
  duration: number;
  timestamp: number;
}

export interface BodyPoseRecognizerConfig {
  trackingMode: BodyTrackingMode;
  gestureThreshold: number;
  stanceThreshold: number;
  smoothingFactor: number;
  predictionEnabled: boolean;
}

export const DEFAULT_BODY_RECOGNIZER_CONFIG: BodyPoseRecognizerConfig = {
  trackingMode: BodyTrackingMode.UPPER_BODY,
  gestureThreshold: 0.7,
  stanceThreshold: 0.8,
  smoothingFactor: 0.3,
  predictionEnabled: true,
};

// ============================================================================
// Event Types
// ============================================================================

export interface GestureEvent {
  type: 'gesture' | 'sequence' | 'body';
  result: GestureResult | SequenceProgress | BodyGestureResult;
  timestamp: number;
}

export type GestureEventHandler = (event: GestureEvent) => void;
