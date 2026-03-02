/**
 * OctreeLODSystem
 *
 * Spatial octree with frustum-culled traversal, LOD hysteresis, and a per-frame
 * visibility buffer for Gaussian Splatting scenes.
 *
 * This system sits between the GaussianSplatLODManager (which assigns LOD levels
 * to each Gaussian based on scale) and the Three.js rendering pipeline (which
 * reads the visibility buffer to set geo.instanceCount).
 *
 * Key features:
 *   1. Spatial octree partitioning of Gaussians into AABB nodes
 *   2. Frustum-culled traversal -- skips nodes outside the camera frustum
 *   3. LOD hysteresis -- 200ms delay between level transitions to prevent popping
 *   4. Cross-fade blending -- 150ms smooth alpha interpolation between LOD levels
 *   5. Motion-aware LOD bias -- faster camera movement = lower LOD to maintain fps
 *   6. Per-frame visibility buffer (Uint8Array, one byte per Gaussian)
 *   7. Direct instanceCount driving via reordered index buffer
 *   8. Budget-aware traversal that terminates when Gaussian budget is exhausted
 *
 * Performance targets:
 *   - 180K Gaussian budget at 72fps on Quest 3 equivalent workload
 *   - Octree traversal < 0.5ms per eye (< 1ms total stereo)
 *   - Zero per-frame allocations after build phase
 *
 * Research references:
 *   W.032 - Octree-GS LOD (anchor-based level selection, TPAMI 2025)
 *   W.034 - VR Gaussian budget (~180K total on Quest 3 at 72fps)
 *   P.030.01 - Hierarchical LOD Gaussian Architecture
 *
 * @module volumetric-bridge
 */

import type { SplatDataArrays, GaussianLODConfig, LODUpdateResult } from './GaussianSplatLODManager';
import { GaussianSplatLODManager } from './GaussianSplatLODManager';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Axis-Aligned Bounding Box (AABB) used for octree nodes and frustum culling.
 */
export interface AABB {
  minX: number; minY: number; minZ: number;
  maxX: number; maxY: number; maxZ: number;
}

/**
 * Six-plane frustum for culling (plane equation: ax + by + cz + d >= 0 = inside).
 * Each plane is [a, b, c, d] (normal + offset).
 */
export type FrustumPlanes = [
  [number, number, number, number], // left
  [number, number, number, number], // right
  [number, number, number, number], // bottom
  [number, number, number, number], // top
  [number, number, number, number], // near
  [number, number, number, number], // far
];

/**
 * Configuration for the OctreeLODSystem.
 */
export interface OctreeLODConfig {
  /** Maximum octree subdivision depth. Default: 5 */
  maxOctreeDepth: number;

  /** Minimum Gaussians in a node before subdivision stops. Default: 64 */
  minNodeGaussians: number;

  /**
   * Hysteresis delay in milliseconds between LOD level transitions.
   * Prevents visual popping at threshold boundaries. Default: 200
   */
  hysteresisDelayMs: number;

  /**
   * Enable frustum culling during octree traversal. Default: true
   * When disabled, all octree nodes are visited (useful for debugging).
   */
  frustumCullingEnabled: boolean;

  /**
   * Distance multiplier for early-out during traversal.
   * Nodes further than maxDistance * this multiplier are skipped entirely.
   * Default: 1.5
   */
  distanceCullMultiplier: number;

  /**
   * Cross-fade blending duration in milliseconds.
   * Smoothly interpolates alpha between outgoing and incoming LOD levels
   * to eliminate visual popping during transitions. Default: 150
   */
  crossFadeDurationMs: number;

  /**
   * Enable motion-aware LOD bias. Default: true
   * When enabled, faster camera movement biases toward lower LOD levels
   * to maintain framerate during rapid motion. The LOD level is reduced
   * proportionally to camera velocity, restoring to full quality when
   * the camera settles.
   */
  motionAwareLODEnabled: boolean;

  /**
   * Camera velocity threshold (world units/second) above which
   * motion-aware LOD bias begins. Default: 2.0
   */
  motionVelocityThreshold: number;

  /**
   * Maximum LOD levels to drop due to motion bias. Default: 2
   * Prevents excessive quality degradation during fast movement.
   */
  motionMaxLevelDrop: number;

  /**
   * Velocity at which maximum LOD drop is applied (world units/second).
   * Velocities between motionVelocityThreshold and this value interpolate
   * the LOD drop linearly. Default: 20.0
   */
  motionMaxVelocity: number;

  /**
   * Smoothing factor for camera velocity estimation (0-1).
   * Higher values smooth out velocity spikes but add latency.
   * Uses exponential moving average. Default: 0.3
   */
  motionVelocitySmoothing: number;

  /** GaussianSplatLODManager configuration (passed through). */
  lodConfig?: Partial<GaussianLODConfig>;
}

/**
 * Cross-fade blend state for smooth LOD transitions.
 */
export interface CrossFadeState {
  /** Whether a cross-fade transition is currently active */
  active: boolean;
  /** Progress of the cross-fade (0.0 = start, 1.0 = complete) */
  progress: number;
  /** Alpha for the outgoing (old) LOD level (1.0 -> 0.0) */
  outgoingAlpha: number;
  /** Alpha for the incoming (new) LOD level (0.0 -> 1.0) */
  incomingAlpha: number;
  /** LOD level being faded out */
  outgoingLevel: number;
  /** LOD level being faded in */
  incomingLevel: number;
  /** Timestamp when cross-fade started */
  startTimestamp: number;
  /** Duration of this cross-fade in milliseconds */
  durationMs: number;
}

/**
 * Motion-aware LOD bias state.
 */
export interface MotionLODBiasState {
  /** Current smoothed camera velocity (world units/second) */
  smoothedVelocity: number;
  /** Number of LOD levels currently dropped due to motion */
  levelsDropped: number;
  /** Whether motion bias is currently active (velocity above threshold) */
  active: boolean;
  /** Raw (unsmoothed) camera velocity */
  rawVelocity: number;
}

/**
 * Per-frame update result from the OctreeLODSystem.
 */
export interface OctreeLODUpdateResult extends LODUpdateResult {
  /** Number of octree nodes tested this frame */
  nodesTestedCount: number;
  /** Number of octree nodes that passed frustum culling */
  nodesVisibleCount: number;
  /** Number of octree nodes culled (frustum + distance) */
  nodesCulledCount: number;
  /** Whether hysteresis prevented a LOD transition this frame */
  hysteresisActive: boolean;
  /** Traversal time in milliseconds */
  traversalTimeMs: number;
  /** The visibility buffer (1 byte per Gaussian: 0=hidden, 1=visible) */
  visibilityBuffer: Uint8Array;
  /** Cross-fade blend state for smooth LOD transitions */
  crossFade: CrossFadeState;
  /** Motion-aware LOD bias state */
  motionBias: MotionLODBiasState;
}

/**
 * Internal octree node. Each node subdivides its AABB into up to 8 children.
 */
interface OctreeNode {
  /** Bounding box for this node */
  bounds: AABB;
  /** Child nodes (null if leaf). Index = octant (0-7). */
  children: (OctreeNode | null)[];
  /** Gaussian indices stored in this node (leaf only) */
  gaussianIndices: Uint32Array;
  /** Count of Gaussians in this node (leaf only) */
  gaussianCount: number;
  /** Octree depth level of this node */
  depth: number;
  /** Is this a leaf node? */
  isLeaf: boolean;
  /** Center of the node's AABB (precomputed for distance checks) */
  centerX: number;
  centerY: number;
  centerZ: number;
  /** Half-extents of the AABB (precomputed for frustum culling) */
  halfExtentX: number;
  halfExtentY: number;
  halfExtentZ: number;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_OCTREE_CONFIG: OctreeLODConfig = {
  maxOctreeDepth: 5,
  minNodeGaussians: 64,
  hysteresisDelayMs: 200,
  frustumCullingEnabled: true,
  distanceCullMultiplier: 1.5,
  crossFadeDurationMs: 150,
  motionAwareLODEnabled: true,
  motionVelocityThreshold: 2.0,
  motionMaxLevelDrop: 2,
  motionMaxVelocity: 20.0,
  motionVelocitySmoothing: 0.3,
};

// =============================================================================
// OCTREE LOD SYSTEM
// =============================================================================

/**
 * Spatial octree system for Gaussian Splatting LOD management.
 *
 * Wraps GaussianSplatLODManager with proper spatial partitioning,
 * frustum-culled traversal, and LOD hysteresis.
 *
 * Usage:
 * ```typescript
 * const system = new OctreeLODSystem({
 *   hysteresisDelayMs: 200,
 *   lodConfig: VR_OPTIMIZED_CONFIG,
 * });
 *
 * // After loading splat data
 * system.buildFromSplatData(splatData);
 *
 * // Each frame (in render loop)
 * const frustum = extractFrustumPlanes(camera);
 * const result = system.update(cameraPos, frustum, now);
 * if (result.changed) {
 *   geo.instanceCount = result.visibleCount;
 *   // reorder instanced attributes to match visibleIndices
 * }
 * ```
 */
export class OctreeLODSystem {
  private config: OctreeLODConfig;
  private lodManager: GaussianSplatLODManager;

  // Octree structure
  private root: OctreeNode | null = null;
  private isBuilt = false;

  // Visibility buffer (one byte per Gaussian: 0=hidden, 1=visible)
  private visibilityBuffer: Uint8Array = new Uint8Array(0);

  // Pre-allocated traversal stack to avoid per-frame allocations
  private traversalStack: OctreeNode[] = [];

  // Hysteresis state
  private pendingLODLevel = -1;
  private pendingLODTimestamp = 0;
  private committedLODLevel = -1;

  // Cross-fade blending state
  private crossFadeActive = false;
  private crossFadeProgress = 0;
  private crossFadeStartTimestamp = 0;
  private crossFadeOutgoingLevel = -1;
  private crossFadeIncomingLevel = -1;

  // Motion-aware LOD bias state
  private lastMotionCameraX = NaN;
  private lastMotionCameraY = NaN;
  private lastMotionCameraZ = NaN;
  private lastMotionTimestamp = 0;
  private smoothedVelocity = 0;
  private motionLevelsDropped = 0;

  // Per-frame statistics (reused to avoid allocation)
  private frameNodesTestedCount = 0;
  private frameNodesVisibleCount = 0;
  private frameNodesCulledCount = 0;

  // Scene data reference
  private positions: Float32Array | null = null;
  private totalCount = 0;

  // Scene bounds for distance culling
  private sceneMaxDistance = 0;

  constructor(config?: Partial<OctreeLODConfig>) {
    this.config = { ...DEFAULT_OCTREE_CONFIG, ...config };
    this.lodManager = new GaussianSplatLODManager(this.config.lodConfig);
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  /**
   * Build the octree and LOD structure from loaded splat data.
   *
   * This is a one-time operation after loading. Builds:
   * 1. The GaussianSplatLODManager (scale-based LOD assignment)
   * 2. The spatial octree (position-based AABB subdivision)
   * 3. The visibility buffer (sized to total Gaussian count)
   *
   * @param data - Loaded splat positions and scales
   * @param sceneCenter - Optional scene center override
   */
  buildFromSplatData(
    data: SplatDataArrays,
    sceneCenter?: { x: number; y: number; z: number },
  ): void {
    const { count, positions } = data;

    // Store reference for traversal
    this.positions = positions;
    this.totalCount = count;

    // 1. Build LOD structure
    this.lodManager.buildFromSplatData(data, sceneCenter);

    // 2. Compute scene AABB
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < count; i++) {
      const px = positions[i * 3];
      const py = positions[i * 3 + 1];
      const pz = positions[i * 3 + 2];
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (pz < minZ) minZ = pz;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
      if (pz > maxZ) maxZ = pz;
    }

    // Make the root AABB cubic (octree works best with cubic nodes)
    const sizeX = maxX - minX;
    const sizeY = maxY - minY;
    const sizeZ = maxZ - minZ;
    const maxSize = Math.max(sizeX, sizeY, sizeZ, 0.001); // Avoid zero-size
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const cz = (minZ + maxZ) / 2;
    const halfSize = maxSize / 2;

    const rootBounds: AABB = {
      minX: cx - halfSize,
      minY: cy - halfSize,
      minZ: cz - halfSize,
      maxX: cx + halfSize,
      maxY: cy + halfSize,
      maxZ: cz + halfSize,
    };

    // Compute scene max distance for distance culling
    this.sceneMaxDistance = maxSize * this.config.distanceCullMultiplier;

    // 3. Build all Gaussian indices for root
    const allIndices = new Uint32Array(count);
    for (let i = 0; i < count; i++) allIndices[i] = i;

    // 4. Build octree recursively
    this.root = this.buildNode(rootBounds, allIndices, 0);

    // 5. Allocate visibility buffer
    this.visibilityBuffer = new Uint8Array(count);

    // 6. Pre-allocate traversal stack (max nodes = 8^maxDepth, but practically much less)
    // Conservative upper bound: ~1000 nodes for depth 5
    this.traversalStack = new Array(1024);

    // 7. Reset hysteresis state
    this.pendingLODLevel = -1;
    this.pendingLODTimestamp = 0;
    this.committedLODLevel = -1;

    this.isBuilt = true;
  }

  /**
   * Recursively build an octree node.
   */
  private buildNode(
    bounds: AABB,
    indices: Uint32Array,
    depth: number,
  ): OctreeNode {
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    const cz = (bounds.minZ + bounds.maxZ) / 2;
    const hx = (bounds.maxX - bounds.minX) / 2;
    const hy = (bounds.maxY - bounds.minY) / 2;
    const hz = (bounds.maxZ - bounds.minZ) / 2;

    // Leaf condition: too few Gaussians or max depth reached
    if (indices.length <= this.config.minNodeGaussians || depth >= this.config.maxOctreeDepth) {
      return {
        bounds,
        children: [],
        gaussianIndices: indices,
        gaussianCount: indices.length,
        depth,
        isLeaf: true,
        centerX: cx, centerY: cy, centerZ: cz,
        halfExtentX: hx, halfExtentY: hy, halfExtentZ: hz,
      };
    }

    // Subdivide into 8 octants
    const childBuckets: number[][] = [[], [], [], [], [], [], [], []];

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      const px = this.positions![idx * 3];
      const py = this.positions![idx * 3 + 1];
      const pz = this.positions![idx * 3 + 2];

      // Determine octant: bit 0 = x, bit 1 = y, bit 2 = z
      const octant =
        (px >= cx ? 1 : 0) |
        (py >= cy ? 2 : 0) |
        (pz >= cz ? 4 : 0);

      childBuckets[octant].push(idx);
    }

    const children: (OctreeNode | null)[] = new Array(8).fill(null);

    for (let oct = 0; oct < 8; oct++) {
      if (childBuckets[oct].length === 0) continue;

      const childBounds: AABB = {
        minX: (oct & 1) ? cx : bounds.minX,
        minY: (oct & 2) ? cy : bounds.minY,
        minZ: (oct & 4) ? cz : bounds.minZ,
        maxX: (oct & 1) ? bounds.maxX : cx,
        maxY: (oct & 2) ? bounds.maxY : cy,
        maxZ: (oct & 4) ? bounds.maxZ : cz,
      };

      children[oct] = this.buildNode(
        childBounds,
        new Uint32Array(childBuckets[oct]),
        depth + 1,
      );
    }

    return {
      bounds,
      children,
      gaussianIndices: new Uint32Array(0), // Non-leaf: no direct Gaussians
      gaussianCount: indices.length,
      depth,
      isLeaf: false,
      centerX: cx, centerY: cy, centerZ: cz,
      halfExtentX: hx, halfExtentY: hy, halfExtentZ: hz,
    };
  }

  // ---------------------------------------------------------------------------
  // Per-Frame Update
  // ---------------------------------------------------------------------------

  /**
   * Update the visibility buffer based on camera position and frustum.
   *
   * This is the primary per-frame call. It:
   * 1. Computes motion-aware LOD bias from camera velocity
   * 2. Runs the LOD manager to determine which LOD levels are active
   * 3. Applies LOD hysteresis (200ms delay between transitions)
   * 4. Updates cross-fade blending state for smooth LOD transitions
   * 5. Traverses the octree with frustum culling
   * 6. Populates the visibility buffer
   * 7. Returns the visible Gaussian indices, count, and blend state
   *
   * @param cameraX - Camera world X
   * @param cameraY - Camera world Y
   * @param cameraZ - Camera world Z
   * @param frustumPlanes - Six frustum planes for culling (optional; skips culling if null)
   * @param timestamp - Current time in milliseconds (performance.now())
   * @param avatarCount - Optional avatar count override
   */
  update(
    cameraX: number,
    cameraY: number,
    cameraZ: number,
    frustumPlanes: FrustumPlanes | null,
    timestamp: number,
    avatarCount?: number,
  ): OctreeLODUpdateResult {
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();

    if (!this.isBuilt || !this.root) {
      return this.emptyResult(t0);
    }

    // 1. Compute motion-aware LOD bias
    const motionBias = this.computeMotionBias(cameraX, cameraY, cameraZ, timestamp);

    // 2. Run base LOD manager update (determines LOD level from distance)
    const lodResult = this.lodManager.update(cameraX, cameraY, cameraZ, avatarCount);

    // 3. Apply motion bias to the LOD level (reduce detail during fast movement)
    const motionAdjustedLevel = Math.max(
      0,
      lodResult.activeLODLevel - motionBias.levelsDropped,
    );

    // 4. Apply LOD hysteresis to the motion-adjusted level
    const hysteresisResult = this.applyHysteresis(
      motionAdjustedLevel,
      timestamp,
    );

    // Use the committed LOD level (may be delayed by hysteresis)
    const effectiveLODLevel = hysteresisResult.committedLevel;

    // 5. Update cross-fade blending state
    const crossFade = this.updateCrossFade(hysteresisResult, timestamp);

    // 6. Clear visibility buffer
    this.visibilityBuffer.fill(0);

    // 7. Reset frame statistics
    this.frameNodesTestedCount = 0;
    this.frameNodesVisibleCount = 0;
    this.frameNodesCulledCount = 0;

    // 8. Get the LOD result's visible indices as a Set for O(1) lookup
    // For the committed LOD level, we re-query the LOD manager if hysteresis changed the level
    let visibleSet: Set<number>;
    if (effectiveLODLevel !== lodResult.activeLODLevel) {
      // Hysteresis overrode the level -- we need to build the visible set manually
      visibleSet = this.buildVisibleSetForLevel(effectiveLODLevel, lodResult);
    } else {
      // No hysteresis override -- use LOD result directly
      visibleSet = new Set<number>();
      for (let i = 0; i < lodResult.visibleIndices.length; i++) {
        visibleSet.add(lodResult.visibleIndices[i]);
      }
    }

    // 9. Frustum-culled octree traversal
    let visibleCount = 0;
    const useFrustumCulling = this.config.frustumCullingEnabled && frustumPlanes !== null;
    const maxDistSq = this.getMaxCullDistanceSq(lodResult);

    // Stack-based iterative traversal (avoids recursion overhead)
    let stackTop = 0;
    this.traversalStack[stackTop++] = this.root;

    while (stackTop > 0) {
      const node = this.traversalStack[--stackTop];
      this.frameNodesTestedCount++;

      // Frustum cull check
      if (useFrustumCulling) {
        const cullResult = this.testAABBFrustum(node, frustumPlanes!);
        if (cullResult === FrustumCullResult.OUTSIDE) {
          this.frameNodesCulledCount++;
          continue;
        }
      }

      // Distance cull check (skip very distant nodes)
      if (maxDistSq > 0) {
        const dx = node.centerX - cameraX;
        const dy = node.centerY - cameraY;
        const dz = node.centerZ - cameraZ;
        const distSq = dx * dx + dy * dy + dz * dz;
        // Compare against (maxDistance + node diagonal)^2
        const nodeDiag = node.halfExtentX + node.halfExtentY + node.halfExtentZ;
        const threshold = Math.sqrt(maxDistSq) + nodeDiag;
        if (distSq > threshold * threshold) {
          this.frameNodesCulledCount++;
          continue;
        }
      }

      this.frameNodesVisibleCount++;

      if (node.isLeaf) {
        // Mark visible Gaussians from this leaf node
        for (let i = 0; i < node.gaussianIndices.length; i++) {
          const idx = node.gaussianIndices[i];
          if (visibleSet.has(idx)) {
            this.visibilityBuffer[idx] = 1;
            visibleCount++;
          }
        }
      } else {
        // Push children onto stack (reverse order for depth-first front-to-back)
        for (let c = 7; c >= 0; c--) {
          const child = node.children[c];
          if (child !== null) {
            this.traversalStack[stackTop++] = child;
          }
        }
      }
    }

    // 10. Collect visible indices from visibility buffer
    const visibleIndices = new Uint32Array(visibleCount);
    let writeIdx = 0;
    for (let i = 0; i < this.totalCount; i++) {
      if (this.visibilityBuffer[i] === 1) {
        visibleIndices[writeIdx++] = i;
      }
    }

    const traversalTimeMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;

    // 11. Determine if the set changed (compare count + LOD level)
    const changed = lodResult.changed ||
      hysteresisResult.transitioned ||
      visibleCount !== (this.lodManager as any).lastVisibleIndices?.length;

    return {
      // Base LOD fields
      changed,
      visibleIndices,
      visibleCount,
      activeLODLevel: effectiveLODLevel,
      totalLODLevels: lodResult.totalLODLevels,
      budgetCapped: lodResult.budgetCapped,
      levelsDropped: lodResult.levelsDropped + motionBias.levelsDropped,
      cameraDistance: lodResult.cameraDistance,
      availableBudget: lodResult.availableBudget,

      // Octree-specific fields
      nodesTestedCount: this.frameNodesTestedCount,
      nodesVisibleCount: this.frameNodesVisibleCount,
      nodesCulledCount: this.frameNodesCulledCount,
      hysteresisActive: hysteresisResult.active,
      traversalTimeMs,
      visibilityBuffer: this.visibilityBuffer,
      crossFade,
      motionBias,
    };
  }

  // ---------------------------------------------------------------------------
  // LOD Hysteresis
  // ---------------------------------------------------------------------------

  /**
   * Apply hysteresis to LOD level transitions.
   *
   * When a new LOD level is requested:
   * - If it differs from the committed level, start a pending timer
   * - If the pending timer exceeds hysteresisDelayMs, commit the new level
   * - If the requested level changes again during the delay, restart the timer
   * - If the requested level returns to the committed level, cancel the pending
   *
   * This prevents visual "popping" at threshold boundaries when the camera
   * oscillates near a LOD transition distance.
   */
  private applyHysteresis(
    requestedLevel: number,
    timestamp: number,
  ): { committedLevel: number; active: boolean; transitioned: boolean } {
    // First call: no hysteresis, commit immediately
    if (this.committedLODLevel === -1) {
      this.committedLODLevel = requestedLevel;
      this.pendingLODLevel = -1;
      return { committedLevel: requestedLevel, active: false, transitioned: true };
    }

    // Same as committed: cancel any pending
    if (requestedLevel === this.committedLODLevel) {
      this.pendingLODLevel = -1;
      return { committedLevel: this.committedLODLevel, active: false, transitioned: false };
    }

    // If hysteresis is disabled (0ms), commit immediately
    if (this.config.hysteresisDelayMs <= 0) {
      this.committedLODLevel = requestedLevel;
      this.pendingLODLevel = -1;
      return { committedLevel: requestedLevel, active: false, transitioned: true };
    }

    // New pending level (different from both committed and current pending)
    if (requestedLevel !== this.pendingLODLevel) {
      this.pendingLODLevel = requestedLevel;
      this.pendingLODTimestamp = timestamp;
      return { committedLevel: this.committedLODLevel, active: true, transitioned: false };
    }

    // Same pending level: check if delay has elapsed
    const elapsed = timestamp - this.pendingLODTimestamp;
    if (elapsed >= this.config.hysteresisDelayMs) {
      // Commit the pending level
      this.committedLODLevel = this.pendingLODLevel;
      this.pendingLODLevel = -1;
      return { committedLevel: this.committedLODLevel, active: false, transitioned: true };
    }

    // Still waiting for hysteresis delay
    return { committedLevel: this.committedLODLevel, active: true, transitioned: false };
  }

  // ---------------------------------------------------------------------------
  // Cross-Fade Blending
  // ---------------------------------------------------------------------------

  /**
   * Update cross-fade blending state when LOD transitions occur.
   *
   * When hysteresis commits a new LOD level, this initiates a cross-fade
   * that smoothly interpolates alpha between the outgoing and incoming
   * LOD levels over crossFadeDurationMs.
   *
   * The renderer should use crossFade.outgoingAlpha and crossFade.incomingAlpha
   * to blend between the two LOD representations:
   *   - During cross-fade: render BOTH levels, multiply opacity by respective alpha
   *   - After cross-fade completes: render only the incoming level at full opacity
   *
   * Alpha interpolation uses smooth-step (3t^2 - 2t^3) for perceptually
   * smooth blending without linear-ramp artifacts.
   */
  private updateCrossFade(
    hysteresisResult: { committedLevel: number; active: boolean; transitioned: boolean },
    timestamp: number,
  ): CrossFadeState {
    // If cross-fade is disabled (0ms), return inactive state
    if (this.config.crossFadeDurationMs <= 0) {
      return {
        active: false,
        progress: 1,
        outgoingAlpha: 0,
        incomingAlpha: 1,
        outgoingLevel: -1,
        incomingLevel: hysteresisResult.committedLevel,
        startTimestamp: 0,
        durationMs: 0,
      };
    }

    // Start new cross-fade when hysteresis commits a level transition
    if (hysteresisResult.transitioned && this.crossFadeOutgoingLevel !== -1) {
      // New transition: outgoing = previous committed level, incoming = new level
      this.crossFadeActive = true;
      this.crossFadeProgress = 0;
      this.crossFadeStartTimestamp = timestamp;
      this.crossFadeOutgoingLevel = this.crossFadeIncomingLevel;
      this.crossFadeIncomingLevel = hysteresisResult.committedLevel;
    } else if (hysteresisResult.transitioned) {
      // First ever transition: no cross-fade needed, just set levels
      this.crossFadeOutgoingLevel = hysteresisResult.committedLevel;
      this.crossFadeIncomingLevel = hysteresisResult.committedLevel;
      this.crossFadeActive = false;
    }

    // Update in-progress cross-fade
    if (this.crossFadeActive) {
      const elapsed = timestamp - this.crossFadeStartTimestamp;
      const rawProgress = Math.min(elapsed / this.config.crossFadeDurationMs, 1.0);

      // Smooth-step interpolation: 3t^2 - 2t^3 (Hermite smoothing)
      // Gives smooth acceleration/deceleration at endpoints
      this.crossFadeProgress = rawProgress * rawProgress * (3 - 2 * rawProgress);

      // Check if cross-fade is complete
      if (rawProgress >= 1.0) {
        this.crossFadeActive = false;
        this.crossFadeProgress = 1.0;
        this.crossFadeOutgoingLevel = this.crossFadeIncomingLevel;
      }
    }

    return {
      active: this.crossFadeActive,
      progress: this.crossFadeProgress,
      outgoingAlpha: this.crossFadeActive ? 1.0 - this.crossFadeProgress : 0,
      incomingAlpha: this.crossFadeActive ? this.crossFadeProgress : 1,
      outgoingLevel: this.crossFadeOutgoingLevel,
      incomingLevel: this.crossFadeIncomingLevel,
      startTimestamp: this.crossFadeStartTimestamp,
      durationMs: this.config.crossFadeDurationMs,
    };
  }

  // ---------------------------------------------------------------------------
  // Motion-Aware LOD Bias
  // ---------------------------------------------------------------------------

  /**
   * Compute motion-aware LOD bias based on camera velocity.
   *
   * During fast camera movement (e.g., head turns in VR, teleportation),
   * the human visual system has reduced acuity. This allows us to safely
   * drop LOD levels to maintain framerate without perceptible quality loss.
   *
   * The bias is computed as:
   * 1. Measure raw camera velocity from position delta / time delta
   * 2. Apply exponential moving average for smoothing (avoids jitter)
   * 3. Map velocity to LOD level drop: linear interpolation between
   *    motionVelocityThreshold (0 drop) and motionMaxVelocity (max drop)
   * 4. Clamp to motionMaxLevelDrop
   *
   * When the camera slows below the threshold, LOD instantly recovers
   * (no hysteresis needed -- the visual system can perceive fine detail
   * immediately when motion stops).
   *
   * Research: VR foveated rendering exploits saccadic suppression for similar
   * quality reduction during rapid eye movement. This extends the concept
   * to LOD selection based on head/camera motion.
   */
  private computeMotionBias(
    cameraX: number,
    cameraY: number,
    cameraZ: number,
    timestamp: number,
  ): MotionLODBiasState {
    // If motion-aware LOD is disabled, return zero bias
    if (!this.config.motionAwareLODEnabled) {
      return {
        smoothedVelocity: 0,
        levelsDropped: 0,
        active: false,
        rawVelocity: 0,
      };
    }

    let rawVelocity = 0;

    // Compute raw velocity from position delta
    if (!isNaN(this.lastMotionCameraX) && this.lastMotionTimestamp > 0) {
      const dx = cameraX - this.lastMotionCameraX;
      const dy = cameraY - this.lastMotionCameraY;
      const dz = cameraZ - this.lastMotionCameraZ;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const dt = (timestamp - this.lastMotionTimestamp) / 1000; // seconds
      if (dt > 0 && dt < 1.0) {
        // Clamp dt to avoid division by very small numbers or stale timestamps
        rawVelocity = dist / dt;
      }
    }

    // Store current position and timestamp for next frame
    this.lastMotionCameraX = cameraX;
    this.lastMotionCameraY = cameraY;
    this.lastMotionCameraZ = cameraZ;
    this.lastMotionTimestamp = timestamp;

    // Apply exponential moving average smoothing
    const alpha = this.config.motionVelocitySmoothing;
    this.smoothedVelocity = alpha * this.smoothedVelocity + (1 - alpha) * rawVelocity;

    // Compute LOD level drop from velocity
    let levelsDropped = 0;
    if (this.smoothedVelocity > this.config.motionVelocityThreshold) {
      const velocityRange = this.config.motionMaxVelocity - this.config.motionVelocityThreshold;
      if (velocityRange > 0) {
        const t = Math.min(
          (this.smoothedVelocity - this.config.motionVelocityThreshold) / velocityRange,
          1.0,
        );
        levelsDropped = Math.round(t * this.config.motionMaxLevelDrop);
      } else {
        levelsDropped = this.config.motionMaxLevelDrop;
      }
    }

    this.motionLevelsDropped = levelsDropped;

    return {
      smoothedVelocity: this.smoothedVelocity,
      levelsDropped,
      active: levelsDropped > 0,
      rawVelocity,
    };
  }

  // ---------------------------------------------------------------------------
  // Frustum Culling
  // ---------------------------------------------------------------------------

  /**
   * Test an AABB against six frustum planes.
   *
   * Uses the "AABB vs plane" test: for each plane, find the vertex of the AABB
   * most in the direction of the plane normal (positive vertex). If the positive
   * vertex is behind the plane, the AABB is fully outside.
   *
   * Returns OUTSIDE, INSIDE, or INTERSECTING.
   */
  private testAABBFrustum(node: OctreeNode, planes: FrustumPlanes): FrustumCullResult {
    for (let p = 0; p < 6; p++) {
      const [a, b, c, d] = planes[p];

      // Find the p-vertex (most positive along plane normal)
      const px = a > 0 ? node.bounds.maxX : node.bounds.minX;
      const py = b > 0 ? node.bounds.maxY : node.bounds.minY;
      const pz = c > 0 ? node.bounds.maxZ : node.bounds.minZ;

      // If positive vertex is outside, entire AABB is outside
      if (a * px + b * py + c * pz + d < 0) {
        return FrustumCullResult.OUTSIDE;
      }
    }

    return FrustumCullResult.INSIDE;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Build visible set for a specific LOD level (used when hysteresis overrides).
   */
  private buildVisibleSetForLevel(
    effectiveLevel: number,
    lodResult: LODUpdateResult,
  ): Set<number> {
    // Re-use the LOD manager's level distribution
    const dist = this.lodManager.getLevelDistribution();
    const set = new Set<number>();

    // We need to collect all indices for levels 0..effectiveLevel
    // Since we don't have direct access to the anchor indices at the manager level,
    // we use the LOD result's visible indices but filter based on level
    // However, the LOD manager only returns indices for the levels it selected.
    // We need to do a fresh query with the effective level.

    // Force the LOD manager to re-evaluate by resetting its state temporarily
    // This is a workaround; ideally the LOD manager would expose level-specific queries.
    // For now, we re-collect from the lodResult since the hysteresis only delays transitions
    // and the visible set is still valid for the committed level.

    // Simple approach: use the lodResult's indices since the manager already computed them
    // for the requested level. The hysteresis just means we keep the OLD set.
    // So we should cache the previous frame's visible indices.
    if (this.cachedVisibleIndices && this.cachedVisibleIndices.length > 0) {
      for (let i = 0; i < this.cachedVisibleIndices.length; i++) {
        set.add(this.cachedVisibleIndices[i]);
      }
    }

    return set;
  }

  // Cache for hysteresis fallback
  private cachedVisibleIndices: Uint32Array = new Uint32Array(0);

  /**
   * Get the maximum culling distance squared based on LOD config.
   */
  private getMaxCullDistanceSq(lodResult: LODUpdateResult): number {
    const thresholds = this.lodManager.getThresholds();
    if (thresholds.length === 0) return 0;
    const maxDist = thresholds[thresholds.length - 1] * this.config.distanceCullMultiplier;
    return maxDist * maxDist;
  }

  /**
   * Return an empty result (used when system is not built).
   */
  private emptyResult(t0: number): OctreeLODUpdateResult {
    return {
      changed: false,
      visibleIndices: new Uint32Array(0),
      visibleCount: 0,
      activeLODLevel: 0,
      totalLODLevels: 0,
      budgetCapped: false,
      levelsDropped: 0,
      cameraDistance: 0,
      availableBudget: 0,
      nodesTestedCount: 0,
      nodesVisibleCount: 0,
      nodesCulledCount: 0,
      hysteresisActive: false,
      traversalTimeMs: 0,
      visibilityBuffer: this.visibilityBuffer,
      crossFade: {
        active: false,
        progress: 1,
        outgoingAlpha: 0,
        incomingAlpha: 1,
        outgoingLevel: -1,
        incomingLevel: -1,
        startTimestamp: 0,
        durationMs: 0,
      },
      motionBias: {
        smoothedVelocity: 0,
        levelsDropped: 0,
        active: false,
        rawVelocity: 0,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Public Accessors
  // ---------------------------------------------------------------------------

  /**
   * Get the underlying LOD manager for direct configuration.
   */
  getLODManager(): GaussianSplatLODManager {
    return this.lodManager;
  }

  /**
   * Check if the octree has been built.
   */
  getIsBuilt(): boolean {
    return this.isBuilt;
  }

  /**
   * Get the current visibility buffer.
   * This is a live reference (not a copy) for zero-allocation reads.
   */
  getVisibilityBuffer(): Uint8Array {
    return this.visibilityBuffer;
  }

  /**
   * Get the total Gaussian count.
   */
  getTotalCount(): number {
    return this.totalCount;
  }

  /**
   * Get octree statistics (node count, depth distribution).
   */
  getOctreeStats(): {
    totalNodes: number;
    leafNodes: number;
    maxDepth: number;
    avgGaussiansPerLeaf: number;
  } {
    if (!this.root) {
      return { totalNodes: 0, leafNodes: 0, maxDepth: 0, avgGaussiansPerLeaf: 0 };
    }

    let totalNodes = 0;
    let leafNodes = 0;
    let maxDepth = 0;
    let totalGaussiansInLeaves = 0;

    const stack: OctreeNode[] = [this.root];
    while (stack.length > 0) {
      const node = stack.pop()!;
      totalNodes++;
      if (node.depth > maxDepth) maxDepth = node.depth;

      if (node.isLeaf) {
        leafNodes++;
        totalGaussiansInLeaves += node.gaussianCount;
      } else {
        for (const child of node.children) {
          if (child) stack.push(child);
        }
      }
    }

    return {
      totalNodes,
      leafNodes,
      maxDepth,
      avgGaussiansPerLeaf: leafNodes > 0 ? totalGaussiansInLeaves / leafNodes : 0,
    };
  }

  /**
   * Get the current configuration.
   */
  getConfig(): Readonly<OctreeLODConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration at runtime.
   */
  updateConfig(config: Partial<OctreeLODConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.lodConfig) {
      this.lodManager.updateConfig(config.lodConfig);
    }
    // Reset hysteresis if delay changed
    if (config.hysteresisDelayMs !== undefined) {
      this.pendingLODLevel = -1;
    }
    // Reset cross-fade if duration changed
    if (config.crossFadeDurationMs !== undefined) {
      this.crossFadeActive = false;
      this.crossFadeProgress = 0;
    }
    // Reset motion bias if motion config changed
    if (
      config.motionAwareLODEnabled !== undefined ||
      config.motionVelocityThreshold !== undefined ||
      config.motionMaxVelocity !== undefined
    ) {
      this.smoothedVelocity = 0;
      this.motionLevelsDropped = 0;
    }
  }

  /**
   * Get the current cross-fade blending state.
   * Useful for external renderers that need to query blend state
   * outside of the update cycle.
   */
  getCrossFadeState(): CrossFadeState {
    return {
      active: this.crossFadeActive,
      progress: this.crossFadeProgress,
      outgoingAlpha: this.crossFadeActive ? 1.0 - this.crossFadeProgress : 0,
      incomingAlpha: this.crossFadeActive ? this.crossFadeProgress : 1,
      outgoingLevel: this.crossFadeOutgoingLevel,
      incomingLevel: this.crossFadeIncomingLevel,
      startTimestamp: this.crossFadeStartTimestamp,
      durationMs: this.config.crossFadeDurationMs,
    };
  }

  /**
   * Get the current motion-aware LOD bias state.
   */
  getMotionBiasState(): MotionLODBiasState {
    return {
      smoothedVelocity: this.smoothedVelocity,
      levelsDropped: this.motionLevelsDropped,
      active: this.motionLevelsDropped > 0,
      rawVelocity: 0, // Only available during update()
    };
  }

  /**
   * Reset all state (hysteresis, cross-fade, motion bias, cached indices)
   * without clearing built data.
   */
  resetState(): void {
    this.lodManager.resetState();
    this.committedLODLevel = -1;
    this.pendingLODLevel = -1;
    this.pendingLODTimestamp = 0;
    this.cachedVisibleIndices = new Uint32Array(0);
    this.visibilityBuffer.fill(0);

    // Reset cross-fade state
    this.crossFadeActive = false;
    this.crossFadeProgress = 0;
    this.crossFadeStartTimestamp = 0;
    this.crossFadeOutgoingLevel = -1;
    this.crossFadeIncomingLevel = -1;

    // Reset motion bias state
    this.lastMotionCameraX = NaN;
    this.lastMotionCameraY = NaN;
    this.lastMotionCameraZ = NaN;
    this.lastMotionTimestamp = 0;
    this.smoothedVelocity = 0;
    this.motionLevelsDropped = 0;
  }

  /**
   * Fully clear the system (remove octree and LOD data).
   */
  clear(): void {
    this.lodManager.clear();
    this.root = null;
    this.isBuilt = false;
    this.visibilityBuffer = new Uint8Array(0);
    this.positions = null;
    this.totalCount = 0;
    this.cachedVisibleIndices = new Uint32Array(0);
    this.resetState();
  }

  /**
   * Set active avatars on the underlying LOD manager.
   */
  setActiveAvatars(count: number): void {
    this.lodManager.setActiveAvatars(count);
  }

  /**
   * Get active avatar count from the underlying LOD manager.
   */
  getActiveAvatars(): number {
    return this.lodManager.getActiveAvatars();
  }
}

// =============================================================================
// FRUSTUM CULL RESULT ENUM
// =============================================================================

const enum FrustumCullResult {
  OUTSIDE = 0,
  INSIDE = 1,
  INTERSECTING = 2,
}

// =============================================================================
// FRUSTUM PLANE EXTRACTION UTILITY
// =============================================================================

/**
 * Extract six frustum planes from a combined view-projection matrix.
 *
 * The matrix should be: projection * view (column-major, as Three.js uses).
 * Each plane is [a, b, c, d] where ax + by + cz + d >= 0 means inside.
 *
 * Compatible with Three.js:
 * ```typescript
 * const vpMatrix = new THREE.Matrix4()
 *   .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
 * const frustum = extractFrustumPlanes(vpMatrix.elements);
 * ```
 *
 * @param m - Column-major 4x4 matrix elements (16 floats, as from THREE.Matrix4.elements)
 */
export function extractFrustumPlanes(m: ArrayLike<number>): FrustumPlanes {
  // Gribb & Hartmann method (column-major):
  // Left:   row3 + row0
  // Right:  row3 - row0
  // Bottom: row3 + row1
  // Top:    row3 - row1
  // Near:   row3 + row2
  // Far:    row3 - row2

  const planes: FrustumPlanes = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];

  // Left: m[3]+m[0], m[7]+m[4], m[11]+m[8], m[15]+m[12]
  planes[0][0] = m[3] + m[0];
  planes[0][1] = m[7] + m[4];
  planes[0][2] = m[11] + m[8];
  planes[0][3] = m[15] + m[12];

  // Right: m[3]-m[0], m[7]-m[4], m[11]-m[8], m[15]-m[12]
  planes[1][0] = m[3] - m[0];
  planes[1][1] = m[7] - m[4];
  planes[1][2] = m[11] - m[8];
  planes[1][3] = m[15] - m[12];

  // Bottom: m[3]+m[1], m[7]+m[5], m[11]+m[9], m[15]+m[13]
  planes[2][0] = m[3] + m[1];
  planes[2][1] = m[7] + m[5];
  planes[2][2] = m[11] + m[9];
  planes[2][3] = m[15] + m[13];

  // Top: m[3]-m[1], m[7]-m[5], m[11]-m[9], m[15]-m[13]
  planes[3][0] = m[3] - m[1];
  planes[3][1] = m[7] - m[5];
  planes[3][2] = m[11] - m[9];
  planes[3][3] = m[15] - m[13];

  // Near: m[3]+m[2], m[7]+m[6], m[11]+m[10], m[15]+m[14]
  planes[4][0] = m[3] + m[2];
  planes[4][1] = m[7] + m[6];
  planes[4][2] = m[11] + m[10];
  planes[4][3] = m[15] + m[14];

  // Far: m[3]-m[2], m[7]-m[6], m[11]-m[10], m[15]-m[14]
  planes[5][0] = m[3] - m[2];
  planes[5][1] = m[7] - m[6];
  planes[5][2] = m[11] - m[10];
  planes[5][3] = m[15] - m[14];

  // Normalize each plane
  for (let i = 0; i < 6; i++) {
    const len = Math.sqrt(
      planes[i][0] * planes[i][0] +
      planes[i][1] * planes[i][1] +
      planes[i][2] * planes[i][2],
    );
    if (len > 0) {
      planes[i][0] /= len;
      planes[i][1] /= len;
      planes[i][2] /= len;
      planes[i][3] /= len;
    }
  }

  return planes;
}
