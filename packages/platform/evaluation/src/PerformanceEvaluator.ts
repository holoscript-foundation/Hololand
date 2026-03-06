/**
 * @hololand/evaluation PerformanceEvaluator
 */

export interface PerformanceMetrics { fps: number; frameTimeMs: number; drawCalls: number; memoryUsedMB: number; gpuUtilization: number; }

export class PerformanceEvaluator {
  private targetFps: number;
  private maxFrameTimeMs: number;

  constructor(targetFps: number = 90, maxFrameTimeMs: number = 11.1) {
    this.targetFps = targetFps;
    this.maxFrameTimeMs = maxFrameTimeMs;
  }

  evaluate(metrics: PerformanceMetrics): { score: number; details: Record<string, unknown> } {
    const fpsScore = Math.min(1, metrics.fps / this.targetFps);
    const frameScore = Math.min(1, this.maxFrameTimeMs / Math.max(1, metrics.frameTimeMs));
    const score = fpsScore * 0.5 + frameScore * 0.3 + (1 - metrics.gpuUtilization) * 0.2;
    return { score: Math.min(1, score), details: { fpsScore, frameScore, fps: metrics.fps, frameTimeMs: metrics.frameTimeMs } };
  }
}
