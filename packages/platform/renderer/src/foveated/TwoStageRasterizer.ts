/**
 * @hololand/renderer TwoStageRasterizer
 *
 * Orchestrates two-stage foveated Gaussian rendering.
 */

import { SharedPreprocessor, type GaussianPrimitive } from './SharedPreprocessor';
import { PerUserBlender, type BlendResult } from './PerUserBlender';
import { VRSFoveationMap } from './VRSFoveationMap';

export interface RenderFrameResult { preprocessTimeMs: number; blendResults: BlendResult[]; totalPrimitives: number; visiblePrimitives: number; }

export class TwoStageRasterizer {
  private preprocessor: SharedPreprocessor;
  private blenders: Map<string, PerUserBlender> = new Map();
  private foveationMaps: Map<string, VRSFoveationMap> = new Map();

  constructor(cullDistance: number = 100, foveationStrength: number = 0.7) {
    this.preprocessor = new SharedPreprocessor(cullDistance);
  }

  addUser(userId: string, foveationStrength: number = 0.7): void {
    this.blenders.set(userId, new PerUserBlender(foveationStrength));
    this.foveationMaps.set(userId, new VRSFoveationMap());
  }

  removeUser(userId: string): void {
    this.blenders.delete(userId);
    this.foveationMaps.delete(userId);
  }

  updateGaze(userId: string, gazeX: number, gazeY: number): void {
    this.foveationMaps.get(userId)?.updateGaze(gazeX, gazeY);
  }

  renderFrame(primitives: GaussianPrimitive[], cameraPos: { x: number; y: number; z: number }): RenderFrameResult {
    const preprocessResult = this.preprocessor.preprocess(primitives, cameraPos);
    const blendResults: BlendResult[] = [];

    for (const [userId, blender] of this.blenders) {
      const map = this.foveationMaps.get(userId);
      const gazeX = map?.getZones()[0]?.centerX ?? 0.5;
      const gazeY = map?.getZones()[0]?.centerY ?? 0.5;
      blendResults.push(blender.blend(userId, preprocessResult.sortedPrimitives.length, gazeX, gazeY));
    }

    return { preprocessTimeMs: preprocessResult.timeMs, blendResults, totalPrimitives: primitives.length, visiblePrimitives: preprocessResult.sortedPrimitives.length };
  }

  getUserCount(): number { return this.blenders.size; }
}
