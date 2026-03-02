/**
 * HybridNeRFGSRepresentation
 *
 * Implements a V2NeRF-style hybrid representation that adaptively combines
 * volumetric NeRF rendering (for difficult regions like semi-transparent surfaces,
 * thin structures, and specular reflections) with Gaussian Splatting (for the
 * majority of well-reconstructed surfaces).
 *
 * Based on:
 *   - HybridNeRF (CVPR 2024): Adaptive volumetric surfaces
 *   - NeRF-GS (ICCV 2025): Joint NeRF + GS optimization
 *
 * Architecture:
 * 1. Subdivide scene into an octree of regions
 * 2. Analyze each region's surface confidence (how well GS can represent it)
 * 3. Analyze each region's volumetric complexity (transparency, thin structures)
 * 4. Assign rendering mode: pure-GS, pure-NeRF, or blended
 * 5. Budget-constrain volumetric regions to maxVolumetricFraction
 * 6. Emit region metadata for the renderer to dispatch draw calls
 *
 * @module volumetric-bridge/nerf-to-gs
 */

import type {
  HybridRepresentationConfig,
  HybridRepresentationResult,
  HybridRegion,
  HybridAnalysisStats,
  RegionRenderMode,
  VolumetricTrigger,
  NeRFFeatureExtractionResult,
} from './types';

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_HYBRID_CONFIG: HybridRepresentationConfig = {
  octreeDepth: 5,
  surfaceConfidenceThreshold: 0.7,
  volumetricComplexityThreshold: 0.5,
  maxVolumetricFraction: 0.15,
  volumetricMarchSteps: 64,
  blendTransitionWidth: 0.1,
  useDensityForConfidence: true,
  volumetricTriggers: [
    'semi_transparent',
    'thin_structure',
    'specular_reflection',
  ],
};

// =============================================================================
// OCTREE NODE (for spatial subdivision)
// =============================================================================

interface OctreeNode {
  /** Bounding box [minX, minY, minZ, maxX, maxY, maxZ] */
  bounds: [number, number, number, number, number, number];
  /** Octree depth level */
  depth: number;
  /** Children (8 if subdivided, empty if leaf) */
  children: OctreeNode[];
  /** Indices of Gaussians within this node */
  gaussianIndices: number[];
  /** Is this a leaf node? */
  isLeaf: boolean;
}

// =============================================================================
// HYBRID NERF-GS REPRESENTATION
// =============================================================================

/**
 * Analyzes a Gaussian splat scene to determine which regions should use
 * volumetric (NeRF) rendering versus surface (GS) rendering.
 *
 * Usage:
 * ```typescript
 * const hybrid = new HybridNeRFGSRepresentation();
 *
 * const result = hybrid.analyze(extractedFeatures, {
 *   octreeDepth: 5,
 *   surfaceConfidenceThreshold: 0.7,
 *   maxVolumetricFraction: 0.15,
 * });
 *
 * // result.gsRegions - render with Gaussian splatting
 * // result.nerfRegions - render with ray-marched NeRF
 * // result.blendRegions - blend both representations
 * ```
 */
export class HybridNeRFGSRepresentation {
  private onProgress?: (stage: string, progress: number) => void;

  constructor(onProgress?: (stage: string, progress: number) => void) {
    this.onProgress = onProgress;
  }

  /**
   * Analyze the scene and classify regions for hybrid rendering.
   */
  analyze(
    features: NeRFFeatureExtractionResult,
    config?: Partial<HybridRepresentationConfig>,
  ): HybridRepresentationResult {
    const cfg: HybridRepresentationConfig = { ...DEFAULT_HYBRID_CONFIG, ...config };
    const startTime = performance.now();

    // ── Step 1: Build octree from Gaussian positions ──────────────────────
    this.onProgress?.('octree_build', 0);

    const sceneBounds = this.computeSceneBounds(features.positions, features.count);
    const octree = this.buildOctree(
      sceneBounds,
      features.positions,
      features.count,
      cfg.octreeDepth,
    );

    this.onProgress?.('octree_build', 1);

    // ── Step 2: Collect leaf nodes ────────────────────────────────────────
    const leafNodes: OctreeNode[] = [];
    this.collectLeaves(octree, leafNodes);

    // ── Step 3: Analyze each leaf region ──────────────────────────────────
    this.onProgress?.('region_analysis', 0);

    const regions: HybridRegion[] = [];
    for (let i = 0; i < leafNodes.length; i++) {
      const node = leafNodes[i];
      if (node.gaussianIndices.length === 0) continue;

      const region = this.analyzeRegion(node, features, cfg);
      regions.push(region);

      if (i % 100 === 0) {
        this.onProgress?.('region_analysis', i / leafNodes.length);
      }
    }

    this.onProgress?.('region_analysis', 1);

    // ── Step 4: Budget-constrain volumetric regions ───────────────────────
    this.onProgress?.('budget_constraint', 0);

    this.applyVolumetricBudget(regions, cfg);

    this.onProgress?.('budget_constraint', 1);

    // ── Step 5: Build result ──────────────────────────────────────────────
    const gsRegions = regions.filter(r => r.renderMode === 'gaussian_splat');
    const nerfRegions = regions.filter(r => r.renderMode === 'volumetric_nerf');
    const blendRegions = regions.filter(r => r.renderMode === 'hybrid_blend');

    // Compute volumetric fraction by volume
    let totalVolume = 0;
    let volumetricVolume = 0;
    for (const r of regions) {
      const vol = this.regionVolume(r.bounds);
      totalVolume += vol;
      if (r.renderMode === 'volumetric_nerf' || r.renderMode === 'hybrid_blend') {
        volumetricVolume += vol * r.nerfBlendWeight;
      }
    }

    const volumetricFraction = totalVolume > 0 ? volumetricVolume / totalVolume : 0;

    // Estimate cost: volumetric regions are ~10x more expensive per pixel
    const gsPixelCost = 1.0;
    const nerfPixelCost = 10.0;
    const totalPixelCost = (1 - volumetricFraction) * gsPixelCost + volumetricFraction * nerfPixelCost;
    const estimatedCostMultiplier = totalPixelCost / gsPixelCost;

    let totalGaussiansInGS = 0;
    for (const r of gsRegions) {
      totalGaussiansInGS += r.gaussianCount;
    }
    for (const r of blendRegions) {
      totalGaussiansInGS += r.gaussianCount;
    }

    // Estimate volumetric voxel count (for NeRF rendering cost estimation)
    let volumetricVoxelCount = 0;
    for (const r of nerfRegions) {
      const vol = this.regionVolume(r.bounds);
      volumetricVoxelCount += Math.ceil(vol * cfg.volumetricMarchSteps * cfg.volumetricMarchSteps);
    }
    for (const r of blendRegions) {
      const vol = this.regionVolume(r.bounds);
      volumetricVoxelCount += Math.ceil(vol * cfg.volumetricMarchSteps * r.nerfBlendWeight);
    }

    const stats: HybridAnalysisStats = {
      totalRegions: regions.length,
      gsRegionCount: gsRegions.length,
      nerfRegionCount: nerfRegions.length,
      blendRegionCount: blendRegions.length,
      totalGaussiansInGS,
      volumetricVoxelCount,
      analysisTimeMs: performance.now() - startTime,
    };

    return {
      regions,
      gsRegions,
      nerfRegions,
      blendRegions,
      volumetricFraction,
      estimatedCostMultiplier,
      stats,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * Compute scene bounding box from Gaussian positions.
   */
  private computeSceneBounds(
    positions: Float32Array,
    count: number,
  ): [number, number, number, number, number, number] {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < count; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }

    // Add small padding
    const pad = Math.max(maxX - minX, maxY - minY, maxZ - minZ) * 0.01;
    return [minX - pad, minY - pad, minZ - pad, maxX + pad, maxY + pad, maxZ + pad];
  }

  /**
   * Build octree by recursively subdividing the scene.
   */
  private buildOctree(
    bounds: [number, number, number, number, number, number],
    positions: Float32Array,
    count: number,
    maxDepth: number,
  ): OctreeNode {
    // Build indices list
    const allIndices: number[] = [];
    for (let i = 0; i < count; i++) {
      allIndices.push(i);
    }
    return this.buildOctreeNode(bounds, positions, allIndices, 0, maxDepth);
  }

  private buildOctreeNode(
    bounds: [number, number, number, number, number, number],
    positions: Float32Array,
    indices: number[],
    depth: number,
    maxDepth: number,
  ): OctreeNode {
    const node: OctreeNode = {
      bounds,
      depth,
      children: [],
      gaussianIndices: indices,
      isLeaf: true,
    };

    // Stop subdividing if max depth reached or too few points
    if (depth >= maxDepth || indices.length < 8) {
      return node;
    }

    // Compute center
    const cx = (bounds[0] + bounds[3]) / 2;
    const cy = (bounds[1] + bounds[4]) / 2;
    const cz = (bounds[2] + bounds[5]) / 2;

    // Create 8 child bounds
    const childBounds: [number, number, number, number, number, number][] = [
      [bounds[0], bounds[1], bounds[2], cx, cy, cz],          // 000
      [cx, bounds[1], bounds[2], bounds[3], cy, cz],          // 100
      [bounds[0], cy, bounds[2], cx, bounds[4], cz],          // 010
      [cx, cy, bounds[2], bounds[3], bounds[4], cz],          // 110
      [bounds[0], bounds[1], cz, cx, cy, bounds[5]],          // 001
      [cx, bounds[1], cz, bounds[3], cy, bounds[5]],          // 101
      [bounds[0], cy, cz, cx, bounds[4], bounds[5]],          // 011
      [cx, cy, cz, bounds[3], bounds[4], bounds[5]],          // 111
    ];

    // Distribute indices to children
    const childIndices: number[][] = [[], [], [], [], [], [], [], []];

    for (const idx of indices) {
      const px = positions[idx * 3];
      const py = positions[idx * 3 + 1];
      const pz = positions[idx * 3 + 2];

      const childIdx =
        (px >= cx ? 1 : 0) |
        (py >= cy ? 2 : 0) |
        (pz >= cz ? 4 : 0);

      childIndices[childIdx].push(idx);
    }

    // Recursively build non-empty children
    node.isLeaf = false;
    node.gaussianIndices = []; // Non-leaf nodes don't store indices

    for (let c = 0; c < 8; c++) {
      if (childIndices[c].length > 0) {
        node.children.push(
          this.buildOctreeNode(childBounds[c], positions, childIndices[c], depth + 1, maxDepth),
        );
      }
    }

    return node;
  }

  /**
   * Collect all leaf nodes from the octree.
   */
  private collectLeaves(node: OctreeNode, leaves: OctreeNode[]): void {
    if (node.isLeaf) {
      leaves.push(node);
    } else {
      for (const child of node.children) {
        this.collectLeaves(child, leaves);
      }
    }
  }

  /**
   * Analyze a single octree region to determine its rendering mode.
   */
  private analyzeRegion(
    node: OctreeNode,
    features: NeRFFeatureExtractionResult,
    config: HybridRepresentationConfig,
  ): HybridRegion {
    const indices = node.gaussianIndices;
    const count = indices.length;

    // ── Compute surface confidence ────────────────────────────────────────
    // High surface confidence = GS handles it well
    // Based on: density gradient consistency, opacity uniformity, scale uniformity

    let surfaceConfidence = 1.0;

    if (config.useDensityForConfidence && features.densityGradients) {
      // Check density gradient consistency (aligned gradients = good surface)
      let gradientCoherenceSum = 0;
      let gradientMagSum = 0;

      // Average gradient direction in this region
      let avgGx = 0, avgGy = 0, avgGz = 0;
      for (const idx of indices) {
        avgGx += features.densityGradients[idx * 3];
        avgGy += features.densityGradients[idx * 3 + 1];
        avgGz += features.densityGradients[idx * 3 + 2];
      }
      const invCount = 1.0 / count;
      avgGx *= invCount; avgGy *= invCount; avgGz *= invCount;
      const avgMag = Math.sqrt(avgGx * avgGx + avgGy * avgGy + avgGz * avgGz);

      if (avgMag > 0.001) {
        const invAvgMag = 1.0 / avgMag;
        avgGx *= invAvgMag; avgGy *= invAvgMag; avgGz *= invAvgMag;

        for (const idx of indices) {
          const gx = features.densityGradients[idx * 3];
          const gy = features.densityGradients[idx * 3 + 1];
          const gz = features.densityGradients[idx * 3 + 2];
          const mag = Math.sqrt(gx * gx + gy * gy + gz * gz);
          if (mag > 0.001) {
            // Dot product with average gradient = coherence
            const dot = (gx * avgGx + gy * avgGy + gz * avgGz) / mag;
            gradientCoherenceSum += Math.abs(dot);
          }
          gradientMagSum += mag;
        }

        // Higher coherence = better surface = higher confidence
        const avgCoherence = gradientCoherenceSum / count;
        surfaceConfidence *= avgCoherence;
      }
    }

    // Opacity variance reduces surface confidence (semi-transparent regions)
    let opacityMean = 0;
    for (const idx of indices) {
      opacityMean += features.opacities[idx];
    }
    opacityMean /= count;

    let opacityVar = 0;
    for (const idx of indices) {
      const diff = features.opacities[idx] - opacityMean;
      opacityVar += diff * diff;
    }
    opacityVar /= count;

    // High opacity variance = semi-transparent = lower surface confidence
    surfaceConfidence *= 1.0 / (1.0 + opacityVar * 10);

    // Low average opacity also reduces confidence
    surfaceConfidence *= Math.min(1.0, opacityMean * 1.5);

    surfaceConfidence = Math.max(0, Math.min(1, surfaceConfidence));

    // ── Compute volumetric complexity ─────────────────────────────────────
    let volumetricComplexity = 0;

    // Check for volumetric triggers
    for (const trigger of config.volumetricTriggers) {
      volumetricComplexity += this.evaluateTrigger(trigger, indices, features);
    }

    // Normalize to [0, 1]
    volumetricComplexity = Math.min(1, volumetricComplexity / Math.max(1, config.volumetricTriggers.length));

    // ── Assign rendering mode ─────────────────────────────────────────────
    let renderMode: RegionRenderMode;
    let nerfBlendWeight: number;

    if (surfaceConfidence >= config.surfaceConfidenceThreshold &&
        volumetricComplexity < config.volumetricComplexityThreshold) {
      // Well-represented by GS
      renderMode = 'gaussian_splat';
      nerfBlendWeight = 0;
    } else if (surfaceConfidence < config.surfaceConfidenceThreshold * 0.5 ||
               volumetricComplexity > config.volumetricComplexityThreshold * 1.5) {
      // Strongly needs volumetric rendering
      renderMode = 'volumetric_nerf';
      nerfBlendWeight = 1;
    } else {
      // Transition zone: use blended rendering
      renderMode = 'hybrid_blend';
      // Blend weight increases as surface confidence decreases
      nerfBlendWeight = 1.0 - surfaceConfidence;
    }

    return {
      bounds: node.bounds,
      renderMode,
      surfaceConfidence,
      volumetricComplexity,
      nerfBlendWeight,
      gaussianCount: count,
      octreeDepth: node.depth,
    };
  }

  /**
   * Evaluate a volumetric trigger condition for a set of Gaussians.
   * Returns a score in [0, 1] indicating how strongly the trigger fires.
   */
  private evaluateTrigger(
    trigger: VolumetricTrigger,
    indices: number[],
    features: NeRFFeatureExtractionResult,
  ): number {
    const count = indices.length;
    if (count === 0) return 0;

    switch (trigger) {
      case 'semi_transparent': {
        // Count Gaussians with opacity between 0.1 and 0.9
        let semiTransparentCount = 0;
        for (const idx of indices) {
          const o = features.opacities[idx];
          if (o > 0.1 && o < 0.9) semiTransparentCount++;
        }
        return semiTransparentCount / count;
      }

      case 'thin_structure': {
        // Detect thin structures: Gaussians with high scale anisotropy
        let thinCount = 0;
        for (const idx of indices) {
          const sx = features.scales[idx * 3];
          const sy = features.scales[idx * 3 + 1];
          const sz = features.scales[idx * 3 + 2];
          const maxScale = Math.max(sx, sy, sz);
          const minScale = Math.min(sx, sy, sz);
          if (maxScale > 0 && minScale / maxScale < 0.1) {
            thinCount++;
          }
        }
        return thinCount / count;
      }

      case 'high_frequency': {
        // Detect high-frequency details: high color variance in small spatial region
        let colorVarSum = 0;
        let rSum = 0, gSum = 0, bSum = 0;
        for (const idx of indices) {
          rSum += features.colors[idx * 4];
          gSum += features.colors[idx * 4 + 1];
          bSum += features.colors[idx * 4 + 2];
        }
        const rMean = rSum / count, gMean = gSum / count, bMean = bSum / count;
        for (const idx of indices) {
          colorVarSum +=
            (features.colors[idx * 4] - rMean) ** 2 +
            (features.colors[idx * 4 + 1] - gMean) ** 2 +
            (features.colors[idx * 4 + 2] - bMean) ** 2;
        }
        const colorVar = colorVarSum / (count * 3);
        return Math.min(1, colorVar * 10);
      }

      case 'specular_reflection': {
        // Heuristic: high density gradient variance indicates view-dependent effects
        if (!features.densityGradients) return 0;
        let gradVarSum = 0;
        let avgGradMag = 0;
        for (const idx of indices) {
          const mag = Math.sqrt(
            features.densityGradients[idx * 3] ** 2 +
            features.densityGradients[idx * 3 + 1] ** 2 +
            features.densityGradients[idx * 3 + 2] ** 2,
          );
          avgGradMag += mag;
        }
        avgGradMag /= count;
        for (const idx of indices) {
          const mag = Math.sqrt(
            features.densityGradients[idx * 3] ** 2 +
            features.densityGradients[idx * 3 + 1] ** 2 +
            features.densityGradients[idx * 3 + 2] ** 2,
          );
          gradVarSum += (mag - avgGradMag) ** 2;
        }
        return Math.min(1, gradVarSum / count * 5);
      }

      case 'subsurface_scatter': {
        // Heuristic: medium density + soft colors + opacity gradient
        let sssScore = 0;
        for (const idx of indices) {
          const density = features.densities[idx];
          const opacity = features.opacities[idx];
          // SSS candidates: moderate density, moderate opacity, warm colors
          if (density > 0.3 && density < 2.0 && opacity > 0.3 && opacity < 0.95) {
            sssScore += 1;
          }
        }
        return sssScore / count;
      }

      case 'volumetric_media': {
        // Detect volumetric media: low density, low opacity, spatially diffuse
        let volumetricCount = 0;
        for (const idx of indices) {
          if (features.densities[idx] < 0.3 && features.opacities[idx] < 0.5) {
            volumetricCount++;
          }
        }
        return volumetricCount / count;
      }

      default:
        return 0;
    }
  }

  /**
   * Budget-constrain volumetric regions to maxVolumetricFraction.
   * Converts excess volumetric regions to hybrid_blend or gaussian_splat.
   */
  private applyVolumetricBudget(
    regions: HybridRegion[],
    config: HybridRepresentationConfig,
  ): void {
    // Compute current volumetric fraction
    let totalVolume = 0;
    let currentVolumetricVolume = 0;

    for (const r of regions) {
      const vol = this.regionVolume(r.bounds);
      totalVolume += vol;
      if (r.renderMode === 'volumetric_nerf') {
        currentVolumetricVolume += vol;
      } else if (r.renderMode === 'hybrid_blend') {
        currentVolumetricVolume += vol * r.nerfBlendWeight;
      }
    }

    if (totalVolume <= 0) return;

    const currentFraction = currentVolumetricVolume / totalVolume;
    if (currentFraction <= config.maxVolumetricFraction) return;

    // Over budget: demote lowest-complexity volumetric regions
    const volumetricRegions = regions
      .filter(r => r.renderMode === 'volumetric_nerf' || r.renderMode === 'hybrid_blend')
      .sort((a, b) => a.volumetricComplexity - b.volumetricComplexity);

    let removedVolume = 0;
    const excessVolume = currentVolumetricVolume - config.maxVolumetricFraction * totalVolume;

    for (const r of volumetricRegions) {
      if (removedVolume >= excessVolume) break;

      const vol = this.regionVolume(r.bounds);

      if (r.renderMode === 'volumetric_nerf') {
        // Demote to hybrid blend first
        r.renderMode = 'hybrid_blend';
        r.nerfBlendWeight = 0.5;
        removedVolume += vol * 0.5;
      } else if (r.renderMode === 'hybrid_blend') {
        // Demote to pure GS
        r.renderMode = 'gaussian_splat';
        removedVolume += vol * r.nerfBlendWeight;
        r.nerfBlendWeight = 0;
      }
    }
  }

  /**
   * Compute the volume of an AABB.
   */
  private regionVolume(
    bounds: [number, number, number, number, number, number],
  ): number {
    return (
      (bounds[3] - bounds[0]) *
      (bounds[4] - bounds[1]) *
      (bounds[5] - bounds[2])
    );
  }
}
