/**
 * GaussianSplatNode Component Library
 *
 * R3F component for rendering Gaussian splat scenes (PLY, SPLAT, SPZ)
 * with octree-based LOD, platform-aware budget enforcement, and
 * progressive streaming support.
 *
 * This bridges HoloScript's @gaussian_splat trait to the R3F scene graph.
 *
 * Components:
 * - GaussianSplatNode:        R3F component for rendering Gaussian splats
 * - useGaussianSplatNode:     React hook for splat lifecycle management
 *
 * @module gaussian-splat-node
 */

// Component
export { GaussianSplatNode, hasGaussianSplatTrait } from './GaussianSplatNode';
export type { GaussianSplatNodeProps } from './types';

// Hook
export { useGaussianSplatNode } from './useGaussianSplatNode';
export type {
  UseGaussianSplatNodeConfig,
  GaussianSplatNodeResult,
  SplatDataRef,
  ResolvedPlatformConfig,
  LODUpdateResult,
} from './useGaussianSplatNode';

// Types
export type {
  SplatFileFormat,
  GaussianPlatform,
  LODEventType,
  LoadingPhase,
  GaussianSplatNodeConfig,
  LODUpdateEvent,
  LoadingProgressEvent,
  GaussianSplatNodeState,
} from './types';

export {
  PLATFORM_BUDGETS,
  PLATFORM_MEMORY_MB,
  PLATFORM_MAX_SPLATS,
  DEFAULT_GAUSSIAN_SPLAT_NODE_STATE,
} from './types';
