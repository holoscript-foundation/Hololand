import { describe, it, expect } from 'vitest';
import { VRQualityRubric } from '../VRQualityRubric';
import { SceneScorer } from '../SceneScorer';
import { PreferencePairGenerator } from '../PreferencePairGenerator';

describe('VRQualityRubric', () => {
  it('scores scenes against criteria', () => {
    const rubric = new VRQualityRubric();
    const result = rubric.score({ 'Visual Fidelity': 0.9, 'Spatial Coherence': 0.8, 'Interactivity': 0.7, 'Performance': 0.95, 'Comfort': 0.85, 'Creativity': 0.6 });
    expect(result.total).toBeGreaterThan(0.7);
    expect(result.passed).toBe(true);
  });
});

describe('SceneScorer', () => {
  it('produces scores for rubric', () => {
    const scorer = new SceneScorer();
    const scores = scorer.score(90, 80000, 30, 0.9);
    expect(scores['Performance']).toBe(1);
    expect(scores['Comfort']).toBe(0.9);
  });
});

describe('PreferencePairGenerator', () => {
  it('generates preference pairs', () => {
    const gen = new PreferencePairGenerator(0.05);
    const pairs = gen.generatePairs([
      { sceneId: 's1', score: 0.9 },
      { sceneId: 's2', score: 0.5 },
      { sceneId: 's3', score: 0.3 },
    ]);
    expect(pairs.length).toBeGreaterThan(0);
    expect(pairs[0].chosen.score).toBeGreaterThan(pairs[0].rejected.score);
  });
});
