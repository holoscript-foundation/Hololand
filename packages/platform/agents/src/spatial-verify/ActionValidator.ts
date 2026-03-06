/**
 * @hololand/agents ActionValidator
 *
 * Validates agent spatial actions against physics constraints.
 */

export interface ActionValidationResult {
  valid: boolean;
  reason?: string;
  speed?: number;
  maxAllowedSpeed?: number;
}

export class ActionValidator {
  private maxSpeed: number;
  private validationCount: number = 0;
  private rejectionCount: number = 0;

  constructor(maxSpeed: number = 10) { this.maxSpeed = maxSpeed; }

  validate(
    claim: { agentId: string; position: { x: number; y: number; z: number }; timestamp: number },
    previous?: { position: { x: number; y: number; z: number }; timestamp: number },
  ): ActionValidationResult {
    this.validationCount++;
    if (!previous) return { valid: true };

    const dt = (claim.timestamp - previous.timestamp) / 1000;
    if (dt <= 0) { this.rejectionCount++; return { valid: false, reason: 'Invalid timestamp' }; }

    const dx = claim.position.x - previous.position.x;
    const dy = claim.position.y - previous.position.y;
    const dz = claim.position.z - previous.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const speed = dist / dt;

    if (speed > this.maxSpeed) {
      this.rejectionCount++;
      return { valid: false, reason: `Speed ${speed.toFixed(1)} exceeds max ${this.maxSpeed}`, speed, maxAllowedSpeed: this.maxSpeed };
    }

    return { valid: true, speed, maxAllowedSpeed: this.maxSpeed };
  }

  getValidationCount(): number { return this.validationCount; }
  getRejectionRate(): number { return this.validationCount > 0 ? this.rejectionCount / this.validationCount : 0; }
}
