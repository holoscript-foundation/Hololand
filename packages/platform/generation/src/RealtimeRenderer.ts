/**
 * @hololand/generation RealtimeRenderer
 *
 * Tier 3: Prepares generated terrain for realtime VR rendering.
 * Manages render state, LOD switching based on distance, frustum culling,
 * frame budget tracking (11.1ms at 90Hz), and GPU memory estimation.
 */

export interface TerrainChunk {
  x: number;
  y: number;
  heightData: number[];
  lodLevel: number;
  vertexCount: number;
  isVisible: boolean;
  distanceToCamera: number;
  gpuMemoryKB: number;
}

export interface RenderStats {
  totalChunks: number;
  visibleChunks: number;
  culledChunks: number;
  totalVertices: number;
  estimatedGpuMemoryMB: number;
  frameTimeMs: number;
  withinBudget: boolean;
  lodDistribution: Record<number, number>;
}

export interface FrustumPlane {
  normal: { x: number; y: number; z: number };
  distance: number;
}

export interface LODConfig {
  /** Distance thresholds for each LOD level (meters). Index 0 = closest */
  distances: number[];
  /** Vertex scale factors for each LOD level. Index 0 = full res (1.0) */
  vertexScales: number[];
}

const DEFAULT_LOD_CONFIG: LODConfig = {
  distances: [25, 75, 150, 300],
  vertexScales: [1.0, 0.5, 0.25, 0.1],
};

export class RealtimeRenderer {
  private prepared: boolean = false;
  private chunks: TerrainChunk[] = [];
  private lodConfig: LODConfig;
  private frameBudgetMs: number;
  private targetFps: number;
  private lastFrameTimeMs: number = 0;
  private frameHistory: number[] = [];
  private maxFrameHistory: number = 120; // ~1.3 seconds at 90Hz
  private totalGpuMemoryMB: number = 0;
  private gpuMemoryBudgetMB: number;

  constructor(config?: {
    lodConfig?: LODConfig;
    targetFps?: number;
    gpuMemoryBudgetMB?: number;
  }) {
    this.lodConfig = config?.lodConfig ?? { ...DEFAULT_LOD_CONFIG };
    this.targetFps = config?.targetFps ?? 90;
    this.frameBudgetMs = 1000 / this.targetFps; // 11.1ms at 90Hz
    this.gpuMemoryBudgetMB = config?.gpuMemoryBudgetMB ?? 3000;
  }

  // ── Terrain preparation ──────────────────────────────────────────

  /**
   * Prepare terrain heightmap data into renderable chunks.
   * @param terrain 2D heightmap array (row-major)
   * @param chunkSize Number of cells per chunk side (default 16)
   */
  prepare(terrain: number[][], chunkSize: number = 16): boolean {
    if (terrain.length === 0 || terrain[0].length === 0) return false;

    this.chunks = [];
    const rows = terrain.length;
    const cols = terrain[0].length;

    for (let cy = 0; cy < rows; cy += chunkSize) {
      for (let cx = 0; cx < cols; cx += chunkSize) {
        const heightData: number[] = [];
        const endY = Math.min(cy + chunkSize, rows);
        const endX = Math.min(cx + chunkSize, cols);

        for (let y = cy; y < endY; y++) {
          for (let x = cx; x < endX; x++) {
            heightData.push(terrain[y][x]);
          }
        }

        const w = endX - cx;
        const h = endY - cy;
        const fullVertexCount = w * h * 6; // 2 triangles per quad, 3 verts each
        const gpuMemoryKB = (fullVertexCount * 32) / 1024; // 32 bytes per vertex (pos+normal+uv)

        this.chunks.push({
          x: cx + w / 2,
          y: cy + h / 2,
          heightData,
          lodLevel: 0,
          vertexCount: fullVertexCount,
          isVisible: true,
          distanceToCamera: 0,
          gpuMemoryKB,
        });
      }
    }

    this.prepared = true;
    this.recalculateGpuMemory();
    return true;
  }

  // ── LOD management ───────────────────────────────────────────────

  /**
   * Update LOD levels for all chunks based on camera position.
   * Returns the number of chunks whose LOD changed.
   */
  updateLOD(cameraX: number, cameraY: number): number {
    let lodChanges = 0;

    for (const chunk of this.chunks) {
      const dx = chunk.x - cameraX;
      const dy = chunk.y - cameraY;
      chunk.distanceToCamera = Math.sqrt(dx * dx + dy * dy);

      let newLod = this.lodConfig.distances.length; // worst LOD
      for (let i = 0; i < this.lodConfig.distances.length; i++) {
        if (chunk.distanceToCamera <= this.lodConfig.distances[i]) {
          newLod = i;
          break;
        }
      }

      if (newLod !== chunk.lodLevel) {
        const prevLod = chunk.lodLevel;
        chunk.lodLevel = newLod;
        // Scale vertex count by LOD factor
        const scale = this.lodConfig.vertexScales[Math.min(newLod, this.lodConfig.vertexScales.length - 1)] ?? 0.1;
        const fullVerts = (chunk.heightData.length) * 6;
        chunk.vertexCount = Math.ceil(fullVerts * scale);
        chunk.gpuMemoryKB = (chunk.vertexCount * 32) / 1024;
        if (prevLod !== newLod) lodChanges++;
      }
    }

    this.recalculateGpuMemory();
    return lodChanges;
  }

  // ── Frustum culling ──────────────────────────────────────────────

  /**
   * Cull chunks outside the view frustum defined by 4+ planes.
   * Each plane is defined by a normal and distance (half-space test).
   * Returns the number of chunks culled.
   */
  frustumCull(planes: FrustumPlane[], chunkRadius: number = 16): number {
    let culled = 0;

    for (const chunk of this.chunks) {
      let visible = true;
      for (const plane of planes) {
        // Point-plane distance test (2D simplified for top-down terrain)
        const dot = plane.normal.x * chunk.x + plane.normal.y * 0 + plane.normal.z * chunk.y;
        if (dot + plane.distance < -chunkRadius) {
          visible = false;
          break;
        }
      }

      if (!visible && chunk.isVisible) culled++;
      chunk.isVisible = visible;
    }

    return culled;
  }

  // ── Frame budget tracking ────────────────────────────────────────

  /**
   * Record a frame's render time and check against budget.
   * @returns true if within budget, false if over
   */
  recordFrameTime(frameTimeMs: number): boolean {
    this.lastFrameTimeMs = frameTimeMs;
    this.frameHistory.push(frameTimeMs);
    if (this.frameHistory.length > this.maxFrameHistory) {
      this.frameHistory.shift();
    }
    return frameTimeMs <= this.frameBudgetMs;
  }

  /**
   * Get average frame time over the recent history window.
   */
  getAverageFrameTime(): number {
    if (this.frameHistory.length === 0) return 0;
    const sum = this.frameHistory.reduce((a, b) => a + b, 0);
    return sum / this.frameHistory.length;
  }

  /**
   * Get the 95th percentile frame time (useful for jank detection).
   */
  getP95FrameTime(): number {
    if (this.frameHistory.length === 0) return 0;
    const sorted = [...this.frameHistory].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.95);
    return sorted[Math.min(idx, sorted.length - 1)];
  }

  /**
   * Calculate how much budget headroom remains (ms). Negative = over budget.
   */
  getBudgetHeadroom(): number {
    return this.frameBudgetMs - this.getAverageFrameTime();
  }

  // ── GPU memory estimation ────────────────────────────────────────

  private recalculateGpuMemory(): void {
    let totalKB = 0;
    for (const chunk of this.chunks) {
      if (chunk.isVisible) {
        totalKB += chunk.gpuMemoryKB;
      }
    }
    this.totalGpuMemoryMB = totalKB / 1024;
  }

  getEstimatedGpuMemoryMB(): number {
    return this.totalGpuMemoryMB;
  }

  isWithinGpuBudget(): boolean {
    return this.totalGpuMemoryMB <= this.gpuMemoryBudgetMB;
  }

  // ── Render stats ─────────────────────────────────────────────────

  /**
   * Get comprehensive render statistics.
   */
  getRenderStats(): RenderStats {
    const visible = this.chunks.filter((c) => c.isVisible);
    const culled = this.chunks.length - visible.length;

    const lodDistribution: Record<number, number> = {};
    let totalVertices = 0;
    for (const chunk of visible) {
      lodDistribution[chunk.lodLevel] = (lodDistribution[chunk.lodLevel] ?? 0) + 1;
      totalVertices += chunk.vertexCount;
    }

    this.recalculateGpuMemory();

    return {
      totalChunks: this.chunks.length,
      visibleChunks: visible.length,
      culledChunks: culled,
      totalVertices,
      estimatedGpuMemoryMB: this.totalGpuMemoryMB,
      frameTimeMs: this.getAverageFrameTime(),
      withinBudget: this.getAverageFrameTime() <= this.frameBudgetMs,
      lodDistribution,
    };
  }

  // ── Original API (preserved) ─────────────────────────────────────

  isPrepared(): boolean {
    return this.prepared;
  }

  reset(): void {
    this.prepared = false;
    this.chunks = [];
    this.frameHistory = [];
    this.lastFrameTimeMs = 0;
    this.totalGpuMemoryMB = 0;
  }

  getChunks(): TerrainChunk[] {
    return [...this.chunks];
  }

  getFrameBudgetMs(): number {
    return this.frameBudgetMs;
  }
}
