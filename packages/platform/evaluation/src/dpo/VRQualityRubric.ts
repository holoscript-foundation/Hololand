/**
 * @hololand/evaluation VRQualityRubric
 *
 * VR scene quality rubric for DPO training.
 */

export interface QualityCriteria { name: string; weight: number; minScore: number; description: string; }

const DEFAULT_CRITERIA: QualityCriteria[] = [
  { name: 'Visual Fidelity', weight: 0.2, minScore: 0.6, description: 'Rendering quality and detail' },
  { name: 'Spatial Coherence', weight: 0.2, minScore: 0.7, description: 'Consistent 3D environment' },
  { name: 'Interactivity', weight: 0.15, minScore: 0.5, description: 'Responsive to user input' },
  { name: 'Performance', weight: 0.2, minScore: 0.8, description: '90fps stability' },
  { name: 'Comfort', weight: 0.15, minScore: 0.7, description: 'Low motion sickness risk' },
  { name: 'Creativity', weight: 0.1, minScore: 0.3, description: 'Novel and engaging' },
];

export class VRQualityRubric {
  private criteria: QualityCriteria[];

  constructor(criteria?: QualityCriteria[]) { this.criteria = criteria ?? [...DEFAULT_CRITERIA]; }

  getCriteria(): QualityCriteria[] { return [...this.criteria]; }

  score(scores: Record<string, number>): { total: number; passed: boolean; details: Array<{ criterion: string; score: number; passed: boolean }> } {
    let total = 0;
    const details: Array<{ criterion: string; score: number; passed: boolean }> = [];
    for (const c of this.criteria) {
      const s = scores[c.name] ?? 0;
      total += s * c.weight;
      details.push({ criterion: c.name, score: s, passed: s >= c.minScore });
    }
    return { total, passed: details.every((d) => d.passed), details };
  }
}
