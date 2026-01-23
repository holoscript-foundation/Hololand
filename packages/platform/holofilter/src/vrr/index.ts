/**
 * VRR Module - Virtual Reality Reality
 *
 * 3D scanning and reconstruction using:
 * - Photogrammetry from multi-angle captures
 * - Depth sensor integration (LiDAR, depth cameras)
 * - Point cloud generation
 * - Mesh reconstruction
 *
 * @packageDocumentation
 */

export { ObjectScanner, createObjectScanner } from './ObjectScanner';
export type { ObjectScannerConfig } from './ObjectScanner';

export type {
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
} from '../types';
