/**
 * VolumetricBridge — Unified loader that auto-detects format and delegates to
 * GaussianSplatLoader or PhotogrammetryLoader.
 *
 * Usage:
 *   const bridge = new VolumetricBridge();
 *   const result = await bridge.load({ url: 'scene.ply', quality: 'high' });
 *   scene.add(result.object);
 *   // On cleanup:
 *   result.dispose();
 *
 * @module volumetric-bridge
 */

import type {
  VolumetricLoadConfig,
  VolumetricLoadResult,
  VolumetricSourceType,
  VolumetricEventHandler,
  GaussianSplatConfig,
  PhotogrammetryConfig,
} from './types';
import { GaussianSplatLoader } from './GaussianSplatLoader';
import { PhotogrammetryLoader } from './PhotogrammetryLoader';

// ─── Format Detection ───────────────────────────────────────────────────────

const EXTENSION_MAP: Record<string, VolumetricSourceType> = {
  // Gaussian Splatting
  splat: 'gaussian_splat',
  ksplat: 'gaussian_splat',
  spz: 'gaussian_splat',
  // PLY can be either — check header
  ply: 'gaussian_splat', // Default to splat; photogrammetry would use .obj/.gltf

  // Photogrammetry / Mesh
  obj: 'photogrammetry',
  gltf: 'photogrammetry',
  glb: 'photogrammetry',
  usdz: 'photogrammetry',
  fbx: 'photogrammetry',

  // NeRF (supported via NeRF-to-GS capture flow)
  ingp: 'nerf',
  msgpack: 'nerf',
};

function detectSourceType(url: string): VolumetricSourceType {
  const ext = url.split(/[?#]/)[0].split('.').pop()?.toLowerCase();
  return EXTENSION_MAP[ext ?? ''] ?? 'photogrammetry';
}

// ─── Quality Presets ────────────────────────────────────────────────────────

interface QualitySettings {
  maxSplats: number;
  maxTextureSize: number;
  lodLevels: number;
  maxMemoryMB: number;
}

const QUALITY_PRESETS: Record<string, QualitySettings> = {
  low: { maxSplats: 250_000, maxTextureSize: 1024, lodLevels: 2, maxMemoryMB: 128 },
  medium: { maxSplats: 500_000, maxTextureSize: 2048, lodLevels: 3, maxMemoryMB: 256 },
  high: { maxSplats: 1_000_000, maxTextureSize: 4096, lodLevels: 4, maxMemoryMB: 512 },
  ultra: { maxSplats: 2_000_000, maxTextureSize: 8192, lodLevels: 5, maxMemoryMB: 1024 },
};

// ─── Bridge ─────────────────────────────────────────────────────────────────

export class VolumetricBridge {
  private splatLoader = new GaussianSplatLoader();
  private meshLoader = new PhotogrammetryLoader();
  private handlers: VolumetricEventHandler[] = [];
  private loadedResults: VolumetricLoadResult[] = [];

  constructor() {
    // Forward events from sub-loaders
    this.splatLoader.on((e) => this.emit(e));
    this.meshLoader.on((e) => this.emit(e));
  }

  /**
   * Load a volumetric asset. Auto-detects format from URL extension.
   */
  async load(config: VolumetricLoadConfig): Promise<VolumetricLoadResult> {
    const sourceType = config.sourceType ?? detectSourceType(config.url);
    const quality = QUALITY_PRESETS[config.quality ?? 'medium'];

    let result: VolumetricLoadResult;

    switch (sourceType) {
      case 'gaussian_splat': {
        const splatConfig: GaussianSplatConfig = {
          ...config,
          sourceType: 'gaussian_splat',
          maxSplats: quality.maxSplats,
          maxMemoryMB: config.maxMemoryMB ?? quality.maxMemoryMB,
        };
        result = await this.splatLoader.load(splatConfig);
        break;
      }

      case 'photogrammetry': {
        const meshConfig: PhotogrammetryConfig = {
          ...config,
          sourceType: 'photogrammetry',
          maxTextureSize: quality.maxTextureSize,
          lodLevels: quality.lodLevels,
          maxMemoryMB: config.maxMemoryMB ?? quality.maxMemoryMB,
        };
        result = await this.meshLoader.load(meshConfig);
        break;
      }

      case 'nerf': {
        // NeRF support is planned but not yet implemented.
        // For now, attempt to load as baked mesh (photogrammetry path).
        const meshConfig: PhotogrammetryConfig = {
          ...config,
          sourceType: 'photogrammetry',
          maxTextureSize: quality.maxTextureSize,
          lodLevels: quality.lodLevels,
        };
        result = await this.meshLoader.load(meshConfig);
        break;
      }

      case 'point_cloud': {
        // Point clouds use the splat path with uniform scales
        const splatConfig: GaussianSplatConfig = {
          ...config,
          sourceType: 'gaussian_splat',
          maxSplats: quality.maxSplats,
          splatScale: 0.005, // Small point size
        };
        result = await this.splatLoader.load(splatConfig);
        break;
      }

      default:
        throw new Error(`Unsupported volumetric source type: ${sourceType}`);
    }

    this.loadedResults.push(result);
    return result;
  }

  /**
   * Subscribe to load events (progress, loaded, error, lod-changed).
   */
  on(handler: VolumetricEventHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  private emit(event: Parameters<VolumetricEventHandler>[0]) {
    for (const h of this.handlers) h(event);
  }

  /**
   * Dispose all loaded results and free GPU memory.
   */
  disposeAll(): void {
    for (const result of this.loadedResults) {
      result.dispose();
    }
    this.loadedResults = [];
  }
}

/**
 * Convenience factory for one-off loads.
 */
export async function loadVolumetric(config: VolumetricLoadConfig): Promise<VolumetricLoadResult> {
  const bridge = new VolumetricBridge();
  return bridge.load(config);
}
