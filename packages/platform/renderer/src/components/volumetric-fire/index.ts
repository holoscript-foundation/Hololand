/**
 * Volumetric Fire System
 *
 * GPU-optimized volumetric fire rendering for VR/AR applications.
 *
 * Architecture:
 *   - Compute shader generates 3D density field (amortized across frames)
 *   - Fragment shader raymarches through density field
 *   - Temporal reprojection blends results across frames
 *   - Auto quality stepping: 12/24/32/48 raymarch steps
 *
 * Supports 9-layer fire system with adaptive quality and performance budgets.
 *
 * @module volumetric-fire
 */

export { VolumetricFireRenderer } from './VolumetricFireRenderer';
export {
  HoloScriptFireIntegration,
  createVolumetricFireMaterial,
} from './HoloScriptFireIntegration';
export type {
  VolumetricFireConfig,
  LayerConfig,
  FireUniforms,
  FirePerformanceMetrics,
  FireRenderPassConfig,
  NoiseTextureConfig,
  TemporalReprojectionState,
  ComputePipelineState,
  QualityStep,
} from './VolumetricFireTypes';
export {
  FireShaderFlags,
  DEFAULT_FIRE_CONFIG,
  FIRE_QUALITY_PRESETS,
  QUALITY_STEPS,
  haltonSequence,
  getTemporalJitter,
} from './VolumetricFireTypes';
