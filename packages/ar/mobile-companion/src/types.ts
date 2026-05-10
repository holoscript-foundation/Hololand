/**
 * @hololand/ar-mobile-companion - Core Type Definitions
 *
 * Cross-platform types for the Mobile AR Companion.
 * Reuses spatial primitives from @hololand/ar-anchors and @hololand/ar-detection.
 */

// Re-export shared spatial primitives for convenience
export type { Vector3, Quaternion, Pose } from '@hololand/ar-anchors';
export type { DepthFrame, CameraIntrinsics } from '@hololand/ar-detection';

// =============================================================================
// AR SESSION
// =============================================================================

export type TrackingMode =
  | 'worldTracking'       // Full 6DoF with plane detection
  | 'geoTracking'         // Geospatial (outdoor)
  | 'imageTracking'       // Image marker tracking only
  | 'faceTracking';       // Front camera face tracking

export type TrackingState =
  | 'notAvailable'        // AR not supported on device
  | 'limited'             // Tracking degraded (insufficient features, motion)
  | 'normal';             // Full tracking quality

export type TrackingLimitedReason =
  | 'initializing'        // Session just started
  | 'excessiveMotion'     // Device moving too fast
  | 'insufficientFeatures'// Not enough visual features
  | 'relocalizing';       // Recovering from interruption

export interface ARSessionConfig {
  /** Primary tracking mode */
  trackingMode: TrackingMode;
  /** Enable mesh scanning */
  meshEnabled: boolean;
  /** Mesh resolution level */
  meshResolution: MeshResolution;
  /** Enable horizontal plane detection */
  horizontalPlaneDetection: boolean;
  /** Enable vertical plane detection */
  verticalPlaneDetection: boolean;
  /** Enable environment texturing for reflections */
  environmentTexturing: boolean;
  /** Enable scene reconstruction with classification (iOS LiDAR) */
  sceneReconstruction: boolean;
  /** Depth sensing mode */
  depthMode: DepthMode;
  /** Enable cloud anchor hosting/resolving */
  cloudAnchorsEnabled: boolean;
  /** Enable geospatial API (outdoor positioning) */
  geospatialEnabled: boolean;
  /** Target frame rate (30 or 60) */
  targetFrameRate: 30 | 60;
  /** Enable auto-focus */
  autoFocus: boolean;
  /** Light estimation mode */
  lightEstimation: 'disabled' | 'ambientIntensity' | 'environmentalHDR';
}

export type MeshResolution = 'low' | 'medium' | 'high' | 'ultra';

export type DepthMode =
  | 'disabled'
  | 'automatic'     // Platform decides best method
  | 'lidar'         // iOS LiDAR sensor
  | 'stereo'        // Stereo camera depth estimation
  | 'monocular';    // ML-based monocular depth

export const DEFAULT_AR_SESSION_CONFIG: ARSessionConfig = {
  trackingMode: 'worldTracking',
  meshEnabled: true,
  meshResolution: 'medium',
  horizontalPlaneDetection: true,
  verticalPlaneDetection: true,
  environmentTexturing: true,
  sceneReconstruction: false,
  depthMode: 'automatic',
  cloudAnchorsEnabled: false,
  geospatialEnabled: false,
  targetFrameRate: 60,
  autoFocus: true,
  lightEstimation: 'ambientIntensity',
};

// =============================================================================
// AR FRAME
// =============================================================================

export interface ARFrameData {
  /** Frame sequence number */
  frameId: number;
  /** Timestamp in milliseconds */
  timestamp: number;
  /** Camera pose in world coordinates (6DoF) */
  cameraPose: Pose6DoF;
  /** Camera intrinsic parameters */
  cameraIntrinsics: CameraIntrinsicsCompact;
  /** Current tracking state */
  trackingState: TrackingState;
  /** Tracking limited reason (if state is 'limited') */
  limitedReason?: TrackingLimitedReason;
  /** Light estimation data */
  lightEstimate?: LightEstimate;
  /** Detected planes this frame */
  detectedPlanes?: ARPlane[];
  /** Whether depth data is available this frame */
  hasDepth: boolean;
  /** Image resolution */
  imageResolution: { width: number; height: number };
}

export interface Pose6DoF {
  /** Position in world coordinates (meters) */
  position: { x: number; y: number; z: number };
  /** Orientation as quaternion */
  rotation: { x: number; y: number; z: number; w: number };
  /** 4x4 transform matrix (column-major) */
  transform: number[];
}

export interface CameraIntrinsicsCompact {
  /** Focal length X (pixels) */
  fx: number;
  /** Focal length Y (pixels) */
  fy: number;
  /** Principal point X (pixels) */
  cx: number;
  /** Principal point Y (pixels) */
  cy: number;
}

export interface LightEstimate {
  /** Ambient light intensity (lux) */
  ambientIntensity: number;
  /** Ambient color temperature (Kelvin) */
  ambientColorTemperature: number;
  /** Primary light direction (for shadow casting) */
  primaryLightDirection?: { x: number; y: number; z: number };
  /** Whether the platform reports environmental HDR light estimation */
  hdrCapable?: boolean;
  /** Primary light intensity (lux) */
  primaryLightIntensity?: number;
  /** Spherical harmonics coefficients (9 for L2 SH) */
  sphericalHarmonics?: number[];
}

// =============================================================================
// AR PLANE
// =============================================================================

export type PlaneClassification =
  | 'floor'
  | 'wall'
  | 'ceiling'
  | 'table'
  | 'seat'
  | 'door'
  | 'window'
  | 'unknown';

export type PlaneAlignment = 'horizontal' | 'vertical' | 'arbitrary';

export interface ARPlane {
  /** Unique plane identifier */
  id: string;
  /** Plane center pose in world coordinates */
  centerPose: Pose6DoF;
  /** Plane extent in meters (width, height along plane axes) */
  extent: { width: number; height: number };
  /** Plane classification */
  classification: PlaneClassification;
  /** Plane alignment */
  alignment: PlaneAlignment;
  /** Convex hull boundary points (in plane-local coordinates) */
  boundary?: Array<{ x: number; z: number }>;
  /** Whether this plane was merged from multiple detections */
  isMerged: boolean;
}

// =============================================================================
// SPATIAL ANCHOR
// =============================================================================

export type SpatialAnchorType =
  | 'local'         // Device-local anchor
  | 'cloud'         // Cloud-persisted anchor
  | 'geospatial';   // GPS-based anchor

export type AnchorTrackingState =
  | 'tracking'      // Anchor is being tracked
  | 'paused'        // Anchor tracking paused
  | 'stopped';      // Anchor no longer tracked

export interface SpatialAnchor {
  /** Unique local identifier */
  id: string;
  /** Cloud anchor identifier (if hosted) */
  cloudId?: string;
  /** Anchor type */
  type: SpatialAnchorType;
  /** Current pose in world coordinates */
  pose: Pose6DoF;
  /** Tracking state */
  trackingState: AnchorTrackingState;
  /** Creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
  /** User-assigned name */
  name?: string;
  /** User-assigned metadata */
  metadata?: Record<string, unknown>;
  /** Associated plane (if anchor was placed on a plane) */
  planeId?: string;
  /** Geospatial coordinates (if geospatial anchor) */
  geospatial?: {
    latitude: number;
    longitude: number;
    altitude: number;
    heading: number;
  };
}

// =============================================================================
// AXIS-ALIGNED BOUNDING BOX
// =============================================================================

export interface AABB {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

// =============================================================================
// AR ERRORS
// =============================================================================

export type ARErrorCode =
  | 'CAMERA_PERMISSION_DENIED'
  | 'AR_NOT_SUPPORTED'
  | 'SESSION_FAILED'
  | 'TRACKING_FAILED'
  | 'MESH_SCAN_FAILED'
  | 'ANCHOR_FAILED'
  | 'CLOUD_ANCHOR_FAILED'
  | 'IOT_SCAN_FAILED'
  | 'IOT_BINDING_FAILED'
  | 'UNKNOWN';

export interface ARError {
  code: ARErrorCode;
  message: string;
  nativeCode?: string;
  recoverable: boolean;
}

// =============================================================================
// PLATFORM CHANNEL MESSAGE TYPES
// =============================================================================

/**
 * Messages sent from Flutter to native platform
 */
export interface PlatformChannelRequest {
  /** Method name */
  method: string;
  /** Arguments (JSON-serializable) */
  arguments: Record<string, unknown>;
  /** Request ID for response correlation */
  requestId: string;
}

/**
 * Messages sent from native platform to Flutter
 */
export interface PlatformChannelResponse {
  /** Request ID for correlation */
  requestId: string;
  /** Success result (null if error) */
  result?: unknown;
  /** Error (null if success) */
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Event stream messages from native to Flutter
 */
export interface PlatformChannelEvent {
  /** Event type */
  eventType: string;
  /** Event payload */
  data: unknown;
  /** Timestamp */
  timestamp: number;
}
