import { Mulberry32, PerlinNoise } from './noise';
import type { Biome, TerrainChunk, TerrainConfig, TerrainFeature } from './types';

export const DEFAULT_BIOMES: Biome[] = [
  { name: 'ocean', minHeight: 0, maxHeight: 35, features: [] },
  { name: 'plains', minHeight: 35, maxHeight: 62, features: ['grass', 'flower'] },
  { name: 'forest', minHeight: 50, maxHeight: 78, features: ['tree', 'rock'] },
  { name: 'mountain', minHeight: 72, maxHeight: 100, features: ['rock', 'pine'] },
];

export const DEFAULT_TERRAIN_CONFIG: Required<TerrainConfig> = {
  seed: 1,
  scale: 0.01,
  octaves: 5,
  lacunarity: 2,
  persistence: 0.5,
  waterLevel: 35,
  heightScale: 100,
  biomes: DEFAULT_BIOMES,
};

export class TerrainGenerator {
  private readonly config: Required<TerrainConfig>;
  private readonly heightNoise: PerlinNoise;
  private readonly featureNoise: PerlinNoise;

  constructor(config: TerrainConfig = {}) {
    this.config = { ...DEFAULT_TERRAIN_CONFIG, ...config, biomes: config.biomes ?? DEFAULT_BIOMES };
    this.heightNoise = new PerlinNoise(this.config.seed);
    this.featureNoise = new PerlinNoise(this.config.seed ^ 0x51f15e);
  }

  generateChunk(chunkX: number, chunkZ: number, width: number, depth: number): TerrainChunk {
    const heightmap: number[][] = [];
    const biomes: string[][] = [];
    const features: TerrainFeature[] = [];
    const random = new Mulberry32(this.config.seed ^ (chunkX * 73856093) ^ (chunkZ * 19349663));

    for (let x = 0; x < width; x += 1) {
      heightmap[x] = [];
      biomes[x] = [];

      for (let z = 0; z < depth; z += 1) {
        const worldX = chunkX * width + x;
        const worldZ = chunkZ * depth + z;
        const normalized = (this.heightNoise.octave(worldX * this.config.scale, worldZ * this.config.scale, this.config) + 1) / 2;
        const height = Math.round(normalized * this.config.heightScale);
        const biome = this.pickBiome(height);

        heightmap[x][z] = height;
        biomes[x][z] = biome.name;

        const density = (this.featureNoise.get(worldX * this.config.scale * 5, worldZ * this.config.scale * 5) + 1) / 2;
        if ((biome.features?.length ?? 0) > 0 && density > 0.72) {
          features.push({
            type: random.pick(biome.features ?? []),
            position: { x: worldX, y: height, z: worldZ },
            biome: biome.name,
          });
        }
      }
    }

    return { chunkX, chunkZ, width, depth, heightmap, biomes, features };
  }

  private pickBiome(height: number): Biome {
    return (
      this.config.biomes.find((biome) => height >= biome.minHeight && height <= biome.maxHeight) ??
      this.config.biomes[this.config.biomes.length - 1] ??
      DEFAULT_BIOMES[0]
    );
  }
}

export function createTerrainGenerator(config: TerrainConfig = {}): TerrainGenerator {
  return new TerrainGenerator(config);
}
