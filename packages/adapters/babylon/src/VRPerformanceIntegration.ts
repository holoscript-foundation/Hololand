/**
 * Babylon.js VR Performance Integration
 *
 * Integrates VRPerformanceDegradationManager with Babylon.js Engine
 * to apply quality settings dynamically based on frame time measurements.
 *
 * @module VRPerformanceIntegration
 */

import {
  Scene,
  Engine,
  Camera,
  Light,
  DirectionalLight,
  SpotLight,
  ShadowGenerator,
  Mesh,
  AbstractMesh,
  ParticleSystem,
  Texture,
  StandardMaterial,
  PBRMaterial,
} from '@babylonjs/core';
import {
  VRPerformanceDegradationManager,
  QualitySettings,
  QualityLevel,
  DegradationEvent,
  type DegradationConfig,
} from '../../shared/VRPerformanceDegradationManager';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Babylon.js-specific rendering state for quality management
 */
export interface BabylonRenderingState {
  /** Babylon.js engine instance */
  engine: Engine;
  /** Main scene */
  scene: Scene;
  /** Camera (if applicable) */
  camera?: Camera;
  /** Shadow generators */
  shadowGenerators: ShadowGenerator[];
  /** All meshes in the scene */
  meshes: AbstractMesh[];
  /** Particle systems */
  particleSystems: ParticleSystem[];
  /** Lights */
  lights: Light[];
}

/**
 * VR Performance Manager for Babylon.js
 */
export class BabylonVRPerformanceManager {
  private degradationManager: VRPerformanceDegradationManager;
  private renderingState: BabylonRenderingState;
  private lastFrameTime: number = 0;
  private isMonitoring: boolean = false;
  private renderObserver: any = null;

  // Cached original settings for restoration
  private originalSettings: {
    hardwareScaling: number;
    shadowsEnabled: Map<ShadowGenerator, boolean>;
    shadowMapSizes: Map<ShadowGenerator, number>;
    meshLODs: Map<AbstractMesh, { level: number }>;
    particleCounts: Map<ParticleSystem, number>;
    lightRanges: Map<Light, number>;
    textureSettings: Map<Texture, { anisotropy: number; samplingMode: number }>;
  };

  constructor(
    renderingState: BabylonRenderingState,
    config?: Partial<DegradationConfig>
  ) {
    this.degradationManager = new VRPerformanceDegradationManager(config);
    this.renderingState = renderingState;

    // Cache original settings
    this.originalSettings = {
      hardwareScaling: renderingState.engine.getHardwareScalingLevel(),
      shadowsEnabled: new Map(),
      shadowMapSizes: new Map(),
      meshLODs: new Map(),
      particleCounts: new Map(),
      lightRanges: new Map(),
      textureSettings: new Map(),
    };

    // Cache shadow generator settings
    for (const shadowGen of renderingState.shadowGenerators) {
      this.originalSettings.shadowMapSizes.set(shadowGen, shadowGen.getShadowMap()?.getSize().width || 1024);
      this.originalSettings.shadowsEnabled.set(shadowGen, true);
    }

    // Cache mesh LOD levels
    for (const mesh of renderingState.meshes) {
      this.originalSettings.meshLODs.set(mesh, { level: 0 });
    }

    // Cache particle system settings
    for (const particles of renderingState.particleSystems) {
      this.originalSettings.particleCounts.set(particles, particles.getCapacity());
    }

    // Cache light ranges
    for (const light of renderingState.lights) {
      this.originalSettings.lightRanges.set(light, light.range);
    }

    // Cache texture settings
    renderingState.scene.textures.forEach((texture) => {
      this.originalSettings.textureSettings.set(texture, {
        anisotropy: texture.anisotropicFilteringLevel,
        samplingMode: texture.samplingMode,
      });
    });

    // Subscribe to degradation events
    this.degradationManager.onDegradationEvent(this.onDegradationEvent.bind(this));
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MONITORING & INTEGRATION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Start monitoring frame times and applying quality adjustments
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.lastFrameTime = performance.now();

    // Register render loop observer
    this.renderObserver = this.renderingState.scene.onAfterRenderObservable.add(() => {
      const now = performance.now();
      const frameTime = now - this.lastFrameTime;
      this.lastFrameTime = now;

      // Record frame time
      if (frameTime > 0) {
        this.degradationManager.recordFrame(frameTime);
      }
    });

    console.log('[BabylonVRPerformanceManager] Monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.renderObserver) {
      this.renderingState.scene.onAfterRenderObservable.remove(this.renderObserver);
      this.renderObserver = null;
    }

    console.log('[BabylonVRPerformanceManager] Monitoring stopped');
  }

  /**
   * Manually record a frame time (for custom render loops)
   */
  recordFrame(frameTime: number): void {
    this.degradationManager.recordFrame(frameTime);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // QUALITY APPLICATION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Apply quality settings to Babylon.js engine and scene
   */
  private applyQualitySettings(settings: QualitySettings): void {
    const { engine, scene, shadowGenerators, meshes, particleSystems, lights } = this.renderingState;

    // ─── Hardware Scaling (Pixel Ratio) ───────────────────────────────────────
    const targetScaling = this.originalSettings.hardwareScaling / settings.pixelRatio;
    engine.setHardwareScalingLevel(targetScaling);

    // ─── Shadows ──────────────────────────────────────────────────────────────
    if (settings.shadowsEnabled) {
      for (const shadowGen of shadowGenerators) {
        // Update shadow map size
        const shadowMap = shadowGen.getShadowMap();
        if (shadowMap) {
          shadowMap.renderList = shadowMap.renderList; // Trigger update
          shadowGen.getShadowMap()?.refreshRate = 1;
        }

        // Set shadow quality based on resolution
        if (settings.shadowResolution >= 2048) {
          shadowGen.usePercentageCloserFiltering = true;
          shadowGen.filteringQuality = 2; // High quality
        } else if (settings.shadowResolution >= 1024) {
          shadowGen.usePercentageCloserFiltering = true;
          shadowGen.filteringQuality = 1; // Medium quality
        } else {
          shadowGen.usePercentageCloserFiltering = false;
          shadowGen.usePoissonSampling = true;
        }
      }
    } else {
      // Disable shadows
      for (const shadowGen of shadowGenerators) {
        shadowGen.getShadowMap()?.refreshRate = 0; // Stop updating shadow map
      }
    }

    // ─── Textures ─────────────────────────────────────────────────────────────
    scene.textures.forEach((texture) => {
      if (texture instanceof Texture) {
        // Set anisotropic filtering
        texture.anisotropicFilteringLevel = settings.anisotropicFiltering;

        // Adjust sampling mode based on quality
        if (settings.textureLODBias > 1) {
          texture.samplingMode = Texture.BILINEAR_SAMPLINGMODE;
        } else if (settings.textureLODBias > 0) {
          texture.samplingMode = Texture.TRILINEAR_SAMPLINGMODE;
        } else {
          texture.samplingMode = Texture.TRILINEAR_SAMPLINGMODE;
        }

        texture.updateSamplingMode(texture.samplingMode);
      }
    });

    // ─── Geometry LOD ─────────────────────────────────────────────────────────
    if (settings.lodBias > 0) {
      for (const mesh of meshes) {
        if (mesh instanceof Mesh) {
          // Use built-in LOD system if available
          if (mesh.metadata?.lodLevels && mesh.metadata.lodLevels[settings.lodBias]) {
            const lodMesh = mesh.metadata.lodLevels[settings.lodBias];
            mesh.setEnabled(false);
            lodMesh.setEnabled(true);
          }

          // Alternatively, use mesh simplification
          if (settings.meshSimplification < 1.0 && mesh.simplify) {
            const targetTriangles = Math.floor(
              mesh.getTotalVertices() * settings.meshSimplification
            );
            // Note: Actual simplification would require BABYLON.SceneOptimizer
          }
        }
      }
    } else {
      // Restore original LOD
      for (const mesh of meshes) {
        if (mesh instanceof Mesh && mesh.metadata?.lodLevels) {
          mesh.setEnabled(true);
          Object.values(mesh.metadata.lodLevels).forEach((lodMesh: any) => {
            if (lodMesh !== mesh) lodMesh.setEnabled(false);
          });
        }
      }
    }

    // ─── Particles ────────────────────────────────────────────────────────────
    for (const particles of particleSystems) {
      const originalCount = this.originalSettings.particleCounts.get(particles) || 1000;
      const targetCount = Math.floor(originalCount * settings.particleQuality);

      // Update particle capacity
      particles.updateFunction = (particles) => {
        // Limit active particles
        if (particles.length > targetCount) {
          particles.splice(targetCount);
        }
      };
    }

    // ─── Lights ───────────────────────────────────────────────────────────────
    // Disable extra lights beyond maxLights
    let activeLights = 0;
    for (const light of lights) {
      if (activeLights < settings.maxLights) {
        light.setEnabled(true);
        activeLights++;
      } else {
        light.setEnabled(false);
      }
    }

    // Adjust light ranges for performance
    for (const light of lights) {
      if (light.range) {
        const originalRange = this.originalSettings.lightRanges.get(light) || 100;
        // Reduce range at lower quality levels
        const rangeFactor = 1.0 - (settings.lodBias * 0.2);
        light.range = originalRange * rangeFactor;
      }
    }

    // ─── Post-Processing ──────────────────────────────────────────────────────
    // Disable post-processing pipeline if not enabled
    if (scene.postProcessRenderPipelineManager) {
      const pipelines = scene.postProcessRenderPipelineManager.supportedPipelines;

      for (const pipeline of pipelines) {
        // Disable specific effects based on settings
        if (pipeline.name === 'bloom' || pipeline.name === 'glow') {
          (pipeline as any).isEnabled = settings.bloomEnabled;
        }
        if (pipeline.name === 'depthOfField') {
          (pipeline as any).isEnabled = settings.depthOfFieldEnabled;
        }
        if (pipeline.name === 'motionBlur') {
          (pipeline as any).isEnabled = settings.motionBlurEnabled;
        }
        if (pipeline.name === 'chromaticAberration') {
          (pipeline as any).isEnabled = settings.chromaticAberrationEnabled;
        }
      }
    }

    // ─── Ambient Occlusion ────────────────────────────────────────────────────
    if (scene.enablePrePassRenderer) {
      const prePassRenderer = scene.enablePrePassRenderer();
      if (prePassRenderer && !settings.ambientOcclusionEnabled) {
        // Disable SSAO if present
        const ssao = scene.postProcessRenderPipelineManager?.supportedPipelines.find(
          (p: any) => p.name === 'ssao' || p.name === 'ssao2'
        );
        if (ssao) {
          (ssao as any).isEnabled = false;
        }
      }
    }

    console.log(`[BabylonVRPerformanceManager] Applied quality settings for level ${this.degradationManager.getCurrentLevel()}`);
  }

  /**
   * Degradation event handler
   */
  private onDegradationEvent(event: DegradationEvent): void {
    console.log(`[BabylonVRPerformanceManager] ${event.event}: L${event.fromLevel} → L${event.toLevel} | ${event.reason}`);

    // Apply new quality settings
    const settings = this.degradationManager.getCurrentQualitySettings();
    this.applyQualitySettings(settings);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Get the underlying degradation manager
   */
  getDegradationManager(): VRPerformanceDegradationManager {
    return this.degradationManager;
  }

  /**
   * Update rendering state (call when scene changes)
   */
  updateRenderingState(state: Partial<BabylonRenderingState>): void {
    this.renderingState = { ...this.renderingState, ...state };

    // Re-cache new objects
    if (state.meshes) {
      for (const mesh of state.meshes) {
        if (!this.originalSettings.meshLODs.has(mesh)) {
          this.originalSettings.meshLODs.set(mesh, { level: 0 });
        }
      }
    }

    if (state.shadowGenerators) {
      for (const shadowGen of state.shadowGenerators) {
        if (!this.originalSettings.shadowMapSizes.has(shadowGen)) {
          const size = shadowGen.getShadowMap()?.getSize().width || 1024;
          this.originalSettings.shadowMapSizes.set(shadowGen, size);
          this.originalSettings.shadowsEnabled.set(shadowGen, true);
        }
      }
    }

    if (state.particleSystems) {
      for (const particles of state.particleSystems) {
        if (!this.originalSettings.particleCounts.has(particles)) {
          this.originalSettings.particleCounts.set(particles, particles.getCapacity());
        }
      }
    }

    if (state.lights) {
      for (const light of state.lights) {
        if (!this.originalSettings.lightRanges.has(light)) {
          this.originalSettings.lightRanges.set(light, light.range);
        }
      }
    }
  }

  /**
   * Manually set quality level
   */
  setQualityLevel(level: QualityLevel, lock: boolean = false): void {
    this.degradationManager.setQualityLevel(level, lock);
  }

  /**
   * Unlock quality level
   */
  unlockQualityLevel(): void {
    this.degradationManager.unlockQualityLevel();
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return this.degradationManager.getMetrics();
  }

  /**
   * Generate report
   */
  generateReport(): string {
    return this.degradationManager.generateReport();
  }

  /**
   * Reset manager
   */
  reset(): void {
    this.degradationManager.reset();

    // Restore original settings
    const { engine } = this.renderingState;
    engine.setHardwareScalingLevel(this.originalSettings.hardwareScaling);
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.stopMonitoring();
    this.reset();
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Scan Babylon.js scene to collect rendering state
 */
export function scanBabylonScene(
  engine: Engine,
  scene: Scene,
  camera?: Camera
): BabylonRenderingState {
  const shadowGenerators: ShadowGenerator[] = [];
  const lights = scene.lights;
  const meshes = scene.meshes;
  const particleSystems = scene.particleSystems;

  // Collect shadow generators from lights
  lights.forEach((light) => {
    if (light instanceof DirectionalLight || light instanceof SpotLight) {
      const shadowGen = light.getShadowGenerator();
      if (shadowGen) {
        shadowGenerators.push(shadowGen);
      }
    }
  });

  return {
    engine,
    scene,
    camera,
    shadowGenerators,
    meshes,
    particleSystems,
    lights,
  };
}

/**
 * Create and initialize VR Performance Manager for Babylon.js
 */
export function createBabylonVRPerformanceManager(
  engine: Engine,
  scene: Scene,
  camera?: Camera,
  config?: Partial<DegradationConfig>
): BabylonVRPerformanceManager {
  const state = scanBabylonScene(engine, scene, camera);
  return new BabylonVRPerformanceManager(state, config);
}
