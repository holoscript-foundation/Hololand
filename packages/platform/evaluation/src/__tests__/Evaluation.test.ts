import { describe, it, expect } from 'vitest';
import { EvaluationFramework } from '../EvaluationFramework';
import { PerformanceEvaluator } from '../PerformanceEvaluator';
import { SpatialAccuracyEvaluator } from '../SpatialAccuracyEvaluator';
import { SafetyEvaluator } from '../SafetyEvaluator';

describe('EvaluationFramework', () => {
  it('evaluates with registered evaluators', () => {
    const fw = new EvaluationFramework(0.5);
    fw.registerEvaluator('perf', () => ({ name: 'Performance', weight: 1, score: 0.9, details: {} }));
    fw.registerEvaluator('safety', () => ({ name: 'Safety', weight: 1, score: 0.8, details: {} }));
    const report = fw.evaluate('world1');
    expect(report.overallScore).toBeCloseTo(0.85);
    expect(report.passed).toBe(true);
  });
});

describe('PerformanceEvaluator', () => {
  it('scores based on fps and frame time', () => {
    const pe = new PerformanceEvaluator(90);
    const result = pe.evaluate({ fps: 90, frameTimeMs: 11.1, drawCalls: 100, memoryUsedMB: 500, gpuUtilization: 0.7 });
    expect(result.score).toBeGreaterThan(0.5);
  });
});

describe('SpatialAccuracyEvaluator', () => {
  it('scores high for low errors', () => {
    const sa = new SpatialAccuracyEvaluator();
    const result = sa.evaluate([0.1, 0.2], [1, 2]);
    expect(result.score).toBeGreaterThan(0.8);
  });
});

describe('SafetyEvaluator', () => {
  it('perfect score with no incidents', () => {
    const se = new SafetyEvaluator();
    expect(se.evaluate(0, 0, 0).score).toBe(1);
  });

  it('reduces score with incidents', () => {
    const se = new SafetyEvaluator();
    expect(se.evaluate(2, 1, 0).score).toBeLessThan(1);
  });
});
