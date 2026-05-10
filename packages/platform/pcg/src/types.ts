export type NoiseType = 'perlin' | 'simplex' | 'worley' | 'value' | 'white';

export interface FractalOptions {
  octaves?: number;
  lacunarity?: number;
  persistence?: number;
}

export interface Biome {
  name: string;
  minHeight: number;
  maxHeight: number;
  temperature?: number;
  humidity?: number;
  features?: string[];
}

export interface TerrainFeature {
  type: string;
  position: { x: number; y: number; z: number };
  biome: string;
}

export interface TerrainConfig extends FractalOptions {
  seed?: number;
  scale?: number;
  waterLevel?: number;
  heightScale?: number;
  biomes?: Biome[];
}

export interface TerrainChunk {
  chunkX: number;
  chunkZ: number;
  width: number;
  depth: number;
  heightmap: number[][];
  biomes: string[][];
  features: TerrainFeature[];
}

export interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point2 {
  x: number;
  y: number;
}

export interface Path {
  start: Point2;
  end: Point2;
  points: Point2[];
}

export interface DungeonConfig {
  width: number;
  height: number;
  roomMinSize?: number;
  roomMaxSize?: number;
  maxRooms?: number;
  corridorWidth?: number;
  seed?: number;
}

export interface DungeonMap {
  rooms: Room[];
  corridors: Path[];
  tiles: number[][];
  spawnPoint: Point2;
  exits: Point2[];
}

export interface LSystemConfig {
  axiom: string;
  rules: Record<string, string>;
  iterations?: number;
  angle?: number;
  stepLength?: number;
}

export interface Segment3 {
  start: [number, number, number];
  end: [number, number, number];
}

export interface Tile {
  id: string;
  weight?: number;
  canConnect?: string[];
}

export interface Rule {
  tile: string;
  canBeNorth?: string[];
  canBeSouth?: string[];
  canBeEast?: string[];
  canBeWest?: string[];
}

export interface WFCConfig {
  width: number;
  height: number;
  tileset?: Tile[];
  rules?: Rule[];
  seed?: number;
}

export interface WFCResult {
  success: boolean;
  tiles: string[][];
  iterations: number;
  reason?: string;
}
