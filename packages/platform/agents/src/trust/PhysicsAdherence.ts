/**
 * @hololand/agents PhysicsAdherence
 */

export class PhysicsAdherence {
  evaluate(violations: number): number { return Math.max(0, 1 - violations * 0.15); }
}
