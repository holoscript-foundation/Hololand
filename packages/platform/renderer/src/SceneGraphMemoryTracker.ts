/**
 * SceneGraphMemoryTracker
 *
 * Tracks Three.js scene graph objects and their GPU memory footprint.
 * Integrates with GPUMemoryManager to provide automatic object registration
 * and memory estimation for meshes, textures, materials, and geometries.
 *
 * @module SceneGraphMemoryTracker
 */

import * as THREE from 'three';
import { GPUMemoryManager, TrackedResource } from './GPUMemoryManager';
import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Scene object metadata with memory and visibility tracking
 */
export interface TrackedSceneObject {
  /** Unique object ID */
  id: string;
  /** Object type */
  type: 'mesh' | 'light' | 'camera' | 'group' | 'other';
  /** Reference to Three.js object */
  object: THREE.Object3D;
  /** Total estimated memory in bytes */
  memoryBytes: number;
  /** Component memory breakdown */
  components: {
    geometry?: string; // Resource ID
    material?: string | string[]; // Resource ID(s)
    textures?: string[]; // Resource IDs
  };
  /** Visibility tracking */
  visibility: {
    /** Currently visible in frustum */
    isVisible: boolean;
    /** Timestamp of last visibility */
    lastVisible: number;
    /** Visibility frequency (0-1) */
    frequency: number;
  };
  /** Distance tracking */
  distance: {
    /** Current distance to camera */
    toCamera: number;
    /** Average distance over time */
    average: number;
  };
  /** LOD state */
  lod: {
    /** Current LOD level (0=highest, 2=lowest) */
    current: number;
    /** Available LOD levels */
    available: number;
  };
  /** Culling priority (higher = cull first) */
  cullingPriority: number;
  /** Timestamp when object was added */
  createdAt: number;
}

/**
 * Culling strategy configuration
 */
export interface CullingStrategy {
  /** Weight for visibility frequency (0-1) */
  visibilityWeight: number;
  /** Weight for distance to camera (0-1) */
  distanceWeight: number;
  /** Weight for memory cost (0-1) */
  memoryWeight: number;
  /** Weight for time since visible (0-1) */
  timeWeight: number;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_CULLING_STRATEGY: CullingStrategy = {
  visibilityWeight: 0.4,
  distanceWeight: 0.3,
  memoryWeight: 0.2,
  timeWeight: 0.1,
};

// =============================================================================
// SCENE GRAPH MEMORY TRACKER
// =============================================================================

/**
 * Tracks scene graph objects and their memory usage.
 *
 * USAGE:
 * ```typescript
 * const memoryManager = new GPUMemoryManager();
 * const sceneTracker = new SceneGraphMemoryTracker(memoryManager);
 *
 * // Track objects when added to scene
 * scene.traverse((object) => {
 *   if (object instanceof THREE.Mesh) {
 *     sceneTracker.trackObject(object);
 *   }
 * });
 *
 * // Update visibility and distance (in render loop)
 * sceneTracker.updateVisibility(camera);
 *
 * // Get objects to cull when memory pressure high
 * const toCull = sceneTracker.getObjectsToCull(100); // Top 100 by priority
 * ```
 */
export class SceneGraphMemoryTracker {
  private memoryManager: GPUMemoryManager;
  private trackedObjects: Map<string, TrackedSceneObject> = new Map();
  private cullingStrategy: CullingStrategy;
  private maxDistance: number = 1000; // Maximum distance for normalization
  private maxTime: number = 60000; // Maximum time (1 minute) for normalization

  constructor(
    memoryManager: GPUMemoryManager,
    cullingStrategy: Partial<CullingStrategy> = {}
  ) {
    this.memoryManager = memoryManager;
    this.cullingStrategy = { ...DEFAULT_CULLING_STRATEGY, ...cullingStrategy };

    logger.info('[SceneGraphMemoryTracker] Initialized');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // OBJECT TRACKING
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Track a Three.js object and all its components
   */
  trackObject(object: THREE.Object3D, options?: { forceId?: string }): void {
    const objectId = options?.forceId || object.uuid;

    // Skip if already tracked
    if (this.trackedObjects.has(objectId)) {
      return;
    }

    const trackedObject: TrackedSceneObject = {
      id: objectId,
      type: this.getObjectType(object),
      object,
      memoryBytes: 0,
      components: {},
      visibility: {
        isVisible: true,
        lastVisible: Date.now(),
        frequency: 1.0,
      },
      distance: {
        toCamera: 0,
        average: 0,
      },
      lod: {
        current: 0,
        available: this.detectLODLevels(object),
      },
      cullingPriority: 0,
      createdAt: Date.now(),
    };

    // Track mesh components
    if (object instanceof THREE.Mesh) {
      this.trackMeshComponents(trackedObject, object);
    }

    // Track light components (minimal memory)
    if (object instanceof THREE.Light) {
      trackedObject.memoryBytes = 1024; // Lights are small
    }

    this.trackedObjects.set(objectId, trackedObject);

    logger.debug('[SceneGraphMemoryTracker] Tracked object', {
      id: objectId,
      type: trackedObject.type,
      memoryMB: (trackedObject.memoryBytes / 1024 / 1024).toFixed(2),
    });
  }

  /**
   * Track mesh-specific components (geometry, materials, textures)
   */
  private trackMeshComponents(trackedObject: TrackedSceneObject, mesh: THREE.Mesh): void {
    // Track geometry
    if (mesh.geometry) {
      const geometryId = `${trackedObject.id}_geometry`;
      this.memoryManager.trackGeometry(geometryId, mesh.geometry);
      trackedObject.components.geometry = geometryId;

      const geometryResource = this.memoryManager.getResources({ type: 'geometry' })
        .find(r => r.id === geometryId);
      if (geometryResource) {
        trackedObject.memoryBytes += geometryResource.memoryBytes;
      }
    }

    // Track materials
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const materialIds: string[] = [];

    for (let i = 0; i < materials.length; i++) {
      const material = materials[i];
      const materialId = `${trackedObject.id}_material_${i}`;

      this.memoryManager.trackShader(materialId, material);
      materialIds.push(materialId);

      // Track textures in material
      this.trackMaterialTextures(trackedObject, material);
    }

    trackedObject.components.material = materialIds.length === 1 ? materialIds[0] : materialIds;
  }

  /**
   * Track textures used in a material
   */
  private trackMaterialTextures(trackedObject: TrackedSceneObject, material: THREE.Material): void {
    const textureIds: string[] = trackedObject.components.textures || [];

    // Check all texture properties
    const textureProps = [
      'map',
      'normalMap',
      'roughnessMap',
      'metalnessMap',
      'emissiveMap',
      'aoMap',
      'displacementMap',
      'alphaMap',
      'envMap',
    ];

    for (const prop of textureProps) {
      if (prop in material && (material as any)[prop] instanceof THREE.Texture) {
        const texture = (material as any)[prop] as THREE.Texture;
        const textureId = `${trackedObject.id}_${prop}`;

        // Only track if not already tracked
        if (!textureIds.includes(textureId)) {
          this.memoryManager.trackTexture(textureId, texture);
          textureIds.push(textureId);

          const textureResource = this.memoryManager.getResources({ type: 'texture' })
            .find(r => r.id === textureId);
          if (textureResource) {
            trackedObject.memoryBytes += textureResource.memoryBytes;
          }
        }
      }
    }

    if (textureIds.length > 0) {
      trackedObject.components.textures = textureIds;
    }
  }

  /**
   * Untrack an object and all its components
   */
  untrackObject(objectId: string): void {
    const trackedObject = this.trackedObjects.get(objectId);
    if (!trackedObject) return;

    // Untrack geometry
    if (trackedObject.components.geometry) {
      this.memoryManager.untrackResource(trackedObject.components.geometry);
    }

    // Untrack materials
    const materialIds = Array.isArray(trackedObject.components.material)
      ? trackedObject.components.material
      : trackedObject.components.material ? [trackedObject.components.material] : [];

    for (const materialId of materialIds) {
      this.memoryManager.untrackResource(materialId);
    }

    // Untrack textures
    if (trackedObject.components.textures) {
      for (const textureId of trackedObject.components.textures) {
        this.memoryManager.untrackResource(textureId);
      }
    }

    this.trackedObjects.delete(objectId);

    logger.debug('[SceneGraphMemoryTracker] Untracked object', { id: objectId });
  }

  /**
   * Update object access timestamp in memory manager
   */
  touchObject(objectId: string): void {
    const trackedObject = this.trackedObjects.get(objectId);
    if (!trackedObject) return;

    // Touch all component resources
    if (trackedObject.components.geometry) {
      this.memoryManager.touchResource(trackedObject.components.geometry);
    }

    const materialIds = Array.isArray(trackedObject.components.material)
      ? trackedObject.components.material
      : trackedObject.components.material ? [trackedObject.components.material] : [];

    for (const materialId of materialIds) {
      this.memoryManager.touchResource(materialId);
    }

    if (trackedObject.components.textures) {
      for (const textureId of trackedObject.components.textures) {
        this.memoryManager.touchResource(textureId);
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // VISIBILITY & DISTANCE TRACKING
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Update visibility and distance for all tracked objects
   * Call this once per frame in render loop
   */
  updateVisibility(camera: THREE.Camera, frustum?: THREE.Frustum): void {
    const now = Date.now();

    // Create frustum if not provided
    if (!frustum) {
      frustum = new THREE.Frustum();
      const projectionMatrix = new THREE.Matrix4().multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse
      );
      frustum.setFromProjectionMatrix(projectionMatrix);
    }

    for (const trackedObject of this.trackedObjects.values()) {
      const object = trackedObject.object;

      // Check frustum visibility
      const wasVisible = trackedObject.visibility.isVisible;
      const isVisible = this.isObjectInFrustum(object, frustum);

      trackedObject.visibility.isVisible = isVisible;

      if (isVisible) {
        trackedObject.visibility.lastVisible = now;

        // Update visibility frequency (exponential moving average)
        const alpha = 0.1; // Smoothing factor
        trackedObject.visibility.frequency =
          alpha * 1.0 + (1 - alpha) * trackedObject.visibility.frequency;

        // Touch resources when visible
        this.touchObject(trackedObject.id);
      } else {
        // Decay visibility frequency
        const alpha = 0.05;
        trackedObject.visibility.frequency =
          alpha * 0.0 + (1 - alpha) * trackedObject.visibility.frequency;
      }

      // Update distance to camera
      const distance = this.calculateDistance(object, camera);
      trackedObject.distance.toCamera = distance;

      // Update average distance (exponential moving average)
      const alpha = 0.1;
      trackedObject.distance.average =
        alpha * distance + (1 - alpha) * trackedObject.distance.average;

      // Update max distance for normalization
      if (distance > this.maxDistance) {
        this.maxDistance = distance;
      }
    }

    // Recalculate culling priorities
    this.updateCullingPriorities();
  }

  /**
   * Check if object is in camera frustum
   */
  private isObjectInFrustum(object: THREE.Object3D, frustum: THREE.Frustum): boolean {
    // Update world matrix
    object.updateMatrixWorld(true);

    // For meshes, use bounding sphere
    if (object instanceof THREE.Mesh && object.geometry) {
      object.geometry.computeBoundingSphere();
      const boundingSphere = object.geometry.boundingSphere;

      if (boundingSphere) {
        const sphere = boundingSphere.clone();
        sphere.applyMatrix4(object.matrixWorld);
        return frustum.intersectsSphere(sphere);
      }
    }

    // Fallback: check object position
    const position = new THREE.Vector3();
    object.getWorldPosition(position);
    return frustum.containsPoint(position);
  }

  /**
   * Calculate distance between object and camera
   */
  private calculateDistance(object: THREE.Object3D, camera: THREE.Camera): number {
    const objectPos = new THREE.Vector3();
    const cameraPos = new THREE.Vector3();

    object.getWorldPosition(objectPos);
    camera.getWorldPosition(cameraPos);

    return objectPos.distanceTo(cameraPos);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CULLING PRIORITY
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Update culling priorities for all objects based on current state
   */
  private updateCullingPriorities(): void {
    const now = Date.now();
    const strategy = this.cullingStrategy;

    for (const trackedObject of this.trackedObjects.values()) {
      // Calculate normalized components
      const visibilityComponent = 1 - trackedObject.visibility.frequency;
      const distanceComponent = trackedObject.distance.toCamera / this.maxDistance;

      const totalMemory = this.memoryManager.getStats().breakdown.total;
      const memoryComponent = totalMemory > 0 ? trackedObject.memoryBytes / totalMemory : 0;

      const timeSinceVisible = now - trackedObject.visibility.lastVisible;
      const timeComponent = Math.min(timeSinceVisible / this.maxTime, 1.0);

      // Calculate weighted priority
      const priority =
        visibilityComponent * strategy.visibilityWeight +
        distanceComponent * strategy.distanceWeight +
        memoryComponent * strategy.memoryWeight +
        timeComponent * strategy.timeWeight;

      trackedObject.cullingPriority = priority;
    }
  }

  /**
   * Get objects sorted by culling priority (highest first)
   */
  getObjectsToCull(count?: number): TrackedSceneObject[] {
    const sorted = Array.from(this.trackedObjects.values())
      .sort((a, b) => b.cullingPriority - a.cullingPriority);

    return count ? sorted.slice(0, count) : sorted;
  }

  /**
   * Get objects by distance (farthest first)
   */
  getObjectsByDistance(minDistance?: number): TrackedSceneObject[] {
    const filtered = minDistance
      ? Array.from(this.trackedObjects.values()).filter(obj => obj.distance.toCamera >= minDistance)
      : Array.from(this.trackedObjects.values());

    return filtered.sort((a, b) => b.distance.toCamera - a.distance.toCamera);
  }

  /**
   * Get invisible objects (outside frustum)
   */
  getInvisibleObjects(): TrackedSceneObject[] {
    return Array.from(this.trackedObjects.values())
      .filter(obj => !obj.visibility.isVisible);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // LOD DETECTION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Detect how many LOD levels are available for an object
   */
  private detectLODLevels(object: THREE.Object3D): number {
    // Check if object is an LOD node
    if (object instanceof THREE.LOD) {
      return object.levels.length;
    }

    // Check for manually configured LOD levels in userData
    if (object.userData.lodLevels) {
      return object.userData.lodLevels;
    }

    // Default: assume 3 LOD levels can be generated
    return 3;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Get object type from Three.js object
   */
  private getObjectType(object: THREE.Object3D): TrackedSceneObject['type'] {
    if (object instanceof THREE.Mesh) return 'mesh';
    if (object instanceof THREE.Light) return 'light';
    if (object instanceof THREE.Camera) return 'camera';
    if (object instanceof THREE.Group) return 'group';
    return 'other';
  }

  /**
   * Get a tracked object by ID
   */
  getObject(id: string): TrackedSceneObject | undefined {
    return this.trackedObjects.get(id);
  }

  /**
   * Get all tracked objects
   */
  getAllObjects(): TrackedSceneObject[] {
    return Array.from(this.trackedObjects.values());
  }

  /**
   * Get total tracked objects count
   */
  getObjectCount(): number {
    return this.trackedObjects.size;
  }

  /**
   * Get total memory used by tracked objects
   */
  getTotalMemory(): number {
    let total = 0;
    for (const obj of this.trackedObjects.values()) {
      total += obj.memoryBytes;
    }
    return total;
  }

  /**
   * Clear all tracked objects
   */
  clear(): void {
    // Untrack all objects
    for (const id of this.trackedObjects.keys()) {
      this.untrackObject(id);
    }

    this.trackedObjects.clear();
    logger.info('[SceneGraphMemoryTracker] Cleared all tracked objects');
  }
}
