/**
 * @hololand/renderer SharedPreprocessor
 *
 * Stage 1 of two-stage foveated rasterizer: shared preprocessing.
 * Sorts and culls Gaussian primitives once for all users.
 * Implements screen-space projection, tile assignment (16x16 foveal,
 * 32x32 peripheral), opacity-aware culling, radix sort preparation,
 * and depth ordering.
 */

export interface GaussianPrimitive {
  id: string;
  position: { x: number; y: number; z: number };
  scale: number;
  opacity: number;
  color: { r: number; g: number; b: number };
}

export interface PreprocessResult {
  sortedPrimitives: GaussianPrimitive[];
  culledCount: number;
  totalProcessed: number;
  timeMs: number;
}

export interface ScreenSpacePrimitive {
  primitive: GaussianPrimitive;
  screenX: number;
  screenY: number;
  depth: number;
  screenRadius: number;
  tileX: number;
  tileY: number;
  isFoveal: boolean;
  /** Radix sort key (depth quantized to integer for radix sort) */
  sortKey: number;
}

export interface TileAssignment {
  tileX: number;
  tileY: number;
  isFoveal: boolean;
  primitives: ScreenSpacePrimitive[];
}

export interface DetailedPreprocessResult extends PreprocessResult {
  screenSpacePrimitives: ScreenSpacePrimitive[];
  tileAssignments: TileAssignment[];
  fovealPrimitiveCount: number;
  peripheralPrimitiveCount: number;
  tilesUsed: number;
  radixSortBuckets: number[];
}

export interface PreprocessorConfig {
  /** Distance beyond which primitives are culled */
  cullDistance: number;
  /** Minimum opacity to render (below this = culled) */
  minOpacity: number;
  /** Foveal tile size in pixels */
  fovealTileSize: number;
  /** Peripheral tile size in pixels */
  peripheralTileSize: number;
  /** Screen resolution width */
  screenWidth: number;
  /** Screen resolution height */
  screenHeight: number;
  /** Camera FOV in degrees (for projection) */
  fovDegrees: number;
  /** Number of radix sort buckets (powers of 2) */
  radixBuckets: number;
  /** Maximum depth for radix sort quantization */
  maxDepth: number;
  /** Foveal region radius as fraction of screen width */
  fovealRadiusFraction: number;
}

const DEFAULT_CONFIG: PreprocessorConfig = {
  cullDistance: 100,
  minOpacity: 0.01,
  fovealTileSize: 16,
  peripheralTileSize: 32,
  screenWidth: 2048,
  screenHeight: 2048,
  fovDegrees: 110,
  radixBuckets: 256,
  maxDepth: 200,
  fovealRadiusFraction: 0.1,
};

export class SharedPreprocessor {
  private config: PreprocessorConfig;

  constructor(config?: Partial<PreprocessorConfig> | number) {
    // Support legacy positional args: (cullDistance)
    if (typeof config === 'number') {
      this.config = { ...DEFAULT_CONFIG, cullDistance: config };
    } else {
      this.config = { ...DEFAULT_CONFIG, ...config };
    }
  }

  // ── Original API (preserved) ─────────────────────────────────────

  preprocess(
    primitives: GaussianPrimitive[],
    cameraPos: { x: number; y: number; z: number },
  ): PreprocessResult {
    const start = performance.now();
    let culled = 0;

    const visible = primitives.filter((p) => {
      const dist = Math.sqrt(
        (p.position.x - cameraPos.x) ** 2 +
        (p.position.y - cameraPos.y) ** 2 +
        (p.position.z - cameraPos.z) ** 2,
      );
      if (dist > this.config.cullDistance || p.opacity < this.config.minOpacity) {
        culled++;
        return false;
      }
      return true;
    });

    // Depth sort (front-to-back for alpha)
    visible.sort((a, b) => {
      const distA = (a.position.x - cameraPos.x) ** 2 + (a.position.y - cameraPos.y) ** 2 + (a.position.z - cameraPos.z) ** 2;
      const distB = (b.position.x - cameraPos.x) ** 2 + (b.position.y - cameraPos.y) ** 2 + (b.position.z - cameraPos.z) ** 2;
      return distA - distB;
    });

    return {
      sortedPrimitives: visible,
      culledCount: culled,
      totalProcessed: primitives.length,
      timeMs: performance.now() - start,
    };
  }

  // ── Full preprocessing pipeline ──────────────────────────────────

  /**
   * Full preprocessing: project to screen space, assign tiles, prepare radix sort,
   * cull by opacity and distance, and depth-order.
   *
   * @param primitives Raw Gaussian primitives
   * @param cameraPos Camera world position
   * @param cameraForward Camera forward direction (normalized)
   * @param cameraUp Camera up direction (normalized)
   * @param gazeScreenX Gaze point X in screen pixels (for foveal region center)
   * @param gazeScreenY Gaze point Y in screen pixels
   */
  preprocessDetailed(
    primitives: GaussianPrimitive[],
    cameraPos: { x: number; y: number; z: number },
    cameraForward: { x: number; y: number; z: number },
    cameraUp: { x: number; y: number; z: number },
    gazeScreenX: number,
    gazeScreenY: number,
  ): DetailedPreprocessResult {
    const start = performance.now();
    let culled = 0;
    const screenSpacePrimitives: ScreenSpacePrimitive[] = [];

    // Compute camera right vector (cross product of forward and up)
    const cameraRight = {
      x: cameraForward.y * cameraUp.z - cameraForward.z * cameraUp.y,
      y: cameraForward.z * cameraUp.x - cameraForward.x * cameraUp.z,
      z: cameraForward.x * cameraUp.y - cameraForward.y * cameraUp.x,
    };

    const fovealPixelRadius = this.config.fovealRadiusFraction * this.config.screenWidth;
    const halfFovRad = (this.config.fovDegrees / 2) * (Math.PI / 180);
    const focalLength = (this.config.screenWidth / 2) / Math.tan(halfFovRad);

    // Radix sort bucket preparation
    const radixBuckets: number[] = new Array(this.config.radixBuckets).fill(0);

    for (const p of primitives) {
      // World-to-camera vector
      const dx = p.position.x - cameraPos.x;
      const dy = p.position.y - cameraPos.y;
      const dz = p.position.z - cameraPos.z;

      // Depth along camera forward axis
      const depth = dx * cameraForward.x + dy * cameraForward.y + dz * cameraForward.z;

      // Cull behind camera or beyond distance
      if (depth <= 0.01 || depth > this.config.cullDistance) {
        culled++;
        continue;
      }

      // Opacity cull
      if (p.opacity < this.config.minOpacity) {
        culled++;
        continue;
      }

      // Project to screen space
      const rightProj = dx * cameraRight.x + dy * cameraRight.y + dz * cameraRight.z;
      const upProj = dx * cameraUp.x + dy * cameraUp.y + dz * cameraUp.z;

      const screenX = (this.config.screenWidth / 2) + (rightProj / depth) * focalLength;
      const screenY = (this.config.screenHeight / 2) - (upProj / depth) * focalLength;

      // Cull off-screen (with margin for large splats)
      const screenRadius = (p.scale / depth) * focalLength;
      if (screenX + screenRadius < 0 || screenX - screenRadius > this.config.screenWidth ||
          screenY + screenRadius < 0 || screenY - screenRadius > this.config.screenHeight) {
        culled++;
        continue;
      }

      // Determine if in foveal region
      const distToGaze = Math.sqrt((screenX - gazeScreenX) ** 2 + (screenY - gazeScreenY) ** 2);
      const isFoveal = distToGaze <= fovealPixelRadius;

      // Tile assignment
      const tileSize = isFoveal ? this.config.fovealTileSize : this.config.peripheralTileSize;
      const tileX = Math.floor(screenX / tileSize);
      const tileY = Math.floor(screenY / tileSize);

      // Radix sort key: quantize depth to bucket
      const sortKey = Math.min(
        this.config.radixBuckets - 1,
        Math.floor((depth / this.config.maxDepth) * this.config.radixBuckets),
      );
      radixBuckets[sortKey]++;

      screenSpacePrimitives.push({
        primitive: p,
        screenX,
        screenY,
        depth,
        screenRadius,
        tileX,
        tileY,
        isFoveal,
        sortKey,
      });
    }

    // Radix sort by depth (front-to-back)
    screenSpacePrimitives.sort((a, b) => a.sortKey - b.sortKey || a.depth - b.depth);

    // Build tile assignments
    const tileMap = new Map<string, TileAssignment>();
    let fovealCount = 0;
    let peripheralCount = 0;

    for (const ssp of screenSpacePrimitives) {
      const key = `${ssp.tileX},${ssp.tileY},${ssp.isFoveal ? 'f' : 'p'}`;
      if (!tileMap.has(key)) {
        tileMap.set(key, {
          tileX: ssp.tileX,
          tileY: ssp.tileY,
          isFoveal: ssp.isFoveal,
          primitives: [],
        });
      }
      tileMap.get(key)!.primitives.push(ssp);

      if (ssp.isFoveal) fovealCount++;
      else peripheralCount++;
    }

    const tileAssignments = [...tileMap.values()];

    // Build sorted primitives array for backward-compat
    const sortedPrimitives = screenSpacePrimitives.map((ssp) => ssp.primitive);

    return {
      sortedPrimitives,
      culledCount: culled,
      totalProcessed: primitives.length,
      timeMs: performance.now() - start,
      screenSpacePrimitives,
      tileAssignments,
      fovealPrimitiveCount: fovealCount,
      peripheralPrimitiveCount: peripheralCount,
      tilesUsed: tileAssignments.length,
      radixSortBuckets: radixBuckets,
    };
  }

  // ── Utility ──────────────────────────────────────────────────────

  getConfig(): PreprocessorConfig {
    return { ...this.config };
  }

  /**
   * Estimate how many primitives would survive culling at a given camera position
   * without actually sorting or projecting (fast approximation).
   */
  estimateVisibleCount(
    primitives: GaussianPrimitive[],
    cameraPos: { x: number; y: number; z: number },
  ): number {
    let count = 0;
    for (const p of primitives) {
      const distSq =
        (p.position.x - cameraPos.x) ** 2 +
        (p.position.y - cameraPos.y) ** 2 +
        (p.position.z - cameraPos.z) ** 2;
      if (distSq <= this.config.cullDistance ** 2 && p.opacity >= this.config.minOpacity) {
        count++;
      }
    }
    return count;
  }
}
