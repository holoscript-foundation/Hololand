/**
 * @hololand/volumetric-bridge
 *
 * Unified loader for volumetric content — Gaussian Splatting, photogrammetry,
 * NeRF (planned), and point clouds. Outputs Three.js Object3D for scene integration.
 *
 * @module volumetric-bridge
 */

// Types
export type {
  VolumetricSourceType,
  NerfFormat,
  SplatFormat,
  PhotogrammetryFormat,
  VolumetricLoadConfig,
  NerfConfig,
  GaussianSplatConfig,
  PhotogrammetryConfig,
  VolumetricLoadResult,
  VolumetricMetadata,
  VolumetricEvent,
  VolumetricEventHandler,
  IVolumetricLoader,
} from './types';

// Loaders
export { GaussianSplatLoader } from './GaussianSplatLoader';
export { PhotogrammetryLoader } from './PhotogrammetryLoader';

// Bridge (unified loader)
export { VolumetricBridge, loadVolumetric } from './VolumetricBridge';
