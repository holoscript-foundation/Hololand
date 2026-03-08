/**
 * VR Controller Input Mapping for Robot Teleoperation
 *
 * Maps Quest 3 controller inputs to robot joint control with haptic feedback.
 * Supports both direct IK control and policy-assisted manipulation.
 *
 * CONTROLLER MAPPING (Meta Quest 3):
 * ```
 * LEFT CONTROLLER:
 *   - Thumbstick X/Y → Fine position adjustment (left hand IK target)
 *   - Trigger → Grip control (0-1)
 *   - Grip Button → Secondary grip / tool selection
 *   - X Button → Emergency stop toggle
 *   - Y Button → Calibration trigger
 *   - Haptics → Safety boundary feedback
 *
 * RIGHT CONTROLLER:
 *   - Thumbstick X/Y → Fine position adjustment (right hand IK target)
 *   - Trigger → Grip control (0-1)
 *   - Grip Button → Secondary grip / tool selection
 *   - A Button → Mode switching (Direct IK ↔ GR00T)
 *   - B Button → Toggle camera overlay
 *   - Haptics → Contact force feedback + boundary warnings
 * ```
 *
 * HAPTIC FEEDBACK PATTERNS:
 *   - Soft boundary approach: 0.3 intensity, 10Hz pulse
 *   - Hard boundary hit: 0.8 intensity, 200Hz vibration
 *   - Contact force: Intensity proportional to force (0-1)
 *   - Emergency stop: 1.0 intensity, 3x 200ms pulses
 *
 * @module ControllerInputMapping
 */

import type {
  Vec3,
  Quat,
  HandTrackingInput,
  TeleoperationHub,
} from '@hololand/platform/renderer';

// =============================================================================
// TYPES
// =============================================================================

export interface ControllerState {
  position: Vec3;
  rotation: Quat;
  trigger: number;  // 0-1
  grip: number;     // 0-1
  thumbstick: { x: number; y: number };
  buttons: {
    a: boolean;
    b: boolean;
    x: boolean;
    y: boolean;
    thumbstick: boolean;
  };
  hapticActuator: GamepadHapticActuator | null;
}

export interface ControllerInputMapping {
  // Controller state
  left: ControllerState | null;
  right: ControllerState | null;

  // Derived IK targets
  leftHandTarget: HandTrackingInput | null;
  rightHandTarget: HandTrackingInput | null;

  // Control modes
  directIKEnabled: boolean;
  policyAssistedEnabled: boolean;
  fineAdjustmentMode: boolean;

  // Haptic feedback state
  hapticIntensity: { left: number; right: number };
  hapticPattern: 'boundary' | 'force' | 'alert' | null;
}

export interface ControllerInputConfig {
  // Sensitivity settings
  positionSensitivity: number;  // Meters per thumbstick unit
  rotationSensitivity: number;  // Degrees per thumbstick unit
  triggerDeadzone: number;
  thumbstickDeadzone: number;

  // Haptic configuration
  enableHaptics: boolean;
  maxHapticIntensity: number;
  boundaryHapticFrequency: number;  // Hz
  forceHapticScale: number;         // Scale factor for force feedback

  // Button mapping customization
  buttonMapping: {
    emergencyStop: 'x' | 'y' | 'a' | 'b';
    modeSwitch: 'x' | 'y' | 'a' | 'b';
    calibrate: 'x' | 'y' | 'a' | 'b';
    toggleCamera: 'x' | 'y' | 'a' | 'b';
  };
}

const DEFAULT_CONTROLLER_CONFIG: ControllerInputConfig = {
  positionSensitivity: 0.01,    // 1cm per unit
  rotationSensitivity: 2.0,     // 2 degrees per unit
  triggerDeadzone: 0.05,
  thumbstickDeadzone: 0.1,
  enableHaptics: true,
  maxHapticIntensity: 1.0,
  boundaryHapticFrequency: 10,
  forceHapticScale: 0.01,       // 1N = 1% intensity
  buttonMapping: {
    emergencyStop: 'x',
    modeSwitch: 'a',
    calibrate: 'y',
    toggleCamera: 'b',
  },
};

// =============================================================================
// CONTROLLER INPUT MANAGER
// =============================================================================

export class ControllerInputManager {
  private config: ControllerInputConfig;
  private mapping: ControllerInputMapping;
  private teleoperationHub: TeleoperationHub;

  // XR session and input sources
  private xrSession: XRSession | null = null;
  private leftInputSource: XRInputSource | null = null;
  private rightInputSource: XRInputSource | null = null;

  // Base poses for fine adjustment
  private leftBasePose: { position: Vec3; rotation: Quat } | null = null;
  private rightBasePose: { position: Vec3; rotation: Quat } | null = null;

  // Haptic timers
  private hapticTimers: { left: number | null; right: number | null } = {
    left: null,
    right: null,
  };

  // Button state tracking for edge detection
  private previousButtons: {
    left: Partial<ControllerState['buttons']>;
    right: Partial<ControllerState['buttons']>;
  } = {
    left: {},
    right: {},
  };

  // Callbacks
  private onEmergencyStopCallback: (() => void) | null = null;
  private onModeSwitchCallback: (() => void) | null = null;
  private onCalibrateCallback: (() => void) | null = null;
  private onToggleCameraCallback: (() => void) | null = null;

  constructor(
    teleoperationHub: TeleoperationHub,
    config: Partial<ControllerInputConfig> = {},
  ) {
    this.config = { ...DEFAULT_CONTROLLER_CONFIG, ...config };
    this.teleoperationHub = teleoperationHub;
    this.mapping = {
      left: null,
      right: null,
      leftHandTarget: null,
      rightHandTarget: null,
      directIKEnabled: true,
      policyAssistedEnabled: false,
      fineAdjustmentMode: false,
      hapticIntensity: { left: 0, right: 0 },
      hapticPattern: null,
    };
  }

  // ---------------------------------------------------------------------------
  // XR SESSION INTEGRATION
  // ---------------------------------------------------------------------------

  /**
   * Initialize with XR session.
   */
  async initialize(xrSession: XRSession): Promise<void> {
    this.xrSession = xrSession;

    // Find controller input sources
    const inputSources = xrSession.inputSources;
    for (const source of inputSources) {
      if (source.handedness === 'left') {
        this.leftInputSource = source;
      } else if (source.handedness === 'right') {
        this.rightInputSource = source;
      }
    }

    // Listen for input source changes
    xrSession.addEventListener('inputsourceschange', (event: XRInputSourceChangeEvent) => {
      for (const added of event.added) {
        if (added.handedness === 'left') {
          this.leftInputSource = added;
        } else if (added.handedness === 'right') {
          this.rightInputSource = added;
        }
      }

      for (const removed of event.removed) {
        if (removed === this.leftInputSource) {
          this.leftInputSource = null;
        } else if (removed === this.rightInputSource) {
          this.rightInputSource = null;
        }
      }
    });
  }

  /**
   * Update controller state from XR frame.
   * Call this in the XR render loop (every frame at 90Hz).
   */
  update(frame: XRFrame, referenceSpace: XRReferenceSpace): void {
    if (!this.xrSession) return;

    // Update left controller
    if (this.leftInputSource && this.leftInputSource.gamepad) {
      this.mapping.left = this.readControllerState(
        this.leftInputSource,
        frame,
        referenceSpace,
      );
      this.processLeftController();
    }

    // Update right controller
    if (this.rightInputSource && this.rightInputSource.gamepad) {
      this.mapping.right = this.readControllerState(
        this.rightInputSource,
        frame,
        referenceSpace,
      );
      this.processRightController();
    }

    // Convert to hand tracking inputs for IK solver
    this.updateHandTargets();

    // Apply haptic feedback from TeleoperationHub
    this.updateHapticFeedback();
  }

  // ---------------------------------------------------------------------------
  // CONTROLLER STATE READING
  // ---------------------------------------------------------------------------

  private readControllerState(
    inputSource: XRInputSource,
    frame: XRFrame,
    referenceSpace: XRReferenceSpace,
  ): ControllerState {
    const gamepad = inputSource.gamepad!;
    const gripPose = frame.getPose(inputSource.gripSpace!, referenceSpace);

    // Extract position and rotation
    const position: Vec3 = gripPose
      ? {
          x: gripPose.transform.position.x,
          y: gripPose.transform.position.y,
          z: gripPose.transform.position.z,
        }
      : { x: 0, y: 0, z: 0 };

    const rotation: Quat = gripPose
      ? {
          x: gripPose.transform.orientation.x,
          y: gripPose.transform.orientation.y,
          z: gripPose.transform.orientation.z,
          w: gripPose.transform.orientation.w,
        }
      : { x: 0, y: 0, z: 0, w: 1 };

    // Read analog inputs
    const trigger = this.applyDeadzone(gamepad.buttons[0]?.value ?? 0, this.config.triggerDeadzone);
    const grip = this.applyDeadzone(gamepad.buttons[1]?.value ?? 0, this.config.triggerDeadzone);

    const thumbstickX = this.applyDeadzone(gamepad.axes[2] ?? 0, this.config.thumbstickDeadzone);
    const thumbstickY = this.applyDeadzone(gamepad.axes[3] ?? 0, this.config.thumbstickDeadzone);

    // Read digital buttons (Quest 3 layout)
    const buttons = {
      a: gamepad.buttons[4]?.pressed ?? false,  // A/X button
      b: gamepad.buttons[5]?.pressed ?? false,  // B/Y button
      x: gamepad.buttons[4]?.pressed ?? false,  // Same as A for left
      y: gamepad.buttons[5]?.pressed ?? false,  // Same as B for left
      thumbstick: gamepad.buttons[3]?.pressed ?? false,
    };

    // Get haptic actuator
    const hapticActuator = (gamepad as any).hapticActuators?.[0] ?? null;

    return {
      position,
      rotation,
      trigger,
      grip,
      thumbstick: { x: thumbstickX, y: thumbstickY },
      buttons,
      hapticActuator,
    };
  }

  private applyDeadzone(value: number, deadzone: number): number {
    if (Math.abs(value) < deadzone) return 0;
    return value;
  }

  // ---------------------------------------------------------------------------
  // BUTTON PROCESSING
  // ---------------------------------------------------------------------------

  private processLeftController(): void {
    if (!this.mapping.left) return;

    const current = this.mapping.left.buttons;
    const previous = this.previousButtons.left;

    // X button (emergency stop)
    if (current.x && !previous.x && this.config.buttonMapping.emergencyStop === 'x') {
      this.triggerEmergencyStop();
    }

    // Y button (calibrate)
    if (current.y && !previous.y && this.config.buttonMapping.calibrate === 'y') {
      this.triggerCalibration();
    }

    // Update previous state
    this.previousButtons.left = { ...current };
  }

  private processRightController(): void {
    if (!this.mapping.right) return;

    const current = this.mapping.right.buttons;
    const previous = this.previousButtons.right;

    // A button (mode switch)
    if (current.a && !previous.a && this.config.buttonMapping.modeSwitch === 'a') {
      this.triggerModeSwitch();
    }

    // B button (toggle camera)
    if (current.b && !previous.b && this.config.buttonMapping.toggleCamera === 'b') {
      this.triggerToggleCamera();
    }

    // Update previous state
    this.previousButtons.right = { ...current };
  }

  // ---------------------------------------------------------------------------
  // HAND TARGET CONVERSION
  // ---------------------------------------------------------------------------

  private updateHandTargets(): void {
    // Convert left controller to hand tracking input
    if (this.mapping.left) {
      this.mapping.leftHandTarget = this.controllerToHandTracking(
        this.mapping.left,
        'left',
      );
    }

    // Convert right controller to hand tracking input
    if (this.mapping.right) {
      this.mapping.rightHandTarget = this.controllerToHandTracking(
        this.mapping.right,
        'right',
      );
    }
  }

  private controllerToHandTracking(
    controller: ControllerState,
    hand: 'left' | 'right',
  ): HandTrackingInput {
    // Base pose is the controller grip position
    let position = { ...controller.position };
    let rotation = { ...controller.rotation };

    // Apply fine adjustment from thumbstick
    if (this.mapping.fineAdjustmentMode) {
      const adjustX = controller.thumbstick.x * this.config.positionSensitivity;
      const adjustY = controller.thumbstick.y * this.config.positionSensitivity;

      // Apply in controller's local space
      const forward = this.quatToForward(rotation);
      const right = this.quatToRight(rotation);

      position.x += right.x * adjustX + forward.x * adjustY;
      position.y += right.y * adjustX + forward.y * adjustY;
      position.z += right.z * adjustX + forward.z * adjustY;
    }

    // Construct hand tracking input
    // For robot teleoperation, we primarily care about wrist pose and grip
    return {
      hand,
      confidence: 1.0,
      wrist: {
        position,
        rotation,
      },
      // Simplified finger tracking: grip and trigger map to hand closure
      fingers: {
        thumb: { tip: position, curl: controller.trigger },
        index: { tip: position, curl: controller.trigger },
        middle: { tip: position, curl: controller.grip },
        ring: { tip: position, curl: controller.grip },
        pinky: { tip: position, curl: controller.grip },
      },
      pinch: controller.trigger,
      grip: controller.grip,
      curl: Math.max(controller.trigger, controller.grip),
    };
  }

  // ---------------------------------------------------------------------------
  // HAPTIC FEEDBACK
  // ---------------------------------------------------------------------------

  private updateHapticFeedback(): void {
    if (!this.config.enableHaptics) return;

    // Get haptic intensity from TeleoperationHub
    const hubHaptics = this.teleoperationHub.getHapticState();
    this.mapping.hapticIntensity = hubHaptics;

    // Apply to left controller
    if (this.mapping.left?.hapticActuator) {
      this.applyHaptic('left', hubHaptics.left);
    }

    // Apply to right controller
    if (this.mapping.right?.hapticActuator) {
      this.applyHaptic('right', hubHaptics.right);
    }
  }

  private applyHaptic(hand: 'left' | 'right', intensity: number): void {
    const controller = hand === 'left' ? this.mapping.left : this.mapping.right;
    if (!controller?.hapticActuator) return;

    const clampedIntensity = Math.min(intensity, this.config.maxHapticIntensity);

    if (clampedIntensity > 0.01) {
      // Continuous vibration proportional to intensity
      controller.hapticActuator.pulse(clampedIntensity, 100); // 100ms pulse
    }
  }

  /**
   * Trigger a pulsed haptic pattern (e.g., for alerts).
   */
  triggerHapticPattern(
    hand: 'left' | 'right',
    pattern: 'boundary' | 'force' | 'alert',
  ): void {
    const controller = hand === 'left' ? this.mapping.left : this.mapping.right;
    if (!controller?.hapticActuator || !this.config.enableHaptics) return;

    switch (pattern) {
      case 'boundary':
        // Soft pulsing for boundary approach
        controller.hapticActuator.pulse(0.3, 100);
        break;
      case 'force':
        // Strong pulse for contact force
        controller.hapticActuator.pulse(0.8, 200);
        break;
      case 'alert':
        // Triple pulse for emergency stop
        this.pulseSequence(controller.hapticActuator, [
          { intensity: 1.0, duration: 200 },
          { intensity: 0, duration: 100 },
          { intensity: 1.0, duration: 200 },
          { intensity: 0, duration: 100 },
          { intensity: 1.0, duration: 200 },
        ]);
        break;
    }
  }

  private async pulseSequence(
    actuator: GamepadHapticActuator,
    sequence: Array<{ intensity: number; duration: number }>,
  ): Promise<void> {
    for (const pulse of sequence) {
      await actuator.pulse(pulse.intensity, pulse.duration);
    }
  }

  // ---------------------------------------------------------------------------
  // CALLBACKS
  // ---------------------------------------------------------------------------

  private triggerEmergencyStop(): void {
    this.triggerHapticPattern('left', 'alert');
    this.triggerHapticPattern('right', 'alert');
    this.onEmergencyStopCallback?.();
  }

  private triggerModeSwitch(): void {
    this.triggerHapticPattern('right', 'boundary');
    this.onModeSwitchCallback?.();
  }

  private triggerCalibration(): void {
    this.triggerHapticPattern('left', 'boundary');
    this.onCalibrateCallback?.();
  }

  private triggerToggleCamera(): void {
    this.triggerHapticPattern('right', 'boundary');
    this.onToggleCameraCallback?.();
  }

  /**
   * Register callback for emergency stop button.
   */
  onEmergencyStop(callback: () => void): void {
    this.onEmergencyStopCallback = callback;
  }

  /**
   * Register callback for mode switch button.
   */
  onModeSwitch(callback: () => void): void {
    this.onModeSwitchCallback = callback;
  }

  /**
   * Register callback for calibration button.
   */
  onCalibrate(callback: () => void): void {
    this.onCalibrateCallback = callback;
  }

  /**
   * Register callback for toggle camera button.
   */
  onToggleCamera(callback: () => void): void {
    this.onToggleCameraCallback = callback;
  }

  // ---------------------------------------------------------------------------
  // GETTERS
  // ---------------------------------------------------------------------------

  getMapping(): Readonly<ControllerInputMapping> {
    return this.mapping;
  }

  getLeftHandTarget(): HandTrackingInput | null {
    return this.mapping.leftHandTarget;
  }

  getRightHandTarget(): HandTrackingInput | null {
    return this.mapping.rightHandTarget;
  }

  setFineAdjustmentMode(enabled: boolean): void {
    this.mapping.fineAdjustmentMode = enabled;
  }

  // ---------------------------------------------------------------------------
  // MATH HELPERS
  // ---------------------------------------------------------------------------

  private quatToForward(q: Quat): Vec3 {
    return {
      x: 2 * (q.x * q.z + q.w * q.y),
      y: 2 * (q.y * q.z - q.w * q.x),
      z: 1 - 2 * (q.x * q.x + q.y * q.y),
    };
  }

  private quatToRight(q: Quat): Vec3 {
    return {
      x: 1 - 2 * (q.y * q.y + q.z * q.z),
      y: 2 * (q.x * q.y + q.w * q.z),
      z: 2 * (q.x * q.z - q.w * q.y),
    };
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createControllerInputManager(
  teleoperationHub: TeleoperationHub,
  config?: Partial<ControllerInputConfig>,
): ControllerInputManager {
  return new ControllerInputManager(teleoperationHub, config);
}
