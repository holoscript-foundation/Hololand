/**
 * @hololand/evaluation PreferencePairGenerator
 *
 * Generates preference pairs for DPO training from scored VR scenes.
 */

export interface PreferencePair { chosen: { sceneId: string; score: number }; rejected: { sceneId: string; score: number }; marginOfPreference: number; }

export class PreferencePairGenerator {
  private pairs: PreferencePair[] = [];
  private minMargin: number;

  constructor(minMargin: number = 0.1) { this.minMargin = minMargin; }

  generatePairs(scenes: Array<{ sceneId: string; score: number }>): PreferencePair[] {
    const newPairs: PreferencePair[] = [];
    const sorted = [...scenes].sort((a, b) => b.score - a.score);

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const margin = sorted[i].score - sorted[j].score;
        if (margin >= this.minMargin) {
          const pair: PreferencePair = { chosen: sorted[i], rejected: sorted[j], marginOfPreference: margin };
          newPairs.push(pair);
          this.pairs.push(pair);
        }
      }
    }
    return newPairs;
  }

  getTotalPairs(): number { return this.pairs.length; }
  getAllPairs(): PreferencePair[] { return [...this.pairs]; }
}
