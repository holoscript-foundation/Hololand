/**
 * @hololand/gestures - Emotion & Frustration Detection
 */

import { Vec3, HandPose, BodyPose, BodyJoint } from './types';

// ============================================================================
// Frustration Estimator
// ============================================================================

export interface FrustrationMetrics {
  /** Overall frustration score (0-1) */
  score: number;
  /** Head shake frequency */
  headShakeIntensity: number;
  /** Hand tremor amount */
  handTremor: number;
  /** Rapid/jerky movements */
  movementAgitation: number;
  /** Time since last successful interaction */
  idleTime: number;
  /** Repeated failed actions */
  failureStreak: number;
}

/**
 * Estimates user frustration from body language
 */
export class FrustrationEstimator {
  private headShakeDetector: HeadShakeDetector;
  private handTremorAnalyzer: HandTremorAnalyzer;
  private lastSuccessTime = Date.now();
  private failureCount = 0;
  private movementHistory: Vec3[] = [];
  private readonly historySize = 60; // 1 second at 60fps

  constructor() {
    this.headShakeDetector = new HeadShakeDetector();
    this.handTremorAnalyzer = new HandTremorAnalyzer();
  }

  /**
   * Update with new tracking data
   */
  update(bodyPose?: BodyPose, leftHand?: HandPose, rightHand?: HandPose): FrustrationMetrics {
    const now = Date.now();

    // Detect head shakes
    let headShakeIntensity = 0;
    if (bodyPose) {
      const head = bodyPose.joints.get(BodyJoint.HEAD);
      if (head) {
        headShakeIntensity = this.headShakeDetector.update(head.position);
      }
    }

    // Detect hand tremor
    let handTremor = 0;
    if (leftHand) {
      handTremor = Math.max(handTremor, this.handTremorAnalyzer.update(leftHand.palmPosition, 'left'));
    }
    if (rightHand) {
      handTremor = Math.max(handTremor, this.handTremorAnalyzer.update(rightHand.palmPosition, 'right'));
    }

    // Track movement agitation
    const currentPos = leftHand?.palmPosition || rightHand?.palmPosition;
    let movementAgitation = 0;
    if (currentPos) {
      this.movementHistory.push({ ...currentPos });
      if (this.movementHistory.length > this.historySize) {
        this.movementHistory.shift();
      }
      movementAgitation = this.calculateAgitation();
    }

    // Calculate idle time
    const idleTime = (now - this.lastSuccessTime) / 1000;

    // Calculate overall score
    const score = this.calculateScore(headShakeIntensity, handTremor, movementAgitation, idleTime);

    return {
      score,
      headShakeIntensity,
      handTremor,
      movementAgitation,
      idleTime,
      failureStreak: this.failureCount,
    };
  }

  /**
   * Record a successful interaction
   */
  recordSuccess(): void {
    this.lastSuccessTime = Date.now();
    this.failureCount = 0;
  }

  /**
   * Record a failed interaction
   */
  recordFailure(): void {
    this.failureCount++;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.lastSuccessTime = Date.now();
    this.failureCount = 0;
    this.movementHistory = [];
    this.headShakeDetector.reset();
    this.handTremorAnalyzer.reset();
  }

  private calculateAgitation(): number {
    if (this.movementHistory.length < 10) return 0;

    // Calculate velocity changes
    let totalAcceleration = 0;
    for (let i = 2; i < this.movementHistory.length; i++) {
      const v1 = this.velocity(this.movementHistory[i - 2], this.movementHistory[i - 1]);
      const v2 = this.velocity(this.movementHistory[i - 1], this.movementHistory[i]);
      const acc = this.distance(v1, v2);
      totalAcceleration += acc;
    }

    const avgAcceleration = totalAcceleration / (this.movementHistory.length - 2);
    // Normalize to 0-1 range (0.05 m/frame^2 = max agitation)
    return Math.min(1, avgAcceleration / 0.05);
  }

  private calculateScore(
    headShake: number,
    tremor: number,
    agitation: number,
    idleTime: number
  ): number {
    // Weighted combination
    const weights = {
      headShake: 0.25,
      tremor: 0.2,
      agitation: 0.25,
      idle: 0.15,
      failures: 0.15,
    };

    const idleScore = Math.min(1, idleTime / 30); // Max at 30 seconds
    const failureScore = Math.min(1, this.failureCount / 5); // Max at 5 failures

    return (
      headShake * weights.headShake +
      tremor * weights.tremor +
      agitation * weights.agitation +
      idleScore * weights.idle +
      failureScore * weights.failures
    );
  }

  private velocity(a: Vec3, b: Vec3): Vec3 {
    return {
      x: b.x - a.x,
      y: b.y - a.y,
      z: b.z - a.z,
    };
  }

  private distance(a: Vec3, b: Vec3): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
  }
}

// ============================================================================
// Head Shake Detector
// ============================================================================

/**
 * Detects head shaking (frustration indicator)
 */
export class HeadShakeDetector {
  private positions: Vec3[] = [];
  private readonly bufferSize = 30; // ~0.5 second at 60fps
  private shakeThreshold = 0.02; // 2cm displacement

  /**
   * Update with new head position
   * @returns Shake intensity (0-1)
   */
  update(position: Vec3): number {
    this.positions.push({ ...position });
    if (this.positions.length > this.bufferSize) {
      this.positions.shift();
    }

    if (this.positions.length < 10) return 0;

    return this.detectShake();
  }

  /**
   * Reset detector
   */
  reset(): void {
    this.positions = [];
  }

  private detectShake(): number {
    // Look for oscillating X movement (left-right shaking)
    let directionChanges = 0;
    let lastDirection = 0;
    let maxDisplacement = 0;

    for (let i = 1; i < this.positions.length; i++) {
      const dx = this.positions[i].x - this.positions[i - 1].x;
      const currentDirection = Math.sign(dx);

      if (currentDirection !== 0 && currentDirection !== lastDirection) {
        directionChanges++;
        lastDirection = currentDirection;
      }

      maxDisplacement = Math.max(maxDisplacement, Math.abs(dx));
    }

    // Need at least 3 direction changes and noticeable displacement
    if (directionChanges < 3 || maxDisplacement < this.shakeThreshold) {
      return 0;
    }

    // Normalize: 6 direction changes = intensity 1.0
    const changeIntensity = Math.min(1, directionChanges / 6);
    const displacementIntensity = Math.min(1, maxDisplacement / 0.05);

    return changeIntensity * displacementIntensity;
  }
}

// ============================================================================
// Hand Tremor Analyzer
// ============================================================================

/**
 * Analyzes hand tremor (nervousness/frustration indicator)
 */
export class HandTremorAnalyzer {
  private leftHistory: Vec3[] = [];
  private rightHistory: Vec3[] = [];
  private readonly bufferSize = 30;
  private readonly tremorThreshold = 0.003; // 3mm

  /**
   * Update with new hand position
   * @returns Tremor intensity (0-1)
   */
  update(position: Vec3, hand: 'left' | 'right'): number {
    const history = hand === 'left' ? this.leftHistory : this.rightHistory;

    history.push({ ...position });
    if (history.length > this.bufferSize) {
      history.shift();
    }

    if (history.length < 10) return 0;

    return this.analyzeTremor(history);
  }

  /**
   * Reset analyzer
   */
  reset(): void {
    this.leftHistory = [];
    this.rightHistory = [];
  }

  private analyzeTremor(history: Vec3[]): number {
    // Calculate average position
    const avg = { x: 0, y: 0, z: 0 };
    for (const pos of history) {
      avg.x += pos.x;
      avg.y += pos.y;
      avg.z += pos.z;
    }
    avg.x /= history.length;
    avg.y /= history.length;
    avg.z /= history.length;

    // Calculate variance from average (tremor is small, rapid deviation)
    let variance = 0;
    for (const pos of history) {
      const dist = Math.sqrt(
        (pos.x - avg.x) ** 2 + (pos.y - avg.y) ** 2 + (pos.z - avg.z) ** 2
      );
      variance += dist * dist;
    }
    variance /= history.length;
    const stdDev = Math.sqrt(variance);

    // Tremor is characterized by small, rapid movements
    // Large movements are intentional, not tremor
    if (stdDev > 0.05) {
      return 0; // Too much movement to be tremor
    }

    // Normalize: 1cm std dev = intensity 1.0
    return Math.min(1, stdDev / 0.01);
  }
}
