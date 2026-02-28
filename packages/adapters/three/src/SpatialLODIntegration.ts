/**
 * Three.js Spatial LOD Integration
 *
 * Integrates SpatialLODManager with Three.js scenes to apply distance-based
 * LOD optimization following the "Lost in Middle" strategy.
 *
 * @module SpatialLODIntegration
 */

import * as THREE from 'three';
import {
  SpatialLODManager,
  LODObject,
  LODLevel,
  SpatialZone,
  ViewerPosition,
  type SpatialLODConfig,
  type SpatialLODMetrics,
  calculateRecommendedZones,
} from '../../shared/SpatialLODManager';
import { VRPerformanceDegradationManager } from '../../shared/VRPerformanceDegradationManager';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Three.js scene state for spatial LOD
 */
export interface ThreeSpatialLODState {
  /** Three.js scene */
  scene: THREE.Scene;
  /** Camera (for viewer position) */
  camera: THREE.Camera;
  /** Renderer instance (for frame time tracking) */
  renderer?: THREE.WebGLRenderer;
  /** Performance degradation manager (optional integration) */
  performanceManager?: VRPerformanceDegradationManager;
}

/**
 * LOD mesh configuration
 */
export interface LODMeshConfig {
  /** Mesh ID (unique identifier) */
  id: string;
  /** Three.js mesh object */
  mesh: THREE.Mesh;
  /** LOD geometries (LOD0-LOD3) */
  lodGeometries: {
    lod0?: THREE.BufferGeometry;
    lod1?: THREE.BufferGeometry;
    lod2?: THREE.BufferGeometry;
    lod3?: THREE.BufferGeometry;
    impostor?: THREE.BufferGeometry;
  };
  /** Performance priority (0-1) */
  priority?: number;
  /** Always use high quality */
  alwaysHighQuality?: boolean;
}

// =============================================================================
// THREE.JS SPATIAL LOD INTEGRATION
// =============================================================================

/**
 * Manages spatial LOD optimization for Three.js scenes
 *
 * USAGE:
 * ```typescript
 * const integration = new ThreeSpatialLODIntegration(scene, camera);
 *
 * // Register meshes with LOD geometries
 * integration.registerMesh({
 *   id: 'tree_01',
 *   mesh: treeMesh,
 *   lodGeometries: {
 *     lod0: highPolyGeometry,
 *     lod2: mediumPolyGeometry,
 *     impostor: billboardGeometry,
 *   },
 * });
 *
 * // Update in render loop
 * function render() {
 *   integration.update(performance.now());
 *   renderer.render(scene, camera);
 * }
 * ```
 */
export class ThreeSpatialLODIntegration {
  private spatialLODManager: SpatialLODManager;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer?: THREE.WebGLRenderer;
  private performanceManager?: VRPerformanceDegradationManager;
  private meshRegistry: Map<string, THREE.Mesh> = new Map();
  private lastFrameTime: number = 0;
  private isActive: boolean = true;

  constructor(state: ThreeSpatialLODState, config?: Partial<SpatialLODConfig>) {
    this.scene = state.scene;
    this.camera = state.camera;
    this.renderer = state.renderer;
    this.performanceManager = state.performanceManager;

    // Calculate recommended zones based on scene bounds
    const sceneBounds = this.calculateSceneBounds();
    const recommendedZones = calculateRecommendedZones(sceneBounds);

    this.spatialLODManager = new SpatialLODManager({
      zones: recommendedZones,
      ...config,
    });

    console.log('[ThreeSpatialLODIntegration] Initialized with recommended zones:', recommendedZones);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MESH REGISTRATION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Register a mesh for spatial LOD management
   */
  registerMesh(config: LODMeshConfig): void {
    const { id, mesh, lodGeometries, priority = 0.5, alwaysHighQuality = false } = config;

    // Build LOD geometry map
    const lodMap = new Map<LODLevel, THREE.BufferGeometry>();
    if (lodGeometries.lod0) lodMap.set(LODLevel.LOD0, lodGeometries.lod0);
    if (lodGeometries.lod1) lodMap.set(LODLevel.LOD1, lodGeometries.lod1);
    if (lodGeometries.lod2) lodMap.set(LODLevel.LOD2, lodGeometries.lod2);
    if (lodGeometries.lod3) lodMap.set(LODLevel.LOD3, lodGeometries.lod3);
    if (lodGeometries.impostor) lodMap.set(LODLevel.IMPOSTOR, lodGeometries.impostor);

    // If no LOD geometries provided, use original geometry for all levels
    if (lodMap.size === 0) {
      lodMap.set(LODLevel.LOD0, mesh.geometry);
      console.warn(`[ThreeSpatialLODIntegration] No LOD geometries for ${id}, using original geometry`);
    }

    // Register with spatial LOD manager
    this.spatialLODManager.registerObject({
      id,
      position: mesh.position,
      lodGeometries: lodMap,
      priority,
      alwaysHighQuality,
    });

    // Store mesh reference
    this.meshRegistry.set(id, mesh);

    console.log(`[ThreeSpatialLODIntegration] Registered mesh: ${id} (${lodMap.size} LOD levels)`);
  }

  /**
   * Unregister a mesh
   */
  unregisterMesh(id: string): void {
    this.spatialLODManager.unregisterObject(id);
    this.meshRegistry.delete(id);
  }

  /**
   * Auto-register all meshes in scene with LOD groups
   */
  autoRegisterLODMeshes(): number {
    let registered = 0;

    this.scene.traverse((object) => {
      if (object instanceof THREE.LOD) {
        // Extract LOD levels from THREE.LOD object
        const lodMesh = object.children[0] as THREE.Mesh | undefined;
        if (!lodMesh) return;

        const lodGeometries: LODMeshConfig['lodGeometries'] = {};

        // Three.js LOD levels are stored in object.levels
        for (let i = 0; i < object.levels.length; i++) {
          const level = object.levels[i];
          const levelMesh = level.object as THREE.Mesh;

          if (levelMesh && levelMesh.geometry) {
            // Map Three.js LOD levels to our LOD levels
            if (i === 0) lodGeometries.lod0 = levelMesh.geometry;
            else if (i === 1) lodGeometries.lod1 = levelMesh.geometry;
            else if (i === 2) lodGeometries.lod2 = levelMesh.geometry;
            else if (i === 3) lodGeometries.lod3 = levelMesh.geometry;
          }
        }

        this.registerMesh({
          id: object.uuid,
          mesh: lodMesh,
          lodGeometries,
        });

        registered++;
      } else if (object instanceof THREE.Mesh && object.userData.lodGeometries) {
        // Support custom LOD geometries stored in userData
        this.registerMesh({
          id: object.uuid,
          mesh: object,
          lodGeometries: object.userData.lodGeometries,
        });

        registered++;
      }
    });

    console.log(`[ThreeSpatialLODIntegration] Auto-registered ${registered} LOD meshes`);
    return registered;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // UPDATE LOOP
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Update spatial LOD (call once per frame)
   */
  update(time: number): void {
    if (!this.isActive) return;

    // Calculate frame time
    const frameTime = time - this.lastFrameTime;
    this.lastFrameTime = time;

    // Get viewer position from camera
    const viewerPosition: ViewerPosition = {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z,
    };

    // Update object positions in spatial manager
    for (const [id, mesh] of this.meshRegistry.entries()) {
      mesh.getWorldPosition(mesh.position); // Ensure world position is current
      this.spatialLODManager.updateObjectPosition(id, mesh.position);
    }

    // Update spatial LOD manager
    this.spatialLODManager.update(viewerPosition, frameTime);

    // Apply pending LOD changes
    this.applyLODChanges();
  }

  /**
   * Apply pending LOD geometry changes to meshes
   */
  private applyLODChanges(): void {
    const changes = this.spatialLODManager.getPendingLODChanges();

    for (const [objectId, newLOD] of changes.entries()) {
      const mesh = this.meshRegistry.get(objectId);
      if (!mesh) continue;

      // Get LOD object from manager
      const lodObjects = this.spatialLODManager.getObjects();
      const lodObject = lodObjects.find(obj => obj.id === objectId);
      if (!lodObject) continue;

      // Get new geometry
      const newGeometry = lodObject.lodGeometries.get(newLOD);
      if (!newGeometry) {
        console.warn(`[ThreeSpatialLODIntegration] No geometry for ${objectId} at LOD${newLOD}`);
        continue;
      }

      // Apply geometry change
      const oldGeometry = mesh.geometry;
      mesh.geometry = newGeometry as THREE.BufferGeometry;

      // Optional: Dispose old geometry if it's not referenced elsewhere
      // (Be careful with this - only dispose if you're sure it's not used)
      // oldGeometry.dispose();
    }

    // Clear pending changes
    this.spatialLODManager.clearPendingChanges();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENE ANALYSIS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Calculate scene bounding box
   */
  private calculateSceneBounds(): {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  } {
    const box = new THREE.Box3();
    box.setFromObject(this.scene);

    return {
      min: { x: box.min.x, y: box.min.y, z: box.min.z },
      max: { x: box.max.x, y: box.max.y, z: box.max.z },
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // INTEGRATION WITH VR PERFORMANCE MANAGER
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Sync with VR Performance Degradation Manager
   * Adjusts spatial LOD aggressiveness based on overall performance state
   */
  syncWithPerformanceManager(): void {
    if (!this.performanceManager) return;

    const metrics = this.performanceManager.getMetrics();
    const currentLevel = this.performanceManager.getCurrentLevel();

    // Enable aggressive middle reduction if performance degradation is active
    const enableAggressive = currentLevel >= 2; // Level 2+ = performance issues

    this.spatialLODManager.updateConfig({
      enableAggressiveMiddleReduction: enableAggressive,
    });

    if (enableAggressive) {
      console.log('[ThreeSpatialLODIntegration] Enabled aggressive middle-range reduction (performance degradation active)');
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Get spatial LOD metrics
   */
  getMetrics(): SpatialLODMetrics {
    return this.spatialLODManager.getMetrics();
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    return this.spatialLODManager.generateReport();
  }

  /**
   * Enable/disable spatial LOD
   */
  setActive(active: boolean): void {
    this.isActive = active;
  }

  /**
   * Check if active
   */
  isEnabled(): boolean {
    return this.isActive;
  }

  /**
   * Force update all objects
   */
  forceUpdate(): void {
    const viewerPosition: ViewerPosition = {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z,
    };

    this.spatialLODManager.forceUpdateAll(viewerPosition, this.lastFrameTime);
    this.applyLODChanges();
  }

  /**
   * Reset spatial LOD state
   */
  reset(): void {
    this.spatialLODManager.reset();
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.meshRegistry.clear();
    this.isActive = false;
  }

  /**
   * Get underlying spatial LOD manager
   */
  getSpatialLODManager(): SpatialLODManager {
    return this.spatialLODManager;
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create simplified LOD geometries from a high-poly geometry
 */
export function generateLODGeometries(
  highPolyGeometry: THREE.BufferGeometry,
  options?: {
    lod1Ratio?: number; // Default: 0.75
    lod2Ratio?: number; // Default: 0.5
    lod3Ratio?: number; // Default: 0.25
    generateImpostor?: boolean; // Default: false
  }
): {
  lod0: THREE.BufferGeometry;
  lod1?: THREE.BufferGeometry;
  lod2?: THREE.BufferGeometry;
  lod3?: THREE.BufferGeometry;
  impostor?: THREE.BufferGeometry;
} {
  const {
    lod1Ratio = 0.75,
    lod2Ratio = 0.5,
    lod3Ratio = 0.25,
    generateImpostor = false,
  } = options || {};

  const lods: ReturnType<typeof generateLODGeometries> = {
    lod0: highPolyGeometry.clone(),
  };

  // Generate simplified geometries
  // Note: Three.js doesn't have built-in mesh simplification
  // You would typically use external libraries like:
  // - three-mesh-bvh for simplification
  // - Or pre-generate LODs in 3D modeling software (Blender, Maya)

  // Placeholder: Use SimplifyModifier from three/examples/jsm/modifiers/SimplifyModifier
  // For production, pre-generate LODs in asset pipeline

  // LOD1 - 75% of original
  if (lod1Ratio < 1.0) {
    lods.lod1 = simplifyGeometry(highPolyGeometry, lod1Ratio);
  }

  // LOD2 - 50% of original
  if (lod2Ratio < 1.0) {
    lods.lod2 = simplifyGeometry(highPolyGeometry, lod2Ratio);
  }

  // LOD3 - 25% of original
  if (lod3Ratio < 1.0) {
    lods.lod3 = simplifyGeometry(highPolyGeometry, lod3Ratio);
  }

  // Impostor - Billboard sprite
  if (generateImpostor) {
    lods.impostor = createBillboardGeometry();
  }

  return lods;
}

/**
 * Simplify geometry (placeholder - implement with SimplifyModifier or external tool)
 */
function simplifyGeometry(geometry: THREE.BufferGeometry, ratio: number): THREE.BufferGeometry {
  // PLACEHOLDER: In production, use SimplifyModifier from three/examples/jsm/modifiers/SimplifyModifier
  // or pre-generate LODs in asset pipeline (Blender, Maya)

  const simplified = geometry.clone();
  // Apply simplification algorithm here
  // For now, just return clone (no actual simplification)

  console.warn('[simplifyGeometry] Using placeholder - implement SimplifyModifier for production');
  return simplified;
}

/**
 * Create billboard geometry for impostor
 */
function createBillboardGeometry(): THREE.BufferGeometry {
  // Create simple 2-triangle quad
  const geometry = new THREE.PlaneGeometry(1, 1);
  return geometry;
}

/**
 * Create Three.js Spatial LOD Integration
 */
export function createThreeSpatialLOD(
  scene: THREE.Scene,
  camera: THREE.Camera,
  renderer?: THREE.WebGLRenderer,
  performanceManager?: VRPerformanceDegradationManager,
  config?: Partial<SpatialLODConfig>
): ThreeSpatialLODIntegration {
  return new ThreeSpatialLODIntegration(
    { scene, camera, renderer, performanceManager },
    config
  );
}
