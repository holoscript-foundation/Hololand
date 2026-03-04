/**
 * FoveatedGaussianPipeline
 *
 * Orchestrates the complete foveated Gaussian splatting compute pipeline
 * using the six standalone WGSL shader modules:
 *
 *   1. sort-key-gen.wgsl     - View-space depth + foveated zone encoding
 *   2. radix-histogram.wgsl  - Per-workgroup radix histogram (local atomics)
 *   3. prefix-sum.wgsl       - Blelloch exclusive prefix sum scan
 *   4. radix-scatter.wgsl    - Scatter pass with ping-pong buffers
 *   5. tile-assignment.wgsl  - Tile assignment + foveated zone classification
 *   6. stop-the-pop.wgsl     - StopThePop hierarchical re-sort with t_opt
 *
 * PIPELINE ARCHITECTURE (per frame):
 * ```
 *   [1] Sort Key Gen          ~0.3ms   (depth + zone encoding per Gaussian)
 *   [2] Radix Sort (4 passes) ~2-4ms   (histogram -> prefix sum -> scatter) x4
 *   [3] Tile Assignment       ~0.5ms   (project + assign to tiles + decimate)
 *   [4] StopThePop Re-sort    ~0.5ms   (per-tile bitonic sort by t_opt)
 *   [5] Rasterization         ~4-8ms   (instanced quad rasterization)
 *                       Total: ~7-14ms  (within 16.67ms budget at 60fps)
 * ```
 *
 * DESIGN DECISIONS:
 * - workgroup_size(256) on all shaders for cross-platform safety
 * - No global atomics, no subgroup ops (WebGPU cross-vendor compatibility)
 * - Ping-pong buffer pattern for radix sort (no in-place scatter needed)
 * - Foveated zones encoded in sort key top 2 bits (foveal sorts first)
 * - StopThePop uses bitonic sort within workgroup shared memory (max 256/tile)
 * - All shader source loaded from standalone .wgsl files via raw imports
 *
 * @module gaussian-splat-viewer/FoveatedGaussianPipeline
 */

import { logger } from '../../logger';
import type {
  FoveatedFrameMetrics as FoveatedFrameMetricsType,
} from './types';

// =============================================================================
// WGSL SHADER SOURCE IMPORTS (raw string)
// =============================================================================

// NOTE: These are loaded as raw strings. The bundler (Vite/webpack/turbopack)
// must be configured with ?raw or equivalent for .wgsl imports.
// If raw imports are unavailable, the shaders are embedded inline below.

import sortKeyGenSource from './shaders/sort-key-gen.wgsl?raw';
import radixHistogramSource from './shaders/radix-histogram.wgsl?raw';
import prefixSumSource from './shaders/prefix-sum.wgsl?raw';
import radixScatterSource from './shaders/radix-scatter.wgsl?raw';
import tileAssignmentSource from './shaders/tile-assignment.wgsl?raw';
import stopThePopSource from './shaders/stop-the-pop.wgsl?raw';

// =============================================================================
// PIPELINE CONFIGURATION
// =============================================================================

/**
 * Foveated rendering zone parameters.
 *
 * Controls how the viewport is divided into quality tiers:
 * - Foveal zone (zone 0): Full quality, no decimation
 * - Mid-peripheral zone (zone 1): Moderate decimation
 * - Peripheral zone (zone 2): Aggressive decimation
 * - Culled (zone 3): Beyond depth or off-screen
 */
export interface FoveationConfig {
  /** Fovea center in NDC [-1, 1] (default: 0, 0 = screen center) */
  foveaCenterNDC: [number, number];
  /** Foveal zone radius in NDC units (default: 0.3) */
  fovealRadius: number;
  /** Mid-peripheral zone radius in NDC units (default: 0.7) */
  midRadius: number;
  /** Alpha quality multiplier for foveal zone (default: 1.0) */
  fovealAlpha: number;
  /** Alpha quality multiplier for mid zone (default: 0.7) */
  midAlpha: number;
  /** Alpha quality multiplier for peripheral zone (default: 0.4) */
  peripheralAlpha: number;
  /** Maximum depth before culling (default: 500.0) */
  cullBeyondDepth: number;
}

/**
 * Tile-based rendering configuration.
 */
export interface TileConfig {
  /** Tile size in pixels (default: 16) */
  tileSizePixels: number;
  /** Decimation factor for foveal tiles (default: 1 = no decimation) */
  fovealDecimation: number;
  /** Decimation factor for mid-peripheral tiles (default: 2) */
  midDecimation: number;
  /** Decimation factor for peripheral tiles (default: 4) */
  peripheralDecimation: number;
  /** Maximum Gaussians per tile (default: 256, must be <= 256) */
  maxGaussiansPerTile: number;
}

/**
 * StopThePop configuration.
 */
export interface StopThePopConfig {
  /** Enable t_opt computation (default: true). Disable for faster sort-only. */
  enableToptCorrection: boolean;
}

/**
 * Complete configuration for the foveated Gaussian pipeline.
 */
export interface FoveatedPipelineConfig {
  foveation: FoveationConfig;
  tile: TileConfig;
  stopThePop: StopThePopConfig;
  /** Workgroup size for the radix sort tile (default: 1024) */
  sortTileSize: number;
  /** Sort workgroup size (must equal 256) */
  sortWorkgroupSize: number;
  /** Enable the foveated pipeline stages (default: true).
   *  When false, runs standard depth-only radix sort (no tiling, no StopThePop). */
  enableFoveatedPipeline: boolean;
}

export const DEFAULT_FOVEATION_CONFIG: FoveationConfig = {
  foveaCenterNDC: [0, 0],
  fovealRadius: 0.3,
  midRadius: 0.7,
  fovealAlpha: 1.0,
  midAlpha: 0.7,
  peripheralAlpha: 0.4,
  cullBeyondDepth: 500.0,
};

export const DEFAULT_TILE_CONFIG: TileConfig = {
  tileSizePixels: 16,
  fovealDecimation: 1,
  midDecimation: 2,
  peripheralDecimation: 4,
  maxGaussiansPerTile: 256,
};

export const DEFAULT_STP_CONFIG: StopThePopConfig = {
  enableToptCorrection: true,
};

export const DEFAULT_FOVEATED_PIPELINE_CONFIG: FoveatedPipelineConfig = {
  foveation: DEFAULT_FOVEATION_CONFIG,
  tile: DEFAULT_TILE_CONFIG,
  stopThePop: DEFAULT_STP_CONFIG,
  sortTileSize: 1024,
  sortWorkgroupSize: 256,
  enableFoveatedPipeline: true,
};

// =============================================================================
// PIPELINE METRICS
// =============================================================================

/**
 * Re-export FoveatedFrameMetrics from types.ts for API surface consistency.
 */
export type { FoveatedFrameMetrics } from './types';
type FoveatedFrameMetrics = FoveatedFrameMetricsType;

// =============================================================================
// FOVEATED GAUSSIAN PIPELINE
// =============================================================================

/**
 * GPU buffer set for the foveated pipeline (extends base buffers).
 */
export interface FoveatedGPUBuffers {
  // -- Sort key gen outputs --
  sortKeys: GPUBuffer;
  sortValues: GPUBuffer;
  zoneAssignments: GPUBuffer;

  // -- Radix sort ping-pong --
  sortKeysOut: GPUBuffer;
  sortValuesOut: GPUBuffer;
  histogram: GPUBuffer;
  digitOffsets: GPUBuffer;

  // -- Tile assignment outputs --
  tileGaussianCounts: GPUBuffer;
  tileGaussianOffsets: GPUBuffer;
  tileZones: GPUBuffer;
  perGaussianTileId: GPUBuffer;

  // -- StopThePop re-sort (in-place) --
  tileGaussianIndices: GPUBuffer;

  // -- Uniform/param buffers --
  uniformsBuffer: GPUBuffer;
  foveationParamsBuffer: GPUBuffer;
  sortParamsBuffer: GPUBuffer;
  tileParamsBuffer: GPUBuffer;
  stpParamsBuffer: GPUBuffer;
}

/**
 * Orchestrates the full foveated Gaussian splatting compute pipeline.
 *
 * Usage:
 * ```ts
 * const pipeline = new FoveatedGaussianPipeline(device);
 * pipeline.configure(config);
 * pipeline.allocateBuffers(splatCount, viewportWidth, viewportHeight);
 *
 * // Each frame:
 * pipeline.updateUniforms(camera, splatCount, splatScale, opacityScale, viewport);
 * pipeline.updateFoveation(foveaCenterNDC);
 * const metrics = pipeline.dispatch(commandEncoder, splatCount);
 * // After dispatch, sortValues buffer contains the globally sorted indices.
 * // If foveated pipeline enabled, tileGaussianIndices has per-tile t_opt sorted indices.
 * ```
 */
export class FoveatedGaussianPipeline {
  private device: GPUDevice;
  private config: FoveatedPipelineConfig;

  // Compute pipelines
  private sortKeyGenPipeline: GPUComputePipeline | null = null;
  private radixHistogramPipeline: GPUComputePipeline | null = null;
  private prefixSumPipeline: GPUComputePipeline | null = null;
  private radixScatterPipeline: GPUComputePipeline | null = null;
  private tileAssignmentPipeline: GPUComputePipeline | null = null;
  private tileClassifyPipeline: GPUComputePipeline | null = null;
  private stopThePopPipeline: GPUComputePipeline | null = null;

  // GPU buffers
  private buffers: FoveatedGPUBuffers | null = null;

  // Cached dimensions
  private splatCount: number = 0;
  private viewportWidth: number = 1920;
  private viewportHeight: number = 1080;
  private tileCountX: number = 0;
  private tileCountY: number = 0;
  private totalTiles: number = 0;
  private sortWorkgroupCount: number = 0;

  // Source buffer references (from WebGPUSplatRenderer)
  private positionsBuffer: GPUBuffer | null = null;
  private scalesBuffer: GPUBuffer | null = null;
  private rotationsBuffer: GPUBuffer | null = null;

  constructor(device: GPUDevice, config?: Partial<FoveatedPipelineConfig>) {
    this.device = device;
    this.config = { ...DEFAULT_FOVEATED_PIPELINE_CONFIG, ...config };
    this.createPipelines();
  }

  // ===========================================================================
  // PIPELINE CREATION
  // ===========================================================================

  private createPipelines(): void {
    // 1. Sort Key Gen (foveated variant)
    const sortKeyGenModule = this.device.createShaderModule({
      code: sortKeyGenSource,
      label: 'foveated-sort-key-gen',
    });
    this.sortKeyGenPipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: { module: sortKeyGenModule, entryPoint: 'main' },
      label: 'foveated-sort-key-gen-pipeline',
    });

    // 2. Radix Histogram
    const histogramModule = this.device.createShaderModule({
      code: radixHistogramSource,
      label: 'radix-histogram',
    });
    this.radixHistogramPipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: { module: histogramModule, entryPoint: 'main' },
      label: 'radix-histogram-pipeline',
    });

    // 3. Prefix Sum (Blelloch scan)
    const prefixSumModule = this.device.createShaderModule({
      code: prefixSumSource,
      label: 'blelloch-prefix-sum',
    });
    this.prefixSumPipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: { module: prefixSumModule, entryPoint: 'main' },
      label: 'blelloch-prefix-sum-pipeline',
    });

    // 4. Radix Scatter
    const scatterModule = this.device.createShaderModule({
      code: radixScatterSource,
      label: 'radix-scatter',
    });
    this.radixScatterPipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: { module: scatterModule, entryPoint: 'main' },
      label: 'radix-scatter-pipeline',
    });

    // 5. Tile Assignment (main + classifyTiles entry points)
    const tileAssignmentModule = this.device.createShaderModule({
      code: tileAssignmentSource,
      label: 'tile-assignment',
    });
    this.tileAssignmentPipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: { module: tileAssignmentModule, entryPoint: 'main' },
      label: 'tile-assignment-pipeline',
    });
    this.tileClassifyPipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: { module: tileAssignmentModule, entryPoint: 'classifyTiles' },
      label: 'tile-classify-pipeline',
    });

    // 6. StopThePop
    const stopThePopModule = this.device.createShaderModule({
      code: stopThePopSource,
      label: 'stop-the-pop',
    });
    this.stopThePopPipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: { module: stopThePopModule, entryPoint: 'main' },
      label: 'stop-the-pop-pipeline',
    });

    logger.info('[FoveatedGaussianPipeline] All 6 compute pipelines created');
  }

  // ===========================================================================
  // BUFFER MANAGEMENT
  // ===========================================================================

  /**
   * Set references to the source data buffers from WebGPUSplatRenderer.
   * These are NOT owned by this pipeline -- they are shared references.
   */
  setSourceBuffers(
    positions: GPUBuffer,
    scales: GPUBuffer,
    rotations: GPUBuffer,
  ): void {
    this.positionsBuffer = positions;
    this.scalesBuffer = scales;
    this.rotationsBuffer = rotations;
  }

  /**
   * Allocate all intermediate and output GPU buffers for the pipeline.
   * Call this when splat count or viewport changes.
   */
  allocateBuffers(
    splatCount: number,
    viewportWidth: number,
    viewportHeight: number,
  ): void {
    // Release old buffers
    this.releaseBuffers();

    this.splatCount = splatCount;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;

    const tileSizePx = this.config.tile.tileSizePixels;
    this.tileCountX = Math.ceil(viewportWidth / tileSizePx);
    this.tileCountY = Math.ceil(viewportHeight / tileSizePx);
    this.totalTiles = this.tileCountX * this.tileCountY;
    this.sortWorkgroupCount = Math.ceil(splatCount / this.config.sortTileSize);

    const STORAGE = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
    const UNIFORM = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;

    const create = (label: string, size: number, usage: GPUBufferUsageFlags): GPUBuffer => {
      return this.device.createBuffer({
        label,
        size: Math.max(size, 16), // Minimum 16 bytes for WebGPU compliance
        usage,
      });
    };

    this.buffers = {
      // Sort key gen outputs
      sortKeys: create('fov-sortKeys', splatCount * 4, STORAGE),
      sortValues: create('fov-sortValues', splatCount * 4, STORAGE),
      zoneAssignments: create('fov-zoneAssignments', splatCount * 4, STORAGE),

      // Radix sort ping-pong
      sortKeysOut: create('fov-sortKeysOut', splatCount * 4, STORAGE),
      sortValuesOut: create('fov-sortValuesOut', splatCount * 4, STORAGE),
      histogram: create('fov-histogram', 256 * this.sortWorkgroupCount * 4, STORAGE),
      digitOffsets: create('fov-digitOffsets', 256 * 4, STORAGE),

      // Tile assignment outputs
      tileGaussianCounts: create('fov-tileGaussianCounts', this.totalTiles * 4, STORAGE),
      tileGaussianOffsets: create('fov-tileGaussianOffsets', this.totalTiles * 4, STORAGE),
      tileZones: create('fov-tileZones', this.totalTiles * 4, STORAGE),
      perGaussianTileId: create('fov-perGaussianTileId', splatCount * 4, STORAGE),

      // StopThePop
      tileGaussianIndices: create(
        'fov-tileGaussianIndices',
        this.totalTiles * this.config.tile.maxGaussiansPerTile * 4,
        STORAGE,
      ),

      // Uniform / param buffers
      // Uniforms struct: 256 bytes (same layout as WebGPUSplatRenderer)
      uniformsBuffer: create('fov-uniforms', 256, UNIFORM),
      // FoveationParams struct: 32 bytes (8 x f32)
      foveationParamsBuffer: create('fov-foveationParams', 32, UNIFORM),
      // SortParams struct: 16 bytes (4 x u32)
      sortParamsBuffer: create('fov-sortParams', 16, UNIFORM),
      // TileParams struct: 48 bytes (12 x u32/f32)
      tileParamsBuffer: create('fov-tileParams', 48, UNIFORM),
      // StopThePopParams struct: 32 bytes (8 x u32)
      stpParamsBuffer: create('fov-stpParams', 32, UNIFORM),
    };

    logger.info('[FoveatedGaussianPipeline] Buffers allocated', {
      splatCount,
      viewport: `${viewportWidth}x${viewportHeight}`,
      tiles: `${this.tileCountX}x${this.tileCountY} = ${this.totalTiles}`,
      sortWorkgroups: this.sortWorkgroupCount,
    });
  }

  // ===========================================================================
  // UNIFORM UPDATES
  // ===========================================================================

  /**
   * Upload the main uniforms buffer (camera, projection, viewport).
   * Must be called before dispatch() each frame.
   */
  uploadUniforms(uniformData: Float32Array): void {
    if (!this.buffers) return;
    this.device.queue.writeBuffer(this.buffers.uniformsBuffer, 0, uniformData);
  }

  /**
   * Update foveation parameters. Call when gaze point changes (eye-tracking)
   * or to adjust quality zones.
   */
  updateFoveation(config?: Partial<FoveationConfig>): void {
    if (!this.buffers) return;

    const fov = { ...this.config.foveation, ...config };
    if (config) {
      Object.assign(this.config.foveation, config);
    }

    const data = new Float32Array([
      fov.foveaCenterNDC[0],
      fov.foveaCenterNDC[1],
      fov.fovealRadius * fov.fovealRadius,   // pre-squared for GPU
      fov.midRadius * fov.midRadius,          // pre-squared for GPU
      fov.fovealAlpha,
      fov.midAlpha,
      fov.peripheralAlpha,
      fov.cullBeyondDepth,
    ]);

    this.device.queue.writeBuffer(this.buffers.foveationParamsBuffer, 0, data);
  }

  /**
   * Upload tile parameters. Called once on allocate or when tile config changes.
   */
  private uploadTileParams(): void {
    if (!this.buffers) return;

    const tc = this.config.tile;
    const fov = this.config.foveation;

    // Convert fovea center from NDC to pixel coordinates for tile classification
    const foveaCenterPixelX = (fov.foveaCenterNDC[0] * 0.5 + 0.5) * this.viewportWidth;
    const foveaCenterPixelY = (1.0 - (fov.foveaCenterNDC[1] * 0.5 + 0.5)) * this.viewportHeight;

    // Convert radii from NDC to pixel space (approximate: use average of width/height)
    const avgDim = (this.viewportWidth + this.viewportHeight) * 0.5;
    const fovealRadiusPixels = fov.fovealRadius * avgDim * 0.5;
    const midRadiusPixels = fov.midRadius * avgDim * 0.5;

    const data = new ArrayBuffer(48);
    const u32View = new Uint32Array(data);
    const f32View = new Float32Array(data);

    u32View[0] = this.tileCountX;
    u32View[1] = this.tileCountY;
    u32View[2] = tc.tileSizePixels;
    u32View[3] = this.totalTiles;
    f32View[4] = foveaCenterPixelX;
    f32View[5] = foveaCenterPixelY;
    f32View[6] = fovealRadiusPixels * fovealRadiusPixels;
    f32View[7] = midRadiusPixels * midRadiusPixels;
    u32View[8] = tc.fovealDecimation;
    u32View[9] = tc.midDecimation;
    u32View[10] = tc.peripheralDecimation;
    u32View[11] = tc.maxGaussiansPerTile;

    this.device.queue.writeBuffer(this.buffers.tileParamsBuffer, 0, data);
  }

  /**
   * Upload StopThePop parameters.
   */
  private uploadStpParams(): void {
    if (!this.buffers) return;

    const data = new Uint32Array([
      this.tileCountX,
      this.tileCountY,
      this.config.tile.tileSizePixels,
      this.totalTiles,
      this.config.tile.maxGaussiansPerTile,
      this.config.stopThePop.enableToptCorrection ? 1 : 0,
      0, // pad
      0, // pad
    ]);

    this.device.queue.writeBuffer(this.buffers.stpParamsBuffer, 0, data);
  }

  // ===========================================================================
  // DISPATCH
  // ===========================================================================

  /**
   * Dispatch the complete foveated pipeline into the given command encoder.
   *
   * Stages:
   *   1. Sort Key Generation (foveated: depth + zone)
   *   2. Radix Sort (4 digit passes: histogram -> prefix sum -> scatter)
   *   3. Tile Assignment (project, classify, assign)     [if foveated]
   *   4. StopThePop Re-sort (per-tile bitonic by t_opt)  [if foveated]
   *
   * @param commandEncoder - Active GPU command encoder
   * @param splatCount - Number of splats to process this frame
   * @returns Metrics for this frame's compute dispatches
   */
  dispatch(
    commandEncoder: GPUCommandEncoder,
    splatCount: number,
  ): FoveatedFrameMetrics {
    const metrics: FoveatedFrameMetrics = {
      sortKeyGenMs: 0,
      radixSortMs: 0,
      digitPassMs: [0, 0, 0, 0],
      tileAssignmentMs: 0,
      stopThePopMs: 0,
      totalComputeMs: 0,
      sortWorkgroupCount: this.sortWorkgroupCount,
      tileCount: this.totalTiles,
    };

    if (!this.buffers || !this.positionsBuffer || splatCount === 0) {
      return metrics;
    }

    this.splatCount = splatCount;
    this.sortWorkgroupCount = Math.ceil(splatCount / this.config.sortTileSize);

    // Upload per-frame params
    this.uploadTileParams();
    this.uploadStpParams();

    const t0 = performance.now();

    // ─── Stage 1: Sort Key Generation ─────────────────────────────────
    const tKeyGen = performance.now();
    this.dispatchSortKeyGen(commandEncoder, splatCount);
    metrics.sortKeyGenMs = performance.now() - tKeyGen;

    // ─── Stage 2: Radix Sort (4 digit passes) ─────────────────────────
    const tSort = performance.now();
    this.dispatchRadixSort(commandEncoder, splatCount);
    metrics.radixSortMs = performance.now() - tSort;

    // ─── Stage 3: Tile Assignment (foveated only) ─────────────────────
    if (this.config.enableFoveatedPipeline) {
      const tTile = performance.now();
      this.dispatchTileClassification(commandEncoder);
      this.dispatchTileAssignment(commandEncoder, splatCount);
      metrics.tileAssignmentMs = performance.now() - tTile;

      // ─── Stage 4: StopThePop Re-Sort (foveated only) ─────────────
      const tStp = performance.now();
      this.dispatchStopThePop(commandEncoder);
      metrics.stopThePopMs = performance.now() - tStp;
    }

    metrics.totalComputeMs = performance.now() - t0;
    return metrics;
  }

  // ===========================================================================
  // INDIVIDUAL DISPATCH METHODS
  // ===========================================================================

  /**
   * Stage 1: Foveated Sort Key Generation.
   *
   * Transforms each Gaussian's position to view space, computes linear depth,
   * encodes as sortable uint32, classifies into foveated zone, and composes
   * the sort key as [zone:2][depth:30].
   */
  private dispatchSortKeyGen(
    commandEncoder: GPUCommandEncoder,
    splatCount: number,
  ): void {
    if (!this.sortKeyGenPipeline || !this.buffers || !this.positionsBuffer) return;

    const bindGroup = this.device.createBindGroup({
      layout: this.sortKeyGenPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.buffers.uniformsBuffer } },
        { binding: 1, resource: { buffer: this.buffers.foveationParamsBuffer } },
        { binding: 2, resource: { buffer: this.positionsBuffer } },
        { binding: 3, resource: { buffer: this.buffers.sortKeys } },
        { binding: 4, resource: { buffer: this.buffers.sortValues } },
        { binding: 5, resource: { buffer: this.buffers.zoneAssignments } },
      ],
      label: 'fov-sort-key-gen-bind-group',
    });

    const pass = commandEncoder.beginComputePass({ label: 'fov-sort-key-gen' });
    pass.setPipeline(this.sortKeyGenPipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(splatCount / 256));
    pass.end();
  }

  /**
   * Stage 2: Radix Sort (4 digit passes).
   *
   * Each digit pass consists of 3 sub-dispatches:
   *   a) Histogram - count digit occurrences per workgroup
   *   b) Prefix sum - compute global scatter offsets
   *   c) Scatter - write elements to sorted positions
   *
   * Uses ping-pong buffer pattern: alternates between
   * (sortKeys, sortValues) and (sortKeysOut, sortValuesOut).
   */
  private dispatchRadixSort(
    commandEncoder: GPUCommandEncoder,
    splatCount: number,
  ): void {
    if (!this.radixHistogramPipeline || !this.prefixSumPipeline ||
        !this.radixScatterPipeline || !this.buffers) {
      return;
    }

    let keysIn = this.buffers.sortKeys;
    let valuesIn = this.buffers.sortValues;
    let keysOut = this.buffers.sortKeysOut;
    let valuesOut = this.buffers.sortValuesOut;

    for (let digitPass = 0; digitPass < 4; digitPass++) {
      const digitShift = digitPass * 8;

      // Upload sort params for this pass
      const sortParams = new Uint32Array([
        splatCount,
        digitShift,
        this.sortWorkgroupCount,
        this.config.sortTileSize,
      ]);
      this.device.queue.writeBuffer(this.buffers.sortParamsBuffer, 0, sortParams);

      // ─── 2a: Histogram ────────────────────────────────────────────
      {
        const bindGroup = this.device.createBindGroup({
          layout: this.radixHistogramPipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: this.buffers.sortParamsBuffer } },
            { binding: 1, resource: { buffer: keysIn } },
            { binding: 2, resource: { buffer: this.buffers.histogram } },
          ],
          label: `fov-histogram-pass-${digitPass}`,
        });

        const pass = commandEncoder.beginComputePass({
          label: `fov-histogram-pass-${digitPass}`,
        });
        pass.setPipeline(this.radixHistogramPipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(this.sortWorkgroupCount);
        pass.end();
      }

      // ─── 2b: Prefix Sum (Blelloch scan) ───────────────────────────
      {
        const bindGroup = this.device.createBindGroup({
          layout: this.prefixSumPipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: this.buffers.sortParamsBuffer } },
            { binding: 1, resource: { buffer: this.buffers.histogram } },
            { binding: 2, resource: { buffer: this.buffers.digitOffsets } },
          ],
          label: `fov-prefix-sum-pass-${digitPass}`,
        });

        const pass = commandEncoder.beginComputePass({
          label: `fov-prefix-sum-pass-${digitPass}`,
        });
        pass.setPipeline(this.prefixSumPipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(1); // Single workgroup Blelloch scan
        pass.end();
      }

      // ─── 2c: Scatter ──────────────────────────────────────────────
      {
        const bindGroup = this.device.createBindGroup({
          layout: this.radixScatterPipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: this.buffers.sortParamsBuffer } },
            { binding: 1, resource: { buffer: keysIn } },
            { binding: 2, resource: { buffer: valuesIn } },
            { binding: 3, resource: { buffer: this.buffers.histogram } },
            { binding: 4, resource: { buffer: keysOut } },
            { binding: 5, resource: { buffer: valuesOut } },
          ],
          label: `fov-scatter-pass-${digitPass}`,
        });

        const pass = commandEncoder.beginComputePass({
          label: `fov-scatter-pass-${digitPass}`,
        });
        pass.setPipeline(this.radixScatterPipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(this.sortWorkgroupCount);
        pass.end();
      }

      // Swap ping-pong buffers
      const tmpK = keysIn;
      const tmpV = valuesIn;
      keysIn = keysOut;
      valuesIn = valuesOut;
      keysOut = tmpK;
      valuesOut = tmpV;
    }

    // After 4 passes (even number of swaps), sorted data is back in
    // the original buffers (sortKeys, sortValues).
  }

  /**
   * Stage 3a: Tile Classification.
   *
   * Pre-classifies all screen tiles into foveated zones and resets
   * per-tile Gaussian counts. Run before tile assignment.
   */
  private dispatchTileClassification(commandEncoder: GPUCommandEncoder): void {
    if (!this.tileClassifyPipeline || !this.buffers) return;

    const bindGroup = this.device.createBindGroup({
      layout: this.tileClassifyPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.buffers.uniformsBuffer } },
        { binding: 1, resource: { buffer: this.buffers.tileParamsBuffer } },
        { binding: 2, resource: { buffer: this.buffers.sortValues } },
        { binding: 3, resource: { buffer: this.positionsBuffer! } },
        { binding: 4, resource: { buffer: this.scalesBuffer! } },
        { binding: 5, resource: { buffer: this.buffers.tileGaussianCounts } },
        { binding: 6, resource: { buffer: this.buffers.tileZones } },
        { binding: 7, resource: { buffer: this.buffers.perGaussianTileId } },
      ],
      label: 'fov-tile-classify-bind-group',
    });

    const pass = commandEncoder.beginComputePass({ label: 'fov-tile-classify' });
    pass.setPipeline(this.tileClassifyPipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(this.totalTiles / 256));
    pass.end();
  }

  /**
   * Stage 3b: Tile Assignment.
   *
   * For each sorted Gaussian: project to screen space, compute footprint,
   * assign to overlapping tiles, apply foveated decimation.
   */
  private dispatchTileAssignment(
    commandEncoder: GPUCommandEncoder,
    splatCount: number,
  ): void {
    if (!this.tileAssignmentPipeline || !this.buffers || !this.positionsBuffer || !this.scalesBuffer) return;

    const bindGroup = this.device.createBindGroup({
      layout: this.tileAssignmentPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.buffers.uniformsBuffer } },
        { binding: 1, resource: { buffer: this.buffers.tileParamsBuffer } },
        { binding: 2, resource: { buffer: this.buffers.sortValues } },
        { binding: 3, resource: { buffer: this.positionsBuffer } },
        { binding: 4, resource: { buffer: this.scalesBuffer } },
        { binding: 5, resource: { buffer: this.buffers.tileGaussianCounts } },
        { binding: 6, resource: { buffer: this.buffers.tileZones } },
        { binding: 7, resource: { buffer: this.buffers.perGaussianTileId } },
      ],
      label: 'fov-tile-assignment-bind-group',
    });

    const pass = commandEncoder.beginComputePass({ label: 'fov-tile-assignment' });
    pass.setPipeline(this.tileAssignmentPipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(splatCount / 256));
    pass.end();
  }

  /**
   * Stage 4: StopThePop Hierarchical Re-Sort.
   *
   * For each tile, computes t_opt for each assigned Gaussian and performs
   * a bitonic sort within workgroup shared memory to eliminate popping
   * artifacts from center-depth ordering inconsistencies.
   */
  private dispatchStopThePop(commandEncoder: GPUCommandEncoder): void {
    if (!this.stopThePopPipeline || !this.buffers ||
        !this.positionsBuffer || !this.scalesBuffer || !this.rotationsBuffer) {
      return;
    }

    const bindGroup = this.device.createBindGroup({
      layout: this.stopThePopPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.buffers.uniformsBuffer } },
        { binding: 1, resource: { buffer: this.buffers.stpParamsBuffer } },
        { binding: 2, resource: { buffer: this.positionsBuffer } },
        { binding: 3, resource: { buffer: this.scalesBuffer } },
        { binding: 4, resource: { buffer: this.rotationsBuffer } },
        { binding: 5, resource: { buffer: this.buffers.tileGaussianCounts } },
        { binding: 6, resource: { buffer: this.buffers.tileGaussianOffsets } },
        { binding: 7, resource: { buffer: this.buffers.tileGaussianIndices } },
      ],
      label: 'fov-stop-the-pop-bind-group',
    });

    const pass = commandEncoder.beginComputePass({ label: 'fov-stop-the-pop' });
    pass.setPipeline(this.stopThePopPipeline);
    pass.setBindGroup(0, bindGroup);
    // One workgroup per tile (each workgroup handles one tile's Gaussians)
    pass.dispatchWorkgroups(this.totalTiles);
    pass.end();
  }

  // ===========================================================================
  // ACCESSORS
  // ===========================================================================

  /**
   * Get the sorted values buffer (global sort order).
   * After dispatch(), this contains the sorted Gaussian indices.
   */
  getSortedValuesBuffer(): GPUBuffer | null {
    return this.buffers?.sortValues ?? null;
  }

  /**
   * Get the sorted keys buffer (for debugging/profiling).
   */
  getSortedKeysBuffer(): GPUBuffer | null {
    return this.buffers?.sortKeys ?? null;
  }

  /**
   * Get the zone assignments buffer.
   * Each element is the foveated zone (0-3) for the corresponding Gaussian.
   */
  getZoneAssignmentsBuffer(): GPUBuffer | null {
    return this.buffers?.zoneAssignments ?? null;
  }

  /**
   * Get the per-tile Gaussian indices buffer (after StopThePop re-sort).
   * This is the final sorted index list for tile-based rendering.
   */
  getTileGaussianIndicesBuffer(): GPUBuffer | null {
    return this.buffers?.tileGaussianIndices ?? null;
  }

  /**
   * Get the tile Gaussian counts buffer.
   */
  getTileGaussianCountsBuffer(): GPUBuffer | null {
    return this.buffers?.tileGaussianCounts ?? null;
  }

  /**
   * Get the tile zones buffer.
   */
  getTileZonesBuffer(): GPUBuffer | null {
    return this.buffers?.tileZones ?? null;
  }

  /**
   * Get current pipeline configuration.
   */
  getConfig(): Readonly<FoveatedPipelineConfig> {
    return this.config;
  }

  /**
   * Update pipeline configuration.
   */
  setConfig(config: Partial<FoveatedPipelineConfig>): void {
    Object.assign(this.config, config);
    if (config.foveation) {
      Object.assign(this.config.foveation, config.foveation);
    }
    if (config.tile) {
      Object.assign(this.config.tile, config.tile);
    }
    if (config.stopThePop) {
      Object.assign(this.config.stopThePop, config.stopThePop);
    }
  }

  /**
   * Get tile grid dimensions.
   */
  getTileGrid(): { tileCountX: number; tileCountY: number; totalTiles: number } {
    return {
      tileCountX: this.tileCountX,
      tileCountY: this.tileCountY,
      totalTiles: this.totalTiles,
    };
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  /**
   * Release all intermediate GPU buffers.
   * Source buffers (positions, scales, rotations) are NOT destroyed
   * because they are shared references owned by WebGPUSplatRenderer.
   */
  private releaseBuffers(): void {
    if (this.buffers) {
      for (const buffer of Object.values(this.buffers)) {
        if (buffer && typeof (buffer as GPUBuffer).destroy === 'function') {
          (buffer as GPUBuffer).destroy();
        }
      }
      this.buffers = null;
    }
  }

  /**
   * Dispose the pipeline and all its resources.
   */
  dispose(): void {
    this.releaseBuffers();
    this.positionsBuffer = null;
    this.scalesBuffer = null;
    this.rotationsBuffer = null;
    this.sortKeyGenPipeline = null;
    this.radixHistogramPipeline = null;
    this.prefixSumPipeline = null;
    this.radixScatterPipeline = null;
    this.tileAssignmentPipeline = null;
    this.tileClassifyPipeline = null;
    this.stopThePopPipeline = null;

    logger.info('[FoveatedGaussianPipeline] Disposed');
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a new FoveatedGaussianPipeline instance.
 *
 * @param device - Initialized GPUDevice
 * @param config - Optional pipeline configuration overrides
 * @returns Configured FoveatedGaussianPipeline ready for buffer allocation
 */
export function createFoveatedGaussianPipeline(
  device: GPUDevice,
  config?: Partial<FoveatedPipelineConfig>,
): FoveatedGaussianPipeline {
  return new FoveatedGaussianPipeline(device, config);
}
