/**
 * @hololand/three-adapter Smart Asset Bridge
 *
 * Integrates @holoscript/core SmartAssetLoader with Three.js GLTFLoader.
 * Enables semantic asset loading using aliases (e.g., "tree" instead of full paths)
 * while leveraging SmartAssetLoader's platform-aware optimization features.
 */

import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { AssetMetadata } from '@holoscript/core';

// ============================================================================
// Types
// ============================================================================

export interface GLTFResult {
  scene: THREE.Group;
  scenes: THREE.Group[];
  animations: THREE.AnimationClip[];
  cameras: THREE.Camera[];
  asset: GLTF['asset'];
  parser: GLTF['parser'];
  userData: GLTF['userData'];
}

export interface SmartAssetBridgeConfig {
  /** Path to Draco decoder files */
  dracoDecoderPath?: string;

  /** Enable Meshopt compression support */
  meshoptEnabled?: boolean;

  /** Custom texture transform (e.g., for color space) */
  textureTransform?: (texture: THREE.Texture) => THREE.Texture;

  /** Enable shadows on loaded meshes */
  enableShadows?: boolean;

  /** Default shadow settings */
  shadowSettings?: {
    castShadow?: boolean;
    receiveShadow?: boolean;
  };

  /** Material overrides for loaded models */
  materialOverrides?: (material: THREE.Material) => THREE.Material;

  /** OnProgress callback during model loading */
  onProgress?: (url: string, loaded: number, total: number) => void;
}

// ============================================================================
// Smart Asset Bridge
// ============================================================================

/**
 * SmartAssetBridge connects HoloScript's SmartAssetLoader with Three.js GLTFLoader.
 *
 * @example Basic usage
 * ```typescript
 * import { SmartAssetBridge } from '@hololand/three-adapter';
 * import { getSmartAssetLoader } from '@holoscript/core';
 *
 * const bridge = new SmartAssetBridge();
 * const loader = getSmartAssetLoader();
 *
 * // Inject the Three.js model parser into SmartAssetLoader
 * loader.setModelParser(bridge.createModelParser());
 *
 * // Now load models using aliases
 * const result = await loader.load({ asset: 'tree' });
 * scene.add(result.data.scene);
 * ```
 */
export class SmartAssetBridge {
  private gltfLoader: GLTFLoader;
  private dracoLoader: DRACOLoader;
  private config: SmartAssetBridgeConfig;
  private loadedModels: Map<string, GLTFResult> = new Map();

  constructor(config: SmartAssetBridgeConfig = {}) {
    this.config = {
      dracoDecoderPath: 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/',
      meshoptEnabled: true,
      enableShadows: true,
      shadowSettings: {
        castShadow: true,
        receiveShadow: true,
      },
      ...config,
    };

    // Initialize loaders
    this.gltfLoader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();

    // Configure Draco
    if (this.config.dracoDecoderPath) {
      this.dracoLoader.setDecoderPath(this.config.dracoDecoderPath);
      this.gltfLoader.setDRACOLoader(this.dracoLoader);
    }

    // Configure Meshopt
    if (this.config.meshoptEnabled) {
      this.gltfLoader.setMeshoptDecoder(MeshoptDecoder);
    }
  }

  /**
   * Creates a model parser function compatible with SmartAssetLoader's setModelParser()
   *
   * @returns A parser function that converts ArrayBuffer to Three.js GLTF
   */
  createModelParser(): <T>(buffer: ArrayBuffer, metadata: AssetMetadata) => Promise<T> {
    return async <T>(buffer: ArrayBuffer, metadata: AssetMetadata): Promise<T> => {
      const gltf = await this.parseGLTF(buffer, metadata);
      return gltf as T;
    };
  }

  /**
   * Parse GLB/GLTF buffer into Three.js objects
   */
  async parseGLTF(buffer: ArrayBuffer, metadata: AssetMetadata): Promise<GLTFResult> {
    return new Promise((resolve, reject) => {
      const url = metadata.url ?? metadata.sourcePath ?? '';

      this.gltfLoader.parse(
        buffer,
        '', // Resource path (empty since we're parsing from buffer)
        (gltf) => {
          // Post-process the loaded model
          const result = this.processLoadedGLTF(gltf, metadata);

          // Cache the result
          this.loadedModels.set(metadata.id, result);

          resolve(result);
        },
        (error) => {
          console.error(`[SmartAssetBridge] Failed to parse GLTF: ${url}`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * Load a GLTF/GLB directly by URL (bypasses SmartAssetLoader)
   * Useful for quick testing or when you don't need full asset management
   */
  async loadDirect(url: string): Promise<GLTFResult> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          const result = this.processLoadedGLTF(gltf, {
            id: url,
            name: url.split('/').pop() || url,
            type: 'model',
            format: url.toLowerCase().endsWith('.glb') ? 'glb' : 'gltf',
            size: 0,
            sourcePath: url,
          });
          resolve(result);
        },
        (event) => {
          this.config.onProgress?.(url, event.loaded, event.total);
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  /**
   * Post-process loaded GLTF (shadows, materials, etc.)
   */
  private processLoadedGLTF(gltf: GLTF, metadata: AssetMetadata): GLTFResult {
    const scene = gltf.scene.clone();

    // Apply shadow settings
    if (this.config.enableShadows) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = this.config.shadowSettings?.castShadow ?? true;
          child.receiveShadow = this.config.shadowSettings?.receiveShadow ?? true;

          // Apply material overrides if configured
          if (this.config.materialOverrides && child.material) {
            if (Array.isArray(child.material)) {
              child.material = child.material.map(this.config.materialOverrides);
            } else {
              child.material = this.config.materialOverrides(child.material);
            }
          }

          // Apply texture transforms
          if (
            this.config.textureTransform &&
            child.material instanceof THREE.MeshStandardMaterial
          ) {
            if (child.material.map) {
              child.material.map = this.config.textureTransform(child.material.map);
            }
          }
        }
      });
    }

    // Store metadata reference
    scene.userData.holoMetadata = metadata;
    scene.userData.assetId = metadata.id;

    return {
      scene,
      scenes: gltf.scenes.map((s) => s.clone()),
      animations: gltf.animations,
      cameras: gltf.cameras,
      asset: gltf.asset,
      parser: gltf.parser,
      userData: gltf.userData,
    };
  }

  /**
   * Get a cached model by ID
   */
  getCached(assetId: string): GLTFResult | undefined {
    return this.loadedModels.get(assetId);
  }

  /**
   * Clone a cached model's scene
   */
  cloneCached(assetId: string): THREE.Group | undefined {
    const cached = this.loadedModels.get(assetId);
    return cached?.scene.clone();
  }

  /**
   * Get the underlying GLTFLoader for advanced configuration
   */
  getGLTFLoader(): GLTFLoader {
    return this.gltfLoader;
  }

  /**
   * Get the underlying DRACOLoader
   */
  getDRACOLoader(): DRACOLoader {
    return this.dracoLoader;
  }

  /**
   * Dispose all loaded resources
   */
  dispose(): void {
    this.loadedModels.forEach((result) => {
      result.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    });

    this.loadedModels.clear();
    this.dracoLoader.dispose();
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

let defaultBridge: SmartAssetBridge | null = null;

/**
 * Get the default SmartAssetBridge instance (singleton)
 */
export function getSmartAssetBridge(config?: SmartAssetBridgeConfig): SmartAssetBridge {
  if (!defaultBridge) {
    defaultBridge = new SmartAssetBridge(config);
  }
  return defaultBridge;
}

/**
 * Create a new SmartAssetBridge instance
 */
export function createSmartAssetBridge(config?: SmartAssetBridgeConfig): SmartAssetBridge {
  return new SmartAssetBridge(config);
}

/**
 * Quick setup: Injects the Three.js model parser into SmartAssetLoader
 *
 * @example
 * ```typescript
 * import { setupSmartAssetLoader } from '@hololand/three-adapter';
 * import { getSmartAssetLoader } from '@holoscript/core';
 *
 * const loader = getSmartAssetLoader({
 *   baseUrl: '/assets/',
 *   platform: 'vr',
 *   quality: 'high',
 * });
 *
 * // One-line setup
 * setupSmartAssetLoader(loader);
 *
 * // Now use semantic aliases
 * const tree = await loader.load({ asset: 'tree' });
 * const bench = await loader.load({ asset: 'bench' });
 * ```
 */
export function setupSmartAssetLoader(
  loader: {
    setModelParser: (
      parser: <T>(buffer: ArrayBuffer, metadata: AssetMetadata) => Promise<T>
    ) => void;
  },
  bridgeConfig?: SmartAssetBridgeConfig
): SmartAssetBridge {
  const bridge = getSmartAssetBridge(bridgeConfig);
  loader.setModelParser(bridge.createModelParser());
  return bridge;
}
