/**
 * @hololand/agents ValenceSceneLoader
 *
 * Loads VR scenes weighted by emotional valence.
 * Positive memories trigger warm/bright scenes; negative trigger calming ones.
 */

export interface SceneTemplate {
  sceneId: string;
  name: string;
  valenceRange: [number, number]; // [min, max]
  arousalRange: [number, number];
  lightingPreset: string;
  colorPalette: string;
  ambientSoundId: string;
}

export interface SceneLoadResult {
  sceneId: string;
  matchScore: number;
  valenceAlignment: number;
  arousalAlignment: number;
}

export class ValenceSceneLoader {
  private templates: SceneTemplate[] = [];

  registerTemplate(template: SceneTemplate): void {
    this.templates.push({ ...template });
  }

  selectScene(valence: number, arousal: number): SceneLoadResult | null {
    if (this.templates.length === 0) return null;

    let bestMatch: SceneTemplate | null = null;
    let bestScore = -Infinity;

    for (const template of this.templates) {
      const valenceMatch = this.rangeMatch(valence, template.valenceRange);
      const arousalMatch = this.rangeMatch(arousal, template.arousalRange);
      const score = valenceMatch * 0.6 + arousalMatch * 0.4;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = template;
      }
    }

    if (!bestMatch) return null;
    return {
      sceneId: bestMatch.sceneId,
      matchScore: bestScore,
      valenceAlignment: this.rangeMatch(valence, bestMatch.valenceRange),
      arousalAlignment: this.rangeMatch(arousal, bestMatch.arousalRange),
    };
  }

  getTemplateCount(): number { return this.templates.length; }

  private rangeMatch(value: number, range: [number, number]): number {
    if (value >= range[0] && value <= range[1]) return 1;
    const dist = Math.min(Math.abs(value - range[0]), Math.abs(value - range[1]));
    return Math.max(0, 1 - dist);
  }
}
