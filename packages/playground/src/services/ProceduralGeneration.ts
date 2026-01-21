/**
 * Procedural Generation System - Tier 3
 * AI-assisted world building with noise functions and generation algorithms
 */

import { AIService } from './AIService';

export interface GenerationParams {
  seed: number;
  width: number;
  height: number;
  depth: number;
  scale: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  threshold?: number;
}

export interface GeneratedWorld {
  name: string;
  seed: number;
  noiseMap: number[][];
  objects: GeneratedObject[];
  structures: Structure[];
  timestamp: number;
}

export interface GeneratedObject {
  id: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  properties: Record<string, any>;
}

export interface Structure {
  id: string;
  name: string;
  position: [number, number, number];
  objects: GeneratedObject[];
  seed: number;
}

/**
 * Perlin Noise Generator - Deterministic procedural noise
 */
export class PerlinNoiseGenerator {
  private permutation: number[];
  private p: number[];

  constructor(seed: number = 0) {
    this.permutation = this.generatePermutation(seed);
    this.p = [...this.permutation, ...this.permutation];
  }

  private generatePermutation(seed: number): number[] {
    const p = Array.from({ length: 256 }, (_, i) => i);
    // Fisher-Yates shuffle with seed
    for (let i = 255; i > 0; i--) {
      seed = (seed * 9301 + 49297) % 233280;
      const j = Math.floor((seed / 233280) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    return p;
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 8 ? y : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  perlin(x: number, y: number, z: number = 0): number {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const zi = Math.floor(z) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);

    const u = this.fade(xf);
    const v = this.fade(yf);
    const w = this.fade(zf);

    const aa = this.p[this.p[xi] + yi];
    const ab = this.p[this.p[xi] + ((yi + 1) & 255)];
    const ba = this.p[this.p[(xi + 1) & 255] + yi];
    const bb = this.p[this.p[(xi + 1) & 255] + ((yi + 1) & 255)];

    const aaa = this.p[aa + zi];
    const aab = this.p[aa + ((zi + 1) & 255)];
    const aba = this.p[ab + zi];
    const abb = this.p[ab + ((zi + 1) & 255)];
    const baa = this.p[ba + zi];
    const bab = this.p[ba + ((zi + 1) & 255)];
    const bba = this.p[bb + zi];
    const bbb = this.p[bb + ((zi + 1) & 255)];

    let x1 = this.lerp(
      this.grad(aaa, xf, yf, zf),
      this.grad(baa, xf - 1, yf, zf),
      u
    );
    let x2 = this.lerp(
      this.grad(aba, xf, yf - 1, zf),
      this.grad(bba, xf - 1, yf - 1, zf),
      u
    );
    let y1 = this.lerp(x1, x2, v);

    x1 = this.lerp(
      this.grad(aab, xf, yf, zf - 1),
      this.grad(bab, xf - 1, yf, zf - 1),
      u
    );
    x2 = this.lerp(
      this.grad(abb, xf, yf - 1, zf - 1),
      this.grad(bbb, xf - 1, yf - 1, zf - 1),
      u
    );
    let y2 = this.lerp(x1, x2, v);

    return this.lerp(y1, y2, w);
  }
}

/**
 * Fractal Brownian Motion - Multi-octave noise
 */
export class FractalBrownianMotion {
  private generator: PerlinNoiseGenerator;

  constructor(seed: number = 0) {
    this.generator = new PerlinNoiseGenerator(seed);
  }

  generate(
    x: number,
    y: number,
    octaves: number = 4,
    persistence: number = 0.5,
    lacunarity: number = 2.0
  ): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.generator.perlin(x * frequency, y * frequency, 0) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }

  generateMap(params: GenerationParams): number[][] {
    const fbm = new FractalBrownianMotion(params.seed);
    const map: number[][] = [];

    for (let y = 0; y < params.height; y++) {
      const row: number[] = [];
      for (let x = 0; x < params.width; x++) {
        const value = fbm.generate(
          (x / params.scale),
          (y / params.scale),
          params.octaves,
          params.persistence,
          params.lacunarity
        );
        row.push((value + 1) / 2); // Normalize to 0-1
      }
      map.push(row);
    }

    return map;
  }
}

/**
 * Procedural World Generator
 */
export class ProceduralWorldGenerator {
  private fbm: FractalBrownianMotion;
  private aiService: AIService;
  private typeWeights: Map<string, number> = new Map([
    ['cube', 0.4],
    ['sphere', 0.3],
    ['platform', 0.2],
    ['light', 0.1],
  ]);

  constructor(aiService?: AIService) {
    this.fbm = new FractalBrownianMotion();
    this.aiService = aiService || new AIService();
  }

  /**
   * Generate a complete world from parameters
   */
  async generateWorld(params: GenerationParams, aiAssisted: boolean = false): Promise<GeneratedWorld> {
    const noiseMap = this.fbm.generateMap(params);
    const objects: GeneratedObject[] = [];
    const structures: Structure[] = [];

    // Generate base objects from noise
    for (let y = 0; y < params.height; y++) {
      for (let x = 0; x < params.width; x++) {
        const noiseValue = noiseMap[y][x];

        if (noiseValue > (params.threshold || 0.5)) {
          const obj = this.generateObjectFromNoise(
            x,
            y,
            noiseValue,
            params
          );
          if (obj) {
            objects.push(obj);
          }
        }
      }
    }

    // AI-assisted structure generation
    if (aiAssisted) {
      const structurePrompt = `Generate ${Math.floor(objects.length / 10)} unique game structures 
        for a world with ${objects.length} objects. Suggest placement, types, and properties.`;

      try {
        const aiStructures = await this.generateAIStructures(structurePrompt, objects);
        structures.push(...aiStructures);
      } catch (error) {
        console.error('AI structure generation failed:', error);
      }
    }

    return {
      name: `World-${params.seed}-${Date.now()}`,
      seed: params.seed,
      noiseMap,
      objects,
      structures,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate object from noise value
   */
  private generateObjectFromNoise(
    x: number,
    y: number,
    noiseValue: number,
    params: GenerationParams
  ): GeneratedObject | null {
    const type = this.selectType(noiseValue);
    if (!type) return null;

    return {
      id: `obj-${x}-${y}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      position: [
        (x - params.width / 2) * params.scale,
        noiseValue * params.depth,
        (y - params.height / 2) * params.scale,
      ],
      rotation: [
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      ],
      scale: [
        0.5 + noiseValue,
        0.5 + noiseValue,
        0.5 + noiseValue,
      ],
      properties: {
        density: Math.floor(noiseValue * 100),
        color: this.colorFromNoise(noiseValue),
        material: noiseValue > 0.7 ? 'metallic' : 'matte',
      },
    };
  }

  /**
   * Select object type based on noise value
   */
  private selectType(noiseValue: number): string | null {
    const rand = Math.random();
    let accumulated = 0;

    for (const [type, weight] of this.typeWeights) {
      accumulated += weight;
      if (rand < accumulated) {
        return type;
      }
    }

    return null;
  }

  /**
   * Generate color from noise value
   */
  private colorFromNoise(value: number): string {
    const hue = Math.floor(value * 360);
    const saturation = Math.floor(50 + value * 50);
    const lightness = Math.floor(30 + value * 40);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  /**
   * Generate structures with AI assistance
   */
  private async generateAIStructures(
    prompt: string,
    existingObjects: GeneratedObject[]
  ): Promise<Structure[]> {
    const structures: Structure[] = [];

    try {
      // Get AI suggestions for structures
      const suggestions: string[] = [];
      for await (const chunk of this.aiService.generateCode(prompt, {
        objectCount: existingObjects.length,
        worldSize: Math.sqrt(existingObjects.length),
      })) {
        suggestions.push(chunk);
      }

      const suggestion = suggestions.join('');

      // Parse suggestions and create structures (simplified)
      const lines = suggestion.split('\n');
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        if (line.includes('structure') || line.includes('building')) {
          const structure = this.parseStructure(lines.slice(i, i + 5), existingObjects);
          if (structure) {
            structures.push(structure);
          }
          i += 5;
        } else {
          i++;
        }
      }
    } catch (error) {
      console.error('Failed to generate AI structures:', error);
    }

    return structures;
  }

  /**
   * Parse AI-suggested structure
   */
  private parseStructure(lines: string[], availableObjects: GeneratedObject[]): Structure | null {
    if (lines.length === 0) return null;

    // Simple parsing - extract objects that form the structure
    const structureObjects = availableObjects.slice(0, Math.floor(Math.random() * 10) + 5);

    return {
      id: `struct-${Math.random().toString(36).substr(2, 9)}`,
      name: `Structure-${Date.now()}`,
      position: [0, 0, 0],
      objects: structureObjects,
      seed: Math.floor(Math.random() * 1000000),
    };
  }

  /**
   * Sample common world generators
   */
  static createTerrainWorld(seed: number): GenerationParams {
    return {
      seed,
      width: 100,
      height: 100,
      depth: 50,
      scale: 0.05,
      octaves: 6,
      persistence: 0.5,
      lacunarity: 2.0,
      threshold: 0.4,
    };
  }

  static createCaveWorld(seed: number): GenerationParams {
    return {
      seed,
      width: 80,
      height: 80,
      depth: 100,
      scale: 0.1,
      octaves: 4,
      persistence: 0.6,
      lacunarity: 2.5,
      threshold: 0.5,
    };
  }

  static createIslandWorld(seed: number): GenerationParams {
    return {
      seed,
      width: 120,
      height: 120,
      depth: 30,
      scale: 0.03,
      octaves: 5,
      persistence: 0.55,
      lacunarity: 2.2,
      threshold: 0.45,
    };
  }
}

/**
 * Utility: Noise Map Analyzer
 */
export class NoiseMapAnalyzer {
  static analyze(map: number[][]): {
    min: number;
    max: number;
    mean: number;
    variance: number;
    distribution: { [key: string]: number };
  } {
    const flat = map.flat();
    const min = Math.min(...flat);
    const max = Math.max(...flat);
    const mean = flat.reduce((a, b) => a + b, 0) / flat.length;

    const variance = flat.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / flat.length;

    const distribution: { [key: string]: number } = {
      low: 0,
      medium: 0,
      high: 0,
    };

    for (const val of flat) {
      if (val < 0.33) distribution.low++;
      else if (val < 0.66) distribution.medium++;
      else distribution.high++;
    }

    return {
      min,
      max,
      mean,
      variance,
      distribution,
    };
  }

  static visualize(map: number[][]): string {
    const chars = ['·', '░', '▒', '▓', '█'];
    return map
      .map((row) =>
        row
          .map((val) => chars[Math.floor(val * (chars.length - 1))])
          .join('')
      )
      .join('\n');
  }
}
