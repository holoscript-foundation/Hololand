export class UXEvaluator {
  evaluate(motionSicknessScore: number, interactionLatencyMs: number, audioSyncMs: number): { score: number; details: Record<string, unknown> } {
    const msScore = Math.max(0, 1 - motionSicknessScore);
    const interScore = Math.max(0, 1 - interactionLatencyMs / 100);
    const audioScore = Math.max(0, 1 - Math.abs(audioSyncMs) / 50);
    return { score: msScore * 0.4 + interScore * 0.3 + audioScore * 0.3, details: { motionSicknessScore, interactionLatencyMs, audioSyncMs } };
  }
}
