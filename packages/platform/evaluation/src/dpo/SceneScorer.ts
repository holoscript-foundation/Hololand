/**
 * @hololand/evaluation SceneScorer
 */

export class SceneScorer {
  score(fps: number, splatCount: number, interactionLatencyMs: number, comfortScore: number): Record<string, number> {
    return {
      'Visual Fidelity': Math.min(1, splatCount / 100_000),
      'Spatial Coherence': 0.8, // Placeholder
      'Interactivity': Math.max(0, 1 - interactionLatencyMs / 200),
      'Performance': Math.min(1, fps / 90),
      'Comfort': comfortScore,
      'Creativity': 0.7, // Placeholder
    };
  }
}
