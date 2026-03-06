/**
 * @hololand/ar-akida-bridge
 *
 * BrainChip Akida AKD1500 neuromorphic processor integration for
 * edge AR spatial perception. Provides:
 *
 *   - AkidaBridge: WebSocket client for Akida edge device communication
 *   - PointCloudProtocol: Binary serialization for LiDAR point cloud streaming
 *   - ClassificationIngestion: Spatial state management from PointNet++ results
 *   - FallbackProcessor: CPU/WebGPU fallback when hardware is unavailable
 *   - PowerMonitor: Power and latency monitoring dashboard integration
 */

// Types
export type {
  // Spatial primitives
  Vector3,
  Quaternion,
  BoundingBox3D,

  // Point cloud
  Point3D,
  PointCloudFrame,

  // Classification
  PointClassification,
  ClassifiedSegment,
  ClassificationResult,

  // Spatial state
  SpatialEntity,
  SpatialStateEvents,

  // Akida bridge
  AkidaBridgeConfig,
  AkidaBridgeEvents,
  AkidaClientMessage,
  AkidaDeviceMessage,
  AkidaDeviceInfo,
  AkidaConnectionState,
  StreamConfig,
  ModelConfig,

  // Power monitoring
  PowerMetrics,
  DashboardSnapshot,

  // Fallback
  FallbackConfig,
  FallbackBackend,
} from './types';

// Enums and constants
export {
  SemanticClass,
  SEMANTIC_CLASS_NAMES,
  BINARY_HEADER_SIZE,
  BINARY_POINT_SIZE,
  BINARY_MAGIC,
  BINARY_VERSION,
  DEFAULT_AKIDA_CONFIG,
  DEFAULT_FALLBACK_CONFIG,
} from './types';

// Core bridge
export { AkidaBridge } from './AkidaBridge';

// Protocol
export {
  serializePointCloud,
  deserializePointCloud,
  voxelGridDownsample,
  rangeFilter,
  estimateFrameSize,
} from './PointCloudProtocol';

// Classification ingestion
export {
  ClassificationIngestion,
  DEFAULT_INGESTION_CONFIG,
} from './ClassificationIngestion';
export type { IngestionConfig } from './ClassificationIngestion';

// Fallback processor
export { FallbackProcessor } from './FallbackProcessor';

// Power monitoring
export {
  PowerMonitor,
  DEFAULT_POWER_MONITOR_CONFIG,
} from './PowerMonitor';
export type { PowerMonitorConfig } from './PowerMonitor';
