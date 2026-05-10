import type { FractalOptions, NoiseType } from './types';

export class Mulberry32 {
  private state: number;

  constructor(seed = 1) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  integer(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from an empty array');
    }
    return items[Math.min(items.length - 1, Math.floor(this.next() * items.length))];
  }
}

export abstract class NoiseGenerator {
  protected readonly seed: number;

  constructor(seed = 1) {
    this.seed = seed;
  }

  abstract get(x: number, y: number): number;

  get3D(x: number, y: number, z: number): number {
    return this.get(x + z * 37.719, y + z * 17.113);
  }

  octave(x: number, y: number, options: FractalOptions = {}): number {
    const octaves = options.octaves ?? 4;
    const lacunarity = options.lacunarity ?? 2;
    const persistence = options.persistence ?? 0.5;
    let frequency = 1;
    let amplitude = 1;
    let total = 0;
    let max = 0;

    for (let i = 0; i < octaves; i += 1) {
      total += this.get(x * frequency, y * frequency) * amplitude;
      max += amplitude;
      frequency *= lacunarity;
      amplitude *= persistence;
    }

    return max === 0 ? 0 : total / max;
  }

  protected hash(x: number, y: number, salt = 0): number {
    let value = Math.imul(Math.floor(x), 374761393) + Math.imul(Math.floor(y), 668265263) + Math.imul(this.seed + salt, 2246822519);
    value = Math.imul(value ^ (value >>> 13), 1274126177);
    return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
  }
}

function fade(value: number): number {
  return value * value * value * (value * (value * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class ValueNoise extends NoiseGenerator {
  get(x: number, y: number): number {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const xf = x - x0;
    const yf = y - y0;

    const a = this.hash(x0, y0) * 2 - 1;
    const b = this.hash(x0 + 1, y0) * 2 - 1;
    const c = this.hash(x0, y0 + 1) * 2 - 1;
    const d = this.hash(x0 + 1, y0 + 1) * 2 - 1;

    const u = fade(xf);
    const v = fade(yf);

    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  }
}

export class PerlinNoise extends ValueNoise {}

export class SimplexNoise extends NoiseGenerator {
  private readonly valueNoise: ValueNoise;

  constructor(seed = 1) {
    super(seed);
    this.valueNoise = new ValueNoise(seed ^ 0x9e3779b9);
  }

  get(x: number, y: number): number {
    const skew = (x + y) * 0.3660254037844386;
    return this.valueNoise.get(x + skew, y + skew);
  }
}

export class WhiteNoise extends NoiseGenerator {
  get(x: number, y: number): number {
    return this.hash(x, y) * 2 - 1;
  }
}

export class WorleyNoise extends NoiseGenerator {
  get(
    x: number,
    y: number,
    options: {
      distanceFunction?: 'euclidean' | 'manhattan' | 'chebyshev';
      combineFunction?: 'f1' | 'f2' | 'f2-f1';
    } = {}
  ): number {
    const cellX = Math.floor(x);
    const cellY = Math.floor(y);
    const distances: number[] = [];

    for (let oy = -1; oy <= 1; oy += 1) {
      for (let ox = -1; ox <= 1; ox += 1) {
        const px = cellX + ox + this.hash(cellX + ox, cellY + oy, 11);
        const py = cellY + oy + this.hash(cellX + ox, cellY + oy, 23);
        const dx = px - x;
        const dy = py - y;
        distances.push(distance(dx, dy, options.distanceFunction ?? 'euclidean'));
      }
    }

    distances.sort((a, b) => a - b);
    const f1 = distances[0] ?? 0;
    const f2 = distances[1] ?? f1;
    const value = options.combineFunction === 'f2' ? f2 : options.combineFunction === 'f2-f1' ? f2 - f1 : f1;
    return Math.max(-1, Math.min(1, value * 2 - 1));
  }
}

function distance(dx: number, dy: number, mode: 'euclidean' | 'manhattan' | 'chebyshev'): number {
  switch (mode) {
    case 'manhattan':
      return Math.abs(dx) + Math.abs(dy);
    case 'chebyshev':
      return Math.max(Math.abs(dx), Math.abs(dy));
    case 'euclidean':
    default:
      return Math.hypot(dx, dy);
  }
}

export function createNoise(type: NoiseType = 'perlin', seed = 1): NoiseGenerator {
  switch (type) {
    case 'simplex':
      return new SimplexNoise(seed);
    case 'worley':
      return new WorleyNoise(seed);
    case 'value':
      return new ValueNoise(seed);
    case 'white':
      return new WhiteNoise(seed);
    case 'perlin':
    default:
      return new PerlinNoise(seed);
  }
}
