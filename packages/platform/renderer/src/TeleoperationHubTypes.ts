/**
 * TeleoperationHubTypes
 *
 * Type definitions for the XR headset robot teleoperation hub.
 * Covers robot state, joint kinematics, IK parameters, telemetry,
 * safety boundaries, haptics simulation, and WebSocket binary protocol.
 *
 * ARCHITECTURE:
 *   VR Headset (XR2 Gen 3)
 *       |
 *       +-- Hand Tracking (XRHand) --> IK Solver --> Joint Commands
 *       |
 *       +-- Robot Camera Feed     --> VR Viewport Overlay
 *       |
 *       +-- Policy Stream (WS)   <-> GR00T N1.6 Robot Controller
 *       |
 *       +-- Telemetry Display     <-- Robot State Updates
 *       |
 *       +-- Safety Boundaries     --> Force-Feedback Haptics
 *
 * BINARY PROTOCOL:
 *   All WebSocket messages use a compact binary format:
 *   [1 byte: message type] [4 bytes: sequence] [4 bytes: timestamp] [N bytes: payload]
 *
 * @module TeleoperationHubTypes
 */

// =============================================================================
// VECTOR / MATH TYPES
// =============================================================================

/**
 * 3D vector for positions, velocities, forces.
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Quaternion for rotations.
 */
export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * 4x4 transformation matrix stored column-major (matches WebGL/WebXR convention).
 */
export type Mat4 = Float32Array;

// =============================================================================
// ROBOT JOINT DEFINITIONS
// =============================================================================

/**
 * Standard humanoid robot joint names (GR00T N1.6 compatible).
 * Covers a 32-DOF humanoid with head, torso, two arms, two hands, two legs.
 */
export type RobotJointName =
  // Head
  | 'head_yaw'
  | 'head_pitch'
  // Torso
  | 'torso_yaw'
  | 'torso_pitch'
  | 'torso_roll'
  // Left arm (7-DOF)
  | 'left_shoulder_pitch'
  | 'left_shoulder_roll'
  | 'left_shoulder_yaw'
  | 'left_elbow_pitch'
  | 'left_wrist_yaw'
  | 'left_wrist_pitch'
  | 'left_wrist_roll'
  // Right arm (7-DOF)
  | 'right_shoulder_pitch'
  | 'right_shoulder_roll'
  | 'right_shoulder_yaw'
  | 'right_elbow_pitch'
  | 'right_wrist_yaw'
  | 'right_wrist_pitch'
  | 'right_wrist_roll'
  // Left hand (simplified 3-DOF)
  | 'left_grip'
  | 'left_thumb'
  | 'left_index'
  // Right hand (simplified 3-DOF)
  | 'right_grip'
  | 'right_thumb'
  | 'right_index'
  // Left leg (6-DOF)
  | 'left_hip_pitch'
  | 'left_hip_roll'
  | 'left_hip_yaw'
  | 'left_knee_pitch'
  | 'left_ankle_pitch'
  | 'left_ankle_roll'
  // Right leg (6-DOF)
  | 'right_hip_pitch'
  | 'right_hip_roll'
  | 'right_hip_yaw'
  | 'right_knee_pitch'
  | 'right_ankle_pitch'
  | 'right_ankle_roll';

/**
 * All joint names for iteration.
 */
export const ALL_JOINT_NAMES: RobotJointName[] = [
  'head_yaw', 'head_pitch',
  'torso_yaw', 'torso_pitch', 'torso_roll',
  'left_shoulder_pitch', 'left_shoulder_roll', 'left_shoulder_yaw',
  'left_elbow_pitch', 'left_wrist_yaw', 'left_wrist_pitch', 'left_wrist_roll',
  'right_shoulder_pitch', 'right_shoulder_roll', 'right_shoulder_yaw',
  'right_elbow_pitch', 'right_wrist_yaw', 'right_wrist_pitch', 'right_wrist_roll',
  'left_grip', 'left_thumb', 'left_index',
  'right_grip', 'right_thumb', 'right_index',
  'left_hip_pitch', 'left_hip_roll', 'left_hip_yaw',
  'left_knee_pitch', 'left_ankle_pitch', 'left_ankle_roll',
  'right_hip_pitch', 'right_hip_roll', 'right_hip_yaw',
  'right_knee_pitch', 'right_ankle_pitch', 'right_ankle_roll',
];

/**
 * Number of joints.
 */
export const JOINT_COUNT = ALL_JOINT_NAMES.length;

/**
 * Joint limits in radians.
 */
export interface JointLimits {
  min: number;
  max: number;
  maxVelocity: number; // rad/s
  maxTorque: number;   // N*m
}

/**
 * Single joint state snapshot.
 */
export interface JointState {
  /** Current angle in radians */
  angle: number;
  /** Angular velocity in rad/s */
  velocity: number;
  /** Applied torque in N*m */
  torque: number;
  /** Temperature in Celsius */
  temperature: number;
}

/**
 * Default joint limits for GR00T N1.6 humanoid joints.
 */
export const DEFAULT_JOINT_LIMITS: Record<RobotJointName, JointLimits> = {
  // Head
  head_yaw: { min: -1.57, max: 1.57, maxVelocity: 3.0, maxTorque: 5.0 },
  head_pitch: { min: -0.78, max: 0.78, maxVelocity: 3.0, maxTorque: 5.0 },
  // Torso
  torso_yaw: { min: -1.57, max: 1.57, maxVelocity: 2.0, maxTorque: 50.0 },
  torso_pitch: { min: -0.52, max: 0.52, maxVelocity: 2.0, maxTorque: 50.0 },
  torso_roll: { min: -0.35, max: 0.35, maxVelocity: 2.0, maxTorque: 50.0 },
  // Left arm
  left_shoulder_pitch: { min: -3.14, max: 1.57, maxVelocity: 4.0, maxTorque: 30.0 },
  left_shoulder_roll: { min: -0.35, max: 3.14, maxVelocity: 4.0, maxTorque: 30.0 },
  left_shoulder_yaw: { min: -1.57, max: 1.57, maxVelocity: 4.0, maxTorque: 20.0 },
  left_elbow_pitch: { min: -2.36, max: 0.0, maxVelocity: 5.0, maxTorque: 20.0 },
  left_wrist_yaw: { min: -1.57, max: 1.57, maxVelocity: 6.0, maxTorque: 5.0 },
  left_wrist_pitch: { min: -1.05, max: 1.05, maxVelocity: 6.0, maxTorque: 5.0 },
  left_wrist_roll: { min: -1.57, max: 1.57, maxVelocity: 6.0, maxTorque: 5.0 },
  // Right arm
  right_shoulder_pitch: { min: -3.14, max: 1.57, maxVelocity: 4.0, maxTorque: 30.0 },
  right_shoulder_roll: { min: -3.14, max: 0.35, maxVelocity: 4.0, maxTorque: 30.0 },
  right_shoulder_yaw: { min: -1.57, max: 1.57, maxVelocity: 4.0, maxTorque: 20.0 },
  right_elbow_pitch: { min: 0.0, max: 2.36, maxVelocity: 5.0, maxTorque: 20.0 },
  right_wrist_yaw: { min: -1.57, max: 1.57, maxVelocity: 6.0, maxTorque: 5.0 },
  right_wrist_pitch: { min: -1.05, max: 1.05, maxVelocity: 6.0, maxTorque: 5.0 },
  right_wrist_roll: { min: -1.57, max: 1.57, maxVelocity: 6.0, maxTorque: 5.0 },
  // Hands
  left_grip: { min: 0.0, max: 1.0, maxVelocity: 8.0, maxTorque: 2.0 },
  left_thumb: { min: 0.0, max: 1.0, maxVelocity: 8.0, maxTorque: 2.0 },
  left_index: { min: 0.0, max: 1.0, maxVelocity: 8.0, maxTorque: 2.0 },
  right_grip: { min: 0.0, max: 1.0, maxVelocity: 8.0, maxTorque: 2.0 },
  right_thumb: { min: 0.0, max: 1.0, maxVelocity: 8.0, maxTorque: 2.0 },
  right_index: { min: 0.0, max: 1.0, maxVelocity: 8.0, maxTorque: 2.0 },
  // Left leg
  left_hip_pitch: { min: -1.57, max: 0.78, maxVelocity: 3.0, maxTorque: 80.0 },
  left_hip_roll: { min: -0.52, max: 0.78, maxVelocity: 3.0, maxTorque: 60.0 },
  left_hip_yaw: { min: -0.78, max: 0.78, maxVelocity: 3.0, maxTorque: 60.0 },
  left_knee_pitch: { min: 0.0, max: 2.36, maxVelocity: 4.0, maxTorque: 80.0 },
  left_ankle_pitch: { min: -0.78, max: 0.78, maxVelocity: 4.0, maxTorque: 40.0 },
  left_ankle_roll: { min: -0.35, max: 0.35, maxVelocity: 4.0, maxTorque: 40.0 },
  // Right leg
  right_hip_pitch: { min: -1.57, max: 0.78, maxVelocity: 3.0, maxTorque: 80.0 },
  right_hip_roll: { min: -0.78, max: 0.52, maxVelocity: 3.0, maxTorque: 60.0 },
  right_hip_yaw: { min: -0.78, max: 0.78, maxVelocity: 3.0, maxTorque: 60.0 },
  right_knee_pitch: { min: 0.0, max: 2.36, maxVelocity: 4.0, maxTorque: 80.0 },
  right_ankle_pitch: { min: -0.78, max: 0.78, maxVelocity: 4.0, maxTorque: 40.0 },
  right_ankle_roll: { min: -0.35, max: 0.35, maxVelocity: 4.0, maxTorque: 40.0 },
};

// =============================================================================
// ROBOT STATE
// =============================================================================

/**
 * Full robot state telemetry snapshot.
 */
export interface RobotState {
  /** Timestamp of measurement in milliseconds (monotonic clock) */
  timestamp: number;
  /** Sequence number for ordering */
  sequence: number;
  /** Joint states keyed by joint name */
  joints: Record<RobotJointName, JointState>;
  /** End-effector (hand) positions in robot base frame */
  endEffectors: {
    leftHand: { position: Vec3; orientation: Quat };
    rightHand: { position: Vec3; orientation: Quat };
  };
  /** Battery level 0.0 - 1.0 */
  batteryLevel: number;
  /** Battery charging status */
  isCharging: boolean;
  /** Overall robot operating mode */
  operatingMode: RobotOperatingMode;
  /** Emergency stop state */
  emergencyStopActive: boolean;
  /** Network round-trip latency in milliseconds */
  networkLatencyMs: number;
  /** Contact forces on each hand in Newtons */
  contactForces: {
    leftHand: Vec3;
    rightHand: Vec3;
  };
  /** Base position in world frame */
  basePosition: Vec3;
  /** Base orientation in world frame */
  baseOrientation: Quat;
  /** Robot health status flags */
  healthFlags: RobotHealthFlags;
}

/**
 * Robot operating modes.
 */
export type RobotOperatingMode =
  | 'idle'
  | 'teleoperation'
  | 'autonomous'
  | 'policy_streaming'
  | 'calibrating'
  | 'emergency_stop'
  | 'error';

/**
 * Health status flags.
 */
export interface RobotHealthFlags {
  motorOverheat: boolean;
  lowBattery: boolean;
  sensorFault: boolean;
  communicationLoss: boolean;
  jointLimitViolation: boolean;
  collisionDetected: boolean;
}

/**
 * Creates a default empty robot state.
 */
export function createEmptyRobotState(): RobotState {
  const defaultJoint: JointState = { angle: 0, velocity: 0, torque: 0, temperature: 25 };
  const joints = {} as Record<RobotJointName, JointState>;
  for (const name of ALL_JOINT_NAMES) {
    joints[name] = { ...defaultJoint };
  }
  return {
    timestamp: 0,
    sequence: 0,
    joints,
    endEffectors: {
      leftHand: { position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
      rightHand: { position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
    },
    batteryLevel: 1.0,
    isCharging: false,
    operatingMode: 'idle',
    emergencyStopActive: false,
    networkLatencyMs: 0,
    contactForces: {
      leftHand: { x: 0, y: 0, z: 0 },
      rightHand: { x: 0, y: 0, z: 0 },
    },
    basePosition: { x: 0, y: 0, z: 0 },
    baseOrientation: { x: 0, y: 0, z: 0, w: 1 },
    healthFlags: {
      motorOverheat: false,
      lowBattery: false,
      sensorFault: false,
      communicationLoss: false,
      jointLimitViolation: false,
      collisionDetected: false,
    },
  };
}

// =============================================================================
// IK SOLVER TYPES
// =============================================================================

/**
 * Hand tracking input from XRHand API.
 */
export interface HandTrackingInput {
  /** Which hand */
  hand: 'left' | 'right';
  /** Wrist position in VR world space */
  wristPosition: Vec3;
  /** Wrist orientation in VR world space */
  wristOrientation: Quat;
  /** Finger tip positions (thumb, index, middle, ring, pinky) */
  fingerTips: Vec3[];
  /** Finger curl values 0.0 (open) - 1.0 (closed) */
  fingerCurls: number[];
  /** Pinch strength 0.0 - 1.0 (thumb-index distance) */
  pinchStrength: number;
  /** Grip strength 0.0 - 1.0 (overall hand closure) */
  gripStrength: number;
  /** Confidence of tracking 0.0 - 1.0 */
  confidence: number;
}

/**
 * IK chain link for FABRIK solver.
 */
export interface IKChainLink {
  /** Joint name */
  jointName: RobotJointName;
  /** Length from this joint to the next in meters */
  length: number;
  /** Joint axis (normalized) */
  axis: Vec3;
  /** Joint limits */
  limits: JointLimits;
}

/**
 * Result of IK solve: target joint angles.
 */
export interface IKSolveResult {
  /** Target joint angles in radians */
  jointAngles: Partial<Record<RobotJointName, number>>;
  /** Whether the solver converged */
  converged: boolean;
  /** Remaining error distance in meters */
  residualError: number;
  /** Number of iterations used */
  iterations: number;
  /** Solve time in milliseconds */
  solveTimeMs: number;
}

/**
 * IK solver configuration.
 */
export interface IKSolverConfig {
  /** Maximum iterations per solve (default: 10) */
  maxIterations: number;
  /** Convergence threshold in meters (default: 0.005) */
  convergenceThreshold: number;
  /** Damping factor for stability (default: 0.5) */
  damping: number;
  /** Smoothing factor for temporal coherence 0.0-1.0 (default: 0.8) */
  smoothingFactor: number;
  /** VR-to-robot coordinate scaling factor (default: 1.0) */
  vrToRobotScale: number;
  /** VR-to-robot coordinate offset */
  vrToRobotOffset: Vec3;
}

/**
 * Default IK solver config.
 */
export const DEFAULT_IK_CONFIG: IKSolverConfig = {
  maxIterations: 10,
  convergenceThreshold: 0.005,
  damping: 0.5,
  smoothingFactor: 0.8,
  vrToRobotScale: 1.0,
  vrToRobotOffset: { x: 0, y: 0, z: 0 },
};

// =============================================================================
// WEBSOCKET BINARY PROTOCOL
// =============================================================================

/**
 * Binary message types for the teleoperation WebSocket protocol.
 */
export const enum WsMessageType {
  /** Client -> Robot: Joint command packet */
  JOINT_COMMAND = 0x01,
  /** Robot -> Client: Full state telemetry */
  STATE_TELEMETRY = 0x02,
  /** Client -> Robot: Policy action stream */
  POLICY_ACTION = 0x03,
  /** Robot -> Client: Camera frame (MJPEG/H.264 NAL) */
  CAMERA_FRAME = 0x04,
  /** Bidirectional: Heartbeat/keepalive */
  HEARTBEAT = 0x05,
  /** Client -> Robot: Emergency stop */
  EMERGENCY_STOP = 0x06,
  /** Client -> Robot: Resume from e-stop */
  RESUME = 0x07,
  /** Robot -> Client: Error notification */
  ERROR = 0x08,
  /** Client -> Robot: Calibration request */
  CALIBRATE = 0x09,
  /** Robot -> Client: Calibration result */
  CALIBRATION_RESULT = 0x0A,
}

/**
 * Binary message header (9 bytes).
 */
export const WS_HEADER_SIZE = 9;

/**
 * Joint command payload: one float32 per joint.
 */
export const JOINT_COMMAND_PAYLOAD_SIZE = JOINT_COUNT * 4; // 36 joints * 4 bytes = 144 bytes

/**
 * Policy action payload: action vector from GR00T N1.6.
 * 256 floats = 1024 bytes (accommodates large action spaces).
 */
export const POLICY_ACTION_SIZE = 256;
export const POLICY_ACTION_PAYLOAD_SIZE = POLICY_ACTION_SIZE * 4; // 1024 bytes

/**
 * WebSocket client configuration.
 */
export interface PolicyStreamConfig {
  /** Robot controller WebSocket URL */
  robotUrl: string;
  /** Reconnect interval in milliseconds (default: 2000) */
  reconnectIntervalMs: number;
  /** Maximum reconnect attempts (default: 10) */
  maxReconnectAttempts: number;
  /** Heartbeat interval in milliseconds (default: 1000) */
  heartbeatIntervalMs: number;
  /** Heartbeat timeout in milliseconds (default: 3000) */
  heartbeatTimeoutMs: number;
  /** Command send rate in Hz (default: 60) */
  commandRateHz: number;
  /** Enable binary compression (default: false) */
  enableCompression: boolean;
}

/**
 * Default policy stream config.
 */
export const DEFAULT_POLICY_STREAM_CONFIG: PolicyStreamConfig = {
  robotUrl: 'ws://localhost:9090',
  reconnectIntervalMs: 2000,
  maxReconnectAttempts: 10,
  heartbeatIntervalMs: 1000,
  heartbeatTimeoutMs: 3000,
  commandRateHz: 60,
  enableCompression: false,
};

// =============================================================================
// CAMERA OVERLAY TYPES
// =============================================================================

/**
 * Camera feed configuration.
 */
export interface CameraOverlayConfig {
  /** Position of overlay in VR space relative to user head */
  position: Vec3;
  /** Size of the overlay panel in meters (width, height) */
  size: { width: number; height: number };
  /** Opacity 0.0 - 1.0 (default: 0.9) */
  opacity: number;
  /** Resolution of the video texture (default: 1280x720) */
  resolution: { width: number; height: number };
  /** Whether overlay follows head gaze (default: true) */
  followGaze: boolean;
  /** Follow gaze smoothing (default: 0.1) */
  gazeSmoothing: number;
  /** Whether to show frame latency indicator (default: true) */
  showLatency: boolean;
  /** Border color as hex number (default: 0x00ff00 green) */
  borderColor: number;
  /** Border width in pixels (default: 2) */
  borderWidth: number;
}

/**
 * Default camera overlay config.
 */
export const DEFAULT_CAMERA_OVERLAY_CONFIG: CameraOverlayConfig = {
  position: { x: 0, y: 0.15, z: -0.5 },
  size: { width: 0.4, height: 0.225 },
  opacity: 0.9,
  resolution: { width: 1280, height: 720 },
  followGaze: true,
  gazeSmoothing: 0.1,
  showLatency: true,
  borderColor: 0x00ff00,
  borderWidth: 2,
};

// =============================================================================
// TELEMETRY DISPLAY TYPES
// =============================================================================

/**
 * Telemetry display configuration.
 */
export interface TelemetryDisplayConfig {
  /** Position in VR space relative to user */
  position: Vec3;
  /** Panel size in meters */
  size: { width: number; height: number };
  /** Update rate in Hz (default: 10) */
  updateRateHz: number;
  /** Show joint angle diagram (default: true) */
  showJointDiagram: boolean;
  /** Show force vectors (default: true) */
  showForceVectors: boolean;
  /** Show battery indicator (default: true) */
  showBattery: boolean;
  /** Show network latency (default: true) */
  showLatency: boolean;
  /** Warning thresholds */
  warningThresholds: TelemetryWarningThresholds;
}

/**
 * Thresholds for telemetry warnings.
 */
export interface TelemetryWarningThresholds {
  /** Battery level below which warning is shown (default: 0.2) */
  lowBattery: number;
  /** Latency above which warning is shown in ms (default: 50) */
  highLatency: number;
  /** Joint temperature above which warning is shown in C (default: 60) */
  highTemp: number;
  /** Force magnitude above which warning is shown in N (default: 50) */
  highForce: number;
}

/**
 * Default telemetry display config.
 */
export const DEFAULT_TELEMETRY_CONFIG: TelemetryDisplayConfig = {
  position: { x: 0.35, y: 0.0, z: -0.5 },
  size: { width: 0.3, height: 0.4 },
  updateRateHz: 10,
  showJointDiagram: true,
  showForceVectors: true,
  showBattery: true,
  showLatency: true,
  warningThresholds: {
    lowBattery: 0.2,
    highLatency: 50,
    highTemp: 60,
    highForce: 50,
  },
};

// =============================================================================
// SAFETY BOUNDARY TYPES
// =============================================================================

/**
 * Safety boundary shape types.
 */
export type BoundaryShape = 'box' | 'sphere' | 'cylinder';

/**
 * A safety boundary definition.
 */
export interface SafetyBoundary {
  /** Unique boundary identifier */
  id: string;
  /** Shape of the boundary */
  shape: BoundaryShape;
  /** Center position in robot base frame */
  center: Vec3;
  /** Dimensions: for box (half-extents), sphere (radius,0,0), cylinder (radius,height/2,0) */
  dimensions: Vec3;
  /** Whether this is an exclusion zone (robot cannot enter) or workspace limit */
  type: 'exclusion' | 'workspace';
  /** Soft boundary margin in meters where haptic feedback begins (default: 0.05) */
  softMargin: number;
  /** Hard boundary margin in meters where motion is blocked (default: 0.01) */
  hardMargin: number;
  /** Whether boundary is currently active */
  active: boolean;
}

/**
 * Safety system configuration.
 */
export interface SafetyBoundaryConfig {
  /** List of safety boundaries */
  boundaries: SafetyBoundary[];
  /** Enable force-feedback haptic simulation (default: true) */
  enableHaptics: boolean;
  /** Maximum haptic intensity 0.0 - 1.0 (default: 1.0) */
  maxHapticIntensity: number;
  /** Haptic pulse frequency in Hz (default: 200) */
  hapticFrequency: number;
  /** Emergency stop trigger distance in meters (default: 0.0) */
  emergencyStopDistance: number;
  /** Maximum allowed force before e-stop in Newtons (default: 100) */
  maxContactForce: number;
  /** Maximum allowed joint velocity before e-stop in rad/s (default: 5.0) */
  maxJointVelocity: number;
  /** Enable workspace visualization (default: true) */
  showBoundaryVisuals: boolean;
  /** Boundary visual color (default: 0xff4444 red) */
  boundaryColor: number;
  /** Boundary visual opacity (default: 0.3) */
  boundaryOpacity: number;
}

/**
 * Result of a boundary proximity check.
 */
export interface BoundaryProximityResult {
  /** Boundary that was checked */
  boundaryId: string;
  /** Whether the point is inside the boundary */
  isInside: boolean;
  /** Distance to boundary surface (negative if inside exclusion zone) */
  distance: number;
  /** Closest point on boundary surface */
  closestPoint: Vec3;
  /** Normal direction pointing away from boundary */
  normal: Vec3;
  /** Whether soft margin is penetrated */
  inSoftZone: boolean;
  /** Whether hard margin is penetrated */
  inHardZone: boolean;
  /** Recommended haptic intensity 0.0 - 1.0 */
  hapticIntensity: number;
}

/**
 * Default safety config with a standard workspace box.
 */
export const DEFAULT_SAFETY_CONFIG: SafetyBoundaryConfig = {
  boundaries: [
    {
      id: 'workspace',
      shape: 'box',
      center: { x: 0, y: 0.9, z: 0.3 },
      dimensions: { x: 0.8, y: 0.8, z: 0.6 },
      type: 'workspace',
      softMargin: 0.05,
      hardMargin: 0.01,
      active: true,
    },
  ],
  enableHaptics: true,
  maxHapticIntensity: 1.0,
  hapticFrequency: 200,
  emergencyStopDistance: 0.0,
  maxContactForce: 100,
  maxJointVelocity: 5.0,
  showBoundaryVisuals: true,
  boundaryColor: 0xff4444,
  boundaryOpacity: 0.3,
};

// =============================================================================
// TELEOPERATION HUB ORCHESTRATOR TYPES
// =============================================================================

/**
 * Connection state of the teleoperation system.
 */
export type TeleoperationConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

/**
 * Teleoperation hub configuration.
 */
export interface TeleoperationHubConfig {
  /** IK solver configuration */
  ikSolver: IKSolverConfig;
  /** Policy stream WebSocket configuration */
  policyStream: PolicyStreamConfig;
  /** Camera overlay configuration */
  cameraOverlay: CameraOverlayConfig;
  /** Telemetry display configuration */
  telemetry: TelemetryDisplayConfig;
  /** Safety boundary configuration */
  safety: SafetyBoundaryConfig;
  /** NPU inference model name for on-device 1-3B agent model (default: 'groot-n1.6-agent') */
  npuModelName: string;
  /** Whether to run NPU inference on-device (default: true) */
  enableNpuInference: boolean;
  /** NPU inference rate in Hz (default: 30) */
  npuInferenceRateHz: number;
}

/**
 * Default hub configuration.
 */
export const DEFAULT_HUB_CONFIG: TeleoperationHubConfig = {
  ikSolver: DEFAULT_IK_CONFIG,
  policyStream: DEFAULT_POLICY_STREAM_CONFIG,
  cameraOverlay: DEFAULT_CAMERA_OVERLAY_CONFIG,
  telemetry: DEFAULT_TELEMETRY_CONFIG,
  safety: DEFAULT_SAFETY_CONFIG,
  npuModelName: 'groot-n1.6-agent',
  enableNpuInference: true,
  npuInferenceRateHz: 30,
};

/**
 * Metrics emitted by the TeleoperationHub.
 */
export interface TeleoperationHubMetrics {
  /** Connection state */
  connectionState: TeleoperationConnectionState;
  /** Round-trip latency in ms */
  latencyMs: number;
  /** Commands sent per second */
  commandRateHz: number;
  /** Telemetry updates received per second */
  telemetryRateHz: number;
  /** Camera frame rate */
  cameraFps: number;
  /** IK solve time in ms */
  ikSolveTimeMs: number;
  /** NPU inference time in ms */
  npuInferenceTimeMs: number;
  /** Safety boundary violations count */
  boundaryViolations: number;
  /** Total frames processed */
  totalFrames: number;
  /** Uptime in seconds */
  uptimeSeconds: number;
}

/**
 * Creates default metrics.
 */
export function createEmptyMetrics(): TeleoperationHubMetrics {
  return {
    connectionState: 'disconnected',
    latencyMs: 0,
    commandRateHz: 0,
    telemetryRateHz: 0,
    cameraFps: 0,
    ikSolveTimeMs: 0,
    npuInferenceTimeMs: 0,
    boundaryViolations: 0,
    totalFrames: 0,
    uptimeSeconds: 0,
  };
}

/**
 * Event types emitted by the teleoperation hub.
 */
export type TeleoperationEventType =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'state_update'
  | 'camera_frame'
  | 'boundary_violation'
  | 'emergency_stop'
  | 'resume'
  | 'calibration_complete'
  | 'latency_warning'
  | 'battery_warning';

/**
 * Event payload.
 */
export interface TeleoperationEvent {
  type: TeleoperationEventType;
  timestamp: number;
  data?: unknown;
}

/**
 * Event listener callback.
 */
export type TeleoperationEventListener = (event: TeleoperationEvent) => void;
