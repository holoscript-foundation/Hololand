/**
 * HoloFilter - VRR Scanning & AR Overlay System
 *
 * Unified package for:
 * - VRR (Virtual Reality Reality): 3D object scanning and reconstruction
 * - AR (Augmented Reality): Face filters, overlays, and effects
 *
 * @packageDocumentation
 */

// Types
export type {
  // VRR Types
  ScanQuality,
  CaptureMode,
  ScanFrame,
  ScanSession,
  ScanMesh,
  MeshVertex,
  PointCloud,
  Point3D,
  ScanResult,
  CameraIntrinsics,
  // AR Types
  ARFilter,
  ARFilterAsset,
  ARAttachment,
  ARFilterAnimation,
  ARKeyframe,
  AROverlayState,
  FaceDetection,
  FaceLandmark,
  SurfaceAnchor,
  WorldAnchor,
  FilterCategory,
  // Common Types
  Vector2,
  Vector3,
  Quaternion,
  Transform,
  BoundingBox,
  Color,
  HoloFilterConfig,
} from './types';

// VRR - Object Scanning
export { ObjectScanner, createObjectScanner } from './vrr/ObjectScanner';
export type { ObjectScannerConfig } from './vrr/ObjectScanner';

// AR - Filter Manager
export { ARFilterManager, createARFilterManager, createPresetFilters } from './ar/ARFilterManager';
export type { ARFilterManagerConfig, AttachmentResult } from './ar/ARFilterManager';

// Main unified interface
export { HoloFilter, createHoloFilter } from './HoloFilter';
export type { HoloFilterInstance } from './HoloFilter';
