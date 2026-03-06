/**
 * @vitest-environment jsdom
 */

/**
 * Tests for RobotTelemetryDisplay
 *
 * Validates:
 * - Warning detection for battery, latency, temperature, force, health
 * - Rate limiting of updates
 * - Canvas rendering
 * - Display geometry
 * - Config updates
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
  RobotTelemetryDisplay,
  createRobotTelemetryDisplay,
} from '../RobotTelemetryDisplay';
import type { TelemetryWarning } from '../RobotTelemetryDisplay';
import { createEmptyRobotState } from '../TeleoperationHubTypes';
import type { RobotState } from '../TeleoperationHubTypes';

// =============================================================================
// HELPERS
// =============================================================================

function createTestState(overrides: Partial<RobotState> = {}): RobotState {
  const base = createEmptyRobotState();
  return { ...base, ...overrides, sequence: overrides.sequence ?? 1 };
}

// =============================================================================
// TESTS
// =============================================================================

describe('RobotTelemetryDisplay', () => {
  let display: RobotTelemetryDisplay;

  beforeEach(() => {
    display = createRobotTelemetryDisplay();
  });

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  describe('initialization', () => {
    it('should create with default config', () => {
      expect(display).toBeDefined();
      expect(display.getWarnings()).toHaveLength(0);
    });

    it('should create canvas', () => {
      const geo = display.getDisplayGeometry();
      expect(geo.canvas).not.toBeNull();
      expect(geo.canvas!.width).toBe(512);
      expect(geo.canvas!.height).toBe(768);
    });

    it('should accept config overrides', () => {
      const d = createRobotTelemetryDisplay({
        updateRateHz: 30,
        position: { x: 1, y: 2, z: 3 },
      });
      const geo = d.getDisplayGeometry();
      expect(geo.position).toEqual({ x: 1, y: 2, z: 3 });
      d.destroy();
    });
  });

  // ---------------------------------------------------------------------------
  // WARNING DETECTION
  // ---------------------------------------------------------------------------

  describe('warning detection', () => {
    it('should detect low battery', () => {
      const state = createTestState({ batteryLevel: 0.05 });
      const warnings = display.checkWarnings(state);

      const batteryWarning = warnings.find(w => w.type === 'battery');
      expect(batteryWarning).toBeDefined();
      expect(batteryWarning!.severity).toBe('critical'); // < 0.1 (half of 0.2 threshold)
    });

    it('should detect warning-level battery', () => {
      const state = createTestState({ batteryLevel: 0.15 });
      const warnings = display.checkWarnings(state);

      const batteryWarning = warnings.find(w => w.type === 'battery');
      expect(batteryWarning).toBeDefined();
      expect(batteryWarning!.severity).toBe('warning');
    });

    it('should not warn on healthy battery', () => {
      const state = createTestState({ batteryLevel: 0.85 });
      const warnings = display.checkWarnings(state);

      const batteryWarning = warnings.find(w => w.type === 'battery');
      expect(batteryWarning).toBeUndefined();
    });

    it('should detect high latency', () => {
      const state = createTestState({ networkLatencyMs: 110 });
      const warnings = display.checkWarnings(state);

      const latencyWarning = warnings.find(w => w.type === 'latency');
      expect(latencyWarning).toBeDefined();
      expect(latencyWarning!.severity).toBe('critical'); // > 100ms = 2x 50ms threshold
    });

    it('should detect warning-level latency', () => {
      const state = createTestState({ networkLatencyMs: 60 });
      const warnings = display.checkWarnings(state);

      const latencyWarning = warnings.find(w => w.type === 'latency');
      expect(latencyWarning).toBeDefined();
      expect(latencyWarning!.severity).toBe('warning');
    });

    it('should detect high temperature', () => {
      const state = createTestState();
      // Set one joint to high temperature
      state.joints.left_shoulder_pitch = {
        angle: 0,
        velocity: 0,
        torque: 0,
        temperature: 75,
      };

      const warnings = display.checkWarnings(state);
      const tempWarning = warnings.find(w => w.type === 'temperature');
      expect(tempWarning).toBeDefined();
    });

    it('should detect high contact force', () => {
      const state = createTestState({
        contactForces: {
          leftHand: { x: 40, y: 30, z: 20 }, // magnitude ~53.8N
          rightHand: { x: 0, y: 0, z: 0 },
        },
      });

      const warnings = display.checkWarnings(state);
      const forceWarning = warnings.find(w => w.type === 'force');
      expect(forceWarning).toBeDefined();
    });

    it('should detect health flag issues', () => {
      const state = createTestState();
      state.healthFlags.motorOverheat = true;
      state.healthFlags.sensorFault = true;

      const warnings = display.checkWarnings(state);
      const healthWarnings = warnings.filter(w => w.type === 'health');
      expect(healthWarnings.length).toBeGreaterThanOrEqual(2);
    });

    it('should detect emergency stop active', () => {
      const state = createTestState({ emergencyStopActive: true });

      const warnings = display.checkWarnings(state);
      const estopWarning = warnings.find(w => w.message.includes('EMERGENCY'));
      expect(estopWarning).toBeDefined();
      expect(estopWarning!.severity).toBe('critical');
    });

    it('should detect collision', () => {
      const state = createTestState();
      state.healthFlags.collisionDetected = true;

      const warnings = display.checkWarnings(state);
      const collisionWarning = warnings.find(w => w.message.includes('Collision'));
      expect(collisionWarning).toBeDefined();
    });

    it('should detect communication loss', () => {
      const state = createTestState();
      state.healthFlags.communicationLoss = true;

      const warnings = display.checkWarnings(state);
      const commWarning = warnings.find(w => w.message.includes('Communication'));
      expect(commWarning).toBeDefined();
      expect(commWarning!.severity).toBe('critical');
    });

    it('should return no warnings for healthy state', () => {
      const state = createTestState({
        batteryLevel: 0.9,
        networkLatencyMs: 10,
      });

      const warnings = display.checkWarnings(state);
      expect(warnings).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // UPDATE RATE LIMITING
  // ---------------------------------------------------------------------------

  describe('update rate limiting', () => {
    it('should render on first update', () => {
      const state = createTestState();
      const rendered = display.update(state);
      expect(rendered).toBe(true);
    });

    it('should skip update for same sequence', () => {
      const state = createTestState({ sequence: 5 });
      display.update(state); // First render

      // Same sequence should not re-render
      const rendered = display.update(state);
      expect(rendered).toBe(false);
    });

    it('should render for new sequence after rate interval', async () => {
      // Use a very high update rate to avoid rate limiting
      const d = createRobotTelemetryDisplay({ updateRateHz: 1000 });

      const state1 = createTestState({ sequence: 1 });
      d.update(state1);

      // Wait briefly
      await new Promise(resolve => setTimeout(resolve, 5));

      const state2 = createTestState({ sequence: 2 });
      const rendered = d.update(state2);
      expect(rendered).toBe(true);
      d.destroy();
    });
  });

  // ---------------------------------------------------------------------------
  // DISPLAY GEOMETRY
  // ---------------------------------------------------------------------------

  describe('display geometry', () => {
    it('should return correct geometry', () => {
      const geo = display.getDisplayGeometry();
      expect(geo.width).toBeGreaterThan(0);
      expect(geo.height).toBeGreaterThan(0);
      expect(geo.canvas).not.toBeNull();
    });

    it('should return position copy', () => {
      const pos = display.getPosition();
      pos.x = 999;
      expect(display.getPosition().x).not.toBe(999);
    });

    it('should update position', () => {
      display.setPosition({ x: 1, y: 2, z: 3 });
      expect(display.getPosition()).toEqual({ x: 1, y: 2, z: 3 });
    });
  });

  // ---------------------------------------------------------------------------
  // CONFIG UPDATES
  // ---------------------------------------------------------------------------

  describe('config updates', () => {
    it('should update rate at runtime', () => {
      display.updateConfig({ updateRateHz: 30 });
      // Should not throw
    });

    it('should update warning thresholds', () => {
      display.updateConfig({
        warningThresholds: {
          lowBattery: 0.5,
          highLatency: 20,
          highTemp: 40,
          highForce: 20,
        },
      });

      // Now a 30% battery should trigger warning (threshold is 50%)
      const state = createTestState({ batteryLevel: 0.3 });
      const warnings = display.checkWarnings(state);
      const batteryWarning = warnings.find(w => w.type === 'battery');
      expect(batteryWarning).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // RESET
  // ---------------------------------------------------------------------------

  describe('reset', () => {
    it('should clear warnings and sequence', () => {
      const state = createTestState({ batteryLevel: 0.1, sequence: 5 });
      display.update(state);
      expect(display.getWarnings().length).toBeGreaterThan(0);

      display.reset();
      expect(display.getWarnings()).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // DESTROY
  // ---------------------------------------------------------------------------

  describe('destroy', () => {
    it('should release resources', () => {
      display.destroy();
      const geo = display.getDisplayGeometry();
      expect(geo.canvas).toBeNull();
      expect(display.getWarnings()).toHaveLength(0);
    });

    it('should not update after destroy', () => {
      display.destroy();
      const state = createTestState();
      const rendered = display.update(state);
      expect(rendered).toBe(false);
    });
  });
});
