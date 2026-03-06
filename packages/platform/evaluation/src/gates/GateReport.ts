/**
 * @hololand/evaluation GateReport
 *
 * Aggregated gate report across environments.
 */

import { PerformanceGates, type GateResult, type Environment } from './PerformanceGates';

export interface AggregatedReport { worldId: string; timestamp: number; gates: GateResult[]; readyForProd: boolean; blockers: string[]; }

export class GateReport {
  private gates: PerformanceGates;

  constructor() { this.gates = new PerformanceGates(); }

  generate(worldId: string, fps: number, frameTimeMs: number, memoryMB: number, drawCalls: number): AggregatedReport {
    const envs: Environment[] = ['dev', 'staging', 'prod'];
    const results = envs.map((env) => this.gates.evaluate(env, fps, frameTimeMs, memoryMB, drawCalls));
    const prodResult = results.find((r) => r.environment === 'prod')!;

    return {
      worldId, timestamp: Date.now(), gates: results,
      readyForProd: prodResult.passed,
      blockers: prodResult.failures,
    };
  }
}
