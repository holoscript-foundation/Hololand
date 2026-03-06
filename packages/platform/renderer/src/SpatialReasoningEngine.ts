/**
 * SpatialReasoningEngine
 *
 * Default implementation of the SpatialReasoningProvider interface.
 * Performs spatial analysis of the Three.js scene graph at 1-5Hz,
 * producing cached spatial state consumed by the renderer at 90Hz.
 *
 * TIER 1 (SLOW PATH):
 * This engine runs on its own timing loop, completely decoupled from
 * the VR render loop. It has a generous budget of 200-1000ms per pass,
 * allowing it to perform computationally expensive spatial reasoning:
 *
 * - Scene graph traversal and bounding box computation
 * - Pairwise spatial relationship detection
 * - Region clustering and classification
 * - Occlusion estimation (CPU-side, conservative)
 * - Navigation hint generation
 * - Spatial label placement
 *
 * INTEGRATION:
 * The engine does NOT access the Three.js scene directly from the
 * inference loop. Instead, it takes a snapshot of object transforms
 * and works on that snapshot. This avoids any contention with the
 * render thread.
 *
 * ```typescript
 * const engine = new SpatialReasoningEngine();
 * engine.setSceneSnapshot(objectSnapshots, cameraSnapshot);
 *
 * // Called by InferenceScheduler at 1-5Hz:
 * await engine.infer(spatialState, deltaMs);
 * ```
 *
 * @module SpatialReasoningEngine
 */

import { logger } from './logger';
import type { Vec3 } from './AgentStateBuffer';
import type {
  CachedSpatialState,
  SpatialReasoningProvider,
  SpatialRelationship,
  SpatialRelationType,
  SpatialRegion,
  OcclusionState,
  SpatialLabel,
} from './SpatialInferenceTypes';

// =============================================================================
// SCENE SNAPSHOT TYPES
// =============================================================================

/**
 * Lightweight snapshot of an object's transform and bounds.
 * Taken from the Three.js scene graph between frames, then processed
 * by the inference engine without touching the scene graph again.
 */
export interface ObjectSnapshot {
  /** Object ID (matches Three.js object name/uuid) */
  id: string;
  /** Object type (mesh, group, light, etc.) */
  type: string;
  /** World-space position */
  position: Vec3;
  /** World-space rotation (Euler angles in radians) */
  rotation: Vec3;
  /** World-space scale */
  scale: Vec3;
  /** Axis-aligned bounding box min */
  boundsMin: Vec3;
  /** Axis-aligned bounding box max */
  boundsMax: Vec3;
  /** Whether the object is currently visible */
  visible: boolean;
  /** Optional label or name */
  label?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Camera snapshot for view-dependent spatial reasoning
 */
export interface CameraSnapshot {
  /** Camera world-space position */
  position: Vec3;
  /** Camera forward direction (normalized) */
  forward: Vec3;
  /** Camera up direction (normalized) */
  up: Vec3;
  /** Camera right direction (normalized) */
  right: Vec3;
  /** Field of view in degrees */
  fov: number;
  /** Near clipping plane distance */
  near: number;
  /** Far clipping plane distance */
  far: number;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Configuration for the SpatialReasoningEngine
 */
export interface SpatialReasoningEngineConfig {
  /** Distance threshold for "near" relationship (default: 5) */
  nearThreshold?: number;
  /** Distance threshold for "adjacent" relationship (default: 1.5) */
  adjacentThreshold?: number;
  /** Minimum confidence to include a relationship (0-1, default: 0.3) */
  minRelationshipConfidence?: number;
  /** Maximum number of relationships to compute per pass (default: 500) */
  maxRelationships?: number;
  /** Enable region detection (default: true) */
  enableRegionDetection?: boolean;
  /** Minimum cluster size for region detection (default: 3) */
  minClusterSize?: number;
  /** Cluster distance threshold (default: 8) */
  clusterDistanceThreshold?: number;
  /** Enable occlusion estimation (default: true) */
  enableOcclusion?: boolean;
  /** Enable spatial label generation (default: true) */
  enableLabels?: boolean;
  /** Maximum label visibility distance (default: 50) */
  maxLabelDistance?: number;
}

const DEFAULT_CONFIG: Required<SpatialReasoningEngineConfig> = {
  nearThreshold: 5,
  adjacentThreshold: 1.5,
  minRelationshipConfidence: 0.3,
  maxRelationships: 500,
  enableRegionDetection: true,
  minClusterSize: 3,
  clusterDistanceThreshold: 8,
  enableOcclusion: true,
  enableLabels: true,
  maxLabelDistance: 50,
};

// =============================================================================
// SPATIAL REASONING ENGINE
// =============================================================================

export class SpatialReasoningEngine implements SpatialReasoningProvider {
  private config: Required<SpatialReasoningEngineConfig>;

  // Scene snapshot (taken between frames, processed during inference)
  private objects: ObjectSnapshot[] = [];
  private camera: CameraSnapshot = {
    position: { x: 0, y: 0, z: 0 },
    forward: { x: 0, y: 0, z: -1 },
    up: { x: 0, y: 1, z: 0 },
    right: { x: 1, y: 0, z: 0 },
    fov: 75,
    near: 0.1,
    far: 1000,
  };

  // Complexity tracking
  private currentComplexity: number = 0;

  constructor(config?: SpatialReasoningEngineConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.info('[SpatialReasoningEngine] Initialized', { config: this.config });
  }

  // ===========================================================================
  // SCENE SNAPSHOT API
  // ===========================================================================

  /**
   * Update the scene snapshot that inference will operate on.
   *
   * TIMING: Call this between frames, before the inference pass.
   * Typically called by InferenceScheduler just before triggering infer().
   *
   * This method takes O(n) where n = number of objects, but is fast because
   * it only copies plain data (no Three.js scene graph traversal during inference).
   *
   * @param objects - Array of object snapshots from the scene
   * @param camera - Camera snapshot for view-dependent reasoning
   */
  setSceneSnapshot(objects: ObjectSnapshot[], camera: CameraSnapshot): void {
    this.objects = objects;
    this.camera = camera;

    // Update complexity based on object count and density
    this.currentComplexity = this.computeComplexity();
  }

  /**
   * Get the current object snapshot count
   */
  getObjectCount(): number {
    return this.objects.length;
  }

  // ===========================================================================
  // SpatialReasoningProvider INTERFACE
  // ===========================================================================

  /**
   * Run a single inference pass.
   *
   * Budget: 200-1000ms (called at 1-5Hz, NOT at 90Hz)
   *
   * Populates the provided state with spatial reasoning results:
   * 1. Compute pairwise spatial relationships
   * 2. Detect spatial regions/clusters
   * 3. Estimate occlusion states
   * 4. Generate spatial labels
   * 5. Compute scene summary statistics
   */
  async infer(state: CachedSpatialState, deltaMs: number): Promise<void> {
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const visibleObjects = this.objects.filter(obj => obj.visible);

    // ─── Phase 1: Spatial Relationships ────────────────────────────────
    state.relationships = this.computeRelationships(visibleObjects);

    // ─── Phase 2: Region Detection ─────────────────────────────────────
    if (this.config.enableRegionDetection) {
      state.regions = this.detectRegions(visibleObjects);
    } else {
      state.regions = [];
    }

    // ─── Phase 3: Occlusion Estimation ─────────────────────────────────
    if (this.config.enableOcclusion) {
      state.occlusionStates = this.estimateOcclusion(visibleObjects);
    } else {
      state.occlusionStates = {};
    }

    // ─── Phase 4: Spatial Labels ───────────────────────────────────────
    if (this.config.enableLabels) {
      state.labels = this.generateLabels(visibleObjects, state.regions);
    } else {
      state.labels = [];
    }

    // ─── Phase 5: Scene Summary ────────────────────────────────────────
    const { center, extents } = this.computeSceneBounds(visibleObjects);
    state.objectCount = visibleObjects.length;
    state.sceneComplexity = this.currentComplexity;
    state.sceneCenterOfMass = center;
    state.sceneExtents = extents;

    // ─── Timing ────────────────────────────────────────────────────────
    const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    state.lastInferenceDurationMs = endTime - startTime;
    state.lastInferenceTimestamp = endTime;
    state.sequence++;

    logger.debug('[SpatialReasoningEngine] Inference pass complete', {
      sequence: state.sequence,
      durationMs: state.lastInferenceDurationMs.toFixed(2),
      objectCount: state.objectCount,
      relationships: state.relationships.length,
      regions: state.regions.length,
      complexity: state.sceneComplexity.toFixed(3),
    });
  }

  /**
   * Get the current scene complexity score (0-1).
   */
  getComplexity(): number {
    return this.currentComplexity;
  }

  /**
   * Initialize the engine (optional resources setup)
   */
  async initialize(): Promise<void> {
    logger.info('[SpatialReasoningEngine] Initialized resources');
  }

  /**
   * Dispose the engine and release resources
   */
  dispose(): void {
    this.objects = [];
    this.currentComplexity = 0;
    logger.info('[SpatialReasoningEngine] Disposed');
  }

  // ===========================================================================
  // SPATIAL RELATIONSHIP COMPUTATION
  // ===========================================================================

  /**
   * Compute pairwise spatial relationships between visible objects.
   *
   * Complexity: O(n^2) for n objects, but bounded by maxRelationships.
   * At 100 objects: 4,950 pairs to check, typically completes in < 50ms.
   * At 500 objects: 124,750 pairs, may take 100-200ms.
   */
  private computeRelationships(objects: ObjectSnapshot[]): SpatialRelationship[] {
    const relationships: SpatialRelationship[] = [];
    const maxRelationships = this.config.maxRelationships;

    for (let i = 0; i < objects.length && relationships.length < maxRelationships; i++) {
      for (let j = i + 1; j < objects.length && relationships.length < maxRelationships; j++) {
        const a = objects[i];
        const b = objects[j];

        const dx = b.position.x - a.position.x;
        const dy = b.position.y - a.position.y;
        const dz = b.position.z - a.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Normalize direction
        const invDist = distance > 0.0001 ? 1 / distance : 0;
        const direction: Vec3 = {
          x: dx * invDist,
          y: dy * invDist,
          z: dz * invDist,
        };

        // Determine relationship type and confidence
        const detected = this.classifyRelationship(a, b, distance, direction);

        for (const { type, confidence } of detected) {
          if (confidence >= this.config.minRelationshipConfidence) {
            relationships.push({
              sourceId: a.id,
              targetId: b.id,
              type,
              confidence,
              distance,
              direction,
            });
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Classify the spatial relationship between two objects.
   * Returns multiple relationships with confidence scores.
   */
  private classifyRelationship(
    a: ObjectSnapshot,
    b: ObjectSnapshot,
    distance: number,
    direction: Vec3,
  ): Array<{ type: SpatialRelationType; confidence: number }> {
    const results: Array<{ type: SpatialRelationType; confidence: number }> = [];

    // Distance-based relationships
    if (distance <= this.config.adjacentThreshold) {
      results.push({ type: 'adjacent', confidence: 1.0 - distance / this.config.adjacentThreshold });
    }
    if (distance <= this.config.nearThreshold) {
      results.push({ type: 'near', confidence: 1.0 - distance / this.config.nearThreshold });
    } else {
      results.push({ type: 'far', confidence: Math.min(distance / (this.config.nearThreshold * 3), 1.0) });
    }

    // Vertical relationships (Y-axis dominant)
    const absY = Math.abs(direction.y);
    if (absY > 0.6) {
      if (direction.y > 0) {
        results.push({ type: 'below', confidence: absY }); // b is above a, so a is below b
      } else {
        results.push({ type: 'above', confidence: absY }); // b is below a, so a is above b
      }
    }

    // View-relative relationships (using camera forward/right)
    const camRight = this.camera.right;
    const camForward = this.camera.forward;

    // Dot product with camera right to determine left/right
    const rightDot = direction.x * camRight.x + direction.y * camRight.y + direction.z * camRight.z;
    if (Math.abs(rightDot) > 0.5) {
      if (rightDot > 0) {
        results.push({ type: 'left_of', confidence: Math.abs(rightDot) });
      } else {
        results.push({ type: 'right_of', confidence: Math.abs(rightDot) });
      }
    }

    // Dot product with camera forward to determine in-front/behind
    const forwardDot = direction.x * camForward.x + direction.y * camForward.y + direction.z * camForward.z;
    if (Math.abs(forwardDot) > 0.5) {
      if (forwardDot > 0) {
        results.push({ type: 'in_front_of', confidence: Math.abs(forwardDot) });
      } else {
        results.push({ type: 'behind', confidence: Math.abs(forwardDot) });
      }
    }

    // Bounding box containment
    if (this.boundsContain(a, b)) {
      results.push({ type: 'contains', confidence: 0.9 });
    } else if (this.boundsContain(b, a)) {
      results.push({ type: 'contained_by', confidence: 0.9 });
    } else if (this.boundsOverlap(a, b)) {
      results.push({ type: 'overlapping', confidence: 0.8 });
    }

    // Axis alignment detection
    const alignmentConfidence = this.detectAlignment(a, b);
    if (alignmentConfidence > 0.5) {
      results.push({ type: 'aligned', confidence: alignmentConfidence });
    }

    return results;
  }

  /**
   * Check if object A's bounds contain object B
   */
  private boundsContain(a: ObjectSnapshot, b: ObjectSnapshot): boolean {
    return (
      b.boundsMin.x >= a.boundsMin.x && b.boundsMax.x <= a.boundsMax.x &&
      b.boundsMin.y >= a.boundsMin.y && b.boundsMax.y <= a.boundsMax.y &&
      b.boundsMin.z >= a.boundsMin.z && b.boundsMax.z <= a.boundsMax.z
    );
  }

  /**
   * Check if object A's bounds overlap with object B's bounds
   */
  private boundsOverlap(a: ObjectSnapshot, b: ObjectSnapshot): boolean {
    return (
      a.boundsMin.x <= b.boundsMax.x && a.boundsMax.x >= b.boundsMin.x &&
      a.boundsMin.y <= b.boundsMax.y && a.boundsMax.y >= b.boundsMin.y &&
      a.boundsMin.z <= b.boundsMax.z && a.boundsMax.z >= b.boundsMin.z
    );
  }

  /**
   * Detect if two objects are aligned on any axis
   */
  private detectAlignment(a: ObjectSnapshot, b: ObjectSnapshot): number {
    const threshold = 0.3; // Maximum deviation for alignment

    const xAligned = Math.abs(a.position.x - b.position.x) < threshold;
    const yAligned = Math.abs(a.position.y - b.position.y) < threshold;
    const zAligned = Math.abs(a.position.z - b.position.z) < threshold;

    const alignedAxes = (xAligned ? 1 : 0) + (yAligned ? 1 : 0) + (zAligned ? 1 : 0);

    // At least 1 axis must be aligned, 2+ gives high confidence
    if (alignedAxes === 0) return 0;
    return 0.3 + (alignedAxes - 1) * 0.35;
  }

  // ===========================================================================
  // REGION DETECTION
  // ===========================================================================

  /**
   * Detect spatial regions by clustering nearby objects.
   *
   * Uses a simple density-based clustering approach:
   * 1. For each unvisited object, check if it has enough neighbors within threshold
   * 2. If yes, grow the cluster by adding all reachable neighbors
   * 3. Convert clusters to SpatialRegion objects
   */
  private detectRegions(objects: ObjectSnapshot[]): SpatialRegion[] {
    const regions: SpatialRegion[] = [];
    const visited = new Set<string>();
    const threshold = this.config.clusterDistanceThreshold;
    const minCluster = this.config.minClusterSize;

    for (const obj of objects) {
      if (visited.has(obj.id)) continue;
      visited.add(obj.id);

      // Find neighbors within threshold
      const cluster: ObjectSnapshot[] = [obj];
      const queue: ObjectSnapshot[] = [obj];

      while (queue.length > 0) {
        const current = queue.shift()!;
        for (const candidate of objects) {
          if (visited.has(candidate.id)) continue;

          const dist = this.distanceBetween(current.position, candidate.position);
          if (dist <= threshold) {
            visited.add(candidate.id);
            cluster.push(candidate);
            queue.push(candidate);
          }
        }
      }

      // Only create region if cluster meets minimum size
      if (cluster.length >= minCluster) {
        const { center, extents } = this.computeClusterBounds(cluster);
        regions.push({
          id: `region-${regions.length}`,
          label: `Cluster ${regions.length + 1} (${cluster.length} objects)`,
          center,
          extents,
          objectIds: cluster.map(o => o.id),
          type: 'cluster',
          confidence: Math.min(cluster.length / 10, 1.0),
          metadata: {
            objectCount: cluster.length,
            density: cluster.length / (extents.x * extents.y * extents.z || 1),
          },
        });
      }
    }

    return regions;
  }

  // ===========================================================================
  // OCCLUSION ESTIMATION
  // ===========================================================================

  /**
   * Estimate per-object occlusion from the camera's perspective.
   *
   * This is a CPU-side conservative estimate, NOT pixel-perfect occlusion.
   * Uses bounding box overlap testing along camera viewing rays.
   * Good enough for culling decisions at the inference tier.
   */
  private estimateOcclusion(objects: ObjectSnapshot[]): Record<string, OcclusionState> {
    const states: Record<string, OcclusionState> = {};
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // Sort objects by distance to camera (front to back)
    const sortedByDistance = [...objects].sort((a, b) => {
      const distA = this.distanceBetween(a.position, this.camera.position);
      const distB = this.distanceBetween(b.position, this.camera.position);
      return distA - distB;
    });

    // Simple front-to-back occlusion check
    for (let i = 0; i < sortedByDistance.length; i++) {
      const obj = sortedByDistance[i];
      const occludedBy: string[] = [];

      // Check if any closer object occludes this one
      for (let j = 0; j < i; j++) {
        const closer = sortedByDistance[j];
        if (this.doesOcclude(closer, obj)) {
          occludedBy.push(closer.id);
        }
      }

      // Frustum check: is object in front of camera?
      const toObj = this.subtract(obj.position, this.camera.position);
      const dot = this.dot(toObj, this.camera.forward);
      const inFrustum = dot > this.camera.near;

      const distToCamera = this.distanceBetween(obj.position, this.camera.position);
      const inRange = distToCamera <= this.camera.far;

      states[obj.id] = {
        objectId: obj.id,
        potentiallyVisible: inFrustum && inRange && occludedBy.length === 0,
        visibilityRatio: occludedBy.length === 0 ? 1.0 : Math.max(0, 1.0 - occludedBy.length * 0.3),
        occludedBy,
        lastComputedTimestamp: now,
      };
    }

    return states;
  }

  /**
   * Conservative occlusion test: does object A occlude object B from camera?
   * Uses bounding box projection overlap.
   */
  private doesOcclude(a: ObjectSnapshot, b: ObjectSnapshot): boolean {
    // Simple heuristic: A occludes B if:
    // 1. A is closer to camera than B
    // 2. A's projected bounding box overlaps B's projected bounding box (in camera space)
    // 3. A is large enough to cover a significant portion of B

    const distA = this.distanceBetween(a.position, this.camera.position);
    const distB = this.distanceBetween(b.position, this.camera.position);

    if (distA >= distB) return false;

    // Check if A is roughly in front of B from camera's perspective
    const toA = this.subtract(a.position, this.camera.position);
    const toB = this.subtract(b.position, this.camera.position);
    const normalizedA = this.normalize(toA);
    const normalizedB = this.normalize(toB);

    // Direction similarity (how similar are the directions to A and B from camera)
    const directionSimilarity = this.dot(normalizedA, normalizedB);

    // A must be roughly in the same direction as B from the camera
    if (directionSimilarity < 0.85) return false;

    // A must have sufficient size to occlude
    const sizeA = this.boundsSize(a);
    const sizeB = this.boundsSize(b);
    const sizeRatio = sizeA / (sizeB || 0.001);

    return sizeRatio > 0.5;
  }

  // ===========================================================================
  // SPATIAL LABEL GENERATION
  // ===========================================================================

  /**
   * Generate spatial labels for objects and regions.
   */
  private generateLabels(
    objects: ObjectSnapshot[],
    regions: SpatialRegion[],
  ): SpatialLabel[] {
    const labels: SpatialLabel[] = [];

    // Generate labels for named objects
    for (const obj of objects) {
      if (obj.label) {
        labels.push({
          id: `label-obj-${obj.id}`,
          text: obj.label,
          position: {
            x: obj.position.x,
            y: obj.boundsMax.y + 0.5, // Above object
            z: obj.position.z,
          },
          category: 'info',
          confidence: 1.0,
          billboard: true,
          targetObjectId: obj.id,
          maxVisibilityDistance: this.config.maxLabelDistance,
        });
      }
    }

    // Generate labels for regions
    for (const region of regions) {
      labels.push({
        id: `label-region-${region.id}`,
        text: region.label,
        position: {
          x: region.center.x,
          y: region.center.y + region.extents.y + 1.0, // Above region
          z: region.center.z,
        },
        category: 'annotation',
        confidence: region.confidence,
        billboard: true,
        maxVisibilityDistance: this.config.maxLabelDistance * 1.5,
      });
    }

    return labels;
  }

  // ===========================================================================
  // SCENE ANALYSIS UTILITIES
  // ===========================================================================

  /**
   * Compute overall scene complexity (0-1).
   * Higher complexity = more objects + higher density + more relationships.
   */
  private computeComplexity(): number {
    const objectCount = this.objects.length;
    if (objectCount === 0) return 0;

    // Object count factor (logarithmic scaling)
    const countFactor = Math.min(Math.log10(objectCount + 1) / 3, 1.0); // 1000 objects = 1.0

    // Density factor (objects per unit volume)
    const { extents } = this.computeSceneBounds(this.objects);
    const volume = Math.max(extents.x * extents.y * extents.z, 1);
    const density = objectCount / volume;
    const densityFactor = Math.min(density / 10, 1.0);

    // Weighted combination
    return countFactor * 0.6 + densityFactor * 0.4;
  }

  /**
   * Compute the bounding box of all objects
   */
  private computeSceneBounds(objects: ObjectSnapshot[]): { center: Vec3; extents: Vec3 } {
    if (objects.length === 0) {
      return {
        center: { x: 0, y: 0, z: 0 },
        extents: { x: 0, y: 0, z: 0 },
      };
    }

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const obj of objects) {
      minX = Math.min(minX, obj.boundsMin.x);
      minY = Math.min(minY, obj.boundsMin.y);
      minZ = Math.min(minZ, obj.boundsMin.z);
      maxX = Math.max(maxX, obj.boundsMax.x);
      maxY = Math.max(maxY, obj.boundsMax.y);
      maxZ = Math.max(maxZ, obj.boundsMax.z);
    }

    return {
      center: {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        z: (minZ + maxZ) / 2,
      },
      extents: {
        x: maxX - minX,
        y: maxY - minY,
        z: maxZ - minZ,
      },
    };
  }

  /**
   * Compute cluster bounds
   */
  private computeClusterBounds(cluster: ObjectSnapshot[]): { center: Vec3; extents: Vec3 } {
    return this.computeSceneBounds(cluster);
  }

  // ===========================================================================
  // VECTOR MATH UTILITIES (avoid Three.js dependency in inference thread)
  // ===========================================================================

  private distanceBetween(a: Vec3, b: Vec3): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private subtract(a: Vec3, b: Vec3): Vec3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }

  private dot(a: Vec3, b: Vec3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  private normalize(v: Vec3): Vec3 {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len < 0.0001) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  }

  private boundsSize(obj: ObjectSnapshot): number {
    const dx = obj.boundsMax.x - obj.boundsMin.x;
    const dy = obj.boundsMax.y - obj.boundsMin.y;
    const dz = obj.boundsMax.z - obj.boundsMin.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a SpatialReasoningEngine with default configuration.
 */
export function createSpatialReasoningEngine(
  config?: SpatialReasoningEngineConfig,
): SpatialReasoningEngine {
  return new SpatialReasoningEngine(config);
}
