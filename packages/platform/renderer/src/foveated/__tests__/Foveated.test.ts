import { describe, it, expect, beforeEach } from 'vitest';
import { SharedPreprocessor } from '../SharedPreprocessor';
import { PerUserBlender } from '../PerUserBlender';
import { VRSFoveationMap } from '../VRSFoveationMap';
import { TwoStageRasterizer } from '../TwoStageRasterizer';

describe('SharedPreprocessor', () => {
  it('culls distant primitives', () => {
    const pp = new SharedPreprocessor(50);
    const result = pp.preprocess([
      { id: 'near', position: { x: 10, y: 0, z: 0 }, scale: 1, opacity: 1, color: { r: 1, g: 0, b: 0 } },
      { id: 'far', position: { x: 100, y: 0, z: 0 }, scale: 1, opacity: 1, color: { r: 0, g: 1, b: 0 } },
    ], { x: 0, y: 0, z: 0 });
    expect(result.sortedPrimitives.length).toBe(1);
    expect(result.culledCount).toBe(1);
  });
});

describe('VRSFoveationMap', () => {
  it('returns highest shading rate at gaze center', () => {
    const map = new VRSFoveationMap();
    map.updateGaze(0.5, 0.5);
    expect(map.getShadingRate(916, 960)).toBe('1x1');
  });

  it('returns lowest rate at periphery', () => {
    const map = new VRSFoveationMap();
    map.updateGaze(0.5, 0.5);
    expect(map.getShadingRate(0, 0)).toBe('4x4');
  });
});

describe('TwoStageRasterizer', () => {
  let rasterizer: TwoStageRasterizer;
  beforeEach(() => {
    rasterizer = new TwoStageRasterizer(100, 0.7);
    rasterizer.addUser('user1');
  });

  it('renders frame with preprocessing and blending', () => {
    const primitives = Array.from({ length: 100 }, (_, i) => ({
      id: `p${i}`, position: { x: i, y: 0, z: 0 }, scale: 1, opacity: 1, color: { r: 1, g: 1, b: 1 },
    }));
    const result = rasterizer.renderFrame(primitives, { x: 0, y: 0, z: 0 });
    expect(result.blendResults.length).toBe(1);
    expect(result.visiblePrimitives).toBeLessThanOrEqual(100);
  });
});
