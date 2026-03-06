/**
 * @hololand/renderer PerUserBlender
 *
 * Stage 2: Per-user alpha-blending with VRS foveation maps.
 * Implements front-to-back Gaussian compositing, foveation-weighted opacity,
 * depth sorting per tile, and screen-space coverage estimation.
 */

export interface BlendResult {
  userId: string;
  renderedCount: number;
  foveatedReduction: number;
  timeMs: number;
}

export interface DetailedBlendResult extends BlendResult {
  tileResults: TileBlendResult[];
  screenCoverage: number;
  gpuEstimateMs: number;
  totalOpacity: number;
  earlyTerminations: number;
}

export interface TileBlendResult {
  tileX: number;
  tileY: number;
  primitiveCount: number;
  renderedCount: number;
  tileOpacity: number;
  isFoveal: boolean;
}

export interface GaussianSplat {
  id: string;
  screenX: number;
  screenY: number;
  depth: number;
  opacity: number;
  radiusPixels: number;
  color: { r: number; g: number; b: number };
}

export interface BlenderConfig {
  /** Foveation strength 0-1 (higher = more aggressive peripheral reduction) */
  foveationStrength: number;
  /** Foveal region radius as fraction of screen (0.05 = 5% of screen) */
  fovealRadius: number;
  /** Parafoveal region radius as fraction of screen */
  parafovealRadius: number;
  /** Foveal tile size in pixels */
  fovealTileSize: number;
  /** Peripheral tile size in pixels */
  peripheralTileSize: number;
  /** Early termination opacity threshold (stop blending when accumulated alpha exceeds this) */
  earlyTerminationAlpha: number;
  /** Screen width in pixels */
  screenWidth: number;
  /** Screen height in pixels */
  screenHeight: number;
}

const DEFAULT_CONFIG: BlenderConfig = {
  foveationStrength: 0.7,
  fovealRadius: 0.1,
  parafovealRadius: 0.25,
  fovealTileSize: 16,
  peripheralTileSize: 32,
  earlyTerminationAlpha: 0.995,
  screenWidth: 2048,
  screenHeight: 2048,
};

export class PerUserBlender {
  private config: BlenderConfig;

  constructor(config?: Partial<BlenderConfig>) {
    // Support legacy single-number constructor for foveationStrength
    if (typeof config === 'number') {
      this.config = { ...DEFAULT_CONFIG, foveationStrength: config };
    } else {
      this.config = { ...DEFAULT_CONFIG, ...config };
    }
  }

  // ── Original API (preserved) ─────────────────────────────────────

  blend(
    userId: string,
    primitiveCount: number,
    gazeX: number,
    gazeY: number,
  ): BlendResult {
    const start = performance.now();
    const fovealFraction = 0.1;
    const peripheralFraction = 1 - fovealFraction;
    const peripheralReduction = peripheralFraction * this.config.foveationStrength;
    const effectiveCount = Math.ceil(primitiveCount * (1 - peripheralReduction));

    return {
      userId,
      renderedCount: effectiveCount,
      foveatedReduction: peripheralReduction,
      timeMs: performance.now() - start,
    };
  }

  // ── Full Gaussian compositing pipeline ───────────────────────────

  /**
   * Perform full front-to-back Gaussian alpha compositing with foveation.
   *
   * @param userId User identifier
   * @param splats Pre-sorted Gaussian splats (front-to-back by depth)
   * @param gazeX Gaze X position in screen pixels
   * @param gazeY Gaze Y position in screen pixels
   */
  blendGaussian(
    userId: string,
    splats: GaussianSplat[],
    gazeX: number,
    gazeY: number,
  ): DetailedBlendResult {
    const start = performance.now();

    // Assign splats to tiles and determine foveation level per tile
    const tiles = this.buildTileGrid(gazeX, gazeY);
    const tileResults: TileBlendResult[] = [];
    let totalRendered = 0;
    let earlyTerminations = 0;
    let totalAccumulatedOpacity = 0;

    // Sort splats into tile buckets
    const tileBuckets = new Map<string, GaussianSplat[]>();
    for (const splat of splats) {
      const tileKey = this.getTileKey(splat.screenX, splat.screenY, gazeX, gazeY);
      if (!tileBuckets.has(tileKey)) {
        tileBuckets.set(tileKey, []);
      }
      tileBuckets.get(tileKey)!.push(splat);
    }

    for (const tile of tiles) {
      const key = `${tile.tileX},${tile.tileY}`;
      const tileSplats = tileBuckets.get(key) ?? [];

      // Depth sort within tile (front-to-back)
      tileSplats.sort((a, b) => a.depth - b.depth);

      // Foveation-weighted opacity reduction for non-foveal tiles
      const opacityScale = tile.isFoveal ? 1.0 : (1.0 - this.config.foveationStrength * 0.5);

      let tileAccumulatedAlpha = 0;
      let rendered = 0;

      for (const splat of tileSplats) {
        // Early termination: stop if tile is fully opaque
        if (tileAccumulatedAlpha >= this.config.earlyTerminationAlpha) {
          earlyTerminations++;
          break;
        }

        // Front-to-back alpha compositing: new_alpha = old_alpha + (1 - old_alpha) * src_alpha
        const effectiveOpacity = splat.opacity * opacityScale;
        tileAccumulatedAlpha = tileAccumulatedAlpha + (1 - tileAccumulatedAlpha) * effectiveOpacity;
        rendered++;
      }

      totalRendered += rendered;
      totalAccumulatedOpacity += tileAccumulatedAlpha;

      tileResults.push({
        tileX: tile.tileX,
        tileY: tile.tileY,
        primitiveCount: tileSplats.length,
        renderedCount: rendered,
        tileOpacity: tileAccumulatedAlpha,
        isFoveal: tile.isFoveal,
      });
    }

    // Screen coverage estimation
    const coveredTiles = tileResults.filter((t) => t.tileOpacity > 0.01).length;
    const screenCoverage = tiles.length > 0 ? coveredTiles / tiles.length : 0;

    // GPU time estimation (rough: 0.001ms per splat rendered)
    const gpuEstimateMs = totalRendered * 0.001;

    const foveatedReduction = splats.length > 0
      ? 1 - totalRendered / splats.length
      : 0;

    return {
      userId,
      renderedCount: totalRendered,
      foveatedReduction,
      timeMs: performance.now() - start,
      tileResults,
      screenCoverage,
      gpuEstimateMs,
      totalOpacity: tiles.length > 0 ? totalAccumulatedOpacity / tiles.length : 0,
      earlyTerminations,
    };
  }

  // ── Tile grid construction ───────────────────────────────────────

  private buildTileGrid(
    gazeX: number,
    gazeY: number,
  ): Array<{ tileX: number; tileY: number; isFoveal: boolean }> {
    const tiles: Array<{ tileX: number; tileY: number; isFoveal: boolean }> = [];
    const fovealPixelRadius = this.config.fovealRadius * this.config.screenWidth;

    // Build foveal region tiles (smaller tiles for higher detail)
    const fovealStartX = Math.max(0, gazeX - fovealPixelRadius);
    const fovealStartY = Math.max(0, gazeY - fovealPixelRadius);
    const fovealEndX = Math.min(this.config.screenWidth, gazeX + fovealPixelRadius);
    const fovealEndY = Math.min(this.config.screenHeight, gazeY + fovealPixelRadius);

    for (let ty = fovealStartY; ty < fovealEndY; ty += this.config.fovealTileSize) {
      for (let tx = fovealStartX; tx < fovealEndX; tx += this.config.fovealTileSize) {
        tiles.push({ tileX: Math.floor(tx / this.config.fovealTileSize), tileY: Math.floor(ty / this.config.fovealTileSize), isFoveal: true });
      }
    }

    // Build peripheral region tiles (larger tiles)
    for (let ty = 0; ty < this.config.screenHeight; ty += this.config.peripheralTileSize) {
      for (let tx = 0; tx < this.config.screenWidth; tx += this.config.peripheralTileSize) {
        // Skip if within foveal region
        const centerX = tx + this.config.peripheralTileSize / 2;
        const centerY = ty + this.config.peripheralTileSize / 2;
        const distToGaze = Math.sqrt((centerX - gazeX) ** 2 + (centerY - gazeY) ** 2);
        if (distToGaze < fovealPixelRadius) continue;

        tiles.push({
          tileX: Math.floor(tx / this.config.peripheralTileSize),
          tileY: Math.floor(ty / this.config.peripheralTileSize),
          isFoveal: false,
        });
      }
    }

    return tiles;
  }

  private getTileKey(
    screenX: number,
    screenY: number,
    gazeX: number,
    gazeY: number,
  ): string {
    const fovealPixelRadius = this.config.fovealRadius * this.config.screenWidth;
    const distToGaze = Math.sqrt((screenX - gazeX) ** 2 + (screenY - gazeY) ** 2);

    if (distToGaze < fovealPixelRadius) {
      const tx = Math.floor(screenX / this.config.fovealTileSize);
      const ty = Math.floor(screenY / this.config.fovealTileSize);
      return `${tx},${ty}`;
    }

    const tx = Math.floor(screenX / this.config.peripheralTileSize);
    const ty = Math.floor(screenY / this.config.peripheralTileSize);
    return `${tx},${ty}`;
  }

  // ── Utility ──────────────────────────────────────────────────────

  getConfig(): BlenderConfig {
    return { ...this.config };
  }

  setFoveationStrength(strength: number): void {
    this.config.foveationStrength = Math.max(0, Math.min(1, strength));
  }
}
