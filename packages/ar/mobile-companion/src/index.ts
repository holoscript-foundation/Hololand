/**
 * @hololand/ar-mobile-companion
 *
 * Mobile AR Companion for HoloLand.
 * Flutter + native ARKit/ARCore integration with spatial mesh scanning
 * pipeline and IoT entity binding.
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  Flutter App (Dart)                                             │
 * │    ├── AR Session Management                                    │
 * │    ├── Mesh Scan UI & Controls                                  │
 * │    └── IoT Device Dashboard                                     │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  Platform Channel Bridge                                        │
 * │    ├── io.hololand.ar/session   (AR lifecycle)                  │
 * │    ├── io.hololand.ar/mesh      (mesh scanning)                 │
 * │    ├── io.hololand.ar/anchors   (spatial anchors)               │
 * │    └── io.hololand.ar/iot       (IoT discovery & binding)       │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  Native Layer                                                    │
 * │    ├── iOS: ARKit 7 + LiDAR + Scene Geometry                    │
 * │    └── Android: ARCore 8 + Depth API + Geospatial               │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  TypeScript Types (@hololand/ar-mobile-companion)               │
 * │    ├── Core types (AR session, frame, anchors)                  │
 * │    ├── Mesh pipeline (capture, process, optimize, sync)         │
 * │    └── IoT schema (device, capabilities, bindings)              │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Integration with existing @hololand/ar-* packages:
 *   - @hololand/ar-anchors: Anchor types, coordinate transforms
 *   - @hololand/ar-detection: Depth processing, pose detection
 *   - @hololand/ar-tracking: Multi-target tracking
 *   - @hololand/ar-foundation: AR runtime, HoloScript bridge
 */

// =============================================================================
// CORE TYPES
// =============================================================================

export type {
  // AR Session
  TrackingMode,
  TrackingState,
  TrackingLimitedReason,
  ARSessionConfig,
  MeshResolution,
  DepthMode,

  // AR Frame
  ARFrameData,
  Pose6DoF,
  CameraIntrinsicsCompact,
  LightEstimate,

  // AR Plane
  PlaneClassification,
  PlaneAlignment,
  ARPlane,

  // Spatial Anchor
  SpatialAnchorType,
  AnchorTrackingState,
  SpatialAnchor,

  // Bounding Box
  AABB,

  // Errors
  ARErrorCode,
  ARError,

  // Platform Channel
  PlatformChannelRequest,
  PlatformChannelResponse,
  PlatformChannelEvent,
} from './types';

export { DEFAULT_AR_SESSION_CONFIG } from './types';

// =============================================================================
// MESH PIPELINE TYPES
// =============================================================================

export type {
  // Stage 1: Capture
  MeshCaptureFrame,
  MeshCaptureSource,

  // Stage 2: Process
  MeshProcessConfig,
  MeshProcessResult,
  MeshProcessStats,

  // Stage 3: Optimize
  LODLevel,
  MeshOptimizeConfig,
  MeshCompressionFormat,
  LODMesh,
  MeshOptimizeResult,
  MeshOptimizeStats,

  // Stage 4: Sync
  MeshChunkId,
  MeshChunk,
  MeshChunkDelta,
  MeshSyncConfig,
  MeshSyncStatus,

  // Stage 5: Persist
  MeshStorageEntry,
  MeshStorageConfig,

  // Stage 6: Render
  MeshRenderState,
  MeshRenderConfig,

  // Session
  MeshScanConfig,
  MeshScanProgressEvent,
  MeshScanResult,

  // Export
  MeshExportFormat,
  MeshExportOptions,
} from './mesh/types';

export {
  MeshClassificationLabel,
  DEFAULT_MESH_PROCESS_CONFIG,
  DEFAULT_LOD_LEVELS,
  DEFAULT_MESH_OPTIMIZE_CONFIG,
  DEFAULT_MESH_SYNC_CONFIG,
  DEFAULT_MESH_STORAGE_CONFIG,
  DEFAULT_MESH_RENDER_CONFIG,
} from './mesh/types';

// =============================================================================
// IOT ENTITY BINDING TYPES
// =============================================================================

export type {
  // Protocol
  IoTProtocol,
  IoTConnectionParams,

  // Device
  IoTDeviceCategory,
  IoTDeviceConnectionState,
  IoTDevice,

  // Capabilities
  IoTCapabilityType,
  IoTDataType,
  IoTUnit,
  IoTDataSchema,
  IoTCapability,
  IoTAccessLevel,

  // State
  IoTDeviceState,
  IoTPropertyValue,

  // Commands
  IoTCommand,
  IoTCommandSource,
  IoTCommandResponse,

  // Binding (core schema)
  IoTBindingStatus,
  IoTEntityBinding,
  IoTDeviceReference,
  IoTSpatialAnchorReference,
  IoTInteractionZone,
  IoTInteractionAction,
  IoTEntityVisualization,
  IoTStateAnimation,
  IoTStateChannel,
  IoTAutomationRule,
  IoTAutomationTrigger,
  IoTAutomationCondition,
  IoTBindingPermissions,

  // Events
  IoTBindingEventType,
  IoTBindingEvent,

  // Discovery
  IoTDiscoveryConfig,
  IoTDiscoveryResult,
} from './iot/types';

export {
  DEFAULT_IOT_BINDING_PERMISSIONS,
  DEFAULT_IOT_VISUALIZATION,
  DEFAULT_IOT_STATE_CHANNEL,
  DEFAULT_IOT_DISCOVERY_CONFIG,
  IOT_BINDING_JSONLD_CONTEXT,
} from './iot/types';
