/**
 * @hololand/generation ProceduralPipeline
 *
 * Async three-tier procedural generation: LLM composition -> WFC terrain -> Realtime render.
 */

import { LLMCompositionGenerator } from './LLMCompositionGenerator';
import { WFCTerrainGenerator } from './WFCTerrainGenerator';
import { RealtimeRenderer } from './RealtimeRenderer';

export interface GenerationRequest { seed: number; prompt: string; worldSize: number; }
export interface GenerationResult { composition: Record<string, unknown>; terrain: number[][]; renderReady: boolean; timeMs: number; }

export class ProceduralPipeline {
  private llm: LLMCompositionGenerator;
  private wfc: WFCTerrainGenerator;
  private renderer: RealtimeRenderer;

  constructor() {
    this.llm = new LLMCompositionGenerator();
    this.wfc = new WFCTerrainGenerator();
    this.renderer = new RealtimeRenderer();
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const start = performance.now();
    const composition = await this.llm.generate(request.prompt, request.seed);
    const terrain = this.wfc.generate(request.worldSize, request.seed);
    const renderReady = this.renderer.prepare(terrain);
    return { composition, terrain, renderReady, timeMs: performance.now() - start };
  }

  getLLM(): LLMCompositionGenerator { return this.llm; }
  getWFC(): WFCTerrainGenerator { return this.wfc; }
  getRenderer(): RealtimeRenderer { return this.renderer; }
}
