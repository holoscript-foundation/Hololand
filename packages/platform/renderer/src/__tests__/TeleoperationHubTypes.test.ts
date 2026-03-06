/**
 * @vitest-environment jsdom
 */

/**
 * Tests for TeleoperationHubTypes
 *
 * Validates:
 * - Type constants and defaults
 * - Factory functions for empty state objects
 * - Joint name definitions and counts
 * - Default configuration values
 */

import { describe, it, expect } from 'vitest';

import {
  ALL_JOINT_NAMES,
  JOINT_COUNT,
  DEFAULT_JOINT_LIMITS,
  DEFAULT_IK_CONFIG,
  DEFAULT_POLICY_STREAM_CONFIG,
  DEFAULT_CAMERA_OVERLAY_CONFIG,
  DEFAULT_TELEMETRY_CONFIG,
  DEFAULT_SAFETY_CONFIG,
  DEFAULT_HUB_CONFIG,
  WsMessageType,
  WS_HEADER_SIZE,
  JOINT_COMMAND_PAYLOAD_SIZE,
  POLICY_ACTION_SIZE,
  POLICY_ACTION_PAYLOAD_SIZE,
  createEmptyRobotState,
  createEmptyMetrics,
} from '../TeleoperationHubTypes';
import type {
  Vec3,
  Quat,
  RobotJointName,
  JointState,
  RobotState,
  HandTrackingInput,
  IKSolveResult,
  BoundaryProximityResult,
  TeleoperationHubMetrics,
} from '../TeleoperationHubTypes';

// =============================================================================
// TESTS
// =============================================================================

describe('TeleoperationHubTypes', () => {
  // ---------------------------------------------------------------------------
  // JOINT DEFINITIONS
  // ---------------------------------------------------------------------------

  describe('Joint definitions', () => {
    it('should have 37 joint names', () => {
      expect(JOINT_COUNT).toBe(37);
      expect(ALL_JOINT_NAMES).toHaveLength(37);
    });

    it('should contain all expected joint categories', () => {
      const headJoints = ALL_JOINT_NAMES.filter(n => n.startsWith('head_'));
      const torsoJoints = ALL_JOINT_NAMES.filter(n => n.startsWith('torso_'));
      const leftArmJoints = ALL_JOINT_NAMES.filter(n =>
        n.startsWith('left_shoulder') || n.startsWith('left_elbow') || n.startsWith('left_wrist'));
      const rightArmJoints = ALL_JOINT_NAMES.filter(n =>
        n.startsWith('right_shoulder') || n.startsWith('right_elbow') || n.startsWith('right_wrist'));
      const leftHandJoints = ALL_JOINT_NAMES.filter(n =>
        n === 'left_grip' || n === 'left_thumb' || n === 'left_index');
      const rightHandJoints = ALL_JOINT_NAMES.filter(n =>
        n === 'right_grip' || n === 'right_thumb' || n === 'right_index');
      const leftLegJoints = ALL_JOINT_NAMES.filter(n =>
        n.startsWith('left_hip') || n.startsWith('left_knee') || n.startsWith('left_ankle'));
      const rightLegJoints = ALL_JOINT_NAMES.filter(n =>
        n.startsWith('right_hip') || n.startsWith('right_knee') || n.startsWith('right_ankle'));

      expect(headJoints).toHaveLength(2);
      expect(torsoJoints).toHaveLength(3);
      expect(leftArmJoints).toHaveLength(7);
      expect(rightArmJoints).toHaveLength(7);
      expect(leftHandJoints).toHaveLength(3);
      expect(rightHandJoints).toHaveLength(3);
      expect(leftLegJoints).toHaveLength(6);
      expect(rightLegJoints).toHaveLength(6);
    });

    it('should have joint names that are unique', () => {
      const uniqueNames = new Set(ALL_JOINT_NAMES);
      expect(uniqueNames.size).toBe(ALL_JOINT_NAMES.length);
    });

    it('should have limits defined for every joint', () => {
      for (const name of ALL_JOINT_NAMES) {
        const limits = DEFAULT_JOINT_LIMITS[name];
        expect(limits).toBeDefined();
        expect(limits.min).toBeLessThanOrEqual(limits.max);
        expect(limits.maxVelocity).toBeGreaterThan(0);
        expect(limits.maxTorque).toBeGreaterThan(0);
      }
    });

    it('should have symmetric joint limits for arms', () => {
      // Shoulder pitch should have same range magnitude (but possibly flipped)
      const leftSP = DEFAULT_JOINT_LIMITS['left_shoulder_pitch'];
      const rightSP = DEFAULT_JOINT_LIMITS['right_shoulder_pitch'];
      expect(leftSP.maxVelocity).toBe(rightSP.maxVelocity);
      expect(leftSP.maxTorque).toBe(rightSP.maxTorque);
    });
  });

  // ---------------------------------------------------------------------------
  // BINARY PROTOCOL CONSTANTS
  // ---------------------------------------------------------------------------

  describe('Binary protocol constants', () => {
    it('should have correct header size', () => {
      // 1 byte type + 4 bytes sequence + 4 bytes timestamp
      expect(WS_HEADER_SIZE).toBe(9);
    });

    it('should have correct joint command payload size', () => {
      expect(JOINT_COMMAND_PAYLOAD_SIZE).toBe(JOINT_COUNT * 4); // float32 per joint
      expect(JOINT_COMMAND_PAYLOAD_SIZE).toBe(148); // 37 joints * 4 bytes
    });

    it('should have correct policy action sizes', () => {
      expect(POLICY_ACTION_SIZE).toBe(256);
      expect(POLICY_ACTION_PAYLOAD_SIZE).toBe(256 * 4);
      expect(POLICY_ACTION_PAYLOAD_SIZE).toBe(1024);
    });

    it('should have distinct message types', () => {
      const types = [
        WsMessageType.JOINT_COMMAND,
        WsMessageType.STATE_TELEMETRY,
        WsMessageType.POLICY_ACTION,
        WsMessageType.CAMERA_FRAME,
        WsMessageType.HEARTBEAT,
        WsMessageType.EMERGENCY_STOP,
        WsMessageType.RESUME,
        WsMessageType.ERROR,
        WsMessageType.CALIBRATE,
        WsMessageType.CALIBRATION_RESULT,
      ];
      const uniqueTypes = new Set(types);
      expect(uniqueTypes.size).toBe(types.length);
    });
  });

  // ---------------------------------------------------------------------------
  // FACTORY FUNCTIONS
  // ---------------------------------------------------------------------------

  describe('createEmptyRobotState', () => {
    it('should create a valid empty state', () => {
      const state = createEmptyRobotState();

      expect(state.timestamp).toBe(0);
      expect(state.sequence).toBe(0);
      expect(state.batteryLevel).toBe(1.0);
      expect(state.isCharging).toBe(false);
      expect(state.operatingMode).toBe('idle');
      expect(state.emergencyStopActive).toBe(false);
      expect(state.networkLatencyMs).toBe(0);
    });

    it('should have joints initialized for all names', () => {
      const state = createEmptyRobotState();
      for (const name of ALL_JOINT_NAMES) {
        expect(state.joints[name]).toBeDefined();
        expect(state.joints[name].angle).toBe(0);
        expect(state.joints[name].velocity).toBe(0);
        expect(state.joints[name].torque).toBe(0);
        expect(state.joints[name].temperature).toBe(25);
      }
    });

    it('should have identity quaternions for orientations', () => {
      const state = createEmptyRobotState();
      const identityQuat: Quat = { x: 0, y: 0, z: 0, w: 1 };

      expect(state.endEffectors.leftHand.orientation).toEqual(identityQuat);
      expect(state.endEffectors.rightHand.orientation).toEqual(identityQuat);
      expect(state.baseOrientation).toEqual(identityQuat);
    });

    it('should have all health flags false', () => {
      const state = createEmptyRobotState();
      expect(state.healthFlags.motorOverheat).toBe(false);
      expect(state.healthFlags.lowBattery).toBe(false);
      expect(state.healthFlags.sensorFault).toBe(false);
      expect(state.healthFlags.communicationLoss).toBe(false);
      expect(state.healthFlags.jointLimitViolation).toBe(false);
      expect(state.healthFlags.collisionDetected).toBe(false);
    });

    it('should produce independent instances', () => {
      const state1 = createEmptyRobotState();
      const state2 = createEmptyRobotState();
      state1.batteryLevel = 0.5;
      expect(state2.batteryLevel).toBe(1.0);
    });
  });

  describe('createEmptyMetrics', () => {
    it('should create valid empty metrics', () => {
      const metrics = createEmptyMetrics();

      expect(metrics.connectionState).toBe('disconnected');
      expect(metrics.latencyMs).toBe(0);
      expect(metrics.commandRateHz).toBe(0);
      expect(metrics.telemetryRateHz).toBe(0);
      expect(metrics.cameraFps).toBe(0);
      expect(metrics.ikSolveTimeMs).toBe(0);
      expect(metrics.npuInferenceTimeMs).toBe(0);
      expect(metrics.boundaryViolations).toBe(0);
      expect(metrics.totalFrames).toBe(0);
      expect(metrics.uptimeSeconds).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // DEFAULT CONFIGS
  // ---------------------------------------------------------------------------

  describe('Default configurations', () => {
    it('IK config should have reasonable defaults', () => {
      expect(DEFAULT_IK_CONFIG.maxIterations).toBeGreaterThan(0);
      expect(DEFAULT_IK_CONFIG.convergenceThreshold).toBeGreaterThan(0);
      expect(DEFAULT_IK_CONFIG.convergenceThreshold).toBeLessThan(0.1);
      expect(DEFAULT_IK_CONFIG.damping).toBeGreaterThan(0);
      expect(DEFAULT_IK_CONFIG.damping).toBeLessThanOrEqual(1);
      expect(DEFAULT_IK_CONFIG.smoothingFactor).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_IK_CONFIG.smoothingFactor).toBeLessThanOrEqual(1);
    });

    it('Policy stream config should have valid defaults', () => {
      expect(DEFAULT_POLICY_STREAM_CONFIG.robotUrl).toMatch(/^ws:\/\//);
      expect(DEFAULT_POLICY_STREAM_CONFIG.reconnectIntervalMs).toBeGreaterThan(0);
      expect(DEFAULT_POLICY_STREAM_CONFIG.maxReconnectAttempts).toBeGreaterThan(0);
      expect(DEFAULT_POLICY_STREAM_CONFIG.heartbeatIntervalMs).toBeGreaterThan(0);
      expect(DEFAULT_POLICY_STREAM_CONFIG.heartbeatTimeoutMs).toBeGreaterThan(DEFAULT_POLICY_STREAM_CONFIG.heartbeatIntervalMs);
      expect(DEFAULT_POLICY_STREAM_CONFIG.commandRateHz).toBeGreaterThan(0);
    });

    it('Camera overlay config should have valid defaults', () => {
      expect(DEFAULT_CAMERA_OVERLAY_CONFIG.opacity).toBeGreaterThan(0);
      expect(DEFAULT_CAMERA_OVERLAY_CONFIG.opacity).toBeLessThanOrEqual(1);
      expect(DEFAULT_CAMERA_OVERLAY_CONFIG.resolution.width).toBeGreaterThan(0);
      expect(DEFAULT_CAMERA_OVERLAY_CONFIG.resolution.height).toBeGreaterThan(0);
      expect(DEFAULT_CAMERA_OVERLAY_CONFIG.size.width).toBeGreaterThan(0);
      expect(DEFAULT_CAMERA_OVERLAY_CONFIG.size.height).toBeGreaterThan(0);
    });

    it('Telemetry config should have valid defaults', () => {
      expect(DEFAULT_TELEMETRY_CONFIG.updateRateHz).toBeGreaterThan(0);
      expect(DEFAULT_TELEMETRY_CONFIG.warningThresholds.lowBattery).toBeGreaterThan(0);
      expect(DEFAULT_TELEMETRY_CONFIG.warningThresholds.lowBattery).toBeLessThan(1);
      expect(DEFAULT_TELEMETRY_CONFIG.warningThresholds.highLatency).toBeGreaterThan(0);
      expect(DEFAULT_TELEMETRY_CONFIG.warningThresholds.highTemp).toBeGreaterThan(0);
      expect(DEFAULT_TELEMETRY_CONFIG.warningThresholds.highForce).toBeGreaterThan(0);
    });

    it('Safety config should have valid defaults', () => {
      expect(DEFAULT_SAFETY_CONFIG.boundaries).toHaveLength(1);
      expect(DEFAULT_SAFETY_CONFIG.boundaries[0].id).toBe('workspace');
      expect(DEFAULT_SAFETY_CONFIG.boundaries[0].shape).toBe('box');
      expect(DEFAULT_SAFETY_CONFIG.boundaries[0].active).toBe(true);
      expect(DEFAULT_SAFETY_CONFIG.maxHapticIntensity).toBeGreaterThan(0);
      expect(DEFAULT_SAFETY_CONFIG.maxContactForce).toBeGreaterThan(0);
      expect(DEFAULT_SAFETY_CONFIG.maxJointVelocity).toBeGreaterThan(0);
    });

    it('Hub config should compose all subsystem configs', () => {
      expect(DEFAULT_HUB_CONFIG.ikSolver).toBeDefined();
      expect(DEFAULT_HUB_CONFIG.policyStream).toBeDefined();
      expect(DEFAULT_HUB_CONFIG.cameraOverlay).toBeDefined();
      expect(DEFAULT_HUB_CONFIG.telemetry).toBeDefined();
      expect(DEFAULT_HUB_CONFIG.safety).toBeDefined();
      expect(DEFAULT_HUB_CONFIG.npuModelName).toBe('groot-n1.6-agent');
      expect(DEFAULT_HUB_CONFIG.enableNpuInference).toBe(true);
      expect(DEFAULT_HUB_CONFIG.npuInferenceRateHz).toBe(30);
    });
  });
});
