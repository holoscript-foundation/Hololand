/**
 * RobotTelemetryDisplay
 *
 * Renders robot state telemetry as a HUD-style display in VR space.
 * Shows joint angles, contact forces, battery level, network latency,
 * and health status with visual warnings.
 *
 * DISPLAY LAYOUT (on a virtual panel in VR):
 * ```
 * +-----------------------------------+
 * |  ROBOT TELEMETRY                  |
 * +-----------------------------------+
 * |  Mode: TELEOPERATION    [BAT 85%] |
 * |  Latency: 12ms          [HEALTH]  |
 * +-----------------------------------+
 * |  LEFT ARM          RIGHT ARM      |
 * |  S.P: -0.45 rad    S.P: 0.32 rad |
 * |  S.R:  1.20 rad    S.R: -0.98 rad|
 * |  E.P: -1.05 rad    E.P:  1.12 rad|
 * |  W.Y:  0.15 rad    W.Y: -0.22 rad|
 * |  Grip: 0.70        Grip: 0.85    |
 * +-----------------------------------+
 * |  FORCES  L: 5.2N    R: 3.1N      |
 * |  TEMP    Max: 42C   Avg: 35C     |
 * +-----------------------------------+
 * |  [!] Warnings: None              |
 * +-----------------------------------+
 * ```
 *
 * PERFORMANCE:
 * - Updates at configurable rate (default 10Hz), NOT every frame
 * - Canvas 2D text rendering is cached and only redrawn on change
 * - Text layout is pre-computed to avoid per-frame string allocation
 *
 * @module RobotTelemetryDisplay
 */

import { logger } from './logger';
import type {
  Vec3,
  RobotState,
  TelemetryDisplayConfig,
  TelemetryWarningThresholds,
  RobotJointName,
} from './TeleoperationHubTypes';
import {
  DEFAULT_TELEMETRY_CONFIG,
  ALL_JOINT_NAMES,
} from './TeleoperationHubTypes';

// =============================================================================
// TELEMETRY DISPLAY
// =============================================================================

/**
 * Warning entry for display.
 */
export interface TelemetryWarning {
  type: 'battery' | 'latency' | 'temperature' | 'force' | 'health';
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

export class RobotTelemetryDisplay {
  private config: TelemetryDisplayConfig;

  /** Canvas for rendering text HUD. */
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  /** Cached state for dirty checking. */
  private lastRenderedSequence: number = -1;
  private warnings: TelemetryWarning[] = [];

  /** Update rate limiter. */
  private lastUpdateTime: number = 0;
  private updateIntervalMs: number;

  /** Current position. */
  private position: Vec3;

  /** Destroyed flag. */
  private destroyed: boolean = false;

  constructor(config: Partial<TelemetryDisplayConfig> = {}) {
    this.config = { ...DEFAULT_TELEMETRY_CONFIG, ...config };
    this.position = { ...this.config.position };
    this.updateIntervalMs = 1000 / this.config.updateRateHz;

    // Create canvas for text rendering (512x768 covers HUD detail at VR resolution)
    if (typeof document !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 512;
      this.canvas.height = 768;
      this.ctx = this.canvas.getContext('2d');
    }

    logger.info('[RobotTelemetryDisplay] Initialized', {
      updateRate: this.config.updateRateHz,
    });
  }

  /**
   * Update the telemetry display with new robot state.
   * Returns true if the display was actually redrawn.
   */
  update(state: RobotState): boolean {
    if (this.destroyed) return false;

    const now = performance.now();
    if (now - this.lastUpdateTime < this.updateIntervalMs) {
      return false; // Rate limited
    }
    this.lastUpdateTime = now;

    // Skip if state hasn't changed
    if (state.sequence === this.lastRenderedSequence) {
      return false;
    }
    this.lastRenderedSequence = state.sequence;

    // Check for warnings
    this.warnings = this.checkWarnings(state);

    // Render the HUD
    this.renderHud(state);

    return true;
  }

  /**
   * Check state against warning thresholds.
   */
  checkWarnings(state: RobotState): TelemetryWarning[] {
    const warnings: TelemetryWarning[] = [];
    const thresholds = this.config.warningThresholds;

    // Battery
    if (state.batteryLevel < thresholds.lowBattery) {
      warnings.push({
        type: 'battery',
        message: `Battery low: ${(state.batteryLevel * 100).toFixed(0)}%`,
        severity: state.batteryLevel < thresholds.lowBattery / 2 ? 'critical' : 'warning',
      });
    }

    // Latency
    if (state.networkLatencyMs > thresholds.highLatency) {
      warnings.push({
        type: 'latency',
        message: `High latency: ${state.networkLatencyMs.toFixed(0)}ms`,
        severity: state.networkLatencyMs > thresholds.highLatency * 2 ? 'critical' : 'warning',
      });
    }

    // Joint temperatures
    let maxTemp = 0;
    for (const name of ALL_JOINT_NAMES) {
      const temp = state.joints[name]?.temperature ?? 0;
      if (temp > maxTemp) maxTemp = temp;
    }
    if (maxTemp > thresholds.highTemp) {
      warnings.push({
        type: 'temperature',
        message: `Motor overheat: ${maxTemp.toFixed(0)}C`,
        severity: maxTemp > thresholds.highTemp * 1.2 ? 'critical' : 'warning',
      });
    }

    // Contact forces
    const leftForce = this.vec3Magnitude(state.contactForces.leftHand);
    const rightForce = this.vec3Magnitude(state.contactForces.rightHand);
    const maxForce = Math.max(leftForce, rightForce);
    if (maxForce > thresholds.highForce) {
      warnings.push({
        type: 'force',
        message: `High force: ${maxForce.toFixed(1)}N`,
        severity: maxForce > thresholds.highForce * 1.5 ? 'critical' : 'warning',
      });
    }

    // Health flags
    if (state.healthFlags.motorOverheat) {
      warnings.push({ type: 'health', message: 'Motor overheat detected', severity: 'critical' });
    }
    if (state.healthFlags.sensorFault) {
      warnings.push({ type: 'health', message: 'Sensor fault', severity: 'critical' });
    }
    if (state.healthFlags.communicationLoss) {
      warnings.push({ type: 'health', message: 'Communication loss', severity: 'critical' });
    }
    if (state.healthFlags.collisionDetected) {
      warnings.push({ type: 'health', message: 'Collision detected', severity: 'warning' });
    }

    // Emergency stop
    if (state.emergencyStopActive) {
      warnings.push({ type: 'health', message: 'EMERGENCY STOP ACTIVE', severity: 'critical' });
    }

    return warnings;
  }

  /**
   * Render the telemetry HUD onto the canvas.
   */
  private renderHud(state: RobotState): void {
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = 0.85;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1.0;

    let y = 10;
    const lineHeight = 20;
    const leftCol = 15;
    const rightCol = w / 2 + 10;

    // Title
    ctx.fillStyle = '#00ccff';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('ROBOT TELEMETRY', leftCol, y += lineHeight);

    // Separator
    ctx.strokeStyle = '#00ccff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(5, y + 5);
    ctx.lineTo(w - 5, y + 5);
    ctx.stroke();
    y += 15;

    // Mode and battery
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px monospace';
    ctx.fillText(`Mode: ${state.operatingMode.toUpperCase()}`, leftCol, y += lineHeight);

    const battPct = (state.batteryLevel * 100).toFixed(0);
    const battColor = state.batteryLevel > 0.5 ? '#00ff00' : state.batteryLevel > 0.2 ? '#ffff00' : '#ff0000';
    ctx.fillStyle = battColor;
    ctx.fillText(`BAT ${battPct}%${state.isCharging ? ' [CHG]' : ''}`, rightCol + 60, y);

    // Latency
    ctx.fillStyle = '#ffffff';
    const latColor = state.networkLatencyMs < 30 ? '#00ff00' : state.networkLatencyMs < 80 ? '#ffff00' : '#ff0000';
    ctx.fillText(`Latency:`, leftCol, y += lineHeight);
    ctx.fillStyle = latColor;
    ctx.fillText(`${state.networkLatencyMs.toFixed(0)}ms`, leftCol + 90, y);

    // Separator
    y += 10;
    ctx.strokeStyle = '#444444';
    ctx.beginPath();
    ctx.moveTo(5, y);
    ctx.lineTo(w - 5, y);
    ctx.stroke();
    y += 5;

    // Joint angles - left arm
    if (this.config.showJointDiagram) {
      ctx.fillStyle = '#00ccff';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('LEFT ARM', leftCol, y += lineHeight);
      ctx.fillText('RIGHT ARM', rightCol, y);

      ctx.font = '12px monospace';
      const leftJoints: RobotJointName[] = [
        'left_shoulder_pitch', 'left_shoulder_roll', 'left_elbow_pitch',
        'left_wrist_yaw', 'left_grip',
      ];
      const rightJoints: RobotJointName[] = [
        'right_shoulder_pitch', 'right_shoulder_roll', 'right_elbow_pitch',
        'right_wrist_yaw', 'right_grip',
      ];
      const shortNames = ['S.P', 'S.R', 'E.P', 'W.Y', 'Grp'];

      for (let i = 0; i < leftJoints.length; i++) {
        y += lineHeight;
        const lAngle = state.joints[leftJoints[i]]?.angle ?? 0;
        const rAngle = state.joints[rightJoints[i]]?.angle ?? 0;
        ctx.fillStyle = '#cccccc';
        ctx.fillText(`${shortNames[i]}: ${lAngle.toFixed(2)} rad`, leftCol, y);
        ctx.fillText(`${shortNames[i]}: ${rAngle.toFixed(2)} rad`, rightCol, y);
      }
    }

    // Forces
    if (this.config.showForceVectors) {
      y += 15;
      ctx.strokeStyle = '#444444';
      ctx.beginPath();
      ctx.moveTo(5, y);
      ctx.lineTo(w - 5, y);
      ctx.stroke();
      y += 5;

      ctx.fillStyle = '#00ccff';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('FORCES', leftCol, y += lineHeight);

      ctx.font = '12px monospace';
      const lf = this.vec3Magnitude(state.contactForces.leftHand);
      const rf = this.vec3Magnitude(state.contactForces.rightHand);
      ctx.fillStyle = '#cccccc';
      ctx.fillText(`L: ${lf.toFixed(1)}N  R: ${rf.toFixed(1)}N`, leftCol, y += lineHeight);

      // Temperatures
      let maxT = 0, sumT = 0, count = 0;
      for (const name of ALL_JOINT_NAMES) {
        const temp = state.joints[name]?.temperature ?? 0;
        sumT += temp;
        count++;
        if (temp > maxT) maxT = temp;
      }
      const avgT = count > 0 ? sumT / count : 0;
      ctx.fillText(`TEMP Max: ${maxT.toFixed(0)}C  Avg: ${avgT.toFixed(0)}C`, leftCol, y += lineHeight);
    }

    // Warnings
    y += 15;
    ctx.strokeStyle = '#444444';
    ctx.beginPath();
    ctx.moveTo(5, y);
    ctx.lineTo(w - 5, y);
    ctx.stroke();
    y += 5;

    ctx.font = 'bold 13px monospace';
    if (this.warnings.length === 0) {
      ctx.fillStyle = '#00ff00';
      ctx.fillText('STATUS: OK', leftCol, y += lineHeight);
    } else {
      for (const warning of this.warnings) {
        y += lineHeight;
        switch (warning.severity) {
          case 'critical':
            ctx.fillStyle = '#ff0000';
            break;
          case 'warning':
            ctx.fillStyle = '#ffff00';
            break;
          default:
            ctx.fillStyle = '#00ccff';
        }
        ctx.fillText(`[!] ${warning.message}`, leftCol, y);
      }
    }
  }

  /**
   * Get display geometry for VR rendering.
   */
  getDisplayGeometry(): {
    position: Vec3;
    width: number;
    height: number;
    canvas: HTMLCanvasElement | null;
  } {
    return {
      position: { ...this.position },
      width: this.config.size.width,
      height: this.config.size.height,
      canvas: this.canvas,
    };
  }

  /**
   * Get current warnings.
   */
  getWarnings(): ReadonlyArray<TelemetryWarning> {
    return this.warnings;
  }

  /**
   * Get the current position.
   */
  getPosition(): Vec3 {
    return { ...this.position };
  }

  /**
   * Set position.
   */
  setPosition(position: Vec3): void {
    this.position = { ...position };
  }

  /**
   * Update config at runtime.
   */
  updateConfig(partial: Partial<TelemetryDisplayConfig>): void {
    this.config = { ...this.config, ...partial };
    this.updateIntervalMs = 1000 / this.config.updateRateHz;
  }

  /**
   * Reset state.
   */
  reset(): void {
    this.lastRenderedSequence = -1;
    this.warnings = [];
    this.lastUpdateTime = 0;
    logger.info('[RobotTelemetryDisplay] Reset');
  }

  /**
   * Destroy and release resources.
   */
  destroy(): void {
    this.destroyed = true;
    this.canvas = null;
    this.ctx = null;
    this.warnings = [];
    logger.info('[RobotTelemetryDisplay] Destroyed');
  }

  /**
   * Vector magnitude helper.
   */
  private vec3Magnitude(v: Vec3): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a RobotTelemetryDisplay with optional config overrides.
 */
export function createRobotTelemetryDisplay(
  config?: Partial<TelemetryDisplayConfig>,
): RobotTelemetryDisplay {
  return new RobotTelemetryDisplay(config);
}
