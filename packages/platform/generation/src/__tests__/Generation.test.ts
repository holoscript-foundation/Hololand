import { describe, it, expect } from 'vitest';
import { ProceduralPipeline } from '../ProceduralPipeline';
import { WFCTerrainGenerator } from '../WFCTerrainGenerator';

describe('ProceduralPipeline', () => {
  it('generates complete world', async () => {
    const pipeline = new ProceduralPipeline();
    const result = await pipeline.generate({ seed: 42, prompt: 'A mystical forest', worldSize: 16 });
    expect(result.composition.theme).toBe('forest');
    expect(result.terrain.length).toBe(16);
    expect(result.renderReady).toBe(true);
  });
});

describe('WFCTerrainGenerator', () => {
  it('generates deterministic terrain', () => {
    const gen = new WFCTerrainGenerator();
    const t1 = gen.generate(8, 42);
    const t2 = gen.generate(8, 42);
    expect(t1).toEqual(t2);
  });
});
