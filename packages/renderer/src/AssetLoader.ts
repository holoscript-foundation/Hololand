/**
 * AssetLoader
 *
 * Handles loading of 3D models (GLTF/GLB), textures, and other assets.
 * Supports Draco compression, LOD generation, and caching.
 */

import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { AssetLoadOptions, LoadedAsset, QualitySettings } from './types';
import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

export interface LoadedModel extends LoadedAsset {
  type: 'gltf';
  data: {
    scene: THREE.Group;
    animations: THREE.AnimationClip[];
    cameras: THREE.Camera[];
  };
}

export interface LoadedTexture extends LoadedAsset {
  type: 'texture';
  data: THREE.Texture;
}

// =============================================================================
// ASSET CACHE
// =============================================================================

class AssetCache {
  private cache: Map<string, LoadedAsset> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: string): LoadedAsset | undefined {
    return this.cache.get(key);
  }

  set(key: string, asset: LoadedAsset): void {
    // LRU eviction if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        const evicted = this.cache.get(firstKey);
        this.disposeAsset(evicted);
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, asset);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    const asset = this.cache.get(key);
    if (asset) {
      this.disposeAsset(asset);
    }
    return this.cache.delete(key);
  }

  clear(): void {
    for (const asset of this.cache.values()) {
      this.disposeAsset(asset);
    }
    this.cache.clear();
  }

  private disposeAsset(asset: LoadedAsset | undefined): void {
    if (!asset) return;

    if (asset.type === 'gltf') {
      const model = asset as LoadedModel;
      model.data.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
    } else if (asset.type === 'texture') {
      const tex = asset as LoadedTexture;
      tex.data.dispose();
    }
  }
}

// =============================================================================
// ASSET LOADER CLASS
// =============================================================================

export interface AssetLoaderOptions {
  renderer?: THREE.WebGLRenderer;
  qualitySettings: QualitySettings;
  dracoPath?: string;
  ktx2Path?: string;
  cacheSize?: number;
}

export class AssetLoader {
  private gltfLoader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;
  private dracoLoader: DRACOLoader | null = null;
  private ktx2Loader: KTX2Loader | null = null;
  private cache: AssetCache;
  private qualitySettings: QualitySettings;
  private loadingCount: number = 0;

  constructor(options: AssetLoaderOptions) {
    this.qualitySettings = options.qualitySettings;
    this.cache = new AssetCache(options.cacheSize || 100);

    // Initialize GLTF loader
    this.gltfLoader = new GLTFLoader();

    // Initialize Draco decoder
    const dracoPath = options.dracoPath || 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath(dracoPath);
    this.gltfLoader.setDRACOLoader(this.dracoLoader);

    // Initialize KTX2 loader if renderer provided
    if (options.renderer) {
      const ktx2Path = options.ktx2Path || 'https://www.gstatic.com/basis-universal/versioned/2021-04-15-ba1c3e4/';
      this.ktx2Loader = new KTX2Loader();
      this.ktx2Loader.setTranscoderPath(ktx2Path);
      this.ktx2Loader.detectSupport(options.renderer);
      this.gltfLoader.setKTX2Loader(this.ktx2Loader);
    }

    // Set meshopt decoder
    this.gltfLoader.setMeshoptDecoder(MeshoptDecoder);

    // Initialize texture loader
    this.textureLoader = new THREE.TextureLoader();

    logger.info('[AssetLoader] Initialized');
  }

  /**
   * Load a GLTF/GLB model
   */
  async loadModel(url: string, options: AssetLoadOptions = {}): Promise<LoadedModel> {
    const cacheKey = `model:${url}`;

    // Check cache
    if (options.cache !== false && this.cache.has(cacheKey)) {
      logger.debug('[AssetLoader] Model from cache', { url });
      return this.cache.get(cacheKey) as LoadedModel;
    }

    this.loadingCount++;

    try {
      const gltf = await this.loadGLTF(url, options.onProgress);

      // Process the model
      const scene = gltf.scene.clone(true);
      const animations = gltf.animations.map(a => a.clone());
      const cameras = gltf.cameras.map(c => c.clone());

      // Apply quality settings
      this.processModel(scene, options);

      // Calculate metadata
      const metadata = this.calculateModelMetadata(scene, gltf);

      const asset: LoadedModel = {
        id: this.generateId(),
        type: 'gltf',
        url,
        data: { scene, animations, cameras },
        metadata,
      };

      // Cache if enabled
      if (options.cache !== false) {
        this.cache.set(cacheKey, asset);
      }

      logger.info('[AssetLoader] Model loaded', { url, polyCount: metadata.polyCount });

      return asset;
    } finally {
      this.loadingCount--;
    }
  }

  /**
   * Load GLTF with promise wrapper
   */
  private loadGLTF(url: string, onProgress?: (progress: number) => void): Promise<GLTF> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        resolve,
        (event) => {
          if (event.lengthComputable && onProgress) {
            onProgress(event.loaded / event.total);
          }
        },
        reject
      );
    });
  }

  /**
   * Process model based on quality settings
   */
  private processModel(scene: THREE.Object3D, options: AssetLoadOptions): void {
    const maxTextureSize = options.maxTextureSize || this.qualitySettings.maxTextureSize;

    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        // Enable shadows based on quality
        object.castShadow = this.qualitySettings.shadowsEnabled;
        object.receiveShadow = this.qualitySettings.shadowsEnabled;

        // Process materials
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => {
          this.processMaterial(material, maxTextureSize);
        });
      }
    });
  }

  /**
   * Process material for quality settings
   */
  private processMaterial(material: THREE.Material, maxTextureSize: number): void {
    // Set anisotropic filtering
    const anisotropy = this.qualitySettings.anisotropy;

    const textureProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'];

    textureProps.forEach(prop => {
      const texture = (material as Record<string, unknown>)[prop] as THREE.Texture | undefined;
      if (texture instanceof THREE.Texture) {
        texture.anisotropy = anisotropy;

        // Resize texture if too large
        if (texture.image && (texture.image.width > maxTextureSize || texture.image.height > maxTextureSize)) {
          this.resizeTexture(texture, maxTextureSize);
        }
      }
    });

    // Upgrade material type if needed
    if (this.qualitySettings.materialType === 'physical' && material instanceof THREE.MeshStandardMaterial) {
      // Convert to MeshPhysicalMaterial would require recreating the material
      // For now, just ensure proper settings
      material.envMapIntensity = this.qualitySettings.hdriEnvironment ? 1.0 : 0;
    }
  }

  /**
   * Resize texture to max size
   */
  private resizeTexture(texture: THREE.Texture, maxSize: number): void {
    if (!texture.image) return;

    const img = texture.image as HTMLImageElement | ImageBitmap;
    const width = img.width;
    const height = img.height;

    if (width <= maxSize && height <= maxSize) return;

    const scale = maxSize / Math.max(width, height);
    const newWidth = Math.floor(width * scale);
    const newHeight = Math.floor(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      texture.image = canvas;
      texture.needsUpdate = true;

      logger.debug('[AssetLoader] Texture resized', {
        original: `${width}x${height}`,
        new: `${newWidth}x${newHeight}`,
      });
    }
  }

  /**
   * Calculate model metadata
   */
  private calculateModelMetadata(scene: THREE.Object3D, gltf: GLTF): LoadedModel['metadata'] {
    let polyCount = 0;
    let textureCount = 0;
    const textures = new Set<THREE.Texture>();

    const box = new THREE.Box3().setFromObject(scene);

    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const geometry = object.geometry;
        if (geometry.index) {
          polyCount += geometry.index.count / 3;
        } else if (geometry.attributes.position) {
          polyCount += geometry.attributes.position.count / 3;
        }

        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(mat => {
          const textureProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'];
          textureProps.forEach(prop => {
            const tex = (mat as Record<string, unknown>)[prop] as THREE.Texture | undefined;
            if (tex instanceof THREE.Texture) {
              textures.add(tex);
            }
          });
        });
      }
    });

    textureCount = textures.size;

    return {
      polyCount: Math.round(polyCount),
      textureCount,
      animationCount: gltf.animations.length,
      bounds: {
        min: { x: box.min.x, y: box.min.y, z: box.min.z },
        max: { x: box.max.x, y: box.max.y, z: box.max.z },
      },
    };
  }

  /**
   * Load a texture
   */
  async loadTexture(url: string, options: AssetLoadOptions = {}): Promise<LoadedTexture> {
    const cacheKey = `texture:${url}`;

    // Check cache
    if (options.cache !== false && this.cache.has(cacheKey)) {
      logger.debug('[AssetLoader] Texture from cache', { url });
      return this.cache.get(cacheKey) as LoadedTexture;
    }

    this.loadingCount++;

    try {
      const texture = await this.loadTextureAsync(url, options.onProgress);

      // Apply quality settings
      texture.anisotropy = this.qualitySettings.anisotropy;

      // Resize if needed
      const maxSize = options.maxTextureSize || this.qualitySettings.maxTextureSize;
      if (texture.image && (texture.image.width > maxSize || texture.image.height > maxSize)) {
        this.resizeTexture(texture, maxSize);
      }

      const asset: LoadedTexture = {
        id: this.generateId(),
        type: 'texture',
        url,
        data: texture,
        metadata: {},
      };

      // Cache if enabled
      if (options.cache !== false) {
        this.cache.set(cacheKey, asset);
      }

      logger.info('[AssetLoader] Texture loaded', { url });

      return asset;
    } finally {
      this.loadingCount--;
    }
  }

  /**
   * Load texture with promise wrapper
   */
  private loadTextureAsync(url: string, onProgress?: (progress: number) => void): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        resolve,
        (event) => {
          if (event.lengthComputable && onProgress) {
            onProgress(event.loaded / event.total);
          }
        },
        reject
      );
    });
  }

  /**
   * Load a cube texture (skybox)
   */
  async loadCubeTexture(urls: string[]): Promise<THREE.CubeTexture> {
    return new Promise((resolve, reject) => {
      const loader = new THREE.CubeTextureLoader();
      loader.load(urls, resolve, undefined, reject);
    });
  }

  /**
   * Preload multiple assets
   */
  async preload(urls: Array<{ url: string; type: 'model' | 'texture' }>): Promise<void> {
    const promises = urls.map(({ url, type }) => {
      if (type === 'model') {
        return this.loadModel(url).catch(e => {
          logger.error('[AssetLoader] Preload failed', { url, error: e });
        });
      } else {
        return this.loadTexture(url).catch(e => {
          logger.error('[AssetLoader] Preload failed', { url, error: e });
        });
      }
    });

    await Promise.all(promises);
  }

  /**
   * Check if currently loading
   */
  isLoading(): boolean {
    return this.loadingCount > 0;
  }

  /**
   * Get loading count
   */
  getLoadingCount(): number {
    return this.loadingCount;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('[AssetLoader] Cache cleared');
  }

  /**
   * Update quality settings
   */
  setQualitySettings(settings: QualitySettings): void {
    this.qualitySettings = settings;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.cache.clear();
    this.dracoLoader?.dispose();
    this.ktx2Loader?.dispose();
    logger.info('[AssetLoader] Disposed');
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create an asset loader
 */
export function createAssetLoader(options: AssetLoaderOptions): AssetLoader {
  return new AssetLoader(options);
}
