/**
 * @hololand/generation WFCTerrainGenerator
 *
 * Tier 2: Wave Function Collapse terrain generation.
 * Implements actual WFC logic with tile definitions, adjacency constraints,
 * entropy-based cell selection, constraint propagation, and backtracking
 * on contradiction. Generates heightmap grids.
 */

export interface TileDefinition {
  id: number;
  name: string;
  /** Base height value 0-1 */
  height: number;
  /** Weight / probability (higher = more common) */
  weight: number;
  /** Which tile IDs can appear to the north (+y) */
  allowedNorth: Set<number>;
  /** Which tile IDs can appear to the east (+x) */
  allowedEast: Set<number>;
  /** Which tile IDs can appear to the south (-y) */
  allowedSouth: Set<number>;
  /** Which tile IDs can appear to the west (-x) */
  allowedWest: Set<number>;
}

interface WFCCell {
  x: number;
  y: number;
  /** Set of possible tile IDs remaining (superposition) */
  possibleTiles: Set<number>;
  /** Collapsed tile ID, or null if uncollapsed */
  collapsedTile: number | null;
}

interface WFCSnapshot {
  cells: Array<{ x: number; y: number; possibleTiles: number[]; collapsedTile: number | null }>;
}

export interface WFCConfig {
  maxBacktracks: number;
}

const DEFAULT_TILES: TileDefinition[] = [
  {
    id: 0, name: 'deep_water', height: 0.1, weight: 2,
    allowedNorth: new Set([0, 1]), allowedEast: new Set([0, 1]),
    allowedSouth: new Set([0, 1]), allowedWest: new Set([0, 1]),
  },
  {
    id: 1, name: 'shallow_water', height: 0.25, weight: 3,
    allowedNorth: new Set([0, 1, 2]), allowedEast: new Set([0, 1, 2]),
    allowedSouth: new Set([0, 1, 2]), allowedWest: new Set([0, 1, 2]),
  },
  {
    id: 2, name: 'sand', height: 0.35, weight: 3,
    allowedNorth: new Set([1, 2, 3]), allowedEast: new Set([1, 2, 3]),
    allowedSouth: new Set([1, 2, 3]), allowedWest: new Set([1, 2, 3]),
  },
  {
    id: 3, name: 'grass', height: 0.5, weight: 5,
    allowedNorth: new Set([2, 3, 4]), allowedEast: new Set([2, 3, 4]),
    allowedSouth: new Set([2, 3, 4]), allowedWest: new Set([2, 3, 4]),
  },
  {
    id: 4, name: 'forest', height: 0.6, weight: 4,
    allowedNorth: new Set([3, 4, 5]), allowedEast: new Set([3, 4, 5]),
    allowedSouth: new Set([3, 4, 5]), allowedWest: new Set([3, 4, 5]),
  },
  {
    id: 5, name: 'hill', height: 0.75, weight: 2,
    allowedNorth: new Set([4, 5, 6]), allowedEast: new Set([4, 5, 6]),
    allowedSouth: new Set([4, 5, 6]), allowedWest: new Set([4, 5, 6]),
  },
  {
    id: 6, name: 'mountain', height: 0.9, weight: 1,
    allowedNorth: new Set([5, 6]), allowedEast: new Set([5, 6]),
    allowedSouth: new Set([5, 6]), allowedWest: new Set([5, 6]),
  },
];

export class WFCTerrainGenerator {
  private tiles: TileDefinition[];
  private tileMap: Map<number, TileDefinition> = new Map();
  private rng: () => number;
  private maxBacktracks: number;

  constructor(tiles?: TileDefinition[], config?: Partial<WFCConfig>) {
    this.tiles = tiles ?? DEFAULT_TILES;
    for (const t of this.tiles) {
      this.tileMap.set(t.id, t);
    }
    this.rng = Math.random; // replaced by seeded version in generate()
    this.maxBacktracks = config?.maxBacktracks ?? 1000;
  }

  // ── Legacy API (preserved) ───────────────────────────────────────

  /**
   * Generate terrain using WFC. Falls back to seeded random on contradiction exhaustion.
   */
  generate(size: number, seed: number): number[][] {
    this.seedRng(seed);

    const result = this.wfcGenerate(size);
    if (result !== null) return result;

    // Fallback: seeded random (original behavior)
    return this.fallbackGenerate(size, seed);
  }

  // ── Core WFC algorithm ───────────────────────────────────────────

  /**
   * Execute full WFC with backtracking. Returns null on exhaustion.
   */
  private wfcGenerate(size: number): number[][] | null {
    const allTileIds = new Set(this.tiles.map((t) => t.id));
    const grid: WFCCell[][] = [];

    // Initialize grid: every cell is in full superposition
    for (let y = 0; y < size; y++) {
      const row: WFCCell[] = [];
      for (let x = 0; x < size; x++) {
        row.push({ x, y, possibleTiles: new Set(allTileIds), collapsedTile: null });
      }
      grid.push(row);
    }

    const snapshots: WFCSnapshot[] = [];
    let backtracks = 0;

    while (true) {
      // Find cell with lowest entropy (fewest possibilities, uncollapsed)
      const cell = this.findLowestEntropy(grid, size);
      if (cell === null) break; // all collapsed

      if (cell.possibleTiles.size === 0) {
        // Contradiction: backtrack
        if (backtracks >= this.maxBacktracks || snapshots.length === 0) {
          return null; // exhausted
        }
        backtracks++;
        this.restoreSnapshot(grid, snapshots.pop()!, size);
        continue;
      }

      // Save snapshot before collapsing (for backtracking)
      snapshots.push(this.takeSnapshot(grid, size));

      // Collapse: choose a tile weighted by probability
      const chosen = this.weightedChoose(cell.possibleTiles);
      cell.collapsedTile = chosen;
      cell.possibleTiles = new Set([chosen]);

      // Propagate constraints
      const valid = this.propagate(grid, size, cell.x, cell.y);
      if (!valid) {
        // Contradiction during propagation: backtrack
        if (backtracks >= this.maxBacktracks || snapshots.length === 0) {
          return null;
        }
        backtracks++;
        this.restoreSnapshot(grid, snapshots.pop()!, size);
      }
    }

    // Convert collapsed grid to heightmap
    return this.gridToHeightmap(grid, size);
  }

  // ── Entropy calculation ──────────────────────────────────────────

  private findLowestEntropy(grid: WFCCell[][], size: number): WFCCell | null {
    let minEntropy = Infinity;
    const candidates: WFCCell[] = [];

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = grid[y][x];
        if (cell.collapsedTile !== null) continue;

        const entropy = this.shannonEntropy(cell.possibleTiles);
        // Add small random noise to break ties
        const noisyEntropy = entropy + this.rng() * 0.001;

        if (noisyEntropy < minEntropy) {
          minEntropy = noisyEntropy;
          candidates.length = 0;
          candidates.push(cell);
        } else if (Math.abs(noisyEntropy - minEntropy) < 0.01) {
          candidates.push(cell);
        }
      }
    }

    if (candidates.length === 0) return null;
    return candidates[Math.floor(this.rng() * candidates.length)];
  }

  private shannonEntropy(possibleTiles: Set<number>): number {
    if (possibleTiles.size <= 1) return 0;

    let sumWeights = 0;
    let sumWeightLogWeight = 0;

    for (const tileId of possibleTiles) {
      const tile = this.tileMap.get(tileId);
      if (!tile) continue;
      const w = tile.weight;
      sumWeights += w;
      sumWeightLogWeight += w * Math.log(w);
    }

    if (sumWeights === 0) return 0;
    return Math.log(sumWeights) - sumWeightLogWeight / sumWeights;
  }

  // ── Weighted tile selection ──────────────────────────────────────

  private weightedChoose(possibleTiles: Set<number>): number {
    let totalWeight = 0;
    for (const id of possibleTiles) {
      const tile = this.tileMap.get(id);
      totalWeight += tile?.weight ?? 1;
    }

    let roll = this.rng() * totalWeight;
    for (const id of possibleTiles) {
      const tile = this.tileMap.get(id);
      roll -= tile?.weight ?? 1;
      if (roll <= 0) return id;
    }

    // Fallback: return first
    return possibleTiles.values().next().value!;
  }

  // ── Constraint propagation ───────────────────────────────────────

  private propagate(grid: WFCCell[][], size: number, startX: number, startY: number): boolean {
    const stack: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const { x, y } = stack.pop()!;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      visited.add(key);

      const cell = grid[y][x];
      const neighbors: Array<{ nx: number; ny: number; direction: 'north' | 'east' | 'south' | 'west' }> = [
        { nx: x, ny: y - 1, direction: 'south' },  // neighbor to the north, constrained by our south rule
        { nx: x + 1, ny: y, direction: 'west' },    // neighbor to the east, constrained by our west rule
        { nx: x, ny: y + 1, direction: 'north' },   // neighbor to the south
        { nx: x - 1, ny: y, direction: 'east' },    // neighbor to the west
      ];

      for (const { nx, ny, direction } of neighbors) {
        if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;

        const neighbor = grid[ny][nx];
        if (neighbor.collapsedTile !== null) continue;

        // Compute allowed tiles for neighbor based on current cell's possibilities
        const allowed = this.getAllowedTilesForNeighbor(cell.possibleTiles, direction);
        const beforeSize = neighbor.possibleTiles.size;

        // Intersect
        for (const id of [...neighbor.possibleTiles]) {
          if (!allowed.has(id)) {
            neighbor.possibleTiles.delete(id);
          }
        }

        if (neighbor.possibleTiles.size === 0) return false; // contradiction

        if (neighbor.possibleTiles.size < beforeSize) {
          stack.push({ x: nx, y: ny });
        }
      }
    }

    return true;
  }

  private getAllowedTilesForNeighbor(
    cellPossibilities: Set<number>,
    neighborDirection: 'north' | 'east' | 'south' | 'west',
  ): Set<number> {
    const allowed = new Set<number>();

    for (const tileId of cellPossibilities) {
      const tile = this.tileMap.get(tileId);
      if (!tile) continue;

      let adjacentSet: Set<number>;
      switch (neighborDirection) {
        case 'north': adjacentSet = tile.allowedNorth; break;
        case 'east': adjacentSet = tile.allowedEast; break;
        case 'south': adjacentSet = tile.allowedSouth; break;
        case 'west': adjacentSet = tile.allowedWest; break;
      }

      for (const id of adjacentSet) {
        allowed.add(id);
      }
    }

    return allowed;
  }

  // ── Backtracking snapshots ───────────────────────────────────────

  private takeSnapshot(grid: WFCCell[][], size: number): WFCSnapshot {
    const cells: WFCSnapshot['cells'] = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = grid[y][x];
        cells.push({
          x, y,
          possibleTiles: [...cell.possibleTiles],
          collapsedTile: cell.collapsedTile,
        });
      }
    }
    return { cells };
  }

  private restoreSnapshot(grid: WFCCell[][], snapshot: WFCSnapshot, size: number): void {
    for (const saved of snapshot.cells) {
      const cell = grid[saved.y][saved.x];
      cell.possibleTiles = new Set(saved.possibleTiles);
      cell.collapsedTile = saved.collapsedTile;
    }
  }

  // ── Output conversion ────────────────────────────────────────────

  private gridToHeightmap(grid: WFCCell[][], size: number): number[][] {
    const heightmap: number[][] = [];
    for (let y = 0; y < size; y++) {
      const row: number[] = [];
      for (let x = 0; x < size; x++) {
        const cell = grid[y][x];
        const tile = this.tileMap.get(cell.collapsedTile ?? 0);
        row.push(tile?.height ?? 0.5);
      }
      heightmap.push(row);
    }
    return heightmap;
  }

  // ── Fallback (original seeded random) ────────────────────────────

  private fallbackGenerate(size: number, seed: number): number[][] {
    const terrain: number[][] = [];
    let rng = seed;
    for (let y = 0; y < size; y++) {
      const row: number[] = [];
      for (let x = 0; x < size; x++) {
        rng = (rng * 1103515245 + 12345) & 0x7fffffff;
        row.push((rng % 256) / 255);
      }
      terrain.push(row);
    }
    return terrain;
  }

  // ── Seeded RNG ───────────────────────────────────────────────────

  private seedRng(seed: number): void {
    let s = seed;
    this.rng = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return (s & 0x3fffffff) / 0x3fffffff;
    };
  }

  // ── Public utilities ─────────────────────────────────────────────

  getTileDefinitions(): TileDefinition[] {
    return [...this.tiles];
  }

  /**
   * Generate with custom tiles at runtime.
   */
  generateWithTiles(size: number, seed: number, tiles: TileDefinition[]): number[][] {
    const prevTiles = this.tiles;
    const prevMap = this.tileMap;

    this.tiles = tiles;
    this.tileMap = new Map();
    for (const t of tiles) {
      this.tileMap.set(t.id, t);
    }

    const result = this.generate(size, seed);

    this.tiles = prevTiles;
    this.tileMap = prevMap;
    return result;
  }
}
