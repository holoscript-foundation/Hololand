/**
 * ProceduralGeometryLOD
 *
 * Distance-based Level of Detail system for procedural geometry types:
 * - Hull geometry (convex hulls, polyhedra)
 * - Spline geometry (curves, paths, tubes)
 * - Membrane geometry (surfaces, skins, deformables)
 *
 * TARGET: Maintain 90 FPS on Quest 3 with complex organic models
 *
 * INTEGRATION:
 * - QualityProfileManager: Profile-based LOD configurations
 * - FoveatedGaussianRenderer: Foveated rendering zone awareness
 * - LODManager: Coordinate with mesh LOD system
 *
 * PERFORMANCE:
 * - LOD switching: < 0.5ms per object
 * - Foveated integration: < 1ms overhead
 * - Target memory savings: 60-80% for distant geometry
 *
 * @module ProceduralGeometryLOD
 */

import * as THREE from 'three';
import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Procedural geometry type
 */
export type ProceduralGeometryType = 'hull' | 'spline' | 'membrane';

/**
 * LOD level for procedural geometry
 */
export interface ProceduralLODLevel {
  /** LOD level index (0=highest, 3=lowest) */
  level: number;

  /** Distance threshold in meters */
  distanceThreshold: number;

  /** Subdivision/tessellation level (0-1) */
  subdivisionLevel: number;

  /** Curve/spline detail level (0-1) */
  curveDetail: number;

  /** Physics collision detail (0-1) */
  collisionDetail: number;

  /** Estimated memory savings percentage */
  memorySavings: number;

  /** Estimated CPU savings percentage */
  cpuSavings: number;
}

/**
 * Hull geometry LOD configuration
 */
export interface HullLODConfig {
  /** Maximum vertices at each LOD level */
  maxVertices: [number, number, number, number];

  /** Use simplified convex hull at lower LODs */
  useConvexSimplification: boolean;

  /** Edge decimation percentage per level */
  edgeDecimation: [number, number, number, number];
}

/**
 * Spline geometry LOD configuration
 */
export interface SplineLODConfig {
  /** Curve segments at each LOD level */
  curveSegments: [number, number, number, number];

  /** Tube radial segments (for tube splines) */
  radialSegments: [number, number, number, number];

  /** Use linear interpolation at lowest LOD */
  linearFallback: boolean;

  /** Adaptive tessellation based on curvature */
  adaptiveTessellation: boolean;
}

/**
 * Membrane geometry LOD configuration
 */
export interface MembraneLODConfig {
  /** Grid resolution at each LOD level */
  gridResolution: [number, number, number, number];

  /** Deformation simulation detail */
  deformationDetail: [number, number, number, number];

  /** Use billboard sprite at extreme distance */
  billboardFallback: boolean;

  /** Normal map resolution scaling */
  normalMapScale: [number, number, number, number];
}

/**
 * Foveated LOD modifiers
 */
export interface FoveatedLODModifiers {
  /** Enable foveated rendering integration */
  enabled: boolean;

  /** Foveal zone: force LOD 0 (full detail) */
  fovealForceHighDetail: boolean;

  /** Peripheral zone: minimum LOD level */
  peripheralMinLOD: number;

  /** Distance multiplier in peripheral vision */
  peripheralDistanceMultiplier: number;

  /** Gaze-contingent LOD switching threshold (degrees) */
  gazeContingentThreshold: number;
}

/**
 * Procedural geometry LOD configuration
 */
export interface ProceduralGeometryLODConfig {
  /** LOD levels */
  levels: ProceduralLODLevel[];

  /** Hull-specific configuration */
  hull?: HullLODConfig;

  /** Spline-specific configuration */
  spline?: SplineLODConfig;

  /** Membrane-specific configuration */
  membrane?: MembraneLODConfig;

  /** Foveated rendering modifiers */
  foveated?: FoveatedLODModifiers;

  /** Enable smooth transitions */
  smoothTransitions?: boolean;

  /** Transition duration in ms */
  transitionDuration?: number;

  /** Enable distance hysteresis (prevent LOD flickering) */
  enableHysteresis?: boolean;

  /** Hysteresis distance percentage */
  hysteresisPercent?: number;
}

/**
 * Registered procedural geometry object
 */
export interface ProceduralGeometryObject {
  /** Unique identifier */
  id: string;

  /** Geometry type */
  type: ProceduralGeometryType;

  /** Three.js object */
  object: THREE.Object3D;

  /** Original high-detail geometry */
  originalGeometry: THREE.BufferGeometry;

  /** LOD geometries cache (level -> geometry) */
  lodCache: Map<number, THREE.BufferGeometry>;

  /** Current LOD level */
  currentLOD: number;

  /** Distance to camera */
  distanceToCamera: number;

  /** Whether in foveated foveal zone */
  inFovealZone: boolean;

  /** Custom LOD config (overrides defaults) */
  customConfig?: Partial<ProceduralGeometryLODConfig>;

  /** Last LOD switch timestamp */
  lastSwitchTime: number;

  /** Metadata */
  metadata: {
    vertexCount: number;
    faceCount: number;
    memoryBytes: number;
  };
}

/**
 * LOD switch transition state
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
// DEFAULT CONFIGURATIONS
// =============================================================================

/**
 * Default LOD levels for procedural geometry
 */
const DEFAULT_LOD_LEVELS: ProceduralLODLevel[] = [
  {
    level: 0,
    distanceThreshold: 15, // 0-15m (high detail)
    subdivisionLevel: 1.0,
    curveDetail: 1.0,
    collisionDetail: 1.0,
    memorySavings: 0,
    cpuSavings: 0,
  },
  {
    level: 1,
    distanceThreshold: 35, // 15-35m (medium detail)
    subdivisionLevel: 0.6,
    curveDetail: 0.7,
    collisionDetail: 0.5,
    memorySavings: 0.40, // 40% memory savings
    cpuSavings: 0.35,
  },
  {
    level: 2,
    distanceThreshold: 70, // 35-70m (low detail)
    subdivisionLevel: 0.3,
    curveDetail: 0.4,
    collisionDetail: 0.2,
    memorySavings: 0.70, // 70% memory savings
    cpuSavings: 0.65,
  },
  {
    level: 3,
    distanceThreshold: Infinity, // 70m+ (minimal detail)
    subdivisionLevel: 0.1,
    curveDetail: 0.2,
    collisionDetail: 0.0, // No collision at extreme distance
    memorySavings: 0.85, // 85% memory savings
    cpuSavings: 0.90,
  },
];

/**
 * Default hull LOD configuration
 */
const DEFAULT_HULL_CONFIG: HullLODConfig = {
  maxVertices: [256, 128, 64, 32],
  useConvexSimplification: true,
  edgeDecimation: [1.0, 0.6, 0.3, 0.15],
};

/**
 * Default spline LOD configuration
 */
const DEFAULT_SPLINE_CONFIG: SplineLODConfig = {
  curveSegments: [64, 32, 16, 8],
  radialSegments: [16, 12, 8, 4],
  linearFallback: true,
  adaptiveTessellation: true,
};

/**
 * Default membrane LOD configuration
 */
const DEFAULT_MEMBRANE_CONFIG: MembraneLODConfig = {
  gridResolution: [128, 64, 32, 16],
  deformationDetail: [1.0, 0.6, 0.3, 0.1],
  billboardFallback: true,
  normalMapScale: [1.0, 0.5, 0.25, 0.0],
};

/**
 * Default foveated modifiers (disabled by default - enable explicitly for VR)
 */
const DEFAULT_FOVEATED_MODIFIERS: FoveatedLODModifiers = {
  enabled: false, // Disabled by default
  fovealForceHighDetail: true,
  peripheralMinLOD: 1, // Force at least LOD 1 in periphery
  peripheralDistanceMultiplier: 0.6, // Treat peripheral objects as 40% closer
  gazeContingentThreshold: 15, // 15 degrees from gaze center
};

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<ProceduralGeometryLODConfig> = {
  levels: DEFAULT_LOD_LEVELS,
  hull: DEFAULT_HULL_CONFIG,
  spline: DEFAULT_SPLINE_CONFIG,
  membrane: DEFAULT_MEMBRANE_CONFIG,
  foveated: DEFAULT_FOVEATED_MODIFIERS,
  smoothTransitions: true,
  transitionDuration: 200, // 200ms
  enableHysteresis: true,
  hysteresisPercent: 10, // 10% hysteresis band
};

// =============================================================================
// PROCEDURAL GEOMETRY LOD MANAGER
// =============================================================================

/**
 * Manager for procedural geometry LOD system
 *
 * USAGE:
 * ```typescript
 * const lodManager = new ProceduralGeometryLODManager();
 *
 * // Register procedural geometry
 * lodManager.register('hull_1', hullObject, 'hull', hullGeometry);
 * lodManager.register('spline_1', splineObject, 'spline', splineGeometry);
 * lodManager.register('membrane_1', membraneObject, 'membrane', membraneGeometry);
 *
 * // Update LOD levels each frame
 * lodManager.update(camera, gazeDirection);
 *
 * // Get statistics
 * const stats = lodManager.getStats();
 * ```
 */
export class ProceduralGeometryLODManager {
  private config: Required<ProceduralGeometryLODConfig>;
  private objects: Map<string, ProceduralGeometryObject> = new Map();
  private activeTransitions: Map<string, LODTransition> = new Map();

  // Performance tracking
  private frameCount: number = 0;
  private lodSwitchCount: number = 0;
  private totalUpdateTimeMs: number = 0;

  constructor(config?: Partial<ProceduralGeometryLODConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      hull: { ...DEFAULT_CONFIG.hull, ...config?.hull },
      spline: { ...DEFAULT_CONFIG.spline, ...config?.spline },
      membrane: { ...DEFAULT_CONFIG.membrane, ...config?.membrane },
      foveated: { ...DEFAULT_CONFIG.foveated, ...config?.foveated },
    };

    logger.info('[ProceduralGeometryLODManager] Initialized', {
      levels: this.config.levels.length,
      foveatedEnabled: this.config.foveated.enabled,
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // REGISTRATION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Register procedural geometry for LOD management
   */
  register(
    id: string,
    object: THREE.Object3D,
    type: ProceduralGeometryType,
    geometry: THREE.BufferGeometry,
    customConfig?: Partial<ProceduralGeometryLODConfig>
  ): void {
    // Calculate metadata
    const vertexCount = geometry.getAttribute('position')?.count || 0;
    const indexAttr = geometry.getIndex();
    const faceCount = indexAttr ? indexAttr.count / 3 : vertexCount / 3;
    const memoryBytes = this.estimateGeometryMemory(geometry);

    const proceduralObject: ProceduralGeometryObject = {
      id,
      type,
      object,
      originalGeometry: geometry.clone(),
      lodCache: new Map([[0, geometry.clone()]]),
      currentLOD: 0,
      distanceToCamera: 0,
      inFovealZone: false,
      customConfig,
      lastSwitchTime: 0,
      metadata: {
        vertexCount,
        faceCount,
        memoryBytes,
      },
    };

    this.objects.set(id, proceduralObject);

    logger.debug('[ProceduralGeometryLODManager] Registered', {
      id,
      type,
      vertices: vertexCount,
      faces: faceCount,
      memoryMB: (memoryBytes / 1024 / 1024).toFixed(2),
    });
  }

  /**
   * Unregister procedural geometry
   */
  unregister(id: string): void {
    const obj = this.objects.get(id);
    if (!obj) return;

    // Dispose LOD cache
    for (const geometry of obj.lodCache.values()) {
      geometry.dispose();
    }

    this.objects.delete(id);
    this.activeTransitions.delete(id);

    logger.debug('[ProceduralGeometryLODManager] Unregistered', { id });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // LOD UPDATE
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Update LOD levels for all registered procedural geometry
   * Call this once per frame in render loop
   */
  update(camera: THREE.Camera, gazeDirection?: THREE.Vector3): void {
    const startTime = performance.now();
    this.frameCount++;

    for (const obj of this.objects.values()) {
      // Calculate distance to camera
      const cameraPos = new THREE.Vector3();
      camera.getWorldPosition(cameraPos);

      const objectPos = new THREE.Vector3();
      obj.object.getWorldPosition(objectPos);

      obj.distanceToCamera = cameraPos.distanceTo(objectPos);

      // Check if in foveated foveal zone
      if (this.config.foveated.enabled && gazeDirection) {
        obj.inFovealZone = this.isInFovealZone(objectPos, cameraPos, gazeDirection);
      }

      // Calculate target LOD level
      const targetLOD = this.calculateTargetLOD(obj);

      // Switch LOD if different from current (with hysteresis)
      if (this.shouldSwitchLOD(obj, targetLOD)) {
        this.switchLOD(obj, targetLOD);
      }
    }

    // Update active transitions
    this.updateTransitions();

    const updateTime = performance.now() - startTime;
    this.totalUpdateTimeMs += updateTime;

    if (this.frameCount % 300 === 0) {
      logger.debug('[ProceduralGeometryLODManager] Performance', {
        avgUpdateMs: (this.totalUpdateTimeMs / this.frameCount).toFixed(2),
        objectCount: this.objects.size,
        activeTransitions: this.activeTransitions.size,
      });
    }
  }

  /**
   * Check if object is in foveated foveal zone
   */
  private isInFovealZone(
    objectPos: THREE.Vector3,
    cameraPos: THREE.Vector3,
    gazeDirection: THREE.Vector3
  ): boolean {
    const toObject = new THREE.Vector3().subVectors(objectPos, cameraPos).normalize();
    const angleRadians = gazeDirection.angleTo(toObject);
    const angleDegrees = THREE.MathUtils.radToDeg(angleRadians);

    return angleDegrees < this.config.foveated.gazeContingentThreshold;
  }

  /**
   * Calculate target LOD level for object
   */
  private calculateTargetLOD(obj: ProceduralGeometryObject): number {
    const config = obj.customConfig || this.config;
    const levels = config.levels || this.config.levels;

    let effectiveDistance = obj.distanceToCamera;

    // Apply foveated modifiers ONLY if enabled
    if (this.config.foveated.enabled) {
      if (obj.inFovealZone && this.config.foveated.fovealForceHighDetail) {
        return 0; // Force high detail in foveal zone
      }

      if (!obj.inFovealZone && this.config.foveated.peripheralDistanceMultiplier !== 1.0) {
        // Treat peripheral objects as closer (less aggressive LOD)
        effectiveDistance *= this.config.foveated.peripheralDistanceMultiplier;
      }
    }

    // Find appropriate LOD level based on distance
    for (let i = 0; i < levels.length; i++) {
      if (effectiveDistance < levels[i].distanceThreshold) {
        // Apply peripheral minimum LOD ONLY if enabled and in peripheral zone
        if (this.config.foveated.enabled && !obj.inFovealZone && i < this.config.foveated.peripheralMinLOD) {
          return this.config.foveated.peripheralMinLOD;
        }
        return i;
      }
    }

    // Beyond max distance - use lowest LOD
    return levels.length - 1;
  }

  /**
   * Determine if LOD should switch (with hysteresis)
   */
  private shouldSwitchLOD(obj: ProceduralGeometryObject, targetLOD: number): boolean {
    if (targetLOD === obj.currentLOD) {
      return false;
    }

    if (!this.config.enableHysteresis) {
      return true;
    }

    // Hysteresis: only switch if distance crosses threshold + hysteresis band
    const levels = this.config.levels;
    const currentLevel = levels[obj.currentLOD];
    const hysteresisBand = currentLevel.distanceThreshold * (this.config.hysteresisPercent / 100);

    if (targetLOD > obj.currentLOD) {
      // Switching to lower quality - add hysteresis
      return obj.distanceToCamera > currentLevel.distanceThreshold + hysteresisBand;
    } else {
      // Switching to higher quality - subtract hysteresis
      return obj.distanceToCamera < currentLevel.distanceThreshold - hysteresisBand;
    }
  }

  /**
   * Switch object to target LOD level
   */
  private switchLOD(obj: ProceduralGeometryObject, targetLOD: number): void {
    const fromLOD = obj.currentLOD;

    logger.debug('[ProceduralGeometryLODManager] Switching LOD', {
      id: obj.id,
      type: obj.type,
      from: fromLOD,
      to: targetLOD,
      distance: obj.distanceToCamera.toFixed(1),
      inFoveal: obj.inFovealZone,
    });

    // Get or generate LOD geometry
    let lodGeometry = obj.lodCache.get(targetLOD);

    if (!lodGeometry) {
      lodGeometry = this.generateLODGeometry(obj, targetLOD);
      obj.lodCache.set(targetLOD, lodGeometry);
    }

    // Apply geometry to object
    if (obj.object instanceof THREE.Mesh) {
      obj.object.geometry = lodGeometry;
    } else if (obj.object instanceof THREE.Line) {
      obj.object.geometry = lodGeometry;
    }

    // Update state
    obj.currentLOD = targetLOD;
    obj.lastSwitchTime = performance.now();
    this.lodSwitchCount++;

    // Create smooth transition
    if (this.config.smoothTransitions) {
      this.createTransition(obj.id, fromLOD, targetLOD);
    }
  }

  /**
   * Generate LOD geometry for specific level
   */
  private generateLODGeometry(
    obj: ProceduralGeometryObject,
    level: number
  ): THREE.BufferGeometry {
    const lodLevel = this.config.levels[level];

    switch (obj.type) {
      case 'hull':
        return this.generateHullLOD(obj.originalGeometry, level, lodLevel);
      case 'spline':
        return this.generateSplineLOD(obj.originalGeometry, level, lodLevel);
      case 'membrane':
        return this.generateMembraneLOD(obj.originalGeometry, level, lodLevel);
      default:
        return obj.originalGeometry.clone();
    }
  }

  /**
   * Generate hull geometry LOD
   */
  private generateHullLOD(
    original: THREE.BufferGeometry,
    level: number,
    lodLevel: ProceduralLODLevel
  ): THREE.BufferGeometry {
    const hullConfig = this.config.hull;
    const simplified = original.clone();

    // Apply edge decimation
    const targetVertices = hullConfig.maxVertices[level];
    const decimation = hullConfig.edgeDecimation[level];

    // Simplify geometry (naive implementation - use proper mesh simplification library in production)
    const positionAttr = simplified.getAttribute('position');
    if (positionAttr && positionAttr.count > targetVertices) {
      // TODO: Implement proper convex hull simplification
      // For now, just mark for decimation
      simplified.userData.decimationTarget = decimation;
    }

    return simplified;
  }

  /**
   * Generate spline geometry LOD
   */
  private generateSplineLOD(
    original: THREE.BufferGeometry,
    level: number,
    lodLevel: ProceduralLODLevel
  ): THREE.BufferGeometry {
    const splineConfig = this.config.spline;
    const simplified = original.clone();

    // Apply curve segment reduction
    const targetSegments = splineConfig.curveSegments[level];
    const radialSegments = splineConfig.radialSegments[level];

    // Store LOD parameters in userData for spline regeneration
    simplified.userData.curveSegments = targetSegments;
    simplified.userData.radialSegments = radialSegments;
    simplified.userData.curveDetail = lodLevel.curveDetail;

    return simplified;
  }

  /**
   * Generate membrane geometry LOD
   */
  private generateMembraneLOD(
    original: THREE.BufferGeometry,
    level: number,
    lodLevel: ProceduralLODLevel
  ): THREE.BufferGeometry {
    const membraneConfig = this.config.membrane;
    const simplified = original.clone();

    // Apply grid resolution reduction
    const targetResolution = membraneConfig.gridResolution[level];
    const deformationDetail = membraneConfig.deformationDetail[level];

    // Store LOD parameters for membrane simulation
    simplified.userData.gridResolution = targetResolution;
    simplified.userData.deformationDetail = deformationDetail;
    simplified.userData.normalMapScale = membraneConfig.normalMapScale[level];

    return simplified;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SMOOTH TRANSITIONS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Create smooth LOD transition
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
   * Update active transitions
   */
  private updateTransitions(): void {
    const now = performance.now();

    for (const [objectId, transition] of this.activeTransitions.entries()) {
      const elapsed = now - transition.startTime;
      transition.progress = Math.min(elapsed / transition.duration, 1.0);

      // Apply opacity fade during transition
      const obj = this.objects.get(objectId);
      if (obj && obj.object instanceof THREE.Mesh) {
        const material = obj.object.material;
        if (Array.isArray(material)) {
          for (const mat of material) {
            this.applyTransitionFade(mat, transition.progress);
          }
        } else {
          this.applyTransitionFade(material, transition.progress);
        }
      }

      // Remove completed transitions
      if (transition.progress >= 1.0) {
        // Restore original opacity
        if (obj && obj.object instanceof THREE.Mesh) {
          const material = obj.object.material;
          if (Array.isArray(material)) {
            for (const mat of material) {
              this.restoreOpacity(mat);
            }
          } else {
            this.restoreOpacity(material);
          }
        }

        this.activeTransitions.delete(objectId);
      }
    }
  }

  /**
   * Apply opacity fade during transition
   */
  private applyTransitionFade(material: THREE.Material, progress: number): void {
    if (!material.userData.originalOpacity) {
      material.userData.originalOpacity = (material as any).opacity || 1.0;
    }

    // Smooth fade curve (sine wave)
    const fade = Math.sin(progress * Math.PI);
    (material as any).opacity = material.userData.originalOpacity * (0.8 + fade * 0.2);
    material.transparent = true;
    material.needsUpdate = true;
  }

  /**
   * Restore original opacity after transition
   */
  private restoreOpacity(material: THREE.Material): void {
    if (material.userData.originalOpacity !== undefined) {
      (material as any).opacity = material.userData.originalOpacity;
      material.transparent = material.userData.originalOpacity < 1.0;
      material.needsUpdate = true;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Estimate geometry memory usage
   */
  private estimateGeometryMemory(geometry: THREE.BufferGeometry): number {
    let bytes = 0;

    // Vertex attributes
    for (const name in geometry.attributes) {
      const attr = geometry.attributes[name];
      bytes += attr.array.byteLength;
    }

    // Index buffer
    const index = geometry.getIndex();
    if (index) {
      bytes += index.array.byteLength;
    }

    return bytes;
  }

  /**
   * Get LOD statistics
   */
  getStats(): {
    totalObjects: number;
    objectsByType: Record<ProceduralGeometryType, number>;
    lodDistribution: Record<number, number>;
    fovealObjects: number;
    peripheralObjects: number;
    activeTransitions: number;
    totalMemorySavingsMB: number;
    avgUpdateTimeMs: number;
    lodSwitchCount: number;
  } {
    const objectsByType = {
      hull: 0,
      spline: 0,
      membrane: 0,
    };

    const lodDistribution: Record<number, number> = {};
    let fovealObjects = 0;
    let peripheralObjects = 0;
    let totalMemorySaved = 0;

    for (const obj of this.objects.values()) {
      objectsByType[obj.type]++;

      lodDistribution[obj.currentLOD] = (lodDistribution[obj.currentLOD] || 0) + 1;

      if (obj.inFovealZone) fovealObjects++;
      else peripheralObjects++;

      // Calculate memory savings
      const lodLevel = this.config.levels[obj.currentLOD];
      totalMemorySaved += obj.metadata.memoryBytes * lodLevel.memorySavings;
    }

    return {
      totalObjects: this.objects.size,
      objectsByType,
      lodDistribution,
      fovealObjects,
      peripheralObjects,
      activeTransitions: this.activeTransitions.size,
      totalMemorySavingsMB: totalMemorySaved / 1024 / 1024,
      avgUpdateTimeMs: this.frameCount > 0 ? this.totalUpdateTimeMs / this.frameCount : 0,
      lodSwitchCount: this.lodSwitchCount,
    };
  }

  /**
   * Force LOD level for specific object (debugging)
   */
  forceLOD(objectId: string, level: number): void {
    const obj = this.objects.get(objectId);
    if (!obj) {
      logger.warn('[ProceduralGeometryLODManager] Object not found', { objectId });
      return;
    }

    if (level < 0 || level >= this.config.levels.length) {
      logger.warn('[ProceduralGeometryLODManager] Invalid LOD level', { level });
      return;
    }

    this.switchLOD(obj, level);
  }

  /**
   * Clear all LOD caches
   */
  clearCache(): void {
    for (const obj of this.objects.values()) {
      for (const [level, geometry] of obj.lodCache.entries()) {
        if (level !== 0) { // Keep original
          geometry.dispose();
        }
      }
      obj.lodCache.clear();
      obj.lodCache.set(0, obj.originalGeometry.clone());
    }

    logger.info('[ProceduralGeometryLODManager] Cleared LOD cache');
  }
}
