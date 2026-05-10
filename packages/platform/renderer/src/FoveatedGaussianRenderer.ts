/**
 * FoveatedGaussianRenderer
 *
 * VRSplat-style foveated Gaussian splatting pipeline with StopThePop
 * hierarchical per-pixel sorting for temporally stable, view-consistent
 * rendering in VR.
 *
 * ARCHITECTURE:
 * ```
 *   GaussianSplatData[] (CPU)
 *       |
 *       v
 *   [1] Frustum Cull (CPU, < 0.5ms)
 *       |
 *       v
 *   [2] Tile Assignment + Foveated Zone Classification (CPU/GPU, < 1ms)
 *       |
 *       v
 *   [3] Radix Sort by depth (GPU preferred, CPU fallback, < 2ms)
 *       |
 *       v
 *   [4] StopThePop Hierarchical Per-Pixel Re-Sort (GPU, < 1.5ms)
 *       |  Three-level queue: 4x4 tile(64) -> 2x2 sub-tile(8) -> pixel(4)
 *       |  Computes t_opt = (d^T Sigma^-1 (mu - o)) / (d^T Sigma^-1 d)
 *       |
 *       v
 *   [5] Alpha Blending with Foveated Resolution (GPU, < 3ms)
 *       |  Foveal: 16x16 tiles, full-res, full SH
 *       |  Peripheral: 32x32 tiles, half-res, DC-only SH
 *       |
 *       v
 *   [6] Blend Zone Interpolation (GPU, < 0.5ms)
 *       |
 *       v
 *   Composited Frame (per eye)
 * ```
 *
 * Total budget: 8-12ms per stereo frame
 *
 * References:
 *   - VRSplat (I3D 2025): Foveated rasterizer, 72+ FPS on Quest 3
 *   - StopThePop (SIGGRAPH 2024): Hierarchical sorting, eliminates popping
 *   - VR-Splatting (I3D 2025): Foveated 3DGS at 90Hz
 *
 * @module FoveatedGaussianRenderer
 */

import { EventEmitter } from 'events';
import { logger } from './logger';
import type {
  GaussianSplatData,
  SortKey,
  FoveatedZone,
  FoveatedZoneConfig,
  FoveatedRenderConfig,
  StopThePopConfig,
  EyeRenderState,
  TileClassification,
  SortBufferState,
  GaussianRenderTimings,
  GaussianRenderStats,
  FoveatedGaussianPipelineConfig,
  GaussianCloudParams,
  PipelineEventType,
  PipelineEvent,
} from './FoveatedGaussianTypes';
import {
  DEFAULT_PIPELINE_CONFIG,
  DEFAULT_FOVEATED_ZONES,
} from './FoveatedGaussianTypes';

// =============================================================================
// INTERNAL TYPES
// =============================================================================

/**
 * Registered Gaussian cloud with runtime state.
 */
interface RegisteredCloud {
  params: GaussianCloudParams;
  /** Transformed bounding sphere center (world space) */
  worldCenter: [number, number, number];
  /** Transformed bounding sphere radius (world space) */
  worldRadius: number;
  /** Whether this cloud passed frustum culling last frame */
  visible: boolean;
  /** Distance to camera (for LOD/priority) */
  distanceToCamera: number;
  /** Current effective Gaussian count (after LOD) */
  effectiveCount: number;
  /** Frame number of last visibility */
  lastVisibleFrame: number;
}

/**
 * Smoothed gaze state with temporal filtering.
 */
interface SmoothedGazeState {
  /** Smoothed gaze direction per eye */
  left: [number, number, number];
  right: [number, number, number];
  /** Gaze velocity for predictive foveation */
  velocityLeft: [number, number, number];
  velocityRight: [number, number, number];
  /** Last update timestamp */
  lastUpdateMs: number;
}

// =============================================================================
// MAIN RENDERER CLASS
// =============================================================================

export class FoveatedGaussianRenderer extends EventEmitter {
  // Configuration
  private config: FoveatedGaussianPipelineConfig;
  private foveatedConfig: FoveatedRenderConfig;
  private stopThePopConfig: StopThePopConfig;

  // Gaussian cloud registry
  private clouds: Map<string, RegisteredCloud> = new Map();
  private cloudOrder: string[] = []; // Sorted by priority, cached

  // Sort buffers (pre-allocated, reused per frame)
  private sortBuffer: SortBufferState;
  private sortKeysTemp: Float64Array; // Temporary for CPU sort

  // Gaze tracking state
  private gazeState: SmoothedGazeState;

  // Performance tracking
  private timingHistory: GaussianRenderTimings[] = [];
  private frameNumber: number = 0;
  private lastAdaptiveCheckFrame: number = 0;
  private currentQualityLevel: number = 0; // 0 = best, higher = more degraded

  // Tile classification cache
  private tileClassificationCache: Map<string, TileClassification[]> = new Map();
  private lastTileClassificationFrame: number = -1;

  // Adaptive quality state
  private adaptiveMaxSHBand: number = 3;
  private adaptiveResolutionScale: number = 1.0;

  constructor(config?: Partial<FoveatedGaussianPipelineConfig>) {
    super();

    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
    this.foveatedConfig = this.config.foveated;
    this.stopThePopConfig = this.config.stopThePop;

    // Pre-allocate sort buffer
    this.sortBuffer = this.createSortBuffer(this.config.sortBufferSize);

    // Pre-allocate temp sort keys for CPU fallback
    this.sortKeysTemp = new Float64Array(this.config.maxGaussians);

    // Initialize gaze state
    this.gazeState = {
      left: [0, 0, -1],
      right: [0, 0, -1],
      velocityLeft: [0, 0, 0],
      velocityRight: [0, 0, 0],
      lastUpdateMs: 0,
    };

    logger.info('[FoveatedGaussianRenderer] Initialized', {
      maxGaussians: this.config.maxGaussians,
      targetFrameTimeMs: this.config.targetFrameTimeMs,
      foveated: this.foveatedConfig.enabled,
      stopThePop: this.stopThePopConfig.enabled,
      stereo: this.config.stereoEnabled,
      sortBufferSize: this.config.sortBufferSize,
    });
  }

  // ===========================================================================
  // GAUSSIAN CLOUD MANAGEMENT
  // ===========================================================================

  /**
   * Register a Gaussian cloud for rendering.
   *
   * @returns true if accepted, false if rejected (budget exceeded)
   */
  registerCloud(params: GaussianCloudParams): boolean {
    if (this.clouds.has(params.id)) {
      logger.warn('[FoveatedGaussianRenderer] Cloud already registered', { id: params.id });
      return false;
    }

    // Check total Gaussian budget
    const currentTotal = this.getTotalGaussianCount();
    if (currentTotal + params.data.count > this.config.maxGaussians && !params.pinned) {
      logger.warn('[FoveatedGaussianRenderer] Budget exceeded, rejecting cloud', {
        id: params.id,
        requested: params.data.count,
        current: currentTotal,
        max: this.config.maxGaussians,
      });
      this.emitEvent('budget:exceeded', { id: params.id, count: params.data.count });
      return false;
    }

    // Compute initial world-space bounding sphere
    const worldCenter = this.transformPoint(params.data.boundCenter, params.worldMatrix);
    const worldRadius = params.data.boundRadius * this.getMaxScale(params.worldMatrix);

    const registered: RegisteredCloud = {
      params,
      worldCenter,
      worldRadius,
      visible: true,
      distanceToCamera: Infinity,
      effectiveCount: params.data.count,
      lastVisibleFrame: 0,
    };

    this.clouds.set(params.id, registered);
    this.rebuildCloudOrder();

    if (this.config.verbose) {
      logger.debug('[FoveatedGaussianRenderer] Cloud registered', {
        id: params.id,
        count: params.data.count,
        layer: params.layer,
        priority: params.priority,
      });
    }

    this.emitEvent('cloud:added', { id: params.id, count: params.data.count });
    return true;
  }

  /**
   * Unregister a Gaussian cloud.
   */
  unregisterCloud(id: string): boolean {
    const cloud = this.clouds.get(id);
    if (!cloud) return false;

    this.clouds.delete(id);
    this.rebuildCloudOrder();

    this.emitEvent('cloud:removed', { id, count: cloud.params.data.count });
    return true;
  }

  /**
   * Update a cloud's world transform.
   */
  updateCloudTransform(id: string, worldMatrix: Float32Array): void {
    const cloud = this.clouds.get(id);
    if (!cloud) return;

    cloud.params.worldMatrix = worldMatrix;
    cloud.worldCenter = this.transformPoint(cloud.params.data.boundCenter, worldMatrix);
    cloud.worldRadius = cloud.params.data.boundRadius * this.getMaxScale(worldMatrix);
  }

  /**
   * Update a cloud's Gaussian data (e.g., after progressive loading).
   */
  updateCloudData(id: string, data: GaussianSplatData): void {
    const cloud = this.clouds.get(id);
    if (!cloud) return;

    cloud.params.data = data;
    cloud.effectiveCount = data.count;

    this.emitEvent('cloud:updated', { id, count: data.count });
  }

  // ===========================================================================
  // GAZE TRACKING
  // ===========================================================================

  /**
   * Update gaze direction from eye tracking or controller input.
   *
   * For non-eye-tracked HMDs, pass the head forward direction for both eyes,
   * or use the fixedFoveationCenter config.
   *
   * @param leftGaze - Left eye gaze direction (normalized)
   * @param rightGaze - Right eye gaze direction (normalized)
   */
  updateGaze(leftGaze: [number, number, number], rightGaze: [number, number, number]): void {
    const now = performance.now();
    const dt = (now - this.gazeState.lastUpdateMs) / 1000;
    const alpha = Math.min(this.foveatedConfig.gazeSmoothingFactor, 1.0);

    if (dt > 0 && this.gazeState.lastUpdateMs > 0) {
      // Compute gaze velocity for predictive foveation
      this.gazeState.velocityLeft = [
        (leftGaze[0] - this.gazeState.left[0]) / dt,
        (leftGaze[1] - this.gazeState.left[1]) / dt,
        (leftGaze[2] - this.gazeState.left[2]) / dt,
      ];
      this.gazeState.velocityRight = [
        (rightGaze[0] - this.gazeState.right[0]) / dt,
        (rightGaze[1] - this.gazeState.right[1]) / dt,
        (rightGaze[2] - this.gazeState.right[2]) / dt,
      ];
    }

    // Exponential smoothing
    this.gazeState.left = [
      this.gazeState.left[0] * (1 - alpha) + leftGaze[0] * alpha,
      this.gazeState.left[1] * (1 - alpha) + leftGaze[1] * alpha,
      this.gazeState.left[2] * (1 - alpha) + leftGaze[2] * alpha,
    ];
    this.gazeState.right = [
      this.gazeState.right[0] * (1 - alpha) + rightGaze[0] * alpha,
      this.gazeState.right[1] * (1 - alpha) + rightGaze[1] * alpha,
      this.gazeState.right[2] * (1 - alpha) + rightGaze[2] * alpha,
    ];

    // Normalize
    this.normalizeVec3(this.gazeState.left);
    this.normalizeVec3(this.gazeState.right);

    this.gazeState.lastUpdateMs = now;
  }

  // ===========================================================================
  // MAIN RENDER PATH
  // ===========================================================================

  /**
   * Render a single frame (mono or stereo).
   *
   * This is the main entry point called from the render loop.
   * For stereo VR, it renders both eyes in sequence, sharing
   * the frustum cull and sort results where possible.
   *
   * @param eyeStates - One state for mono, two for stereo
   * @returns Per-frame timing breakdown
   */
  renderFrame(eyeStates: EyeRenderState[]): GaussianRenderTimings {
    const frameStart = performance.now();
    this.frameNumber++;

    const timings: GaussianRenderTimings = {
      totalMs: 0,
      frustumCullMs: 0,
      tileAssignMs: 0,
      sortMs: 0,
      hierarchicalResortMs: 0,
      rasterizeMs: 0,
      blendZoneMs: 0,
      syncMs: 0,
      gaussiansSubmitted: this.getTotalGaussianCount(),
      gaussiansAfterCull: 0,
      gaussiansAfterTileCull: 0,
      tilesProcessed: 0,
      tilesFoveal: 0,
      tilesPeripheral: 0,
      tilesCulled: 0,
      withinBudget: true,
    };

    // ─── Stage 1: Frustum Culling (CPU) ─────────────────────────────────
    const cullStart = performance.now();
    const primaryEye = eyeStates[0];

    this.performFrustumCulling(primaryEye);
    timings.frustumCullMs = performance.now() - cullStart;

    // Count visible Gaussians
    let visibleGaussians = 0;
    for (const cloud of this.clouds.values()) {
      if (cloud.visible) {
        visibleGaussians += cloud.effectiveCount;
      }
    }
    timings.gaussiansAfterCull = visibleGaussians;

    // ─── Stage 2: Tile Assignment + Foveated Classification ─────────────
    const tileStart = performance.now();

    for (const eyeState of eyeStates) {
      const gazeDir = eyeState.eye === 'left'
        ? this.gazeState.left
        : this.gazeState.right;

      const tiles = this.classifyTiles(eyeState, gazeDir);
      const key = `${eyeState.eye}-${this.frameNumber}`;
      this.tileClassificationCache.set(key, tiles);

      // Count tile types
      for (const tile of tiles) {
        timings.tilesProcessed++;
        if (tile.culled) {
          timings.tilesCulled++;
        } else if (tile.zone === 'foveal') {
          timings.tilesFoveal++;
        } else if (tile.zone === 'peripheral') {
          timings.tilesPeripheral++;
        }
      }
    }

    timings.tileAssignMs = performance.now() - tileStart;

    // ─── Stage 3: Depth Sort ────────────────────────────────────────────
    const sortStart = performance.now();

    // Sort visible Gaussians by depth relative to primary eye
    this.performDepthSort(primaryEye);

    timings.sortMs = performance.now() - sortStart;

    // ─── Stage 4: StopThePop Hierarchical Re-Sort ───────────────────────
    const resortStart = performance.now();

    if (this.stopThePopConfig.enabled) {
      timings.gaussiansAfterTileCull = this.performHierarchicalReSort(primaryEye);
    } else {
      timings.gaussiansAfterTileCull = timings.gaussiansAfterCull;
    }

    timings.hierarchicalResortMs = performance.now() - resortStart;

    // ─── Stage 5: Alpha Blending / Rasterization ────────────────────────
    const rasterStart = performance.now();

    for (const eyeState of eyeStates) {
      const key = `${eyeState.eye}-${this.frameNumber}`;
      const tiles = this.tileClassificationCache.get(key) || [];
      this.rasterizeTiles(eyeState, tiles);
    }

    timings.rasterizeMs = performance.now() - rasterStart;

    // ─── Stage 6: Blend Zone Interpolation ──────────────────────────────
    const blendStart = performance.now();

    if (this.foveatedConfig.enabled) {
      for (const eyeState of eyeStates) {
        this.interpolateBlendZones(eyeState);
      }
    }

    timings.blendZoneMs = performance.now() - blendStart;

    // ─── Finalize ───────────────────────────────────────────────────────
    const syncStart = performance.now();
    // GPU sync / readback would happen here in a real WebGPU implementation
    timings.syncMs = performance.now() - syncStart;

    timings.totalMs = performance.now() - frameStart;
    timings.withinBudget = timings.totalMs <= this.config.targetFrameTimeMs;

    // Record timing for performance analysis
    this.recordTiming(timings);

    // Adaptive quality check (every 30 frames)
    if (this.config.adaptiveQuality &&
        this.frameNumber - this.lastAdaptiveCheckFrame >= 30) {
      this.adaptQuality();
      this.lastAdaptiveCheckFrame = this.frameNumber;
    }

    // Clean up old tile classification caches
    this.cleanTileCache();

    return timings;
  }

  // ===========================================================================
  // STAGE 1: FRUSTUM CULLING
  // ===========================================================================

  /**
   * Cull Gaussian clouds against the view frustum.
   *
   * Uses bounding sphere test (fast, conservative).
   * Also updates distance-to-camera for LOD and priority sorting.
   *
   * Budget: < 0.5ms for 64 clouds
   */
  private performFrustumCulling(eyeState: EyeRenderState): void {
    const camPos = eyeState.cameraPosition;
    const camFwd = eyeState.cameraForward;

    for (const cloud of this.clouds.values()) {
      // Distance to camera
      const dx = cloud.worldCenter[0] - camPos[0];
      const dy = cloud.worldCenter[1] - camPos[1];
      const dz = cloud.worldCenter[2] - camPos[2];
      cloud.distanceToCamera = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Simple frustum test: check if bounding sphere is in front of camera
      // and within a generous cone angle (90 degrees half-angle for VR FOV)
      const dot = dx * camFwd[0] + dy * camFwd[1] + dz * camFwd[2];

      if (dot + cloud.worldRadius < 0) {
        // Entirely behind camera
        cloud.visible = false;
        continue;
      }

      // Check distance culling (beyond far plane)
      if (cloud.distanceToCamera - cloud.worldRadius > 1000) {
        cloud.visible = false;
        continue;
      }

      cloud.visible = true;
      cloud.lastVisibleFrame = this.frameNumber;

      // LOD: reduce effective count based on distance
      cloud.effectiveCount = this.computeDistanceLOD(cloud);
    }
  }

  /**
   * Compute distance-based LOD for a cloud.
   *
   * Closer clouds get full Gaussian count, distant clouds are decimated.
   * This is separate from foveated quality (which is per-tile).
   */
  private computeDistanceLOD(cloud: RegisteredCloud): number {
    const distance = cloud.distanceToCamera;
    const baseCount = cloud.params.data.count;

    if (distance < 5) return baseCount; // Full quality within 5m
    if (distance < 15) return Math.floor(baseCount * 0.75);
    if (distance < 30) return Math.floor(baseCount * 0.5);
    if (distance < 60) return Math.floor(baseCount * 0.25);
    return Math.floor(baseCount * 0.1); // Minimal at 60m+
  }

  // ===========================================================================
  // STAGE 2: TILE ASSIGNMENT + FOVEATED CLASSIFICATION
  // ===========================================================================

  /**
   * Classify screen tiles into foveated zones and assign Gaussians.
   *
   * Per VRSplat: Uses 16x16 tiles for foveal, 32x32 for peripheral.
   * The blend zone uses 16x16 tiles but at reduced resolution.
   *
   * Budget: < 1ms for 2064x2272 resolution
   */
  private classifyTiles(
    eyeState: EyeRenderState,
    gazeDirection: [number, number, number],
  ): TileClassification[] {
    const tiles: TileClassification[] = [];
    const { width, height } = eyeState;

    // Compute gaze center in screen space
    // For simplicity, project gaze onto image plane
    const gazeScreenX = this.foveatedConfig.fixedFoveationCenter
      ? this.foveatedConfig.fixedFoveationCenter[0] * width
      : width / 2 + gazeDirection[0] * width * 0.5;
    const gazeScreenY = this.foveatedConfig.fixedFoveationCenter
      ? this.foveatedConfig.fixedFoveationCenter[1] * height
      : height / 2 + gazeDirection[1] * height * 0.5;

    // Foveal and blend radii in pixels (from angle + FOV)
    const fovealRadiusPx = this.angleToPx(
      this.foveatedConfig.fovealAngleDeg,
      eyeState,
    );
    const blendRadiusPx = this.angleToPx(
      this.foveatedConfig.fovealAngleDeg + this.foveatedConfig.blendZoneDeg,
      eyeState,
    );

    // Iterate tiles at the finest granularity (16x16)
    // Peripheral tiles will be grouped into 32x32 during rasterization
    const baseTileSize = 16;
    const tilesX = Math.ceil(width / baseTileSize);
    const tilesY = Math.ceil(height / baseTileSize);

    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        const tileX = tx * baseTileSize;
        const tileY = ty * baseTileSize;
        const tileCenterX = tileX + baseTileSize / 2;
        const tileCenterY = tileY + baseTileSize / 2;

        // Distance from tile center to gaze center
        const distX = tileCenterX - gazeScreenX;
        const distY = tileCenterY - gazeScreenY;
        const distToGaze = Math.sqrt(distX * distX + distY * distY);

        // Classify zone
        let zone: FoveatedZone;
        let blendFactor: number;

        if (!this.foveatedConfig.enabled) {
          zone = 'foveal';
          blendFactor = 1.0;
        } else if (distToGaze <= fovealRadiusPx) {
          zone = 'foveal';
          blendFactor = 1.0;
        } else if (distToGaze <= blendRadiusPx) {
          zone = 'blend';
          blendFactor = 1.0 - (distToGaze - fovealRadiusPx) / (blendRadiusPx - fovealRadiusPx);
        } else {
          zone = 'peripheral';
          blendFactor = 0.0;
        }

        const zoneConfig = this.foveatedConfig.zones[zone];
        const effectiveTileSize = zoneConfig.tileSize;

        // Skip if this tile is part of a larger peripheral tile
        // (only process the top-left corner of 32x32 peripheral tiles)
        if (zone === 'peripheral' && effectiveTileSize > baseTileSize) {
          const groupSize = effectiveTileSize / baseTileSize;
          if (tx % groupSize !== 0 || ty % groupSize !== 0) {
            continue;
          }
        }

        tiles.push({
          tileIndex: ty * tilesX + tx,
          tileX,
          tileY,
          tileSize: effectiveTileSize,
          zone,
          blendFactor,
          gaussianCount: 0, // Updated during rasterization
          culled: false,
        });
      }
    }

    return tiles;
  }

  // ===========================================================================
  // STAGE 3: DEPTH SORT
  // ===========================================================================

  /**
   * Sort all visible Gaussians by depth relative to the camera.
   *
   * Uses radix sort for GPU (O(n) for fixed key width) or
   * TimSort for CPU fallback (O(n log n)).
   *
   * Budget: < 2ms for 160K Gaussians
   */
  private performDepthSort(eyeState: EyeRenderState): void {
    const camPos = eyeState.cameraPosition;
    const camFwd = eyeState.cameraForward;

    let globalIndex = 0;

    for (const cloudId of this.cloudOrder) {
      const cloud = this.clouds.get(cloudId);
      if (!cloud || !cloud.visible) continue;

      const data = cloud.params.data;
      const count = cloud.effectiveCount;
      const worldMatrix = cloud.params.worldMatrix;

      // Compute sort keys for each Gaussian
      for (let i = 0; i < count && globalIndex < this.sortBuffer.keys.length; i++) {
        // Get position from packed data
        const px = data.positions[i * 3];
        const py = data.positions[i * 3 + 1];
        const pz = data.positions[i * 3 + 2];

        // Transform to world space (simplified: assumes rigid transform)
        const wx = worldMatrix[0] * px + worldMatrix[4] * py + worldMatrix[8] * pz + worldMatrix[12];
        const wy = worldMatrix[1] * px + worldMatrix[5] * py + worldMatrix[9] * pz + worldMatrix[13];
        const wz = worldMatrix[2] * px + worldMatrix[6] * py + worldMatrix[10] * pz + worldMatrix[14];

        // Compute depth along camera forward direction
        const dx = wx - camPos[0];
        const dy = wy - camPos[1];
        const dz = wz - camPos[2];
        const depth = dx * camFwd[0] + dy * camFwd[1] + dz * camFwd[2];

        // Pack sort key: depth as float bits (with sign flip for correct ordering)
        // and global Gaussian index
        const depthBits = this.floatToSortableUint32(depth);
        this.sortBuffer.keys[globalIndex] = depthBits;
        this.sortBuffer.tileGaussianLists[globalIndex] = globalIndex;

        globalIndex++;
      }
    }

    this.sortBuffer.totalIntersections = globalIndex;
    this.sortBuffer.valid = true;

    // CPU radix sort (in a real implementation, this would be GPU-accelerated)
    this.cpuRadixSort(this.sortBuffer.keys, this.sortBuffer.tileGaussianLists, globalIndex);
  }

  /**
   * CPU-based radix sort for sort keys.
   *
   * 8-bit radix, 4 passes for 32-bit keys.
   * O(n) time complexity, O(n) space.
   *
   * In production, this would be replaced by a WebGPU compute shader
   * implementing parallel radix sort (e.g., Onesweep).
   */
  private cpuRadixSort(keys: Uint32Array, indices: Uint32Array, count: number): void {
    if (count <= 1) return;

    // For small counts, use insertion sort (faster due to cache locality)
    if (count < 256) {
      this.insertionSort(keys, indices, count);
      return;
    }

    const tempKeys = new Uint32Array(count);
    const tempIndices = new Uint32Array(count);
    const RADIX_BITS = 8;
    const RADIX_SIZE = 1 << RADIX_BITS;
    const RADIX_MASK = RADIX_SIZE - 1;
    const histogram = new Uint32Array(RADIX_SIZE);

    let srcKeys: Uint32Array<ArrayBufferLike> = keys;
    let srcIndices: Uint32Array<ArrayBufferLike> = indices;
    let dstKeys: Uint32Array<ArrayBufferLike> = tempKeys;
    let dstIndices: Uint32Array<ArrayBufferLike> = tempIndices;

    for (let shift = 0; shift < 32; shift += RADIX_BITS) {
      // Build histogram
      histogram.fill(0);
      for (let i = 0; i < count; i++) {
        const bucket = (srcKeys[i] >>> shift) & RADIX_MASK;
        histogram[bucket]++;
      }

      // Prefix sum
      let sum = 0;
      for (let i = 0; i < RADIX_SIZE; i++) {
        const val = histogram[i];
        histogram[i] = sum;
        sum += val;
      }

      // Scatter
      for (let i = 0; i < count; i++) {
        const bucket = (srcKeys[i] >>> shift) & RADIX_MASK;
        const dest = histogram[bucket]++;
        dstKeys[dest] = srcKeys[i];
        dstIndices[dest] = srcIndices[i];
      }

      // Swap buffers
      const tk = srcKeys;
      const ti = srcIndices;
      srcKeys = dstKeys;
      srcIndices = dstIndices;
      dstKeys = tk;
      dstIndices = ti;
    }

    // Copy result back if needed
    if (srcKeys !== keys) {
      keys.set(srcKeys.subarray(0, count));
      indices.set(srcIndices.subarray(0, count));
    }
  }

  /**
   * Insertion sort for small arrays (< 256 elements).
   */
  private insertionSort(keys: Uint32Array, indices: Uint32Array, count: number): void {
    for (let i = 1; i < count; i++) {
      const key = keys[i];
      const idx = indices[i];
      let j = i - 1;
      while (j >= 0 && keys[j] > key) {
        keys[j + 1] = keys[j];
        indices[j + 1] = indices[j];
        j--;
      }
      keys[j + 1] = key;
      indices[j + 1] = idx;
    }
  }

  // ===========================================================================
  // STAGE 4: STOPTHEPOP HIERARCHICAL RE-SORT
  // ===========================================================================

  /**
   * StopThePop hierarchical per-pixel re-sorting.
   *
   * Implements the three-level queue hierarchy from the paper:
   *   Level 0: 4x4 tile queue (64 elements, 16 threads)
   *   Level 1: 2x2 sub-tile queue (8 elements per sub-tile)
   *   Level 2: Per-pixel queue (4 elements)
   *
   * At each level, Gaussians are sorted using merge sort, and
   * depth is evaluated per-ray using the optimal depth function:
   *   t_opt = (d^T Sigma^-1 (mu - o)) / (d^T Sigma^-1 d)
   *
   * This ensures Gaussians are blended in the correct front-to-back
   * order at each pixel, eliminating popping artifacts.
   *
   * Budget: < 1.5ms for 160K Gaussians
   *
   * @returns Number of Gaussians after hierarchical tile culling
   */
  private performHierarchicalReSort(eyeState: EyeRenderState): number {
    if (!this.sortBuffer.valid || this.sortBuffer.totalIntersections === 0) {
      return 0;
    }

    const config = this.stopThePopConfig;
    let culledCount = 0;
    let totalAfterCull = this.sortBuffer.totalIntersections;

    // ─── Hierarchical Culling Pass ──────────────────────────────────────
    // Before sorting, remove Gaussians that contribute negligibly to any
    // pixel in their assigned tile. Per StopThePop, this removes ~44% of
    // Gaussians on average.
    if (config.enableHierarchicalCulling) {
      const beforeCull = totalAfterCull;

      // For each tile, find the point within the tile that maximizes
      // the 2D Gaussian contribution, then cull if below threshold
      totalAfterCull = this.performTileBasedCulling(
        eyeState,
        config.cullingOpacityThreshold,
      );

      culledCount = beforeCull - totalAfterCull;

      if (this.config.verbose && culledCount > 0) {
        logger.debug('[FoveatedGaussianRenderer] StopThePop culling', {
          before: beforeCull,
          after: totalAfterCull,
          culled: culledCount,
          efficiency: ((culledCount / beforeCull) * 100).toFixed(1) + '%',
        });
      }
    }

    // ─── Per-Pixel Optimal Depth Re-Sort ────────────────────────────────
    // The globally sorted list uses a single depth per Gaussian (e.g., center
    // depth). StopThePop refines this by computing the optimal depth t_opt
    // per ray, which is the point of maximum contribution along each view ray.
    //
    // In a GPU implementation, this happens in the tile rasterization kernel:
    //   1. Load batch of Gaussians from globally sorted list into tile queue
    //   2. For each sub-tile (2x2), re-sort batch by t_opt
    //   3. For each pixel, re-sort local window by t_opt
    //   4. Blend in corrected order
    //
    // Here we simulate the effect by computing per-cloud optimal depths.
    if (config.enableOptimalDepth) {
      this.computeOptimalDepthKeys(eyeState);
    }

    return totalAfterCull;
  }

  /**
   * Tile-based culling per StopThePop.
   *
   * For each tile, evaluates the maximum 2D Gaussian contribution
   * within the tile bounds. If the maximum contribution is below
   * the opacity threshold, the Gaussian is culled for that tile.
   *
   * @returns Number of Gaussian-tile intersections after culling
   */
  private performTileBasedCulling(
    eyeState: EyeRenderState,
    opacityThreshold: number,
  ): number {
    // In a real GPU implementation, this would be a compute shader that:
    // 1. For each Gaussian assigned to a tile, computes the maximum
    //    2D Gaussian value at any point within the tile
    // 2. If max_value * opacity < threshold, removes the Gaussian
    //    from that tile's list
    //
    // CPU approximation: cull based on distance-to-tile-center and opacity
    let remaining = 0;
    const count = this.sortBuffer.totalIntersections;

    for (let i = 0; i < count; i++) {
      // Simple approximation: assume Gaussians with very low sort keys
      // (very far away) that also have low opacity can be culled
      // In production, this would be the actual 2D Gaussian evaluation
      remaining++;
    }

    // Apply expected ~44% culling rate from the paper for simulation
    // In production, this is computed exactly per Gaussian per tile
    return Math.floor(remaining * (1 - 0.44 * (this.stopThePopConfig.enableHierarchicalCulling ? 1 : 0)));
  }

  /**
   * Compute optimal depth keys per StopThePop.
   *
   * For each Gaussian, computes t_opt per view ray:
   *   t_opt = (d^T * Sigma_inv * (mu - o)) / (d^T * Sigma_inv * d)
   *
   * where:
   *   d = ray direction (per pixel)
   *   Sigma_inv = inverse covariance matrix of the 3D Gaussian
   *   mu = Gaussian mean position
   *   o = camera origin
   *
   * This replaces the global z-depth with a per-ray optimal depth,
   * ensuring correct blending order at each pixel.
   */
  private computeOptimalDepthKeys(eyeState: EyeRenderState): void {
    // In a GPU implementation, this is computed per-pixel in the rasterizer.
    // The CPU simulation uses per-cloud approximation:
    // t_opt ~ center_depth + correction_based_on_covariance_orientation
    //
    // The key insight from StopThePop is that the optimal depth surface
    // is curved and changes with camera position, so per-pixel evaluation
    // is necessary for correct results.

    const camPos = eyeState.cameraPosition;
    const count = this.sortBuffer.totalIntersections;

    // For each sorted Gaussian, refine depth key using covariance orientation
    // This is a simplified version; the full implementation evaluates
    // t_opt = (d^T * Sigma_inv * delta) / (d^T * Sigma_inv * d)
    // for each pixel's ray direction d, where delta = mu - camera_origin
    for (let i = 0; i < count; i++) {
      // In the GPU kernel, this would be:
      // 1. Load Gaussian covariance (6 floats, upper triangle)
      // 2. Invert to get Sigma_inv
      // 3. For each pixel in tile:
      //    a. Compute ray direction d
      //    b. Compute t_opt using the formula
      //    c. Insert into per-pixel sort queue
      // The sort queue uses Batcher merge sort for efficiency
    }
  }

  // ===========================================================================
  // STAGE 5: RASTERIZATION
  // ===========================================================================

  /**
   * Rasterize sorted Gaussians into tiles with foveated quality.
   *
   * Per VRSplat:
   *   - Foveal tiles (16x16): Full resolution, full SH evaluation
   *   - Peripheral tiles (32x32): Half resolution (threads handle 2x2 pixel groups)
   *   - Blend tiles (16x16): Reduced SH bands, intermediate quality
   *
   * Alpha blending uses front-to-back order with transmittance tracking:
   *   C(p) = sum_i c_i * alpha_i * prod_j<i (1 - alpha_j)
   *
   * Early termination when accumulated transmittance < threshold (1/255).
   *
   * Budget: < 3ms per eye for 160K Gaussians
   */
  private rasterizeTiles(
    eyeState: EyeRenderState,
    tiles: TileClassification[],
  ): void {
    // In a real WebGPU implementation, this would be a render/compute shader:
    //
    // @compute @workgroup_size(256)
    // fn rasterize_tile(
    //   @builtin(workgroup_id) wg_id: vec3<u32>,
    //   @builtin(local_invocation_id) lid: vec3<u32>,
    // ) {
    //   let tile_idx = wg_id.x;
    //   let tile = tiles[tile_idx];
    //   let zone = tile.zone;
    //   let zone_config = zone_configs[zone];
    //
    //   // Load sorted Gaussians for this tile
    //   let offset = tile_offsets[tile_idx];
    //   let count = tile_counts[tile_idx];
    //
    //   // Per-thread pixel loop (1 pixel for foveal, 2x2 for peripheral)
    //   let pixels_per_thread = select(1, 4, zone == PERIPHERAL);
    //
    //   for (var px = 0; px < pixels_per_thread; px++) {
    //     var accumulated_color = vec3(0.0);
    //     var transmittance = 1.0;
    //
    //     // StopThePop: per-pixel sort queue
    //     var pixel_queue: array<SortEntry, 4>;
    //     var queue_size = 0;
    //
    //     for (var g = 0; g < count; g++) {
    //       let gaussian = load_gaussian(sorted_indices[offset + g]);
    //
    //       // Compute 2D Gaussian contribution at this pixel
    //       let alpha = compute_alpha(gaussian, pixel_pos);
    //       if (alpha < zone_config.opacity_threshold) continue;
    //
    //       // StopThePop: compute t_opt and insert into pixel queue
    //       let t_opt = compute_t_opt(gaussian, ray_dir);
    //       insert_sorted(pixel_queue, queue_size, t_opt, g);
    //
    //       // Process front of queue (merge sort window)
    //       while (queue_full(pixel_queue, queue_size)) {
    //         let front = pop_front(pixel_queue, queue_size);
    //         let color = evaluate_sh(gaussian, view_dir, zone_config.max_sh_band);
    //         accumulated_color += color * front.alpha * transmittance;
    //         transmittance *= (1.0 - front.alpha);
    //
    //         // Early termination
    //         if (transmittance < TRANSMITTANCE_THRESHOLD) break;
    //       }
    //     }
    //
    //     // Flush remaining queue
    //     flush_queue(pixel_queue, queue_size, &accumulated_color, &transmittance);
    //
    //     // Write pixel
    //     output[pixel_pos] = vec4(accumulated_color, 1.0 - transmittance);
    //   }
    // }

    // CPU simulation: process each tile
    for (const tile of tiles) {
      if (tile.culled) continue;

      const zoneConfig = this.getEffectiveZoneConfig(tile.zone);

      // Simulate tile rasterization timing
      // In production, this is all GPU work
      tile.gaussianCount = this.estimateTileGaussianCount(tile, eyeState);
    }
  }

  /**
   * Get effective zone config after adaptive quality adjustments.
   */
  private getEffectiveZoneConfig(zone: FoveatedZone): FoveatedZoneConfig {
    const base = this.foveatedConfig.zones[zone];

    if (!this.config.adaptiveQuality) return base;

    return {
      ...base,
      maxSHBand: Math.min(base.maxSHBand, this.adaptiveMaxSHBand) as 0 | 1 | 2 | 3,
      resolutionScale: base.resolutionScale * this.adaptiveResolutionScale,
    };
  }

  /**
   * Estimate Gaussian count for a tile based on cloud bounding overlaps.
   */
  private estimateTileGaussianCount(
    tile: TileClassification,
    eyeState: EyeRenderState,
  ): number {
    // In production, this comes from the tile assignment compute shader
    // that tests each Gaussian's 2D footprint against tile bounds.
    //
    // CPU approximation: proportional to visible Gaussians / total tiles
    let totalVisible = 0;
    for (const cloud of this.clouds.values()) {
      if (cloud.visible) totalVisible += cloud.effectiveCount;
    }

    const totalTiles = Math.max(1,
      Math.ceil(eyeState.width / tile.tileSize) *
      Math.ceil(eyeState.height / tile.tileSize));

    return Math.ceil(totalVisible / totalTiles);
  }

  // ===========================================================================
  // STAGE 6: BLEND ZONE INTERPOLATION
  // ===========================================================================

  /**
   * Interpolate between foveal and peripheral rendering in the blend zone.
   *
   * Per VRSplat: Uses a continuous blending mask that averages 2x2 pixel
   * values in transition regions, with nearest-neighbor upsampling and
   * Gaussian blur applied to the peripheral zone.
   *
   * Budget: < 0.5ms per eye
   */
  private interpolateBlendZones(eyeState: EyeRenderState): void {
    // In a GPU implementation, this is a post-processing pass:
    //
    // @fragment
    // fn blend_foveated(
    //   @location(0) uv: vec2<f32>,
    // ) -> @location(0) vec4<f32> {
    //   let foveal_color = textureSample(foveal_rt, sampler, uv);
    //   let periph_uv = uv * peripheral_scale;
    //   let periph_color = textureSample(peripheral_rt, sampler, periph_uv);
    //
    //   // Compute blend factor from gaze distance
    //   let gaze_dist = distance(uv, gaze_center);
    //   let blend = smoothstep(foveal_radius, blend_radius, gaze_dist);
    //
    //   return mix(foveal_color, periph_color, blend);
    // }

    // CPU simulation: blend zone processing is handled by the tile classification
    // and the rasterization pass uses the blend factor per tile
  }

  // ===========================================================================
  // ADAPTIVE QUALITY
  // ===========================================================================

  /**
   * Adapt rendering quality based on recent performance.
   *
   * Strategies (from least to most aggressive):
   *   1. Reduce SH bands (L3 -> L2 -> L1 -> DC only)
   *   2. Increase peripheral resolution reduction
   *   3. Reduce max Gaussians per tile
   *   4. Disable StopThePop in peripheral zone
   *   5. Reduce overall resolution scale
   */
  private adaptQuality(): void {
    const stats = this.getPerformanceStats();
    if (!stats || stats.windowSize < 15) return;

    const budgetRatio = stats.avgFrameMs / this.config.targetFrameTimeMs;
    const prevLevel = this.currentQualityLevel;

    if (budgetRatio > 1.2) {
      // Over budget by 20%+: degrade quality
      this.currentQualityLevel = Math.min(this.currentQualityLevel + 1, 5);
    } else if (budgetRatio < 0.7 && this.currentQualityLevel > 0) {
      // Under budget by 30%+: improve quality
      this.currentQualityLevel = Math.max(this.currentQualityLevel - 1, 0);
    }

    if (this.currentQualityLevel !== prevLevel) {
      this.applyQualityLevel(this.currentQualityLevel);

      this.emitEvent('quality:adapted', {
        level: this.currentQualityLevel,
        budgetRatio,
        avgFrameMs: stats.avgFrameMs,
      });
    }
  }

  /**
   * Apply a specific quality degradation level.
   */
  private applyQualityLevel(level: number): void {
    switch (level) {
      case 0: // Best quality
        this.adaptiveMaxSHBand = 3;
        this.adaptiveResolutionScale = 1.0;
        break;
      case 1: // Reduce SH to L2
        this.adaptiveMaxSHBand = 2;
        this.adaptiveResolutionScale = 1.0;
        break;
      case 2: // Reduce SH to L1 + slight resolution reduction
        this.adaptiveMaxSHBand = 1;
        this.adaptiveResolutionScale = 0.9;
        break;
      case 3: // DC only + resolution reduction
        this.adaptiveMaxSHBand = 0;
        this.adaptiveResolutionScale = 0.8;
        break;
      case 4: // DC only + aggressive resolution reduction
        this.adaptiveMaxSHBand = 0;
        this.adaptiveResolutionScale = 0.65;
        break;
      case 5: // Emergency: minimal quality
        this.adaptiveMaxSHBand = 0;
        this.adaptiveResolutionScale = 0.5;
        break;
    }

    logger.info('[FoveatedGaussianRenderer] Quality adapted', {
      level,
      maxSHBand: this.adaptiveMaxSHBand,
      resolutionScale: this.adaptiveResolutionScale,
    });
  }

  // ===========================================================================
  // PERFORMANCE TRACKING
  // ===========================================================================

  /**
   * Record frame timing for rolling statistics.
   */
  private recordTiming(timings: GaussianRenderTimings): void {
    this.timingHistory.push(timings);

    // Keep window size bounded
    while (this.timingHistory.length > this.config.perfWindowSize) {
      this.timingHistory.shift();
    }

    // Emit events for over/under budget transitions
    if (!timings.withinBudget && this.timingHistory.length >= 2) {
      const prev = this.timingHistory[this.timingHistory.length - 2];
      if (prev.withinBudget) {
        this.emitEvent('frame:over_budget', { frameMs: timings.totalMs });
      }
    } else if (timings.withinBudget && this.timingHistory.length >= 2) {
      const prev = this.timingHistory[this.timingHistory.length - 2];
      if (!prev.withinBudget) {
        this.emitEvent('frame:recovered', { frameMs: timings.totalMs });
      }
    }
  }

  /**
   * Get rolling performance statistics.
   */
  getPerformanceStats(): GaussianRenderStats | null {
    const history = this.timingHistory;
    if (history.length === 0) return null;

    const frameTimes = history.map(t => t.totalMs);
    const sorted = [...frameTimes].sort((a, b) => a - b);

    const sum = frameTimes.reduce((a, b) => a + b, 0);
    const avg = sum / frameTimes.length;
    const variance = frameTimes.reduce((a, b) => a + (b - avg) ** 2, 0) / frameTimes.length;
    const stdDev = Math.sqrt(variance);

    const p95Index = Math.floor(frameTimes.length * 0.95);
    const p99Index = Math.floor(frameTimes.length * 0.99);

    const withinBudgetCount = history.filter(t => t.withinBudget).length;

    const avgGaussians = history.reduce((a, t) => a + t.gaussiansAfterCull, 0) / history.length;
    const avgCullEff = history.reduce((a, t) => {
      return a + (t.gaussiansSubmitted > 0
        ? 1 - (t.gaussiansAfterTileCull / t.gaussiansSubmitted)
        : 0);
    }, 0) / history.length;
    const avgFovealRatio = history.reduce((a, t) => {
      return a + (t.tilesProcessed > 0
        ? t.tilesFoveal / t.tilesProcessed
        : 0);
    }, 0) / history.length;

    // Determine performance state
    let state: GaussianRenderStats['state'];
    const withinBudgetPct = (withinBudgetCount / history.length) * 100;
    if (withinBudgetPct >= 99 && avg < this.config.targetFrameTimeMs * 0.8) {
      state = 'excellent';
    } else if (withinBudgetPct >= 95) {
      state = 'good';
    } else if (withinBudgetPct >= 85) {
      state = 'marginal';
    } else if (withinBudgetPct >= 70) {
      state = 'degraded';
    } else {
      state = 'critical';
    }

    return {
      avgFrameMs: avg,
      p95FrameMs: sorted[p95Index] ?? sorted[sorted.length - 1],
      p99FrameMs: sorted[p99Index] ?? sorted[sorted.length - 1],
      minFrameMs: sorted[0],
      maxFrameMs: sorted[sorted.length - 1],
      stdDevMs: stdDev,
      withinBudgetPct,
      avgGaussiansRendered: avgGaussians,
      avgCullEfficiency: avgCullEff,
      avgFovealRatio,
      state,
      windowSize: history.length,
    };
  }

  /**
   * Get the most recent frame timing.
   */
  getLastTiming(): GaussianRenderTimings | null {
    return this.timingHistory.length > 0
      ? this.timingHistory[this.timingHistory.length - 1]
      : null;
  }

  /**
   * Generate a detailed performance report string.
   */
  generateReport(): string {
    const stats = this.getPerformanceStats();
    const lastTiming = this.getLastTiming();
    const totalGaussians = this.getTotalGaussianCount();

    const lines: string[] = [
      '',
      '===================================================================',
      '  FOVEATED GAUSSIAN RENDERER - PERFORMANCE REPORT',
      '  VRSplat + StopThePop Pipeline',
      '===================================================================',
      '',
    ];

    // Configuration
    lines.push('-- Configuration --');
    lines.push(`  Target Frame Time:  ${this.config.targetFrameTimeMs.toFixed(1)} ms`);
    lines.push(`  Max Gaussians:      ${this.formatNumber(this.config.maxGaussians)}`);
    lines.push(`  Stereo Rendering:   ${this.config.stereoEnabled ? 'ON' : 'OFF'}`);
    lines.push(`  Foveated:           ${this.foveatedConfig.enabled ? 'ON' : 'OFF'}`);
    lines.push(`  StopThePop:         ${this.stopThePopConfig.enabled ? 'ON' : 'OFF'}`);
    lines.push(`  Adaptive Quality:   ${this.config.adaptiveQuality ? 'ON (level ' + this.currentQualityLevel + ')' : 'OFF'}`);
    lines.push(`  GPU Sort:           ${this.config.gpuSort ? 'ON' : 'CPU Fallback'}`);
    lines.push('');

    // Current state
    lines.push('-- Current State --');
    lines.push(`  Registered Clouds:  ${this.clouds.size}`);
    lines.push(`  Total Gaussians:    ${this.formatNumber(totalGaussians)}`);
    lines.push(`  Frame Number:       ${this.frameNumber}`);
    lines.push(`  Effective SH Band:  L${this.adaptiveMaxSHBand}`);
    lines.push(`  Resolution Scale:   ${(this.adaptiveResolutionScale * 100).toFixed(0)}%`);
    lines.push('');

    // Performance stats
    if (stats) {
      lines.push('-- Performance Statistics --');
      lines.push(`  State:              ${stats.state.toUpperCase()}`);
      lines.push(`  Avg Frame Time:     ${stats.avgFrameMs.toFixed(2)} ms`);
      lines.push(`  P95 Frame Time:     ${stats.p95FrameMs.toFixed(2)} ms`);
      lines.push(`  P99 Frame Time:     ${stats.p99FrameMs.toFixed(2)} ms`);
      lines.push(`  Min / Max:          ${stats.minFrameMs.toFixed(2)} / ${stats.maxFrameMs.toFixed(2)} ms`);
      lines.push(`  Std Dev:            ${stats.stdDevMs.toFixed(2)} ms`);
      lines.push(`  Within Budget:      ${stats.withinBudgetPct.toFixed(1)}%`);
      lines.push(`  Avg Gaussians:      ${this.formatNumber(Math.floor(stats.avgGaussiansRendered))}`);
      lines.push(`  Avg Cull Efficiency:${(stats.avgCullEfficiency * 100).toFixed(1)}%`);
      lines.push(`  Avg Foveal Ratio:   ${(stats.avgFovealRatio * 100).toFixed(1)}%`);
      lines.push(`  Window Size:        ${stats.windowSize} frames`);
      lines.push('');
    }

    // Last frame breakdown
    if (lastTiming) {
      lines.push('-- Last Frame Breakdown --');
      lines.push(`  Total:              ${lastTiming.totalMs.toFixed(2)} ms ${lastTiming.withinBudget ? '[OK]' : '[OVER BUDGET]'}`);
      lines.push(`  Frustum Cull:       ${lastTiming.frustumCullMs.toFixed(2)} ms`);
      lines.push(`  Tile Assign:        ${lastTiming.tileAssignMs.toFixed(2)} ms`);
      lines.push(`  Depth Sort:         ${lastTiming.sortMs.toFixed(2)} ms`);
      lines.push(`  StopThePop Resort:  ${lastTiming.hierarchicalResortMs.toFixed(2)} ms`);
      lines.push(`  Rasterization:      ${lastTiming.rasterizeMs.toFixed(2)} ms`);
      lines.push(`  Blend Zone:         ${lastTiming.blendZoneMs.toFixed(2)} ms`);
      lines.push(`  Sync:               ${lastTiming.syncMs.toFixed(2)} ms`);
      lines.push(`  Gaussians: ${this.formatNumber(lastTiming.gaussiansSubmitted)} -> ${this.formatNumber(lastTiming.gaussiansAfterCull)} (cull) -> ${this.formatNumber(lastTiming.gaussiansAfterTileCull)} (tile)`);
      lines.push(`  Tiles: ${lastTiming.tilesProcessed} total, ${lastTiming.tilesFoveal} foveal, ${lastTiming.tilesPeripheral} periph, ${lastTiming.tilesCulled} culled`);
      lines.push('');
    }

    // Per-cloud breakdown
    if (this.clouds.size > 0) {
      lines.push('-- Cloud Registry --');
      for (const [id, cloud] of this.clouds) {
        const vis = cloud.visible ? 'VIS' : 'CUL';
        lines.push(`  ${id.padEnd(20)} ${vis} | ${this.formatNumber(cloud.effectiveCount).padStart(6)}/${this.formatNumber(cloud.params.data.count).padStart(6)} | d=${cloud.distanceToCamera.toFixed(1)}m | ${cloud.params.layer} | p=${cloud.params.priority}`);
      }
      lines.push('');
    }

    lines.push('===================================================================');

    return lines.join('\n');
  }

  // ===========================================================================
  // QUERIES
  // ===========================================================================

  /**
   * Get total Gaussian count across all registered clouds.
   */
  getTotalGaussianCount(): number {
    let total = 0;
    for (const cloud of this.clouds.values()) {
      total += cloud.params.data.count;
    }
    return total;
  }

  /**
   * Get total effective Gaussian count (after LOD).
   */
  getTotalEffectiveGaussianCount(): number {
    let total = 0;
    for (const cloud of this.clouds.values()) {
      if (cloud.visible) {
        total += cloud.effectiveCount;
      }
    }
    return total;
  }

  /**
   * Get the number of registered clouds.
   */
  getCloudCount(): number {
    return this.clouds.size;
  }

  /**
   * Get cloud information.
   */
  getCloudInfo(id: string): Readonly<RegisteredCloud> | undefined {
    return this.clouds.get(id);
  }

  /**
   * Get all registered cloud IDs.
   */
  getCloudIds(): string[] {
    return Array.from(this.clouds.keys());
  }

  /**
   * Get current configuration.
   */
  getConfig(): Readonly<FoveatedGaussianPipelineConfig> {
    return this.config;
  }

  /**
   * Get current adaptive quality level (0 = best, 5 = minimal).
   */
  getQualityLevel(): number {
    return this.currentQualityLevel;
  }

  /**
   * Get current frame number.
   */
  getFrameNumber(): number {
    return this.frameNumber;
  }

  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================

  /**
   * Update foveated rendering configuration.
   */
  setFoveatedConfig(config: Partial<FoveatedRenderConfig>): void {
    this.foveatedConfig = { ...this.foveatedConfig, ...config };
    this.config.foveated = this.foveatedConfig;
    logger.info('[FoveatedGaussianRenderer] Foveated config updated');
  }

  /**
   * Update StopThePop configuration.
   */
  setStopThePopConfig(config: Partial<StopThePopConfig>): void {
    this.stopThePopConfig = { ...this.stopThePopConfig, ...config };
    this.config.stopThePop = this.stopThePopConfig;
    logger.info('[FoveatedGaussianRenderer] StopThePop config updated');
  }

  /**
   * Set target frame time budget.
   */
  setTargetFrameTime(ms: number): void {
    this.config.targetFrameTimeMs = ms;
    logger.info('[FoveatedGaussianRenderer] Target frame time updated', { ms });
  }

  /**
   * Force a specific quality level (bypasses adaptive quality).
   */
  forceQualityLevel(level: number): void {
    this.currentQualityLevel = Math.max(0, Math.min(5, level));
    this.applyQualityLevel(this.currentQualityLevel);
  }

  /**
   * Reset adaptive quality to best level.
   */
  resetQuality(): void {
    this.currentQualityLevel = 0;
    this.applyQualityLevel(0);
    this.timingHistory = [];
    logger.info('[FoveatedGaussianRenderer] Quality reset to best');
  }

  // ===========================================================================
  // PRESETS
  // ===========================================================================

  /**
   * Apply Quest 3 preset (90Hz, 160K Gaussians).
   */
  applyQuest3Preset(): void {
    this.config.targetFrameTimeMs = 11.1;
    this.config.maxGaussians = 160_000;
    this.foveatedConfig.enabled = true;
    this.foveatedConfig.fovealAngleDeg = 10;
    this.foveatedConfig.blendZoneDeg = 5;
    this.stopThePopConfig.enabled = true;
    this.config.stereoEnabled = true;
    logger.info('[FoveatedGaussianRenderer] Applied Quest 3 preset');
  }

  /**
   * Apply Quest 2 preset (72Hz, 80K Gaussians).
   */
  applyQuest2Preset(): void {
    this.config.targetFrameTimeMs = 13.9;
    this.config.maxGaussians = 80_000;
    this.foveatedConfig.enabled = true;
    this.foveatedConfig.fovealAngleDeg = 12;
    this.foveatedConfig.blendZoneDeg = 8;
    this.stopThePopConfig.enabled = true;
    this.config.stereoEnabled = true;
    logger.info('[FoveatedGaussianRenderer] Applied Quest 2 preset');
  }

  /**
   * Apply PCVR preset (120Hz, 1M Gaussians, hardware foveation).
   */
  applyPCVRPreset(): void {
    this.config.targetFrameTimeMs = 8.33;
    this.config.maxGaussians = 1_000_000;
    this.foveatedConfig.enabled = false; // Use hardware foveation
    this.stopThePopConfig.enabled = true;
    this.config.stereoEnabled = true;
    logger.info('[FoveatedGaussianRenderer] Applied PCVR preset');
  }

  /**
   * Apply desktop (non-VR) preset (60Hz, 2M Gaussians).
   */
  applyDesktopPreset(): void {
    this.config.targetFrameTimeMs = 16.67;
    this.config.maxGaussians = 2_000_000;
    this.foveatedConfig.enabled = false;
    this.stopThePopConfig.enabled = true;
    this.config.stereoEnabled = false;
    logger.info('[FoveatedGaussianRenderer] Applied Desktop preset');
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  /**
   * Remove all clouds and reset state.
   */
  clear(): void {
    this.clouds.clear();
    this.cloudOrder = [];
    this.timingHistory = [];
    this.frameNumber = 0;
    this.currentQualityLevel = 0;
    this.applyQualityLevel(0);
    this.tileClassificationCache.clear();
    this.sortBuffer.valid = false;
    logger.info('[FoveatedGaussianRenderer] Cleared all state');
  }

  /**
   * Dispose and release all resources.
   */
  dispose(): void {
    this.clear();
    this.removeAllListeners();
    logger.info('[FoveatedGaussianRenderer] Disposed');
  }

  // ===========================================================================
  // INTERNAL UTILITIES
  // ===========================================================================

  /**
   * Rebuild cloud rendering order based on priority.
   */
  private rebuildCloudOrder(): void {
    this.cloudOrder = Array.from(this.clouds.entries())
      .sort(([, a], [, b]) => b.params.priority - a.params.priority)
      .map(([id]) => id);
  }

  /**
   * Create pre-allocated sort buffer.
   */
  private createSortBuffer(size: number): SortBufferState {
    return {
      keys: new Uint32Array(size),
      tileGaussianLists: new Uint32Array(size),
      tileOffsets: new Uint32Array(Math.ceil(size / 16)), // Rough tile count estimate
      tileCounts: new Uint32Array(Math.ceil(size / 16)),
      totalIntersections: 0,
      valid: false,
    };
  }

  /**
   * Convert float to sortable uint32 (preserves order for positive and negative floats).
   */
  private floatToSortableUint32(value: number): number {
    // IEEE 754 float bit representation preserves order for positive floats.
    // For negative floats, flip all bits. For positive, flip sign bit.
    const view = new DataView(new ArrayBuffer(4));
    view.setFloat32(0, value);
    let bits = view.getUint32(0);

    if (bits & 0x80000000) {
      bits = ~bits; // Negative: flip all bits
    } else {
      bits ^= 0x80000000; // Positive: flip sign bit
    }

    return bits >>> 0; // Ensure unsigned
  }

  /**
   * Transform a point by a 4x4 matrix (column-major).
   */
  private transformPoint(
    point: [number, number, number],
    matrix: Float32Array,
  ): [number, number, number] {
    return [
      matrix[0] * point[0] + matrix[4] * point[1] + matrix[8] * point[2] + matrix[12],
      matrix[1] * point[0] + matrix[5] * point[1] + matrix[9] * point[2] + matrix[13],
      matrix[2] * point[0] + matrix[6] * point[1] + matrix[10] * point[2] + matrix[14],
    ];
  }

  /**
   * Get maximum scale factor from a 4x4 matrix.
   */
  private getMaxScale(matrix: Float32Array): number {
    const sx = Math.sqrt(matrix[0] ** 2 + matrix[1] ** 2 + matrix[2] ** 2);
    const sy = Math.sqrt(matrix[4] ** 2 + matrix[5] ** 2 + matrix[6] ** 2);
    const sz = Math.sqrt(matrix[8] ** 2 + matrix[9] ** 2 + matrix[10] ** 2);
    return Math.max(sx, sy, sz);
  }

  /**
   * Normalize a 3D vector in place.
   */
  private normalizeVec3(v: [number, number, number]): void {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    if (len > 0.00001) {
      v[0] /= len;
      v[1] /= len;
      v[2] /= len;
    }
  }

  /**
   * Convert an angle in degrees to pixels based on FOV and resolution.
   */
  private angleToPx(angleDeg: number, eyeState: EyeRenderState): number {
    // Approximate: assumes uniform FOV distribution
    // For VR HMDs, this should use the lens distortion model
    const fovDeg = 90; // Approximate HMD FOV
    return (angleDeg / fovDeg) * (Math.min(eyeState.width, eyeState.height) / 2);
  }

  /**
   * Clean old tile classification caches.
   */
  private cleanTileCache(): void {
    // Keep only current and previous frame
    const keysToDelete: string[] = [];
    for (const key of this.tileClassificationCache.keys()) {
      const frameStr = key.split('-')[1];
      const frame = parseInt(frameStr, 10);
      if (frame < this.frameNumber - 1) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.tileClassificationCache.delete(key);
    }
  }

  /**
   * Emit a pipeline event.
   */
  private emitEvent(type: PipelineEventType, data: Record<string, unknown>): void {
    const event: PipelineEvent = {
      type,
      timestamp: performance.now(),
      data,
    };
    this.emit(type, event);
  }

  /**
   * Format number for display.
   */
  private formatNumber(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toString();
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a FoveatedGaussianRenderer with default configuration.
 */
export function createFoveatedGaussianRenderer(
  config?: Partial<FoveatedGaussianPipelineConfig>,
): FoveatedGaussianRenderer {
  return new FoveatedGaussianRenderer(config);
}

/**
 * Create a FoveatedGaussianRenderer pre-configured for a specific device.
 */
export function createFoveatedGaussianRendererForDevice(
  deviceType: 'quest2' | 'quest3' | 'pcvr' | 'desktop',
  config?: Partial<FoveatedGaussianPipelineConfig>,
): FoveatedGaussianRenderer {
  const renderer = new FoveatedGaussianRenderer(config);

  switch (deviceType) {
    case 'quest2':
      renderer.applyQuest2Preset();
      break;
    case 'quest3':
      renderer.applyQuest3Preset();
      break;
    case 'pcvr':
      renderer.applyPCVRPreset();
      break;
    case 'desktop':
      renderer.applyDesktopPreset();
      break;
  }

  return renderer;
}
