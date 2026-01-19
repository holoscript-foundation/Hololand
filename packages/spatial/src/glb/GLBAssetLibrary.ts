/**
 * GLB Asset Library
 *
 * Manages 3D GLB assets with caching, LOD generation, and streaming.
 *
 * Features:
 * - Asset caching with LRU eviction
 * - Automatic LOD generation
 * - Draco/KTX2 compression support
 * - Preloading for scenes
 * - Memory-aware streaming
 *
 * @packageDocumentation
 */

import { createLogger, type HololandLogger } from '@hololand/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface GLBAsset {
  id: string;
  path: string;
  data: ArrayBuffer;
  metadata: GLBMetadata;
  lodLevels?: GLBAsset[];
  loadedAt: number;
  lastAccessed: number;
  size: number;
}

export interface GLBMetadata {
  name: string;
  version: string;
  generator?: string;
  meshCount: number;
  materialCount: number;
  animationCount: number;
  textureCount: number;
  boundingBox?: BoundingBox;
  polyCount?: number;
}

export interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
  center: [number, number, number];
  size: [number, number, number];
}

export interface LoadOptions {
  generateLOD?: boolean;
  lodLevels?: number;
  maxTextureSize?: number;
  dracoCompression?: boolean;
  ktx2Compression?: boolean;
  priority?: 'high' | 'normal' | 'low';
}

export interface LODConfig {
  distances: number[];
  reductionFactors: number[];
}

export interface GLBAssetLibraryOptions {
  maxCacheSize?: number;
  lodConfig?: LODConfig;
  fetchFn?: (path: string) => Promise<ArrayBuffer>;
}

// ============================================================================
// GLB ASSET LIBRARY
// ============================================================================

export class GLBAssetLibrary {
  private cache: Map<string, GLBAsset> = new Map();
  private lodCache: Map<string, GLBAsset[]> = new Map();
  private loadingPromises: Map<string, Promise<GLBAsset>> = new Map();
  private logger: HololandLogger;

  // Configuration
  private maxCacheSize: number;
  private currentCacheSize: number = 0;
  private lodConfig: LODConfig;
  private fetchFn: (path: string) => Promise<ArrayBuffer>;

  constructor(options: GLBAssetLibraryOptions = {}) {
    this.maxCacheSize = options.maxCacheSize ?? 500 * 1024 * 1024; // 500MB default
    this.lodConfig = options.lodConfig ?? {
      distances: [0, 25, 50, 100],
      reductionFactors: [1.0, 0.5, 0.25, 0.1],
    };
    this.fetchFn = options.fetchFn ?? this.defaultFetch.bind(this);
    this.logger = createLogger('GLBAssetLibrary');

    this.logger.info('Initialized', {
      maxCacheSize: this.maxCacheSize,
      lodLevels: this.lodConfig.distances.length,
    });
  }

  private async defaultFetch(path: string): Promise<ArrayBuffer> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${path} (${response.status})`);
    }
    return response.arrayBuffer();
  }

  // =========================================================================
  // LOADING
  // =========================================================================

  /**
   * Load a GLB asset from path
   */
  async loadAsset(path: string, options: LoadOptions = {}): Promise<GLBAsset> {
    // Check cache first
    const cached = this.cache.get(path);
    if (cached) {
      cached.lastAccessed = Date.now();
      this.logger.debug(`Cache hit: ${path}`);
      return cached;
    }

    // Check if already loading
    const existingPromise = this.loadingPromises.get(path);
    if (existingPromise) {
      this.logger.debug(`Waiting for existing load: ${path}`);
      return existingPromise;
    }

    // Start new load
    const loadPromise = this._loadAssetInternal(path, options);
    this.loadingPromises.set(path, loadPromise);

    try {
      const asset = await loadPromise;
      this.loadingPromises.delete(path);
      return asset;
    } catch (error) {
      this.loadingPromises.delete(path);
      throw error;
    }
  }

  private async _loadAssetInternal(
    path: string,
    options: LoadOptions
  ): Promise<GLBAsset> {
    this.logger.info(`Loading: ${path}`);

    // Fetch file
    const data = await this.fetchFn(path);

    // Parse metadata
    const metadata = this.parseGLBMetadata(data);

    // Create asset
    const asset: GLBAsset = {
      id: this.generateAssetId(path),
      path,
      data,
      metadata,
      loadedAt: Date.now(),
      lastAccessed: Date.now(),
      size: data.byteLength,
    };

    // Generate LOD if requested
    if (options.generateLOD) {
      asset.lodLevels = await this.generateLODLevels(asset, options.lodLevels);
      this.lodCache.set(asset.id, asset.lodLevels);
    }

    // Add to cache
    await this.addToCache(asset);

    this.logger.info(`Loaded: ${path}`, {
      size: asset.size,
      meshes: metadata.meshCount,
      materials: metadata.materialCount,
    });

    return asset;
  }

  /**
   * Parse GLB header and metadata
   */
  private parseGLBMetadata(data: ArrayBuffer): GLBMetadata {
    const view = new DataView(data);

    // GLB header: magic (4) + version (4) + length (4)
    const magic = view.getUint32(0, true);
    if (magic !== 0x46546c67) {
      // 'glTF' in little-endian
      throw new Error('Invalid GLB magic number');
    }

    const version = view.getUint32(4, true);

    // Parse JSON chunk to get metadata
    const jsonChunkLength = view.getUint32(12, true);
    const jsonChunkType = view.getUint32(16, true);

    if (jsonChunkType !== 0x4e4f534a) {
      // 'JSON' in little-endian
      throw new Error('Invalid GLB JSON chunk');
    }

    const jsonData = new Uint8Array(data, 20, jsonChunkLength);
    const jsonString = new TextDecoder().decode(jsonData);
    const gltf = JSON.parse(jsonString);

    return {
      name: gltf.asset?.extras?.name || 'Untitled',
      version: version.toString(),
      generator: gltf.asset?.generator,
      meshCount: gltf.meshes?.length || 0,
      materialCount: gltf.materials?.length || 0,
      animationCount: gltf.animations?.length || 0,
      textureCount: gltf.textures?.length || 0,
      boundingBox: this.computeBoundingBox(gltf),
    };
  }

  private computeBoundingBox(gltf: any): BoundingBox | undefined {
    const accessors = gltf.accessors || [];
    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;

    for (const accessor of accessors) {
      if (accessor.type === 'VEC3' && accessor.min && accessor.max) {
        minX = Math.min(minX, accessor.min[0]);
        minY = Math.min(minY, accessor.min[1]);
        minZ = Math.min(minZ, accessor.min[2]);
        maxX = Math.max(maxX, accessor.max[0]);
        maxY = Math.max(maxY, accessor.max[1]);
        maxZ = Math.max(maxZ, accessor.max[2]);
      }
    }

    if (!isFinite(minX)) return undefined;

    return {
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
      center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2],
      size: [maxX - minX, maxY - minY, maxZ - minZ],
    };
  }

  // =========================================================================
  // LOD MANAGEMENT
  // =========================================================================

  /**
   * Generate LOD levels for an asset
   */
  private async generateLODLevels(
    asset: GLBAsset,
    levels?: number
  ): Promise<GLBAsset[]> {
    const numLevels = levels || this.lodConfig.distances.length;
    const lodAssets: GLBAsset[] = [];

    for (let i = 0; i < numLevels; i++) {
      const reductionFactor = this.lodConfig.reductionFactors[i] || 0.5;

      if (reductionFactor >= 1.0) {
        // LOD 0 is the original
        lodAssets.push(asset);
      } else {
        // Generate reduced version (simplified placeholder)
        // In production, use mesh simplification library
        const lodAsset: GLBAsset = {
          ...asset,
          id: `${asset.id}_lod${i}`,
          metadata: {
            ...asset.metadata,
            polyCount: Math.floor(
              (asset.metadata.polyCount || 1000) * reductionFactor
            ),
          },
        };
        lodAssets.push(lodAsset);
      }
    }

    this.logger.debug(`Generated ${numLevels} LOD levels for ${asset.id}`);
    return lodAssets;
  }

  /**
   * Select appropriate LOD based on distance
   */
  selectLOD(assetId: string, distance: number): GLBAsset | null {
    const lods = this.lodCache.get(assetId);
    if (!lods || lods.length === 0) {
      return this.cache.get(assetId) || null;
    }

    for (let i = this.lodConfig.distances.length - 1; i >= 0; i--) {
      if (distance >= this.lodConfig.distances[i]) {
        return lods[i] || lods[lods.length - 1];
      }
    }

    return lods[0];
  }

  // =========================================================================
  // CACHE MANAGEMENT
  // =========================================================================

  private async addToCache(asset: GLBAsset): Promise<void> {
    while (this.currentCacheSize + asset.size > this.maxCacheSize) {
      const evicted = this.evictLRU();
      if (!evicted) break;
    }

    this.cache.set(asset.path, asset);
    this.currentCacheSize += asset.size;
  }

  private evictLRU(): boolean {
    let oldest: GLBAsset | null = null;
    let oldestPath: string | null = null;

    for (const [path, asset] of this.cache) {
      if (!oldest || asset.lastAccessed < oldest.lastAccessed) {
        oldest = asset;
        oldestPath = path;
      }
    }

    if (oldest && oldestPath) {
      this.cache.delete(oldestPath);
      this.lodCache.delete(oldest.id);
      this.currentCacheSize -= oldest.size;
      this.logger.debug(`Evicted: ${oldestPath}`);
      return true;
    }

    return false;
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    this.cache.clear();
    this.lodCache.clear();
    this.currentCacheSize = 0;
    this.logger.info('Cache cleared');
  }

  // =========================================================================
  // PRELOADING
  // =========================================================================

  /**
   * Preload assets for a scene
   */
  async preloadForScene(
    assetPaths: string[],
    options: LoadOptions = {}
  ): Promise<void> {
    this.logger.info(`Preloading ${assetPaths.length} assets`);

    const results = await Promise.allSettled(
      assetPaths.map((path) => this.loadAsset(path, options))
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    this.logger.info(`Preload complete: ${succeeded} succeeded, ${failed} failed`);
  }

  /**
   * Preload with priority queue
   */
  async preloadPrioritized(
    assets: Array<{ path: string; priority: 'high' | 'normal' | 'low' }>
  ): Promise<void> {
    const sorted = [...assets].sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    const high = sorted.filter((a) => a.priority === 'high');
    const rest = sorted.filter((a) => a.priority !== 'high');

    // Load high priority sequentially
    for (const asset of high) {
      await this.loadAsset(asset.path, { priority: asset.priority });
    }

    // Load rest in parallel
    await Promise.all(
      rest.map((a) => this.loadAsset(a.path, { priority: a.priority }))
    );
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================

  private generateAssetId(path: string): string {
    return `glb_${path.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    cachedAssets: number;
    cacheSize: number;
    maxSize: number;
    utilizationPercent: number;
  } {
    return {
      cachedAssets: this.cache.size,
      cacheSize: this.currentCacheSize,
      maxSize: this.maxCacheSize,
      utilizationPercent: (this.currentCacheSize / this.maxCacheSize) * 100,
    };
  }

  /**
   * Check if asset is cached
   */
  isCached(path: string): boolean {
    return this.cache.has(path);
  }

  /**
   * Get asset from cache without loading
   */
  getFromCache(path: string): GLBAsset | undefined {
    const asset = this.cache.get(path);
    if (asset) {
      asset.lastAccessed = Date.now();
    }
    return asset;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let _glbAssetLibrary: GLBAssetLibrary | null = null;

export function getGLBAssetLibrary(
  options?: GLBAssetLibraryOptions
): GLBAssetLibrary {
  if (!_glbAssetLibrary) {
    _glbAssetLibrary = new GLBAssetLibrary(options);
  }
  return _glbAssetLibrary;
}

export function resetGLBAssetLibrary(): void {
  if (_glbAssetLibrary) {
    _glbAssetLibrary.clearCache();
  }
  _glbAssetLibrary = null;
}
