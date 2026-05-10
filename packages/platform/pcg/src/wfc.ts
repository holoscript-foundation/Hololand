import { Mulberry32 } from './noise';
import type { Rule, Tile, WFCConfig, WFCResult } from './types';

export const SIMPLE_TILESET: Tile[] = [
  { id: 'grass', weight: 4, canConnect: ['grass', 'path', 'water'] },
  { id: 'path', weight: 2, canConnect: ['grass', 'path', 'stone'] },
  { id: 'stone', weight: 1, canConnect: ['path', 'stone'] },
  { id: 'water', weight: 1, canConnect: ['grass', 'water'] },
];

export const DEFAULT_WFC_CONFIG: Required<WFCConfig> = {
  width: 16,
  height: 16,
  tileset: SIMPLE_TILESET,
  rules: [],
  seed: 1,
};

export class WFCSolver {
  private readonly config: Required<WFCConfig>;
  private readonly rules = new Map<string, Rule>();

  constructor(config: WFCConfig) {
    this.config = {
      ...DEFAULT_WFC_CONFIG,
      ...config,
      tileset: config.tileset ?? SIMPLE_TILESET,
      rules: config.rules ?? [],
    };
    this.config.rules.forEach((rule) => this.rules.set(rule.tile, rule));
  }

  solve(): WFCResult {
    if (this.config.tileset.length === 0) {
      return { success: false, tiles: [], iterations: 0, reason: 'tileset is empty' };
    }

    const random = new Mulberry32(this.config.seed);
    const tiles = Array.from({ length: this.config.height }, () => Array.from({ length: this.config.width }, () => ''));
    let iterations = 0;

    for (let y = 0; y < this.config.height; y += 1) {
      for (let x = 0; x < this.config.width; x += 1) {
        iterations += 1;
        const north = y > 0 ? tiles[y - 1][x] : undefined;
        const west = x > 0 ? tiles[y][x - 1] : undefined;
        const options = this.config.tileset.filter((tile) => this.isCompatible(tile.id, north, 'north') && this.isCompatible(tile.id, west, 'west'));

        if (options.length === 0) {
          return { success: false, tiles, iterations, reason: `no compatible tile at ${x},${y}` };
        }

        tiles[y][x] = pickWeighted(options, random).id;
      }
    }

    return { success: true, tiles, iterations };
  }

  private isCompatible(tileId: string, neighbor: string | undefined, direction: 'north' | 'west'): boolean {
    if (!neighbor) {
      return true;
    }

    const rule = this.rules.get(tileId);
    if (rule) {
      const allowed = direction === 'north' ? rule.canBeNorth : rule.canBeWest;
      if (allowed) {
        return allowed.includes(neighbor);
      }
    }

    const tile = this.config.tileset.find((candidate) => candidate.id === tileId);
    return tile?.canConnect?.includes(neighbor) ?? true;
  }
}

function pickWeighted(tiles: Tile[], random: Mulberry32): Tile {
  const total = tiles.reduce((sum, tile) => sum + (tile.weight ?? 1), 0);
  let cursor = random.range(0, total);

  for (const tile of tiles) {
    cursor -= tile.weight ?? 1;
    if (cursor <= 0) {
      return tile;
    }
  }

  return tiles[tiles.length - 1];
}

export function createWFCSolver(config: WFCConfig): WFCSolver {
  return new WFCSolver(config);
}

export function createWFCFromTileset(config: Omit<WFCConfig, 'rules'> & { rules?: Rule[] }): WFCSolver {
  const inferredRules =
    config.rules ??
    (config.tileset ?? SIMPLE_TILESET).map((tile) => ({
      tile: tile.id,
      canBeNorth: tile.canConnect,
      canBeSouth: tile.canConnect,
      canBeEast: tile.canConnect,
      canBeWest: tile.canConnect,
    }));

  return new WFCSolver({ ...config, rules: inferredRules });
}
