/**
 * @hololand/renderer SharedPreprocessor
 *
 * Stage 1 of two-stage foveated rasterizer: shared preprocessing.
 * Sorts and culls Gaussian primitives once for all users.
 */

export interface GaussianPrimitive { id: string; position: { x: number; y: number; z: number }; scale: number; opacity: number; color: { r: number; g: number; b: number }; }
export interface PreprocessResult { sortedPrimitives: GaussianPrimitive[]; culledCount: number; totalProcessed: number; timeMs: number; }

export class SharedPreprocessor {
  private cullDistance: number;
  private minOpacity: number;

  constructor(cullDistance: number = 100, minOpacity: number = 0.01) {
    this.cullDistance = cullDistance;
    this.minOpacity = minOpacity;
  }

  preprocess(primitives: GaussianPrimitive[], cameraPos: { x: number; y: number; z: number }): PreprocessResult {
    const start = performance.now();
    let culled = 0;

    const visible = primitives.filter((p) => {
      const dist = Math.sqrt((p.position.x - cameraPos.x) ** 2 + (p.position.y - cameraPos.y) ** 2 + (p.position.z - cameraPos.z) ** 2);
      if (dist > this.cullDistance || p.opacity < this.minOpacity) { culled++; return false; }
      return true;
    });

    // Depth sort (front-to-back for alpha)
    visible.sort((a, b) => {
      const distA = (a.position.x - cameraPos.x) ** 2 + (a.position.y - cameraPos.y) ** 2 + (a.position.z - cameraPos.z) ** 2;
      const distB = (b.position.x - cameraPos.x) ** 2 + (b.position.y - cameraPos.y) ** 2 + (b.position.z - cameraPos.z) ** 2;
      return distA - distB;
    });

    return { sortedPrimitives: visible, culledCount: culled, totalProcessed: primitives.length, timeMs: performance.now() - start };
  }
}
