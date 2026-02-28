/**
 * Spatial LOD Manager
 *
 * Implements distance-based Level of Detail optimization using the "Lost in Middle" analogy:
 * - Near objects (0-5m): High-polygon, full quality (always visible, critical for presence)
 * - Middle objects (5-50m): Medium-polygon with FORCED transitions at boundaries (most aggressive optimization)
 * - Far objects (50m+): Low-polygon billboards/impostors (minimal performance impact)
 *
 * CRITICAL INSIGHT FROM "LOST IN MIDDLE" PROBLEM:
 * - Users focus on near objects (0-5m) and far landmarks (50m+)
 * - Middle-range objects (5-50m) are "lost in middle" - users notice them least
 * - Aggressive LOD reduction in middle range yields maximum performance gain with minimal perceptual impact
 *
 * PERFORMANCE TARGET:
 * - 90fps (11.1ms frame budget) for VR comfort
 * - Monitor frame time continuously
 * - If frame time >11.1ms, reduce middle-range LOD aggressively before touching near/far objects
 *
 * @module SpatialLODManager
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Spatial distance zones for LOD optimization
 */
export enum SpatialZone {
  /** 0-5m: Near objects (high-poly, full quality) */
  NEAR = 0,
  /** 5-50m: Middle objects (medium-poly, aggressive optimization target) */
  MIDDLE = 1,
  /** 50m+: Far objects (low-poly billboards/impostors) */
  FAR = 2,
}

/**
 * LOD level within each spatial zone
 */
export enum LODLevel {
  /** Highest quality (full polygon count) */
  LOD0 = 0,
  /** High quality (75% polygon count) */
  LOD1 = 1,
  /** Medium quality (50% polygon count) */
  LOD2 = 2,
  /** Low quality (25% polygon count) */
  LOD3 = 3,
  /** Impostor/billboard (sprite-based) */
  IMPOSTOR = 4,
}

/**
 * Spatial zone configuration
 */
export interface SpatialZoneConfig {
  /** Zone identifier */
  zone: SpatialZone;
  /** Minimum distance in meters */
  minDistance: number;
  /** Maximum distance in meters */
  maxDistance: number;
  /** Default LOD level for this zone */
  defaultLOD: LODLevel;
  /** LOD levels available in this zone (for dynamic adjustment) */
  availableLODs: LODLevel[];
  /** Performance weight (higher = more aggressive optimization) */
  performanceWeight: number;
  /** Transition buffer zone in meters (prevents rapid LOD switching) */
  transitionBuffer: number;
}

/**
 * Object tracking state for LOD management
 */
export interface LODObject {
  /** Unique identifier */
  id: string;
  /** Object position in world space */
  position: { x: number; y: number; z: number };
  /** Current spatial zone */
  currentZone: SpatialZone;
  /** Current LOD level */
  currentLOD: LODLevel;
  /** Available LOD geometries (LOD0-LOD3, Impostor) */
  lodGeometries: Map<LODLevel, any>; // Renderer-specific geometry
  /** Last zone update timestamp */
  lastZoneUpdate: number;
  /** Distance from viewer */
  distance: number;
  /** Performance priority (0-1, higher = more important) */
  priority: number;
  /** Force high quality regardless of distance */
  alwaysHighQuality: boolean;
}

/**
 * Viewer (camera) position for distance calculations
 */
export interface ViewerPosition {
  x: number;
  y: number;
  z: number;
}

/**
 * Spatial LOD configuration
 */
export interface SpatialLODConfig {
  /** Spatial zone definitions */
  zones: SpatialZoneConfig[];
  /** Target frame time in ms (default: 11.1ms for 90fps) */
  targetFrameTime: number;
  /** Frame time threshold for aggressive middle reduction (default: 11.1ms) */
  middleReductionThreshold: number;
  /** Enable automatic zone-based LOD adjustment */
  autoAdjust: boolean;
  /** Enable performance-driven middle-range reduction */
  enableAggressiveMiddleReduction: boolean;
  /** Update frequency in Hz (how often to recalculate LODs) */
  updateFrequency: number;
  /** Maximum objects to update per frame (prevents LOD update stutter) */
  maxObjectsPerFrame: number;
}

/**
 * Spatial LOD metrics
 */
export interface SpatialLODMetrics {
  /** Total objects tracked */
  totalObjects: number;
  /** Objects in each zone */
  objectsByZone: Record<SpatialZone, number>;
  /** Objects at each LOD level */
  objectsByLOD: Record<LODLevel, number>;
  /** Average distance to objects */
  averageDistance: number;
  /** LOD transitions this frame */
  transitionsThisFrame: number;
  /** Total transitions since start */
  totalTransitions: number;
  /** Current frame time */
  currentFrameTime: number;
  /** Middle-range reduction active */
  middleReductionActive: boolean;
  /** Performance gain from spatial LOD (estimated %) */
  estimatedPerformanceGain: number;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_ZONES: SpatialZoneConfig[] = [
  {
    zone: SpatialZone.NEAR,
    minDistance: 0,
    maxDistance: 5,
    defaultLOD: LODLevel.LOD0,
    availableLODs: [LODLevel.LOD0, LODLevel.LOD1],
    performanceWeight: 0.1, // Low weight - preserve quality in near zone
    transitionBuffer: 0.5, // 0.5m buffer
  },
  {
    zone: SpatialZone.MIDDLE,
    minDistance: 5,
    maxDistance: 50,
    defaultLOD: LODLevel.LOD2,
    availableLODs: [LODLevel.LOD1, LODLevel.LOD2, LODLevel.LOD3],
    performanceWeight: 1.0, // Maximum weight - aggressive optimization target
    transitionBuffer: 2.0, // 2m buffer
  },
  {
    zone: SpatialZone.FAR,
    minDistance: 50,
    maxDistance: Infinity,
    defaultLOD: LODLevel.IMPOSTOR,
    availableLODs: [LODLevel.LOD3, LODLevel.IMPOSTOR],
    performanceWeight: 0.3, // Medium weight - already heavily optimized
    transitionBuffer: 5.0, // 5m buffer
  },
];

const DEFAULT_CONFIG: SpatialLODConfig = {
  zones: DEFAULT_ZONES,
  targetFrameTime: 11.1, // 90fps
  middleReductionThreshold: 11.1, // Trigger aggressive middle reduction if frame time exceeds this
  autoAdjust: true,
  enableAggressiveMiddleReduction: true,
  updateFrequency: 10, // 10Hz (update LODs 10 times per second)
  maxObjectsPerFrame: 50, // Update max 50 objects per frame to prevent stutter
};

// =============================================================================
// SPATIAL LOD MANAGER
// =============================================================================

/**
 * Manages spatial distance-based LOD optimization for VR rendering.
 *
 * CORE CONCEPT (Lost in Middle Analogy):
 * - Near objects (0-5m): Users interact directly - preserve quality
 * - Middle objects (5-50m): "Lost in middle" - aggressive LOD reduction yields max performance gain
 * - Far objects (50m+): Already heavily optimized (impostors) - minimal further gains
 *
 * USAGE:
 * ```typescript
 * const manager = new SpatialLODManager();
 *
 * // Register objects
 * manager.registerObject({
 *   id: 'tree_01',
 *   position: { x: 10, y: 0, z: 15 },
 *   lodGeometries: new Map([
 *     [LODLevel.LOD0, highPolyGeometry],
 *     [LODLevel.LOD2, mediumPolyGeometry],
 *     [LODLevel.IMPOSTOR, billboardGeometry],
 *   ]),
 *   priority: 0.5,
 *   alwaysHighQuality: false,
 * });
 *
 * // Update loop
 * function update(viewerPos: ViewerPosition, frameTime: number) {
 *   manager.update(viewerPos, frameTime);
 *   const changes = manager.getPendingLODChanges();
 *   applyLODChanges(changes);
 * }
 * ```
 */
export class SpatialLODManager {
  private config: SpatialLODConfig;
  private objects: Map<string, LODObject> = new Map();
  private pendingLODChanges: Map<string, LODLevel> = new Map();
  private lastUpdateTime: number = 0;
  private updateInterval: number;
  private totalTransitions: number = 0;
  private transitionsThisFrame: number = 0;
  private currentFrameTime: number = 0;
  private middleReductionActive: boolean = false;
  private objectUpdateQueue: string[] = [];
  private currentViewerPosition: ViewerPosition = { x: 0, y: 0, z: 0 };

  constructor(config?: Partial<SpatialLODConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.updateInterval = 1000 / this.config.updateFrequency; // Convert Hz to ms
  }

  // ───────────────────────────────────────────────────────────────────────────
  // OBJECT REGISTRATION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Register an object for LOD management
   */
  registerObject(object: Omit<LODObject, 'currentZone' | 'currentLOD' | 'lastZoneUpdate' | 'distance'>): void {
    const lodObject: LODObject = {
      ...object,
      currentZone: SpatialZone.NEAR,
      currentLOD: LODLevel.LOD0,
      lastZoneUpdate: Date.now(),
      distance: 0,
    };

    this.objects.set(object.id, lodObject);
    this.objectUpdateQueue.push(object.id);
  }

  /**
   * Unregister an object
   */
  unregisterObject(id: string): void {
    this.objects.delete(id);
    this.pendingLODChanges.delete(id);
    this.objectUpdateQueue = this.objectUpdateQueue.filter(objId => objId !== id);
  }

  /**
   * Update object position
   */
  updateObjectPosition(id: string, position: { x: number; y: number; z: number }): void {
    const obj = this.objects.get(id);
    if (obj) {
      obj.position = position;
      // Add to update queue if not already present
      if (!this.objectUpdateQueue.includes(id)) {
        this.objectUpdateQueue.push(id);
      }
    }
  }

  /**
   * Get all registered objects
   */
  getObjects(): LODObject[] {
    return Array.from(this.objects.values());
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CORE UPDATE LOOP
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Update LOD states based on viewer position and frame time
   * Call this once per frame
   */
  update(viewerPosition: ViewerPosition, frameTime: number): void {
    const now = Date.now();
    const deltaTime = now - this.lastUpdateTime;

    // Throttle updates to configured frequency
    if (deltaTime < this.updateInterval) {
      return;
    }

    this.lastUpdateTime = now;
    this.currentFrameTime = frameTime;
    this.currentViewerPosition = viewerPosition;
    this.transitionsThisFrame = 0;
    this.pendingLODChanges.clear();

    // Check if aggressive middle reduction is needed
    this.middleReductionActive =
      this.config.enableAggressiveMiddleReduction &&
      frameTime > this.config.middleReductionThreshold;

    // Process objects in batches to prevent update stutter
    const objectsToUpdate = this.objectUpdateQueue.splice(0, this.config.maxObjectsPerFrame);

    for (const objectId of objectsToUpdate) {
      const obj = this.objects.get(objectId);
      if (!obj) continue;

      // Calculate distance to viewer
      obj.distance = this.calculateDistance(obj.position, viewerPosition);

      // Determine spatial zone
      const newZone = this.determineSpatialZone(obj.distance);

      // Calculate target LOD level
      const targetLOD = this.calculateTargetLOD(obj, newZone);

      // Apply LOD change if needed
      if (targetLOD !== obj.currentLOD) {
        this.applyLODChange(obj, targetLOD, newZone);
      } else if (newZone !== obj.currentZone) {
        // Zone changed but LOD same - update zone tracking
        obj.currentZone = newZone;
        obj.lastZoneUpdate = now;
      }
    }

    // Re-queue objects that weren't updated this frame
    if (this.objectUpdateQueue.length === 0) {
      this.objectUpdateQueue = Array.from(this.objects.keys());
    }
  }

  /**
   * Calculate Euclidean distance between two 3D points
   */
  private calculateDistance(
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number }
  ): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Determine spatial zone based on distance
   */
  private determineSpatialZone(distance: number): SpatialZone {
    for (const zoneConfig of this.config.zones) {
      if (distance >= zoneConfig.minDistance && distance < zoneConfig.maxDistance) {
        return zoneConfig.zone;
      }
    }
    return SpatialZone.FAR; // Default to far zone
  }

  /**
   * Calculate target LOD level for an object
   */
  private calculateTargetLOD(obj: LODObject, zone: SpatialZone): LODLevel {
    // Force high quality if flagged
    if (obj.alwaysHighQuality) {
      return LODLevel.LOD0;
    }

    const zoneConfig = this.config.zones.find(z => z.zone === zone);
    if (!zoneConfig) {
      return obj.currentLOD; // Fallback to current LOD
    }

    // Base LOD from zone configuration
    let targetLOD = zoneConfig.defaultLOD;

    // Apply aggressive middle reduction if frame time exceeded
    if (this.middleReductionActive && zone === SpatialZone.MIDDLE) {
      // Force to lowest available LOD in middle zone
      const availableLODs = zoneConfig.availableLODs;
      targetLOD = availableLODs[availableLODs.length - 1]; // Last element = lowest quality
    }

    // Check if object has this LOD geometry available
    if (!obj.lodGeometries.has(targetLOD)) {
      // Find closest available LOD
      targetLOD = this.findClosestAvailableLOD(obj, targetLOD, zoneConfig.availableLODs);
    }

    return targetLOD;
  }

  /**
   * Find closest available LOD geometry
   */
  private findClosestAvailableLOD(
    obj: LODObject,
    targetLOD: LODLevel,
    availableLODs: LODLevel[]
  ): LODLevel {
    // Find available LODs sorted by proximity to target
    const sortedAvailable = availableLODs
      .filter(lod => obj.lodGeometries.has(lod))
      .sort((a, b) => Math.abs(a - targetLOD) - Math.abs(b - targetLOD));

    return sortedAvailable[0] || obj.currentLOD; // Fallback to current if none available
  }

  /**
   * Apply LOD change with transition tracking
   */
  private applyLODChange(obj: LODObject, newLOD: LODLevel, newZone: SpatialZone): void {
    const oldLOD = obj.currentLOD;

    // Check transition buffer to prevent rapid oscillation
    const zoneConfig = this.config.zones.find(z => z.zone === newZone);
    const timeSinceLastChange = Date.now() - obj.lastZoneUpdate;
    const minTransitionTime = 500; // 500ms minimum between transitions

    if (timeSinceLastChange < minTransitionTime && Math.abs(newLOD - oldLOD) === 1) {
      // Skip transition if too soon and only 1 level difference (prevents jitter)
      return;
    }

    // Update object state
    obj.currentLOD = newLOD;
    obj.currentZone = newZone;
    obj.lastZoneUpdate = Date.now();

    // Track pending change for renderer
    this.pendingLODChanges.set(obj.id, newLOD);

    // Metrics
    this.transitionsThisFrame++;
    this.totalTransitions++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Get pending LOD changes for renderer to apply
   * Returns map of object ID -> new LOD level
   */
  getPendingLODChanges(): Map<string, LODLevel> {
    return new Map(this.pendingLODChanges);
  }

  /**
   * Clear pending LOD changes (call after applying to renderer)
   */
  clearPendingChanges(): void {
    this.pendingLODChanges.clear();
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics(): SpatialLODMetrics {
    const objectsByZone: Record<SpatialZone, number> = {
      [SpatialZone.NEAR]: 0,
      [SpatialZone.MIDDLE]: 0,
      [SpatialZone.FAR]: 0,
    };

    const objectsByLOD: Record<LODLevel, number> = {
      [LODLevel.LOD0]: 0,
      [LODLevel.LOD1]: 0,
      [LODLevel.LOD2]: 0,
      [LODLevel.LOD3]: 0,
      [LODLevel.IMPOSTOR]: 0,
    };

    let totalDistance = 0;

    for (const obj of this.objects.values()) {
      objectsByZone[obj.currentZone]++;
      objectsByLOD[obj.currentLOD]++;
      totalDistance += obj.distance;
    }

    const totalObjects = this.objects.size;
    const averageDistance = totalObjects > 0 ? totalDistance / totalObjects : 0;

    // Estimate performance gain (rough heuristic)
    const middleObjectCount = objectsByZone[SpatialZone.MIDDLE];
    const middleLowLOD = objectsByLOD[LODLevel.LOD2] + objectsByLOD[LODLevel.LOD3];
    const middleOptimizationRate = middleObjectCount > 0 ? middleLowLOD / middleObjectCount : 0;
    const estimatedPerformanceGain = middleOptimizationRate * 30; // ~30% gain at full middle optimization

    return {
      totalObjects,
      objectsByZone,
      objectsByLOD,
      averageDistance,
      transitionsThisFrame: this.transitionsThisFrame,
      totalTransitions: this.totalTransitions,
      currentFrameTime: this.currentFrameTime,
      middleReductionActive: this.middleReductionActive,
      estimatedPerformanceGain,
    };
  }

  /**
   * Force update all objects immediately (ignores throttle)
   */
  forceUpdateAll(viewerPosition: ViewerPosition, frameTime: number): void {
    this.lastUpdateTime = 0; // Reset throttle
    this.objectUpdateQueue = Array.from(this.objects.keys()); // Queue all objects
    this.update(viewerPosition, frameTime);
  }

  /**
   * Reset manager state
   */
  reset(): void {
    this.pendingLODChanges.clear();
    this.totalTransitions = 0;
    this.transitionsThisFrame = 0;
    this.middleReductionActive = false;
    this.objectUpdateQueue = Array.from(this.objects.keys());
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SpatialLODConfig>): void {
    this.config = { ...this.config, ...config };
    this.updateInterval = 1000 / this.config.updateFrequency;
  }

  /**
   * Get current configuration
   */
  getConfig(): SpatialLODConfig {
    return { ...this.config };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const metrics = this.getMetrics();

    const lines: string[] = [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '  SPATIAL LOD PERFORMANCE REPORT',
      '  "Lost in Middle" Optimization Strategy',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      '── Object Distribution ──',
      `  Total Objects:         ${metrics.totalObjects}`,
      `  Near Zone (0-5m):      ${metrics.objectsByZone[SpatialZone.NEAR]} objects`,
      `  Middle Zone (5-50m):   ${metrics.objectsByZone[SpatialZone.MIDDLE]} objects ← Optimization Target`,
      `  Far Zone (50m+):       ${metrics.objectsByZone[SpatialZone.FAR]} objects`,
      `  Average Distance:      ${metrics.averageDistance.toFixed(1)}m`,
      '',
      '── LOD Distribution ──',
      `  LOD0 (Full):           ${metrics.objectsByLOD[LODLevel.LOD0]}`,
      `  LOD1 (High):           ${metrics.objectsByLOD[LODLevel.LOD1]}`,
      `  LOD2 (Medium):         ${metrics.objectsByLOD[LODLevel.LOD2]}`,
      `  LOD3 (Low):            ${metrics.objectsByLOD[LODLevel.LOD3]}`,
      `  Impostor (Billboard):  ${metrics.objectsByLOD[LODLevel.IMPOSTOR]}`,
      '',
      '── Performance ──',
      `  Current Frame Time:    ${metrics.currentFrameTime.toFixed(2)} ms`,
      `  Target Frame Time:     ${this.config.targetFrameTime.toFixed(2)} ms (90fps)`,
      `  Middle Reduction:      ${metrics.middleReductionActive ? 'ACTIVE ⚡' : 'Inactive'}`,
      `  Est. Performance Gain: ${metrics.estimatedPerformanceGain.toFixed(1)}%`,
      `  Transitions (Frame):   ${metrics.transitionsThisFrame}`,
      `  Total Transitions:     ${metrics.totalTransitions}`,
      '',
      '── Strategy Summary ──',
      '  Near Objects:   Preserve quality (user interaction zone)',
      '  Middle Objects: Aggressive LOD reduction (lost in middle)',
      '  Far Objects:    Impostors/billboards (already optimized)',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ];

    return lines.join('\n');
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate recommended spatial zones based on scene bounds
 */
export function calculateRecommendedZones(sceneBounds: {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}): SpatialZoneConfig[] {
  // Calculate scene diagonal
  const dx = sceneBounds.max.x - sceneBounds.min.x;
  const dy = sceneBounds.max.y - sceneBounds.min.y;
  const dz = sceneBounds.max.z - sceneBounds.min.z;
  const sceneDiagonal = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Adaptive zone sizing based on scene scale
  const nearMaxDistance = Math.min(5, sceneDiagonal * 0.1);
  const middleMaxDistance = Math.min(50, sceneDiagonal * 0.5);

  return [
    {
      zone: SpatialZone.NEAR,
      minDistance: 0,
      maxDistance: nearMaxDistance,
      defaultLOD: LODLevel.LOD0,
      availableLODs: [LODLevel.LOD0, LODLevel.LOD1],
      performanceWeight: 0.1,
      transitionBuffer: nearMaxDistance * 0.1,
    },
    {
      zone: SpatialZone.MIDDLE,
      minDistance: nearMaxDistance,
      maxDistance: middleMaxDistance,
      defaultLOD: LODLevel.LOD2,
      availableLODs: [LODLevel.LOD1, LODLevel.LOD2, LODLevel.LOD3],
      performanceWeight: 1.0,
      transitionBuffer: (middleMaxDistance - nearMaxDistance) * 0.05,
    },
    {
      zone: SpatialZone.FAR,
      minDistance: middleMaxDistance,
      maxDistance: Infinity,
      defaultLOD: LODLevel.IMPOSTOR,
      availableLODs: [LODLevel.LOD3, LODLevel.IMPOSTOR],
      performanceWeight: 0.3,
      transitionBuffer: sceneDiagonal * 0.1,
    },
  ];
}

/**
 * Estimate polygon reduction from LOD level
 */
export function estimatePolygonReduction(fromLOD: LODLevel, toLOD: LODLevel): number {
  const lodReductionRates: Record<LODLevel, number> = {
    [LODLevel.LOD0]: 1.0, // 100% of original
    [LODLevel.LOD1]: 0.75, // 75% of original
    [LODLevel.LOD2]: 0.5, // 50% of original
    [LODLevel.LOD3]: 0.25, // 25% of original
    [LODLevel.IMPOSTOR]: 0.01, // ~1% (2 triangles for billboard)
  };

  const fromRate = lodReductionRates[fromLOD];
  const toRate = lodReductionRates[toLOD];

  return ((fromRate - toRate) / fromRate) * 100; // Return percentage reduction
}
