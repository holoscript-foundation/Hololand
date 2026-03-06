/**
 * GR00TN16PolicyClientTypes
 *
 * Type definitions for the NVIDIA GR00T N1.6 policy streaming client.
 * Defines observation vectors, action spaces, action chunking parameters,
 * policy modes, and the binary protocol for communicating with a remote
 * GR00T N1.6 inference server.
 *
 * OBSERVATION VECTOR LAYOUT (streamed at 30Hz):
 * ```
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │ Joint States (37 joints x 4 fields = 148 floats)              │
 *   │   [angle, velocity, torque, temperature] per joint             │
 *   ├─────────────────────────────────────────────────────────────────┤
 *   │ Camera Frame Embedding (512 floats)                            │
 *   │   Pre-computed by on-device vision encoder (e.g. DINOv2)       │
 *   ├─────────────────────────────────────────────────────────────────┤
 *   │ Proprioceptive Context (64 floats)                             │
 *   │   Base pose, end-effector poses, contact forces, IMU           │
 *   ├─────────────────────────────────────────────────────────────────┤
 *   │ Task Context (32 floats)                                       │
 *   │   Goal embedding, policy mode flags, task progress             │
 *   └─────────────────────────────────────────────────────────────────┘
 *   Total: 756 floats = 3024 bytes
 * ```
 *
 * ACTION VECTOR LAYOUT (received from inference server):
 * ```
 *   256 floats per action step (1024 bytes)
 *   With action chunking K=16: 256 x 16 = 4096 floats (16384 bytes)
 *   Mapped to 37-DOF humanoid joint commands via learned action decoder
 * ```
 *
 * 37-DOF HUMANOID JOINT MAP:
 * ```
 *   Head:       2 DOF  (yaw, pitch)
 *   Torso:      3 DOF  (yaw, pitch, roll)
 *   Left Arm:   7 DOF  (shoulder x3, elbow x1, wrist x3)
 *   Right Arm:  7 DOF  (shoulder x3, elbow x1, wrist x3)
 *   Left Hand:  3 DOF  (grip, thumb, index)
 *   Right Hand: 3 DOF  (grip, thumb, index)
 *   Left Leg:   6 DOF  (hip x3, knee x1, ankle x2)
 *   Right Leg:  6 DOF  (hip x3, knee x1, ankle x2)
 *   Total:     37 DOF
 * ```
 *
 * NOTE: The existing TeleoperationHubTypes defines 36 joints (JOINT_COUNT=36).
 * The 37th DOF is `torso_lateral` added for GR00T N1.6 full-body policy.
 * We maintain backward compatibility by mapping to the 36-joint subset.
 *
 * @module GR00TN16PolicyClientTypes
 */

import type { RobotJointName, RobotState, Vec3, Quat } from './TeleoperationHubTypes';

// =============================================================================
// OBSERVATION VECTOR
// =============================================================================

/**
 * Dimensions of the observation vector components.
 */
export const OBSERVATION_JOINT_FIELDS = 4;       // angle, velocity, torque, temperature
export const OBSERVATION_JOINT_COUNT = 37;        // 37-DOF humanoid (superset of 36-joint base)
export const OBSERVATION_JOINT_DIM = OBSERVATION_JOINT_COUNT * OBSERVATION_JOINT_FIELDS; // 148
export const OBSERVATION_EMBEDDING_DIM = 512;     // Camera frame embedding dimension
export const OBSERVATION_PROPRIOCEPTIVE_DIM = 64; // Base pose, EE poses, forces, IMU
export const OBSERVATION_TASK_DIM = 32;           // Goal embedding, mode flags, progress
export const OBSERVATION_TOTAL_DIM =
  OBSERVATION_JOINT_DIM +
  OBSERVATION_EMBEDDING_DIM +
  OBSERVATION_PROPRIOCEPTIVE_DIM +
  OBSERVATION_TASK_DIM; // 756

/**
 * Structured observation data before serialization into the flat vector.
 */
export interface GR00TObservation {
  /** Timestamp of observation capture (monotonic ms) */
  timestamp: number;
  /** Sequence number for ordering */
  sequence: number;
  /** Joint state data: 37 joints x {angle, velocity, torque, temperature} */
  jointStates: Float32Array;
  /** Camera frame embedding from vision encoder (512-dim) */
  cameraEmbedding: Float32Array;
  /** Proprioceptive context: base pose, EE poses, forces, IMU (64-dim) */
  proprioceptive: Float32Array;
  /** Task context: goal embedding, mode flags, progress (32-dim) */
  taskContext: Float32Array;
}

/**
 * Camera embedding source configuration.
 */
export interface CameraEmbeddingConfig {
  /** Vision encoder model name (e.g. 'dinov2-small', 'siglip-base') */
  encoderModel: string;
  /** Whether to use on-device NPU for encoding */
  useNPU: boolean;
  /** Target embedding dimension */
  embeddingDim: number;
  /** Input resolution for the vision encoder */
  inputResolution: { width: number; height: number };
}

// =============================================================================
// ACTION VECTOR
// =============================================================================

/**
 * Action vector dimension from the GR00T N1.6 policy head.
 */
export const ACTION_DIM = 256;

/**
 * Maximum action chunk size (predict K future actions).
 */
export const MAX_ACTION_CHUNK_SIZE = 32;

/**
 * Default action chunk size.
 */
export const DEFAULT_ACTION_CHUNK_SIZE = 16;

/**
 * A single action step from the policy.
 */
export interface GR00TActionStep {
  /** 256-dim raw action vector from policy head */
  rawAction: Float32Array;
  /** Decoded 37-DOF joint target angles (radians) */
  jointTargets: Float32Array;
  /** Confidence score for this action step (0.0-1.0) */
  confidence: number;
  /** Step index within the action chunk (0 to K-1) */
  stepIndex: number;
}

/**
 * An action chunk: K predicted future action steps.
 */
export interface GR00TActionChunk {
  /** Sequence number matching the observation that produced this chunk */
  observationSequence: number;
  /** Timestamp of the inference that produced this chunk */
  inferenceTimestamp: number;
  /** Inference latency in milliseconds */
  inferenceLatencyMs: number;
  /** All K action steps in temporal order */
  steps: GR00TActionStep[];
  /** Current execution index (which step we are executing) */
  executionIndex: number;
  /** Whether this chunk has been fully consumed */
  exhausted: boolean;
  /** Policy mode that generated this chunk */
  policyMode: GR00TPolicyMode;
}

// =============================================================================
// 37-DOF JOINT MAPPING
// =============================================================================

/**
 * Extended joint names for the 37-DOF GR00T N1.6 model.
 * Includes the extra `torso_lateral` DOF not in the base 36-joint set.
 */
export type GR00TJointName = RobotJointName | 'torso_lateral';

/**
 * All 37 joint names in canonical order for the action decoder.
 */
export const GROOT_37DOF_JOINT_NAMES: GR00TJointName[] = [
  // Head (2)
  'head_yaw', 'head_pitch',
  // Torso (3 + 1 extra = 4, but we use 3 from base + 1 lateral)
  'torso_yaw', 'torso_pitch', 'torso_roll',
  // Extra torso DOF for GR00T N1.6
  'torso_lateral',
  // Left arm (7)
  'left_shoulder_pitch', 'left_shoulder_roll', 'left_shoulder_yaw',
  'left_elbow_pitch', 'left_wrist_yaw', 'left_wrist_pitch', 'left_wrist_roll',
  // Right arm (7)
  'right_shoulder_pitch', 'right_shoulder_roll', 'right_shoulder_yaw',
  'right_elbow_pitch', 'right_wrist_yaw', 'right_wrist_pitch', 'right_wrist_roll',
  // Left hand (3)
  'left_grip', 'left_thumb', 'left_index',
  // Right hand (3)
  'right_grip', 'right_thumb', 'right_index',
  // Left leg (6)
  'left_hip_pitch', 'left_hip_roll', 'left_hip_yaw',
  'left_knee_pitch', 'left_ankle_pitch', 'left_ankle_roll',
  // Right leg (6)
  'right_hip_pitch', 'right_hip_roll', 'right_hip_yaw',
  'right_knee_pitch', 'right_ankle_pitch', 'right_ankle_roll',
];

/**
 * Mapping from 256-dim action vector indices to 37-DOF joint indices.
 * The first 37 action dimensions map directly to joints.
 * Dimensions 37-255 are auxiliary outputs (contact predictions, etc.).
 */
export const ACTION_TO_JOINT_OFFSET = 0;
export const ACTION_JOINT_COUNT = 37;
export const ACTION_AUXILIARY_OFFSET = 37;
export const ACTION_AUXILIARY_DIM = ACTION_DIM - ACTION_JOINT_COUNT; // 219

// =============================================================================
// POLICY MODES
// =============================================================================

/**
 * Policy operating modes.
 * The GR00T N1.6 model supports separate policy heads for different tasks.
 */
export type GR00TPolicyMode =
  | 'manipulation'   // Fine-grained object manipulation (arms + hands)
  | 'navigation'     // Whole-body locomotion and navigation (legs + torso)
  | 'bimanual'       // Coordinated two-hand manipulation
  | 'idle';          // No active policy, hold current pose

/**
 * Policy mode configuration: which joints are active in each mode.
 */
export interface PolicyModeConfig {
  /** Which joints this mode controls */
  activeJoints: GR00TJointName[];
  /** Joints held at current position (not controlled by policy) */
  frozenJoints: GR00TJointName[];
  /** Policy head identifier sent to the inference server */
  policyHeadId: string;
  /** Maximum action magnitude (rad/step) for safety */
  maxActionMagnitude: number;
  /** Whether this mode uses camera embedding */
  usesCameraEmbedding: boolean;
}

/**
 * Default policy mode configurations.
 */
export const DEFAULT_POLICY_MODES: Record<GR00TPolicyMode, PolicyModeConfig> = {
  manipulation: {
    activeJoints: [
      'head_yaw', 'head_pitch',
      'torso_yaw', 'torso_pitch', 'torso_roll',
      'left_shoulder_pitch', 'left_shoulder_roll', 'left_shoulder_yaw',
      'left_elbow_pitch', 'left_wrist_yaw', 'left_wrist_pitch', 'left_wrist_roll',
      'right_shoulder_pitch', 'right_shoulder_roll', 'right_shoulder_yaw',
      'right_elbow_pitch', 'right_wrist_yaw', 'right_wrist_pitch', 'right_wrist_roll',
      'left_grip', 'left_thumb', 'left_index',
      'right_grip', 'right_thumb', 'right_index',
    ],
    frozenJoints: [
      'torso_lateral',
      'left_hip_pitch', 'left_hip_roll', 'left_hip_yaw',
      'left_knee_pitch', 'left_ankle_pitch', 'left_ankle_roll',
      'right_hip_pitch', 'right_hip_roll', 'right_hip_yaw',
      'right_knee_pitch', 'right_ankle_pitch', 'right_ankle_roll',
    ],
    policyHeadId: 'manipulation_v1',
    maxActionMagnitude: 0.15,
    usesCameraEmbedding: true,
  },
  navigation: {
    activeJoints: [
      'torso_yaw', 'torso_pitch', 'torso_roll', 'torso_lateral',
      'left_hip_pitch', 'left_hip_roll', 'left_hip_yaw',
      'left_knee_pitch', 'left_ankle_pitch', 'left_ankle_roll',
      'right_hip_pitch', 'right_hip_roll', 'right_hip_yaw',
      'right_knee_pitch', 'right_ankle_pitch', 'right_ankle_roll',
    ],
    frozenJoints: [
      'head_yaw', 'head_pitch',
      'left_shoulder_pitch', 'left_shoulder_roll', 'left_shoulder_yaw',
      'left_elbow_pitch', 'left_wrist_yaw', 'left_wrist_pitch', 'left_wrist_roll',
      'right_shoulder_pitch', 'right_shoulder_roll', 'right_shoulder_yaw',
      'right_elbow_pitch', 'right_wrist_yaw', 'right_wrist_pitch', 'right_wrist_roll',
      'left_grip', 'left_thumb', 'left_index',
      'right_grip', 'right_thumb', 'right_index',
    ],
    policyHeadId: 'navigation_v1',
    maxActionMagnitude: 0.08,
    usesCameraEmbedding: true,
  },
  bimanual: {
    activeJoints: [
      'head_yaw', 'head_pitch',
      'torso_yaw', 'torso_pitch', 'torso_roll',
      'left_shoulder_pitch', 'left_shoulder_roll', 'left_shoulder_yaw',
      'left_elbow_pitch', 'left_wrist_yaw', 'left_wrist_pitch', 'left_wrist_roll',
      'right_shoulder_pitch', 'right_shoulder_roll', 'right_shoulder_yaw',
      'right_elbow_pitch', 'right_wrist_yaw', 'right_wrist_pitch', 'right_wrist_roll',
      'left_grip', 'left_thumb', 'left_index',
      'right_grip', 'right_thumb', 'right_index',
    ],
    frozenJoints: [
      'torso_lateral',
      'left_hip_pitch', 'left_hip_roll', 'left_hip_yaw',
      'left_knee_pitch', 'left_ankle_pitch', 'left_ankle_roll',
      'right_hip_pitch', 'right_hip_roll', 'right_hip_yaw',
      'right_knee_pitch', 'right_ankle_pitch', 'right_ankle_roll',
    ],
    policyHeadId: 'bimanual_v1',
    maxActionMagnitude: 0.12,
    usesCameraEmbedding: true,
  },
  idle: {
    activeJoints: [],
    frozenJoints: [...GROOT_37DOF_JOINT_NAMES],
    policyHeadId: 'idle',
    maxActionMagnitude: 0,
    usesCameraEmbedding: false,
  },
};

// =============================================================================
// ACTION CHUNKING CONFIGURATION
// =============================================================================

/**
 * Action chunking parameters.
 *
 * Action chunking predicts K future actions at once, executes the first M,
 * then re-plans with a fresh observation. This amortizes inference cost
 * and produces smoother trajectories.
 */
export interface ActionChunkingConfig {
  /** Number of future actions to predict (K). Default: 16 */
  chunkSize: number;
  /** Number of actions to execute before re-planning (M <= K). Default: 4 */
  executeHorizon: number;
  /** Temporal smoothing between consecutive chunks (0.0-1.0). Default: 0.7 */
  chunkBlendFactor: number;
  /** Minimum confidence threshold to execute an action step. Default: 0.3 */
  confidenceThreshold: number;
  /** Whether to use exponential weighting (newer steps weighted more). Default: true */
  useExponentialWeighting: boolean;
  /** Decay factor for exponential weighting. Default: 0.9 */
  weightDecay: number;
}

/**
 * Default action chunking config.
 */
export const DEFAULT_ACTION_CHUNKING_CONFIG: ActionChunkingConfig = {
  chunkSize: 16,
  executeHorizon: 4,
  chunkBlendFactor: 0.7,
  confidenceThreshold: 0.3,
  useExponentialWeighting: true,
  weightDecay: 0.9,
};

// =============================================================================
// CONNECTION & PROTOCOL
// =============================================================================

/**
 * Binary protocol message types for the GR00T N1.6 inference server.
 *
 * Uses a WebSocket binary protocol similar to the robot controller
 * but with different message types for observation/action exchange.
 */
export const enum GR00TMessageType {
  /** Client -> Server: Observation vector */
  OBSERVATION = 0x10,
  /** Server -> Client: Action chunk response */
  ACTION_CHUNK = 0x11,
  /** Client -> Server: Policy switch request */
  POLICY_SWITCH = 0x12,
  /** Server -> Client: Policy switch acknowledgment */
  POLICY_SWITCH_ACK = 0x13,
  /** Bidirectional: Heartbeat */
  HEARTBEAT = 0x14,
  /** Server -> Client: Inference error */
  INFERENCE_ERROR = 0x15,
  /** Client -> Server: Cancel current inference */
  CANCEL_INFERENCE = 0x16,
  /** Server -> Client: Server status (model loaded, GPU utilization, etc.) */
  SERVER_STATUS = 0x17,
}

/**
 * Message header size (same as robot protocol for consistency).
 * [1 byte type] [4 bytes sequence] [4 bytes timestamp]
 */
export const GROOT_HEADER_SIZE = 9;

/**
 * Connection configuration for the GR00T N1.6 inference server.
 */
export interface GR00TN16Config {
  /** Inference server WebSocket URL (e.g. 'ws://localhost:50051/inference') */
  serverUrl: string;
  /** Observation streaming rate in Hz. Default: 30 */
  observationRateHz: number;
  /** Reconnect interval in ms. Default: 2000 */
  reconnectIntervalMs: number;
  /** Maximum reconnect attempts. Default: 5 */
  maxReconnectAttempts: number;
  /** Heartbeat interval in ms. Default: 5000 */
  heartbeatIntervalMs: number;
  /** Heartbeat timeout in ms. Default: 10000 */
  heartbeatTimeoutMs: number;
  /** Action chunking configuration */
  actionChunking: ActionChunkingConfig;
  /** Initial policy mode. Default: 'manipulation' */
  initialPolicyMode: GR00TPolicyMode;
  /** Camera embedding configuration */
  cameraEmbedding: CameraEmbeddingConfig;
  /** Whether to enable action smoothing between chunks. Default: true */
  enableActionSmoothing: boolean;
  /** Action smoothing alpha (0.0 = full previous, 1.0 = full new). Default: 0.6 */
  actionSmoothingAlpha: number;
  /** Maximum inference latency before falling back to last chunk (ms). Default: 100 */
  maxInferenceLatencyMs: number;
}

/**
 * Default GR00T N1.6 client config.
 */
export const DEFAULT_GROOT_N16_CONFIG: GR00TN16Config = {
  serverUrl: 'ws://localhost:50051/inference',
  observationRateHz: 30,
  reconnectIntervalMs: 2000,
  maxReconnectAttempts: 5,
  heartbeatIntervalMs: 5000,
  heartbeatTimeoutMs: 10000,
  actionChunking: { ...DEFAULT_ACTION_CHUNKING_CONFIG },
  initialPolicyMode: 'manipulation',
  cameraEmbedding: {
    encoderModel: 'dinov2-small',
    useNPU: true,
    embeddingDim: 512,
    inputResolution: { width: 224, height: 224 },
  },
  enableActionSmoothing: true,
  actionSmoothingAlpha: 0.6,
  maxInferenceLatencyMs: 100,
};

// =============================================================================
// CLIENT STATE & METRICS
// =============================================================================

/**
 * Connection state of the GR00T N1.6 client.
 */
export type GR00TConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

/**
 * Metrics tracked by the GR00T N1.6 policy client.
 */
export interface GR00TN16Metrics {
  /** Connection state */
  connectionState: GR00TConnectionState;
  /** Current policy mode */
  policyMode: GR00TPolicyMode;
  /** Observations sent count */
  observationsSent: number;
  /** Action chunks received count */
  actionChunksReceived: number;
  /** Average inference latency in ms */
  avgInferenceLatencyMs: number;
  /** Current observation streaming rate (actual Hz) */
  actualObservationRateHz: number;
  /** Actions executed count */
  actionsExecuted: number;
  /** Action chunks dropped due to timeout */
  chunksDropped: number;
  /** Average action confidence */
  avgActionConfidence: number;
  /** Successful policy switches */
  policySwitchCount: number;
  /** Bytes sent total */
  bytesSent: number;
  /** Bytes received total */
  bytesReceived: number;
  /** Current action chunk progress (executionIndex / chunkSize) */
  chunkProgress: number;
}

/**
 * Create default empty metrics.
 */
export function createEmptyGR00TMetrics(): GR00TN16Metrics {
  return {
    connectionState: 'disconnected',
    policyMode: 'idle',
    observationsSent: 0,
    actionChunksReceived: 0,
    avgInferenceLatencyMs: 0,
    actualObservationRateHz: 0,
    actionsExecuted: 0,
    chunksDropped: 0,
    avgActionConfidence: 0,
    policySwitchCount: 0,
    bytesSent: 0,
    bytesReceived: 0,
    chunkProgress: 0,
  };
}

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Events emitted by the GR00T N1.6 policy client.
 */
export type GR00TEventType =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'action_chunk_received'
  | 'policy_switched'
  | 'policy_switch_failed'
  | 'inference_timeout'
  | 'chunk_exhausted'
  | 'server_status';

/**
 * Event payload.
 */
export interface GR00TEvent {
  type: GR00TEventType;
  timestamp: number;
  data?: unknown;
}

/**
 * Event listener callback.
 */
export type GR00TEventListener = (event: GR00TEvent) => void;
