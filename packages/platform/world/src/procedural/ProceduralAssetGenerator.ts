/**
 * Procedural Asset Generator with Semantic Caching
 *
 * Generates common procedural assets (grass, trees, rocks) with intelligent caching.
 *
 * Performance Impact:
 * - Cache Hit: ~5ms (Redis lookup)
 * - Cache Miss + Generation: ~150-800ms depending on asset type
 * - Target Hit Rate: 50-80% for common patterns
 * - Time Saved: 145-795ms per hit
 */

import { logger } from '../logger';

export interface ProceduralAssetParams {
  type: 'grass' | 'tree' | 'rock' | 'terrain' | 'texture' | 'custom';
  seed: number;
  resolution: 'low' | 'medium' | 'high';
  noiseFunction?: string;
  params?: Record<string, unknown>;
}

export interface CachedAsset {
  data: unknown;
  hitCount: number;
  metadata: {
    type: string;
    seed: number;
    resolution: string;
    sizeBytes: number;
  };
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  entries?: number;
  [key: string]: unknown;
}

export interface AssetGenerationOptions {
  /** Force regeneration (skip cache) */
  forceRegenerate?: boolean;

  /** Cache TTL override (seconds) */
  cacheTTL?: number;

  /** Enable detailed logging */
  verbose?: boolean;
}

export interface GeneratedAsset {
  /** Asset data */
  data: any;

  /** Whether asset was from cache */
  fromCache: boolean;

  /** Generation time (ms) */
  generationTimeMs: number;

  /** Asset metadata */
  metadata: {
    type: string;
    seed: number;
    resolution: string;
    sizeBytes: number;
  };
}

/**
 * Procedural Asset Generator with Caching
 *
 * Wraps asset generation functions with semantic caching layer.
 */
export class ProceduralAssetGenerator {
  private cacheEnabled: boolean;
  private cacheBackendUrl: string;

  constructor(config?: { cacheEnabled?: boolean; cacheBackendUrl?: string }) {
    this.cacheEnabled = config?.cacheEnabled ?? true;
    this.cacheBackendUrl = config?.cacheBackendUrl || 'http://localhost:3001';
  }

  /**
   * Generate or retrieve cached asset
   */
  async generate(
    params: ProceduralAssetParams,
    options: AssetGenerationOptions = {}
  ): Promise<GeneratedAsset> {
    const startTime = Date.now();

    // Skip cache if disabled or force regeneration
    if (!this.cacheEnabled || options.forceRegenerate) {
      const data = await this.generateAsset(params);
      const generationTimeMs = Date.now() - startTime;

      if (options.verbose) {
        logger.info('[ProceduralAssetGenerator] Generated (cache skipped)', {
          type: params.type,
          seed: params.seed,
          timeMs: generationTimeMs,
        });
      }

      return {
        data,
        fromCache: false,
        generationTimeMs,
        metadata: {
          type: params.type,
          seed: params.seed,
          resolution: params.resolution,
          sizeBytes: this.estimateSize(data),
        },
      };
    }

    // Check cache first
    try {
      const cached = await this.getFromCache(params);

      if (cached) {
        const generationTimeMs = Date.now() - startTime;

        if (options.verbose) {
          logger.info('[ProceduralAssetGenerator] Cache HIT', {
            type: params.type,
            seed: params.seed,
            hitCount: cached.hitCount,
            timeMs: generationTimeMs,
          });
        }

        return {
          data: cached.data,
          fromCache: true,
          generationTimeMs,
          metadata: cached.metadata,
        };
      }

      // Cache miss - generate and store
      const data = await this.generateAsset(params);
      const generationTimeMs = Date.now() - startTime;

      const metadata = {
        type: params.type,
        seed: params.seed,
        resolution: params.resolution,
        sizeBytes: this.estimateSize(data),
      };

      // Store in cache (async, don't wait)
      this.storeInCache(params, data, metadata, options.cacheTTL).catch((err) => {
        logger.error('[ProceduralAssetGenerator] Cache store failed', {
          error: err.message,
          type: params.type,
        });
      });

      if (options.verbose) {
        logger.info('[ProceduralAssetGenerator] Cache MISS - generated and cached', {
          type: params.type,
          seed: params.seed,
          timeMs: generationTimeMs,
        });
      }

      return {
        data,
        fromCache: false,
        generationTimeMs,
        metadata,
      };
    } catch (error: any) {
      logger.error('[ProceduralAssetGenerator] Cache error - falling back to generation', {
        error: error.message,
        type: params.type,
      });

      // Fallback to direct generation
      const data = await this.generateAsset(params);
      const generationTimeMs = Date.now() - startTime;

      return {
        data,
        fromCache: false,
        generationTimeMs,
        metadata: {
          type: params.type,
          seed: params.seed,
          resolution: params.resolution,
          sizeBytes: this.estimateSize(data),
        },
      };
    }
  }

  /**
   * Generate multiple assets in parallel with caching
   */
  async generateBatch(
    assetParams: ProceduralAssetParams[],
    options: AssetGenerationOptions = {}
  ): Promise<GeneratedAsset[]> {
    const startTime = Date.now();

    const results = await Promise.all(assetParams.map((params) => this.generate(params, options)));

    const totalTime = Date.now() - startTime;
    const cacheHits = results.filter((r) => r.fromCache).length;
    const cacheMisses = results.length - cacheHits;

    logger.info('[ProceduralAssetGenerator] Batch generation complete', {
      total: results.length,
      hits: cacheHits,
      misses: cacheMisses,
      hitRate: `${((cacheHits / results.length) * 100).toFixed(1)}%`,
      totalTimeMs: totalTime,
    });

    return results;
  }

  /**
   * Get cache metrics
   */
  async getMetrics(): Promise<CacheMetrics | null> {
    if (!this.cacheEnabled) {
      return null;
    }

    try {
      const response = await fetch(`${this.cacheBackendUrl}/api/procedural/cache/metrics`);

      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      logger.error('[ProceduralAssetGenerator] Failed to get metrics', {
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Clear cache for specific asset type
   */
  async clearCache(type?: ProceduralAssetParams['type']): Promise<number> {
    if (!this.cacheEnabled) {
      return 0;
    }

    try {
      const url = type
        ? `${this.cacheBackendUrl}/api/procedural/cache/clear?type=${type}`
        : `${this.cacheBackendUrl}/api/procedural/cache/clear`;

      const response = await fetch(url, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error(`Failed to clear cache: ${response.statusText}`);
      }

      const result = await response.json();
      return result.deletedCount || 0;
    } catch (error: any) {
      logger.error('[ProceduralAssetGenerator] Failed to clear cache', {
        error: error.message,
      });
      return 0;
    }
  }

  /**
   * Generate asset (actual generation logic)
   *
   * This is where the expensive procedural generation happens.
   * Override this method with actual generation algorithms.
   */
  private async generateAsset(params: ProceduralAssetParams): Promise<any> {
    // Simulate generation time based on asset type and resolution
    const baseTime = this.getGenerationTime(params.type);
    const resolutionMultiplier =
      params.resolution === 'high' ? 2.0 : params.resolution === 'medium' ? 1.5 : 1.0;

    const generationTime = baseTime * resolutionMultiplier;

    // Simulate async generation
    await this.sleep(generationTime);

    // Generate asset based on type
    switch (params.type) {
      case 'grass':
        return this.generateGrass(params);
      case 'tree':
        return this.generateTree(params);
      case 'rock':
        return this.generateRock(params);
      case 'terrain':
        return this.generateTerrain(params);
      case 'texture':
        return this.generateTexture(params);
      default:
        return this.generateCustom(params);
    }
  }

  /**
   * Generate grass asset
   */
  private generateGrass(params: ProceduralAssetParams): any {
    const random = this.seededRandom(params.seed);

    return {
      type: 'grass',
      vertices: this.generateGrassVertices(random, params.resolution),
      normals: [],
      uvs: [],
      indices: [],
      material: {
        color: `#${Math.floor(random() * 0x2a5a3c).toString(16)}`,
        shader: 'grass',
      },
    };
  }

  /**
   * Generate tree asset
   */
  private generateTree(params: ProceduralAssetParams): any {
    const random = this.seededRandom(params.seed);

    return {
      type: 'tree',
      trunk: {
        height: 3 + random() * 2,
        radius: 0.2 + random() * 0.1,
      },
      foliage: {
        type: 'sphere',
        radius: 1.5 + random() * 0.5,
        segments: params.resolution === 'high' ? 16 : 8,
      },
      material: {
        trunk: '#4a2816',
        foliage: '#2d5a2f',
      },
    };
  }

  /**
   * Generate rock asset
   */
  private generateRock(params: ProceduralAssetParams): any {
    const random = this.seededRandom(params.seed);

    return {
      type: 'rock',
      vertices: this.generateRockVertices(random, params.resolution),
      scale: {
        x: 0.5 + random() * 0.5,
        y: 0.3 + random() * 0.4,
        z: 0.5 + random() * 0.5,
      },
      material: {
        color: '#6a6a6a',
        roughness: 0.9,
        metalness: 0.1,
      },
    };
  }

  /**
   * Generate terrain heightmap
   */
  private generateTerrain(params: ProceduralAssetParams): any {
    const random = this.seededRandom(params.seed);
    const size = params.resolution === 'high' ? 256 : params.resolution === 'medium' ? 128 : 64;

    return {
      type: 'terrain',
      heightmap: this.generateHeightmap(random, size, params.noiseFunction || 'perlin'),
      size: [size, size],
      material: {
        texture: 'terrain_diffuse',
        normalMap: 'terrain_normal',
      },
    };
  }

  /**
   * Generate texture
   */
  private generateTexture(params: ProceduralAssetParams): any {
    const random = this.seededRandom(params.seed);
    const size = params.resolution === 'high' ? 1024 : params.resolution === 'medium' ? 512 : 256;

    return {
      type: 'texture',
      width: size,
      height: size,
      data: this.generateTextureData(random, size),
      format: 'rgba',
    };
  }

  /**
   * Generate custom asset
   */
  private generateCustom(params: ProceduralAssetParams): any {
    return {
      type: 'custom',
      seed: params.seed,
      params: params.params,
    };
  }

  /**
   * Helper: Generate grass vertices
   */
  private generateGrassVertices(random: () => number, resolution: string): number[] {
    const count = resolution === 'high' ? 100 : resolution === 'medium' ? 50 : 20;
    const vertices: number[] = [];

    for (let i = 0; i < count; i++) {
      vertices.push(random() - 0.5, random() * 0.5, random() - 0.5);
    }

    return vertices;
  }

  /**
   * Helper: Generate rock vertices
   */
  private generateRockVertices(random: () => number, resolution: string): number[] {
    const count = resolution === 'high' ? 64 : resolution === 'medium' ? 32 : 16;
    const vertices: number[] = [];

    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2;
      const r = 0.5 + random() * 0.3;
      vertices.push(Math.cos(theta) * r, random() * 0.5, Math.sin(theta) * r);
    }

    return vertices;
  }

  /**
   * Helper: Generate heightmap
   */
  private generateHeightmap(random: () => number, size: number, noiseType: string): number[] {
    void noiseType;
    const heightmap: number[] = [];

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Simple noise approximation
        const value = this.noise2D(x / size, y / size, random);
        heightmap.push(value);
      }
    }

    return heightmap;
  }

  /**
   * Helper: Generate texture data
   */
  private generateTextureData(random: () => number, size: number): Uint8Array {
    const data = new Uint8Array(size * size * 4);

    for (let i = 0; i < size * size; i++) {
      const offset = i * 4;
      data[offset + 0] = random() * 255; // R
      data[offset + 1] = random() * 255; // G
      data[offset + 2] = random() * 255; // B
      data[offset + 3] = 255; // A
    }

    return data;
  }

  /**
   * Helper: Simple 2D noise
   */
  private noise2D(x: number, y: number, random: () => number): number {
    return Math.sin(x * 10 + random()) * Math.cos(y * 10 + random()) * 0.5 + 0.5;
  }

  /**
   * Get from cache via backend API
   */
  private async getFromCache(params: ProceduralAssetParams): Promise<CachedAsset | null> {
    try {
      const response = await fetch(`${this.cacheBackendUrl}/api/procedural/cache/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      return result.asset || null;
    } catch (error: any) {
      logger.error('[ProceduralAssetGenerator] Cache fetch error', { error: error.message });
      return null;
    }
  }

  /**
   * Store in cache via backend API
   */
  private async storeInCache(
    params: ProceduralAssetParams,
    data: any,
    metadata: any,
    ttl?: number
  ): Promise<void> {
    try {
      await fetch(`${this.cacheBackendUrl}/api/procedural/cache/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params, data, metadata, ttl }),
      });
    } catch (error: any) {
      logger.error('[ProceduralAssetGenerator] Cache store error', { error: error.message });
    }
  }

  /**
   * Get base generation time for asset type (ms)
   */
  private getGenerationTime(type: ProceduralAssetParams['type']): number {
    const times = {
      grass: 150,
      tree: 400,
      rock: 200,
      terrain: 800,
      texture: 300,
      custom: 250,
    };

    return times[type] || 250;
  }

  /**
   * Seeded random number generator
   */
  private seededRandom(seed: number): () => number {
    let state = seed;

    return () => {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
  }

  /**
   * Estimate data size in bytes
   */
  private estimateSize(data: any): number {
    try {
      return Buffer.byteLength(JSON.stringify(data));
    } catch {
      return 0;
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const proceduralAssetGenerator = new ProceduralAssetGenerator();
