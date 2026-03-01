/**
 * Flutter Bridge Protocol
 *
 * Defines the message protocol between Flutter (Dart) and TypeScript.
 * This serves as the contract that both sides must implement.
 *
 * Communication flow:
 *   Flutter <-> Platform Channel <-> Native (Swift/Kotlin) <-> TypeScript processing
 *
 * The TypeScript side handles:
 *   - Mesh processing, optimization, and sync logic
 *   - IoT binding management and state
 *   - Integration with @hololand/ar-* packages
 *   - Backend API communication
 *
 * The Flutter/Native side handles:
 *   - AR session lifecycle (ARKit/ARCore)
 *   - Camera frame capture
 *   - Depth data acquisition
 *   - Native mesh generation (LiDAR/TSDF)
 *   - IoT device discovery (BLE/WiFi scanning)
 *   - UI rendering
 */

import type { ARSessionConfig, ARFrameData, SpatialAnchor, Pose6DoF, ARError } from '../types';
import type {
  MeshCaptureFrame,
  MeshScanConfig,
  MeshScanProgressEvent,
  MeshScanResult,
  MeshChunkDelta,
  MeshExportFormat,
  MeshExportOptions,
} from '../mesh/types';
import type {
  IoTEntityBinding,
  IoTDevice,
  IoTCommand,
  IoTCommandResponse,
  IoTDeviceState,
  IoTDiscoveryConfig,
  IoTDiscoveryResult,
  IoTBindingEvent,
} from '../iot/types';

// =============================================================================
// PLATFORM CHANNEL NAMES
// =============================================================================

/**
 * Platform channel identifiers.
 * These must match exactly in Dart, Swift, and Kotlin.
 */
export const PLATFORM_CHANNELS = {
  /** AR session lifecycle */
  SESSION: 'io.hololand.ar/session',
  /** AR session events */
  SESSION_EVENTS: 'io.hololand.ar/session_events',
  /** Mesh scanning control */
  MESH: 'io.hololand.ar/mesh',
  /** Mesh scanning events */
  MESH_EVENTS: 'io.hololand.ar/mesh_events',
  /** Spatial anchor management */
  ANCHORS: 'io.hololand.ar/anchors',
  /** Spatial anchor events */
  ANCHOR_EVENTS: 'io.hololand.ar/anchor_events',
  /** IoT device management */
  IOT: 'io.hololand.ar/iot',
  /** IoT device events */
  IOT_EVENTS: 'io.hololand.ar/iot_events',
} as const;

// =============================================================================
// SESSION CHANNEL METHODS
// =============================================================================

/**
 * Methods available on the session channel (Flutter -> Native).
 */
export interface SessionChannelMethods {
  /** Initialize an AR session with configuration */
  initSession: (config: ARSessionConfig) => Promise<{ sessionId: string }>;
  /** Pause the current AR session */
  pauseSession: () => Promise<void>;
  /** Resume a paused AR session */
  resumeSession: () => Promise<void>;
  /** Destroy the current AR session and release resources */
  destroySession: () => Promise<void>;
  /** Check if AR is supported on this device */
  checkARSupport: () => Promise<{
    isSupported: boolean;
    hasLiDAR: boolean;
    hasDepthSensor: boolean;
    supportedTrackingModes: string[];
  }>;
  /** Get current session status */
  getSessionStatus: () => Promise<{
    isActive: boolean;
    trackingState: string;
    frameRate: number;
    sessionDuration: number;
  }>;
}

/**
 * Events emitted on the session event channel (Native -> Flutter).
 */
export type SessionChannelEvents =
  | { type: 'trackingStateChanged'; state: string; reason?: string }
  | { type: 'frameUpdate'; frame: ARFrameData }
  | { type: 'sessionError'; error: ARError }
  | { type: 'sessionInterrupted'; reason: string }
  | { type: 'sessionResumed' };

// =============================================================================
// MESH CHANNEL METHODS
// =============================================================================

/**
 * Methods available on the mesh channel (Flutter -> Native).
 */
export interface MeshChannelMethods {
  /** Start spatial mesh scanning */
  startMeshScanning: (config: MeshScanConfig) => Promise<{ scanId: string }>;
  /** Stop mesh scanning and get result */
  stopMeshScanning: () => Promise<MeshScanResult>;
  /** Get raw mesh data in specified format */
  exportMesh: (options: MeshExportOptions) => Promise<{ filePath: string; size: number }>;
  /** Set mesh resolution (can be changed during scan) */
  setMeshResolution: (resolution: 'low' | 'medium' | 'high' | 'ultra') => Promise<void>;
  /** Clear all captured mesh data */
  clearMeshData: () => Promise<void>;
  /** Get current mesh statistics */
  getMeshStats: () => Promise<{
    vertexCount: number;
    triangleCount: number;
    chunkCount: number;
    scannedArea: number;
    memoryUsage: number;
  }>;
  /** Upload pending mesh deltas to server */
  syncMeshToCloud: () => Promise<{ chunksUploaded: number; bytesUploaded: number }>;
  /** Download mesh data from server for a world */
  downloadMeshFromCloud: (worldId: string) => Promise<{ chunksDownloaded: number }>;
}

/**
 * Events emitted on the mesh event channel (Native -> Flutter).
 */
export type MeshChannelEvents =
  | { type: 'meshUpdated'; chunkId: string; vertexCount: number; triangleCount: number }
  | { type: 'meshClassification'; chunkId: string; classifications: Record<number, number> }
  | { type: 'scanProgress'; progress: MeshScanProgressEvent }
  | { type: 'chunkSynced'; chunkId: string; version: number }
  | { type: 'syncError'; chunkId: string; error: string };

// =============================================================================
// ANCHOR CHANNEL METHODS
// =============================================================================

/**
 * Methods available on the anchor channel (Flutter -> Native).
 */
export interface AnchorChannelMethods {
  /** Create a spatial anchor at the given pose */
  createAnchor: (pose: Pose6DoF, name?: string) => Promise<SpatialAnchor>;
  /** Remove a spatial anchor */
  removeAnchor: (anchorId: string) => Promise<void>;
  /** Get all current anchors */
  getAnchors: () => Promise<SpatialAnchor[]>;
  /** Host a local anchor to the cloud for cross-device access */
  hostCloudAnchor: (localAnchorId: string, ttlDays: number) => Promise<{ cloudAnchorId: string }>;
  /** Resolve a cloud anchor by ID */
  resolveCloudAnchor: (cloudAnchorId: string) => Promise<SpatialAnchor>;
  /** Create a geospatial anchor */
  createGeospatialAnchor: (params: {
    latitude: number;
    longitude: number;
    altitude: number;
    heading: number;
  }) => Promise<SpatialAnchor>;
  /** Save world map for relocalization (iOS only) */
  saveWorldMap: () => Promise<{ filePath: string }>;
  /** Load world map for relocalization (iOS only) */
  loadWorldMap: (filePath: string) => Promise<{ success: boolean }>;
}

/**
 * Events emitted on the anchor event channel (Native -> Flutter).
 */
export type AnchorChannelEvents =
  | { type: 'anchorUpdated'; anchor: SpatialAnchor }
  | { type: 'anchorLost'; anchorId: string }
  | { type: 'planeDetected'; plane: { id: string; classification: string; extent: { width: number; height: number } } }
  | { type: 'planeUpdated'; planeId: string; extent: { width: number; height: number } }
  | { type: 'planeRemoved'; planeId: string }
  | { type: 'cloudAnchorHosted'; localAnchorId: string; cloudAnchorId: string }
  | { type: 'cloudAnchorResolved'; cloudAnchorId: string; anchor: SpatialAnchor }
  | { type: 'cloudAnchorError'; anchorId: string; error: string };

// =============================================================================
// IOT CHANNEL METHODS
// =============================================================================

/**
 * Methods available on the IoT channel (Flutter -> Native).
 */
export interface IoTChannelMethods {
  /** Start scanning for IoT devices */
  startDiscovery: (config: IoTDiscoveryConfig) => Promise<{ scanId: string }>;
  /** Stop IoT device discovery */
  stopDiscovery: () => Promise<IoTDiscoveryResult>;
  /** Connect to a specific device */
  connectDevice: (deviceId: string) => Promise<{ success: boolean }>;
  /** Disconnect from a device */
  disconnectDevice: (deviceId: string) => Promise<void>;
  /** Get device capabilities */
  getDeviceCapabilities: (deviceId: string) => Promise<IoTDevice>;
  /** Read current device state */
  getDeviceState: (deviceId: string) => Promise<IoTDeviceState>;
  /** Send command to device */
  sendCommand: (command: IoTCommand) => Promise<IoTCommandResponse>;
  /** Create an entity binding */
  createBinding: (binding: Omit<IoTEntityBinding, 'bindingId' | 'createdAt' | 'updatedAt' | 'version'>) => Promise<IoTEntityBinding>;
  /** Update an existing binding */
  updateBinding: (bindingId: string, updates: Partial<IoTEntityBinding>) => Promise<IoTEntityBinding>;
  /** Remove an entity binding */
  removeBinding: (bindingId: string) => Promise<void>;
  /** Get all bindings for a world */
  getBindings: (worldId: string) => Promise<IoTEntityBinding[]>;
  /** Get binding by ID */
  getBinding: (bindingId: string) => Promise<IoTEntityBinding | null>;
}

/**
 * Events emitted on the IoT event channel (Native -> Flutter).
 */
export type IoTChannelEvents =
  | { type: 'deviceDiscovered'; device: IoTDevice }
  | { type: 'deviceConnected'; deviceId: string }
  | { type: 'deviceDisconnected'; deviceId: string; reason: string }
  | { type: 'deviceStateChanged'; deviceId: string; state: IoTDeviceState }
  | { type: 'bindingStatusChanged'; bindingId: string; status: string }
  | { type: 'interactionTriggered'; bindingId: string; zoneId: string; triggerType: string }
  | { type: 'automationExecuted'; bindingId: string; ruleId: string; success: boolean }
  | { type: 'discoveryComplete'; result: IoTDiscoveryResult };

// =============================================================================
// BRIDGE VALIDATION
// =============================================================================

/**
 * Validate that a platform channel message has the required structure.
 * Used on both sides of the bridge for safety.
 */
export function validateChannelMessage(
  channel: string,
  method: string,
  args: unknown
): { valid: boolean; error?: string } {
  // Validate channel name
  const validChannels = Object.values(PLATFORM_CHANNELS);
  if (!validChannels.includes(channel as any)) {
    return { valid: false, error: `Unknown channel: ${channel}` };
  }

  // Validate method is a non-empty string
  if (typeof method !== 'string' || method.length === 0) {
    return { valid: false, error: 'Method must be a non-empty string' };
  }

  // Arguments must be serializable (no functions, symbols, etc.)
  try {
    JSON.parse(JSON.stringify(args));
  } catch {
    return { valid: false, error: 'Arguments must be JSON-serializable' };
  }

  return { valid: true };
}

/**
 * Generate a unique request ID for correlation.
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `req_${timestamp}_${random}`;
}
