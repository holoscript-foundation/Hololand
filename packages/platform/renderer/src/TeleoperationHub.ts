/**
 * TeleoperationHub
 *
 * Main orchestrator for XR headset robot teleoperation. Wires together
 * all subsystems: IK solver, policy stream client, camera overlay,
 * telemetry display, and safety boundary system into a unified
 * teleoperation experience.
 *
 * ARCHITECTURE:
 * ```
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │                    TeleoperationHub                         │
 *   │                                                             │
 *   │  ┌──────────────┐  ┌────────────────────┐                  │
 *   │  │   IK Solver   │  │ PolicyStreamClient  │                 │
 *   │  │  (XRHand →    │  │  (WS Binary Proto)  │                 │
 *   │  │   Joints)     │──│  (Robot Controller)  │                 │
 *   │  └──────────────┘  └────────────────────┘                  │
 *   │                                                             │
 *   │  ┌──────────────┐  ┌────────────────────┐                  │
 *   │  │ Camera       │  │ Telemetry Display   │                 │
 *   │  │ Overlay      │  │ (HUD Panel)         │                 │
 *   │  │ (VR Viewport)│  │ (Joints/Forces/Bat) │                 │
 *   │  └──────────────┘  └────────────────────┘                  │
 *   │                                                             │
 *   │  ┌──────────────────────────────────────┐                  │
 *   │  │ GR00TN16PolicyClient (Optional)      │                  │
 *   │  │  (WS → Inference Server, 30Hz obs)   │                  │
 *   │  │  (256-dim → 37-DOF, Action Chunking) │                  │
 *   │  │  (Policy Switch: manip/nav/bimanual) │                  │
 *   │  └──────────────────────────────────────┘                  │
 *   │                                                             │
 *   │  ┌──────────────────────────────────────┐                  │
 *   │  │     Safety Boundary System           │                  │
 *   │  │  (Workspace limits + Force Feedback)  │                 │
 *   │  │  (E-Stop + Haptic Simulation)        │                  │
 *   │  └──────────────────────────────────────┘                  │
 *   │                                                             │
 *   │  NPU Inference (1-3B on-device model, 30Hz)               │
 *   └─────────────────────────────────────────────────────────────┘
 * ```
 *
 * LIFECYCLE:
 *   1. create() -> configure subsystems
 *   2. connect() -> establish WebSocket to robot
 *   3. start() -> begin processing loop
 *   4. [per frame] update(handInputs) -> IK solve, safety check, send commands
 *   5. stop() -> pause processing
 *   6. disconnect() -> close WebSocket
 *   7. destroy() -> release all resources
 *
 * FRAME LOOP (called by renderer at VR frame rate):
 * ```
 *   update(leftHand, rightHand, headPose, deltaTime)
 *       |
 *       +-- IK Solve (both hands) ............... ~0.3ms
 *       +-- Safety Check ......................... ~0.1ms
 *       +-- Clamp Joints ......................... ~0.01ms
 *       +-- Send Joint Commands (WS binary) ...... ~0.05ms
 *       +-- Update Camera Overlay ................ ~0.02ms
 *       +-- Update Telemetry Display ............. ~0.5ms (rate limited)
 *       |                                          --------
 *       Total: ~1ms (well within 11.1ms budget)
 * ```
 *
 * @module TeleoperationHub
 */

import { logger } from './logger';
import type {
  Vec3,
  Quat,
  HandTrackingInput,
  RobotState,
  RobotJointName,
  TeleoperationHubConfig,
  TeleoperationHubMetrics,
  TeleoperationConnectionState,
  TeleoperationEvent,
  TeleoperationEventListener,
  IKSolveResult,
} from './TeleoperationHubTypes';
import {
  DEFAULT_HUB_CONFIG,
  createEmptyMetrics,
  createEmptyRobotState,
} from './TeleoperationHubTypes';
import {
  InverseKinematicsSolver,
  createInverseKinematicsSolver,
} from './InverseKinematicsSolver';
import {
  RobotPolicyStreamClient,
  createRobotPolicyStreamClient,
} from './RobotPolicyStreamClient';
import {
  RobotCameraOverlay,
  createRobotCameraOverlay,
} from './RobotCameraOverlay';
import {
  RobotTelemetryDisplay,
  createRobotTelemetryDisplay,
} from './RobotTelemetryDisplay';
import {
  SafetyBoundarySystem,
  createSafetyBoundarySystem,
} from './SafetyBoundarySystem';
import {
  GR00TN16PolicyClient,
  createGR00TN16PolicyClient,
} from './GR00TN16PolicyClient';
import type { GR00TN16Config, GR00TPolicyMode } from './GR00TN16PolicyClientTypes';

// =============================================================================
// TELEOPERATION HUB
// =============================================================================

export class TeleoperationHub {
  private config: TeleoperationHubConfig;

  /** Subsystems. */
  readonly ikSolver: InverseKinematicsSolver;
  readonly policyStream: RobotPolicyStreamClient;
  readonly cameraOverlay: RobotCameraOverlay;
  readonly telemetryDisplay: RobotTelemetryDisplay;
  readonly safetySystem: SafetyBoundarySystem;
  readonly grootPolicy: GR00TN16PolicyClient | null;

  /** State. */
  private running: boolean = false;
  private connectionState: TeleoperationConnectionState = 'disconnected';
  private metrics: TeleoperationHubMetrics;
  private startTime: number = 0;
  private frameCount: number = 0;

  /** Latest IK results. */
  private lastLeftIK: IKSolveResult | null = null;
  private lastRightIK: IKSolveResult | null = null;

  /** Latest robot state. */
  private latestRobotState: RobotState;

  /** Command rate limiter. */
  private lastCommandTime: number = 0;
  private commandIntervalMs: number;

  /** Event listeners. */
  private eventListeners: TeleoperationEventListener[] = [];

  /** Cleanup handles. */
  private cleanupHandles: Array<() => void> = [];

  /** Destroyed flag. */
  private destroyed: boolean = false;

  constructor(config: Partial<TeleoperationHubConfig> = {}) {
    this.config = {
      ...DEFAULT_HUB_CONFIG,
      ...config,
      ikSolver: { ...DEFAULT_HUB_CONFIG.ikSolver, ...config.ikSolver },
      policyStream: { ...DEFAULT_HUB_CONFIG.policyStream, ...config.policyStream },
      cameraOverlay: { ...DEFAULT_HUB_CONFIG.cameraOverlay, ...config.cameraOverlay },
      telemetry: { ...DEFAULT_HUB_CONFIG.telemetry, ...config.telemetry },
      safety: { ...DEFAULT_HUB_CONFIG.safety, ...config.safety },
    };

    // Preserve boundaries from config if provided
    if (config.safety?.boundaries) {
      this.config.safety.boundaries = config.safety.boundaries;
    }

    this.metrics = createEmptyMetrics();
    this.latestRobotState = createEmptyRobotState();
    this.commandIntervalMs = 1000 / this.config.policyStream.commandRateHz;

    // Create subsystems
    this.ikSolver = createInverseKinematicsSolver(this.config.ikSolver);
    this.policyStream = createRobotPolicyStreamClient(this.config.policyStream);
    this.cameraOverlay = createRobotCameraOverlay(this.config.cameraOverlay);
    this.telemetryDisplay = createRobotTelemetryDisplay(this.config.telemetry);
    this.safetySystem = createSafetyBoundarySystem(this.config.safety);

    // Create GR00T N1.6 policy client if enabled
    if (this.config.enableGR00TPolicy) {
      this.grootPolicy = createGR00TN16PolicyClient(
        (config as { grootPolicy?: Partial<GR00TN16Config> }).grootPolicy,
      );
    } else {
      this.grootPolicy = null;
    }

    // Wire up event handling
    this.wireEvents();

    logger.info('[TeleoperationHub] Initialized', {
      npuModel: this.config.npuModelName,
      npuEnabled: this.config.enableNpuInference,
      commandRate: this.config.policyStream.commandRateHz,
    });
  }

  /**
   * Wire up cross-subsystem event handling.
   */
  private wireEvents(): void {
    // Robot state updates -> telemetry display + camera latency
    const stateUnsub = this.policyStream.onStateUpdate((state) => {
      this.latestRobotState = state as RobotState;
      this.cameraOverlay.setFrameLatency(state.networkLatencyMs);
      this.metrics.latencyMs = state.networkLatencyMs;
    });
    this.cleanupHandles.push(stateUnsub);

    // Camera frames -> overlay
    const cameraUnsub = this.policyStream.onCameraFrame((frame, width, height) => {
      this.cameraOverlay.processFrame(frame, width, height);
    });
    this.cleanupHandles.push(cameraUnsub);

    // Safety emergency stop -> policy stream
    const estopUnsub = this.safetySystem.onEmergencyStop((reason) => {
      this.policyStream.sendEmergencyStop();
      this.emitEvent({ type: 'emergency_stop', timestamp: Date.now(), data: reason });
    });
    this.cleanupHandles.push(estopUnsub);

    // Policy stream events -> forward to hub listeners
    const eventUnsub = this.policyStream.addEventListener((event) => {
      if (event.type === 'connected') {
        this.connectionState = 'connected';
        this.metrics.connectionState = 'connected';
      } else if (event.type === 'disconnected') {
        this.connectionState = 'disconnected';
        this.metrics.connectionState = 'disconnected';
      } else if (event.type === 'error') {
        this.connectionState = 'error';
        this.metrics.connectionState = 'error';
      }
      this.emitEvent(event);
    });
    this.cleanupHandles.push(eventUnsub);

    // GR00T N1.6 policy client integration
    if (this.grootPolicy) {
      // Feed robot state updates to GR00T client for observation assembly
      const grootStateUnsub = this.policyStream.onStateUpdate((state) => {
        this.grootPolicy!.updateRobotState(state as RobotState);
      });
      this.cleanupHandles.push(grootStateUnsub);

      // Forward GR00T events to hub listeners
      const grootEventUnsub = this.grootPolicy.addEventListener((event) => {
        // Map GR00T events to teleoperation events
        if (event.type === 'connected' || event.type === 'disconnected' || event.type === 'error') {
          this.emitEvent({
            type: event.type as TeleoperationEvent['type'],
            timestamp: event.timestamp,
            data: { source: 'groot_policy', ...((event.data as object) || {}) },
          });
        }
      });
      this.cleanupHandles.push(grootEventUnsub);
    }
  }

  // ---------------------------------------------------------------------------
  // LIFECYCLE
  // ---------------------------------------------------------------------------

  /**
   * Connect to the robot controller.
   */
  connect(): void {
    if (this.destroyed) {
      logger.warn('[TeleoperationHub] Cannot connect, hub is destroyed');
      return;
    }
    this.connectionState = 'connecting';
    this.metrics.connectionState = 'connecting';
    this.policyStream.connect();
    if (this.grootPolicy) {
      this.grootPolicy.connect();
    }
  }

  /**
   * Disconnect from the robot controller.
   */
  disconnect(): void {
    this.policyStream.disconnect();
    if (this.grootPolicy) {
      this.grootPolicy.disconnect();
    }
    this.connectionState = 'disconnected';
    this.metrics.connectionState = 'disconnected';
  }

  /**
   * Start the teleoperation processing loop.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.startTime = performance.now();
    this.frameCount = 0;
    if (this.grootPolicy && this.grootPolicy.isConnected()) {
      this.grootPolicy.startObservationStreaming();
    }
    logger.info('[TeleoperationHub] Started');
  }

  /**
   * Stop the teleoperation processing loop.
   */
  stop(): void {
    this.running = false;
    if (this.grootPolicy) {
      this.grootPolicy.stopObservationStreaming();
    }
    logger.info('[TeleoperationHub] Stopped');
  }

  /**
   * Main per-frame update. Call this from the VR render loop.
   *
   * @param leftHand Left hand tracking input (or null if not tracked)
   * @param rightHand Right hand tracking input (or null if not tracked)
   * @param headPosition Current head position in VR space
   * @param headForward Head forward direction
   * @param deltaTime Time since last frame in seconds
   */
  update(
    leftHand: HandTrackingInput | null,
    rightHand: HandTrackingInput | null,
    headPosition: Vec3,
    headForward: Vec3,
    deltaTime: number,
  ): void {
    if (!this.running || this.destroyed) return;

    this.frameCount++;
    this.metrics.totalFrames = this.frameCount;
    this.metrics.uptimeSeconds = (performance.now() - this.startTime) / 1000;

    // 1. IK Solve (both hands)
    const { left: leftIK, right: rightIK } = this.ikSolver.solveBimanual(leftHand, rightHand);
    this.lastLeftIK = leftIK;
    this.lastRightIK = rightIK;

    if (leftIK) this.metrics.ikSolveTimeMs = leftIK.solveTimeMs;
    if (rightIK) this.metrics.ikSolveTimeMs = Math.max(this.metrics.ikSolveTimeMs, rightIK.solveTimeMs);

    // 2. Merge joint angles from both IK results
    let jointAngles: Partial<Record<RobotJointName, number>> = {};
    if (leftIK) {
      jointAngles = { ...jointAngles, ...leftIK.jointAngles };
    }
    if (rightIK) {
      jointAngles = { ...jointAngles, ...rightIK.jointAngles };
    }

    // 3. Safety check and clamping
    let safeAngles = this.safetySystem.clampJointCommands(jointAngles, this.latestRobotState);
    this.metrics.boundaryViolations = this.safetySystem.getViolationCount();

    // 3b. Merge GR00T N1.6 policy actions (if enabled and available)
    if (this.grootPolicy) {
      const policyAction = this.grootPolicy.getNextAction();
      if (policyAction) {
        // Policy actions are merged with IK: policy controls active joints,
        // IK controls hand/arm joints in teleoperation mode.
        // When GR00T is in navigation mode, policy takes precedence for legs.
        // When in manipulation mode, IK takes precedence for arms.
        const policyMode = this.grootPolicy.getPolicyMode();
        if (policyMode === 'navigation') {
          // Policy controls legs and torso; IK controls arms
          safeAngles = { ...policyAction, ...safeAngles };
        } else {
          // IK controls arms; policy fills in anything IK doesn't set
          safeAngles = { ...safeAngles, ...policyAction };
          // Override with IK results for arm joints (IK has priority)
          if (leftIK) {
            for (const [key, val] of Object.entries(leftIK.jointAngles)) {
              safeAngles[key as RobotJointName] = val;
            }
          }
          if (rightIK) {
            for (const [key, val] of Object.entries(rightIK.jointAngles)) {
              safeAngles[key as RobotJointName] = val;
            }
          }
        }
        // Re-run safety clamping on merged output
        safeAngles = this.safetySystem.clampJointCommands(safeAngles, this.latestRobotState);
        this.metrics.npuInferenceTimeMs = this.grootPolicy.getMetrics().avgInferenceLatencyMs;
      }
    }

    // 4. Send joint commands (rate limited)
    const now = performance.now();
    if (now - this.lastCommandTime >= this.commandIntervalMs) {
      if (Object.keys(safeAngles).length > 0) {
        this.policyStream.sendJointCommand(safeAngles);
      }
      this.lastCommandTime = now;
      this.metrics.commandRateHz = 1000 / this.commandIntervalMs;
    }

    // 5. Update camera overlay position
    this.cameraOverlay.updatePosition(headPosition, headForward, deltaTime);

    // 6. Update telemetry display (rate limited internally)
    this.telemetryDisplay.update(this.latestRobotState);

    // 7. Update camera FPS metric
    this.metrics.cameraFps = this.cameraOverlay.getFps();
  }

  /**
   * Send a raw policy action vector (from NPU or external model).
   */
  sendPolicyAction(actions: Float32Array | number[]): boolean {
    return this.policyStream.sendPolicyAction(actions);
  }

  /**
   * Switch the GR00T N1.6 policy mode.
   * Only available when enableGR00TPolicy is true.
   *
   * @param mode The target policy mode ('manipulation', 'navigation', 'bimanual', 'idle')
   * @returns true if the switch request was sent, false if not available
   */
  switchGR00TPolicy(mode: GR00TPolicyMode): boolean {
    if (!this.grootPolicy) {
      logger.warn('[TeleoperationHub] GR00T policy client not enabled');
      return false;
    }
    return this.grootPolicy.switchPolicy(mode);
  }

  /**
   * Get the current GR00T N1.6 policy mode.
   */
  getGR00TPolicyMode(): GR00TPolicyMode | null {
    return this.grootPolicy ? this.grootPolicy.getPolicyMode() : null;
  }

  /**
   * Update the camera frame embedding for GR00T N1.6 observation assembly.
   */
  updateCameraEmbedding(embedding: Float32Array): void {
    if (this.grootPolicy) {
      this.grootPolicy.updateCameraEmbedding(embedding);
    }
  }

  /**
   * Trigger emergency stop.
   */
  emergencyStop(): void {
    this.safetySystem.checkSafety(this.latestRobotState); // Force check
    this.policyStream.sendEmergencyStop();
    this.emitEvent({ type: 'emergency_stop', timestamp: Date.now(), data: 'Manual e-stop' });
  }

  /**
   * Resume from emergency stop.
   */
  resume(): void {
    this.safetySystem.clearEmergencyStop();
    this.policyStream.sendResume();
    this.emitEvent({ type: 'resume', timestamp: Date.now() });
  }

  // ---------------------------------------------------------------------------
  // GETTERS
  // ---------------------------------------------------------------------------

  /**
   * Get current connection state.
   */
  getConnectionState(): TeleoperationConnectionState {
    return this.connectionState;
  }

  /**
   * Get current metrics.
   */
  getMetrics(): Readonly<TeleoperationHubMetrics> {
    return { ...this.metrics };
  }

  /**
   * Get latest robot state.
   */
  getRobotState(): Readonly<RobotState> {
    return this.policyStream.getLatestState();
  }

  /**
   * Get latest IK results.
   */
  getIKResults(): { left: IKSolveResult | null; right: IKSolveResult | null } {
    return { left: this.lastLeftIK, right: this.lastRightIK };
  }

  /**
   * Get haptic feedback state.
   */
  getHapticState(): { left: number; right: number } {
    return this.safetySystem.getHapticIntensity();
  }

  /**
   * Check if the hub is currently running.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Check if connected to robot.
   */
  isConnected(): boolean {
    return this.policyStream.isConnected();
  }

  // ---------------------------------------------------------------------------
  // EVENT HANDLING
  // ---------------------------------------------------------------------------

  /**
   * Register an event listener.
   */
  addEventListener(listener: TeleoperationEventListener): () => void {
    this.eventListeners.push(listener);
    return () => {
      this.eventListeners = this.eventListeners.filter(l => l !== listener);
    };
  }

  private emitEvent(event: TeleoperationEvent): void {
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }

  // ---------------------------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------------------------

  /**
   * Reset all subsystems.
   */
  reset(): void {
    this.stop();
    this.ikSolver.reset();
    this.cameraOverlay.reset();
    this.telemetryDisplay.reset();
    this.safetySystem.reset();
    if (this.grootPolicy) {
      this.grootPolicy.reset();
    }
    this.lastLeftIK = null;
    this.lastRightIK = null;
    this.latestRobotState = createEmptyRobotState();
    this.metrics = createEmptyMetrics();
    this.frameCount = 0;
    logger.info('[TeleoperationHub] Reset');
  }

  /**
   * Destroy the hub and release all resources.
   */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stop();

    // Clean up event wiring
    for (const cleanup of this.cleanupHandles) {
      cleanup();
    }
    this.cleanupHandles = [];

    // Destroy subsystems
    this.policyStream.destroy();
    this.cameraOverlay.destroy();
    this.telemetryDisplay.destroy();
    this.safetySystem.destroy();
    if (this.grootPolicy) {
      this.grootPolicy.destroy();
    }

    this.eventListeners = [];
    logger.info('[TeleoperationHub] Destroyed');
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a TeleoperationHub with optional config overrides.
 */
export function createTeleoperationHub(
  config?: Partial<TeleoperationHubConfig>,
): TeleoperationHub {
  return new TeleoperationHub(config);
}
