/**
 * RobotPolicyStreamClient
 *
 * WebSocket client with compact binary serialization for streaming
 * GR00T N1.6 policy actions to a humanoid robot and receiving
 * telemetry and camera frames back.
 *
 * BINARY PROTOCOL:
 * ```
 *   Byte 0:     Message type (WsMessageType enum)
 *   Bytes 1-4:  Sequence number (uint32, little-endian)
 *   Bytes 5-8:  Timestamp (uint32, milliseconds, little-endian)
 *   Bytes 9+:   Payload (type-dependent)
 * ```
 *
 * JOINT COMMAND (0x01):
 *   Payload: 36 * float32 = 144 bytes (one per joint)
 *
 * POLICY ACTION (0x03):
 *   Payload: 256 * float32 = 1024 bytes (GR00T action vector)
 *
 * STATE TELEMETRY (0x02):
 *   Payload: Structured binary telemetry (variable length)
 *
 * CAMERA FRAME (0x04):
 *   Payload: [4 bytes width] [4 bytes height] [N bytes MJPEG/raw]
 *
 * DATA FLOW:
 * ```
 *   TeleoperationHub
 *       |
 *       +--[sendJointCommand]--> WebSocket --> Robot Controller
 *       +--[sendPolicyAction]--> WebSocket --> GR00T N1.6 Runtime
 *       |
 *       +--[onStateUpdate]   <-- WebSocket <-- Robot Telemetry
 *       +--[onCameraFrame]   <-- WebSocket <-- Robot Camera
 * ```
 *
 * @module RobotPolicyStreamClient
 */

import { logger } from './logger';
import type {
  Vec3,
  Quat,
  RobotState,
  RobotJointName,
  JointState,
  PolicyStreamConfig,
  RobotHealthFlags,
  TeleoperationEventListener,
  TeleoperationEvent,
} from './TeleoperationHubTypes';
import {
  WsMessageType,
  WS_HEADER_SIZE,
  JOINT_COMMAND_PAYLOAD_SIZE,
  JOINT_COUNT,
  ALL_JOINT_NAMES,
  POLICY_ACTION_SIZE,
  POLICY_ACTION_PAYLOAD_SIZE,
  DEFAULT_POLICY_STREAM_CONFIG,
  createEmptyRobotState,
} from './TeleoperationHubTypes';

// =============================================================================
// BINARY SERIALIZATION HELPERS
// =============================================================================

/**
 * Encode a binary message header.
 */
function encodeHeader(
  buffer: DataView,
  type: WsMessageType,
  sequence: number,
  timestamp: number
): void {
  buffer.setUint8(0, type);
  buffer.setUint32(1, sequence, true); // little-endian
  buffer.setUint32(5, timestamp, true);
}

/**
 * Decode a binary message header.
 */
function decodeHeader(buffer: DataView): {
  type: WsMessageType;
  sequence: number;
  timestamp: number;
} {
  return {
    type: buffer.getUint8(0) as WsMessageType,
    sequence: buffer.getUint32(1, true),
    timestamp: buffer.getUint32(5, true),
  };
}

/**
 * Decode a Vec3 from a DataView at the given offset.
 */
function decodeVec3(view: DataView, offset: number): Vec3 {
  return {
    x: view.getFloat32(offset, true),
    y: view.getFloat32(offset + 4, true),
    z: view.getFloat32(offset + 8, true),
  };
}

/**
 * Decode a Quat from a DataView at the given offset.
 */
function decodeQuat(view: DataView, offset: number): Quat {
  return {
    x: view.getFloat32(offset, true),
    y: view.getFloat32(offset + 4, true),
    z: view.getFloat32(offset + 8, true),
    w: view.getFloat32(offset + 12, true),
  };
}

// =============================================================================
// ROBOT POLICY STREAM CLIENT
// =============================================================================

export class RobotPolicyStreamClient {
  private config: PolicyStreamConfig;
  private ws: WebSocket | null = null;
  private sequence: number = 0;
  private reconnectAttempts: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private lastHeartbeatResponse: number = 0;
  private connected: boolean = false;
  private destroyed: boolean = false;

  /** Latest robot state (updated on each telemetry message). */
  private latestState: RobotState;

  /** Pre-allocated send buffers to avoid GC pressure. */
  private jointCommandBuffer: ArrayBuffer;
  private jointCommandView: DataView;
  private policyActionBuffer: ArrayBuffer;
  private policyActionView: DataView;
  private heartbeatBuffer: ArrayBuffer;
  private heartbeatView: DataView;
  private emergencyStopBuffer: ArrayBuffer;
  private emergencyStopView: DataView;

  /** Event listeners. */
  private stateListeners: Array<(state: RobotState) => void> = [];
  private cameraListeners: Array<(frame: ArrayBuffer, width: number, height: number) => void> = [];
  private eventListeners: TeleoperationEventListener[] = [];

  /** Metrics. */
  private messagesSent: number = 0;
  private messagesReceived: number = 0;
  private bytesSent: number = 0;
  private bytesReceived: number = 0;
  private latencyMs: number = 0;

  constructor(config: Partial<PolicyStreamConfig> = {}) {
    this.config = { ...DEFAULT_POLICY_STREAM_CONFIG, ...config };
    this.latestState = createEmptyRobotState();

    // Pre-allocate send buffers
    this.jointCommandBuffer = new ArrayBuffer(WS_HEADER_SIZE + JOINT_COMMAND_PAYLOAD_SIZE);
    this.jointCommandView = new DataView(this.jointCommandBuffer);

    this.policyActionBuffer = new ArrayBuffer(WS_HEADER_SIZE + POLICY_ACTION_PAYLOAD_SIZE);
    this.policyActionView = new DataView(this.policyActionBuffer);

    this.heartbeatBuffer = new ArrayBuffer(WS_HEADER_SIZE);
    this.heartbeatView = new DataView(this.heartbeatBuffer);

    this.emergencyStopBuffer = new ArrayBuffer(WS_HEADER_SIZE);
    this.emergencyStopView = new DataView(this.emergencyStopBuffer);

    logger.info('[RobotPolicyStreamClient] Initialized', {
      url: this.config.robotUrl,
      commandRate: this.config.commandRateHz,
    });
  }

  // ---------------------------------------------------------------------------
  // CONNECTION MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Connect to the robot controller WebSocket.
   */
  connect(): void {
    if (this.destroyed) {
      logger.warn('[RobotPolicyStreamClient] Cannot connect, client is destroyed');
      return;
    }
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)
    ) {
      logger.warn('[RobotPolicyStreamClient] Already connected or connecting');
      return;
    }

    logger.info('[RobotPolicyStreamClient] Connecting to', { robotUrl: this.config.robotUrl });
    this.ws = new WebSocket(this.config.robotUrl);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      this.connected = true;
      this.reconnectAttempts = 0;
      this.lastHeartbeatResponse = performance.now();
      logger.info('[RobotPolicyStreamClient] Connected');
      this.startHeartbeat();
      this.emitEvent({ type: 'connected', timestamp: Date.now() });
    };

    this.ws.onmessage = (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        this.handleBinaryMessage(event.data);
      }
    };

    this.ws.onerror = (event: Event) => {
      logger.error('[RobotPolicyStreamClient] WebSocket error');
      this.emitEvent({ type: 'error', timestamp: Date.now(), data: event });
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.stopHeartbeat();
      logger.info('[RobotPolicyStreamClient] Disconnected');
      this.emitEvent({ type: 'disconnected', timestamp: Date.now() });
      this.attemptReconnect();
    };
  }

  /**
   * Disconnect from the robot controller.
   */
  disconnect(): void {
    this.clearReconnectTimer();
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnect
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    logger.info('[RobotPolicyStreamClient] Disconnected (manual)');
  }

  /**
   * Destroy the client and release resources.
   */
  destroy(): void {
    this.destroyed = true;
    this.disconnect();
    this.stateListeners = [];
    this.cameraListeners = [];
    this.eventListeners = [];
    logger.info('[RobotPolicyStreamClient] Destroyed');
  }

  /**
   * Check if connected.
   */
  isConnected(): boolean {
    return this.connected && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // ---------------------------------------------------------------------------
  // SENDING COMMANDS
  // ---------------------------------------------------------------------------

  /**
   * Send joint angle commands to the robot.
   * Uses pre-allocated buffer to avoid GC pressure.
   *
   * @param jointAngles Partial map of joint name -> target angle (radians)
   */
  sendJointCommand(jointAngles: Partial<Record<RobotJointName, number>>): boolean {
    if (!this.isConnected()) return false;

    const seq = this.sequence++;
    const now = Date.now() & 0xffffffff;

    encodeHeader(this.jointCommandView, WsMessageType.JOINT_COMMAND, seq, now);

    // Write joint angles in order, defaulting to 0 for missing joints
    for (let i = 0; i < JOINT_COUNT; i++) {
      const name = ALL_JOINT_NAMES[i];
      const angle = jointAngles[name] ?? 0;
      this.jointCommandView.setFloat32(WS_HEADER_SIZE + i * 4, angle, true);
    }

    this.ws!.send(this.jointCommandBuffer);
    this.messagesSent++;
    this.bytesSent += this.jointCommandBuffer.byteLength;
    return true;
  }

  /**
   * Send a policy action vector (from GR00T N1.6 model output).
   *
   * @param actions Float32 action vector (up to 256 values)
   */
  sendPolicyAction(actions: Float32Array | number[]): boolean {
    if (!this.isConnected()) return false;

    const seq = this.sequence++;
    const now = Date.now() & 0xffffffff;

    encodeHeader(this.policyActionView, WsMessageType.POLICY_ACTION, seq, now);

    // Write action values
    const count = Math.min(actions.length, POLICY_ACTION_SIZE);
    for (let i = 0; i < POLICY_ACTION_SIZE; i++) {
      const val = i < count ? actions[i] : 0;
      this.policyActionView.setFloat32(WS_HEADER_SIZE + i * 4, val, true);
    }

    this.ws!.send(this.policyActionBuffer);
    this.messagesSent++;
    this.bytesSent += this.policyActionBuffer.byteLength;
    return true;
  }

  /**
   * Send emergency stop command.
   */
  sendEmergencyStop(): boolean {
    if (!this.isConnected()) return false;

    const seq = this.sequence++;
    const now = Date.now() & 0xffffffff;
    encodeHeader(this.emergencyStopView, WsMessageType.EMERGENCY_STOP, seq, now);
    this.ws!.send(this.emergencyStopBuffer);
    this.messagesSent++;
    this.bytesSent += this.emergencyStopBuffer.byteLength;
    logger.warn('[RobotPolicyStreamClient] Emergency stop sent');
    this.emitEvent({ type: 'emergency_stop', timestamp: Date.now() });
    return true;
  }

  /**
   * Send resume command (clear e-stop).
   */
  sendResume(): boolean {
    if (!this.isConnected()) return false;

    const seq = this.sequence++;
    const now = Date.now() & 0xffffffff;
    const buffer = new ArrayBuffer(WS_HEADER_SIZE);
    const view = new DataView(buffer);
    encodeHeader(view, WsMessageType.RESUME, seq, now);
    this.ws!.send(buffer);
    this.messagesSent++;
    this.bytesSent += buffer.byteLength;
    logger.info('[RobotPolicyStreamClient] Resume sent');
    this.emitEvent({ type: 'resume', timestamp: Date.now() });
    return true;
  }

  // ---------------------------------------------------------------------------
  // RECEIVING DATA
  // ---------------------------------------------------------------------------

  /**
   * Handle incoming binary message.
   */
  private handleBinaryMessage(data: ArrayBuffer): void {
    if (data.byteLength < WS_HEADER_SIZE) return;

    this.messagesReceived++;
    this.bytesReceived += data.byteLength;

    const view = new DataView(data);
    const header = decodeHeader(view);

    switch (header.type) {
      case WsMessageType.STATE_TELEMETRY:
        this.handleStateTelemetry(view, header.sequence, header.timestamp);
        break;
      case WsMessageType.CAMERA_FRAME:
        this.handleCameraFrame(data, header.timestamp);
        break;
      case WsMessageType.HEARTBEAT:
        this.handleHeartbeatResponse(header.timestamp);
        break;
      case WsMessageType.ERROR:
        this.handleError(view);
        break;
      case WsMessageType.CALIBRATION_RESULT:
        this.emitEvent({ type: 'calibration_complete', timestamp: Date.now() });
        break;
    }
  }

  /**
   * Decode state telemetry from binary.
   *
   * Layout after header (9 bytes):
   *   36 joints * (4 angle + 4 velocity + 4 torque + 4 temp) = 576 bytes
   *   2 end-effectors * (12 position + 16 orientation) = 56 bytes
   *   4 battery + 1 charging + 1 mode + 1 estop = 7 bytes
   *   4 latency = 4 bytes
   *   2 hands * 12 force = 24 bytes
   *   12 base pos + 16 base orient = 28 bytes
   *   6 health flags = 6 bytes
   *   Total payload: ~701 bytes
   */
  private handleStateTelemetry(view: DataView, sequence: number, timestamp: number): void {
    const state = this.latestState;
    state.sequence = sequence;
    state.timestamp = timestamp;

    let offset = WS_HEADER_SIZE;

    // Joints: 36 * 16 bytes = 576 bytes
    for (let i = 0; i < JOINT_COUNT; i++) {
      const name = ALL_JOINT_NAMES[i];
      if (offset + 16 <= view.byteLength) {
        state.joints[name] = {
          angle: view.getFloat32(offset, true),
          velocity: view.getFloat32(offset + 4, true),
          torque: view.getFloat32(offset + 8, true),
          temperature: view.getFloat32(offset + 12, true),
        };
        offset += 16;
      }
    }

    // End effectors: 56 bytes
    if (offset + 56 <= view.byteLength) {
      state.endEffectors.leftHand.position = decodeVec3(view, offset);
      offset += 12;
      state.endEffectors.leftHand.orientation = decodeQuat(view, offset);
      offset += 16;
      state.endEffectors.rightHand.position = decodeVec3(view, offset);
      offset += 12;
      state.endEffectors.rightHand.orientation = decodeQuat(view, offset);
      offset += 16;
    }

    // Battery + mode: 7 bytes
    if (offset + 7 <= view.byteLength) {
      state.batteryLevel = view.getFloat32(offset, true);
      offset += 4;
      state.isCharging = view.getUint8(offset) === 1;
      offset += 1;
      const modeMap = [
        'idle',
        'teleoperation',
        'autonomous',
        'policy_streaming',
        'calibrating',
        'emergency_stop',
        'error',
      ] as const;
      const modeIndex = view.getUint8(offset);
      state.operatingMode = modeMap[modeIndex] ?? 'idle';
      offset += 1;
      state.emergencyStopActive = view.getUint8(offset) === 1;
      offset += 1;
    }

    // Latency
    if (offset + 4 <= view.byteLength) {
      state.networkLatencyMs = view.getFloat32(offset, true);
      offset += 4;
    }

    // Contact forces: 24 bytes
    if (offset + 24 <= view.byteLength) {
      state.contactForces.leftHand = decodeVec3(view, offset);
      offset += 12;
      state.contactForces.rightHand = decodeVec3(view, offset);
      offset += 12;
    }

    // Base pose: 28 bytes
    if (offset + 28 <= view.byteLength) {
      state.basePosition = decodeVec3(view, offset);
      offset += 12;
      state.baseOrientation = decodeQuat(view, offset);
      offset += 16;
    }

    // Health flags: 6 bytes
    if (offset + 6 <= view.byteLength) {
      state.healthFlags = {
        motorOverheat: view.getUint8(offset) === 1,
        lowBattery: view.getUint8(offset + 1) === 1,
        sensorFault: view.getUint8(offset + 2) === 1,
        communicationLoss: view.getUint8(offset + 3) === 1,
        jointLimitViolation: view.getUint8(offset + 4) === 1,
        collisionDetected: view.getUint8(offset + 5) === 1,
      };
    }

    // Compute local latency from send timestamp
    const now = Date.now() & 0xffffffff;
    this.latencyMs = now - timestamp;
    if (this.latencyMs < 0) this.latencyMs = 0;

    // Notify listeners
    for (const listener of this.stateListeners) {
      listener(state);
    }
    this.emitEvent({ type: 'state_update', timestamp: Date.now(), data: state });
  }

  /**
   * Handle incoming camera frame.
   */
  private handleCameraFrame(data: ArrayBuffer, timestamp: number): void {
    if (data.byteLength < WS_HEADER_SIZE + 8) return;

    const view = new DataView(data);
    const width = view.getUint32(WS_HEADER_SIZE, true);
    const height = view.getUint32(WS_HEADER_SIZE + 4, true);
    const frameData = data.slice(WS_HEADER_SIZE + 8);

    for (const listener of this.cameraListeners) {
      listener(frameData, width, height);
    }
    this.emitEvent({ type: 'camera_frame', timestamp: Date.now() });
  }

  /**
   * Handle heartbeat response.
   */
  private handleHeartbeatResponse(timestamp: number): void {
    this.lastHeartbeatResponse = performance.now();
    const now = Date.now() & 0xffffffff;
    this.latencyMs = now - timestamp;
    if (this.latencyMs < 0) this.latencyMs = 0;
  }

  /**
   * Handle error message.
   */
  private handleError(view: DataView): void {
    // Error code is at offset 9 (after header)
    let errorCode = 0;
    if (view.byteLength > WS_HEADER_SIZE) {
      errorCode = view.getUint32(WS_HEADER_SIZE, true);
    }
    logger.error('[RobotPolicyStreamClient] Robot error', { errorCode });
    this.emitEvent({ type: 'error', timestamp: Date.now(), data: { errorCode } });
  }

  // ---------------------------------------------------------------------------
  // HEARTBEAT
  // ---------------------------------------------------------------------------

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (!this.isConnected()) return;

      const seq = this.sequence++;
      const now = Date.now() & 0xffffffff;
      encodeHeader(this.heartbeatView, WsMessageType.HEARTBEAT, seq, now);
      this.ws!.send(this.heartbeatBuffer);
      this.messagesSent++;
      this.bytesSent += this.heartbeatBuffer.byteLength;

      // Check for timeout
      if (this.heartbeatTimeoutTimer) clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = setTimeout(() => {
        const elapsed = performance.now() - this.lastHeartbeatResponse;
        if (elapsed > this.config.heartbeatTimeoutMs) {
          logger.warn('[RobotPolicyStreamClient] Heartbeat timeout');
          this.emitEvent({ type: 'latency_warning', timestamp: Date.now(), data: { elapsed } });
        }
      }, this.config.heartbeatTimeoutMs);
    }, this.config.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // RECONNECTION
  // ---------------------------------------------------------------------------

  private attemptReconnect(): void {
    if (this.destroyed) return;
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error('[RobotPolicyStreamClient] Max reconnect attempts reached');
      this.emitEvent({ type: 'error', timestamp: Date.now(), data: 'max_reconnect' });
      return;
    }

    this.reconnectAttempts++;
    logger.info(
      `[RobotPolicyStreamClient] Reconnecting (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`
    );
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.config.reconnectIntervalMs);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // EVENT LISTENERS
  // ---------------------------------------------------------------------------

  /**
   * Register a state update listener.
   */
  onStateUpdate(listener: (state: RobotState) => void): () => void {
    this.stateListeners.push(listener);
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Register a camera frame listener.
   */
  onCameraFrame(listener: (frame: ArrayBuffer, width: number, height: number) => void): () => void {
    this.cameraListeners.push(listener);
    return () => {
      this.cameraListeners = this.cameraListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Register a general event listener.
   */
  addEventListener(listener: TeleoperationEventListener): () => void {
    this.eventListeners.push(listener);
    return () => {
      this.eventListeners = this.eventListeners.filter((l) => l !== listener);
    };
  }

  private emitEvent(event: TeleoperationEvent): void {
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }

  // ---------------------------------------------------------------------------
  // GETTERS
  // ---------------------------------------------------------------------------

  /**
   * Get the latest robot state.
   */
  getLatestState(): Readonly<RobotState> {
    return this.latestState;
  }

  /**
   * Get current latency in milliseconds.
   */
  getLatencyMs(): number {
    return this.latencyMs;
  }

  /**
   * Get connection metrics.
   */
  getMetrics(): {
    messagesSent: number;
    messagesReceived: number;
    bytesSent: number;
    bytesReceived: number;
    latencyMs: number;
    connected: boolean;
    reconnectAttempts: number;
  } {
    return {
      messagesSent: this.messagesSent,
      messagesReceived: this.messagesReceived,
      bytesSent: this.bytesSent,
      bytesReceived: this.bytesReceived,
      latencyMs: this.latencyMs,
      connected: this.connected,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Update config at runtime.
   */
  updateConfig(partial: Partial<PolicyStreamConfig>): void {
    this.config = { ...this.config, ...partial };
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a RobotPolicyStreamClient with optional config overrides.
 */
export function createRobotPolicyStreamClient(
  config?: Partial<PolicyStreamConfig>
): RobotPolicyStreamClient {
  return new RobotPolicyStreamClient(config);
}
