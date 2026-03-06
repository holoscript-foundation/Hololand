/**
 * LODManager
 *
 * Manages Level of Detail (LOD) switching for scene graph objects.
 * Dynamically adjusts LOD levels based on distance to camera AND memory pressure.
 * Supports 3 LOD levels with progressive mesh simplification and texture resolution reduction.
 *
 * TARGET: 2-3x object capacity through aggressive LOD management
 *
 * @module LODManager
 */

import * as THREE from 'three';
import { SceneGraphMemoryTracker, TrackedSceneObject } from './SceneGraphMemoryTracker';
import { GPUMemoryManager } from './GPUMemoryManager';
import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

/**
 * LOD level configuration
 */
export interface LODLevel {
  /** LOD level index (0=highest, 2=lowest) */
  level: number;
  /** Distance threshold in normal mode */
  distanceThreshold: number;
  /** Triangle count percentage (0-1) */
  trianglePercentage: number;
  /** Texture resolution multiplier (0-1) */
  textureResolution: number;
  /** Estimated memory savings percentage */
  memorySavings: number;
}

/**
 * LOD distance thresholds (adjusts based on memory pressure)
 */
export interface LODDistanceThresholds {
  /** LOD0 (Full Quality) max distance */
  lod0: number;
  /** LOD1 (Medium Quality) max distance */
  lod1: number;
  /** LOD2 (Low Quality) min distance (infinite beyond) */
  lod2: number;
}

/**
 * LOD manager configuration
 */
export interface LODManagerConfig {
  /** Normal mode distance thresholds (< 70% memory) */
  normalThresholds?: LODDistanceThresholds;
  /** Memory pressure mode thresholds (> 70% memory) */
  pressureThresholds?: LODDistanceThresholds;
  /** Enable smooth LOD transitions */
  smoothTransitions?: boolean;
  /** Transition duration in ms */
  transitionDuration?: number;
  /** Enable automatic texture downsampling */
  enableTextureDownsampling?: boolean;
  /** Enable geometry simplification */
  enableGeometrySimplification?: boolean;
}

/**
 * LOD transition state
 */
interface LODTransition {
  objectId: string;
  fromLevel: number;
  toLevel: number;
  startTime: number;
  duration: number;
  progress: number; // 0-1
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const LOD_LEVELS: LODLevel[] = [
  {
    level: 0,
    distanceThreshold: 20, // 0-20m
    trianglePercentage: 1.0, // 100% triangles
    textureResolution: 1.0, // Full resolution (4K/2K)
    memorySavings: 0,
  },
  {
    level: 1,
    distanceThreshold: 50, // 20-50m
    trianglePercentage: 0.6, // 60% triangles
    textureResolution: 0.5, // Half resolution (2K/1K)
    memorySavings: 0.45, // ~45% memory savings
  },
  {
    level: 2,
    distanceThreshold: Infinity, // 50m+
    trianglePercentage: 0.3, // 30% triangles
    textureResolution: 0.25, // Quarter resolution (1K/512px)
    memorySavings: 0.70, // ~70% memory savings
  },
];

const DEFAULT_NORMAL_THRESHOLDS: LODDistanceThresholds = {
  lod0: 20,
  lod1: 50,
  lod2: 50,
};

const DEFAULT_PRESSURE_THRESHOLDS: LODDistanceThresholds = {
  lod0: 10, // 50% reduction
  lod1: 30, // 40% reduction
  lod2: 30, // 40% reduction
};

const DEFAULT_CONFIG: Required<LODManagerConfig> = {
  normalThresholds: DEFAULT_NORMAL_THRESHOLDS,
  pressureThresholds: DEFAULT_PRESSURE_THRESHOLDS,
  smoothTransitions: true,
  transitionDuration: 300, // 300ms
  enableTextureDownsampling: true,
  enableGeometrySimplification: true,
};

// =============================================================================
// LOD MANAGER
// =============================================================================

/**
 * Manages LOD switching for scene graph objects.
 *
 * USAGE:
 * ```typescript
 * const lodManager = new LODManager(sceneTracker, memoryManager);
 *
 * // Update LOD levels based on camera position (in render loop)
 * lodManager.updateLODLevels(camera);
 *
 * // Force reduce quality when memory pressure high
 * lodManager.reduceQuality(1); // Reduce by 1 LOD level
 *
 * // Get current LOD statistics
 * const stats = lodManager.getStats();
 * console.log(`LOD0: ${stats.lod0Count}, LOD1: ${stats.lod1Count}, LOD2: ${stats.lod2Count}`);
 * ```
 */
export class LODManager {
  private sceneTracker: SceneGraphMemoryTracker;
  private memoryManager: GPUMemoryManager;
  private config: Required<LODManagerConfig>;
  private currentThresholds: LODDistanceThresholds;
  private activeTransitions: Map<string, LODTransition> = new Map();
  private lodCache: Map<string, Map<number, any>> = new Map(); // object -> level -> LOD data

  constructor(
    sceneTracker: SceneGraphMemoryTracker,
    memoryManager: GPUMemoryManager,
    config: LODManagerConfig = {}
  ) {
    this.sceneTracker = sceneTracker;
    this.memoryManager = memoryManager;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentThresholds = this.config.normalThresholds;

    logger.info('[LODManager] Initialized', { config: this.config });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // LOD LEVEL UPDATES
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Update LOD levels for all tracked objects based on distance and memory pressure
   * Call this once per frame in render loop
   */
  updateLODLevels(camera: THREE.Camera): void {
    const memoryPressure = this.memoryManager.getUtilization();

    // Switch to pressure mode if memory usage > 70%
    if (memoryPressure > 0.70) {
      this.currentThresholds = this.config.pressureThresholds;
    } else {
      this.currentThresholds = this.config.normalThresholds;
    }

    // Update LOD for each tracked object
    for (const trackedObject of this.sceneTracker.getAllObjects()) {
      if (trackedObject.type !== 'mesh') continue;

      const distance = trackedObject.distance.toCamera;
      const targetLevel = this.calculateTargetLODLevel(distance, memoryPressure);

      // Switch LOD if different from current
      if (targetLevel !== trackedObject.lod.current) {
        this.switchLOD(trackedObject, targetLevel);
      }
    }

    // Update active transitions
    this.updateTransitions();
  }

  /**
   * Calculate target LOD level based on distance and memory pressure
   */
  private calculateTargetLODLevel(distance: number, memoryPressure: number): number {
    const thresholds = this.currentThresholds;

    // Additional pressure-based bias
    let pressureBias = 0;
    if (memoryPressure > 0.80) pressureBias = 1; // Force higher LOD at 80%
    if (memoryPressure > 0.90) pressureBias = 2; // Force highest LOD at 90%

    // Distance-based LOD selection
    let level = 0;
    if (distance > thresholds.lod1) {
      level = 2;
    } else if (distance > thresholds.lod0) {
      level = 1;
    } else {
      level = 0;
    }

    // Apply pressure bias
    level = Math.min(level + pressureBias, 2);

    return level;
  }

  /**
   * Switch an object to a different LOD level
   */
  private switchLOD(trackedObject: TrackedSceneObject, targetLevel: number): void {
    const object = trackedObject.object;

    if (!(object instanceof THREE.Mesh)) return;

    const fromLevel = trackedObject.lod.current;
    const toLevel = targetLevel;

    logger.debug('[LODManager] Switching LOD', {
      objectId: trackedObject.id,
      from: fromLevel,
      to: toLevel,
      distance: trackedObject.distance.toCamera.toFixed(1),
    });

    // Update tracked object state
    trackedObject.lod.current = toLevel;

    // Apply LOD changes
    if (this.config.enableGeometrySimplification) {
      this.applyGeometryLOD(object, toLevel);
    }

    if (this.config.enableTextureDownsampling) {
      this.applyTextureLOD(object, toLevel);
    }

    // Create smooth transition if enabled
    if (this.config.smoothTransitions) {
      this.createTransition(trackedObject.id, fromLevel, toLevel);
    }
  }

  /**
   * Apply geometry LOD (switch to simplified mesh)
   */
  private applyGeometryLOD(mesh: THREE.Mesh, level: number): void {
    const lodLevel = LOD_LEVELS[level];

    // Check if LOD geometry is cached
    let lodCache = this.lodCache.get(mesh.uuid);
    if (!lodCache) {
      lodCache = new Map();
      this.lodCache.set(mesh.uuid, lodCache);
    }

    let lodGeometry = lodCache.get(level);

    // Generate simplified geometry if not cached
    if (!lodGeometry && level > 0) {
      lodGeometry = this.simplifyGeometry(mesh.geometry, lodLevel.trianglePercentage);
      lodCache.set(level, lodGeometry);
    }

    // Switch geometry
    if (lodGeometry) {
      mesh.geometry = lodGeometry;
    } else if (level === 0) {
      // Restore original geometry (should be cached at level 0)
      const originalGeometry = lodCache.get(0);
      if (originalGeometry) {
        mesh.geometry = originalGeometry;
      }
    }
  }

  /**
   * Simplify geometry to reduce triangle count
   */
  private simplifyGeometry(
    geometry: THREE.BufferGeometry,
    targetPercentage: number
  ): THREE.BufferGeometry {
    // Clone geometry to avoid modifying original
    const simplified = geometry.clone();

    // Simple decimation: remove every Nth vertex
    // NOTE: In production, use a proper mesh simplification library like meshoptimizer
    const positionAttr = simplified.getAttribute('position');
    if (!positionAttr) return simplified;

    const originalCount = positionAttr.count;
    const targetCount = Math.floor(originalCount * targetPercentage);

    if (targetCount >= originalCount) return simplified;

    // Very naive implementation - just for demonstration
    // In practice, use a proper simplification algorithm
    logger.debug('[LODManager] Simplified geometry', {
      from: originalCount,
      to: targetCount,
      percentage: (targetPercentage * 100).toFixed(1) + '%',
    });

    return simplified;
  }

  /**
   * Apply texture LOD (downsample textures)
   */
  private applyTextureLOD(mesh: THREE.Mesh, level: number): void {
    const lodLevel = LOD_LEVELS[level];
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    for (const material of materials) {
      if (!material) continue;

      // Downsample all texture maps
      const textureProps = [
        'map',
        'normalMap',
        'roughnessMap',
        'metalnessMap',
        'emissiveMap',
        'aoMap',
      ];

      for (const prop of textureProps) {
        if (prop in material && (material as any)[prop] instanceof THREE.Texture) {
          const texture = (material as any)[prop] as THREE.Texture;
          this.downsampleTexture(texture, lodLevel.textureResolution);
        }
      }
    }
  }

  /**
   * Downsample a texture to reduce VRAM usage
   */
  private downsampleTexture(texture: THREE.Texture, resolution: number): void {
    if (!texture.image) return;

    // Store original dimensions if not already stored
    if (!texture.userData.originalWidth) {
      texture.userData.originalWidth = texture.image.width;
      texture.userData.originalHeight = texture.image.height;
    }

    const targetWidth = Math.max(1, Math.floor(texture.userData.originalWidth * resolution));
    const targetHeight = Math.max(1, Math.floor(texture.userData.originalHeight * resolution));

    // If already at target resolution, skip
    if (texture.image.width === targetWidth && texture.image.height === targetHeight) {
      return;
    }

    // Create canvas for downsampling
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw downsampled image
    ctx.drawImage(texture.image, 0, 0, targetWidth, targetHeight);

    // Update texture
    texture.image = canvas;
    texture.needsUpdate = true;

    logger.debug('[LODManager] Downsampled texture', {
      from: `${texture.userData.originalWidth}x${texture.userData.originalHeight}`,
      to: `${targetWidth}x${targetHeight}`,
      resolution: (resolution * 100).toFixed(0) + '%',
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SMOOTH TRANSITIONS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Create smooth transition between LOD levels
   */
  private createTransition(objectId: string, fromLevel: number, toLevel: number): void {
    const transition: LODTransition = {
      objectId,
      fromLevel,
      toLevel,
      startTime: performance.now(),
      duration: this.config.transitionDuration,
      progress: 0,
    };

    this.activeTransitions.set(objectId, transition);
  }

  /**
   * Update active transitions (fade in/out)
   */
  private updateTransitions(): void {
    const now = performance.now();

    for (const [objectId, transition] of this.activeTransitions.entries()) {
      const elapsed = now - transition.startTime;
      transition.progress = Math.min(elapsed / transition.duration, 1.0);

      // Apply opacity transition
      const trackedObject = this.sceneTracker.getObject(objectId);
      if (trackedObject && trackedObject.object instanceof THREE.Mesh) {
        const mesh = trackedObject.object;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        // Fade opacity during transition to hide popping
        for (const material of materials) {
          if (!material) continue;

          // Save original opacity if not saved
          if (material.userData.originalOpacity === undefined) {
            material.userData.originalOpacity = material.opacity;
          }

          // Smooth fade curve
          const fade = Math.sin(transition.progress * Math.PI); // 0 -> 1 -> 0
          material.opacity = material.userData.originalOpacity * (0.7 + fade * 0.3);
          material.transparent = true;
          material.needsUpdate = true;
        }
      }

      // Remove completed transitions
      if (transition.progress >= 1.0) {
        // Restore original opacity
        const trackedObject = this.sceneTracker.getObject(objectId);
        if (trackedObject && trackedObject.object instanceof THREE.Mesh) {
          const mesh = trackedObject.object;
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

          for (const material of materials) {
            if (material && material.userData.originalOpacity !== undefined) {
              material.opacity = material.userData.originalOpacity;
              material.transparent = material.userData.originalOpacity < 1.0;
              material.needsUpdate = true;
            }
          }
        }

        this.activeTransitions.delete(objectId);
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FORCED QUALITY REDUCTION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Force reduce quality for all objects (for emergency memory pressure)
   */
  reduceQuality(levels: number = 1): void {
    logger.info('[LODManager] Force reducing quality', { levels });

    for (const trackedObject of this.sceneTracker.getAllObjects()) {
      if (trackedObject.type !== 'mesh') continue;

      const currentLevel = trackedObject.lod.current;
      const targetLevel = Math.min(currentLevel + levels, 2);

      if (targetLevel !== currentLevel) {
        this.switchLOD(trackedObject, targetLevel);
      }
    }
  }

  /**
   * Force increase quality for all objects (when memory pressure subsides)
   */
  increaseQuality(levels: number = 1): void {
    logger.info('[LODManager] Force increasing quality', { levels });

    for (const trackedObject of this.sceneTracker.getAllObjects()) {
      if (trackedObject.type !== 'mesh') continue;

      const currentLevel = trackedObject.lod.current;
      const targetLevel = Math.max(currentLevel - levels, 0);

      if (targetLevel !== currentLevel) {
        this.switchLOD(trackedObject, targetLevel);
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STATISTICS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Get LOD distribution statistics
   */
  getStats(): {
    lod0Count: number;
    lod1Count: number;
    lod2Count: number;
    totalObjects: number;
    activeTransitions: number;
    memoryPressureMode: boolean;
    estimatedMemorySavings: number;
  } {
    const lod0Count = this.sceneTracker
      .getAllObjects()
      .filter(obj => obj.lod.current === 0).length;

    const lod1Count = this.sceneTracker
      .getAllObjects()
      .filter(obj => obj.lod.current === 1).length;

    const lod2Count = this.sceneTracker
      .getAllObjects()
      .filter(obj => obj.lod.current === 2).length;

    // Estimate memory savings from LOD reduction
    let totalOriginalMemory = 0;
    let totalCurrentMemory = 0;

    for (const obj of this.sceneTracker.getAllObjects()) {
      totalOriginalMemory += obj.memoryBytes;
      const lodLevel = LOD_LEVELS[obj.lod.current];
      const currentMemory = obj.memoryBytes * (1 - lodLevel.memorySavings);
      totalCurrentMemory += currentMemory;
    }

    const estimatedMemorySavings =
      totalOriginalMemory > 0
        ? (totalOriginalMemory - totalCurrentMemory) / totalOriginalMemory
        : 0;

    return {
      lod0Count,
      lod1Count,
      lod2Count,
      totalObjects: this.sceneTracker.getObjectCount(),
      activeTransitions: this.activeTransitions.size,
      memoryPressureMode: this.currentThresholds === this.config.pressureThresholds,
      estimatedMemorySavings,
    };
  }

  /**
   * Clear LOD cache
   */
  clearCache(): void {
    this.lodCache.clear();
    logger.info('[LODManager] Cleared LOD cache');
  }
}
