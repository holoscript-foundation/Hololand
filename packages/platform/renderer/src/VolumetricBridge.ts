/**
 * VolumetricBridge (Phase 4 & 5)
 *
 * Implements RendererProvider from @hololand/core TraitContextFactory,
 * connecting HoloScript's volumetric and compute trait handlers to
 * Hololand's renderer runtime.
 *
 * Wired handlers:
 *   - gaussianSplatHandler    (GSplat rendering)
 *   - nerfHandler             (NeRF rendering)
 *   - pointCloudHandler       (Point cloud rendering)
 *   - photogrammetryHandler   (Photogrammetry mesh reconstruction)
 *   - computeHandler          (WebGPU compute shaders)
 *   - gpuParticleHandler      (GPU particle systems)
 *   - gpuPhysicsHandler       (GPU-accelerated physics)
 *   - gpuBufferHandler        (Raw GPU buffer management)
 *   - volumetricVideoHandler  (Volumetric video playback)
 */

import type { RendererProvider } from '@holoscript/core';
import type { HololandRenderer } from './HololandRenderer';
import type {
  GaussianBudgetManager,
  GaussianLayerType,
  GaussianBudgetMetrics,
} from './GaussianBudgetManager';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VolumetricBridgeConfig {
  renderer: HololandRenderer;
  maxSplatCount?: number;
  enableCompute?: boolean;
  maxParticleSystems?: number;
  maxGPUBuffers?: number;
  /** Optional GaussianBudgetManager for layered splat budget enforcement */
  gaussianBudgetManager?: GaussianBudgetManager;
}

export interface GPUParticleSystem {
  nodeId: string;
  maxParticles: number;
  emitRate: number;
  lifetime: number;
  shader: string;
}

export interface GPUBufferBinding {
  nodeId: string;
  size: number;
  usage: 'storage' | 'uniform' | 'vertex' | 'index';
  data?: Float32Array | Uint32Array;
}

export interface VolumetricVideoState {
  nodeId: string;
  url: string;
  playing: boolean;
  currentTime: number;
  duration: number;
}

// ---------------------------------------------------------------------------
// Bridge
// ---------------------------------------------------------------------------

export class VolumetricBridge implements RendererProvider {
  private renderer: HololandRenderer;
  private config: Required<Omit<VolumetricBridgeConfig, 'gaussianBudgetManager'>> & {
    gaussianBudgetManager?: GaussianBudgetManager;
  };
  private renderables: Set<string> = new Set();
  private computePasses: Map<string, { shader: string; workgroups: number[] }> = new Map();
  private particleSystems: Map<string, GPUParticleSystem> = new Map();
  private gpuBuffers: Map<string, GPUBufferBinding> = new Map();
  private volumetricVideos: Map<string, VolumetricVideoState> = new Map();

  /** Layered Gaussian budget manager (optional, enables 120K+30K+10K=160K budget enforcement) */
  private gaussianBudgetManager: GaussianBudgetManager | undefined;

  constructor(config: VolumetricBridgeConfig) {
    this.renderer = config.renderer;
    this.gaussianBudgetManager = config.gaussianBudgetManager;
    this.config = {
      maxSplatCount: 1_000_000,
      enableCompute: true,
      maxParticleSystems: 32,
      maxGPUBuffers: 64,
      ...config,
    };
  }

  // ---- 1. gaussianSplatHandler --------------------------------------------

  createGaussianSplat(nodeId: string, config: Record<string, unknown>): void {
    if (this.renderables.has(nodeId)) return;

    // If budget manager is available, register the splat for budget tracking
    if (this.gaussianBudgetManager) {
      const layer = (config.layer as GaussianLayerType) ?? 'baked';
      const splatCount = (config.splatCount as number) ?? 10_000;
      const priority = (config.priority as number) ?? 0;
      const pinned = (config.pinned as boolean) ?? false;

      const accepted = this.gaussianBudgetManager.registerSplat({
        id: nodeId,
        layer,
        baseSplatCount: splatCount,
        priority,
        pinned,
      });

      if (!accepted) return; // Budget exceeded, reject creation
    }

    this.renderables.add(nodeId);
    // Proxy to renderer's GSplat pipeline
    // this.renderer.addGaussianSplat(nodeId, config);
  }

  updateGaussianSplat(nodeId: string, config: Record<string, unknown>): void {
    if (!this.renderables.has(nodeId)) return;

    // If budget manager is available, update splat properties
    if (this.gaussianBudgetManager && config.splatCount !== undefined) {
      this.gaussianBudgetManager.updateSplatCount(nodeId, config.splatCount as number);
    }

    // this.renderer.updateGaussianSplat(nodeId, config);
  }

  /**
   * Promote a Gaussian splat to a different rendering layer.
   * E.g., baked -> interactive when an object is grabbed.
   */
  promoteGaussianSplat(nodeId: string, targetLayer: GaussianLayerType): boolean {
    if (!this.gaussianBudgetManager) return false;
    return this.gaussianBudgetManager.promoteSplat(nodeId, targetLayer);
  }

  /**
   * Get the Gaussian budget manager for direct access to metrics/config.
   */
  getGaussianBudgetManager(): GaussianBudgetManager | undefined {
    return this.gaussianBudgetManager;
  }

  /**
   * Get Gaussian budget metrics snapshot.
   */
  getGaussianBudgetMetrics(): GaussianBudgetMetrics | null {
    return this.gaussianBudgetManager?.getMetrics() ?? null;
  }

  // ---- 2. nerfHandler -----------------------------------------------------

  createNeRF(
    nodeId: string,
    config: {
      modelUrl: string;
      resolution?: number;
      samplesPerRay?: number;
    }
  ): void {
    if (this.renderables.has(nodeId)) return;
    this.renderables.add(nodeId);
    // this.renderer.addNeRF(nodeId, config);
  }

  updateNeRF(nodeId: string, config: Record<string, unknown>): void {
    if (!this.renderables.has(nodeId)) return;
    // this.renderer.updateNeRF(nodeId, config);
  }

  // ---- 3. pointCloudHandler -----------------------------------------------

  createPointCloud(nodeId: string, config: Record<string, unknown>): void {
    if (this.renderables.has(nodeId)) return;
    this.renderables.add(nodeId);
    // this.renderer.addPointCloud(nodeId, config);
  }

  updatePointCloud(nodeId: string, config: Record<string, unknown>): void {
    if (!this.renderables.has(nodeId)) return;
    // this.renderer.updatePointCloud(nodeId, config);
  }

  // ---- 4. photogrammetryHandler -------------------------------------------

  createPhotogrammetry(
    nodeId: string,
    config: {
      meshUrl: string;
      textureUrl?: string;
      lodLevels?: number;
    }
  ): void {
    if (this.renderables.has(nodeId)) return;
    this.renderables.add(nodeId);
    // this.renderer.addPhotogrammetryMesh(nodeId, config);
  }

  // ---- 5. computeHandler --------------------------------------------------

  dispatchCompute(nodeId: string, shader: string, workgroups: number[]): void {
    if (!this.config.enableCompute) return;
    this.computePasses.set(nodeId, { shader, workgroups });
    // this.renderer.dispatchCompute(nodeId, shader, workgroups);
  }

  removeComputePass(nodeId: string): void {
    this.computePasses.delete(nodeId);
  }

  // ---- 6. gpuParticleHandler ----------------------------------------------

  createGPUParticleSystem(
    nodeId: string,
    config: {
      maxParticles: number;
      emitRate: number;
      lifetime: number;
      shader?: string;
    }
  ): void {
    if (this.particleSystems.size >= this.config.maxParticleSystems) return;
    if (this.particleSystems.has(nodeId)) return;

    const system: GPUParticleSystem = {
      nodeId,
      maxParticles: config.maxParticles,
      emitRate: config.emitRate,
      lifetime: config.lifetime,
      shader: config.shader ?? 'default_particle',
    };
    this.particleSystems.set(nodeId, system);
    // this.renderer.createGPUParticleSystem(nodeId, system);
  }

  updateGPUParticleSystem(nodeId: string, config: Partial<GPUParticleSystem>): void {
    const system = this.particleSystems.get(nodeId);
    if (!system) return;
    Object.assign(system, config);
    // this.renderer.updateGPUParticleSystem(nodeId, system);
  }

  destroyGPUParticleSystem(nodeId: string): void {
    this.particleSystems.delete(nodeId);
    // this.renderer.destroyGPUParticleSystem(nodeId);
  }

  // ---- 7. gpuPhysicsHandler -----------------------------------------------

  dispatchGPUPhysics(
    nodeId: string,
    config: {
      shader: string;
      bodyCount: number;
      constraintCount?: number;
      substeps?: number;
    }
  ): void {
    if (!this.config.enableCompute) return;
    this.computePasses.set(`physics_${nodeId}`, {
      shader: config.shader,
      workgroups: [Math.ceil(config.bodyCount / 64), 1, 1],
    });
    // this.renderer.dispatchGPUPhysics(nodeId, config);
  }

  // ---- 8. gpuBufferHandler ------------------------------------------------

  createGPUBuffer(
    nodeId: string,
    config: {
      size: number;
      usage: 'storage' | 'uniform' | 'vertex' | 'index';
      data?: Float32Array | Uint32Array;
    }
  ): void {
    if (this.gpuBuffers.size >= this.config.maxGPUBuffers) return;

    const binding: GPUBufferBinding = {
      nodeId,
      size: config.size,
      usage: config.usage,
      data: config.data,
    };
    this.gpuBuffers.set(nodeId, binding);
    // this.renderer.createGPUBuffer(nodeId, binding);
  }

  updateGPUBuffer(nodeId: string, data: Float32Array | Uint32Array, offset?: number): void {
    const binding = this.gpuBuffers.get(nodeId);
    if (!binding) return;
    // this.renderer.updateGPUBuffer(nodeId, data, offset ?? 0);
  }

  destroyGPUBuffer(nodeId: string): void {
    this.gpuBuffers.delete(nodeId);
    // this.renderer.destroyGPUBuffer(nodeId);
  }

  // ---- 9. volumetricVideoHandler ------------------------------------------

  createVolumetricVideo(
    nodeId: string,
    config: {
      url: string;
      autoplay?: boolean;
      loop?: boolean;
    }
  ): void {
    if (this.renderables.has(nodeId)) return;
    this.renderables.add(nodeId);

    const state: VolumetricVideoState = {
      nodeId,
      url: config.url,
      playing: config.autoplay ?? false,
      currentTime: 0,
      duration: 0,
    };
    this.volumetricVideos.set(nodeId, state);
    // this.renderer.createVolumetricVideo(nodeId, config);
  }

  playVolumetricVideo(nodeId: string): void {
    const state = this.volumetricVideos.get(nodeId);
    if (state) state.playing = true;
  }

  pauseVolumetricVideo(nodeId: string): void {
    const state = this.volumetricVideos.get(nodeId);
    if (state) state.playing = false;
  }

  seekVolumetricVideo(nodeId: string, time: number): void {
    const state = this.volumetricVideos.get(nodeId);
    if (state) state.currentTime = time;
  }

  // ---- Destroy all --------------------------------------------------------

  destroyRenderable(nodeId: string): void {
    this.renderables.delete(nodeId);
    this.computePasses.delete(nodeId);
    this.computePasses.delete(`physics_${nodeId}`);
    this.particleSystems.delete(nodeId);
    this.gpuBuffers.delete(nodeId);
    this.volumetricVideos.delete(nodeId);

    // Unregister from Gaussian budget manager if tracked
    if (this.gaussianBudgetManager) {
      this.gaussianBudgetManager.unregisterSplat(nodeId);
    }

    // this.renderer.removeRenderable(nodeId);
  }

  // ---- Stats --------------------------------------------------------------

  getStats(): {
    activeRenderables: number;
    activeComputePasses: number;
    activeParticleSystems: number;
    activeGPUBuffers: number;
    activeVolumetricVideos: number;
    gaussianBudget: GaussianBudgetMetrics | null;
  } {
    return {
      activeRenderables: this.renderables.size,
      activeComputePasses: this.computePasses.size,
      activeParticleSystems: this.particleSystems.size,
      activeGPUBuffers: this.gpuBuffers.size,
      activeVolumetricVideos: this.volumetricVideos.size,
      gaussianBudget: this.getGaussianBudgetMetrics(),
    };
  }

  dispose(): void {
    this.renderables.clear();
    this.computePasses.clear();
    this.particleSystems.clear();
    this.gpuBuffers.clear();
    this.volumetricVideos.clear();

    if (this.gaussianBudgetManager) {
      this.gaussianBudgetManager.dispose();
    }
  }
}

export function createVolumetricBridge(config: VolumetricBridgeConfig): VolumetricBridge {
  return new VolumetricBridge(config);
}
