/**
 * @hololand/agents PhysicsAdherence
 *
 * Evaluates agent compliance with physics rules in the VR world.
 * Tracks violations for impossible forces, gravity defiance, collision ignoring,
 * and mass cheating. Returns a 0-1 adherence score with configurable decay.
 */

export interface PhysicsViolation {
  type: 'gravity' | 'collision' | 'force' | 'mass';
  severity: number;       // 0-1
  timestamp: number;
  details: string;
}

export interface PhysicsConfig {
  /** Gravitational acceleration constant (m/s^2). Default 9.81 */
  gravity: number;
  /** Maximum allowed force magnitude an agent can apply (Newtons) */
  maxForceMagnitude: number;
  /** Minimum expected mass for an agent body (kg) */
  minMass: number;
  /** Maximum expected mass for an agent body (kg) */
  maxMass: number;
  /** Tolerance factor for collision overlap before flagging (meters) */
  collisionOverlapTolerance: number;
  /** Maximum seconds an agent can remain unsupported in air before gravity violation */
  maxAirTimeSeconds: number;
  /** Decay half-life in ms for violation score (default 30 min) */
  decayHalfLifeMs: number;
  /** Base penalty per violation */
  basePenalty: number;
}

const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  gravity: 9.81,
  maxForceMagnitude: 5000,
  minMass: 0.1,
  maxMass: 10000,
  collisionOverlapTolerance: 0.05,
  maxAirTimeSeconds: 2.0,
  decayHalfLifeMs: 1_800_000, // 30 minutes
  basePenalty: 0.15,
};

export class PhysicsAdherence {
  private config: PhysicsConfig;
  private violations: PhysicsViolation[] = [];
  private airTimeStart: number | null = null;

  constructor(config?: Partial<PhysicsConfig>) {
    this.config = { ...DEFAULT_PHYSICS_CONFIG, ...config };
  }

  // ── Core evaluation with time-decay ──────────────────────────────

  /**
   * Compute aggregate physics adherence score 0-1 where 1 = fully adherent.
   * Each violation decays exponentially by age.
   */
  evaluate(violations?: number): number {
    // Legacy overload: raw violation count
    if (violations !== undefined && this.violations.length === 0) {
      return Math.max(0, 1 - violations * 0.15);
    }

    if (this.violations.length === 0) return 1;

    const now = Date.now();
    let totalPenalty = 0;

    for (const v of this.violations) {
      const ageMs = now - v.timestamp;
      const decayFactor = Math.pow(0.5, ageMs / this.config.decayHalfLifeMs);
      totalPenalty += this.config.basePenalty * v.severity * decayFactor;
    }

    return Math.max(0, Math.min(1, 1 - totalPenalty));
  }

  // ── Gravity check ────────────────────────────────────────────────

  /**
   * Check whether an agent is defying gravity.
   * @param isGrounded - whether the agent has ground support
   * @param verticalVelocity - current vertical velocity (m/s, positive = up)
   * @param timestampMs - current time
   * Returns true if compliant.
   */
  checkGravity(
    isGrounded: boolean,
    verticalVelocity: number,
    timestampMs: number = Date.now(),
  ): boolean {
    if (isGrounded) {
      this.airTimeStart = null;
      return true;
    }

    // Agent is airborne
    if (this.airTimeStart === null) {
      this.airTimeStart = timestampMs;
    }

    const airTimeSec = (timestampMs - this.airTimeStart) / 1000;

    // Check if floating too long without downward velocity
    if (airTimeSec > this.config.maxAirTimeSeconds && verticalVelocity >= 0) {
      const severity = Math.min(1, airTimeSec / (this.config.maxAirTimeSeconds * 5));
      this.recordViolation('gravity', severity,
        `Airborne for ${airTimeSec.toFixed(1)}s with upward velocity ${verticalVelocity.toFixed(1)} m/s`);
      return false;
    }

    // Check if vertical velocity is physically impossible (accelerating upward without support)
    const maxNaturalUpVelocity = Math.sqrt(2 * this.config.gravity * 3); // ~3m jump height
    if (verticalVelocity > maxNaturalUpVelocity && airTimeSec > 0.5) {
      const overFactor = verticalVelocity / maxNaturalUpVelocity;
      const severity = Math.min(1, (overFactor - 1) / 3);
      this.recordViolation('gravity', severity,
        `Impossible upward velocity: ${verticalVelocity.toFixed(1)} m/s (max natural: ${maxNaturalUpVelocity.toFixed(1)})`);
      return false;
    }

    return true;
  }

  // ── Collision check ──────────────────────────────────────────────

  /**
   * Check whether an agent is ignoring collision boundaries.
   * @param overlapDepth - how far the agent overlaps with a solid object (meters)
   * @param objectId - identifier of the collided object
   * Returns true if compliant (overlap within tolerance).
   */
  checkCollision(overlapDepth: number, objectId: string = 'unknown'): boolean {
    if (overlapDepth <= this.config.collisionOverlapTolerance) {
      return true;
    }

    const excessOverlap = overlapDepth - this.config.collisionOverlapTolerance;
    const severity = Math.min(1, excessOverlap / 2); // 2m overlap = max severity
    this.recordViolation('collision', severity,
      `Collision overlap of ${overlapDepth.toFixed(3)}m with object '${objectId}' (tolerance: ${this.config.collisionOverlapTolerance}m)`);
    return false;
  }

  // ── Force check ──────────────────────────────────────────────────

  /**
   * Check whether an applied force is within physically plausible limits.
   * @param forceVector - the force vector { x, y, z } in Newtons
   * @param agentMass - mass of the agent applying force (kg)
   * Returns true if the force is within limits.
   */
  checkForce(
    forceVector: { x: number; y: number; z: number },
    agentMass: number = 80,
  ): boolean {
    const magnitude = Math.sqrt(
      forceVector.x ** 2 + forceVector.y ** 2 + forceVector.z ** 2,
    );

    if (magnitude <= this.config.maxForceMagnitude) {
      return true;
    }

    const overFactor = magnitude / this.config.maxForceMagnitude;
    const severity = Math.min(1, (overFactor - 1) / 10);
    this.recordViolation('force', severity,
      `Force magnitude ${magnitude.toFixed(0)}N exceeds max ${this.config.maxForceMagnitude}N (agent mass: ${agentMass}kg)`);
    return false;
  }

  // ── Mass check ───────────────────────────────────────────────────

  /**
   * Check whether an agent's reported mass is within plausible bounds.
   * @param reportedMass - the mass the agent claims (kg)
   * Returns true if mass is within configured bounds.
   */
  checkMass(reportedMass: number): boolean {
    if (reportedMass >= this.config.minMass && reportedMass <= this.config.maxMass) {
      return true;
    }

    const severity = reportedMass < this.config.minMass
      ? Math.min(1, (this.config.minMass - reportedMass) / this.config.minMass)
      : Math.min(1, (reportedMass - this.config.maxMass) / this.config.maxMass);

    this.recordViolation('mass', severity,
      `Reported mass ${reportedMass}kg outside bounds [${this.config.minMass}, ${this.config.maxMass}]`);
    return false;
  }

  // ── Violation management ─────────────────────────────────────────

  private recordViolation(type: PhysicsViolation['type'], severity: number, details: string): void {
    this.violations.push({
      type,
      severity: Math.max(0, Math.min(1, severity)),
      timestamp: Date.now(),
      details,
    });
  }

  getViolations(): PhysicsViolation[] {
    return [...this.violations];
  }

  getViolationsByType(type: PhysicsViolation['type']): PhysicsViolation[] {
    return this.violations.filter((v) => v.type === type);
  }

  /** Purge violations older than the given age in milliseconds. */
  purgeOldViolations(maxAgeMs: number): number {
    const cutoff = Date.now() - maxAgeMs;
    const before = this.violations.length;
    this.violations = this.violations.filter((v) => v.timestamp >= cutoff);
    return before - this.violations.length;
  }

  /** Get violation count summary by type. */
  getViolationSummary(): Record<PhysicsViolation['type'], number> {
    const summary: Record<string, number> = { gravity: 0, collision: 0, force: 0, mass: 0 };
    for (const v of this.violations) {
      summary[v.type]++;
    }
    return summary as Record<PhysicsViolation['type'], number>;
  }

  reset(): void {
    this.violations = [];
    this.airTimeStart = null;
  }
}
