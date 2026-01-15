/**
 * @hololand/ar-anchors - Type Definitions
 * 
 * Coordinate system alignment for shared AR experiences.
 */

// =============================================================================
// SPATIAL PRIMITIVES
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

export interface Pose {
  position: Vector3;
  rotation: Quaternion;
}

export interface Transform {
  position: Vector3;
  rotation: Quaternion;
  scale: number;
}

// =============================================================================
// ANCHOR TYPES
// =============================================================================

export type AnchorType = 'qr' | 'apriltag' | 'vps' | 'gps' | 'image' | 'plane' | 'manual';

export interface AnchorBase {
  /** Unique anchor identifier */
  id: string;
  /** Anchor type */
  type: AnchorType;
  /** Pose in world coordinates */
  worldPose: Pose;
  /** Detection confidence [0-1] */
  confidence: number;
  /** Timestamp of last detection */
  lastSeen: number;
  /** Is anchor currently visible */
  isVisible: boolean;
  /** Physical size in meters (for scale estimation) */
  physicalSize?: { width: number; height: number };
}

export interface QRAnchor extends AnchorBase {
  type: 'qr';
  /** Decoded QR content */
  content: string;
  /** QR code version (1-40) */
  version: number;
  /** Error correction level */
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  /** Corner positions in image space */
  corners: [Vector2, Vector2, Vector2, Vector2];
}

export interface AprilTagAnchor extends AnchorBase {
  type: 'apriltag';
  /** Tag family (e.g., 'tag36h11') */
  family: string;
  /** Tag ID within family */
  tagId: number;
  /** Hamming distance (detection quality) */
  hammingDistance: number;
  /** Corner positions in image space */
  corners: [Vector2, Vector2, Vector2, Vector2];
}

export interface VPSAnchor extends AnchorBase {
  type: 'vps';
  /** VPS provider */
  provider: 'arcore' | 'niantic' | 'custom';
  /** Location identifier */
  locationId: string;
  /** Horizontal accuracy in meters */
  horizontalAccuracy: number;
  /** Vertical accuracy in meters */
  verticalAccuracy: number;
  /** Heading accuracy in degrees */
  headingAccuracy: number;
}

export interface GPSAnchor extends AnchorBase {
  type: 'gps';
  /** Latitude */
  latitude: number;
  /** Longitude */
  longitude: number;
  /** Altitude in meters */
  altitude: number;
  /** Horizontal accuracy in meters */
  horizontalAccuracy: number;
  /** Vertical accuracy in meters */
  verticalAccuracy: number;
}

export interface ImageAnchor extends AnchorBase {
  type: 'image';
  /** Reference image identifier */
  imageId: string;
  /** Matched image name */
  imageName: string;
  /** Match quality [0-1] */
  matchQuality: number;
}

export interface PlaneAnchor extends AnchorBase {
  type: 'plane';
  /** Plane classification */
  classification: 'floor' | 'wall' | 'ceiling' | 'table' | 'seat' | 'unknown';
  /** Plane extent in meters */
  extent: { width: number; height: number };
  /** Plane normal vector */
  normal: Vector3;
}

export interface ManualAnchor extends AnchorBase {
  type: 'manual';
  /** User-provided label */
  label: string;
}

export type Anchor = 
  | QRAnchor 
  | AprilTagAnchor 
  | VPSAnchor 
  | GPSAnchor 
  | ImageAnchor 
  | PlaneAnchor 
  | ManualAnchor;

// =============================================================================
// DETECTION RESULTS
// =============================================================================

export interface Vector2 {
  x: number;
  y: number;
}

export interface QRDetection {
  /** Decoded content */
  content: string;
  /** Corner positions in image coordinates */
  corners: [Vector2, Vector2, Vector2, Vector2];
  /** Detection confidence */
  confidence: number;
  /** QR version */
  version: number;
  /** Estimated 6DoF pose (if calibration available) */
  pose?: Pose;
}

export interface AprilTagDetection {
  /** Tag family */
  family: string;
  /** Tag ID */
  tagId: number;
  /** Corner positions in image coordinates */
  corners: [Vector2, Vector2, Vector2, Vector2];
  /** Center position */
  center: Vector2;
  /** Hamming distance (0 = perfect) */
  hammingDistance: number;
  /** Decision margin (higher = more confident) */
  decisionMargin: number;
  /** Estimated 6DoF pose (if calibration available) */
  pose?: Pose;
}

// =============================================================================
// CAMERA INTRINSICS
// =============================================================================

export interface CameraIntrinsics {
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** Focal length X */
  fx: number;
  /** Focal length Y */
  fy: number;
  /** Principal point X */
  cx: number;
  /** Principal point Y */
  cy: number;
  /** Distortion coefficients (k1, k2, p1, p2, k3) */
  distortion?: [number, number, number, number, number];
}

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface AnchorServiceConfig {
  /** Minimum confidence to accept anchor */
  minConfidence: number;
  /** Maximum age (ms) before anchor considered stale */
  maxAnchorAge: number;
  /** Enable multi-anchor fusion */
  enableFusion: boolean;
  /** Fusion strategy */
  fusionStrategy: 'newest' | 'highest_confidence' | 'weighted_average';
  /** Physical QR code size in meters (for pose estimation) */
  defaultQRSize: number;
  /** Physical AprilTag size in meters */
  defaultAprilTagSize: number;
  /** VPS provider configuration */
  vpsConfig?: {
    provider: 'arcore' | 'niantic';
    apiKey?: string;
  };
  /** Camera intrinsics for pose estimation */
  cameraIntrinsics?: CameraIntrinsics;
}

export const DEFAULT_ANCHOR_CONFIG: AnchorServiceConfig = {
  minConfidence: 0.7,
  maxAnchorAge: 5000,
  enableFusion: true,
  fusionStrategy: 'highest_confidence',
  defaultQRSize: 0.1,
  defaultAprilTagSize: 0.1,
};
