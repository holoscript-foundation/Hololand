/**
 * @hololand/lod - Culling System
 * Visibility culling for performance optimization
 */

import {
  Vec3,
  BoundingSphere,
  BoundingBox,
  Frustum,
  CullingConfig,
  CullingResult,
  CullingStats,
  Occluder,
  OcclusionQuery,
  VisibilityState,
  Camera,
} from './types';
import { vec3Distance, sphereInFrustum } from './manager';
import { SIMDFrustumCuller } from './simd-frustum-culler';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create bounding box from bounding sphere
 */
export function boundingBoxFromSphere(sphere: BoundingSphere): BoundingBox {
  return {
    min: {
      x: sphere.center.x - sphere.radius,
      y: sphere.center.y - sphere.radius,
      z: sphere.center.z - sphere.radius,
    },
    max: {
      x: sphere.center.x + sphere.radius,
      y: sphere.center.y + sphere.radius,
      z: sphere.center.z + sphere.radius,
    },
  };
}

/**
 * Check if bounding box is in frustum
 */
function boxInFrustum(box: BoundingBox, frustum: Frustum): boolean {
  for (const plane of frustum.planes) {
    // Find the positive vertex (furthest along plane normal)
    const positive: Vec3 = {
      x: plane.normal.x >= 0 ? box.max.x : box.min.x,
      y: plane.normal.y >= 0 ? box.max.y : box.min.y,
      z: plane.normal.z >= 0 ? box.max.z : box.min.z,
    };

    // If positive vertex is behind plane, box is outside
    const distance =
      plane.normal.x * positive.x +
      plane.normal.y * positive.y +
      plane.normal.z * positive.z +
      plane.distance;

    if (distance < 0) {
      return false;
    }
  }
  return true;
}

/**
 * Calculate screen size in pixels
 */
function calculateScreenSize(
  bounds: BoundingSphere,
  camera: Camera
): number {
  const distance = vec3Distance(camera.position, bounds.center);
  if (distance <= 0) return camera.viewport.height;

  // Project radius to screen space
  const projectedSize =
    (bounds.radius / distance) * camera.viewport.height / Math.tan(camera.fov / 2);

  return projectedSize * 2;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CULLING_CONFIG: CullingConfig = {
  frustumCulling: true,
  distanceCulling: true,
  maxRenderDistance: 1000,
  occlusionCulling: false,
  smallObjectCulling: true,
  minScreenSize: 2,
};

// ============================================================================
// Frustum Culler
// ============================================================================

export interface CullableObject {
  id: string;
  bounds: BoundingSphere;
  boundingBox?: BoundingBox;
}

/**
 * Culls objects outside the view frustum
 */
export class FrustumCuller {
  private frustum: Frustum | null = null;

  /**
   * Update frustum
   */
  setFrustum(frustum: Frustum): void {
    this.frustum = frustum;
  }

  /**
   * Test if object is visible
   */
  isVisible(object: CullableObject): boolean {
    if (!this.frustum) return true;

    // Use bounding box if available (more precise)
    if (object.boundingBox) {
      return boxInFrustum(object.boundingBox, this.frustum);
    }

    // Fall back to sphere test
    return sphereInFrustum(object.bounds, this.frustum);
  }

  /**
   * Cull array of objects
   */
  cull(objects: CullableObject[]): CullingResult[] {
    return objects.map((obj) => ({
      id: obj.id,
      visible: this.isVisible(obj),
      reason: this.isVisible(obj) ? undefined : 'frustum',
    }));
  }

  /**
   * Get visible objects
   */
  getVisible(objects: CullableObject[]): CullableObject[] {
    return objects.filter((obj) => this.isVisible(obj));
  }
}

// ============================================================================
// Distance Culler
// ============================================================================

/**
 * Culls objects beyond a maximum distance
 */
export class DistanceCuller {
  private maxDistance: number;
  private cameraPosition: Vec3 = { x: 0, y: 0, z: 0 };

  constructor(maxDistance = 1000) {
    this.maxDistance = maxDistance;
  }

  /**
   * Update camera position
   */
  setCameraPosition(position: Vec3): void {
    this.cameraPosition = position;
  }

  /**
   * Set max render distance
   */
  setMaxDistance(distance: number): void {
    this.maxDistance = distance;
  }

  /**
   * Get distance to object
   */
  getDistance(object: CullableObject): number {
    return vec3Distance(this.cameraPosition, object.bounds.center);
  }

  /**
   * Test if object is visible
   */
  isVisible(object: CullableObject): boolean {
    const distance = this.getDistance(object);
    return distance - object.bounds.radius <= this.maxDistance;
  }

  /**
   * Cull array of objects
   */
  cull(objects: CullableObject[]): CullingResult[] {
    return objects.map((obj) => {
      const distance = this.getDistance(obj);
      const visible = distance - obj.bounds.radius <= this.maxDistance;
      return {
        id: obj.id,
        visible,
        reason: visible ? undefined : 'distance',
        distance,
      };
    });
  }

  /**
   * Get visible objects sorted by distance
   */
  getVisibleSorted(objects: CullableObject[]): CullableObject[] {
    return objects
      .filter((obj) => this.isVisible(obj))
      .sort((a, b) => this.getDistance(a) - this.getDistance(b));
  }
}

// ============================================================================
// Occlusion Culler
// ============================================================================

/**
 * Culls objects occluded by other geometry
 */
export class OcclusionCuller {
  private occluders: Map<string, Occluder> = new Map();
  private queries: Map<string, OcclusionQuery> = new Map();
  private enabled = false;

  constructor() {
    // Occlusion culling requires GPU support
    this.enabled = typeof WebGL2RenderingContext !== 'undefined';
  }

  /**
   * Check if occlusion culling is supported
   */
  isSupported(): boolean {
    return this.enabled;
  }

  /**
   * Enable/disable occlusion culling
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled && this.isSupported();
  }

  /**
   * Register an occluder
   */
  registerOccluder(occluder: Occluder): void {
    this.occluders.set(occluder.id, occluder);
  }

  /**
   * Unregister an occluder
   */
  unregisterOccluder(id: string): void {
    this.occluders.delete(id);
  }

  /**
   * Get active occluders
   */
  getOccluders(): Occluder[] {
    return Array.from(this.occluders.values())
      .filter((o) => o.active)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Create occlusion query
   */
  createQuery(objectId: string): OcclusionQuery {
    const query: OcclusionQuery = {
      id: objectId,
      pending: false,
      visible: true,
      samplesPassed: 0,
    };
    this.queries.set(objectId, query);
    return query;
  }

  /**
   * Get query result
   */
  getQueryResult(objectId: string): boolean {
    const query = this.queries.get(objectId);
    return query?.visible ?? true;
  }

  /**
   * Simple CPU-based occlusion test
   * Checks if object is behind any occluder from camera perspective
   */
  isOccluded(
    object: CullableObject,
    cameraPosition: Vec3
  ): boolean {
    if (!this.enabled) return false;

    const objectDistance = vec3Distance(cameraPosition, object.bounds.center);
    const objectDirection = {
      x: object.bounds.center.x - cameraPosition.x,
      y: object.bounds.center.y - cameraPosition.y,
      z: object.bounds.center.z - cameraPosition.z,
    };

    for (const occluder of this.occluders.values()) {
      if (!occluder.active) continue;

      // Simple box-sphere occlusion test
      const occluderCenter = {
        x: (occluder.bounds.min.x + occluder.bounds.max.x) / 2,
        y: (occluder.bounds.min.y + occluder.bounds.max.y) / 2,
        z: (occluder.bounds.min.z + occluder.bounds.max.z) / 2,
      };

      const occluderDistance = vec3Distance(cameraPosition, occluderCenter);

      // Occluder must be closer than object
      if (occluderDistance >= objectDistance) continue;

      // Check if occluder is roughly in the same direction
      const occluderDirection = {
        x: occluderCenter.x - cameraPosition.x,
        y: occluderCenter.y - cameraPosition.y,
        z: occluderCenter.z - cameraPosition.z,
      };

      // Dot product for direction similarity
      const dot =
        objectDirection.x * occluderDirection.x +
        objectDirection.y * occluderDirection.y +
        objectDirection.z * occluderDirection.z;

      // Simplified check - in a real implementation, use proper ray-box intersection
      if (dot > 0) {
        // Rough angular check
        const objLen = Math.sqrt(
          objectDirection.x ** 2 +
            objectDirection.y ** 2 +
            objectDirection.z ** 2
        );
        const occLen = Math.sqrt(
          occluderDirection.x ** 2 +
            occluderDirection.y ** 2 +
            occluderDirection.z ** 2
        );
        const cosAngle = dot / (objLen * occLen);

        if (cosAngle > 0.95) {
          // Within ~18 degrees
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Cull array of objects
   */
  cull(objects: CullableObject[], cameraPosition: Vec3): CullingResult[] {
    if (!this.enabled) {
      return objects.map((obj) => ({ id: obj.id, visible: true }));
    }

    return objects.map((obj) => {
      const occluded = this.isOccluded(obj, cameraPosition);
      return {
        id: obj.id,
        visible: !occluded,
        reason: occluded ? 'occlusion' : undefined,
      };
    });
  }
}

// ============================================================================
// Small Object Culler
// ============================================================================

/**
 * Culls objects too small to be visible on screen
 */
export class SmallObjectCuller {
  private minScreenSize: number;
  private camera: Camera | null = null;

  constructor(minScreenSize = 2) {
    this.minScreenSize = minScreenSize;
  }

  /**
   * Update camera
   */
  setCamera(camera: Camera): void {
    this.camera = camera;
  }

  /**
   * Set minimum screen size
   */
  setMinScreenSize(size: number): void {
    this.minScreenSize = size;
  }

  /**
   * Get screen size of object
   */
  getScreenSize(object: CullableObject): number {
    if (!this.camera) return Infinity;
    return calculateScreenSize(object.bounds, this.camera);
  }

  /**
   * Test if object is visible
   */
  isVisible(object: CullableObject): boolean {
    const screenSize = this.getScreenSize(object);
    return screenSize >= this.minScreenSize;
  }

  /**
   * Cull array of objects
   */
  cull(objects: CullableObject[]): CullingResult[] {
    return objects.map((obj) => {
      const screenSize = this.getScreenSize(obj);
      const visible = screenSize >= this.minScreenSize;
      return {
        id: obj.id,
        visible,
        reason: visible ? undefined : 'size',
        screenSize,
      };
    });
  }
}

// ============================================================================
// Visibility Query
// ============================================================================

/**
 * Tracks visibility state over time
 */
export class VisibilityQuery {
  private states: Map<string, VisibilityState> = new Map();
  private frameCount = 0;

  /**
   * Begin new frame
   */
  beginFrame(): void {
    this.frameCount++;
  }

  /**
   * Update visibility for an object
   */
  update(id: string, visible: boolean): VisibilityState {
    const existing = this.states.get(id);
    const now = Date.now();

    if (!existing) {
      const state: VisibilityState = {
        id,
        visibleThisFrame: visible,
        visibleLastFrame: false,
        framesSinceChange: 0,
        lastVisibleTime: visible ? now : 0,
      };
      this.states.set(id, state);
      return state;
    }

    // Update state
    existing.visibleLastFrame = existing.visibleThisFrame;
    existing.visibleThisFrame = visible;

    if (existing.visibleThisFrame !== existing.visibleLastFrame) {
      existing.framesSinceChange = 0;
    } else {
      existing.framesSinceChange++;
    }

    if (visible) {
      existing.lastVisibleTime = now;
    }

    return existing;
  }

  /**
   * Get visibility state
   */
  getState(id: string): VisibilityState | undefined {
    return this.states.get(id);
  }

  /**
   * Check if object just became visible
   */
  justBecameVisible(id: string): boolean {
    const state = this.states.get(id);
    return (
      !!state &&
      state.visibleThisFrame &&
      !state.visibleLastFrame
    );
  }

  /**
   * Check if object just became hidden
   */
  justBecameHidden(id: string): boolean {
    const state = this.states.get(id);
    return (
      !!state &&
      !state.visibleThisFrame &&
      state.visibleLastFrame
    );
  }

  /**
   * Get objects visible for at least N frames
   */
  getStablyVisible(minFrames: number): string[] {
    const result: string[] = [];
    for (const [id, state] of this.states) {
      if (state.visibleThisFrame && state.framesSinceChange >= minFrames) {
        result.push(id);
      }
    }
    return result;
  }

  /**
   * Clear state for object
   */
  clear(id: string): void {
    this.states.delete(id);
  }

  /**
   * Clear all states
   */
  clearAll(): void {
    this.states.clear();
  }
}

// ============================================================================
// Culling System
// ============================================================================

/**
 * Combined culling system using multiple cullers.
 *
 * When `useSIMDFrustumCuller` is true (default), the frustum culling stage
 * uses the high-performance SIMDFrustumCuller with octree spatial partitioning.
 * This provides massive speedups for large object counts (10,000+ objects in < 1ms).
 */
export class CullingSystem {
  private config: CullingConfig;
  private frustumCuller: FrustumCuller;
  private simdFrustumCuller: SIMDFrustumCuller | null;
  private distanceCuller: DistanceCuller;
  private occlusionCuller: OcclusionCuller;
  private smallObjectCuller: SmallObjectCuller;
  private visibilityQuery: VisibilityQuery;
  private stats: CullingStats;
  private useSIMD: boolean;

  constructor(config: Partial<CullingConfig> & { useSIMDFrustumCuller?: boolean } = {}) {
    this.config = { ...DEFAULT_CULLING_CONFIG, ...config };
    this.useSIMD = config.useSIMDFrustumCuller !== false; // Default: true
    this.frustumCuller = new FrustumCuller();
    this.simdFrustumCuller = this.useSIMD ? new SIMDFrustumCuller() : null;
    this.distanceCuller = new DistanceCuller(this.config.maxRenderDistance);
    this.occlusionCuller = new OcclusionCuller();
    this.smallObjectCuller = new SmallObjectCuller(this.config.minScreenSize);
    this.visibilityQuery = new VisibilityQuery();
    this.stats = this.createEmptyStats();
  }

  /**
   * Update with camera
   */
  setCamera(camera: Camera): void {
    this.frustumCuller.setFrustum(camera.frustum);
    if (this.simdFrustumCuller) {
      this.simdFrustumCuller.setFrustum(camera.frustum);
    }
    this.distanceCuller.setCameraPosition(camera.position);
    this.smallObjectCuller.setCamera(camera);
  }

  /**
   * Register an occluder
   */
  registerOccluder(occluder: Occluder): void {
    this.occlusionCuller.registerOccluder(occluder);
  }

  /**
   * Unregister an occluder
   */
  unregisterOccluder(id: string): void {
    this.occlusionCuller.unregisterOccluder(id);
  }

  /**
   * Perform culling on objects.
   *
   * When the SIMD frustum culler is enabled, the frustum culling stage uses
   * batched SoA AABB tests with octree spatial partitioning for maximum
   * throughput. Other culling stages (distance, size, occlusion) run on the
   * frustum-visible subset only, further reducing work.
   */
  cull(objects: CullableObject[], camera: Camera): CullingResult[] {
    const startTime = performance.now();
    this.setCamera(camera);
    this.visibilityQuery.beginFrame();

    this.stats = this.createEmptyStats();
    this.stats.totalObjects = objects.length;

    const results: CullingResult[] = [];

    // Pre-compute SIMD frustum visibility if enabled
    let simdVisibility: Uint8Array | null = null;
    if (this.config.frustumCulling && this.simdFrustumCuller) {
      this.simdFrustumCuller.markDirty();
      simdVisibility = this.simdFrustumCuller.cull(objects);
    }

    for (let idx = 0; idx < objects.length; idx++) {
      const obj = objects[idx];
      let visible = true;
      let reason: CullingResult['reason'];
      let distance: number | undefined;
      let screenSize: number | undefined;

      // Frustum culling
      if (this.config.frustumCulling && visible) {
        const frustumVisible = simdVisibility
          ? simdVisibility[idx] === 1
          : this.frustumCuller.isVisible(obj);

        if (!frustumVisible) {
          visible = false;
          reason = 'frustum';
          this.stats.frustumCulled++;
        }
      }

      // Distance culling
      if (this.config.distanceCulling && visible) {
        distance = this.distanceCuller.getDistance(obj);
        if (!this.distanceCuller.isVisible(obj)) {
          visible = false;
          reason = 'distance';
          this.stats.distanceCulled++;
        }
      }

      // Small object culling
      if (this.config.smallObjectCulling && visible) {
        screenSize = this.smallObjectCuller.getScreenSize(obj);
        if (!this.smallObjectCuller.isVisible(obj)) {
          visible = false;
          reason = 'size';
          this.stats.sizeCulled++;
        }
      }

      // Occlusion culling
      if (this.config.occlusionCulling && visible) {
        if (this.occlusionCuller.isOccluded(obj, camera.position)) {
          visible = false;
          reason = 'occlusion';
          this.stats.occlusionCulled++;
        }
      }

      // Update visibility tracking
      this.visibilityQuery.update(obj.id, visible);

      if (visible) {
        this.stats.visibleObjects++;
      }

      results.push({
        id: obj.id,
        visible,
        reason,
        distance,
        screenSize,
      });
    }

    this.stats.processingTime = performance.now() - startTime;
    return results;
  }

  /**
   * Get visible objects
   */
  getVisible(objects: CullableObject[], camera: Camera): CullableObject[] {
    const results = this.cull(objects, camera);
    const visibleIds = new Set(
      results.filter((r) => r.visible).map((r) => r.id)
    );
    return objects.filter((obj) => visibleIds.has(obj.id));
  }

  /**
   * Get culling stats
   */
  getStats(): CullingStats {
    return { ...this.stats };
  }

  /**
   * Get visibility query
   */
  getVisibilityQuery(): VisibilityQuery {
    return this.visibilityQuery;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CullingConfig>): void {
    this.config = { ...this.config, ...config };
    this.distanceCuller.setMaxDistance(this.config.maxRenderDistance);
    this.smallObjectCuller.setMinScreenSize(this.config.minScreenSize);
    this.occlusionCuller.setEnabled(this.config.occlusionCulling);
  }

  private createEmptyStats(): CullingStats {
    return {
      totalObjects: 0,
      visibleObjects: 0,
      frustumCulled: 0,
      distanceCulled: 0,
      occlusionCulled: 0,
      sizeCulled: 0,
      processingTime: 0,
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a culling system
 */
export function createCullingSystem(config?: Partial<CullingConfig>): CullingSystem {
  return new CullingSystem(config);
}

/**
 * Create a frustum culler
 */
export function createFrustumCuller(): FrustumCuller {
  return new FrustumCuller();
}

/**
 * Create a distance culler
 */
export function createDistanceCuller(maxDistance?: number): DistanceCuller {
  return new DistanceCuller(maxDistance);
}

/**
 * Create an occlusion culler
 */
export function createOcclusionCuller(): OcclusionCuller {
  return new OcclusionCuller();
}

/**
 * Create a small object culler
 */
export function createSmallObjectCuller(minScreenSize?: number): SmallObjectCuller {
  return new SmallObjectCuller(minScreenSize);
}

/**
 * Create a visibility query tracker
 */
export function createVisibilityQuery(): VisibilityQuery {
  return new VisibilityQuery();
}
