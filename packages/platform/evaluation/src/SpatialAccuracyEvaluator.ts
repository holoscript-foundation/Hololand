export class SpatialAccuracyEvaluator {
  evaluate(positionErrors: number[], rotationErrors: number[]): { score: number; avgPositionError: number; avgRotationError: number } {
    const avgPos = positionErrors.length > 0 ? positionErrors.reduce((a, b) => a + b, 0) / positionErrors.length : 0;
    const avgRot = rotationErrors.length > 0 ? rotationErrors.reduce((a, b) => a + b, 0) / rotationErrors.length : 0;
    const score = Math.max(0, 1 - (avgPos * 0.1 + avgRot * 0.05));
    return { score, avgPositionError: avgPos, avgRotationError: avgRot };
  }
}
