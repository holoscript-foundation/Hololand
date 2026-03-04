/**
 * Gaussian Splat Viewer Component Library
 *
 * React components for real-time WebGPU Gaussian Splatting rendering
 * with WebSplatter wait-free radix sort architecture. Targets 60fps
 * at 1080p with up to 2M splats.
 *
 * Components:
 * - GaussianSplatViewer:       Full viewer with canvas + dashboard/overlay UI
 * - useGaussianSplatViewer:    React hook for pipeline lifecycle management
 *
 * Core:
 * - WebGPUSplatRenderer:       WebGPU pipeline (sort + rasterize)
 * - OrbitCameraController:     Mouse/touch orbit camera
 * - PlyLoader:                 PLY and .splat file parser
 *
 * @module gaussian-splat-viewer
 */

// Types and utilities
export type {
  ViewerStatus,
  SplatCloudData,
  SplatGPUBuffers,
  CameraState,
  CameraControllerConfig,
  SplatRenderConfig,
  SplatFrameMetrics,
  SplatRenderStats,
  GaussianSplatViewerState,
  GaussianSplatViewerActions,
  GaussianSplatViewerTheme,
  GaussianSplatDisplayMode,
  FoveatedFrameMetrics,
  FoveatedPipelineStage,
} from './types';

export {
  FoveatedZone,
  DEFAULT_CAMERA_STATE,
  DEFAULT_CAMERA_CONTROLLER_CONFIG,
  DEFAULT_RENDER_CONFIG,
  DEFAULT_GSPLAT_THEME,
  formatMs,
  formatNumber,
  formatBytes,
  getStatusLabel,
  getStatusColor,
} from './types';

// GaussianSplatViewer component
export { GaussianSplatViewer } from './GaussianSplatViewer';
export type { GaussianSplatViewerProps, GaussianSplatPanel } from './GaussianSplatViewer';

// useGaussianSplatViewer hook
export { useGaussianSplatViewer } from './useGaussianSplatViewer';
export type { UseGaussianSplatViewerConfig } from './useGaussianSplatViewer';

// WebGPU renderer core
export { WebGPUSplatRenderer, createWebGPUSplatRenderer } from './WebGPUSplatRenderer';

// Orbit camera controller
export { OrbitCameraController, createOrbitCameraController } from './OrbitCameraController';

// PLY loader
export { loadPlyFromUrl, parsePlyBuffer, parseSplatBuffer } from './PlyLoader';

// Foveated Gaussian Pipeline (advanced: foveated sort + tile assignment + StopThePop)
export {
  FoveatedGaussianPipeline,
  createFoveatedGaussianPipeline,
  DEFAULT_FOVEATION_CONFIG,
  DEFAULT_TILE_CONFIG,
  DEFAULT_STP_CONFIG,
  DEFAULT_FOVEATED_PIPELINE_CONFIG,
} from './FoveatedGaussianPipeline';
export type {
  FoveationConfig,
  TileConfig,
  StopThePopConfig,
  FoveatedPipelineConfig,
  FoveatedGPUBuffers,
  FoveatedFrameMetrics as FoveatedPipelineMetrics,
} from './FoveatedGaussianPipeline';
