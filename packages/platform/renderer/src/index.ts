/**
 * @hololand/renderer
 *
 * Advanced rendering engine for Hololand worlds.
 * Features quality tiers, PBR materials, HDRI environments,
 * post-processing, and GLTF asset loading.
 *
 * @example
 * ```typescript
 * import {
 *   HololandRenderer,
 *   QualityManager,
 *   createAssetLoader,
 *   HDRI_PRESETS
 * } from '@hololand/renderer';
 *
 * // Create renderer with quality auto-detection
 * const renderer = new HololandRenderer(canvas, world, {
 *   quality: 'auto',
 *   environment: { hdri: 'sunset', skybox: 'hdri' },
 *   postProcessing: { bloom: { enabled: true, strength: 0.5 } }
 * });
 *
 * // Load a 3D model
 * const assetLoader = createAssetLoader({ qualitySettings: renderer.getQualitySettings() });
 * const model = await assetLoader.loadModel('/models/character.glb');
 * scene.add(model.data.scene);
 * ```
 */

// =============================================================================
// CORE RENDERER
// =============================================================================

// 3D Renderer (Three.js + WebXR)
export { HololandRenderer } from './HololandRenderer';
export * from './HololandRenderer';
export * from './VolumetricBridge';
export * from './GPUContext';
export * from './types';

// 2D Renderer (Canvas)
export { Hololand2DRenderer } from './Hololand2DRenderer';
export type { Renderer2DConfig } from './Hololand2DRenderer';

// =============================================================================
// QUALITY SYSTEM
// =============================================================================

export {
  QualityManager,
  getQualityManager,
  createQualityManager,
} from './QualityManager';

export type { QualityManagerOptions } from './QualityManager';

// =============================================================================
// POST-PROCESSING
// =============================================================================

export {
  PostProcessingPipeline,
  createPostProcessingPipeline,
} from './PostProcessing';

export type { PostProcessingOptions } from './PostProcessing';

// =============================================================================
// ENVIRONMENT
// =============================================================================

export {
  EnvironmentManager,
  createEnvironmentManager,
  HDRI_PRESETS,
} from './EnvironmentManager';

export type { EnvironmentManagerOptions } from './EnvironmentManager';

// =============================================================================
// ASSET LOADING
// =============================================================================

export {
  AssetLoader,
  createAssetLoader,
} from './AssetLoader';

export type {
  AssetLoaderOptions,
  LoadedModel,
  LoadedTexture,
} from './AssetLoader';

// =============================================================================
// MATERIALS
// =============================================================================

export {
  MaterialFactory,
  createMaterialFactory,
} from './MaterialFactory';

export type {
  MaterialOptions,
  MaterialPreset,
} from './MaterialFactory';

// =============================================================================
// LOGGING
// =============================================================================

export { setHololandRendererLogger, type HololandRendererLogger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Quality
  QualityPreset,
  QualitySettings,
  DeviceType,
  // Rendering
  RenderMode,
  RendererConfig,
  // Materials & Lighting
  MaterialConfig,
  LightingConfig,
  // Environment
  EnvironmentConfig,
  // Post-processing
  PostProcessingConfig,
  // Assets
  AssetLoadOptions,
  LoadedAsset,
} from './types';

export { QUALITY_PRESETS } from './types';

// =============================================================================
// GPU COMPUTE (merged from @holoscript/gpu)
// =============================================================================

export * from './GPUCompute';

// =============================================================================
// VERSION
// =============================================================================

export const HOLOLAND_RENDERER_VERSION = '1.0.0-alpha.2';

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

import { HololandRenderer } from './HololandRenderer';
import { Hololand2DRenderer } from './Hololand2DRenderer';
import { QualityManager } from './QualityManager';
import { PostProcessingPipeline } from './PostProcessing';
import { EnvironmentManager, HDRI_PRESETS } from './EnvironmentManager';
import { AssetLoader } from './AssetLoader';
import { MaterialFactory } from './MaterialFactory';

export default {
  HololandRenderer,
  Hololand2DRenderer,
  QualityManager,
  PostProcessingPipeline,
  EnvironmentManager,
  AssetLoader,
  MaterialFactory,
  HDRI_PRESETS,
  HOLOLAND_RENDERER_VERSION: '1.0.0-alpha.2',
};
