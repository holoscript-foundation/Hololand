/**
 * @hololand/ar-akida-bridge - Type Definitions
 *
 * BrainChip Akida AKD1500 neuromorphic processor integration types.
 * Covers point cloud streaming, classification results, power monitoring,
 * and fallback processor configuration.
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

export interface BoundingBox3D {
  center: Vector3;
  size: Vector3;
  rotation?: Quaternion;
}

// =============================================================================
// POINT CLOUD TYPES
// =============================================================================

/**
 * A single 3D point with optional attributes.
 * Mirrors LiDAR sensor output (x, y, z, intensity, return number).
 */
export interface Point3D {
  x: number;
  y: number;
  z: number;
  /** Reflectance intensity [0-1] */
  intensity: number;
  /** Return index for multi-return LiDAR (0 = first return) */
  returnIndex: number;
}

/**
 * A frame of LiDAR point cloud data.
 */
export interface PointCloudFrame {
  /** Unique frame identifier */
  frameId: number;
  /** Timestamp in milliseconds (sensor clock) */
  timestamp: number;
  /** Number of points in this frame */
  pointCount: number;
  /** Packed point data (x, y, z, intensity, returnIndex per point) */
  points: Point3D[];
  /** Sensor origin in world coordinates */
  sensorOrigin: Vector3;
  /** Sensor orientation */
  sensorOrientation: Quaternion;
  /** Minimum range in meters */
  minRange: number;
  /** Maximum range in meters */
  maxRange: number;
}

/**
 * Binary-serialized point cloud frame header.
 * Used for efficient WebSocket transfer.
 *
 * Layout (44 bytes total):
 *   [0..3]   u32  magic (0x414B4944 = "AKID")
 *   [4..5]   u16  version
 *   [6..9]   u32  frameId
 *   [10..17] f64  timestamp
 *   [18..21] u32  pointCount
 *   [22..25] f32  sensorOriginX
 *   [26..29] f32  sensorOriginY
 *   [30..33] f32  sensorOriginZ
 *   [34..37] f32  sensorOrientationX (quat)
 *   [38..41] f32  sensorOrientationY
 *   [42..45] f32  sensorOrientationZ
 *   [46..49] f32  sensorOrientationW
 *   [50..53] f32  minRange
 *   [54..57] f32  maxRange
 *
 * Then per-point (20 bytes each):
 *   [0..3]   f32  x
 *   [4..7]   f32  y
 *   [8..11]  f32  z
 *   [12..15] f32  intensity
 *   [16..19] u32  returnIndex
 */
export const BINARY_HEADER_SIZE = 58;
export const BINARY_POINT_SIZE = 20;
export const BINARY_MAGIC = 0x414B4944; // "AKID"
export const BINARY_VERSION = 1;

// =============================================================================
// CLASSIFICATION TYPES
// =============================================================================

/**
 * PointNet++ semantic classes supported by Akida AKD1500.
 * Aligned with ScanNet / S3DIS benchmark label sets.
 */
export enum SemanticClass {
  UNKNOWN = 0,
  FLOOR = 1,
  WALL = 2,
  CEILING = 3,
  TABLE = 4,
  CHAIR = 5,
  SOFA = 6,
  DOOR = 7,
  WINDOW = 8,
  SHELF = 9,
  PERSON = 10,
  VEHICLE = 11,
  VEGETATION = 12,
  TERRAIN = 13,
  STAIRS = 14,
  RAILING = 15,
}

export const SEMANTIC_CLASS_NAMES: Record<SemanticClass, string> = {
  [SemanticClass.UNKNOWN]: 'unknown',
  [SemanticClass.FLOOR]: 'floor',
  [SemanticClass.WALL]: 'wall',
  [SemanticClass.CEILING]: 'ceiling',
  [SemanticClass.TABLE]: 'table',
  [SemanticClass.CHAIR]: 'chair',
  [SemanticClass.SOFA]: 'sofa',
  [SemanticClass.DOOR]: 'door',
  [SemanticClass.WINDOW]: 'window',
  [SemanticClass.SHELF]: 'shelf',
  [SemanticClass.PERSON]: 'person',
  [SemanticClass.VEHICLE]: 'vehicle',
  [SemanticClass.VEGETATION]: 'vegetation',
  [SemanticClass.TERRAIN]: 'terrain',
  [SemanticClass.STAIRS]: 'stairs',
  [SemanticClass.RAILING]: 'railing',
};

/**
 * Per-point classification result from Akida PointNet++.
 */
export interface PointClassification {
  /** Index into the point cloud frame */
  pointIndex: number;
  /** Predicted semantic class */
  semanticClass: SemanticClass;
  /** Confidence of prediction [0-1] */
  confidence: number;
}

/**
 * A classified segment (cluster of spatially contiguous points
 * sharing the same semantic class).
 */
export interface ClassifiedSegment {
  /** Unique segment ID */
  segmentId: string;
  /** Semantic class */
  semanticClass: SemanticClass;
  /** Axis-aligned bounding box */
  boundingBox: BoundingBox3D;
  /** Centroid of the segment */
  centroid: Vector3;
  /** Number of points in this segment */
  pointCount: number;
  /** Average confidence across all points */
  averageConfidence: number;
  /** Point indices belonging to this segment */
  pointIndices: number[];
}

/**
 * Full classification result for a point cloud frame.
 */
export interface ClassificationResult {
  /** Frame ID this classification corresponds to */
  frameId: number;
  /** Timestamp of the classification */
  timestamp: number;
  /** Per-point classifications */
  pointClassifications: PointClassification[];
  /** Aggregated segments */
  segments: ClassifiedSegment[];
  /** Processing latency on Akida chip (ms) */
  akidaLatencyMs: number;
  /** Total end-to-end latency including transfer (ms) */
  totalLatencyMs: number;
  /** Whether this came from Akida hardware or fallback */
  source: 'akida' | 'cpu' | 'webgpu';
}

// =============================================================================
// SPATIAL STATE TYPES
// =============================================================================

/**
 * A spatial entity tracked in HoloLand's spatial state.
 * Classification results are ingested as these entities.
 */
export interface SpatialEntity {
  /** Unique entity ID */
  entityId: string;
  /** Semantic class */
  semanticClass: SemanticClass;
  /** Human-readable label */
  label: string;
  /** Position in world coordinates */
  position: Vector3;
  /** Orientation */
  orientation?: Quaternion;
  /** Bounding box */
  boundingBox: BoundingBox3D;
  /** Detection confidence */
  confidence: number;
  /** Last update timestamp */
  lastUpdated: number;
  /** Number of frames this entity has been observed */
  observationCount: number;
  /** Whether the entity is currently visible */
  isVisible: boolean;
  /** Source of detection */
  source: 'akida' | 'cpu' | 'webgpu';
}

/**
 * Callback signatures for spatial state changes.
 */
export interface SpatialStateEvents {
  onEntityAdded?: (entity: SpatialEntity) => void;
  onEntityUpdated?: (entity: SpatialEntity) => void;
  onEntityRemoved?: (entityId: string) => void;
  onStateReset?: () => void;
}

// =============================================================================
// AKIDA BRIDGE CONFIGURATION
// =============================================================================

export type AkidaConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'authenticated'
  | 'streaming'
  | 'error';

/**
 * Configuration for the AkidaBridge WebSocket client.
 */
export interface AkidaBridgeConfig {
  /** WebSocket URL of the Akida edge device (e.g., ws://192.168.1.50:8765) */
  deviceUrl: string;
  /** Device authentication token (optional) */
  authToken?: string;
  /** Auto-reconnect on disconnect */
  autoReconnect: boolean;
  /** Reconnect interval in ms */
  reconnectIntervalMs: number;
  /** Maximum reconnect attempts (0 = unlimited) */
  maxReconnectAttempts: number;
  /** Whether to use binary protocol (true) or JSON (false) */
  useBinaryProtocol: boolean;
  /** Maximum point cloud frame size before downsampling */
  maxPointsPerFrame: number;
  /** Target streaming frame rate (Hz) */
  targetFrameRate: number;
  /** Enable power monitoring telemetry */
  enablePowerMonitoring: boolean;
  /** Power monitoring poll interval in ms */
  powerMonitorIntervalMs: number;
}

export const DEFAULT_AKIDA_CONFIG: AkidaBridgeConfig = {
  deviceUrl: 'ws://localhost:8765',
  autoReconnect: true,
  reconnectIntervalMs: 3000,
  maxReconnectAttempts: 10,
  useBinaryProtocol: true,
  maxPointsPerFrame: 65536,
  targetFrameRate: 30,
  enablePowerMonitoring: true,
  powerMonitorIntervalMs: 1000,
};

/**
 * Event callbacks for the AkidaBridge.
 */
export interface AkidaBridgeEvents {
  onConnected?: () => void;
  onDisconnected?: (reason: string) => void;
  onAuthenticated?: () => void;
  onPointCloudReceived?: (frame: PointCloudFrame) => void;
  onClassificationResult?: (result: ClassificationResult) => void;
  onPowerUpdate?: (metrics: PowerMetrics) => void;
  onError?: (error: Error) => void;
  onStateChange?: (state: AkidaConnectionState) => void;
  onFallbackActivated?: (reason: string) => void;
  onFallbackDeactivated?: () => void;
}

// =============================================================================
// AKIDA WIRE PROTOCOL MESSAGES
// =============================================================================

/** Client -> Akida device messages */
export type AkidaClientMessage =
  | { type: 'authenticate'; token: string }
  | { type: 'start_stream'; config: StreamConfig }
  | { type: 'stop_stream' }
  | { type: 'request_power_metrics' }
  | { type: 'configure_model'; modelConfig: ModelConfig }
  | { type: 'ping'; timestamp: number };

/** Akida device -> Client messages */
export type AkidaDeviceMessage =
  | { type: 'auth_result'; success: boolean; error?: string }
  | { type: 'stream_started'; actualFrameRate: number }
  | { type: 'stream_stopped' }
  | { type: 'classification_result'; result: ClassificationResult }
  | { type: 'power_metrics'; metrics: PowerMetrics }
  | { type: 'device_info'; info: AkidaDeviceInfo }
  | { type: 'error'; code: string; message: string }
  | { type: 'pong'; clientTimestamp: number; serverTimestamp: number };

export interface StreamConfig {
  /** Target frame rate */
  frameRate: number;
  /** Maximum points per frame */
  maxPoints: number;
  /** Voxel grid downsample resolution (meters, 0 = no downsampling) */
  voxelSize: number;
  /** Region of interest (null = full field of view) */
  regionOfInterest?: BoundingBox3D;
}

export interface ModelConfig {
  /** PointNet++ variant to use */
  variant: 'pointnet2_ssg' | 'pointnet2_msg' | 'pointnet2_ssg_lite';
  /** Number of input points the model expects */
  numInputPoints: number;
  /** Number of semantic classes */
  numClasses: number;
  /** Confidence threshold for classification */
  confidenceThreshold: number;
}

// =============================================================================
// POWER MONITORING TYPES
// =============================================================================

/**
 * Power and thermal metrics from the Akida AKD1500 chip.
 */
export interface PowerMetrics {
  /** Timestamp of measurement */
  timestamp: number;
  /** Total chip power consumption in milliwatts */
  powerMw: number;
  /** Neural processing unit power in milliwatts */
  npuPowerMw: number;
  /** IO subsystem power in milliwatts */
  ioPowerMw: number;
  /** Chip temperature in degrees Celsius */
  temperatureC: number;
  /** Current inference latency in milliseconds */
  inferenceLatencyMs: number;
  /** Frames processed per second */
  framesPerSecond: number;
  /** Total frames processed since startup */
  totalFramesProcessed: number;
  /** Chip utilization percentage [0-100] */
  utilizationPercent: number;
  /** Available SRAM in bytes */
  availableSramBytes: number;
  /** Model loaded and ready */
  modelLoaded: boolean;
}

/**
 * Akida device hardware information.
 */
export interface AkidaDeviceInfo {
  /** Device model (e.g., "AKD1500") */
  model: string;
  /** Firmware version */
  firmwareVersion: string;
  /** Number of neural processing engines */
  numNPEs: number;
  /** Total SRAM in bytes */
  totalSramBytes: number;
  /** Supported PointNet++ variants */
  supportedModels: string[];
  /** Maximum points per inference */
  maxPointsPerInference: number;
  /** Serial number */
  serialNumber: string;
}

// =============================================================================
// FALLBACK PROCESSOR TYPES
// =============================================================================

export type FallbackBackend = 'cpu' | 'webgpu';

export interface FallbackConfig {
  /** Preferred fallback backend */
  preferredBackend: FallbackBackend;
  /** CPU thread count (for WASM/worker-based inference) */
  cpuThreads: number;
  /** WebGPU adapter preferences */
  webgpuPreferences?: {
    powerPreference: 'low-power' | 'high-performance';
    forceFallbackAdapter: boolean;
  };
  /** Simplified model for fallback (fewer points, fewer classes) */
  simplifiedModel: boolean;
  /** Maximum points to process in fallback mode */
  maxPointsFallback: number;
  /** Confidence threshold in fallback mode (typically lower) */
  confidenceThresholdFallback: number;
}

export const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
  preferredBackend: 'webgpu',
  cpuThreads: 4,
  webgpuPreferences: {
    powerPreference: 'high-performance',
    forceFallbackAdapter: false,
  },
  simplifiedModel: true,
  maxPointsFallback: 4096,
  confidenceThresholdFallback: 0.4,
};

// =============================================================================
// DASHBOARD TYPES
// =============================================================================

/**
 * Aggregated telemetry snapshot for dashboard display.
 */
export interface DashboardSnapshot {
  /** Current connection state */
  connectionState: AkidaConnectionState;
  /** Whether running on Akida hardware or fallback */
  activeBackend: 'akida' | 'cpu' | 'webgpu' | 'none';
  /** Device info (if connected) */
  deviceInfo?: AkidaDeviceInfo;
  /** Latest power metrics */
  latestPowerMetrics?: PowerMetrics;
  /** Rolling average inference latency (ms) */
  avgInferenceLatencyMs: number;
  /** Rolling average end-to-end latency (ms) */
  avgEndToEndLatencyMs: number;
  /** Rolling average FPS */
  avgFps: number;
  /** Rolling average power consumption (mW) */
  avgPowerMw: number;
  /** Total frames processed this session */
  totalFrames: number;
  /** Total entities currently tracked */
  trackedEntityCount: number;
  /** Entity counts by semantic class */
  entityCountsByClass: Partial<Record<SemanticClass, number>>;
  /** Uptime in seconds */
  uptimeSeconds: number;
  /** Latency history (last N samples) */
  latencyHistory: { timestamp: number; latencyMs: number }[];
  /** Power history (last N samples) */
  powerHistory: { timestamp: number; powerMw: number }[];
  /** FPS history (last N samples) */
  fpsHistory: { timestamp: number; fps: number }[];
}
