/**
 * Volumetric Bridge Types
 *
 * Shared types for NeRF, Gaussian Splatting, and Photogrammetry loaders.
 *
 * @module volumetric-bridge
 */

import type { Object3D, Vector3 as ThreeVector3, Box3 } from 'three';

// ─── Source Types ───────────────────────────────────────────────────────────

export type VolumetricSourceType = 'nerf' | 'gaussian_splat' | 'photogrammetry' | 'point_cloud';

export type NerfFormat = 'instant_ngp' | 'nerfacto' | 'mipnerf360' | 'tensorf' | 'zip_nerf' | 'custom';
export type SplatFormat = 'ply' | 'splat' | 'ksplat' | 'spz' | 'compressed';
export type PhotogrammetryFormat = 'obj' | 'gltf' | 'glb' | 'usdz' | 'fbx' | 'ply';

// ─── Load Config ────────────────────────────────────────────────────────────

export interface VolumetricLoadConfig {
  /** URL to the volumetric asset. */
  url: string;

  /** Source type. Auto-detected from extension if not provided. */
  sourceType?: VolumetricSourceType;

  /** Transform to apply on load. */
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];

  /** Quality preset. Default 'medium'. */
  quality?: 'low' | 'medium' | 'high' | 'ultra';

  /** Max memory budget in MB. Default 256. */
  maxMemoryMB?: number;

  /** Enable progressive loading. Default true. */
  progressive?: boolean;

  /** LOD distance thresholds [near, mid, far] in world units. */
  lodDistances?: [number, number, number];
}

// ─── NeRF Config ────────────────────────────────────────────────────────────

export interface NerfConfig extends VolumetricLoadConfig {
  sourceType: 'nerf';

  /** NeRF model format. */
  format?: NerfFormat;

  /** Ray marching steps per pixel. Default 128. */
  marchSteps?: number;

  /** Near/far clipping planes for ray marching. */
  near?: number;
  far?: number;

  /** Whether to render as a baked mesh vs live ray-march. Default 'baked'. */
  renderMode?: 'baked' | 'raymarched';

  /** Baked mesh resolution (vertex count target). Default 100000. */
  bakedMeshResolution?: number;

  /** Camera path for training data (used by editor). */
  cameraPath?: Array<{ position: [number, number, number]; target: [number, number, number] }>;
}

// ─── Gaussian Splat Config ──────────────────────────────────────────────────

export interface GaussianSplatConfig extends VolumetricLoadConfig {
  sourceType: 'gaussian_splat';

  /** Splat file format. */
  format?: SplatFormat;

  /** Max number of splats to render. Default 1_000_000. */
  maxSplats?: number;

  /** Splat size multiplier. Default 1. */
  splatScale?: number;

  /** Sort frequency (frames between depth sorts). Default 1. */
  sortFrequency?: number;

  /** Use shared array buffer for sort worker. Default true. */
  sharedMemory?: boolean;

  /** Spherical harmonics degree (0-3). Higher = better view-dependent color. Default 0. */
  shDegree?: number;

  /** Opacity threshold for culling invisible splats. Default 0.01. */
  alphaThreshold?: number;
}

// ─── Photogrammetry Config ──────────────────────────────────────────────────

export interface PhotogrammetryConfig extends VolumetricLoadConfig {
  sourceType: 'photogrammetry';

  /** Mesh format. */
  format?: PhotogrammetryFormat;

  /** Texture resolution cap (pixels per side). Default 2048. */
  maxTextureSize?: number;

  /** Enable Draco mesh compression. Default true. */
  dracoCompression?: boolean;

  /** LOD level count. Default 3. */
  lodLevels?: number;

  /** Vertex decimation ratio per LOD level [1.0, 0.5, 0.25]. */
  decimationRatios?: number[];
}

// ─── Load Result ────────────────────────────────────────────────────────────

export interface VolumetricLoadResult {
  /** The Three.js object to add to the scene. */
  object: Object3D;

  /** Bounding box of the loaded content. */
  bounds: Box3;

  /** Center point for orbit controls. */
  center: ThreeVector3;

  /** Source metadata. */
  metadata: VolumetricMetadata;

  /** Dispose all GPU resources. Must call on cleanup. */
  dispose: () => void;

  /**
   * Per-frame LOD update function (Gaussian Splatting only).
   *
   * Call this every frame in the render loop to update LOD selection,
   * frustum-cull octree nodes, and drive geo.instanceCount.
   *
   * @param cameraX - Camera world X
   * @param cameraY - Camera world Y
   * @param cameraZ - Camera world Z
   * @param viewProjectionMatrix - Column-major 4x4 VP matrix elements (16 floats)
   *   for frustum culling. Pass null to skip frustum culling.
   * @returns Whether the visible set changed (caller should update GPU buffers)
   */
  updateLOD?: (
    cameraX: number,
    cameraY: number,
    cameraZ: number,
    viewProjectionMatrix: ArrayLike<number> | null,
  ) => {
    changed: boolean;
    visibleCount: number;
    visibleIndices: Uint32Array;
    visibilityBuffer: Uint8Array;
    /**
     * Cross-fade blending state for smooth LOD transitions.
     * When crossFade.active is true, the renderer should blend between
     * outgoing and incoming LOD levels using the provided alpha values.
     * outgoingAlpha decreases from 1->0, incomingAlpha increases from 0->1
     * over 150ms using smooth-step interpolation.
     */
    crossFade: {
      active: boolean;
      progress: number;
      outgoingAlpha: number;
      incomingAlpha: number;
    };
    /**
     * Motion-aware LOD bias state.
     * When motionBias.active is true, the LOD level has been reduced
     * to maintain framerate during fast camera movement.
     */
    motionBias: {
      active: boolean;
      levelsDropped: number;
      smoothedVelocity: number;
    };
  };
}

export interface VolumetricMetadata {
  sourceType: VolumetricSourceType;
  format: string;
  fileSize: number;
  loadTimeMs: number;
  vertexCount?: number;
  splatCount?: number;
  textureMemoryMB?: number;
  lodLevels?: number;
}

// ─── Loader Events ──────────────────────────────────────────────────────────

export type VolumetricEvent =
  | { type: 'progress'; loaded: number; total: number; phase: string }
  | { type: 'loaded'; result: VolumetricLoadResult }
  | { type: 'error'; error: Error }
  | { type: 'lod-changed'; level: number; distance: number };

export type VolumetricEventHandler = (event: VolumetricEvent) => void;

// ─── Loader Interface ───────────────────────────────────────────────────────

export interface IVolumetricLoader {
  readonly sourceType: VolumetricSourceType;
  load(config: VolumetricLoadConfig): Promise<VolumetricLoadResult>;
  canLoad(url: string): boolean;
  on(handler: VolumetricEventHandler): () => void;
}
