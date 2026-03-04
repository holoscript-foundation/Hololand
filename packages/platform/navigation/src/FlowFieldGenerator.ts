/**
 * FlowFieldGenerator - Efficient mass NPC movement using flow fields
 *
 * A flow field (aka vector field pathfinding) pre-computes a direction vector
 * for every cell in a grid pointing toward the goal. This allows hundreds of
 * agents to query their movement direction in O(1) per agent per frame, making
 * it ideal for 50-200+ agents at 90fps in VR environments.
 *
 * Algorithm:
 * 1. BFS from goal to build a cost field (distance to goal per cell)
 * 2. For each cell, compute the gradient toward the lowest-cost neighbor
 * 3. Normalize to produce a unit direction vector per cell
 *
 * @module FlowFieldGenerator
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** 2D vector used for positions and directions on the XZ plane. */
export interface Vec2 {
  x: number;
  y: number;
}

/** Configuration for creating a FlowFieldGenerator. */
export interface FlowFieldConfig {
  /** Grid width in cells. */
  width: number;
  /** Grid height in cells. */
  height: number;
  /** Size of each cell in world-space meters (default 1.0). */
  cellSize: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Cost value representing an impassable cell. */
const IMPASSABLE = 0xffff;

/** 8-directional neighbor offsets (dx, dy). */
const NEIGHBORS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [0, -1], [1, -1],
  [-1,  0],          [1,  0],
  [-1,  1], [0,  1], [1,  1],
];

/** Diagonal movement cost factor (sqrt(2) ~= 1.414). */
const DIAGONAL_COST = Math.SQRT2;

// ---------------------------------------------------------------------------
// FlowFieldGenerator
// ---------------------------------------------------------------------------

/**
 * Generates and queries a flow field for mass NPC navigation.
 *
 * Usage:
 * ```ts
 * const ff = new FlowFieldGenerator({ width: 100, height: 100, cellSize: 1.0 });
 * ff.setGoal({ x: 50, y: 50 });
 * const dir = ff.getDirection({ x: 10, y: 10 }); // normalized Vec2
 * ```
 */
export class FlowFieldGenerator {
  /** Grid dimensions in cells. */
  readonly width: number;
  readonly height: number;
  /** Cell size in world-space meters. */
  readonly cellSize: number;

  /**
   * Flat array of integration costs.  Index = y * width + x.
   * `IMPASSABLE` means the cell is blocked.
   */
  private integrationField: Uint16Array;

  /**
   * Flat array of direction vectors stored as interleaved [dx, dy] pairs.
   * Index = (y * width + x) * 2 for dx, +1 for dy.
   */
  private directionField: Float32Array;

  /** Set of obstacle cell indices for quick membership checks. */
  private obstacles: Set<number>;

  /** Current goal in cell coordinates, or null if none set. */
  private goalCell: { cx: number; cy: number } | null = null;

  /** Whether the field needs recomputation. */
  private dirty = true;

  constructor(config: FlowFieldConfig) {
    this.width = Math.max(1, Math.floor(config.width));
    this.height = Math.max(1, Math.floor(config.height));
    this.cellSize = config.cellSize > 0 ? config.cellSize : 1.0;

    const totalCells = this.width * this.height;
    this.integrationField = new Uint16Array(totalCells).fill(IMPASSABLE);
    this.directionField = new Float32Array(totalCells * 2);
    this.obstacles = new Set();
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Set the goal position (world space) and recompute the flow field.
   * Agents will flow toward this position.
   */
  setGoal(position: Vec2): void {
    const cx = Math.floor(position.x / this.cellSize);
    const cy = Math.floor(position.y / this.cellSize);
    this.goalCell = { cx, cy };
    this.dirty = true;
    this.compute();
  }

  /**
   * Get the normalized movement direction at a world-space position.
   * Returns `{ x: 0, y: 0 }` if the position is out of bounds, on an
   * obstacle, or the field has not been computed.
   */
  getDirection(position: Vec2): Vec2 {
    if (this.dirty) {
      this.compute();
    }

    const cx = Math.floor(position.x / this.cellSize);
    const cy = Math.floor(position.y / this.cellSize);

    if (!this.inBounds(cx, cy)) {
      return { x: 0, y: 0 };
    }

    const idx = (cy * this.width + cx) * 2;
    return { x: this.directionField[idx], y: this.directionField[idx + 1] };
  }

  /**
   * Mark a world-space position as an obstacle (impassable).
   * Call `compute()` after all obstacle changes to update the field.
   */
  addObstacle(position: Vec2): void {
    const cx = Math.floor(position.x / this.cellSize);
    const cy = Math.floor(position.y / this.cellSize);
    if (this.inBounds(cx, cy)) {
      this.obstacles.add(cy * this.width + cx);
      this.dirty = true;
    }
  }

  /**
   * Remove an obstacle at the given world-space position.
   * Call `compute()` after all obstacle changes to update the field.
   */
  removeObstacle(position: Vec2): void {
    const cx = Math.floor(position.x / this.cellSize);
    const cy = Math.floor(position.y / this.cellSize);
    if (this.inBounds(cx, cy)) {
      this.obstacles.delete(cy * this.width + cx);
      this.dirty = true;
    }
  }

  /**
   * Recompute the flow field.  Called automatically by `setGoal`, but you
   * should call it explicitly after adding/removing obstacles.
   */
  compute(): void {
    if (!this.goalCell) {
      return;
    }
    this.buildIntegrationField(this.goalCell.cx, this.goalCell.cy);
    this.buildDirectionField();
    this.dirty = false;
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  /** Check whether cell coordinates are inside the grid. */
  private inBounds(cx: number, cy: number): boolean {
    return cx >= 0 && cx < this.width && cy >= 0 && cy < this.height;
  }

  /**
   * BFS / Dijkstra from the goal cell to fill the integration (cost) field.
   * Each cell stores its distance (in cost units) from the goal.
   */
  private buildIntegrationField(goalCx: number, goalCy: number): void {
    const w = this.width;

    // Reset
    this.integrationField.fill(IMPASSABLE);

    // Clamp goal to grid
    const gx = Math.max(0, Math.min(goalCx, w - 1));
    const gy = Math.max(0, Math.min(goalCy, this.height - 1));
    const goalIdx = gy * w + gx;

    // If goal is on an obstacle, still allow it so agents can reach it
    this.integrationField[goalIdx] = 0;

    // BFS open list implemented as a simple queue (adequate for uniform cost)
    // For weighted grids a priority queue would be needed.
    const queue: number[] = [goalIdx];
    let head = 0;

    while (head < queue.length) {
      const currentIdx = queue[head++];
      const cx = currentIdx % w;
      const cy = (currentIdx - cx) / w;
      const currentCost = this.integrationField[currentIdx];

      for (const [dx, dy] of NEIGHBORS) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!this.inBounds(nx, ny)) continue;

        const neighborIdx = ny * w + nx;
        if (this.obstacles.has(neighborIdx)) continue;

        const isDiagonal = dx !== 0 && dy !== 0;
        const moveCost = isDiagonal ? DIAGONAL_COST : 1;
        const newCost = currentCost + Math.round(moveCost * 10); // x10 for int precision

        if (newCost < this.integrationField[neighborIdx]) {
          this.integrationField[neighborIdx] = newCost;
          queue.push(neighborIdx);
        }
      }
    }
  }

  /**
   * For each cell compute a direction vector pointing toward the neighbor
   * with the lowest integration cost, then normalize it.
   */
  private buildDirectionField(): void {
    const w = this.width;
    const h = this.height;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const cellIdx = y * w + x;
        const dirIdx = cellIdx * 2;

        // Obstacles or unreachable cells get zero direction
        if (
          this.integrationField[cellIdx] === IMPASSABLE ||
          this.obstacles.has(cellIdx)
        ) {
          this.directionField[dirIdx] = 0;
          this.directionField[dirIdx + 1] = 0;
          continue;
        }

        // Goal cell: no movement needed
        if (this.integrationField[cellIdx] === 0) {
          this.directionField[dirIdx] = 0;
          this.directionField[dirIdx + 1] = 0;
          continue;
        }

        let bestCost = this.integrationField[cellIdx];
        let bestDx = 0;
        let bestDy = 0;

        for (const [dx, dy] of NEIGHBORS) {
          const nx = x + dx;
          const ny = y + dy;
          if (!this.inBounds(nx, ny)) continue;

          const nIdx = ny * w + nx;
          const nCost = this.integrationField[nIdx];
          if (nCost < bestCost) {
            bestCost = nCost;
            bestDx = dx;
            bestDy = dy;
          }
        }

        // Normalize
        const len = Math.sqrt(bestDx * bestDx + bestDy * bestDy);
        if (len > 0) {
          this.directionField[dirIdx] = bestDx / len;
          this.directionField[dirIdx + 1] = bestDy / len;
        } else {
          this.directionField[dirIdx] = 0;
          this.directionField[dirIdx + 1] = 0;
        }
      }
    }
  }
}
