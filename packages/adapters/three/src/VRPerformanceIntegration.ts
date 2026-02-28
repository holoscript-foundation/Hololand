/**
 * Three.js VR Performance Integration
 *
 * Integrates VRPerformanceDegradationManager with Three.js WebGLRenderer
 * to apply quality settings dynamically based on frame time measurements.
 *
 * @module VRPerformanceIntegration
 */

import * as THREE from 'three';
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
 * Three.js-specific rendering state for quality management
 */
export interface ThreeRenderingState {
  /** WebGL renderer instance */
  renderer: THREE.WebGLRenderer;
  /** Main scene */
  scene: THREE.Scene;
  /** Camera (if applicable) */
  camera?: THREE.Camera;
  /** Shadow-casting lights */
  lights: THREE.Light[];
  /** All meshes in the scene (for LOD management) */
  meshes: THREE.Mesh[];
  /** Particle systems */
  particleSystems: THREE.Points[];
  /** Post-processing composer (if using) */
  composer?: any; // EffectComposer from three/examples/jsm/postprocessing
}

/**
 * VR Performance Manager for Three.js
 */
export class ThreeVRPerformanceManager {
  private degradationManager: VRPerformanceDegradationManager;
  private renderingState: ThreeRenderingState;
  private lastFrameTime: number = 0;
  private rafId: number | null = null;
  private isMonitoring: boolean = false;

  // Cached original settings for restoration
  private originalSettings: {
    pixelRatio: number;
    shadowMapEnabled: boolean;
    shadowMapType: THREE.ShadowMapType;
    antialias: boolean;
    toneMapping: THREE.ToneMapping;
    outputColorSpace: THREE.ColorSpace;
    meshLODs: Map<THREE.Mesh, { geometry: THREE.BufferGeometry; level: number }>;
    lightShadows: Map<THREE.Light, boolean>;
    particleCounts: Map<THREE.Points, number>;
  };

  constructor(
    renderingState: ThreeRenderingState,
    config?: Partial<DegradationConfig>
  ) {
    this.degradationManager = new VRPerformanceDegradationManager(config);
    this.renderingState = renderingState;

    // Cache original settings
    this.originalSettings = {
      pixelRatio: renderingState.renderer.getPixelRatio(),
      shadowMapEnabled: renderingState.renderer.shadowMap.enabled,
      shadowMapType: renderingState.renderer.shadowMap.type,
      antialias: renderingState.renderer.capabilities.antialias ?? false,
      toneMapping: renderingState.renderer.toneMapping,
      outputColorSpace: renderingState.renderer.outputColorSpace,
      meshLODs: new Map(),
      lightShadows: new Map(),
      particleCounts: new Map(),
    };

    // Cache mesh geometries for LOD
    for (const mesh of renderingState.meshes) {
      this.originalSettings.meshLODs.set(mesh, {
        geometry: mesh.geometry,
        level: 0,
      });
    }

    // Cache light shadow settings
    for (const light of renderingState.lights) {
      this.originalSettings.lightShadows.set(light, light.castShadow);
    }

    // Cache particle counts
    for (const particles of renderingState.particleSystems) {
      const count = particles.geometry.attributes.position?.count || 0;
      this.originalSettings.particleCounts.set(particles, count);
    }

    // Subscribe to degradation events
    this.degradationManager.onDegradationEvent(this.onDegradationEvent.bind(this));
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MONITORING & INTEGRATION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Start monitoring frame times and applying quality adjustments
   * @param renderCallback Optional callback to integrate with existing render loop
   */
  startMonitoring(renderCallback?: () => void): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.lastFrameTime = performance.now();

    // Integrate with Three.js animation loop
    this.renderingState.renderer.setAnimationLoop((time) => {
      const frameTime = time - this.lastFrameTime;
      this.lastFrameTime = time;

      // Record frame time (convert to milliseconds)
      if (frameTime > 0) {
        this.degradationManager.recordFrame(frameTime);
      }

      // Execute custom render callback
      if (renderCallback) {
        renderCallback();
      }
    });

    console.log('[ThreeVRPerformanceManager] Monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    this.renderingState.renderer.setAnimationLoop(null);

    console.log('[ThreeVRPerformanceManager] Monitoring stopped');
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
   * Apply quality settings to Three.js renderer
   */
  private applyQualitySettings(settings: QualitySettings): void {
    const { renderer, scene, lights, meshes, particleSystems, composer } = this.renderingState;

    // ─── Shadows ──────────────────────────────────────────────────────────────
    renderer.shadowMap.enabled = settings.shadowsEnabled;

    if (settings.shadowsEnabled) {
      // Update shadow resolution
      for (const light of lights) {
        if (light instanceof THREE.DirectionalLight || light instanceof THREE.SpotLight) {
          if (light.shadow) {
            light.shadow.mapSize.width = settings.shadowResolution;
            light.shadow.mapSize.height = settings.shadowResolution;
            light.shadow.needsUpdate = true;
          }
          light.castShadow = this.originalSettings.lightShadows.get(light) ?? false;
        }
      }

      // Set shadow map type based on quality
      if (settings.shadowResolution >= 2048) {
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      } else if (settings.shadowResolution >= 1024) {
        renderer.shadowMap.type = THREE.PCFShadowMap;
      } else {
        renderer.shadowMap.type = THREE.BasicShadowMap;
      }
    } else {
      // Disable all shadow casting
      for (const light of lights) {
        light.castShadow = false;
      }
    }

    // ─── Textures ─────────────────────────────────────────────────────────────
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];

        for (const material of materials) {
          if (material instanceof THREE.MeshStandardMaterial ||
              material instanceof THREE.MeshPhysicalMaterial ||
              material instanceof THREE.MeshBasicMaterial) {

            // Apply LOD bias to textures
            const textures = [
              material.map,
              material.normalMap,
              material.roughnessMap,
              material.metalnessMap,
              material.emissiveMap,
              material.aoMap,
            ].filter(Boolean) as THREE.Texture[];

            for (const texture of textures) {
              if (texture) {
                texture.anisotropy = settings.anisotropicFiltering;
                // Note: Three.js doesn't have direct LOD bias, but we can adjust minFilter
                if (settings.textureLODBias > 0) {
                  texture.minFilter = THREE.LinearMipmapLinearFilter;
                  texture.generateMipmaps = true;
                } else {
                  texture.minFilter = THREE.LinearFilter;
                }
                texture.needsUpdate = true;
              }
            }
          }
        }
      }
    });

    // ─── Pixel Ratio ──────────────────────────────────────────────────────────
    const targetPixelRatio = this.originalSettings.pixelRatio * settings.pixelRatio;
    renderer.setPixelRatio(targetPixelRatio);

    // ─── Geometry LOD ─────────────────────────────────────────────────────────
    if (settings.lodBias > 0) {
      // Apply mesh simplification (this is a placeholder - actual implementation would need LOD system)
      // In production, you'd switch to pre-created LOD geometries here
      for (const mesh of meshes) {
        if (mesh.userData.lodGeometries && mesh.userData.lodGeometries[settings.lodBias]) {
          mesh.geometry = mesh.userData.lodGeometries[settings.lodBias];
        }
      }
    } else {
      // Restore original geometries
      for (const mesh of meshes) {
        const cached = this.originalSettings.meshLODs.get(mesh);
        if (cached && cached.level !== settings.lodBias) {
          mesh.geometry = cached.geometry;
          this.originalSettings.meshLODs.set(mesh, { geometry: cached.geometry, level: 0 });
        }
      }
    }

    // ─── Particles ────────────────────────────────────────────────────────────
    for (const particles of particleSystems) {
      const originalCount = this.originalSettings.particleCounts.get(particles) || 1000;
      const targetCount = Math.floor(originalCount * settings.particleQuality);

      if (particles.geometry.attributes.position) {
        const positions = particles.geometry.attributes.position;
        // Adjust draw range to reduce visible particles
        particles.geometry.setDrawRange(0, targetCount);
      }
    }

    // ─── Lights ───────────────────────────────────────────────────────────────
    // Disable extra lights beyond maxLights
    let activeLights = 0;
    for (const light of lights) {
      if (activeLights < settings.maxLights) {
        light.visible = true;
        activeLights++;
      } else {
        light.visible = false;
      }
    }

    // ─── Post-Processing ──────────────────────────────────────────────────────
    if (composer) {
      // Disable post-processing passes based on settings
      // This requires EffectComposer from three/examples/jsm/postprocessing
      // Implementation would depend on your post-processing setup
      if (composer.passes) {
        for (const pass of composer.passes) {
          // Disable specific effects
          if (pass.name === 'BloomPass') pass.enabled = settings.bloomEnabled;
          if (pass.name === 'BokehPass') pass.enabled = settings.depthOfFieldEnabled;
          if (pass.name === 'MotionBlurPass') pass.enabled = settings.motionBlurEnabled;
          if (pass.name === 'ChromaticAberrationPass') pass.enabled = settings.chromaticAberrationEnabled;
          if (pass.name === 'VignettePass') pass.enabled = settings.vignetteEnabled;
        }
      }
    }

    console.log(`[ThreeVRPerformanceManager] Applied quality settings for level ${this.degradationManager.getCurrentLevel()}`);
  }

  /**
   * Degradation event handler
   */
  private onDegradationEvent(event: DegradationEvent): void {
    console.log(`[ThreeVRPerformanceManager] ${event.event}: L${event.fromLevel} → L${event.toLevel} | ${event.reason}`);

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
  updateRenderingState(state: Partial<ThreeRenderingState>): void {
    this.renderingState = { ...this.renderingState, ...state };

    // Re-cache new objects
    if (state.meshes) {
      for (const mesh of state.meshes) {
        if (!this.originalSettings.meshLODs.has(mesh)) {
          this.originalSettings.meshLODs.set(mesh, {
            geometry: mesh.geometry,
            level: 0,
          });
        }
      }
    }

    if (state.lights) {
      for (const light of state.lights) {
        if (!this.originalSettings.lightShadows.has(light)) {
          this.originalSettings.lightShadows.set(light, light.castShadow);
        }
      }
    }

    if (state.particleSystems) {
      for (const particles of state.particleSystems) {
        if (!this.originalSettings.particleCounts.has(particles)) {
          const count = particles.geometry.attributes.position?.count || 0;
          this.originalSettings.particleCounts.set(particles, count);
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
    const { renderer } = this.renderingState;
    renderer.setPixelRatio(this.originalSettings.pixelRatio);
    renderer.shadowMap.enabled = this.originalSettings.shadowMapEnabled;
    renderer.shadowMap.type = this.originalSettings.shadowMapType;
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
 * Scan Three.js scene to collect rendering state
 */
export function scanThreeScene(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera?: THREE.Camera
): ThreeRenderingState {
  const lights: THREE.Light[] = [];
  const meshes: THREE.Mesh[] = [];
  const particleSystems: THREE.Points[] = [];

  scene.traverse((object) => {
    if (object instanceof THREE.Light) {
      lights.push(object);
    } else if (object instanceof THREE.Mesh) {
      meshes.push(object);
    } else if (object instanceof THREE.Points) {
      particleSystems.push(object);
    }
  });

  return {
    renderer,
    scene,
    camera,
    lights,
    meshes,
    particleSystems,
  };
}

/**
 * Create and initialize VR Performance Manager for Three.js
 */
export function createThreeVRPerformanceManager(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera?: THREE.Camera,
  config?: Partial<DegradationConfig>
): ThreeVRPerformanceManager {
  const state = scanThreeScene(renderer, scene, camera);
  return new ThreeVRPerformanceManager(state, config);
}
