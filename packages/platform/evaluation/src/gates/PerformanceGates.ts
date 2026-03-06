/**
 * @hololand/evaluation PerformanceGates
 *
 * Progressive quality gates: 60fps dev, 75fps staging, 90fps prod.
 */

export type Environment = 'dev' | 'staging' | 'prod';
export interface GateConfig { environment: Environment; minFps: number; maxFrameTimeMs: number; maxMemoryMB: number; maxDrawCalls: number; }

const GATE_CONFIGS: Record<Environment, GateConfig> = {
  dev: { environment: 'dev', minFps: 60, maxFrameTimeMs: 16.7, maxMemoryMB: 6000, maxDrawCalls: 500 },
  staging: { environment: 'staging', minFps: 75, maxFrameTimeMs: 13.3, maxMemoryMB: 4000, maxDrawCalls: 300 },
  prod: { environment: 'prod', minFps: 90, maxFrameTimeMs: 11.1, maxMemoryMB: 3000, maxDrawCalls: 200 },
};

export interface GateResult { passed: boolean; environment: Environment; failures: string[]; metrics: Record<string, number>; }

export class PerformanceGates {
  evaluate(env: Environment, fps: number, frameTimeMs: number, memoryMB: number, drawCalls: number): GateResult {
    const config = GATE_CONFIGS[env];
    const failures: string[] = [];
    if (fps < config.minFps) failures.push(`FPS ${fps} < ${config.minFps}`);
    if (frameTimeMs > config.maxFrameTimeMs) failures.push(`Frame time ${frameTimeMs}ms > ${config.maxFrameTimeMs}ms`);
    if (memoryMB > config.maxMemoryMB) failures.push(`Memory ${memoryMB}MB > ${config.maxMemoryMB}MB`);
    if (drawCalls > config.maxDrawCalls) failures.push(`Draw calls ${drawCalls} > ${config.maxDrawCalls}`);
    return { passed: failures.length === 0, environment: env, failures, metrics: { fps, frameTimeMs, memoryMB, drawCalls } };
  }

  getConfig(env: Environment): GateConfig { return { ...GATE_CONFIGS[env] }; }
}
