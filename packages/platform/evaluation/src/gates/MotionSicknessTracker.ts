/**
 * @hololand/evaluation MotionSicknessTracker
 *
 * Tracks factors that contribute to VR motion sickness.
 * Implements frame drop detection, camera velocity tracking, acceleration
 * monitoring, vection intensity estimation, comfort score (0-1), and
 * automatic quality reduction triggers.
 */

export interface MotionSicknessFactors {
  frameDropRate: number;
  rotationVelocityDegS: number;
  artificialLocomotion: boolean;
  fovReduction: number;
}

export interface SicknessAssessment {
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  score: number;
  recommendations: string[];
}

export interface CameraState {
  position: { x: number; y: number; z: number };
  rotationDeg: { pitch: number; yaw: number; roll: number };
  timestampMs: number;
}

export interface DetailedSicknessAssessment extends SicknessAssessment {
  comfortScore: number;             // 0-1 (1 = perfectly comfortable)
  cameraVelocityMps: number;
  cameraAccelerationMps2: number;
  rotationalAccelDegS2: number;
  vectionIntensity: number;         // 0-1
  frameDropSeverity: number;        // 0-1
  qualityReductions: QualityReduction[];
  shouldTriggerReduction: boolean;
}

export interface QualityReduction {
  type: 'fov_vignette' | 'reduce_speed' | 'snap_turn' | 'lower_resolution' | 'reduce_draw_distance';
  reason: string;
  severity: 'mild' | 'moderate' | 'aggressive';
}

export interface MotionTrackerConfig {
  /** Score threshold to trigger quality reduction (0-10 scale) */
  reductionThreshold: number;
  /** Score threshold for critical alert */
  criticalThreshold: number;
  /** Window size for velocity smoothing (number of frames) */
  velocitySmoothingWindow: number;
  /** Maximum comfortable linear velocity (m/s) */
  maxComfortableVelocityMps: number;
  /** Maximum comfortable angular velocity (deg/s) */
  maxComfortableAngularVelocityDegS: number;
  /** Maximum comfortable linear acceleration (m/s^2) */
  maxComfortableAccelerationMps2: number;
  /** Vection ramp-up time constant (seconds) */
  vectionTimeConstantSec: number;
  /** Frame drop rate that begins causing discomfort */
  frameDropDiscomfortThreshold: number;
}

const DEFAULT_TRACKER_CONFIG: MotionTrackerConfig = {
  reductionThreshold: 4.0,
  criticalThreshold: 7.0,
  velocitySmoothingWindow: 10,
  maxComfortableVelocityMps: 3.0,
  maxComfortableAngularVelocityDegS: 60,
  maxComfortableAccelerationMps2: 5.0,
  vectionTimeConstantSec: 2.0,
  frameDropDiscomfortThreshold: 0.03,
};

export class MotionSicknessTracker {
  private readings: MotionSicknessFactors[] = [];
  private maxReadings: number = 300;
  private config: MotionTrackerConfig;

  // Camera tracking state
  private cameraHistory: CameraState[] = [];
  private maxCameraHistory: number = 60; // ~1 second at 60fps

  // Velocity/acceleration tracking
  private linearVelocities: number[] = [];
  private angularVelocities: number[] = [];

  // Vection state
  private vectionAccumulator: number = 0;
  private lastVectionUpdateMs: number = 0;
  private isInArtificialLocomotion: boolean = false;

  // Frame drop tracking
  private frameTimestamps: number[] = [];
  private expectedFrameTimeMs: number = 11.1; // 90Hz
  private consecutiveDrops: number = 0;

  // Quality reduction state
  private activeReductions: QualityReduction[] = [];

  constructor(config?: Partial<MotionTrackerConfig>) {
    this.config = { ...DEFAULT_TRACKER_CONFIG, ...config };
  }

  // ── Original API (preserved) ─────────────────────────────────────

  record(factors: MotionSicknessFactors): SicknessAssessment {
    this.readings.push(factors);
    if (this.readings.length > this.maxReadings) this.readings.shift();

    let score = 0;
    score += factors.frameDropRate * 3;
    score += Math.min(1, factors.rotationVelocityDegS / 180) * 2;
    score += factors.artificialLocomotion ? 1.5 : 0;
    score -= factors.fovReduction * 0.5;
    score = Math.max(0, Math.min(10, score));

    const recommendations: string[] = [];
    if (factors.frameDropRate > 0.05) recommendations.push('Reduce scene complexity to avoid frame drops');
    if (factors.rotationVelocityDegS > 90) recommendations.push('Limit rotation speed');
    if (factors.artificialLocomotion) recommendations.push('Consider teleportation instead');

    const riskLevel: SicknessAssessment['riskLevel'] =
      score < 2 ? 'low' : score < 4 ? 'moderate' : score < 7 ? 'high' : 'critical';
    return { riskLevel, score, recommendations };
  }

  getAverageScore(): number {
    if (this.readings.length === 0) return 0;
    return this.readings.reduce((sum, r) => {
      let s = r.frameDropRate * 3 + Math.min(1, r.rotationVelocityDegS / 180) * 2;
      s += r.artificialLocomotion ? 1.5 : 0;
      return sum + Math.max(0, Math.min(10, s));
    }, 0) / this.readings.length;
  }

  // ── Camera velocity tracking ─────────────────────────────────────

  /**
   * Record a camera state for velocity and acceleration computation.
   * Should be called every frame.
   */
  recordCameraState(state: CameraState): void {
    this.cameraHistory.push(state);
    if (this.cameraHistory.length > this.maxCameraHistory) {
      this.cameraHistory.shift();
    }

    if (this.cameraHistory.length >= 2) {
      const prev = this.cameraHistory[this.cameraHistory.length - 2];
      const curr = state;
      const dtSec = (curr.timestampMs - prev.timestampMs) / 1000;

      if (dtSec > 0) {
        // Linear velocity
        const dx = curr.position.x - prev.position.x;
        const dy = curr.position.y - prev.position.y;
        const dz = curr.position.z - prev.position.z;
        const linearVel = Math.sqrt(dx * dx + dy * dy + dz * dz) / dtSec;
        this.linearVelocities.push(linearVel);
        if (this.linearVelocities.length > this.config.velocitySmoothingWindow) {
          this.linearVelocities.shift();
        }

        // Angular velocity (using rotation magnitudes)
        const dPitch = curr.rotationDeg.pitch - prev.rotationDeg.pitch;
        const dYaw = curr.rotationDeg.yaw - prev.rotationDeg.yaw;
        const dRoll = curr.rotationDeg.roll - prev.rotationDeg.roll;
        const angularVel = Math.sqrt(dPitch * dPitch + dYaw * dYaw + dRoll * dRoll) / dtSec;
        this.angularVelocities.push(angularVel);
        if (this.angularVelocities.length > this.config.velocitySmoothingWindow) {
          this.angularVelocities.shift();
        }
      }
    }
  }

  /**
   * Get smoothed current camera linear velocity (m/s).
   */
  getCameraVelocity(): number {
    if (this.linearVelocities.length === 0) return 0;
    return this.linearVelocities.reduce((a, b) => a + b, 0) / this.linearVelocities.length;
  }

  /**
   * Get current camera linear acceleration (m/s^2).
   */
  getCameraAcceleration(): number {
    if (this.linearVelocities.length < 2) return 0;
    const recent = this.linearVelocities.slice(-3);
    if (recent.length < 2) return 0;

    // Approximate acceleration from velocity differences
    // Assume constant frame interval for simplicity
    const dtSec = this.expectedFrameTimeMs / 1000;
    let totalAccel = 0;
    for (let i = 1; i < recent.length; i++) {
      totalAccel += Math.abs(recent[i] - recent[i - 1]) / dtSec;
    }
    return totalAccel / (recent.length - 1);
  }

  /**
   * Get smoothed rotational angular velocity (deg/s).
   */
  getAngularVelocity(): number {
    if (this.angularVelocities.length === 0) return 0;
    return this.angularVelocities.reduce((a, b) => a + b, 0) / this.angularVelocities.length;
  }

  /**
   * Get rotational acceleration (deg/s^2).
   */
  getRotationalAcceleration(): number {
    if (this.angularVelocities.length < 2) return 0;
    const recent = this.angularVelocities.slice(-3);
    if (recent.length < 2) return 0;

    const dtSec = this.expectedFrameTimeMs / 1000;
    let totalAccel = 0;
    for (let i = 1; i < recent.length; i++) {
      totalAccel += Math.abs(recent[i] - recent[i - 1]) / dtSec;
    }
    return totalAccel / (recent.length - 1);
  }

  // ── Frame drop detection ─────────────────────────────────────────

  /**
   * Record a frame timestamp for drop detection.
   */
  recordFrameTimestamp(timestampMs: number): void {
    this.frameTimestamps.push(timestampMs);
    if (this.frameTimestamps.length > 300) {
      this.frameTimestamps.shift();
    }

    // Detect consecutive drops
    if (this.frameTimestamps.length >= 2) {
      const last = this.frameTimestamps[this.frameTimestamps.length - 1];
      const prev = this.frameTimestamps[this.frameTimestamps.length - 2];
      const frameTime = last - prev;

      if (frameTime > this.expectedFrameTimeMs * 1.5) {
        this.consecutiveDrops++;
      } else {
        this.consecutiveDrops = 0;
      }
    }
  }

  /**
   * Get the frame drop rate over the recent window (0-1).
   */
  getFrameDropRate(): number {
    if (this.frameTimestamps.length < 2) return 0;

    let drops = 0;
    for (let i = 1; i < this.frameTimestamps.length; i++) {
      const dt = this.frameTimestamps[i] - this.frameTimestamps[i - 1];
      if (dt > this.expectedFrameTimeMs * 1.5) drops++;
    }

    return drops / (this.frameTimestamps.length - 1);
  }

  // ── Vection intensity estimation ─────────────────────────────────

  /**
   * Update vection intensity based on current movement state.
   * Vection (illusory sense of self-motion) builds up over time during
   * artificial locomotion and decays when stopped.
   */
  updateVection(isMoving: boolean, timestampMs: number): number {
    const dtSec = this.lastVectionUpdateMs > 0
      ? (timestampMs - this.lastVectionUpdateMs) / 1000
      : 0;
    this.lastVectionUpdateMs = timestampMs;
    this.isInArtificialLocomotion = isMoving;

    if (isMoving) {
      // Vection builds up with time constant
      const target = 1.0;
      const rate = 1 - Math.exp(-dtSec / this.config.vectionTimeConstantSec);
      this.vectionAccumulator += (target - this.vectionAccumulator) * rate;
    } else {
      // Vection decays faster than it builds (0.5x time constant)
      const rate = 1 - Math.exp(-dtSec / (this.config.vectionTimeConstantSec * 0.5));
      this.vectionAccumulator *= (1 - rate);
    }

    this.vectionAccumulator = Math.max(0, Math.min(1, this.vectionAccumulator));
    return this.vectionAccumulator;
  }

  getVectionIntensity(): number {
    return this.vectionAccumulator;
  }

  // ── Comfort score ────────────────────────────────────────────────

  /**
   * Compute a comprehensive comfort score 0-1 (1 = perfectly comfortable).
   * Combines all sickness factors into a single metric.
   */
  getComfortScore(): number {
    const velocity = this.getCameraVelocity();
    const acceleration = this.getCameraAcceleration();
    const angularVel = this.getAngularVelocity();
    const frameDropRate = this.getFrameDropRate();
    const vection = this.vectionAccumulator;

    // Each factor contributes a penalty
    const velocityPenalty = Math.min(1, velocity / this.config.maxComfortableVelocityMps) * 0.2;
    const accelPenalty = Math.min(1, acceleration / this.config.maxComfortableAccelerationMps2) * 0.2;
    const angularPenalty = Math.min(1, angularVel / this.config.maxComfortableAngularVelocityDegS) * 0.2;
    const frameDropPenalty = Math.min(1, frameDropRate / this.config.frameDropDiscomfortThreshold) * 0.25;
    const vectionPenalty = vection * 0.15;

    const totalPenalty = velocityPenalty + accelPenalty + angularPenalty + frameDropPenalty + vectionPenalty;
    return Math.max(0, Math.min(1, 1 - totalPenalty));
  }

  // ── Detailed assessment ──────────────────────────────────────────

  /**
   * Get a comprehensive sickness assessment with all tracked metrics.
   */
  getDetailedAssessment(): DetailedSicknessAssessment {
    const velocity = this.getCameraVelocity();
    const acceleration = this.getCameraAcceleration();
    const angularVel = this.getAngularVelocity();
    const rotAccel = this.getRotationalAcceleration();
    const frameDropRate = this.getFrameDropRate();
    const vection = this.vectionAccumulator;
    const comfortScore = this.getComfortScore();

    // Compute overall risk score (0-10)
    let score = 0;
    score += Math.min(3, (velocity / this.config.maxComfortableVelocityMps) * 3);
    score += Math.min(2, (angularVel / this.config.maxComfortableAngularVelocityDegS) * 2);
    score += Math.min(2, frameDropRate * 20);
    score += Math.min(2, vection * 2);
    score += Math.min(1, (acceleration / this.config.maxComfortableAccelerationMps2) * 1);
    score = Math.max(0, Math.min(10, score));

    const riskLevel: SicknessAssessment['riskLevel'] =
      score < 2 ? 'low' : score < 4 ? 'moderate' : score < 7 ? 'high' : 'critical';

    // Generate recommendations
    const recommendations: string[] = [];
    if (frameDropRate > this.config.frameDropDiscomfortThreshold) {
      recommendations.push('Frame drops detected. Reduce scene complexity or target a lower resolution.');
    }
    if (angularVel > this.config.maxComfortableAngularVelocityDegS) {
      recommendations.push('High rotation speed. Consider snap turning or reducing turn rate.');
    }
    if (velocity > this.config.maxComfortableVelocityMps) {
      recommendations.push('Movement speed exceeds comfort threshold. Reduce locomotion speed.');
    }
    if (acceleration > this.config.maxComfortableAccelerationMps2) {
      recommendations.push('Sudden acceleration detected. Use gradual speed ramps.');
    }
    if (vection > 0.6) {
      recommendations.push('High vection intensity. Apply FOV vignette or use teleportation.');
    }

    // Determine quality reductions
    const qualityReductions = this.computeQualityReductions(
      score, velocity, angularVel, frameDropRate, vection, acceleration,
    );
    const shouldTrigger = score >= this.config.reductionThreshold;

    // Frame drop severity (0-1)
    const frameDropSeverity = Math.min(1, frameDropRate * 10 + this.consecutiveDrops * 0.1);

    return {
      riskLevel,
      score,
      recommendations,
      comfortScore,
      cameraVelocityMps: velocity,
      cameraAccelerationMps2: acceleration,
      rotationalAccelDegS2: rotAccel,
      vectionIntensity: vection,
      frameDropSeverity,
      qualityReductions,
      shouldTriggerReduction: shouldTrigger,
    };
  }

  // ── Automatic quality reduction triggers ─────────────────────────

  private computeQualityReductions(
    score: number,
    velocity: number,
    angularVel: number,
    frameDropRate: number,
    vection: number,
    acceleration: number,
  ): QualityReduction[] {
    const reductions: QualityReduction[] = [];

    if (score < this.config.reductionThreshold) return reductions;

    // FOV vignette for high vection or velocity
    if (vection > 0.4 || velocity > this.config.maxComfortableVelocityMps * 0.8) {
      reductions.push({
        type: 'fov_vignette',
        reason: `Vection (${vection.toFixed(2)}) or velocity (${velocity.toFixed(1)} m/s) causing discomfort`,
        severity: vection > 0.7 ? 'aggressive' : vection > 0.5 ? 'moderate' : 'mild',
      });
    }

    // Snap turn for high angular velocity
    if (angularVel > this.config.maxComfortableAngularVelocityDegS) {
      reductions.push({
        type: 'snap_turn',
        reason: `Angular velocity ${angularVel.toFixed(0)} deg/s exceeds comfort limit`,
        severity: angularVel > this.config.maxComfortableAngularVelocityDegS * 2 ? 'aggressive' : 'moderate',
      });
    }

    // Reduce speed for high acceleration
    if (acceleration > this.config.maxComfortableAccelerationMps2 * 0.8) {
      reductions.push({
        type: 'reduce_speed',
        reason: `Acceleration ${acceleration.toFixed(1)} m/s^2 causing discomfort`,
        severity: acceleration > this.config.maxComfortableAccelerationMps2 * 1.5 ? 'aggressive' : 'moderate',
      });
    }

    // Lower resolution for frame drops
    if (frameDropRate > this.config.frameDropDiscomfortThreshold) {
      reductions.push({
        type: 'lower_resolution',
        reason: `Frame drop rate ${(frameDropRate * 100).toFixed(1)}% causing judder`,
        severity: frameDropRate > 0.1 ? 'aggressive' : frameDropRate > 0.05 ? 'moderate' : 'mild',
      });
    }

    // Reduce draw distance as last resort for critical sickness levels
    if (score >= this.config.criticalThreshold) {
      reductions.push({
        type: 'reduce_draw_distance',
        reason: `Critical sickness score (${score.toFixed(1)}/10). Emergency quality reduction.`,
        severity: 'aggressive',
      });
    }

    this.activeReductions = reductions;
    return reductions;
  }

  /**
   * Get currently active quality reductions.
   */
  getActiveReductions(): QualityReduction[] {
    return [...this.activeReductions];
  }

  // ── Configuration ────────────────────────────────────────────────

  setExpectedFrameTime(frameTimeMs: number): void {
    this.expectedFrameTimeMs = frameTimeMs;
  }

  getConfig(): MotionTrackerConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<MotionTrackerConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // ── Reset ────────────────────────────────────────────────────────

  reset(): void {
    this.readings = [];
    this.cameraHistory = [];
    this.linearVelocities = [];
    this.angularVelocities = [];
    this.vectionAccumulator = 0;
    this.lastVectionUpdateMs = 0;
    this.isInArtificialLocomotion = false;
    this.frameTimestamps = [];
    this.consecutiveDrops = 0;
    this.activeReductions = [];
  }
}
