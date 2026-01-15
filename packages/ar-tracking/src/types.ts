/**
 * @hololand/ar-tracking - Type Definitions
 * 
 * Multi-Target Tracking (MTT) with DeepSORT-like data association
 * for shared AR experiences.
 */

// =============================================================================
// COORDINATE SYSTEMS & SPATIAL PRIMITIVES
// =============================================================================

/** 3D position in world coordinates */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/** 3D rotation as quaternion */
export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

/** 6DoF pose (position + orientation) */
export interface Pose {
  position: Vector3;
  rotation: Quaternion;
  timestamp: number;
}

/** Bounding box in 3D space */
export interface BoundingBox3D {
  center: Vector3;
  size: Vector3;
  rotation?: Quaternion;
}

// =============================================================================
// PERSON DETECTION & SKELETON
// =============================================================================

/** 2D keypoint from pose estimation */
export interface Keypoint2D {
  x: number;
  y: number;
  confidence: number;
  name: KeypointName;
}

/** 3D keypoint (projected from depth or estimated) */
export interface Keypoint3D extends Vector3 {
  confidence: number;
  name: KeypointName;
}

/** Standard skeleton keypoint names (BlazePose-style) */
export type KeypointName =
  | 'nose'
  | 'left_eye' | 'right_eye'
  | 'left_ear' | 'right_ear'
  | 'left_shoulder' | 'right_shoulder'
  | 'left_elbow' | 'right_elbow'
  | 'left_wrist' | 'right_wrist'
  | 'left_hip' | 'right_hip'
  | 'left_knee' | 'right_knee'
  | 'left_ankle' | 'right_ankle';

/** Full skeleton pose */
export interface Skeleton {
  keypoints2D: Keypoint2D[];
  keypoints3D: Keypoint3D[];
  confidence: number;
}

/** Person detection from a single frame */
export interface PersonDetection {
  /** Local track ID from this headset's detector */
  localTrackId: string;
  /** Bounding box */
  boundingBox: BoundingBox3D;
  /** Estimated 3D position (center mass) */
  position: Vector3;
  /** Skeleton pose if available */
  skeleton?: Skeleton;
  /** ReID appearance embedding (128-512 dim feature vector) */
  appearanceEmbedding?: number[];
  /** Face embedding if detected (for optional face recognition) */
  faceEmbedding?: number[];
  /** Detection confidence [0-1] */
  confidence: number;
  /** Timestamp */
  timestamp: number;
}

// =============================================================================
// TRACKING STATE
// =============================================================================

/** Kalman filter state for a tracked person */
export interface KalmanState {
  /** Position estimate */
  position: Vector3;
  /** Velocity estimate */
  velocity: Vector3;
  /** Position covariance (uncertainty) */
  positionCovariance: number;
  /** Velocity covariance */
  velocityCovariance: number;
}

/** A tracked person with stable global ID */
export interface TrackedPerson {
  /** Global stable ID (agreed across all headsets) */
  globalId: string;
  /** Bound user ID (if identified/assigned) */
  userId?: string;
  /** Bound character/avatar ID */
  characterId?: string;
  /** Current estimated position */
  position: Vector3;
  /** Current velocity */
  velocity: Vector3;
  /** Kalman filter state */
  kalmanState: KalmanState;
  /** Latest skeleton */
  skeleton?: Skeleton;
  /** Appearance embedding (running average) */
  appearanceEmbedding: number[];
  /** Track age (frames since first detection) */
  age: number;
  /** Frames since last detection */
  timeSinceUpdate: number;
  /** Track confidence */
  confidence: number;
  /** Track state */
  state: TrackState;
}

export type TrackState = 
  | 'tentative'    // New track, not yet confirmed
  | 'confirmed'    // Stable track
  | 'occluded'     // Temporarily lost
  | 'deleted';     // Track removed

// =============================================================================
// CLIENT → SERVER MESSAGES
// =============================================================================

/** Headset registration */
export interface HeadsetRegistration {
  type: 'register';
  headsetId: string;
  userId: string;
  deviceType: 'quest3' | 'vision_pro' | 'phone_lidar' | 'phone_no_depth' | 'other';
  hasDepthSensor: boolean;
  /** Initial pose in world coordinates (after anchor alignment) */
  initialPose: Pose;
}

/** Detection update from a headset */
export interface DetectionUpdate {
  type: 'detections';
  headsetId: string;
  /** Current headset pose */
  headsetPose: Pose;
  /** Detected persons this frame */
  detections: PersonDetection[];
  /** Frame timestamp */
  timestamp: number;
  /** Frame number */
  frameNumber: number;
}

/** Anchor alignment confirmation */
export interface AnchorAlignment {
  type: 'anchor_aligned';
  headsetId: string;
  anchorId: string;
  anchorType: 'qr' | 'apriltag' | 'vps' | 'manual';
  /** Transform from local to world coordinates */
  localToWorldTransform: {
    position: Vector3;
    rotation: Quaternion;
    scale: number;
  };
}

export type ClientMessage = 
  | HeadsetRegistration 
  | DetectionUpdate 
  | AnchorAlignment;

// =============================================================================
// SERVER → CLIENT MESSAGES
// =============================================================================

/** Tracking state broadcast */
export interface TrackingBroadcast {
  type: 'tracking_update';
  /** All currently tracked persons with global IDs */
  trackedPersons: TrackedPerson[];
  /** Mapping: globalId → userId (for bound users) */
  userBindings: Record<string, string>;
  /** Mapping: globalId → characterId (for rendered avatars) */
  characterBindings: Record<string, string>;
  /** Server timestamp */
  timestamp: number;
  /** Server frame number */
  frameNumber: number;
}

/** Person identified event */
export interface PersonIdentified {
  type: 'person_identified';
  globalId: string;
  userId: string;
  characterId: string;
  confidence: number;
}

/** Person lost event */
export interface PersonLost {
  type: 'person_lost';
  globalId: string;
  lastPosition: Vector3;
  reason: 'left_scene' | 'occluded_timeout' | 'tracking_failure';
}

/** New person detected event */
export interface PersonDetectedEvent {
  type: 'person_detected';
  globalId: string;
  position: Vector3;
  isNewPerson: boolean;
}

export type ServerMessage = 
  | TrackingBroadcast 
  | PersonIdentified 
  | PersonLost 
  | PersonDetectedEvent;

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Tracking service configuration */
export interface TrackingConfig {
  /** Maximum number of tracked persons */
  maxTrackedPersons: number;
  /** Kalman filter process noise */
  processNoise: number;
  /** Kalman filter measurement noise */
  measurementNoise: number;
  /** Maximum distance for detection-track association (meters) */
  maxAssociationDistance: number;
  /** Appearance embedding weight in cost function [0-1] */
  appearanceWeight: number;
  /** Position distance weight in cost function [0-1] */
  positionWeight: number;
  /** Frames to confirm a tentative track */
  confirmationFrames: number;
  /** Frames before deleting an unmatched track */
  maxTimeSinceUpdate: number;
  /** Minimum detection confidence to create track */
  minDetectionConfidence: number;
  /** Enable face recognition (privacy implications) */
  enableFaceRecognition: boolean;
  /** Broadcast rate (Hz) */
  broadcastRate: number;
}

export const DEFAULT_TRACKING_CONFIG: TrackingConfig = {
  maxTrackedPersons: 20,
  processNoise: 0.1,
  measurementNoise: 0.3,
  maxAssociationDistance: 2.0,
  appearanceWeight: 0.4,
  positionWeight: 0.6,
  confirmationFrames: 3,
  maxTimeSinceUpdate: 30,
  minDetectionConfidence: 0.5,
  enableFaceRecognition: false,
  broadcastRate: 30,
};
