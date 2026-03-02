/**
 * NeRFFeatureExtractor
 *
 * Extracts density and color features from a NeRF model to initialize
 * 3D Gaussian Splatting parameters. Based on NeRF-GS (ICCV 2025) which
 * showed NeRF is a valuable assistant for GS initialization.
 *
 * Algorithm:
 * 1. Uniform grid sampling within scene bounds
 * 2. Density thresholding to find occupied regions
 * 3. Importance-sampled refinement in high-gradient areas
 * 4. Density-to-opacity conversion via sigmoid
 * 5. Scale estimation from local density field curvature
 * 6. Orientation estimation from density gradients
 *
 * The extractor can work with:
 * - Server-side NeRF inference (via HTTP query API)
 * - Pre-baked density grids (loaded from file)
 * - Synthetic density functions (for testing)
 *
 * Research references:
 *   NeRF-GS (ICCV 2025) - NeRF feature alignment for GS initialization
 *   DN-Splatter (WACV 2025) - Depth/normal priors for GS
 *
 * @module volumetric-bridge/nerf-to-gs
 */

import type {
  NeRFFeatureExtractionConfig,
  NeRFFeatureExtractionResult,
  NeRFExtractionMetadata,
  NeRFSample,
} from './types';

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_EXTRACTION_CONFIG: NeRFFeatureExtractionConfig = {
  format: 'instant_ngp',
  checkpointUrl: '',
  sceneBounds: [-1, -1, -1, 1, 1, 1],
  densityThreshold: 0.5,
  gridResolution: 128,
  maxGaussians: 500_000,
  refinementPasses: 2,
  shDegree: 0,
  estimateNormals: true,
  covarianceScale: 1.0,
};

// =============================================================================
// NERF DENSITY QUERY INTERFACE
// =============================================================================

/**
 * Abstract interface for querying a NeRF model.
 * Implementations can be server-side inference, baked grids, or synthetic functions.
 */
export interface INeRFDensityQuery {
  /**
   * Query density and color at a batch of 3D positions.
   * @param positions - Float32Array of xyz positions (N * 3)
   * @param count - Number of positions
   * @returns Array of NeRFSample results
   */
  queryBatch(positions: Float32Array, count: number): Promise<NeRFSample[]>;

  /**
   * Query density gradient at a single position (finite differences).
   * @param x - World X
   * @param y - World Y
   * @param z - World Z
   * @param epsilon - Step size for finite differences
   * @returns Density gradient [dx, dy, dz]
   */
  queryGradient(
    x: number,
    y: number,
    z: number,
    epsilon?: number,
  ): Promise<[number, number, number]>;
}

// =============================================================================
// BAKED DENSITY GRID QUERY (for pre-computed NeRF volumes)
// =============================================================================

/**
 * NeRF density query implementation for pre-baked density grids.
 * Expects a uniform 3D grid of density values with optional color channels.
 */
export class BakedDensityGridQuery implements INeRFDensityQuery {
  private densityGrid: Float32Array;
  private colorGrid: Float32Array | null;
  private resolution: number;
  private bounds: [number, number, number, number, number, number];
  private invSizeX: number;
  private invSizeY: number;
  private invSizeZ: number;

  constructor(
    densityGrid: Float32Array,
    resolution: number,
    bounds: [number, number, number, number, number, number],
    colorGrid?: Float32Array,
  ) {
    this.densityGrid = densityGrid;
    this.colorGrid = colorGrid ?? null;
    this.resolution = resolution;
    this.bounds = bounds;

    const sizeX = bounds[3] - bounds[0];
    const sizeY = bounds[4] - bounds[1];
    const sizeZ = bounds[5] - bounds[2];
    this.invSizeX = sizeX > 0 ? 1.0 / sizeX : 0;
    this.invSizeY = sizeY > 0 ? 1.0 / sizeY : 0;
    this.invSizeZ = sizeZ > 0 ? 1.0 / sizeZ : 0;
  }

  /**
   * Trilinear sample from the density grid.
   */
  private sampleDensity(x: number, y: number, z: number): number {
    const res = this.resolution;
    const u = (x - this.bounds[0]) * this.invSizeX * (res - 1);
    const v = (y - this.bounds[1]) * this.invSizeY * (res - 1);
    const w = (z - this.bounds[2]) * this.invSizeZ * (res - 1);

    if (u < 0 || u >= res - 1 || v < 0 || v >= res - 1 || w < 0 || w >= res - 1) {
      return 0;
    }

    const u0 = Math.floor(u), v0 = Math.floor(v), w0 = Math.floor(w);
    const fu = u - u0, fv = v - v0, fw = w - w0;

    // Trilinear interpolation
    const idx = (ix: number, iy: number, iz: number) => ix + iy * res + iz * res * res;

    const c000 = this.densityGrid[idx(u0, v0, w0)] ?? 0;
    const c100 = this.densityGrid[idx(u0 + 1, v0, w0)] ?? 0;
    const c010 = this.densityGrid[idx(u0, v0 + 1, w0)] ?? 0;
    const c110 = this.densityGrid[idx(u0 + 1, v0 + 1, w0)] ?? 0;
    const c001 = this.densityGrid[idx(u0, v0, w0 + 1)] ?? 0;
    const c101 = this.densityGrid[idx(u0 + 1, v0, w0 + 1)] ?? 0;
    const c011 = this.densityGrid[idx(u0, v0 + 1, w0 + 1)] ?? 0;
    const c111 = this.densityGrid[idx(u0 + 1, v0 + 1, w0 + 1)] ?? 0;

    const c00 = c000 * (1 - fu) + c100 * fu;
    const c01 = c001 * (1 - fu) + c101 * fu;
    const c10 = c010 * (1 - fu) + c110 * fu;
    const c11 = c011 * (1 - fu) + c111 * fu;

    const c0 = c00 * (1 - fv) + c10 * fv;
    const c1 = c01 * (1 - fv) + c11 * fv;

    return c0 * (1 - fw) + c1 * fw;
  }

  /**
   * Sample color from the color grid (or default to gray).
   */
  private sampleColor(x: number, y: number, z: number): [number, number, number] {
    if (!this.colorGrid) return [0.8, 0.8, 0.8];

    const res = this.resolution;
    const u = Math.round((x - this.bounds[0]) * this.invSizeX * (res - 1));
    const v = Math.round((y - this.bounds[1]) * this.invSizeY * (res - 1));
    const w = Math.round((z - this.bounds[2]) * this.invSizeZ * (res - 1));

    if (u < 0 || u >= res || v < 0 || v >= res || w < 0 || w >= res) {
      return [0.8, 0.8, 0.8];
    }

    const idx = (u + v * res + w * res * res) * 3;
    return [
      this.colorGrid[idx] ?? 0.8,
      this.colorGrid[idx + 1] ?? 0.8,
      this.colorGrid[idx + 2] ?? 0.8,
    ];
  }

  async queryBatch(positions: Float32Array, count: number): Promise<NeRFSample[]> {
    const results: NeRFSample[] = [];
    for (let i = 0; i < count; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      const density = this.sampleDensity(x, y, z);
      const color = this.sampleColor(x, y, z);
      results.push({ position: [x, y, z], density, color });
    }
    return results;
  }

  async queryGradient(
    x: number,
    y: number,
    z: number,
    epsilon = 0.01,
  ): Promise<[number, number, number]> {
    const dx = this.sampleDensity(x + epsilon, y, z) - this.sampleDensity(x - epsilon, y, z);
    const dy = this.sampleDensity(x, y + epsilon, z) - this.sampleDensity(x, y - epsilon, z);
    const dz = this.sampleDensity(x, y, z + epsilon) - this.sampleDensity(x, y, z - epsilon);
    const inv2e = 1.0 / (2.0 * epsilon);
    return [dx * inv2e, dy * inv2e, dz * inv2e];
  }
}

// =============================================================================
// HTTP NERF QUERY (for server-side inference)
// =============================================================================

/**
 * NeRF density query via HTTP endpoint.
 * Sends batch position queries to a NeRF inference server.
 *
 * Expected server API:
 *   POST /query
 *   Body: { positions: number[][], batch_size: number }
 *   Response: { samples: { density: number, color: [r,g,b] }[] }
 */
export class HttpNeRFQuery implements INeRFDensityQuery {
  private endpoint: string;
  private batchSize: number;

  constructor(endpoint: string, batchSize = 4096) {
    this.endpoint = endpoint;
    this.batchSize = batchSize;
  }

  async queryBatch(positions: Float32Array, count: number): Promise<NeRFSample[]> {
    const results: NeRFSample[] = [];

    for (let offset = 0; offset < count; offset += this.batchSize) {
      const batchEnd = Math.min(offset + this.batchSize, count);
      const batchPositions: number[][] = [];

      for (let i = offset; i < batchEnd; i++) {
        batchPositions.push([
          positions[i * 3],
          positions[i * 3 + 1],
          positions[i * 3 + 2],
        ]);
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positions: batchPositions,
          batch_size: batchPositions.length,
        }),
      });

      if (!response.ok) {
        throw new Error(`NeRF query failed: ${response.statusText}`);
      }

      const data = await response.json();
      for (let i = 0; i < data.samples.length; i++) {
        const s = data.samples[i];
        const pos = batchPositions[i];
        results.push({
          position: [pos[0], pos[1], pos[2]],
          density: s.density,
          color: s.color,
        });
      }
    }

    return results;
  }

  async queryGradient(
    x: number,
    y: number,
    z: number,
    epsilon = 0.01,
  ): Promise<[number, number, number]> {
    // Query 6 neighboring points for central differences
    const positions = new Float32Array([
      x + epsilon, y, z,
      x - epsilon, y, z,
      x, y + epsilon, z,
      x, y - epsilon, z,
      x, y, z + epsilon,
      x, y, z - epsilon,
    ]);

    const samples = await this.queryBatch(positions, 6);
    return [
      (samples[0].density - samples[1].density) / (2 * epsilon),
      (samples[2].density - samples[3].density) / (2 * epsilon),
      (samples[4].density - samples[5].density) / (2 * epsilon),
    ];
  }
}

// =============================================================================
// NERF FEATURE EXTRACTOR
// =============================================================================

/**
 * Extracts features from a NeRF model to initialize Gaussian Splatting parameters.
 *
 * Usage:
 * ```typescript
 * const query = new BakedDensityGridQuery(densityGrid, 128, bounds, colorGrid);
 * const extractor = new NeRFFeatureExtractor(query);
 *
 * const result = await extractor.extract({
 *   format: 'instant_ngp',
 *   checkpointUrl: 'model.ingp',
 *   sceneBounds: [-2, -2, -2, 2, 2, 2],
 *   densityThreshold: 0.5,
 *   gridResolution: 128,
 *   maxGaussians: 500000,
 *   refinementPasses: 2,
 *   shDegree: 0,
 *   estimateNormals: true,
 *   covarianceScale: 1.0,
 * });
 *
 * // result.positions, result.colors, etc. ready for GaussianSplatLoader
 * ```
 */
export class NeRFFeatureExtractor {
  private query: INeRFDensityQuery;
  private onProgress?: (stage: string, progress: number) => void;

  constructor(
    query: INeRFDensityQuery,
    onProgress?: (stage: string, progress: number) => void,
  ) {
    this.query = query;
    this.onProgress = onProgress;
  }

  /**
   * Extract features from NeRF and produce Gaussian initialization data.
   */
  async extract(
    config?: Partial<NeRFFeatureExtractionConfig>,
  ): Promise<NeRFFeatureExtractionResult> {
    const cfg: NeRFFeatureExtractionConfig = { ...DEFAULT_EXTRACTION_CONFIG, ...config };
    const startTime = performance.now();

    // ── Step 1: Uniform grid sampling ──────────────────────────────────────
    this.onProgress?.('grid_sampling', 0);

    const gridPositions = this.generateGridPositions(cfg.sceneBounds, cfg.gridResolution);
    const totalSamples = gridPositions.length / 3;

    this.onProgress?.('grid_sampling', 0.3);

    // ── Step 2: Batch query NeRF ───────────────────────────────────────────
    this.onProgress?.('nerf_query', 0);

    const samples = await this.query.queryBatch(gridPositions, totalSamples);

    this.onProgress?.('nerf_query', 1);

    // ── Step 3: Density thresholding ───────────────────────────────────────
    this.onProgress?.('thresholding', 0);

    const aboveThreshold: NeRFSample[] = [];
    for (const sample of samples) {
      if (sample.density >= cfg.densityThreshold) {
        aboveThreshold.push(sample);
      }
    }

    this.onProgress?.('thresholding', 1);

    // ── Step 4: Importance-sampled refinement ──────────────────────────────
    this.onProgress?.('refinement', 0);

    let refinedSamples = aboveThreshold;
    for (let pass = 0; pass < cfg.refinementPasses; pass++) {
      refinedSamples = await this.refineSamples(
        refinedSamples,
        cfg,
        pass / cfg.refinementPasses,
      );
      this.onProgress?.('refinement', (pass + 1) / cfg.refinementPasses);
    }

    // ── Step 5: Downsample to maxGaussians ─────────────────────────────────
    if (refinedSamples.length > cfg.maxGaussians) {
      refinedSamples = this.downsampleByDensity(refinedSamples, cfg.maxGaussians);
    }

    const count = refinedSamples.length;

    // ── Step 6: Build output arrays ────────────────────────────────────────
    this.onProgress?.('building_arrays', 0);

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 4);
    const scales = new Float32Array(count * 3);
    const rotations = new Float32Array(count * 4);
    const opacities = new Float32Array(count);
    const densities = new Float32Array(count);
    const densityGradients = cfg.estimateNormals
      ? new Float32Array(count * 3)
      : undefined;

    for (let i = 0; i < count; i++) {
      const s = refinedSamples[i];

      // Position
      positions[i * 3] = s.position[0];
      positions[i * 3 + 1] = s.position[1];
      positions[i * 3 + 2] = s.position[2];

      // Color (RGBA)
      colors[i * 4] = Math.max(0, Math.min(1, s.color[0]));
      colors[i * 4 + 1] = Math.max(0, Math.min(1, s.color[1]));
      colors[i * 4 + 2] = Math.max(0, Math.min(1, s.color[2]));

      // Opacity from density via sigmoid
      const opacity = 1.0 / (1.0 + Math.exp(-s.density));
      opacities[i] = opacity;
      colors[i * 4 + 3] = opacity;

      // Density
      densities[i] = s.density;

      // Scale: inversely proportional to density (denser = smaller Gaussian)
      // Normalized relative to grid cell size
      const cellSize = this.computeCellSize(cfg.sceneBounds, cfg.gridResolution);
      const densityScale = Math.max(0.001, 1.0 / (1.0 + s.density * 0.5));
      const scale = cellSize * densityScale * cfg.covarianceScale;
      scales[i * 3] = scale;
      scales[i * 3 + 1] = scale;
      scales[i * 3 + 2] = scale;

      // Default identity rotation
      rotations[i * 4 + 3] = 1.0; // w component
    }

    this.onProgress?.('building_arrays', 0.5);

    // ── Step 7: Estimate orientations from density gradients ───────────────
    if (cfg.estimateNormals && densityGradients) {
      this.onProgress?.('normal_estimation', 0);

      for (let i = 0; i < count; i++) {
        const s = refinedSamples[i];
        const grad = s.densityGradient
          ?? await this.query.queryGradient(s.position[0], s.position[1], s.position[2]);

        densityGradients[i * 3] = grad[0];
        densityGradients[i * 3 + 1] = grad[1];
        densityGradients[i * 3 + 2] = grad[2];

        // Compute quaternion aligning z-axis to gradient direction
        const quat = this.gradientToQuaternion(grad);
        rotations[i * 4] = quat[0];
        rotations[i * 4 + 1] = quat[1];
        rotations[i * 4 + 2] = quat[2];
        rotations[i * 4 + 3] = quat[3];

        // Anisotropic scale: flatten along gradient (surface-aligned)
        const gradMag = Math.sqrt(grad[0] * grad[0] + grad[1] * grad[1] + grad[2] * grad[2]);
        if (gradMag > 0.001) {
          // Flatten along the normal direction (smaller scale along normal)
          scales[i * 3 + 2] *= 0.3; // Z-axis is aligned to gradient
        }

        if (i % 1000 === 0) {
          this.onProgress?.('normal_estimation', i / count);
        }
      }

      this.onProgress?.('normal_estimation', 1);
    }

    const extractionTimeMs = performance.now() - startTime;

    const metadata: NeRFExtractionMetadata = {
      totalSamples,
      aboveThreshold: aboveThreshold.length,
      finalCount: count,
      extractionTimeMs,
      sceneBounds: cfg.sceneBounds,
      gridResolution: cfg.gridResolution,
      densityThreshold: cfg.densityThreshold,
    };

    this.onProgress?.('complete', 1);

    return {
      positions,
      colors,
      scales,
      rotations,
      opacities,
      densities,
      densityGradients,
      count,
      metadata,
    };
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Generate uniform grid sample positions within the scene bounds.
   */
  private generateGridPositions(
    bounds: [number, number, number, number, number, number],
    resolution: number,
  ): Float32Array {
    const positions = new Float32Array(resolution * resolution * resolution * 3);
    const dx = (bounds[3] - bounds[0]) / (resolution - 1);
    const dy = (bounds[4] - bounds[1]) / (resolution - 1);
    const dz = (bounds[5] - bounds[2]) / (resolution - 1);

    let idx = 0;
    for (let iz = 0; iz < resolution; iz++) {
      for (let iy = 0; iy < resolution; iy++) {
        for (let ix = 0; ix < resolution; ix++) {
          positions[idx++] = bounds[0] + ix * dx;
          positions[idx++] = bounds[1] + iy * dy;
          positions[idx++] = bounds[2] + iz * dz;
        }
      }
    }

    return positions;
  }

  /**
   * Importance-sampled refinement: add more samples near high-gradient regions.
   */
  private async refineSamples(
    samples: NeRFSample[],
    config: NeRFFeatureExtractionConfig,
    _passProgress: number,
  ): Promise<NeRFSample[]> {
    const cellSize = this.computeCellSize(config.sceneBounds, config.gridResolution);
    const refinedPositions: Float32Array = new Float32Array(samples.length * 3 * 4);
    let refinedCount = 0;

    // For each high-density sample, generate sub-samples in its neighborhood
    for (const sample of samples) {
      // Only refine near high-density regions
      if (sample.density < config.densityThreshold * 2) continue;

      // Generate 4 jittered sub-samples around this position
      const halfCell = cellSize * 0.25;
      for (let j = 0; j < 4; j++) {
        const jx = (Math.random() - 0.5) * halfCell;
        const jy = (Math.random() - 0.5) * halfCell;
        const jz = (Math.random() - 0.5) * halfCell;
        refinedPositions[refinedCount * 3] = sample.position[0] + jx;
        refinedPositions[refinedCount * 3 + 1] = sample.position[1] + jy;
        refinedPositions[refinedCount * 3 + 2] = sample.position[2] + jz;
        refinedCount++;
      }
    }

    if (refinedCount === 0) return samples;

    // Query the refined positions
    const refinedSamples = await this.query.queryBatch(
      refinedPositions.slice(0, refinedCount * 3),
      refinedCount,
    );

    // Merge with original samples, keeping only above-threshold
    const merged = [...samples];
    for (const rs of refinedSamples) {
      if (rs.density >= config.densityThreshold) {
        merged.push(rs);
      }
    }

    return merged;
  }

  /**
   * Downsample by keeping highest-density points.
   */
  private downsampleByDensity(
    samples: NeRFSample[],
    maxCount: number,
  ): NeRFSample[] {
    // Sort by density descending, keep top maxCount
    return samples
      .sort((a, b) => b.density - a.density)
      .slice(0, maxCount);
  }

  /**
   * Compute the grid cell size from bounds and resolution.
   */
  private computeCellSize(
    bounds: [number, number, number, number, number, number],
    resolution: number,
  ): number {
    const sizeX = bounds[3] - bounds[0];
    const sizeY = bounds[4] - bounds[1];
    const sizeZ = bounds[5] - bounds[2];
    const maxSize = Math.max(sizeX, sizeY, sizeZ);
    return maxSize / resolution;
  }

  /**
   * Convert a density gradient vector to a quaternion that aligns the
   * local z-axis with the gradient direction.
   */
  private gradientToQuaternion(
    grad: [number, number, number],
  ): [number, number, number, number] {
    const gx = grad[0], gy = grad[1], gz = grad[2];
    const mag = Math.sqrt(gx * gx + gy * gy + gz * gz);

    if (mag < 0.0001) {
      // Zero gradient: return identity quaternion
      return [0, 0, 0, 1];
    }

    // Normalize gradient
    const nx = gx / mag, ny = gy / mag, nz = gz / mag;

    // Rotation from z-axis [0,0,1] to [nx,ny,nz]
    // Using the half-vector quaternion formula
    const dot = nz; // z dot grad_normalized = nz
    if (dot > 0.9999) {
      return [0, 0, 0, 1]; // Already aligned
    }
    if (dot < -0.9999) {
      return [1, 0, 0, 0]; // 180 degree rotation around x
    }

    // Cross product of [0,0,1] x [nx,ny,nz] = [-ny, nx, 0]
    const cx = -ny;
    const cy = nx;
    const cz = 0;

    const w = 1 + dot;
    const invLen = 1.0 / Math.sqrt(cx * cx + cy * cy + cz * cz + w * w);

    return [cx * invLen, cy * invLen, cz * invLen, w * invLen];
  }
}
