/**
 * SafetyBoundarySystem
 *
 * Implements workspace safety boundaries with force-feedback haptics
 * simulation for robot teleoperation. Prevents the robot from exceeding
 * configured workspace limits and provides graduated tactile feedback
 * as the operator approaches boundaries.
 *
 * SAFETY ARCHITECTURE:
 * ```
 *   Robot End-Effector Position (from telemetry)
 *       |
 *       v
 *   Boundary Proximity Check (box/sphere/cylinder)
 *       |
 *       +-- Distance > softMargin  --> No haptics, green indicator
 *       +-- softMargin > Distance > hardMargin --> Graduated haptics
 *       +-- Distance < hardMargin  --> Max haptics, motion blocked
 *       +-- Distance <= 0 (exclusion zone) --> Emergency stop
 *       |
 *       v
 *   Haptic Output (XRGamepad.hapticActuators, or simulated intensity)
 *       |
 *       v
 *   Joint Command Modification (clamped/blocked if in hard zone)
 * ```
 *
 * BOUNDARY SHAPES:
 *   - Box: Axis-aligned bounding box with half-extents
 *   - Sphere: Radial boundary from center
 *   - Cylinder: Vertical cylinder (radius + height)
 *
 * HAPTIC MODEL:
 *   Intensity = (softMargin - distance) / (softMargin - hardMargin)
 *   Clamped to [0, maxIntensity], pulsed at configured frequency.
 *
 * @module SafetyBoundarySystem
 */

import { logger } from './logger';
import type {
  Vec3,
  SafetyBoundary,
  SafetyBoundaryConfig,
  BoundaryProximityResult,
  RobotState,
  RobotJointName,
} from './TeleoperationHubTypes';
import {
  DEFAULT_SAFETY_CONFIG,
  ALL_JOINT_NAMES,
} from './TeleoperationHubTypes';

// =============================================================================
// MATH HELPERS
// =============================================================================

function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vec3Length(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function vec3Scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function vec3Normalize(v: Vec3): Vec3 {
  const len = vec3Length(v);
  if (len < 1e-8) return { x: 0, y: 1, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// =============================================================================
// SAFETY BOUNDARY SYSTEM
// =============================================================================

export class SafetyBoundarySystem {
  private config: SafetyBoundaryConfig;

  /** Accumulated boundary violation count. */
  private violationCount: number = 0;

  /** Whether emergency stop has been triggered by safety. */
  private emergencyStopTriggered: boolean = false;

  /** Current haptic intensities for each hand. */
  private hapticIntensity: { left: number; right: number } = { left: 0, right: 0 };

  /** Listeners for boundary violation events. */
  private violationListeners: Array<(result: BoundaryProximityResult, hand: 'left' | 'right') => void> = [];
  private emergencyStopListeners: Array<(reason: string) => void> = [];

  /** Destroyed flag. */
  private destroyed: boolean = false;

  constructor(config: Partial<SafetyBoundaryConfig> = {}) {
    this.config = { ...DEFAULT_SAFETY_CONFIG, ...config };
    if (config.boundaries) {
      this.config.boundaries = config.boundaries;
    }
    logger.info('[SafetyBoundarySystem] Initialized', {
      boundaryCount: this.config.boundaries.length,
      haptics: this.config.enableHaptics,
    });
  }

  // ---------------------------------------------------------------------------
  // BOUNDARY PROXIMITY CHECKS
  // ---------------------------------------------------------------------------

  /**
   * Check proximity of a point to a single boundary.
   */
  checkBoundaryProximity(point: Vec3, boundary: SafetyBoundary): BoundaryProximityResult {
    if (!boundary.active) {
      return {
        boundaryId: boundary.id,
        isInside: true,
        distance: Infinity,
        closestPoint: point,
        normal: { x: 0, y: 1, z: 0 },
        inSoftZone: false,
        inHardZone: false,
        hapticIntensity: 0,
      };
    }

    let distance: number;
    let closestPoint: Vec3;
    let normal: Vec3;

    switch (boundary.shape) {
      case 'box':
        ({ distance, closestPoint, normal } = this.boxDistance(point, boundary));
        break;
      case 'sphere':
        ({ distance, closestPoint, normal } = this.sphereDistance(point, boundary));
        break;
      case 'cylinder':
        ({ distance, closestPoint, normal } = this.cylinderDistance(point, boundary));
        break;
      default:
        ({ distance, closestPoint, normal } = this.boxDistance(point, boundary));
    }

    // For workspace boundaries: distance is positive when INSIDE workspace
    // (negative = outside workspace = violation)
    // For exclusion zones: distance is positive when OUTSIDE exclusion
    // (negative = inside exclusion = violation)
    const isViolation = boundary.type === 'workspace' ? distance < 0 : distance < 0;
    const absDist = Math.abs(distance);

    // Determine zones
    const inSoftZone = boundary.type === 'workspace'
      ? distance < boundary.softMargin && distance >= boundary.hardMargin
      : absDist < boundary.softMargin && !isViolation;

    const inHardZone = boundary.type === 'workspace'
      ? distance < boundary.hardMargin
      : isViolation;

    // Calculate haptic intensity
    let hapticIntensity = 0;
    if (inSoftZone || inHardZone) {
      const range = boundary.softMargin - boundary.hardMargin;
      if (range > 0) {
        const penetration = boundary.softMargin - (boundary.type === 'workspace' ? distance : absDist);
        hapticIntensity = clamp(penetration / range, 0, 1) * this.config.maxHapticIntensity;
      } else {
        hapticIntensity = this.config.maxHapticIntensity;
      }
    }
    if (inHardZone) {
      hapticIntensity = this.config.maxHapticIntensity;
    }

    return {
      boundaryId: boundary.id,
      isInside: boundary.type === 'workspace' ? distance >= 0 : distance >= 0,
      distance,
      closestPoint,
      normal,
      inSoftZone,
      inHardZone,
      hapticIntensity,
    };
  }

  /**
   * Signed distance from point to axis-aligned box.
   * Positive = inside, Negative = outside.
   */
  private boxDistance(
    point: Vec3,
    boundary: SafetyBoundary,
  ): { distance: number; closestPoint: Vec3; normal: Vec3 } {
    const halfExtents = boundary.dimensions;
    const local = vec3Sub(point, boundary.center);

    // Compute distance to each face
    const dx = halfExtents.x - Math.abs(local.x);
    const dy = halfExtents.y - Math.abs(local.y);
    const dz = halfExtents.z - Math.abs(local.z);

    if (dx >= 0 && dy >= 0 && dz >= 0) {
      // Inside the box - distance is to nearest face (positive = inside)
      const minDist = Math.min(dx, dy, dz);
      let normal: Vec3 = { x: 0, y: 0, z: 0 };
      if (minDist === dx) normal = { x: Math.sign(local.x), y: 0, z: 0 };
      else if (minDist === dy) normal = { x: 0, y: Math.sign(local.y), z: 0 };
      else normal = { x: 0, y: 0, z: Math.sign(local.z) };

      const closestPoint: Vec3 = {
        x: boundary.center.x + (local.x > 0 ? halfExtents.x : -halfExtents.x) * (minDist === dx ? 1 : 0) + local.x * (minDist !== dx ? 1 : 0),
        y: boundary.center.y + (local.y > 0 ? halfExtents.y : -halfExtents.y) * (minDist === dy ? 1 : 0) + local.y * (minDist !== dy ? 1 : 0),
        z: boundary.center.z + (local.z > 0 ? halfExtents.z : -halfExtents.z) * (minDist === dz ? 1 : 0) + local.z * (minDist !== dz ? 1 : 0),
      };

      return {
        distance: boundary.type === 'workspace' ? minDist : -minDist,
        closestPoint,
        normal,
      };
    }

    // Outside the box
    const clamped: Vec3 = {
      x: clamp(local.x, -halfExtents.x, halfExtents.x),
      y: clamp(local.y, -halfExtents.y, halfExtents.y),
      z: clamp(local.z, -halfExtents.z, halfExtents.z),
    };

    const diff = vec3Sub(local, clamped);
    const dist = vec3Length(diff);
    const normal = dist > 0 ? vec3Normalize(diff) : { x: 0, y: 1, z: 0 };
    const closestPoint = vec3Add(boundary.center, clamped);

    return {
      distance: boundary.type === 'workspace' ? -dist : dist,
      closestPoint,
      normal,
    };
  }

  /**
   * Signed distance from point to sphere.
   */
  private sphereDistance(
    point: Vec3,
    boundary: SafetyBoundary,
  ): { distance: number; closestPoint: Vec3; normal: Vec3 } {
    const radius = boundary.dimensions.x;
    const toPoint = vec3Sub(point, boundary.center);
    const dist = vec3Length(toPoint);
    const normal = dist > 0 ? vec3Normalize(toPoint) : { x: 0, y: 1, z: 0 };
    const closestPoint = vec3Add(boundary.center, vec3Scale(normal, radius));

    const signedDist = boundary.type === 'workspace'
      ? radius - dist   // Inside workspace = positive
      : dist - radius;  // Outside exclusion = positive

    return { distance: signedDist, closestPoint, normal };
  }

  /**
   * Signed distance from point to vertical cylinder (axis along Y).
   */
  private cylinderDistance(
    point: Vec3,
    boundary: SafetyBoundary,
  ): { distance: number; closestPoint: Vec3; normal: Vec3 } {
    const radius = boundary.dimensions.x;
    const halfHeight = boundary.dimensions.y;

    const local = vec3Sub(point, boundary.center);

    // Horizontal distance to cylinder wall
    const horizontalDist = Math.sqrt(local.x * local.x + local.z * local.z);
    const radialDist = radius - horizontalDist;

    // Vertical distance to caps
    const verticalDist = halfHeight - Math.abs(local.y);

    if (radialDist >= 0 && verticalDist >= 0) {
      // Inside cylinder
      const minDist = Math.min(radialDist, verticalDist);
      let normal: Vec3;
      if (radialDist < verticalDist) {
        // Closer to cylindrical wall
        normal = horizontalDist > 0
          ? { x: local.x / horizontalDist, y: 0, z: local.z / horizontalDist }
          : { x: 1, y: 0, z: 0 };
      } else {
        // Closer to cap
        normal = { x: 0, y: Math.sign(local.y), z: 0 };
      }
      const closestPoint = vec3Add(boundary.center, vec3Scale(normal, boundary.type === 'workspace' ? radius : 0));
      return {
        distance: boundary.type === 'workspace' ? minDist : -minDist,
        closestPoint,
        normal,
      };
    }

    // Outside cylinder
    const clampedY = clamp(local.y, -halfHeight, halfHeight);
    let closestLocal: Vec3;
    if (horizontalDist > 0) {
      const scale = radius / horizontalDist;
      closestLocal = {
        x: local.x * Math.min(scale, 1),
        y: clampedY,
        z: local.z * Math.min(scale, 1),
      };
    } else {
      closestLocal = { x: 0, y: clampedY, z: 0 };
    }

    const diff = vec3Sub(local, closestLocal);
    const dist = vec3Length(diff);
    const normal = dist > 0 ? vec3Normalize(diff) : { x: 0, y: 1, z: 0 };
    const closestPoint = vec3Add(boundary.center, closestLocal);

    return {
      distance: boundary.type === 'workspace' ? -dist : dist,
      closestPoint,
      normal,
    };
  }

  // ---------------------------------------------------------------------------
  // FULL SAFETY CHECK
  // ---------------------------------------------------------------------------

  /**
   * Perform a full safety check on the robot state.
   * Returns proximity results for both hands against all boundaries.
   */
  checkSafety(state: RobotState): {
    leftHand: BoundaryProximityResult[];
    rightHand: BoundaryProximityResult[];
    shouldEmergencyStop: boolean;
    reason: string;
  } {
    const leftResults: BoundaryProximityResult[] = [];
    const rightResults: BoundaryProximityResult[] = [];
    let shouldStop = false;
    let stopReason = '';

    const leftPos = state.endEffectors.leftHand.position;
    const rightPos = state.endEffectors.rightHand.position;

    // Check each boundary
    for (const boundary of this.config.boundaries) {
      const leftResult = this.checkBoundaryProximity(leftPos, boundary);
      const rightResult = this.checkBoundaryProximity(rightPos, boundary);

      leftResults.push(leftResult);
      rightResults.push(rightResult);

      // Check for hard violations
      if (leftResult.inHardZone) {
        this.violationCount++;
        for (const listener of this.violationListeners) {
          listener(leftResult, 'left');
        }
      }
      if (rightResult.inHardZone) {
        this.violationCount++;
        for (const listener of this.violationListeners) {
          listener(rightResult, 'right');
        }
      }

      // Emergency stop conditions
      if (this.config.emergencyStopDistance > 0) {
        if (leftResult.distance < -this.config.emergencyStopDistance ||
            rightResult.distance < -this.config.emergencyStopDistance) {
          shouldStop = true;
          stopReason = `Boundary "${boundary.id}" violated beyond emergency stop distance`;
        }
      }
    }

    // Check contact forces
    const leftForce = vec3Length(state.contactForces.leftHand);
    const rightForce = vec3Length(state.contactForces.rightHand);
    if (leftForce > this.config.maxContactForce || rightForce > this.config.maxContactForce) {
      shouldStop = true;
      stopReason = `Contact force exceeded: L=${leftForce.toFixed(1)}N R=${rightForce.toFixed(1)}N (max: ${this.config.maxContactForce}N)`;
    }

    // Check joint velocities
    for (const name of ALL_JOINT_NAMES) {
      const velocity = Math.abs(state.joints[name]?.velocity ?? 0);
      if (velocity > this.config.maxJointVelocity) {
        shouldStop = true;
        stopReason = `Joint ${name} velocity exceeded: ${velocity.toFixed(2)} rad/s (max: ${this.config.maxJointVelocity})`;
        break;
      }
    }

    // Update haptic intensities (take maximum across all boundaries)
    this.hapticIntensity.left = 0;
    this.hapticIntensity.right = 0;
    for (const r of leftResults) {
      if (r.hapticIntensity > this.hapticIntensity.left) {
        this.hapticIntensity.left = r.hapticIntensity;
      }
    }
    for (const r of rightResults) {
      if (r.hapticIntensity > this.hapticIntensity.right) {
        this.hapticIntensity.right = r.hapticIntensity;
      }
    }

    // Trigger emergency stop if needed
    if (shouldStop && !this.emergencyStopTriggered) {
      this.emergencyStopTriggered = true;
      logger.error('[SafetyBoundarySystem] Emergency stop triggered:', stopReason);
      for (const listener of this.emergencyStopListeners) {
        listener(stopReason);
      }
    }

    return {
      leftHand: leftResults,
      rightHand: rightResults,
      shouldEmergencyStop: shouldStop,
      reason: stopReason,
    };
  }

  /**
   * Clamp joint commands to respect safety boundaries.
   * Returns modified joint angles that stay within safe workspace.
   */
  clampJointCommands(
    jointAngles: Partial<Record<RobotJointName, number>>,
    state: RobotState,
  ): Partial<Record<RobotJointName, number>> {
    if (this.emergencyStopTriggered) {
      // Return current angles (no motion) during e-stop
      const frozen: Partial<Record<RobotJointName, number>> = {};
      for (const name of ALL_JOINT_NAMES) {
        frozen[name] = state.joints[name]?.angle ?? 0;
      }
      return frozen;
    }

    // Perform safety check
    const safety = this.checkSafety(state);

    // If in hard zone, freeze motion for affected arm
    const result = { ...jointAngles };
    const leftPrefix = 'left_';
    const rightPrefix = 'right_';

    const leftInHardZone = safety.leftHand.some(r => r.inHardZone);
    const rightInHardZone = safety.rightHand.some(r => r.inHardZone);

    if (leftInHardZone) {
      for (const name of ALL_JOINT_NAMES) {
        if (name.startsWith(leftPrefix)) {
          result[name] = state.joints[name]?.angle ?? 0;
        }
      }
    }

    if (rightInHardZone) {
      for (const name of ALL_JOINT_NAMES) {
        if (name.startsWith(rightPrefix)) {
          result[name] = state.joints[name]?.angle ?? 0;
        }
      }
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // HAPTIC FEEDBACK
  // ---------------------------------------------------------------------------

  /**
   * Get current haptic intensity for each hand.
   */
  getHapticIntensity(): { left: number; right: number } {
    if (!this.config.enableHaptics) {
      return { left: 0, right: 0 };
    }
    return { ...this.hapticIntensity };
  }

  /**
   * Get haptic pulse parameters for XRGamepad.hapticActuators.
   */
  getHapticPulse(hand: 'left' | 'right'): {
    intensity: number;
    durationMs: number;
    frequency: number;
  } {
    const intensity = hand === 'left' ? this.hapticIntensity.left : this.hapticIntensity.right;
    return {
      intensity: this.config.enableHaptics ? intensity : 0,
      durationMs: intensity > 0 ? 1000 / this.config.hapticFrequency : 0,
      frequency: this.config.hapticFrequency,
    };
  }

  // ---------------------------------------------------------------------------
  // BOUNDARY MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Add a new safety boundary.
   */
  addBoundary(boundary: SafetyBoundary): void {
    this.config.boundaries.push(boundary);
    logger.info('[SafetyBoundarySystem] Boundary added:', boundary.id);
  }

  /**
   * Remove a boundary by ID.
   */
  removeBoundary(id: string): boolean {
    const idx = this.config.boundaries.findIndex(b => b.id === id);
    if (idx >= 0) {
      this.config.boundaries.splice(idx, 1);
      logger.info('[SafetyBoundarySystem] Boundary removed:', id);
      return true;
    }
    return false;
  }

  /**
   * Enable or disable a boundary.
   */
  setBoundaryActive(id: string, active: boolean): boolean {
    const boundary = this.config.boundaries.find(b => b.id === id);
    if (boundary) {
      boundary.active = active;
      return true;
    }
    return false;
  }

  /**
   * Get all boundaries.
   */
  getBoundaries(): ReadonlyArray<SafetyBoundary> {
    return this.config.boundaries;
  }

  // ---------------------------------------------------------------------------
  // EVENT LISTENERS
  // ---------------------------------------------------------------------------

  /**
   * Register a boundary violation listener.
   */
  onViolation(listener: (result: BoundaryProximityResult, hand: 'left' | 'right') => void): () => void {
    this.violationListeners.push(listener);
    return () => {
      this.violationListeners = this.violationListeners.filter(l => l !== listener);
    };
  }

  /**
   * Register an emergency stop listener.
   */
  onEmergencyStop(listener: (reason: string) => void): () => void {
    this.emergencyStopListeners.push(listener);
    return () => {
      this.emergencyStopListeners = this.emergencyStopListeners.filter(l => l !== listener);
    };
  }

  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Clear emergency stop state (manual resume).
   */
  clearEmergencyStop(): void {
    this.emergencyStopTriggered = false;
    logger.info('[SafetyBoundarySystem] Emergency stop cleared');
  }

  /**
   * Check if emergency stop is active.
   */
  isEmergencyStopActive(): boolean {
    return this.emergencyStopTriggered;
  }

  /**
   * Get violation count.
   */
  getViolationCount(): number {
    return this.violationCount;
  }

  /**
   * Reset the safety system.
   */
  reset(): void {
    this.violationCount = 0;
    this.emergencyStopTriggered = false;
    this.hapticIntensity = { left: 0, right: 0 };
    logger.info('[SafetyBoundarySystem] Reset');
  }

  /**
   * Update config at runtime.
   */
  updateConfig(partial: Partial<SafetyBoundaryConfig>): void {
    this.config = { ...this.config, ...partial };
    if (partial.boundaries) {
      this.config.boundaries = partial.boundaries;
    }
  }

  /**
   * Destroy and release resources.
   */
  destroy(): void {
    this.destroyed = true;
    this.violationListeners = [];
    this.emergencyStopListeners = [];
    logger.info('[SafetyBoundarySystem] Destroyed');
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a SafetyBoundarySystem with optional config overrides.
 */
export function createSafetyBoundarySystem(
  config?: Partial<SafetyBoundaryConfig>,
): SafetyBoundarySystem {
  return new SafetyBoundarySystem(config);
}
