/**
 * @hololand/holofilter - Types
 *
 * Unified types for VRR (Video Reality Recording) scanning
 * and AR (Augmented Reality) overlays.
 */

// =============================================================================
// COMMON TYPES
// =============================================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Vector2 {
  x: number;
  y: number;
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
  scale: Vector3;
}

export interface BoundingBox {
  min: Vector3;
  max: Vector3;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}

// =============================================================================
// VRR (VIDEO REALITY RECORDING) TYPES
// =============================================================================

/** Scan quality levels */
export type ScanQuality = 'preview' | 'standard' | 'high' | 'ultra';

/** Scan capture modes */
export type CaptureMode =
  | 'single'      // Single photo capture
  | 'burst'       // Rapid multi-angle capture
  | 'video'       // Video walkthrough
  | 'lidar'       // LiDAR point cloud
  | 'photogrammetry'; // Full photogrammetry reconstruction

/** Raw scan frame from camera/sensor */
export interface ScanFrame {
  id: string;
  timestamp: number;
  /** RGB image data (width * height * 4 RGBA) */
  imageData: Uint8Array;
  width: number;
  height: number;
  /** Depth data in meters (optional, from LiDAR/ToF) */
  depthData?: Float32Array;
  depthWidth?: number;
  depthHeight?: number;
  /** Camera pose when frame was captured */
  cameraPose?: Transform;
  /** Camera intrinsics */
  intrinsics?: CameraIntrinsics;
}

export interface CameraIntrinsics {
  fx: number; // Focal length X
  fy: number; // Focal length Y
  cx: number; // Principal point X
  cy: number; // Principal point Y
  width: number;
  height: number;
}

/** Point in a point cloud */
export interface Point3D {
  position: Vector3;
  color?: Color;
  normal?: Vector3;
  confidence?: number;
}

/** Point cloud from scan */
export interface PointCloud {
  points: Point3D[];
  bounds: BoundingBox;
  density: number; // Points per cubic meter
}

/** Triangle mesh vertex */
export interface MeshVertex {
  position: Vector3;
  normal: Vector3;
  uv: Vector2;
  color?: Color;
}

/** Reconstructed 3D mesh */
export interface ScanMesh {
  vertices: MeshVertex[];
  indices: number[]; // Triangle indices
  bounds: BoundingBox;
  /** Texture atlas (if generated) */
  textureData?: Uint8Array;
  textureWidth?: number;
  textureHeight?: number;
}

/** Scan session state */
export interface ScanSession {
  id: string;
  name: string;
  mode: CaptureMode;
  quality: ScanQuality;
  startTime: number;
  frames: ScanFrame[];
  pointCloud?: PointCloud;
  mesh?: ScanMesh;
  status: 'capturing' | 'processing' | 'complete' | 'error';
  progress: number; // 0-1
  error?: string;
}

/** Scan result */
export interface ScanResult {
  success: boolean;
  session: ScanSession;
  mesh?: ScanMesh;
  pointCloud?: PointCloud;
  /** Exported formats */
  exports?: {
    glb?: ArrayBuffer;
    obj?: string;
    ply?: string;
    holoScript?: string; // HoloScript orb definition
  };
}

// =============================================================================
// AR (AUGMENTED REALITY) TYPES
// =============================================================================

/** AR filter categories */
export type FilterCategory =
  | 'face'        // Face filters (masks, makeup, effects)
  | 'body'        // Body filters (clothes, poses)
  | 'environment' // Environment filters (sky, lighting)
  | 'object'      // Object augmentation
  | 'portal'      // AR portals
  | 'hologram';   // 3D hologram overlays

/** Face landmark indices */
export type FaceLandmark =
  | 'leftEye'
  | 'rightEye'
  | 'nose'
  | 'mouth'
  | 'leftEar'
  | 'rightEar'
  | 'chin'
  | 'forehead'
  | 'leftCheek'
  | 'rightCheek';

/** Detected face data */
export interface FaceDetection {
  id: string;
  bounds: { x: number; y: number; width: number; height: number };
  landmarks: Map<FaceLandmark, Vector2>;
  /** 3D face mesh (468 points for MediaPipe) */
  mesh?: Vector3[];
  /** Face rotation */
  rotation?: Quaternion;
  /** Expression blend shapes */
  expressions?: Map<string, number>;
  confidence: number;
}

/** AR filter definition */
export interface ARFilter {
  id: string;
  name: string;
  category: FilterCategory;
  /** Filter assets (textures, models) */
  assets: ARFilterAsset[];
  /** Attachment points */
  attachments: ARAttachment[];
  /** Animation config */
  animation?: ARFilterAnimation;
  /** HoloScript code for dynamic behavior */
  holoScript?: string;
}

export interface ARFilterAsset {
  id: string;
  type: 'texture' | 'model' | 'shader' | 'audio';
  url: string;
  /** Loaded data */
  data?: ArrayBuffer;
}

export interface ARAttachment {
  assetId: string;
  /** What to attach to */
  target: FaceLandmark | 'head' | 'body' | 'hand' | 'surface' | 'world';
  /** Offset from target */
  offset: Transform;
  /** Scale factor */
  scale: number;
  /** Follow target movement */
  tracking: boolean;
}

export interface ARFilterAnimation {
  type: 'loop' | 'trigger' | 'expression';
  /** Trigger expression (e.g., 'smile', 'blink') */
  trigger?: string;
  duration?: number;
  keyframes?: ARKeyframe[];
}

export interface ARKeyframe {
  time: number; // 0-1 normalized
  transform?: Partial<Transform>;
  opacity?: number;
  scale?: number;
}

/** AR overlay state */
export interface AROverlayState {
  activeFilters: Map<string, ARFilter>;
  detectedFaces: FaceDetection[];
  surfaceAnchors: SurfaceAnchor[];
  worldAnchors: WorldAnchor[];
  isTracking: boolean;
  fps: number;
}

export interface SurfaceAnchor {
  id: string;
  type: 'horizontal' | 'vertical';
  position: Vector3;
  rotation: Quaternion;
  size: Vector2;
  confidence: number;
}

export interface WorldAnchor {
  id: string;
  position: Vector3;
  rotation: Quaternion;
  persistent: boolean;
  /** Cloud anchor ID for cross-device */
  cloudId?: string;
}

// =============================================================================
// HOLOFILTER CONFIG TYPES
// =============================================================================

export interface HoloFilterConfig {
  /** Enable VRR scanning */
  enableVRR: boolean;
  /** Enable AR overlays */
  enableAR: boolean;
  /** Default scan quality */
  defaultScanQuality: ScanQuality;
  /** Max concurrent face detections */
  maxFaces: number;
  /** Enable depth sensing */
  useDepth: boolean;
  /** Enable cloud anchors */
  useCloudAnchors: boolean;
  /** Debug visualization */
  debug: boolean;
}

export const DEFAULT_HOLOFILTER_CONFIG: HoloFilterConfig = {
  enableVRR: true,
  enableAR: true,
  defaultScanQuality: 'standard',
  maxFaces: 4,
  useDepth: true,
  useCloudAnchors: false,
  debug: false,
};
