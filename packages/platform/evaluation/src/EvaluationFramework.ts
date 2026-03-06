/**
 * @hololand/evaluation EvaluationFramework
 *
 * Multi-dimensional evaluation: Performance, Spatial Accuracy, Collaboration, UX, Safety.
 */

export interface EvalDimension { name: string; weight: number; score: number; details: Record<string, unknown>; }
export interface EvalReport { worldId: string; timestamp: number; overallScore: number; dimensions: EvalDimension[]; passed: boolean; }

export class EvaluationFramework {
  private evaluators: Map<string, (worldId: string) => EvalDimension> = new Map();
  private passThreshold: number;

  constructor(passThreshold: number = 0.7) { this.passThreshold = passThreshold; }

  registerEvaluator(name: string, evaluator: (worldId: string) => EvalDimension): void {
    this.evaluators.set(name, evaluator);
  }

  evaluate(worldId: string): EvalReport {
    const dimensions: EvalDimension[] = [];
    for (const [, evaluator] of this.evaluators) dimensions.push(evaluator(worldId));

    const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
    const overallScore = totalWeight > 0 ? dimensions.reduce((sum, d) => sum + d.score * d.weight, 0) / totalWeight : 0;

    return { worldId, timestamp: Date.now(), overallScore, dimensions, passed: overallScore >= this.passThreshold };
  }

  getEvaluatorCount(): number { return this.evaluators.size; }
}
