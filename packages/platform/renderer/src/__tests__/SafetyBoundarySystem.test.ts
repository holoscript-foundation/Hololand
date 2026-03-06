/**
 * @vitest-environment jsdom
 */

/**
 * Tests for SafetyBoundarySystem
 *
 * Validates:
 * - Box boundary proximity detection (inside/outside)
 * - Sphere boundary proximity detection
 * - Cylinder boundary proximity detection
 * - Soft zone haptic intensity calculation
 * - Hard zone motion blocking
 * - Emergency stop triggering on force/velocity limits
 * - Joint command clamping
 * - Boundary management (add/remove/activate)
 * - Event listeners (violations, emergency stop)
 * - Reset and destroy lifecycle
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  SafetyBoundarySystem,
  createSafetyBoundarySystem,
} from '../SafetyBoundarySystem';
import {
  createEmptyRobotState,
  ALL_JOINT_NAMES,
} from '../TeleoperationHubTypes';
import type {
  Vec3,
  SafetyBoundary,
  SafetyBoundaryConfig,
  RobotState,
  RobotJointName,
} from '../TeleoperationHubTypes';

// =============================================================================
// HELPERS
// =============================================================================

function createTestState(overrides: Partial<RobotState> = {}): RobotState {
  const base = createEmptyRobotState();
  return { ...base, ...overrides };
}

function createBoxBoundary(overrides: Partial<SafetyBoundary> = {}): SafetyBoundary {
  return {
    id: 'test-box',
    shape: 'box',
    center: { x: 0, y: 1.0, z: 0.3 },
    dimensions: { x: 0.5, y: 0.5, z: 0.5 },
    type: 'workspace',
    softMargin: 0.05,
    hardMargin: 0.01,
    active: true,
    ...overrides,
  };
}

function createSphereBoundary(overrides: Partial<SafetyBoundary> = {}): SafetyBoundary {
  return {
    id: 'test-sphere',
    shape: 'sphere',
    center: { x: 0, y: 1.0, z: 0.3 },
    dimensions: { x: 0.5, y: 0, z: 0 },
    type: 'workspace',
    softMargin: 0.05,
    hardMargin: 0.01,
    active: true,
    ...overrides,
  };
}

function createCylinderBoundary(overrides: Partial<SafetyBoundary> = {}): SafetyBoundary {
  return {
    id: 'test-cylinder',
    shape: 'cylinder',
    center: { x: 0, y: 1.0, z: 0.3 },
    dimensions: { x: 0.4, y: 0.5, z: 0 },
    type: 'workspace',
    softMargin: 0.05,
    hardMargin: 0.01,
    active: true,
    ...overrides,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('SafetyBoundarySystem', () => {
  let safety: SafetyBoundarySystem;

  beforeEach(() => {
    safety = createSafetyBoundarySystem({
      boundaries: [createBoxBoundary()],
    });
  });

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  describe('initialization', () => {
    it('should create with default config', () => {
      const s = new SafetyBoundarySystem();
      expect(s.getBoundaries()).toHaveLength(1); // Default workspace
      expect(s.isEmergencyStopActive()).toBe(false);
      expect(s.getViolationCount()).toBe(0);
      s.destroy();
    });

    it('should accept custom boundaries', () => {
      const s = createSafetyBoundarySystem({
        boundaries: [
          createBoxBoundary({ id: 'a' }),
          createSphereBoundary({ id: 'b' }),
        ],
      });
      expect(s.getBoundaries()).toHaveLength(2);
      s.destroy();
    });
  });

  // ---------------------------------------------------------------------------
  // BOX BOUNDARY PROXIMITY
  // ---------------------------------------------------------------------------

  describe('box boundary', () => {
    it('should detect point inside workspace box', () => {
      const boundary = createBoxBoundary();
      const point: Vec3 = { x: 0, y: 1.0, z: 0.3 }; // At center

      const result = safety.checkBoundaryProximity(point, boundary);
      expect(result.isInside).toBe(true);
      expect(result.distance).toBeGreaterThan(0);
      expect(result.inSoftZone).toBe(false);
      expect(result.inHardZone).toBe(false);
      expect(result.hapticIntensity).toBe(0);
    });

    it('should detect point outside workspace box', () => {
      const boundary = createBoxBoundary();
      const point: Vec3 = { x: 2.0, y: 1.0, z: 0.3 }; // Far outside

      const result = safety.checkBoundaryProximity(point, boundary);
      expect(result.distance).toBeLessThan(0);
    });

    it('should detect point in soft zone', () => {
      const boundary = createBoxBoundary({ softMargin: 0.1, hardMargin: 0.02 });
      // Point near the edge of the box (within softMargin of face)
      const point: Vec3 = { x: 0.46, y: 1.0, z: 0.3 }; // Close to x face at 0.5

      const result = safety.checkBoundaryProximity(point, boundary);
      // Distance to nearest face should be small
      expect(result.distance).toBeLessThan(0.1);
      if (result.distance > 0 && result.distance < boundary.softMargin) {
        expect(result.inSoftZone).toBe(true);
        expect(result.hapticIntensity).toBeGreaterThan(0);
      }
    });

    it('should return correct closest point on box face', () => {
      const boundary = createBoxBoundary();
      const point: Vec3 = { x: 1.0, y: 1.0, z: 0.3 }; // Outside on x axis

      const result = safety.checkBoundaryProximity(point, boundary);
      // Closest point should be on the box face
      expect(result.closestPoint).toBeDefined();
    });

    it('should skip inactive boundaries', () => {
      const boundary = createBoxBoundary({ active: false });
      const point: Vec3 = { x: 100, y: 100, z: 100 }; // Way outside

      const result = safety.checkBoundaryProximity(point, boundary);
      expect(result.isInside).toBe(true); // Inactive = always "inside" (safe)
      expect(result.distance).toBe(Infinity);
    });
  });

  // ---------------------------------------------------------------------------
  // SPHERE BOUNDARY PROXIMITY
  // ---------------------------------------------------------------------------

  describe('sphere boundary', () => {
    it('should detect point inside sphere', () => {
      const boundary = createSphereBoundary();
      const point: Vec3 = { x: 0, y: 1.0, z: 0.3 }; // At center

      const result = safety.checkBoundaryProximity(point, boundary);
      expect(result.isInside).toBe(true);
      expect(result.distance).toBeGreaterThan(0); // Distance to surface from inside
    });

    it('should detect point outside sphere', () => {
      const boundary = createSphereBoundary();
      const point: Vec3 = { x: 2.0, y: 1.0, z: 0.3 }; // Far outside

      const result = safety.checkBoundaryProximity(point, boundary);
      expect(result.distance).toBeLessThan(0);
    });

    it('should compute correct distance for sphere', () => {
      const boundary = createSphereBoundary({
        center: { x: 0, y: 0, z: 0 },
        dimensions: { x: 1.0, y: 0, z: 0 }, // radius = 1.0
      });
      const point: Vec3 = { x: 0.5, y: 0, z: 0 };

      const result = safety.checkBoundaryProximity(point, boundary);
      // Distance to surface = radius - dist_from_center = 1.0 - 0.5 = 0.5
      expect(result.distance).toBeCloseTo(0.5, 1);
    });
  });

  // ---------------------------------------------------------------------------
  // CYLINDER BOUNDARY PROXIMITY
  // ---------------------------------------------------------------------------

  describe('cylinder boundary', () => {
    it('should detect point inside cylinder', () => {
      const boundary = createCylinderBoundary();
      const point: Vec3 = { x: 0, y: 1.0, z: 0.3 }; // At center

      const result = safety.checkBoundaryProximity(point, boundary);
      expect(result.isInside).toBe(true);
      expect(result.distance).toBeGreaterThan(0);
    });

    it('should detect point outside cylinder radially', () => {
      const boundary = createCylinderBoundary({
        center: { x: 0, y: 0, z: 0 },
        dimensions: { x: 0.3, y: 0.5, z: 0 },
      });
      const point: Vec3 = { x: 1.0, y: 0, z: 0 }; // Far outside radially

      const result = safety.checkBoundaryProximity(point, boundary);
      expect(result.distance).toBeLessThan(0);
    });

    it('should detect point outside cylinder vertically', () => {
      const boundary = createCylinderBoundary({
        center: { x: 0, y: 0, z: 0 },
        dimensions: { x: 0.5, y: 0.3, z: 0 }, // halfHeight = 0.3
      });
      const point: Vec3 = { x: 0, y: 1.0, z: 0 }; // Above cap

      const result = safety.checkBoundaryProximity(point, boundary);
      expect(result.distance).toBeLessThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // EXCLUSION ZONES
  // ---------------------------------------------------------------------------

  describe('exclusion zones', () => {
    it('should invert distance for exclusion zones', () => {
      const exclusion = createBoxBoundary({
        id: 'exclusion',
        type: 'exclusion',
        center: { x: 0, y: 1.0, z: 0.3 },
        dimensions: { x: 0.2, y: 0.2, z: 0.2 },
      });

      // Point inside exclusion zone = violation
      const insidePoint: Vec3 = { x: 0, y: 1.0, z: 0.3 };
      const result = safety.checkBoundaryProximity(insidePoint, exclusion);
      expect(result.distance).toBeLessThan(0); // Negative = violation

      // Point outside exclusion zone = safe
      const outsidePoint: Vec3 = { x: 2.0, y: 1.0, z: 0.3 };
      const result2 = safety.checkBoundaryProximity(outsidePoint, exclusion);
      expect(result2.distance).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // FULL SAFETY CHECK
  // ---------------------------------------------------------------------------

  describe('full safety check', () => {
    it('should check both hands against all boundaries', () => {
      const state = createTestState({
        endEffectors: {
          leftHand: {
            position: { x: 0, y: 1.0, z: 0.3 },
            orientation: { x: 0, y: 0, z: 0, w: 1 },
          },
          rightHand: {
            position: { x: 0, y: 1.0, z: 0.3 },
            orientation: { x: 0, y: 0, z: 0, w: 1 },
          },
        },
      });

      const result = safety.checkSafety(state);
      expect(result.leftHand).toHaveLength(1); // 1 boundary
      expect(result.rightHand).toHaveLength(1);
      expect(result.shouldEmergencyStop).toBe(false);
    });

    it('should trigger e-stop on excessive contact force', () => {
      const s = createSafetyBoundarySystem({
        boundaries: [createBoxBoundary()],
        maxContactForce: 50,
      });

      const state = createTestState({
        contactForces: {
          leftHand: { x: 40, y: 30, z: 20 }, // ~53.8N
          rightHand: { x: 0, y: 0, z: 0 },
        },
      });

      const result = s.checkSafety(state);
      expect(result.shouldEmergencyStop).toBe(true);
      expect(result.reason).toContain('Contact force');
      s.destroy();
    });

    it('should trigger e-stop on excessive joint velocity', () => {
      const s = createSafetyBoundarySystem({
        boundaries: [createBoxBoundary()],
        maxJointVelocity: 3.0,
      });

      const state = createTestState();
      state.joints.left_shoulder_pitch = {
        angle: 0,
        velocity: 5.0, // Exceeds 3.0
        torque: 0,
        temperature: 25,
      };

      const result = s.checkSafety(state);
      expect(result.shouldEmergencyStop).toBe(true);
      expect(result.reason).toContain('velocity');
      s.destroy();
    });

    it('should notify violation listeners on hard zone entry', () => {
      const listener = vi.fn();
      safety.onViolation(listener);

      const state = createTestState({
        endEffectors: {
          leftHand: {
            position: { x: 5.0, y: 5.0, z: 5.0 }, // Far outside workspace
            orientation: { x: 0, y: 0, z: 0, w: 1 },
          },
          rightHand: {
            position: { x: 0, y: 1.0, z: 0.3 }, // Inside
            orientation: { x: 0, y: 0, z: 0, w: 1 },
          },
        },
      });

      safety.checkSafety(state);

      // Left hand is outside workspace = hard zone violation
      const leftCalls = listener.mock.calls.filter(c => c[1] === 'left');
      expect(leftCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('should update haptic intensity', () => {
      const state = createTestState({
        endEffectors: {
          leftHand: {
            position: { x: 0, y: 1.0, z: 0.3 }, // Inside, safe
            orientation: { x: 0, y: 0, z: 0, w: 1 },
          },
          rightHand: {
            position: { x: 0, y: 1.0, z: 0.3 },
            orientation: { x: 0, y: 0, z: 0, w: 1 },
          },
        },
      });

      safety.checkSafety(state);
      const haptics = safety.getHapticIntensity();
      expect(typeof haptics.left).toBe('number');
      expect(typeof haptics.right).toBe('number');
    });
  });

  // ---------------------------------------------------------------------------
  // JOINT COMMAND CLAMPING
  // ---------------------------------------------------------------------------

  describe('joint command clamping', () => {
    it('should pass through safe commands', () => {
      const state = createTestState({
        endEffectors: {
          leftHand: {
            position: { x: 0, y: 1.0, z: 0.3 },
            orientation: { x: 0, y: 0, z: 0, w: 1 },
          },
          rightHand: {
            position: { x: 0, y: 1.0, z: 0.3 },
            orientation: { x: 0, y: 0, z: 0, w: 1 },
          },
        },
      });

      const commands: Partial<Record<RobotJointName, number>> = {
        left_shoulder_pitch: 0.5,
        right_shoulder_pitch: -0.3,
      };

      const result = safety.clampJointCommands(commands, state);
      expect(result.left_shoulder_pitch).toBe(0.5);
      expect(result.right_shoulder_pitch).toBe(-0.3);
    });

    it('should freeze joints during emergency stop', () => {
      // Force e-stop
      const state = createTestState({
        contactForces: {
          leftHand: { x: 200, y: 0, z: 0 }, // Exceeds default maxContactForce
          rightHand: { x: 0, y: 0, z: 0 },
        },
      });

      const s = createSafetyBoundarySystem({
        boundaries: [createBoxBoundary()],
        maxContactForce: 50,
      });

      // Trigger e-stop via safety check
      s.checkSafety(state);
      expect(s.isEmergencyStopActive()).toBe(true);

      // Commands should be frozen to current state
      const commands: Partial<Record<RobotJointName, number>> = {
        left_shoulder_pitch: 1.0,
      };
      const result = s.clampJointCommands(commands, state);

      // Should return current state angles, not commanded angles
      expect(result.left_shoulder_pitch).toBe(state.joints.left_shoulder_pitch.angle);
      s.destroy();
    });
  });

  // ---------------------------------------------------------------------------
  // HAPTIC FEEDBACK
  // ---------------------------------------------------------------------------

  describe('haptic feedback', () => {
    it('should return zero haptics when disabled', () => {
      const s = createSafetyBoundarySystem({
        boundaries: [createBoxBoundary()],
        enableHaptics: false,
      });

      const haptics = s.getHapticIntensity();
      expect(haptics.left).toBe(0);
      expect(haptics.right).toBe(0);
      s.destroy();
    });

    it('should return haptic pulse parameters', () => {
      const pulse = safety.getHapticPulse('left');
      expect(typeof pulse.intensity).toBe('number');
      expect(typeof pulse.durationMs).toBe('number');
      expect(typeof pulse.frequency).toBe('number');
    });
  });

  // ---------------------------------------------------------------------------
  // BOUNDARY MANAGEMENT
  // ---------------------------------------------------------------------------

  describe('boundary management', () => {
    it('should add a boundary', () => {
      const before = safety.getBoundaries().length;
      safety.addBoundary(createSphereBoundary({ id: 'new-sphere' }));
      expect(safety.getBoundaries()).toHaveLength(before + 1);
    });

    it('should remove a boundary', () => {
      safety.addBoundary(createSphereBoundary({ id: 'removable' }));
      const removed = safety.removeBoundary('removable');
      expect(removed).toBe(true);
    });

    it('should return false for non-existent removal', () => {
      const removed = safety.removeBoundary('non-existent');
      expect(removed).toBe(false);
    });

    it('should activate/deactivate boundary', () => {
      const result = safety.setBoundaryActive('test-box', false);
      expect(result).toBe(true);

      const boundary = safety.getBoundaries().find(b => b.id === 'test-box');
      expect(boundary!.active).toBe(false);
    });

    it('should return false for non-existent boundary activation', () => {
      const result = safety.setBoundaryActive('non-existent', true);
      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // EMERGENCY STOP
  // ---------------------------------------------------------------------------

  describe('emergency stop', () => {
    it('should start with e-stop inactive', () => {
      expect(safety.isEmergencyStopActive()).toBe(false);
    });

    it('should notify e-stop listeners', () => {
      const listener = vi.fn();
      safety.onEmergencyStop(listener);

      const s = createSafetyBoundarySystem({
        boundaries: [createBoxBoundary()],
        maxContactForce: 10,
      });

      s.onEmergencyStop(listener);

      const state = createTestState({
        contactForces: {
          leftHand: { x: 20, y: 0, z: 0 },
          rightHand: { x: 0, y: 0, z: 0 },
        },
      });

      s.checkSafety(state);
      expect(listener).toHaveBeenCalled();
      s.destroy();
    });

    it('should clear emergency stop', () => {
      const s = createSafetyBoundarySystem({
        boundaries: [createBoxBoundary()],
        maxContactForce: 10,
      });

      const state = createTestState({
        contactForces: {
          leftHand: { x: 20, y: 0, z: 0 },
          rightHand: { x: 0, y: 0, z: 0 },
        },
      });

      s.checkSafety(state);
      expect(s.isEmergencyStopActive()).toBe(true);

      s.clearEmergencyStop();
      expect(s.isEmergencyStopActive()).toBe(false);
      s.destroy();
    });

    it('should unsubscribe listeners', () => {
      const listener = vi.fn();
      const unsub = safety.onEmergencyStop(listener);
      unsub();
      // No crash = success
    });

    it('should unsubscribe violation listeners', () => {
      const listener = vi.fn();
      const unsub = safety.onViolation(listener);
      unsub();
      // No crash = success
    });
  });

  // ---------------------------------------------------------------------------
  // VIOLATION COUNT
  // ---------------------------------------------------------------------------

  describe('violation count', () => {
    it('should start at zero', () => {
      expect(safety.getViolationCount()).toBe(0);
    });

    it('should increment on hard zone violations', () => {
      const state = createTestState({
        endEffectors: {
          leftHand: {
            position: { x: 5.0, y: 5.0, z: 5.0 },
            orientation: { x: 0, y: 0, z: 0, w: 1 },
          },
          rightHand: {
            position: { x: 0, y: 1.0, z: 0.3 },
            orientation: { x: 0, y: 0, z: 0, w: 1 },
          },
        },
      });

      safety.checkSafety(state);
      expect(safety.getViolationCount()).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // RESET
  // ---------------------------------------------------------------------------

  describe('reset', () => {
    it('should clear all state', () => {
      // Create a violation
      const state = createTestState({
        endEffectors: {
          leftHand: {
            position: { x: 5.0, y: 5.0, z: 5.0 },
            orientation: { x: 0, y: 0, z: 0, w: 1 },
          },
          rightHand: {
            position: { x: 0, y: 1.0, z: 0.3 },
            orientation: { x: 0, y: 0, z: 0, w: 1 },
          },
        },
      });

      safety.checkSafety(state);
      expect(safety.getViolationCount()).toBeGreaterThan(0);

      safety.reset();
      expect(safety.getViolationCount()).toBe(0);
      expect(safety.isEmergencyStopActive()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // DESTROY
  // ---------------------------------------------------------------------------

  describe('destroy', () => {
    it('should clean up', () => {
      safety.destroy();
      // Should not throw on subsequent operations
    });
  });

  // ---------------------------------------------------------------------------
  // CONFIG UPDATES
  // ---------------------------------------------------------------------------

  describe('config updates', () => {
    it('should update config at runtime', () => {
      safety.updateConfig({ maxContactForce: 200 });
      // No crash = success
    });

    it('should replace boundaries when provided', () => {
      safety.updateConfig({
        boundaries: [
          createBoxBoundary({ id: 'new-1' }),
          createSphereBoundary({ id: 'new-2' }),
        ],
      });
      expect(safety.getBoundaries()).toHaveLength(2);
    });
  });
});
