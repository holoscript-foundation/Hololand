/**
 * HierarchicalPathfinder - Zone/Cluster/Cell hierarchical A* pathfinding
 *
 * Provides efficient pathfinding on large 3D grids by organizing the
 * navigation mesh into a hierarchy of levels:
 *
 *   Level 0 (cells):    Finest granularity, 1:1 with grid cells
 *   Level 1 (clusters): Groups of cells (e.g. 8x8x8 blocks)
 *   Level 2 (zones):    Groups of clusters
 *   ...up to `hierarchyLevels`
 *
 * Pathfinding works top-down: a coarse path is found at the highest level,
 * then refined through successively finer levels, and finally smoothed.
 * This dramatically reduces the A* search space for large worlds.
 *
 * Features:
 * - Full 3D grid-based navigation
 * - Dynamic obstacle insertion / removal with navmesh rebuild
 * - Path smoothing and simplification
 * - Path caching for repeated queries
 * - `isWalkable` checks
 *
 * @module HierarchicalPathfinder
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** 3D vector for positions in world space. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Axis-aligned bounding box for obstacles. */
export interface AABB {
  min: Vec3;
  max: Vec3;
}

/** Options passed to `findPath`. */
export interface FindPathOptions {
  /** Apply Catmull-Rom smoothing to the path (default true). */
  smooth?: boolean;
  /** Remove collinear waypoints (default true). */
  simplify?: boolean;
  /** Maximum A* iterations before giving up (default 1000). */
  maxIterations?: number;
}

/** Configuration for the hierarchical pathfinder. */
export interface HierarchyConfig {
  /** Grid dimensions in world-space units. */
  gridSize: Vec3;
  /** Size of each cell in meters (default 1.0). */
  cellSize: number;
  /** Number of hierarchy levels (2-4 recommended). */
  hierarchyLevels: number;
  /** Maximum path length in waypoints (default 1000). */
  maxPathLength?: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Cluster size multiplier per level. Level 0 = 1 cell, level 1 = 8 cells, etc. */
const CLUSTER_SIZE = 8;

/** Encode 3 ints into a single key for Map lookups. */
function cellKey(x: number, y: number, z: number): number {
  // Works for grids up to ~1000 per axis
  return ((x & 0x3ff) << 20) | ((y & 0x3ff) << 10) | (z & 0x3ff);
}

/** Simple min-heap (priority queue) for A*. */
class MinHeap<T> {
  private data: { item: T; priority: number }[] = [];

  get size(): number { return this.data.length; }

  push(item: T, priority: number): void {
    this.data.push({ item, priority });
    this.bubbleUp(this.data.length - 1);
  }

  pop(): T | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      this.sinkDown(0);
    }
    return top.item;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.data[i].priority >= this.data[parent].priority) break;
      [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
      i = parent;
    }
  }

  private sinkDown(i: number): void {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this.data[l].priority < this.data[smallest].priority) smallest = l;
      if (r < n && this.data[r].priority < this.data[smallest].priority) smallest = r;
      if (smallest === i) break;
      [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
      i = smallest;
    }
  }
}

/** 26-connected 3D neighbor offsets. */
const NEIGHBORS_3D: ReadonlyArray<readonly [number, number, number]> = (() => {
  const offsets: Array<readonly [number, number, number]> = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        offsets.push([dx, dy, dz] as const);
      }
    }
  }
  return offsets;
})();

/** 6-connected (face-adjacent) 3D neighbor offsets for faster coarse search. */
const NEIGHBORS_6: ReadonlyArray<readonly [number, number, number]> = [
  [-1, 0, 0], [1, 0, 0],
  [0, -1, 0], [0, 1, 0],
  [0, 0, -1], [0, 0, 1],
];

// ---------------------------------------------------------------------------
// HierarchicalPathfinder
// ---------------------------------------------------------------------------

export class HierarchicalPathfinder {
  readonly gridSize: Vec3;
  readonly cellSize: number;
  readonly hierarchyLevels: number;
  readonly maxPathLength: number;

  /** Cell counts per axis. */
  private readonly cellsX: number;
  private readonly cellsY: number;
  private readonly cellsZ: number;

  /** Set of blocked cell keys (level 0). */
  private blocked: Set<number> = new Set();

  /** Active obstacles: id -> AABB. */
  private obstacles: Map<number, AABB> = new Map();
  private nextObstacleId = 1;

  /**
   * Hierarchy: for each level > 0, store which cluster-keys are passable.
   * A cluster is passable if at least one of its children is passable.
   */
  private hierarchy: Array<Set<number>> = [];

  /** Simple LRU path cache. */
  private pathCache: Map<string, Vec3[]> = new Map();
  private readonly CACHE_MAX = 128;

  constructor(config: HierarchyConfig) {
    this.cellSize = config.cellSize > 0 ? config.cellSize : 1.0;
    this.hierarchyLevels = Math.max(1, Math.min(config.hierarchyLevels, 6));
    this.maxPathLength = config.maxPathLength ?? 1000;

    this.gridSize = {
      x: Math.max(1, config.gridSize.x),
      y: Math.max(1, config.gridSize.y),
      z: Math.max(1, config.gridSize.z),
    };

    this.cellsX = Math.ceil(this.gridSize.x / this.cellSize);
    this.cellsY = Math.ceil(this.gridSize.y / this.cellSize);
    this.cellsZ = Math.ceil(this.gridSize.z / this.cellSize);

    this.buildHierarchy();
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Find a path from `start` to `goal` (both in world space).
   * Returns an array of Vec3 waypoints, or an empty array if no path found.
   */
  findPath(start: Vec3, goal: Vec3, options?: FindPathOptions): Vec3[] {
    const smooth = options?.smooth ?? true;
    const simplify = options?.simplify ?? true;
    // Default iterations scale with grid volume (but cap at reasonable max)
    const gridVolume = this.cellsX * this.cellsY * this.cellsZ;
    const defaultMaxIter = Math.min(gridVolume * 2, 200000);
    const maxIter = options?.maxIterations ?? defaultMaxIter;

    // Convert to cell coords
    const s = this.worldToCell(start);
    const g = this.worldToCell(goal);

    // Check cache
    const cacheKey = `${s.x},${s.y},${s.z}-${g.x},${g.y},${g.z}`;
    const cached = this.pathCache.get(cacheKey);
    if (cached) return cached;

    // Hierarchical search: find coarse path at top level, refine downward
    let coarsePath: Array<{ x: number; y: number; z: number }>;

    if (this.hierarchyLevels > 1) {
      coarsePath = this.findCoarsePath(s, g, maxIter);
      if (coarsePath.length === 0) return [];
    } else {
      coarsePath = [s, g];
    }

    // Refine: A* at cell level between successive coarse waypoints
    let cellPath: Array<{ x: number; y: number; z: number }> = [];
    for (let i = 0; i < coarsePath.length - 1; i++) {
      const segStart = i === 0 ? s : coarsePath[i];
      const segEnd = i === coarsePath.length - 2 ? g : coarsePath[i + 1];
      const seg = this.aStarCells(segStart, segEnd, maxIter);
      if (seg.length === 0) return []; // No path in this segment
      // Avoid duplicating the junction point
      if (cellPath.length > 0 && seg.length > 0) {
        seg.shift();
      }
      cellPath = cellPath.concat(seg);
      if (cellPath.length > this.maxPathLength) {
        cellPath = cellPath.slice(0, this.maxPathLength);
        break;
      }
    }

    // Convert cell path to world space
    let worldPath = cellPath.map(c => this.cellToWorld(c));

    // Simplify (remove collinear points)
    if (simplify && worldPath.length > 2) {
      worldPath = this.simplifyPath(worldPath);
    }

    // Smooth
    if (smooth && worldPath.length > 2) {
      worldPath = this.smoothPath(worldPath);
    }

    // Cache
    this.cacheResult(cacheKey, worldPath);

    return worldPath;
  }

  /**
   * Add an axis-aligned obstacle. Returns a unique obstacle ID.
   * Call `rebuildNavmesh()` after adding obstacles for changes to take effect.
   */
  addObstacle(bounds: AABB): number {
    const id = this.nextObstacleId++;
    this.obstacles.set(id, bounds);
    return id;
  }

  /**
   * Remove an obstacle by ID.
   * Call `rebuildNavmesh()` after removing obstacles.
   */
  removeObstacle(id: number): void {
    this.obstacles.delete(id);
  }

  /**
   * Rebuild the navigation mesh from scratch. Call after adding/removing
   * obstacles. Clears the path cache.
   */
  rebuildNavmesh(): void {
    this.blocked.clear();
    this.pathCache.clear();

    // Mark cells blocked by obstacles
    for (const aabb of this.obstacles.values()) {
      const minC = this.worldToCell(aabb.min);
      const maxC = this.worldToCell(aabb.max);
      for (let z = minC.z; z <= maxC.z; z++) {
        for (let y = minC.y; y <= maxC.y; y++) {
          for (let x = minC.x; x <= maxC.x; x++) {
            if (this.cellInBounds(x, y, z)) {
              this.blocked.add(cellKey(x, y, z));
            }
          }
        }
      }
    }

    this.buildHierarchy();
  }

  /**
   * Check if a world-space position is walkable (not blocked by obstacles
   * and within grid bounds).
   */
  isWalkable(position: Vec3): boolean {
    // Check world-space bounds before clamping
    if (!this.worldInBounds(position)) return false;
    const c = this.worldToCell(position);
    if (!this.cellInBounds(c.x, c.y, c.z)) return false;
    return !this.blocked.has(cellKey(c.x, c.y, c.z));
  }

  // -----------------------------------------------------------------------
  // Hierarchy building
  // -----------------------------------------------------------------------

  private buildHierarchy(): void {
    this.hierarchy = [];

    // Level 0 is implicit (cell grid + blocked set).
    // Build levels 1..hierarchyLevels-1
    for (let level = 1; level < this.hierarchyLevels; level++) {
      const scale = Math.pow(CLUSTER_SIZE, level);
      const passable = new Set<number>();

      const cx = Math.ceil(this.cellsX / scale);
      const cy = Math.ceil(this.cellsY / scale);
      const cz = Math.ceil(this.cellsZ / scale);

      for (let z = 0; z < cz; z++) {
        for (let y = 0; y < cy; y++) {
          for (let x = 0; x < cx; x++) {
            if (this.isClusterPassable(x, y, z, level)) {
              passable.add(cellKey(x, y, z));
            }
          }
        }
      }

      this.hierarchy.push(passable);
    }
  }

  /**
   * A cluster at a given level is passable if at least one child cell
   * (or child cluster) is passable.
   */
  private isClusterPassable(cx: number, cy: number, cz: number, level: number): boolean {
    const startX = Math.floor(cx * CLUSTER_SIZE);
    const startY = Math.floor(cy * CLUSTER_SIZE);
    const startZ = Math.floor(cz * CLUSTER_SIZE);

    for (let dz = 0; dz < CLUSTER_SIZE; dz++) {
      for (let dy = 0; dy < CLUSTER_SIZE; dy++) {
        for (let dx = 0; dx < CLUSTER_SIZE; dx++) {
          const childX = startX + dx;
          const childY = startY + dy;
          const childZ = startZ + dz;

          if (level === 1) {
            // Child is a cell
            const cellX = Math.floor(cx * CLUSTER_SIZE + dx);
            const cellY = Math.floor(cy * CLUSTER_SIZE + dy);
            const cellZ = Math.floor(cz * CLUSTER_SIZE + dz);
            if (this.cellInBounds(cellX, cellY, cellZ) && !this.blocked.has(cellKey(cellX, cellY, cellZ))) {
              return true;
            }
          } else {
            // Child is a cluster at level-1
            const childSet = this.hierarchy[level - 2]; // hierarchy[0] = level 1
            if (childSet && childSet.has(cellKey(childX, childY, childZ))) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  // -----------------------------------------------------------------------
  // Coarse path (top level A*)
  // -----------------------------------------------------------------------

  private findCoarsePath(
    start: { x: number; y: number; z: number },
    goal: { x: number; y: number; z: number },
    maxIter: number,
  ): Array<{ x: number; y: number; z: number }> {
    const topLevel = this.hierarchyLevels - 1;
    const scale = Math.pow(CLUSTER_SIZE, topLevel);

    const sx = Math.floor(start.x / scale);
    const sy = Math.floor(start.y / scale);
    const sz = Math.floor(start.z / scale);
    const gx = Math.floor(goal.x / scale);
    const gy = Math.floor(goal.y / scale);
    const gz = Math.floor(goal.z / scale);

    if (sx === gx && sy === gy && sz === gz) {
      // Same cluster -- skip coarse path
      return [start, goal];
    }

    const passable = topLevel > 1 ? this.hierarchy[topLevel - 1] : undefined;
    const clusterCX = Math.ceil(this.cellsX / scale);
    const clusterCY = Math.ceil(this.cellsY / scale);
    const clusterCZ = Math.ceil(this.cellsZ / scale);

    const isPassable = (x: number, y: number, z: number): boolean => {
      if (x < 0 || y < 0 || z < 0 || x >= clusterCX || y >= clusterCY || z >= clusterCZ) return false;
      if (!passable) {
        // Level 1: check cells directly
        return this.hasPassableCellInCluster(x, y, z, topLevel);
      }
      return passable.has(cellKey(x, y, z));
    };

    // A* on cluster graph
    const open = new MinHeap<number>();
    const startKey = cellKey(sx, sy, sz);
    const goalKey = cellKey(gx, gy, gz);

    const gScore = new Map<number, number>();
    const cameFrom = new Map<number, number>();
    const closed = new Set<number>();
    gScore.set(startKey, 0);

    const heuristic = (ax: number, ay: number, az: number) =>
      Math.abs(ax - gx) + Math.abs(ay - gy) + Math.abs(az - gz);

    open.push(startKey, heuristic(sx, sy, sz));

    let iterations = 0;

    while (open.size > 0 && iterations < maxIter) {
      iterations++;
      const current = open.pop()!;
      if (current === goalKey) {
        // Reconstruct path in cluster coords, then convert to cell centers
        const clusterPath = this.reconstructPath(cameFrom, current);
        return clusterPath.map(k => {
          const kx = (k >> 20) & 0x3ff;
          const ky = (k >> 10) & 0x3ff;
          const kz = k & 0x3ff;
          return {
            x: Math.min(Math.floor(kx * scale + scale / 2), this.cellsX - 1),
            y: Math.min(Math.floor(ky * scale + scale / 2), this.cellsY - 1),
            z: Math.min(Math.floor(kz * scale + scale / 2), this.cellsZ - 1),
          };
        });
      }

      if (closed.has(current)) continue;
      closed.add(current);

      const cx = (current >> 20) & 0x3ff;
      const cy = (current >> 10) & 0x3ff;
      const cz = current & 0x3ff;
      const currentG = gScore.get(current)!;

      for (const [dx, dy, dz] of NEIGHBORS_6) {
        const nx = cx + dx;
        const ny = cy + dy;
        const nz = cz + dz;
        if (!isPassable(nx, ny, nz)) continue;

        const nKey = cellKey(nx, ny, nz);
        if (closed.has(nKey)) continue;
        const tentativeG = currentG + 1;
        const existing = gScore.get(nKey);
        if (existing !== undefined && tentativeG >= existing) continue;

        gScore.set(nKey, tentativeG);
        cameFrom.set(nKey, current);
        open.push(nKey, tentativeG + heuristic(nx, ny, nz));
      }
    }

    // No coarse path found -- fallback to direct cell search
    return [start, goal];
  }

  /** Check if a cluster has at least one passable cell (used for level-1 hierarchy). */
  private hasPassableCellInCluster(cx: number, cy: number, cz: number, level: number): boolean {
    const scale = Math.pow(CLUSTER_SIZE, level);
    const baseX = cx * scale;
    const baseY = cy * scale;
    const baseZ = cz * scale;
    const end = scale; // check up to `scale` cells in each dimension

    for (let dz = 0; dz < end && baseZ + dz < this.cellsZ; dz++) {
      for (let dy = 0; dy < end && baseY + dy < this.cellsY; dy++) {
        for (let dx = 0; dx < end && baseX + dx < this.cellsX; dx++) {
          if (!this.blocked.has(cellKey(baseX + dx, baseY + dy, baseZ + dz))) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // -----------------------------------------------------------------------
  // Cell-level A*
  // -----------------------------------------------------------------------

  private aStarCells(
    start: { x: number; y: number; z: number },
    goal: { x: number; y: number; z: number },
    maxIter: number,
  ): Array<{ x: number; y: number; z: number }> {
    const startKey = cellKey(start.x, start.y, start.z);
    const goalKey = cellKey(goal.x, goal.y, goal.z);

    if (startKey === goalKey) return [start];

    const open = new MinHeap<number>();
    const gScore = new Map<number, number>();
    const cameFrom = new Map<number, number>();
    const closed = new Set<number>();

    gScore.set(startKey, 0);
    const h = (ax: number, ay: number, az: number) =>
      Math.sqrt(
        (ax - goal.x) ** 2 + (ay - goal.y) ** 2 + (az - goal.z) ** 2
      );

    open.push(startKey, h(start.x, start.y, start.z));

    let iterations = 0;

    while (open.size > 0 && iterations < maxIter) {
      iterations++;
      const current = open.pop()!;

      if (current === goalKey) {
        const keys = this.reconstructPath(cameFrom, current);
        return keys.map(k => ({
          x: (k >> 20) & 0x3ff,
          y: (k >> 10) & 0x3ff,
          z: k & 0x3ff,
        }));
      }

      if (closed.has(current)) continue;
      closed.add(current);

      const cx = (current >> 20) & 0x3ff;
      const cy = (current >> 10) & 0x3ff;
      const cz = current & 0x3ff;
      const currentG = gScore.get(current)!;

      for (const [dx, dy, dz] of NEIGHBORS_3D) {
        const nx = cx + dx;
        const ny = cy + dy;
        const nz = cz + dz;

        if (!this.cellInBounds(nx, ny, nz)) continue;
        const nKey = cellKey(nx, ny, nz);
        if (this.blocked.has(nKey)) continue;
        if (closed.has(nKey)) continue;

        // Cost: Euclidean distance (1 for face, sqrt(2) for edge, sqrt(3) for corner)
        const moveCost = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const tentativeG = currentG + moveCost;
        const existing = gScore.get(nKey);
        if (existing !== undefined && tentativeG >= existing) continue;

        gScore.set(nKey, tentativeG);
        cameFrom.set(nKey, current);
        open.push(nKey, tentativeG + h(nx, ny, nz));
      }
    }

    return []; // No path found
  }

  // -----------------------------------------------------------------------
  // Path reconstruction, smoothing, simplification
  // -----------------------------------------------------------------------

  private reconstructPath(cameFrom: Map<number, number>, current: number): number[] {
    const path = [current];
    let c = current;
    while (cameFrom.has(c)) {
      c = cameFrom.get(c)!;
      path.unshift(c);
    }
    return path;
  }

  /**
   * Remove collinear waypoints using a cross-product collinearity check.
   */
  private simplifyPath(path: Vec3[]): Vec3[] {
    if (path.length <= 2) return path;

    const result: Vec3[] = [path[0]];
    for (let i = 1; i < path.length - 1; i++) {
      const prev = result[result.length - 1];
      const curr = path[i];
      const next = path[i + 1];

      // Direction from prev->curr and curr->next
      const d1x = curr.x - prev.x;
      const d1y = curr.y - prev.y;
      const d1z = curr.z - prev.z;
      const d2x = next.x - curr.x;
      const d2y = next.y - curr.y;
      const d2z = next.z - curr.z;

      // Cross product magnitude
      const cx = d1y * d2z - d1z * d2y;
      const cy = d1z * d2x - d1x * d2z;
      const cz = d1x * d2y - d1y * d2x;
      const cross = Math.sqrt(cx * cx + cy * cy + cz * cz);

      if (cross > 0.001) {
        result.push(curr);
      }
    }
    result.push(path[path.length - 1]);
    return result;
  }

  /**
   * Smooth path using Chaikin's corner-cutting algorithm (one pass).
   * This produces a smoother path without requiring spline evaluation.
   */
  private smoothPath(path: Vec3[]): Vec3[] {
    if (path.length <= 2) return path;

    const result: Vec3[] = [path[0]]; // Keep start

    for (let i = 0; i < path.length - 1; i++) {
      const p0 = path[i];
      const p1 = path[i + 1];

      // Quarter point
      result.push({
        x: p0.x * 0.75 + p1.x * 0.25,
        y: p0.y * 0.75 + p1.y * 0.25,
        z: p0.z * 0.75 + p1.z * 0.25,
      });

      // Three-quarter point
      result.push({
        x: p0.x * 0.25 + p1.x * 0.75,
        y: p0.y * 0.25 + p1.y * 0.75,
        z: p0.z * 0.25 + p1.z * 0.75,
      });
    }

    result.push(path[path.length - 1]); // Keep end
    return result;
  }

  // -----------------------------------------------------------------------
  // Coordinate conversion
  // -----------------------------------------------------------------------

  private worldToCell(pos: Vec3): { x: number; y: number; z: number } {
    return {
      x: Math.max(0, Math.min(Math.floor(pos.x / this.cellSize), this.cellsX - 1)),
      y: Math.max(0, Math.min(Math.floor(pos.y / this.cellSize), this.cellsY - 1)),
      z: Math.max(0, Math.min(Math.floor(pos.z / this.cellSize), this.cellsZ - 1)),
    };
  }

  private cellToWorld(cell: { x: number; y: number; z: number }): Vec3 {
    const half = this.cellSize * 0.5;
    return {
      x: cell.x * this.cellSize + half,
      y: cell.y * this.cellSize + half,
      z: cell.z * this.cellSize + half,
    };
  }

  private cellInBounds(x: number, y: number, z: number): boolean {
    return x >= 0 && x < this.cellsX && y >= 0 && y < this.cellsY && z >= 0 && z < this.cellsZ;
  }

  /** Check if a world-space position is within the grid bounds. */
  private worldInBounds(pos: Vec3): boolean {
    return pos.x >= 0 && pos.x < this.gridSize.x
      && pos.y >= 0 && pos.y < this.gridSize.y
      && pos.z >= 0 && pos.z < this.gridSize.z;
  }

  // -----------------------------------------------------------------------
  // Cache
  // -----------------------------------------------------------------------

  private cacheResult(key: string, path: Vec3[]): void {
    if (this.pathCache.size >= this.CACHE_MAX) {
      // Evict oldest entry
      const firstKey = this.pathCache.keys().next().value;
      if (firstKey !== undefined) {
        this.pathCache.delete(firstKey);
      }
    }
    this.pathCache.set(key, path);
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a new HierarchicalPathfinder instance.
 *
 * ```ts
 * const pathfinder = createHierarchicalPathfinder({
 *   gridSize: { x: 100, y: 50, z: 100 },
 *   cellSize: 1.0,
 *   hierarchyLevels: 3
 * });
 * ```
 */
export function createHierarchicalPathfinder(config: HierarchyConfig): HierarchicalPathfinder {
  return new HierarchicalPathfinder(config);
}
