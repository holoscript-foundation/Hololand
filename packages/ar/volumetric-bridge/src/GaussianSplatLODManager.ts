/**
 * GaussianSplatLODManager
 *
 * Runtime LOD manager for Gaussian Splatting scenes in HoloLand.
 * Bridges the OctreeLODSystem (spatial partitioning + budget logic) with
 * the Three.js rendering pipeline (InstancedBufferGeometry updates).
 *
 * Responsibilities:
 * 1. Build an octree from loaded splat data (positions + scales)
 * 2. Assign each Gaussian to an octree LOD level based on its scale
 * 3. Per-frame LOD selection based on camera distance
 * 4. Budget-aware level capping for VR (180K optimized / 100K conservative)
 * 5. Update instanced geometry to render only selected Gaussians
 * 6. Power-law transition thresholds (Levy flight-inspired)
 *
 * Research references:
 *   W.032 - Octree-GS LOD (anchor-based level selection, TPAMI 2025)
 *   W.034 - VR Gaussian budget (~180K total on Quest 3 at 72fps)
 *   P.030.01 - Hierarchical LOD Gaussian Architecture
 *   P.030.05 - VR Gaussian Budget Management
 *
 * @module volumetric-bridge
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Splat data arrays (parallel arrays indexed by splat index).
 */
export interface SplatDataArrays {
  positions: Float32Array;   // N*3 (xyz)
  scales: Float32Array;      // N*3 (sx,sy,sz) or N (max scale)
  count: number;
}

/**
 * LOD configuration for the manager.
 */
export interface GaussianLODConfig {
  /** Maximum octree depth (LOD levels). Default: 6 */
  maxDepth: number;
  /**
   * Power-law exponent for threshold spacing (Levy flight-inspired).
   * 1.0 = linear, 1.5 = moderate, 2.0 = aggressive.
   * Default: 1.5
   */
  powerLawExponent: number;
  /** Base distance for finest LOD level (world units). Default: 2.0 */
  baseDistance: number;
  /** Max distance for coarsest LOD level (world units). Default: 200.0 */
  maxDistance: number;
  /** Enable VR mode with hard budget enforcement. Default: false */
  vrMode: boolean;
  /**
   * Total Gaussian budget.
   * VR optimized: 180000 (Quest 3 at 72fps)
   * VR conservative: 100000 (Quest 3 at 90fps with headroom)
   * Desktop: 0 (unlimited)
   */
  gaussianBudget: number;
  /** Gaussians reserved per avatar (after SqueezeMe UV-space). Default: 60000 */
  perAvatarReservation: number;
  /** Maximum simultaneous avatars. Default: 3 */
  maxAvatars: number;
  /** How many splats per anchor Gaussian (grouping factor). Default: 1 */
  anchorsGroupSize: number;
  /** Minimum camera movement (world units) to trigger LOD re-evaluation. Default: 0.5 */
  movementThreshold: number;
}

/**
 * Per-frame LOD update result returned to the renderer.
 */
export interface LODUpdateResult {
  /** Whether the visible set changed since last update */
  changed: boolean;
  /** Indices into the original splat array that should be rendered */
  visibleIndices: Uint32Array;
  /** Count of visible Gaussians */
  visibleCount: number;
  /** Current deepest LOD level being rendered */
  activeLODLevel: number;
  /** Total LOD levels available */
  totalLODLevels: number;
  /** Whether budget capping was applied */
  budgetCapped: boolean;
  /** Number of levels dropped due to budget */
  levelsDropped: number;
  /** Camera distance to scene center */
  cameraDistance: number;
  /** Available budget after avatar reservations */
  availableBudget: number;
}

/**
 * Anchor record used internally for LOD grouping.
 */
interface AnchorRecord {
  /** LOD level this anchor belongs to */
  lodLevel: number;
  /** Indices into the original splat array */
  splatIndices: number[];
  /** Total Gaussian count */
  gaussianCount: number;
  /** Position (center of the grouped splats) */
  x: number;
  y: number;
  z: number;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_LOD_CONFIG: GaussianLODConfig = {
  maxDepth: 6,
  powerLawExponent: 1.5,
  baseDistance: 2.0,
  maxDistance: 200.0,
  vrMode: false,
  gaussianBudget: 0,
  perAvatarReservation: 60000,
  maxAvatars: 3,
  anchorsGroupSize: 1,
  movementThreshold: 0.5,
};

/** VR-optimized preset: Quest 3 at 72fps */
export const VR_OPTIMIZED_CONFIG: Partial<GaussianLODConfig> = {
  vrMode: true,
  gaussianBudget: 180000,
  perAvatarReservation: 60000,
  maxAvatars: 3,
  maxDepth: 6,
  powerLawExponent: 1.5,
  baseDistance: 1.5,
  maxDistance: 100.0,
};

/** VR-conservative preset: Quest 3 at 90fps with headroom */
export const VR_CONSERVATIVE_CONFIG: Partial<GaussianLODConfig> = {
  vrMode: true,
  gaussianBudget: 100000,
  perAvatarReservation: 30000,
  maxAvatars: 2,
  maxDepth: 4,
  powerLawExponent: 2.0,
  baseDistance: 1.0,
  maxDistance: 50.0,
};

/** Desktop preset: unlimited budget */
export const DESKTOP_CONFIG: Partial<GaussianLODConfig> = {
  vrMode: false,
  gaussianBudget: 0,
  maxDepth: 8,
  powerLawExponent: 1.5,
  baseDistance: 2.0,
  maxDistance: 500.0,
};

// =============================================================================
// GAUSSIAN SPLAT LOD MANAGER
// =============================================================================

/**
 * Runtime LOD manager for Gaussian Splatting scenes.
 *
 * Usage:
 * ```typescript
 * const manager = new GaussianSplatLODManager(VR_OPTIMIZED_CONFIG);
 *
 * // After loading splat data
 * manager.buildFromSplatData(splatData);
 *
 * // Each frame
 * const result = manager.update(cameraPosition);
 * if (result.changed) {
 *   updateInstancedGeometry(result.visibleIndices, result.visibleCount);
 * }
 * ```
 */
export class GaussianSplatLODManager {
  private config: GaussianLODConfig;

  // Octree data
  private anchors: AnchorRecord[] = [];
  private anchorsByLevel: Map<number, AnchorRecord[]> = new Map();
  private gaussiansByLevel: Map<number, number> = new Map();
  private thresholds: number[] = [];

  // Scene metadata
  private sceneCX = 0;
  private sceneCY = 0;
  private sceneCZ = 0;
  private totalGaussianCount = 0;
  private isBuilt = false;

  // State tracking
  private lastCameraX = NaN;
  private lastCameraY = NaN;
  private lastCameraZ = NaN;
  private lastVisibleIndices: Uint32Array = new Uint32Array(0);
  private lastActiveLODLevel = -1;
  private activeAvatars = 0;

  constructor(config?: Partial<GaussianLODConfig>) {
    this.config = { ...DEFAULT_LOD_CONFIG, ...config };
    this.computeThresholds();
  }

  // ---------------------------------------------------------------------------
  // Build from Splat Data
  // ---------------------------------------------------------------------------

  /**
   * Build the LOD structure from loaded splat data.
   *
   * Algorithm:
   * 1. Find the max scale in the scene
   * 2. Compute LOD level for each splat based on its scale relative to max
   * 3. Group splats into anchors (optional grouping for efficiency)
   * 4. Build per-level index for fast LOD selection
   *
   * @param data - Loaded splat positions and scales
   * @param sceneCenter - Optional scene center override
   */
  buildFromSplatData(
    data: SplatDataArrays,
    sceneCenter?: { x: number; y: number; z: number },
  ): void {
    const { count, positions, scales } = data;
    const { maxDepth, anchorsGroupSize } = this.config;

    // 1. Compute scene bounds and max scale
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let maxScale = 0;

    const scaleStride = scales.length === count ? 1 : 3; // Handle both N and N*3 formats

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

      let s: number;
      if (scaleStride === 1) {
        s = scales[i];
      } else {
        const sx = scales[i * 3];
        const sy = scales[i * 3 + 1];
        const sz = scales[i * 3 + 2];
        s = Math.max(sx, sy, sz);
      }
      if (s > maxScale) maxScale = s;
    }

    // Scene center
    if (sceneCenter) {
      this.sceneCX = sceneCenter.x;
      this.sceneCY = sceneCenter.y;
      this.sceneCZ = sceneCenter.z;
    } else {
      this.sceneCX = (minX + maxX) / 2;
      this.sceneCY = (minY + maxY) / 2;
      this.sceneCZ = (minZ + maxZ) / 2;
    }

    // 2. Assign LOD levels based on scale
    const splatLevels = new Int32Array(count);
    for (let i = 0; i < count; i++) {
      let s: number;
      if (scaleStride === 1) {
        s = scales[i];
      } else {
        const sx = scales[i * 3];
        const sy = scales[i * 3 + 1];
        const sz = scales[i * 3 + 2];
        s = Math.max(sx, sy, sz);
      }
      splatLevels[i] = this.computeLODLevel(s, maxScale, maxDepth);
    }

    // 3. Group into anchors
    this.anchors = [];
    this.anchorsByLevel = new Map();
    this.gaussiansByLevel = new Map();

    for (let level = 0; level < maxDepth; level++) {
      this.anchorsByLevel.set(level, []);
      this.gaussiansByLevel.set(level, 0);
    }

    if (anchorsGroupSize <= 1) {
      // No grouping: each splat is its own anchor
      for (let i = 0; i < count; i++) {
        const level = splatLevels[i];
        const anchor: AnchorRecord = {
          lodLevel: level,
          splatIndices: [i],
          gaussianCount: 1,
          x: positions[i * 3],
          y: positions[i * 3 + 1],
          z: positions[i * 3 + 2],
        };
        this.anchors.push(anchor);
        this.anchorsByLevel.get(level)!.push(anchor);
        this.gaussiansByLevel.set(level, (this.gaussiansByLevel.get(level) ?? 0) + 1);
      }
    } else {
      // Group splats by level, then spatially group within each level
      const byLevel = new Map<number, number[]>();
      for (let level = 0; level < maxDepth; level++) {
        byLevel.set(level, []);
      }
      for (let i = 0; i < count; i++) {
        byLevel.get(splatLevels[i])!.push(i);
      }

      for (const [level, indices] of byLevel) {
        for (let g = 0; g < indices.length; g += anchorsGroupSize) {
          const groupIndices = indices.slice(g, g + anchorsGroupSize);
          let cx = 0, cy = 0, cz = 0;
          for (const idx of groupIndices) {
            cx += positions[idx * 3];
            cy += positions[idx * 3 + 1];
            cz += positions[idx * 3 + 2];
          }
          const n = groupIndices.length;
          const anchor: AnchorRecord = {
            lodLevel: level,
            splatIndices: groupIndices,
            gaussianCount: n,
            x: cx / n,
            y: cy / n,
            z: cz / n,
          };
          this.anchors.push(anchor);
          this.anchorsByLevel.get(level)!.push(anchor);
          this.gaussiansByLevel.set(level, (this.gaussiansByLevel.get(level) ?? 0) + n);
        }
      }
    }

    this.totalGaussianCount = count;
    this.isBuilt = true;

    // Reset state
    this.lastCameraX = NaN;
    this.lastCameraY = NaN;
    this.lastCameraZ = NaN;
    this.lastActiveLODLevel = -1;
    this.lastVisibleIndices = new Uint32Array(0);
  }

  /**
   * Compute LOD level from Gaussian scale using log2 mapping.
   */
  private computeLODLevel(scale: number, maxScale: number, maxDepth: number): number {
    if (scale <= 0 || maxScale <= 0) return maxDepth - 1;
    if (scale >= maxScale) return 0;
    const ratio = maxScale / scale;
    const level = Math.floor(Math.log2(ratio));
    return Math.min(Math.max(0, level), maxDepth - 1);
  }

  // ---------------------------------------------------------------------------
  // Per-Frame Update
  // ---------------------------------------------------------------------------

  /**
   * Update LOD selection based on current camera position.
   * Returns which splats should be visible this frame.
   *
   * @param cameraX - Camera world X
   * @param cameraY - Camera world Y
   * @param cameraZ - Camera world Z
   * @param avatarCount - Optional avatar count override for this frame
   */
  update(
    cameraX: number,
    cameraY: number,
    cameraZ: number,
    avatarCount?: number,
  ): LODUpdateResult {
    if (!this.isBuilt) {
      return {
        changed: false,
        visibleIndices: this.lastVisibleIndices,
        visibleCount: 0,
        activeLODLevel: 0,
        totalLODLevels: this.config.maxDepth,
        budgetCapped: false,
        levelsDropped: 0,
        cameraDistance: 0,
        availableBudget: this.config.gaussianBudget,
      };
    }

    // Check if camera moved enough to warrant re-evaluation
    const dx = cameraX - this.lastCameraX;
    const dy = cameraY - this.lastCameraY;
    const dz = cameraZ - this.lastCameraZ;
    const forcedReevaluation = isNaN(this.lastCameraX);
    const moved = forcedReevaluation || Math.sqrt(dx * dx + dy * dy + dz * dz) > this.config.movementThreshold;

    if (!moved) {
      return {
        changed: false,
        visibleIndices: this.lastVisibleIndices,
        visibleCount: this.lastVisibleIndices.length,
        activeLODLevel: this.lastActiveLODLevel,
        totalLODLevels: this.config.maxDepth,
        budgetCapped: false,
        levelsDropped: 0,
        cameraDistance: Math.sqrt(
          (cameraX - this.sceneCX) ** 2 +
          (cameraY - this.sceneCY) ** 2 +
          (cameraZ - this.sceneCZ) ** 2,
        ),
        availableBudget: this.getAvailableBudget(avatarCount),
      };
    }

    this.lastCameraX = cameraX;
    this.lastCameraY = cameraY;
    this.lastCameraZ = cameraZ;

    // Compute camera distance to scene center
    const cdx = cameraX - this.sceneCX;
    const cdy = cameraY - this.sceneCY;
    const cdz = cameraZ - this.sceneCZ;
    const cameraDistance = Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz);

    // Determine deepest visible LOD level from thresholds
    let deepestLevel = 0;
    for (let i = 0; i < this.thresholds.length; i++) {
      if (cameraDistance < this.thresholds[i]) {
        deepestLevel = i + 1;
      } else {
        break;
      }
    }
    deepestLevel = Math.min(deepestLevel, this.config.maxDepth - 1);

    // Build selected levels: 0 through deepestLevel
    const selectedLevels: number[] = [];
    for (let l = 0; l <= deepestLevel; l++) {
      selectedLevels.push(l);
    }

    // Compute available budget
    const availableBudget = this.getAvailableBudget(avatarCount);

    // Sum Gaussians across selected levels
    let totalSelected = 0;
    for (const level of selectedLevels) {
      totalSelected += this.gaussiansByLevel.get(level) ?? 0;
    }

    // Budget enforcement: drop deepest levels first
    let budgetCapped = false;
    let levelsDropped = 0;

    if (availableBudget > 0 && totalSelected > availableBudget) {
      budgetCapped = true;
      while (selectedLevels.length > 1 && totalSelected > availableBudget) {
        const dropped = selectedLevels.pop()!;
        totalSelected -= this.gaussiansByLevel.get(dropped) ?? 0;
        levelsDropped++;
      }
    }

    // Check if active level changed
    const activeLODLevel = selectedLevels.length > 0 ? selectedLevels[selectedLevels.length - 1] : 0;
    const levelChanged = activeLODLevel !== this.lastActiveLODLevel;
    this.lastActiveLODLevel = activeLODLevel;

    // Collect visible splat indices from selected levels
    const indices: number[] = [];
    for (const level of selectedLevels) {
      const anchors = this.anchorsByLevel.get(level);
      if (anchors) {
        for (const anchor of anchors) {
          for (const idx of anchor.splatIndices) {
            indices.push(idx);
          }
        }
      }
    }

    const visibleIndices = new Uint32Array(indices);
    this.lastVisibleIndices = visibleIndices;

    return {
      changed: forcedReevaluation || levelChanged || visibleIndices.length !== this.lastVisibleIndices.length,
      visibleIndices,
      visibleCount: visibleIndices.length,
      activeLODLevel,
      totalLODLevels: this.config.maxDepth,
      budgetCapped,
      levelsDropped,
      cameraDistance,
      availableBudget,
    };
  }

  // ---------------------------------------------------------------------------
  // Avatar Management
  // ---------------------------------------------------------------------------

  /**
   * Set the number of active avatars in the scene.
   */
  setActiveAvatars(count: number): void {
    this.activeAvatars = Math.min(Math.max(0, count), this.config.maxAvatars);
  }

  /**
   * Get current active avatar count.
   */
  getActiveAvatars(): number {
    return this.activeAvatars;
  }

  // ---------------------------------------------------------------------------
  // Budget Computation
  // ---------------------------------------------------------------------------

  /**
   * Get available Gaussian budget after avatar reservations.
   */
  private getAvailableBudget(avatarOverride?: number): number {
    if (this.config.gaussianBudget <= 0) return 0; // 0 means unlimited
    const avatars = Math.min(avatarOverride ?? this.activeAvatars, this.config.maxAvatars);
    const reserved = this.config.vrMode ? avatars * this.config.perAvatarReservation : 0;
    return Math.max(0, this.config.gaussianBudget - reserved);
  }

  // ---------------------------------------------------------------------------
  // Threshold Computation (Power-Law, Levy Flight-inspired)
  // ---------------------------------------------------------------------------

  /**
   * Compute power-law transition thresholds.
   * Threshold[i] = baseDistance + (maxDistance - baseDistance) * ((i+1)/maxDepth)^exponent
   */
  private computeThresholds(): void {
    const { maxDepth, powerLawExponent, baseDistance, maxDistance } = this.config;
    this.thresholds = [];
    for (let i = 0; i < maxDepth; i++) {
      const t = (i + 1) / maxDepth;
      const threshold = baseDistance + (maxDistance - baseDistance) * Math.pow(t, powerLawExponent);
      this.thresholds.push(threshold);
    }
  }

  // ---------------------------------------------------------------------------
  // Diagnostics
  // ---------------------------------------------------------------------------

  /**
   * Get per-level Gaussian distribution.
   */
  getLevelDistribution(): Array<{ level: number; gaussianCount: number; anchorCount: number }> {
    const result: Array<{ level: number; gaussianCount: number; anchorCount: number }> = [];
    for (let level = 0; level < this.config.maxDepth; level++) {
      result.push({
        level,
        gaussianCount: this.gaussiansByLevel.get(level) ?? 0,
        anchorCount: this.anchorsByLevel.get(level)?.length ?? 0,
      });
    }
    return result;
  }

  /**
   * Get the transition thresholds.
   */
  getThresholds(): readonly number[] {
    return this.thresholds;
  }

  /**
   * Get total Gaussian count.
   */
  getTotalGaussianCount(): number {
    return this.totalGaussianCount;
  }

  /**
   * Check if the LOD structure has been built.
   */
  getIsBuilt(): boolean {
    return this.isBuilt;
  }

  /**
   * Get current configuration.
   */
  getConfig(): Readonly<GaussianLODConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration and recompute thresholds.
   */
  updateConfig(config: Partial<GaussianLODConfig>): void {
    this.config = { ...this.config, ...config };
    this.computeThresholds();
    // Force re-evaluation on next update
    this.lastCameraX = NaN;
  }

  /**
   * Reset the manager state without clearing the built structure.
   */
  resetState(): void {
    this.lastCameraX = NaN;
    this.lastCameraY = NaN;
    this.lastCameraZ = NaN;
    this.lastActiveLODLevel = -1;
    this.lastVisibleIndices = new Uint32Array(0);
  }

  /**
   * Fully clear the manager (remove built data).
   */
  clear(): void {
    this.anchors = [];
    this.anchorsByLevel = new Map();
    this.gaussiansByLevel = new Map();
    this.totalGaussianCount = 0;
    this.isBuilt = false;
    this.resetState();
  }
}
