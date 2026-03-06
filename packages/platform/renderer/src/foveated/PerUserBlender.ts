/**
 * @hololand/renderer PerUserBlender
 *
 * Stage 2: Per-user alpha-blending with VRS foveation maps.
 */

export interface BlendResult { userId: string; renderedCount: number; foveatedReduction: number; timeMs: number; }

export class PerUserBlender {
  private foveationStrength: number;

  constructor(foveationStrength: number = 0.7) { this.foveationStrength = foveationStrength; }

  blend(userId: string, primitiveCount: number, gazeX: number, gazeY: number): BlendResult {
    const start = performance.now();
    // In foveal region (center 10% of FOV): full resolution
    // Peripheral: reduce by foveation strength
    const fovealFraction = 0.1;
    const peripheralFraction = 1 - fovealFraction;
    const peripheralReduction = peripheralFraction * this.foveationStrength;
    const effectiveCount = Math.ceil(primitiveCount * (1 - peripheralReduction));

    return {
      userId,
      renderedCount: effectiveCount,
      foveatedReduction: peripheralReduction,
      timeMs: performance.now() - start,
    };
  }
}
