/**
 * @hololand/ar-detection - Type Definitions
 * 
 * Pose detection types for AR applications.
 */

// =============================================================================
// SPATIAL PRIMITIVES
// =============================================================================

export interface Vector2 {
  x: number;
  y: number;
}

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

export interface BoundingBox {
  x: number;      // Top-left X
  y: number;      // Top-left Y
  width: number;
  height: number;
}

// =============================================================================
// KEYPOINT DEFINITIONS
// =============================================================================

/**
 * BlazePose/COCO keypoint indices
 */
export enum KeypointIndex {
  // Head
  NOSE = 0,
  LEFT_EYE_INNER = 1,
  LEFT_EYE = 2,
  LEFT_EYE_OUTER = 3,
  RIGHT_EYE_INNER = 4,
  RIGHT_EYE = 5,
  RIGHT_EYE_OUTER = 6,
  LEFT_EAR = 7,
  RIGHT_EAR = 8,
  MOUTH_LEFT = 9,
  MOUTH_RIGHT = 10,
  
  // Upper body
  LEFT_SHOULDER = 11,
  RIGHT_SHOULDER = 12,
  LEFT_ELBOW = 13,
  RIGHT_ELBOW = 14,
  LEFT_WRIST = 15,
  RIGHT_WRIST = 16,
  
  // Hands (BlazePose full)
  LEFT_PINKY = 17,
  RIGHT_PINKY = 18,
  LEFT_INDEX = 19,
  RIGHT_INDEX = 20,
  LEFT_THUMB = 21,
  RIGHT_THUMB = 22,
  
  // Lower body
  LEFT_HIP = 23,
  RIGHT_HIP = 24,
  LEFT_KNEE = 25,
  RIGHT_KNEE = 26,
  LEFT_ANKLE = 27,
  RIGHT_ANKLE = 28,
  LEFT_HEEL = 29,
  RIGHT_HEEL = 30,
  LEFT_FOOT_INDEX = 31,
  RIGHT_FOOT_INDEX = 32,
}

/**
 * COCO keypoint indices (17 keypoints)
 */
export enum COCOKeypointIndex {
  NOSE = 0,
  LEFT_EYE = 1,
  RIGHT_EYE = 2,
  LEFT_EAR = 3,
  RIGHT_EAR = 4,
  LEFT_SHOULDER = 5,
  RIGHT_SHOULDER = 6,
  LEFT_ELBOW = 7,
  RIGHT_ELBOW = 8,
  LEFT_WRIST = 9,
  RIGHT_WRIST = 10,
  LEFT_HIP = 11,
  RIGHT_HIP = 12,
  LEFT_KNEE = 13,
  RIGHT_KNEE = 14,
  LEFT_ANKLE = 15,
  RIGHT_ANKLE = 16,
}

export const KEYPOINT_NAMES: Record<number, string> = {
  [KeypointIndex.NOSE]: 'nose',
  [KeypointIndex.LEFT_EYE_INNER]: 'left_eye_inner',
  [KeypointIndex.LEFT_EYE]: 'left_eye',
  [KeypointIndex.LEFT_EYE_OUTER]: 'left_eye_outer',
  [KeypointIndex.RIGHT_EYE_INNER]: 'right_eye_inner',
  [KeypointIndex.RIGHT_EYE]: 'right_eye',
  [KeypointIndex.RIGHT_EYE_OUTER]: 'right_eye_outer',
  [KeypointIndex.LEFT_EAR]: 'left_ear',
  [KeypointIndex.RIGHT_EAR]: 'right_ear',
  [KeypointIndex.MOUTH_LEFT]: 'mouth_left',
  [KeypointIndex.MOUTH_RIGHT]: 'mouth_right',
  [KeypointIndex.LEFT_SHOULDER]: 'left_shoulder',
  [KeypointIndex.RIGHT_SHOULDER]: 'right_shoulder',
  [KeypointIndex.LEFT_ELBOW]: 'left_elbow',
  [KeypointIndex.RIGHT_ELBOW]: 'right_elbow',
  [KeypointIndex.LEFT_WRIST]: 'left_wrist',
  [KeypointIndex.RIGHT_WRIST]: 'right_wrist',
  [KeypointIndex.LEFT_PINKY]: 'left_pinky',
  [KeypointIndex.RIGHT_PINKY]: 'right_pinky',
  [KeypointIndex.LEFT_INDEX]: 'left_index',
  [KeypointIndex.RIGHT_INDEX]: 'right_index',
  [KeypointIndex.LEFT_THUMB]: 'left_thumb',
  [KeypointIndex.RIGHT_THUMB]: 'right_thumb',
  [KeypointIndex.LEFT_HIP]: 'left_hip',
  [KeypointIndex.RIGHT_HIP]: 'right_hip',
  [KeypointIndex.LEFT_KNEE]: 'left_knee',
  [KeypointIndex.RIGHT_KNEE]: 'right_knee',
  [KeypointIndex.LEFT_ANKLE]: 'left_ankle',
  [KeypointIndex.RIGHT_ANKLE]: 'right_ankle',
  [KeypointIndex.LEFT_HEEL]: 'left_heel',
  [KeypointIndex.RIGHT_HEEL]: 'right_heel',
  [KeypointIndex.LEFT_FOOT_INDEX]: 'left_foot_index',
  [KeypointIndex.RIGHT_FOOT_INDEX]: 'right_foot_index',
};

// =============================================================================
// KEYPOINT & SKELETON TYPES
// =============================================================================

export interface Keypoint2D {
  /** Keypoint index */
  index: number;
  /** Keypoint name */
  name: string;
  /** X position in image coordinates */
  x: number;
  /** Y position in image coordinates */
  y: number;
  /** Detection confidence [0-1] */
  confidence: number;
}

export interface Keypoint3D extends Keypoint2D {
  /** Z position (depth) in meters or relative units */
  z: number;
  /** Whether Z is in world meters or relative units */
  zType: 'meters' | 'relative';
}

export interface Skeleton2D {
  /** All detected keypoints */
  keypoints: Keypoint2D[];
  /** Bounding box around the person */
  boundingBox: BoundingBox;
  /** Overall detection confidence */
  confidence: number;
  /** Timestamp of detection */
  timestamp: number;
}

export interface Skeleton3D {
  /** All detected keypoints with 3D positions */
  keypoints: Keypoint3D[];
  /** Bounding box in image space */
  boundingBox: BoundingBox;
  /** Overall detection confidence */
  confidence: number;
  /** Timestamp of detection */
  timestamp: number;
  /** World-space root position (hip center) */
  rootPosition?: Vector3;
  /** Body orientation quaternion */
  orientation?: Quaternion;
}

// =============================================================================
// DETECTION RESULTS
// =============================================================================

export interface PersonDetection {
  /** Detection ID (unique per frame) */
  id: number;
  /** 2D skeleton */
  skeleton2D: Skeleton2D;
  /** 3D skeleton (if depth available) */
  skeleton3D?: Skeleton3D;
  /** Image crop for ReID embedding */
  crop?: ImageData;
  /** Segmentation mask (if available) */
  mask?: Uint8Array;
  /** Mask dimensions */
  maskSize?: { width: number; height: number };
}

export interface DetectionResult {
  /** All detected persons */
  persons: PersonDetection[];
  /** Frame timestamp */
  timestamp: number;
  /** Processing time in ms */
  processingTime: number;
  /** Source image dimensions */
  imageSize: { width: number; height: number };
}

// =============================================================================
// CAMERA & DEPTH
// =============================================================================

export interface CameraIntrinsics {
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** Focal length X (in pixels) */
  fx: number;
  /** Focal length Y (in pixels) */
  fy: number;
  /** Principal point X */
  cx: number;
  /** Principal point Y */
  cy: number;
  /** Distortion coefficients */
  distortion?: [number, number, number, number, number];
}

export interface DepthFrame {
  /** Depth data (meters per pixel) */
  data: Float32Array;
  /** Depth image width */
  width: number;
  /** Depth image height */
  height: number;
  /** Minimum valid depth (meters) */
  minDepth: number;
  /** Maximum valid depth (meters) */
  maxDepth: number;
  /** Depth sensor intrinsics (may differ from RGB) */
  intrinsics?: CameraIntrinsics;
  /** Timestamp */
  timestamp: number;
}

// =============================================================================
// DETECTOR CONFIGURATION
// =============================================================================

export type DetectorBackend = 'webgl' | 'wasm' | 'cpu' | 'webgpu';
export type DetectorModel = 'blazepose' | 'movenet' | 'posenet' | 'mediapipe';

export interface DetectorConfig {
  /** Detection model */
  model: DetectorModel;
  /** Model variant (e.g., 'lite', 'full', 'heavy') */
  variant?: string;
  /** Backend for inference */
  backend: DetectorBackend;
  /** Maximum number of persons to detect */
  maxPoses: number;
  /** Minimum detection confidence */
  minConfidence: number;
  /** Enable 3D pose estimation */
  enable3D: boolean;
  /** Camera intrinsics for 3D projection */
  cameraIntrinsics?: CameraIntrinsics;
  /** Enable segmentation mask */
  enableSegmentation: boolean;
  /** Enable person crop extraction */
  extractCrops: boolean;
  /** Flip image horizontally (for front camera) */
  flipHorizontal: boolean;
}

export const DEFAULT_DETECTOR_CONFIG: DetectorConfig = {
  model: 'blazepose',
  variant: 'lite',
  backend: 'webgl',
  maxPoses: 6,
  minConfidence: 0.3,
  enable3D: true,
  enableSegmentation: false,
  extractCrops: true,
  flipHorizontal: false,
};
