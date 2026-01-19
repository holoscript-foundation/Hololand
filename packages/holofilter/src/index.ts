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
  ScanMode,
  ScanQuality,
  ScanFrame,
  ScanSession,
  ScanMesh,
  ScanVertex,
  ScanFace,
  PointCloud,
  PointCloudPoint,
  ScanProgress,
  ScanResult,
  ScanExportFormat,
  HoloScriptExportOptions,
  OBJExportOptions,
  PLYExportOptions,
  // AR Types
  ARFilter,
  ARFilterAsset,
  ARAttachment,
  ARFilterAnimation,
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
