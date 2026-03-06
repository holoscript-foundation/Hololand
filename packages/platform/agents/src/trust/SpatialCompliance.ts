/**
 * @hololand/agents SpatialCompliance
 *
 * Evaluates agent spatial boundary compliance for trust scoring.
 * Tracks boundary violations, movement speed limits, teleportation detection,
 * and zone authorization. Produces a 0-1 compliance score with time-based decay
 * so older violations carry less weight.
 */

export interface SpatialViolation {
  type: 'boundary' | 'speed' | 'teleport' | 'zone';
  severity: number;       // 0-1 severity weight
  timestamp: number;
  details: string;
}

export interface BoundaryConfig {
  /** World-space bounding box min corner */
  minBounds: { x: number; y: number; z: number };
  /** World-space bounding box max corner */
  maxBounds: { x: number; y: number; z: number };
}

export interface SpeedConfig {
  /** Maximum movement speed in meters/second */
  maxSpeedMps: number;
  /** Burst tolerance above maxSpeed before violation (fraction, e.g. 0.1 = 10%) */
  burstTolerance: number;
}

export interface SpatialComplianceConfig {
  /** Half-life in milliseconds for violation decay (default 1 hour) */
  decayHalfLifeMs: number;
  /** Maximum distance in meters that constitutes a teleport */
  teleportThresholdM: number;
  /** Per-violation base penalty subtracted from score (before severity weight) */
  basePenalty: number;
  /** Speed configuration */
  speed: SpeedConfig;
  /** Boundary configuration */
  boundary: BoundaryConfig;
  /** Authorized zone IDs this agent can enter */
  authorizedZones: Set<string>;
}

const DEFAULT_CONFIG: SpatialComplianceConfig = {
  decayHalfLifeMs: 3_600_000, // 1 hour
  teleportThresholdM: 20,
  basePenalty: 0.1,
  speed: { maxSpeedMps: 10, burstTolerance: 0.1 },
  boundary: {
    minBounds: { x: -500, y: -10, z: -500 },
    maxBounds: { x: 500, y: 200, z: 500 },
  },
  authorizedZones: new Set<string>(),
};

export class SpatialCompliance {
  private config: SpatialComplianceConfig;
  private violations: SpatialViolation[] = [];
  private lastPosition: { x: number; y: number; z: number } | null = null;
  private lastPositionTimestamp: number = 0;

  constructor(config?: Partial<SpatialComplianceConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      speed: { ...DEFAULT_CONFIG.speed, ...config?.speed },
      boundary: { ...DEFAULT_CONFIG.boundary, ...config?.boundary },
      authorizedZones: config?.authorizedZones ?? new Set(DEFAULT_CONFIG.authorizedZones),
    };
  }

  // ── Core evaluation with time-decay ──────────────────────────────

  /**
   * Compute aggregate compliance score 0-1 where 1 = fully compliant.
   * Each violation's contribution decays exponentially by age.
   */
  evaluate(violations?: number): number {
    // Legacy overload: if called with a raw violation count, use simple formula
    if (violations !== undefined && this.violations.length === 0) {
      return Math.max(0, 1 - violations * 0.1);
    }

    if (this.violations.length === 0) return 1;

    const now = Date.now();
    let totalPenalty = 0;

    for (const v of this.violations) {
      const ageMs = now - v.timestamp;
      // Exponential decay: weight halves every decayHalfLifeMs
      const decayFactor = Math.pow(0.5, ageMs / this.config.decayHalfLifeMs);
      totalPenalty += this.config.basePenalty * v.severity * decayFactor;
    }

    return Math.max(0, Math.min(1, 1 - totalPenalty));
  }

  // ── Boundary check ───────────────────────────────────────────────

  /**
   * Check whether a position is within the configured world boundaries.
   * Returns true if compliant, false if violated (and records violation).
   */
  checkBoundary(position: { x: number; y: number; z: number }): boolean {
    const { minBounds, maxBounds } = this.config.boundary;
    const oob =
      position.x < minBounds.x || position.x > maxBounds.x ||
      position.y < minBounds.y || position.y > maxBounds.y ||
      position.z < minBounds.z || position.z > maxBounds.z;

    if (oob) {
      // Severity scales with how far outside bounds the position is
      const dx = Math.max(0, minBounds.x - position.x, position.x - maxBounds.x);
      const dy = Math.max(0, minBounds.y - position.y, position.y - maxBounds.y);
      const dz = Math.max(0, minBounds.z - position.z, position.z - maxBounds.z);
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const severity = Math.min(1, dist / 100); // 100m+ = max severity

      this.recordViolation('boundary', severity,
        `Out of bounds by ${dist.toFixed(1)}m at (${position.x}, ${position.y}, ${position.z})`);
      return false;
    }
    return true;
  }

  // ── Speed check ──────────────────────────────────────────────────

  /**
   * Check movement speed between the last recorded position and the new one.
   * Must be called each frame/tick with current position and timestamp.
   * Returns true if compliant.
   */
  checkSpeed(
    position: { x: number; y: number; z: number },
    timestampMs: number = Date.now(),
  ): boolean {
    if (this.lastPosition === null) {
      this.lastPosition = { ...position };
      this.lastPositionTimestamp = timestampMs;
      return true;
    }

    const dtSec = (timestampMs - this.lastPositionTimestamp) / 1000;
    if (dtSec <= 0) return true; // same frame

    const dx = position.x - this.lastPosition.x;
    const dy = position.y - this.lastPosition.y;
    const dz = position.z - this.lastPosition.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const speed = dist / dtSec;

    this.lastPosition = { ...position };
    this.lastPositionTimestamp = timestampMs;

    const threshold = this.config.speed.maxSpeedMps * (1 + this.config.speed.burstTolerance);
    if (speed > threshold) {
      const overFactor = speed / this.config.speed.maxSpeedMps;
      const severity = Math.min(1, (overFactor - 1) / 5); // 6x speed = max severity
      this.recordViolation('speed', severity,
        `Speed ${speed.toFixed(1)} m/s exceeds max ${this.config.speed.maxSpeedMps} m/s`);
      return false;
    }
    return true;
  }

  // ── Teleport detection ───────────────────────────────────────────

  /**
   * Detect unauthorized teleportation: instantaneous displacement beyond threshold.
   * Should be called with consecutive positions. Returns true if no teleport detected.
   */
  checkTeleport(
    position: { x: number; y: number; z: number },
    authorized: boolean = false,
  ): boolean {
    if (this.lastPosition === null) {
      this.lastPosition = { ...position };
      this.lastPositionTimestamp = Date.now();
      return true;
    }

    const dx = position.x - this.lastPosition.x;
    const dy = position.y - this.lastPosition.y;
    const dz = position.z - this.lastPosition.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Update position
    this.lastPosition = { ...position };
    this.lastPositionTimestamp = Date.now();

    if (dist > this.config.teleportThresholdM && !authorized) {
      const severity = Math.min(1, dist / (this.config.teleportThresholdM * 10));
      this.recordViolation('teleport', severity,
        `Unauthorized teleport of ${dist.toFixed(1)}m detected`);
      return false;
    }
    return true;
  }

  // ── Zone authorization ───────────────────────────────────────────

  /**
   * Check whether the agent is authorized to enter a given zone.
   * Returns true if authorized.
   */
  checkZoneAuthorization(zoneId: string): boolean {
    if (this.config.authorizedZones.size === 0) return true; // no restrictions
    if (!this.config.authorizedZones.has(zoneId)) {
      this.recordViolation('zone', 0.8, `Unauthorized zone entry: ${zoneId}`);
      return false;
    }
    return true;
  }

  /**
   * Authorize entry to an additional zone at runtime.
   */
  authorizeZone(zoneId: string): void {
    this.config.authorizedZones.add(zoneId);
  }

  // ── Violation management ─────────────────────────────────────────

  private recordViolation(type: SpatialViolation['type'], severity: number, details: string): void {
    this.violations.push({
      type,
      severity: Math.max(0, Math.min(1, severity)),
      timestamp: Date.now(),
      details,
    });
  }

  /** Get all recorded violations. */
  getViolations(): SpatialViolation[] {
    return [...this.violations];
  }

  /** Get violations filtered by type. */
  getViolationsByType(type: SpatialViolation['type']): SpatialViolation[] {
    return this.violations.filter((v) => v.type === type);
  }

  /** Purge violations older than the given age in milliseconds. */
  purgeOldViolations(maxAgeMs: number): number {
    const cutoff = Date.now() - maxAgeMs;
    const before = this.violations.length;
    this.violations = this.violations.filter((v) => v.timestamp >= cutoff);
    return before - this.violations.length;
  }

  /** Reset all state. */
  reset(): void {
    this.violations = [];
    this.lastPosition = null;
    this.lastPositionTimestamp = 0;
  }
}
