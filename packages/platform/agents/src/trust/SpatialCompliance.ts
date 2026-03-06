/**
 * @hololand/agents SpatialCompliance
 */

export class SpatialCompliance {
  evaluate(violations: number): number { return Math.max(0, 1 - violations * 0.1); }
}
