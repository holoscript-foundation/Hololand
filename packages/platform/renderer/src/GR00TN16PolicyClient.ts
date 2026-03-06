/**
 * GR00TN16PolicyClient
 *
 * Connects to a GR00T N1.6 inference server via WebSocket, streams
 * observation vectors at 30Hz, receives 256-dim action vectors, maps
 * them to 37-DOF humanoid joint commands, and implements action chunking
 * with re-planning and policy mode switching.
 *
 * ARCHITECTURE:
 * ```
 *   ┌───────────────────────────────────────────────────────────────────┐
 *   │                   GR00TN16PolicyClient                           │
 *   │                                                                   │
 *   │  ┌─────────────────┐     ┌──────────────────────┐               │
 *   │  │ Observation      │     │ Action Chunk Buffer   │               │
 *   │  │ Assembler        │────>│ (K=16 future steps)   │               │
 *   │  │ (30Hz timer)     │     │ Execute first, re-plan│               │
 *   │  └─────────────────┘     └──────────────────────┘               │
 *   │          |                         |                              │
 *   │          v                         v                              │
 *   │  ┌─────────────────┐     ┌──────────────────────┐               │
 *   │  │ WebSocket Binary │     │ Action Decoder        │               │
 *   │  │ Protocol         │<--->│ (256-dim -> 37-DOF)   │               │
 *   │  │ (gRPC-Web compat)│     │ + Smoothing + Safety  │               │
 *   │  └─────────────────┘     └──────────────────────┘               │
 *   │                                    |                              │
 *   │  ┌─────────────────┐              v                              │
 *   │  │ Policy Mode      │     ┌──────────────────────┐               │
 *   │  │ Controller       │────>│ Joint Command Output   │              │
 *   │  │ (manip/nav/bi)   │     │ (-> TeleoperationHub)  │              │
 *   │  └─────────────────┘     └──────────────────────┘               │
 *   └───────────────────────────────────────────────────────────────────┘
 * ```
 *
 * DATA FLOW (per observation cycle at 30Hz):
 * ```
 *   1. Assemble observation: joint states + camera embedding + proprioception
 *   2. Serialize to binary and send over WebSocket
 *   3. [Async] Server runs GR00T N1.6 inference
 *   4. Receive action chunk (K=16 steps of 256-dim actions)
 *   5. Execute step 0, advance index, re-plan at executeHorizon
 *   6. Decode 256-dim to 37-DOF joint targets
 *   7. Apply smoothing and safety clamps
 *   8. Output joint commands to TeleoperationHub
 * ```
 *
 * @module GR00TN16PolicyClient
 */

import { logger } from './logger';
import type {
  RobotState,
  RobotJointName,
} from './TeleoperationHubTypes';
import {
  ALL_JOINT_NAMES,
  JOINT_COUNT,
  createEmptyRobotState,
} from './TeleoperationHubTypes';
import type {
  GR00TObservation,
  GR00TActionChunk,
  GR00TActionStep,
  GR00TN16Config,
  GR00TN16Metrics,
  GR00TPolicyMode,
  GR00TConnectionState,
  GR00TEventListener,
  GR00TEvent,
  GR00TJointName,
  PolicyModeConfig,
  ActionChunkingConfig,
} from './GR00TN16PolicyClientTypes';
import {
  OBSERVATION_TOTAL_DIM,
  OBSERVATION_JOINT_DIM,
  OBSERVATION_EMBEDDING_DIM,
  OBSERVATION_PROPRIOCEPTIVE_DIM,
  OBSERVATION_TASK_DIM,
  OBSERVATION_JOINT_FIELDS,
  OBSERVATION_JOINT_COUNT,
  ACTION_DIM,
  ACTION_TO_JOINT_OFFSET,
  ACTION_JOINT_COUNT,
  GROOT_37DOF_JOINT_NAMES,
  DEFAULT_GROOT_N16_CONFIG,
  DEFAULT_POLICY_MODES,
  GR00TMessageType,
  GROOT_HEADER_SIZE,
  createEmptyGR00TMetrics,
} from './GR00TN16PolicyClientTypes';

// =============================================================================
// BINARY SERIALIZATION HELPERS
// =============================================================================

/**
 * Encode a GR00T protocol header into a DataView.
 */
function encodeGR00THeader(
  view: DataView,
  type: GR00TMessageType,
  sequence: number,
  timestamp: number,
): void {
  view.setUint8(0, type);
  view.setUint32(1, sequence, true);
  view.setUint32(5, timestamp, true);
}

/**
 * Decode a GR00T protocol header from a DataView.
 */
function decodeGR00THeader(view: DataView): {
  type: GR00TMessageType;
  sequence: number;
  timestamp: number;
} {
  return {
    type: view.getUint8(0) as GR00TMessageType,
    sequence: view.getUint32(1, true),
    timestamp: view.getUint32(5, true),
  };
}

// =============================================================================
// GR00T N1.6 POLICY CLIENT
// =============================================================================

export class GR00TN16PolicyClient {
  private config: GR00TN16Config;

  /** WebSocket connection to inference server. */
  private ws: WebSocket | null = null;
  private sequence: number = 0;
  private reconnectAttempts: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private lastHeartbeatResponse: number = 0;
  private connected: boolean = false;
  private destroyed: boolean = false;

  /** Connection state. */
  private connectionState: GR00TConnectionState = 'disconnected';

  /** Observation streaming. */
  private observationTimer: ReturnType<typeof setInterval> | null = null;
  private observationIntervalMs: number;
  private lastObservationTime: number = 0;
  private observationCount: number = 0;

  /** Current robot state (fed from TeleoperationHub). */
  private currentRobotState: RobotState;

  /** Current camera frame embedding (fed from vision encoder). */
  private currentCameraEmbedding: Float32Array;

  /** Current policy mode. */
  private policyMode: GR00TPolicyMode;
  private pendingPolicySwitch: GR00TPolicyMode | null = null;

  /** Action chunking state. */
  private currentChunk: GR00TActionChunk | null = null;
  private previousChunk: GR00TActionChunk | null = null;
  private chunkingConfig: ActionChunkingConfig;

  /** Pre-allocated observation send buffer. */
  private observationBuffer: ArrayBuffer;
  private observationView: DataView;

  /** Pre-allocated policy switch buffer. */
  private policySwitchBuffer: ArrayBuffer;
  private policySwitchView: DataView;

  /** Smoothed joint targets for output. */
  private smoothedJointTargets: Float32Array;
  private previousJointTargets: Float32Array;

  /** Metrics. */
  private metrics: GR00TN16Metrics;
  private inferenceLatencies: number[] = [];
  private maxLatencyHistory: number = 30;

  /** Event listeners. */
  private eventListeners: GR00TEventListener[] = [];

  /** Action output listeners (consumers like TeleoperationHub). */
  private actionListeners: Array<(jointTargets: Partial<Record<RobotJointName, number>>) => void> = [];

  constructor(config: Partial<GR00TN16Config> = {}) {
    this.config = {
      ...DEFAULT_GROOT_N16_CONFIG,
      ...config,
      actionChunking: {
        ...DEFAULT_GROOT_N16_CONFIG.actionChunking,
        ...config.actionChunking,
      },
      cameraEmbedding: {
        ...DEFAULT_GROOT_N16_CONFIG.cameraEmbedding,
        ...config.cameraEmbedding,
      },
    };

    this.observationIntervalMs = 1000 / this.config.observationRateHz;
    this.currentRobotState = createEmptyRobotState();
    this.currentCameraEmbedding = new Float32Array(OBSERVATION_EMBEDDING_DIM);
    this.policyMode = this.config.initialPolicyMode;
    this.chunkingConfig = this.config.actionChunking;
    this.metrics = createEmptyGR00TMetrics();
    this.metrics.policyMode = this.policyMode;

    // Pre-allocate buffers
    // Observation: header + (756 floats * 4 bytes) + 1 byte policy mode + 4 bytes chunk size
    const obsPayloadSize = OBSERVATION_TOTAL_DIM * 4 + 1 + 4;
    this.observationBuffer = new ArrayBuffer(GROOT_HEADER_SIZE + obsPayloadSize);
    this.observationView = new DataView(this.observationBuffer);

    // Policy switch: header + 1 byte mode + variable policy head ID (max 64 bytes)
    this.policySwitchBuffer = new ArrayBuffer(GROOT_HEADER_SIZE + 65);
    this.policySwitchView = new DataView(this.policySwitchBuffer);

    // Smoothed output
    this.smoothedJointTargets = new Float32Array(ACTION_JOINT_COUNT);
    this.previousJointTargets = new Float32Array(ACTION_JOINT_COUNT);

    logger.info('[GR00TN16PolicyClient] Initialized', {
      serverUrl: this.config.serverUrl,
      observationRate: this.config.observationRateHz,
      chunkSize: this.chunkingConfig.chunkSize,
      executeHorizon: this.chunkingConfig.executeHorizon,
      policyMode: this.policyMode,
    });
  }

  // ---------------------------------------------------------------------------
  // CONNECTION MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Connect to the GR00T N1.6 inference server.
   */
  connect(): void {
    if (this.destroyed) {
      logger.warn('[GR00TN16PolicyClient] Cannot connect, client is destroyed');
      return;
    }
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      logger.warn('[GR00TN16PolicyClient] Already connected or connecting');
      return;
    }

    this.connectionState = 'connecting';
    this.metrics.connectionState = 'connecting';
    logger.info('[GR00TN16PolicyClient] Connecting to', this.config.serverUrl);

    this.ws = new WebSocket(this.config.serverUrl);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      this.connected = true;
      this.connectionState = 'connected';
      this.metrics.connectionState = 'connected';
      this.reconnectAttempts = 0;
      this.lastHeartbeatResponse = performance.now();
      logger.info('[GR00TN16PolicyClient] Connected');
      this.startHeartbeat();
      this.emitEvent({ type: 'connected', timestamp: Date.now() });
    };

    this.ws.onmessage = (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        this.handleBinaryMessage(event.data);
      }
    };

    this.ws.onerror = () => {
      logger.error('[GR00TN16PolicyClient] WebSocket error');
      this.connectionState = 'error';
      this.metrics.connectionState = 'error';
      this.emitEvent({ type: 'error', timestamp: Date.now() });
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.connectionState = 'disconnected';
      this.metrics.connectionState = 'disconnected';
      this.stopHeartbeat();
      this.stopObservationStreaming();
      logger.info('[GR00TN16PolicyClient] Disconnected');
      this.emitEvent({ type: 'disconnected', timestamp: Date.now() });
      this.attemptReconnect();
    };
  }

  /**
   * Disconnect from the inference server.
   */
  disconnect(): void {
    this.clearReconnectTimer();
    this.stopHeartbeat();
    this.stopObservationStreaming();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.connectionState = 'disconnected';
    this.metrics.connectionState = 'disconnected';
    logger.info('[GR00TN16PolicyClient] Disconnected (manual)');
  }

  /**
   * Check if connected.
   */
  isConnected(): boolean {
    return this.connected && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state.
   */
  getConnectionState(): GR00TConnectionState {
    return this.connectionState;
  }

  // ---------------------------------------------------------------------------
  // OBSERVATION STREAMING (30Hz)
  // ---------------------------------------------------------------------------

  /**
   * Start streaming observations at the configured rate.
   * Call this after connect() succeeds.
   */
  startObservationStreaming(): void {
    if (this.observationTimer !== null) return;
    if (!this.isConnected()) {
      logger.warn('[GR00TN16PolicyClient] Cannot start streaming, not connected');
      return;
    }

    this.observationTimer = setInterval(() => {
      this.sendObservation();
    }, this.observationIntervalMs);

    logger.info('[GR00TN16PolicyClient] Observation streaming started at', this.config.observationRateHz, 'Hz');
  }

  /**
   * Stop observation streaming.
   */
  stopObservationStreaming(): void {
    if (this.observationTimer !== null) {
      clearInterval(this.observationTimer);
      this.observationTimer = null;
      logger.info('[GR00TN16PolicyClient] Observation streaming stopped');
    }
  }

  /**
   * Check if observation streaming is active.
   */
  isStreaming(): boolean {
    return this.observationTimer !== null;
  }

  /**
   * Update the robot state used for observation assembly.
   * Called by TeleoperationHub on every robot state update.
   */
  updateRobotState(state: RobotState): void {
    this.currentRobotState = state;
  }

  /**
   * Update the camera frame embedding.
   * Called by the vision encoder pipeline after processing a camera frame.
   */
  updateCameraEmbedding(embedding: Float32Array): void {
    if (embedding.length !== OBSERVATION_EMBEDDING_DIM) {
      logger.warn('[GR00TN16PolicyClient] Camera embedding dimension mismatch:', embedding.length);
      return;
    }
    this.currentCameraEmbedding = embedding;
  }

  /**
   * Assemble and send an observation vector to the inference server.
   */
  private sendObservation(): void {
    if (!this.isConnected() || this.policyMode === 'idle') return;

    const seq = this.sequence++;
    const now = Date.now() & 0xFFFFFFFF;

    encodeGR00THeader(this.observationView, GR00TMessageType.OBSERVATION, seq, now);

    let offset = GROOT_HEADER_SIZE;

    // --- Joint states: 37 joints x 4 fields = 148 floats ---
    for (let j = 0; j < OBSERVATION_JOINT_COUNT; j++) {
      const jointName = GROOT_37DOF_JOINT_NAMES[j];
      // Map to existing 36-joint set, default 0 for torso_lateral
      const baseJointName = jointName as RobotJointName;
      const jointState = this.currentRobotState.joints[baseJointName];

      if (jointState) {
        this.observationView.setFloat32(offset, jointState.angle, true);
        this.observationView.setFloat32(offset + 4, jointState.velocity, true);
        this.observationView.setFloat32(offset + 8, jointState.torque, true);
        this.observationView.setFloat32(offset + 12, jointState.temperature, true);
      } else {
        // torso_lateral or missing joint: write zeros
        this.observationView.setFloat32(offset, 0, true);
        this.observationView.setFloat32(offset + 4, 0, true);
        this.observationView.setFloat32(offset + 8, 0, true);
        this.observationView.setFloat32(offset + 12, 0, true);
      }
      offset += OBSERVATION_JOINT_FIELDS * 4;
    }

    // --- Camera embedding: 512 floats ---
    const modeConfig = DEFAULT_POLICY_MODES[this.policyMode];
    if (modeConfig.usesCameraEmbedding) {
      for (let i = 0; i < OBSERVATION_EMBEDDING_DIM; i++) {
        this.observationView.setFloat32(offset + i * 4, this.currentCameraEmbedding[i] || 0, true);
      }
    } else {
      // Zero out embedding for modes that don't use it
      for (let i = 0; i < OBSERVATION_EMBEDDING_DIM; i++) {
        this.observationView.setFloat32(offset + i * 4, 0, true);
      }
    }
    offset += OBSERVATION_EMBEDDING_DIM * 4;

    // --- Proprioceptive context: 64 floats ---
    this.writeProprioceptive(offset);
    offset += OBSERVATION_PROPRIOCEPTIVE_DIM * 4;

    // --- Task context: 32 floats ---
    this.writeTaskContext(offset);
    offset += OBSERVATION_TASK_DIM * 4;

    // --- Policy mode (1 byte) ---
    const modeIndex = ['manipulation', 'navigation', 'bimanual', 'idle'].indexOf(this.policyMode);
    this.observationView.setUint8(offset, modeIndex >= 0 ? modeIndex : 0);
    offset += 1;

    // --- Requested chunk size (4 bytes) ---
    this.observationView.setUint32(offset, this.chunkingConfig.chunkSize, true);
    offset += 4;

    this.ws!.send(this.observationBuffer);
    this.observationCount++;
    this.metrics.observationsSent = this.observationCount;
    this.metrics.bytesSent += this.observationBuffer.byteLength;

    // Track actual observation rate
    const currentTime = performance.now();
    if (this.lastObservationTime > 0) {
      const dt = currentTime - this.lastObservationTime;
      this.metrics.actualObservationRateHz = dt > 0 ? 1000 / dt : 0;
    }
    this.lastObservationTime = currentTime;
  }

  /**
   * Write proprioceptive context into the observation buffer.
   * Layout: base position (3) + base orientation (4) + left EE pos (3) + left EE rot (4) +
   *         right EE pos (3) + right EE rot (4) + left contact force (3) + right contact force (3) +
   *         battery (1) + latency (1) + padding (35) = 64 floats
   */
  private writeProprioceptive(bufferOffset: number): void {
    const s = this.currentRobotState;
    let i = 0;

    const writeFloat = (val: number): void => {
      this.observationView.setFloat32(bufferOffset + i * 4, val, true);
      i++;
    };

    // Base pose
    writeFloat(s.basePosition.x);
    writeFloat(s.basePosition.y);
    writeFloat(s.basePosition.z);
    writeFloat(s.baseOrientation.x);
    writeFloat(s.baseOrientation.y);
    writeFloat(s.baseOrientation.z);
    writeFloat(s.baseOrientation.w);

    // End-effector poses
    writeFloat(s.endEffectors.leftHand.position.x);
    writeFloat(s.endEffectors.leftHand.position.y);
    writeFloat(s.endEffectors.leftHand.position.z);
    writeFloat(s.endEffectors.leftHand.orientation.x);
    writeFloat(s.endEffectors.leftHand.orientation.y);
    writeFloat(s.endEffectors.leftHand.orientation.z);
    writeFloat(s.endEffectors.leftHand.orientation.w);
    writeFloat(s.endEffectors.rightHand.position.x);
    writeFloat(s.endEffectors.rightHand.position.y);
    writeFloat(s.endEffectors.rightHand.position.z);
    writeFloat(s.endEffectors.rightHand.orientation.x);
    writeFloat(s.endEffectors.rightHand.orientation.y);
    writeFloat(s.endEffectors.rightHand.orientation.z);
    writeFloat(s.endEffectors.rightHand.orientation.w);

    // Contact forces
    writeFloat(s.contactForces.leftHand.x);
    writeFloat(s.contactForces.leftHand.y);
    writeFloat(s.contactForces.leftHand.z);
    writeFloat(s.contactForces.rightHand.x);
    writeFloat(s.contactForces.rightHand.y);
    writeFloat(s.contactForces.rightHand.z);

    // Battery and latency
    writeFloat(s.batteryLevel);
    writeFloat(s.networkLatencyMs / 1000); // Normalize to seconds

    // Padding to 64
    while (i < OBSERVATION_PROPRIOCEPTIVE_DIM) {
      writeFloat(0);
    }
  }

  /**
   * Write task context into the observation buffer.
   * Layout: policy mode one-hot (4) + chunk progress (1) + padding (27) = 32 floats
   */
  private writeTaskContext(bufferOffset: number): void {
    let i = 0;
    const writeFloat = (val: number): void => {
      this.observationView.setFloat32(bufferOffset + i * 4, val, true);
      i++;
    };

    // One-hot policy mode
    const modes: GR00TPolicyMode[] = ['manipulation', 'navigation', 'bimanual', 'idle'];
    for (const mode of modes) {
      writeFloat(mode === this.policyMode ? 1.0 : 0.0);
    }

    // Chunk execution progress
    const progress = this.currentChunk
      ? this.currentChunk.executionIndex / this.chunkingConfig.chunkSize
      : 0;
    writeFloat(progress);

    // Padding to 32
    while (i < OBSERVATION_TASK_DIM) {
      writeFloat(0);
    }
  }

  // ---------------------------------------------------------------------------
  // RECEIVING ACTIONS
  // ---------------------------------------------------------------------------

  /**
   * Handle incoming binary message from the inference server.
   */
  private handleBinaryMessage(data: ArrayBuffer): void {
    if (data.byteLength < GROOT_HEADER_SIZE) return;

    this.metrics.bytesReceived += data.byteLength;
    const view = new DataView(data);
    const header = decodeGR00THeader(view);

    switch (header.type) {
      case GR00TMessageType.ACTION_CHUNK:
        this.handleActionChunk(view, header.sequence, header.timestamp);
        break;
      case GR00TMessageType.POLICY_SWITCH_ACK:
        this.handlePolicySwitchAck(view);
        break;
      case GR00TMessageType.HEARTBEAT:
        this.handleHeartbeatResponse(header.timestamp);
        break;
      case GR00TMessageType.INFERENCE_ERROR:
        this.handleInferenceError(view);
        break;
      case GR00TMessageType.SERVER_STATUS:
        this.handleServerStatus(view);
        break;
    }
  }

  /**
   * Decode and store an action chunk from the inference server.
   *
   * Binary layout after header:
   *   [4 bytes: observation sequence this responds to]
   *   [4 bytes: inference latency ms (float32)]
   *   [4 bytes: chunk size K (uint32)]
   *   [K * (ACTION_DIM * 4 + 4) bytes: K action steps, each with 256 floats + 1 confidence float]
   */
  private handleActionChunk(view: DataView, _sequence: number, timestamp: number): void {
    let offset = GROOT_HEADER_SIZE;

    // Observation sequence
    const obsSequence = view.getUint32(offset, true);
    offset += 4;

    // Inference latency
    const inferenceLatency = view.getFloat32(offset, true);
    offset += 4;

    // Chunk size
    const chunkSize = view.getUint32(offset, true);
    offset += 4;

    // Check for timeout
    if (inferenceLatency > this.config.maxInferenceLatencyMs) {
      this.metrics.chunksDropped++;
      this.emitEvent({
        type: 'inference_timeout',
        timestamp: Date.now(),
        data: { latency: inferenceLatency },
      });
      // Don't replace current chunk - keep executing the existing one
      return;
    }

    // Track latency
    this.inferenceLatencies.push(inferenceLatency);
    if (this.inferenceLatencies.length > this.maxLatencyHistory) {
      this.inferenceLatencies.shift();
    }
    this.metrics.avgInferenceLatencyMs =
      this.inferenceLatencies.reduce((a, b) => a + b, 0) / this.inferenceLatencies.length;

    // Decode action steps
    const steps: GR00TActionStep[] = [];
    const effectiveChunkSize = Math.min(chunkSize, this.chunkingConfig.chunkSize);

    for (let s = 0; s < effectiveChunkSize; s++) {
      const rawAction = new Float32Array(ACTION_DIM);
      for (let a = 0; a < ACTION_DIM; a++) {
        if (offset + 4 <= view.byteLength) {
          rawAction[a] = view.getFloat32(offset, true);
          offset += 4;
        }
      }

      let confidence = 1.0;
      if (offset + 4 <= view.byteLength) {
        confidence = view.getFloat32(offset, true);
        offset += 4;
      }

      // Decode 256-dim action to 37-DOF joint targets
      const jointTargets = this.decodeActionToJoints(rawAction);

      steps.push({
        rawAction,
        jointTargets,
        confidence,
        stepIndex: s,
      });
    }

    // Store previous chunk for blending
    this.previousChunk = this.currentChunk;

    // Create new chunk
    this.currentChunk = {
      observationSequence: obsSequence,
      inferenceTimestamp: timestamp,
      inferenceLatencyMs: inferenceLatency,
      steps,
      executionIndex: 0,
      exhausted: false,
      policyMode: this.policyMode,
    };

    this.metrics.actionChunksReceived++;
    this.emitEvent({
      type: 'action_chunk_received',
      timestamp: Date.now(),
      data: {
        chunkSize: steps.length,
        inferenceLatency,
        obsSequence,
      },
    });
  }

  /**
   * Decode a 256-dim action vector to 37-DOF joint targets.
   * The first 37 dimensions map directly to joint angles (delta from current).
   * Applies policy mode masking (frozen joints get 0 delta).
   */
  private decodeActionToJoints(rawAction: Float32Array): Float32Array {
    const jointTargets = new Float32Array(ACTION_JOINT_COUNT);
    const modeConfig = DEFAULT_POLICY_MODES[this.policyMode];
    const activeSet = new Set<string>(modeConfig.activeJoints);

    for (let j = 0; j < ACTION_JOINT_COUNT; j++) {
      const jointName = GROOT_37DOF_JOINT_NAMES[j];
      if (activeSet.has(jointName)) {
        // Active joint: apply action delta, clamped by max magnitude
        let delta = rawAction[ACTION_TO_JOINT_OFFSET + j];
        delta = Math.max(-modeConfig.maxActionMagnitude, Math.min(modeConfig.maxActionMagnitude, delta));
        jointTargets[j] = delta;
      } else {
        // Frozen joint: zero delta
        jointTargets[j] = 0;
      }
    }

    return jointTargets;
  }

  // ---------------------------------------------------------------------------
  // ACTION CHUNKING + EXECUTION
  // ---------------------------------------------------------------------------

  /**
   * Get the next joint command from the action chunk buffer.
   * Implements the action chunking execution logic:
   *   - Execute the current step from the chunk
   *   - Advance the execution index
   *   - Request re-plan when executeHorizon is reached
   *   - Blend with previous chunk if available and configured
   *
   * Call this at the robot command rate (e.g. 30Hz or 60Hz).
   *
   * @returns Joint angle delta targets mapped to base 36-DOF, or null if no action available
   */
  getNextAction(): Partial<Record<RobotJointName, number>> | null {
    if (!this.currentChunk || this.currentChunk.exhausted || this.policyMode === 'idle') {
      return null;
    }

    const chunk = this.currentChunk;
    const idx = chunk.executionIndex;

    if (idx >= chunk.steps.length) {
      chunk.exhausted = true;
      this.emitEvent({ type: 'chunk_exhausted', timestamp: Date.now() });
      return null;
    }

    const step = chunk.steps[idx];

    // Check confidence threshold
    if (step.confidence < this.chunkingConfig.confidenceThreshold) {
      // Low confidence: skip to next step or exhaust chunk
      chunk.executionIndex++;
      this.metrics.actionsExecuted++;
      return null;
    }

    // Get raw joint targets for this step
    let jointTargets = step.jointTargets;

    // Apply exponential weighting if enabled (later steps have lower weight)
    if (this.chunkingConfig.useExponentialWeighting && idx > 0) {
      const weight = Math.pow(this.chunkingConfig.weightDecay, idx);
      jointTargets = new Float32Array(jointTargets.length);
      for (let j = 0; j < jointTargets.length; j++) {
        jointTargets[j] = step.jointTargets[j] * weight;
      }
    }

    // Blend with previous chunk if overlapping
    if (this.config.enableActionSmoothing && this.previousChunk && !this.previousChunk.exhausted) {
      const prevIdx = this.previousChunk.executionIndex + idx;
      if (prevIdx < this.previousChunk.steps.length) {
        const prevTargets = this.previousChunk.steps[prevIdx].jointTargets;
        const alpha = this.config.actionSmoothingAlpha;
        for (let j = 0; j < ACTION_JOINT_COUNT; j++) {
          this.smoothedJointTargets[j] = alpha * jointTargets[j] + (1 - alpha) * prevTargets[j];
        }
        jointTargets = this.smoothedJointTargets;
      }
    }

    // Apply temporal smoothing between consecutive actions
    if (this.config.enableActionSmoothing) {
      const blend = this.chunkingConfig.chunkBlendFactor;
      for (let j = 0; j < ACTION_JOINT_COUNT; j++) {
        this.smoothedJointTargets[j] = blend * jointTargets[j] + (1 - blend) * this.previousJointTargets[j];
      }
      this.previousJointTargets.set(this.smoothedJointTargets);
      jointTargets = this.smoothedJointTargets;
    }

    // Map 37-DOF targets to base 36-DOF RobotJointName record
    const result: Partial<Record<RobotJointName, number>> = {};
    for (let j = 0; j < ACTION_JOINT_COUNT; j++) {
      const jointName = GROOT_37DOF_JOINT_NAMES[j];
      // Skip torso_lateral (not in base 36-DOF set)
      if (jointName === 'torso_lateral') continue;
      const baseJointName = jointName as RobotJointName;
      // Compute absolute target: current angle + delta
      const currentAngle = this.currentRobotState.joints[baseJointName]?.angle ?? 0;
      result[baseJointName] = currentAngle + jointTargets[j];
    }

    // Advance execution index
    chunk.executionIndex++;
    this.metrics.actionsExecuted++;
    this.metrics.chunkProgress = chunk.executionIndex / chunk.steps.length;

    // Notify action listeners
    for (const listener of this.actionListeners) {
      listener(result);
    }

    return result;
  }

  /**
   * Check whether re-planning is needed.
   * Returns true when we have executed executeHorizon steps from the current chunk.
   */
  needsReplan(): boolean {
    if (!this.currentChunk) return true;
    return this.currentChunk.executionIndex >= this.chunkingConfig.executeHorizon;
  }

  /**
   * Get the current action chunk (if any).
   */
  getCurrentChunk(): Readonly<GR00TActionChunk> | null {
    return this.currentChunk;
  }

  // ---------------------------------------------------------------------------
  // POLICY MODE SWITCHING
  // ---------------------------------------------------------------------------

  /**
   * Switch to a different policy mode.
   * Sends a switch request to the server and waits for acknowledgment.
   *
   * @param mode The target policy mode
   * @returns true if the switch request was sent
   */
  switchPolicy(mode: GR00TPolicyMode): boolean {
    if (!this.isConnected()) {
      logger.warn('[GR00TN16PolicyClient] Cannot switch policy, not connected');
      return false;
    }
    if (mode === this.policyMode) {
      logger.info('[GR00TN16PolicyClient] Already in', mode, 'mode');
      return true;
    }

    this.pendingPolicySwitch = mode;

    const seq = this.sequence++;
    const now = Date.now() & 0xFFFFFFFF;
    encodeGR00THeader(this.policySwitchView, GR00TMessageType.POLICY_SWITCH, seq, now);

    // Write mode index
    const modeIndex = ['manipulation', 'navigation', 'bimanual', 'idle'].indexOf(mode);
    this.policySwitchView.setUint8(GROOT_HEADER_SIZE, modeIndex >= 0 ? modeIndex : 0);

    // Write policy head ID
    const modeConfig = DEFAULT_POLICY_MODES[mode];
    const encoder = new TextEncoder();
    const headIdBytes = encoder.encode(modeConfig.policyHeadId);
    const headIdLen = Math.min(headIdBytes.length, 64);
    for (let i = 0; i < headIdLen; i++) {
      this.policySwitchView.setUint8(GROOT_HEADER_SIZE + 1 + i, headIdBytes[i]);
    }

    this.ws!.send(new Uint8Array(this.policySwitchBuffer, 0, GROOT_HEADER_SIZE + 1 + headIdLen));
    this.metrics.bytesSent += GROOT_HEADER_SIZE + 1 + headIdLen;

    logger.info('[GR00TN16PolicyClient] Policy switch requested:', mode);
    return true;
  }

  /**
   * Handle policy switch acknowledgment from server.
   */
  private handlePolicySwitchAck(view: DataView): void {
    if (view.byteLength < GROOT_HEADER_SIZE + 2) return;

    const success = view.getUint8(GROOT_HEADER_SIZE) === 1;
    const modeIndex = view.getUint8(GROOT_HEADER_SIZE + 1);
    const modes: GR00TPolicyMode[] = ['manipulation', 'navigation', 'bimanual', 'idle'];
    const confirmedMode = modes[modeIndex] ?? 'idle';

    if (success && this.pendingPolicySwitch) {
      this.policyMode = confirmedMode;
      this.metrics.policyMode = confirmedMode;
      this.metrics.policySwitchCount++;
      this.pendingPolicySwitch = null;

      // Clear current chunk since policy changed
      this.currentChunk = null;
      this.previousChunk = null;
      this.smoothedJointTargets.fill(0);
      this.previousJointTargets.fill(0);

      logger.info('[GR00TN16PolicyClient] Policy switched to:', confirmedMode);
      this.emitEvent({
        type: 'policy_switched',
        timestamp: Date.now(),
        data: { mode: confirmedMode },
      });
    } else {
      this.pendingPolicySwitch = null;
      logger.warn('[GR00TN16PolicyClient] Policy switch failed');
      this.emitEvent({
        type: 'policy_switch_failed',
        timestamp: Date.now(),
        data: { requestedMode: this.pendingPolicySwitch },
      });
    }
  }

  /**
   * Get the current policy mode.
   */
  getPolicyMode(): GR00TPolicyMode {
    return this.policyMode;
  }

  /**
   * Get the config for the current policy mode.
   */
  getPolicyModeConfig(): PolicyModeConfig {
    return DEFAULT_POLICY_MODES[this.policyMode];
  }

  // ---------------------------------------------------------------------------
  // HEARTBEAT
  // ---------------------------------------------------------------------------

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (!this.isConnected()) return;

      const seq = this.sequence++;
      const now = Date.now() & 0xFFFFFFFF;
      const buffer = new ArrayBuffer(GROOT_HEADER_SIZE);
      const view = new DataView(buffer);
      encodeGR00THeader(view, GR00TMessageType.HEARTBEAT, seq, now);
      this.ws!.send(buffer);
      this.metrics.bytesSent += buffer.byteLength;

      // Check for timeout
      if (this.heartbeatTimeoutTimer) clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = setTimeout(() => {
        const elapsed = performance.now() - this.lastHeartbeatResponse;
        if (elapsed > this.config.heartbeatTimeoutMs) {
          logger.warn('[GR00TN16PolicyClient] Heartbeat timeout');
          this.emitEvent({ type: 'error', timestamp: Date.now(), data: 'heartbeat_timeout' });
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

  private handleHeartbeatResponse(timestamp: number): void {
    this.lastHeartbeatResponse = performance.now();
  }

  // ---------------------------------------------------------------------------
  // ERROR HANDLING
  // ---------------------------------------------------------------------------

  private handleInferenceError(view: DataView): void {
    let errorCode = 0;
    if (view.byteLength > GROOT_HEADER_SIZE) {
      errorCode = view.getUint32(GROOT_HEADER_SIZE, true);
    }
    logger.error('[GR00TN16PolicyClient] Inference error:', errorCode);
    this.emitEvent({ type: 'error', timestamp: Date.now(), data: { errorCode } });
  }

  private handleServerStatus(view: DataView): void {
    // Parse server status (model loaded, GPU utilization, etc.)
    this.emitEvent({ type: 'server_status', timestamp: Date.now() });
  }

  // ---------------------------------------------------------------------------
  // RECONNECTION
  // ---------------------------------------------------------------------------

  private attemptReconnect(): void {
    if (this.destroyed) return;
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error('[GR00TN16PolicyClient] Max reconnect attempts reached');
      this.emitEvent({ type: 'error', timestamp: Date.now(), data: 'max_reconnect' });
      return;
    }

    this.reconnectAttempts++;
    this.connectionState = 'reconnecting';
    this.metrics.connectionState = 'reconnecting';
    logger.info(`[GR00TN16PolicyClient] Reconnecting (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

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
   * Register an event listener.
   */
  addEventListener(listener: GR00TEventListener): () => void {
    this.eventListeners.push(listener);
    return () => {
      this.eventListeners = this.eventListeners.filter(l => l !== listener);
    };
  }

  /**
   * Register an action output listener.
   * Called every time a new joint command is produced by getNextAction().
   */
  onAction(listener: (jointTargets: Partial<Record<RobotJointName, number>>) => void): () => void {
    this.actionListeners.push(listener);
    return () => {
      this.actionListeners = this.actionListeners.filter(l => l !== listener);
    };
  }

  private emitEvent(event: GR00TEvent): void {
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }

  // ---------------------------------------------------------------------------
  // GETTERS
  // ---------------------------------------------------------------------------

  /**
   * Get current metrics.
   */
  getMetrics(): Readonly<GR00TN16Metrics> {
    return { ...this.metrics };
  }

  /**
   * Get the action chunking config.
   */
  getChunkingConfig(): Readonly<ActionChunkingConfig> {
    return { ...this.chunkingConfig };
  }

  /**
   * Update action chunking config at runtime.
   */
  updateChunkingConfig(partial: Partial<ActionChunkingConfig>): void {
    this.chunkingConfig = { ...this.chunkingConfig, ...partial };
  }

  /**
   * Update client config at runtime.
   */
  updateConfig(partial: Partial<GR00TN16Config>): void {
    this.config = { ...this.config, ...partial };
    if (partial.observationRateHz) {
      this.observationIntervalMs = 1000 / this.config.observationRateHz;
      // Restart streaming with new rate if active
      if (this.observationTimer !== null) {
        this.stopObservationStreaming();
        this.startObservationStreaming();
      }
    }
    if (partial.actionChunking) {
      this.chunkingConfig = { ...this.chunkingConfig, ...partial.actionChunking };
    }
  }

  // ---------------------------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------------------------

  /**
   * Reset all state (keeps connection).
   */
  reset(): void {
    this.currentChunk = null;
    this.previousChunk = null;
    this.smoothedJointTargets.fill(0);
    this.previousJointTargets.fill(0);
    this.inferenceLatencies = [];
    this.observationCount = 0;
    this.lastObservationTime = 0;
    this.metrics = createEmptyGR00TMetrics();
    this.metrics.policyMode = this.policyMode;
    this.metrics.connectionState = this.connectionState;
    logger.info('[GR00TN16PolicyClient] Reset');
  }

  /**
   * Destroy the client and release all resources.
   */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.disconnect();
    this.eventListeners = [];
    this.actionListeners = [];
    this.currentChunk = null;
    this.previousChunk = null;
    logger.info('[GR00TN16PolicyClient] Destroyed');
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a GR00TN16PolicyClient with optional config overrides.
 */
export function createGR00TN16PolicyClient(
  config?: Partial<GR00TN16Config>,
): GR00TN16PolicyClient {
  return new GR00TN16PolicyClient(config);
}
