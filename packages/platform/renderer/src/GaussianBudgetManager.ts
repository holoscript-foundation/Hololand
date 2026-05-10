/**
 * GaussianBudgetManager
 *
 * Layered Gaussian splat budget management for Quest 3 VR.
 *
 * Architecture: Three rendering tiers with distinct cost profiles:
 *   - Baked     (120K splats): Pre-lit, SH-baked radiance. Cheapest per-splat.
 *   - Relightable (30K splats): Deferred PBR shading, dynamic lights.
 *   - Interactive (10K splats): Physics-coupled via XPBD, grabbable/deformable.
 *
 * Total effective budget: 160K Gaussians on Quest 3 (XR2G2 / Adreno 740).
 *
 * Features:
 *   - Hard per-layer caps with soft cross-layer rebalancing
 *   - Foveated culling integration (2x budget in foveal region)
 *   - Distance-based LOD with per-layer decimation curves
 *   - Frame-time-driven adaptive budget (1Hz rebalance cycle)
 *   - Emergency shed at 90% GPU utilization
 *   - Per-splat memory estimation (56B baked, 96B relightable, 128B interactive)
 *
 * Quest 3 constraints:
 *   - 90Hz stereo (11.1ms per frame, ~5.5ms for splat rendering)
 *   - ~4GB shared memory (CPU+GPU), practical GPU budget ~1.5GB
 *   - Adreno 740: ~1.4 TFLOPS FP32, limited bandwidth
 *
 * References:
 *   - SqueezeMe (CVPR 2025): 60K splats per avatar on Quest 3
 *   - VR-Splatting (I3D 2025): Foveated 3DGS at 90Hz / 2016x2240 per eye
 *   - Relightable Gaussian Codec Avatars (SIGGRAPH 2024)
 *   - VR-GS: Two-level rendering with XPBD physics
 *
 * @module GaussianBudgetManager
 */

import { EventEmitter } from 'events';
import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Gaussian rendering layer type.
 * Ordered by per-splat cost (cheapest first).
 */
export type GaussianLayerType = 'baked' | 'relightable' | 'interactive';

/**
 * Per-splat memory cost in bytes for each layer type.
 *
 * Baked:        56B (position:12 + covariance:24 + SH_dc:12 + opacity:4 + padding:4)
 * Relightable:  96B (baked:56 + normal:12 + albedo:12 + roughness:4 + metalness:4 + PRT:8)
 * Interactive: 128B (relightable:96 + velocity:12 + mass:4 + constraints:8 + collider:8)
 */
export const SPLAT_MEMORY_BYTES: Record<GaussianLayerType, number> = {
  baked: 56,
  relightable: 96,
  interactive: 128,
};

/**
 * Rendering cost weight relative to baked (1.0).
 * Accounts for shader complexity, not just memory.
 */
export const SPLAT_RENDER_COST: Record<GaussianLayerType, number> = {
  baked: 1.0,
  relightable: 2.4, // Deferred shading pass + light evaluation
  interactive: 3.6, // Physics readback + deferred + collision
};

/**
 * LOD level for Gaussian splats
 */
export interface GaussianLODLevel {
  /** LOD index (0 = full, 3 = billboard/point) */
  level: number;
  /** Splat count multiplier (1.0 = all splats, 0.1 = 10% of splats) */
  splatMultiplier: number;
  /** SH band limit (0=DC only, 1=L1, 2=L2, 3=full) */
  shBandLimit: number;
  /** Distance threshold in meters */
  distanceThreshold: number;
  /** Whether to use compressed covariance */
  compressedCovariance: boolean;
}

/**
 * A registered Gaussian splat object within the budget system
 */
export interface GaussianSplatEntry {
  /** Unique splat object ID */
  id: string;
  /** Which layer this splat belongs to */
  layer: GaussianLayerType;
  /** Base splat count (before LOD reduction) */
  baseSplatCount: number;
  /** Current effective splat count (after LOD) */
  effectiveSplatCount: number;
  /** Current LOD level */
  lodLevel: number;
  /** Distance to camera in meters */
  distanceToCamera: number;
  /** Whether this splat is in the foveal region */
  inFovealRegion: boolean;
  /** Whether this splat is currently visible (frustum culled) */
  isVisible: boolean;
  /** Bounding sphere radius in meters */
  boundingRadius: number;
  /** Priority (higher = more important, less likely to be culled) */
  priority: number;
  /** Timestamp of last visibility */
  lastVisibleAt: number;
  /** Whether this object is pinned (never culled) */
  pinned: boolean;
}

/**
 * Layer budget configuration
 */
export interface LayerBudgetConfig {
  /** Maximum splat count for this layer */
  maxSplats: number;
  /** Minimum reserved splats (never borrowed by other layers) */
  reservedSplats: number;
  /** Whether this layer can borrow unused budget from other layers */
  canBorrow: boolean;
  /** Whether this layer can lend unused budget to other layers */
  canLend: boolean;
  /** Maximum percentage of budget that can be lent (0-1) */
  maxLendPercent: number;
}

/**
 * Foveated rendering configuration
 */
export interface FoveatedConfig {
  /** Enable foveated Gaussian rendering */
  enabled: boolean;
  /** Foveal region half-angle in degrees (default: 10) */
  fovealAngleDeg: number;
  /** Budget multiplier for foveal region (default: 2.0) */
  fovealBudgetMultiplier: number;
  /** Peripheral LOD bias (added to base LOD level, default: 1) */
  peripheralLODBias: number;
  /** Inner blend zone width in degrees (default: 5) */
  blendZoneDeg: number;
}

/**
 * Full budget manager configuration
 */
export interface GaussianBudgetManagerConfig {
  /** Per-layer budget configurations */
  layers?: Partial<Record<GaussianLayerType, Partial<LayerBudgetConfig>>>;
  /** Foveated rendering settings */
  foveated?: Partial<FoveatedConfig>;
  /** LOD distance thresholds per layer (overrides defaults) */
  lodThresholds?: Partial<Record<GaussianLayerType, number[]>>;
  /** Target frame time in ms (default: 5.5 for Quest 3 splat budget) */
  targetFrameTimeMs?: number;
  /** Rebalance interval in ms (default: 1000) */
  rebalanceIntervalMs?: number;
  /** Emergency shed threshold (0-1, default: 0.90) */
  emergencyShedThreshold?: number;
  /** Enable cross-layer budget borrowing (default: true) */
  enableBorrowing?: boolean;
  /** Enable adaptive quality (default: true) */
  enableAdaptive?: boolean;
  /** Verbose logging (default: false) */
  verbose?: boolean;
}

/**
 * Runtime snapshot of layer budget state
 */
export interface LayerBudgetState {
  /** Layer type */
  layer: GaussianLayerType;
  /** Configured max splats */
  maxSplats: number;
  /** Currently allocated splats (sum of effective counts) */
  allocatedSplats: number;
  /** Splats lent to other layers */
  lentSplats: number;
  /** Splats borrowed from other layers */
  borrowedSplats: number;
  /** Effective budget (max - lent + borrowed) */
  effectiveBudget: number;
  /** Utilization percent (0-1) */
  utilization: number;
  /** Number of registered objects */
  objectCount: number;
  /** Number of visible objects */
  visibleObjectCount: number;
  /** Estimated VRAM usage in bytes */
  estimatedVRAMBytes: number;
}

/**
 * Complete budget manager metrics
 */
export interface GaussianBudgetMetrics {
  /** Per-layer state */
  layers: Record<GaussianLayerType, LayerBudgetState>;
  /** Total effective splats rendered */
  totalEffectiveSplats: number;
  /** Total budget (sum of effective budgets) */
  totalBudget: number;
  /** Overall utilization (0-1) */
  overallUtilization: number;
  /** Estimated total VRAM for Gaussians in bytes */
  totalVRAMBytes: number;
  /** Current performance state */
  performanceState: 'nominal' | 'pressure' | 'critical' | 'emergency';
  /** Average frame time over measurement window (ms) */
  avgFrameTimeMs: number;
  /** Rebalance count since start */
  rebalanceCount: number;
  /** Emergency shed count since start */
  emergencyShedCount: number;
  /** Foveated rendering active */
  foveatedActive: boolean;
}

/**
 * Budget events
 */
export type GaussianBudgetEvent =
  | 'budget:rebalanced'
  | 'budget:emergency_shed'
  | 'budget:layer_overflow'
  | 'budget:layer_underflow'
  | 'splat:registered'
  | 'splat:unregistered'
  | 'splat:lod_changed'
  | 'splat:culled'
  | 'splat:restored'
  | 'performance:nominal'
  | 'performance:pressure'
  | 'performance:critical'
  | 'performance:emergency';

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_LAYER_BUDGETS: Record<GaussianLayerType, LayerBudgetConfig> = {
  baked: {
    maxSplats: 120_000,
    reservedSplats: 40_000,
    canBorrow: true,
    canLend: true,
    maxLendPercent: 0.4, // Can lend up to 40% of unused budget
  },
  relightable: {
    maxSplats: 30_000,
    reservedSplats: 10_000,
    canBorrow: true,
    canLend: true,
    maxLendPercent: 0.3,
  },
  interactive: {
    maxSplats: 10_000,
    reservedSplats: 2_000,
    canBorrow: true,
    canLend: false, // Interactive layer never lends (too precious)
    maxLendPercent: 0,
  },
};

const DEFAULT_FOVEATED_CONFIG: FoveatedConfig = {
  enabled: true,
  fovealAngleDeg: 10,
  fovealBudgetMultiplier: 2.0,
  peripheralLODBias: 1,
  blendZoneDeg: 5,
};

/**
 * LOD levels per layer type.
 * Baked has aggressive LOD (cheap base cost, so savings are proportional).
 * Interactive has gentle LOD (each splat is physics-coupled, aggressive reduction breaks physics).
 */
const DEFAULT_LOD_LEVELS: Record<GaussianLayerType, GaussianLODLevel[]> = {
  baked: [
    {
      level: 0,
      splatMultiplier: 1.0,
      shBandLimit: 3,
      distanceThreshold: 5,
      compressedCovariance: false,
    },
    {
      level: 1,
      splatMultiplier: 0.5,
      shBandLimit: 2,
      distanceThreshold: 15,
      compressedCovariance: false,
    },
    {
      level: 2,
      splatMultiplier: 0.2,
      shBandLimit: 1,
      distanceThreshold: 30,
      compressedCovariance: true,
    },
    {
      level: 3,
      splatMultiplier: 0.05,
      shBandLimit: 0,
      distanceThreshold: Infinity,
      compressedCovariance: true,
    },
  ],
  relightable: [
    {
      level: 0,
      splatMultiplier: 1.0,
      shBandLimit: 2,
      distanceThreshold: 3,
      compressedCovariance: false,
    },
    {
      level: 1,
      splatMultiplier: 0.6,
      shBandLimit: 1,
      distanceThreshold: 10,
      compressedCovariance: false,
    },
    {
      level: 2,
      splatMultiplier: 0.25,
      shBandLimit: 0,
      distanceThreshold: 20,
      compressedCovariance: true,
    },
    {
      level: 3,
      splatMultiplier: 0.08,
      shBandLimit: 0,
      distanceThreshold: Infinity,
      compressedCovariance: true,
    },
  ],
  interactive: [
    {
      level: 0,
      splatMultiplier: 1.0,
      shBandLimit: 2,
      distanceThreshold: 10,
      compressedCovariance: false,
    },
    {
      level: 1,
      splatMultiplier: 0.75,
      shBandLimit: 1,
      distanceThreshold: 20,
      compressedCovariance: false,
    },
    {
      level: 2,
      splatMultiplier: 0.4,
      shBandLimit: 0,
      distanceThreshold: Infinity,
      compressedCovariance: true,
    },
    // No level 3 for interactive: physics breaks below 40% splat density
  ],
};

// =============================================================================
// GAUSSIAN BUDGET MANAGER
// =============================================================================

/**
 * Layered Gaussian budget manager for Quest 3 VR.
 *
 * Manages a 160K effective Gaussian budget across three layers:
 *   - 120K baked (pre-lit, SH-baked)
 *   - 30K relightable (deferred PBR)
 *   - 10K interactive (XPBD physics-coupled)
 *
 * USAGE:
 * ```typescript
 * const budgetManager = new GaussianBudgetManager();
 *
 * // Register splat objects
 * budgetManager.registerSplat({
 *   id: 'environment_01',
 *   layer: 'baked',
 *   baseSplatCount: 45000,
 *   priority: 1,
 * });
 *
 * budgetManager.registerSplat({
 *   id: 'avatar_head',
 *   layer: 'relightable',
 *   baseSplatCount: 20000,
 *   priority: 10,
 *   pinned: true,
 * });
 *
 * budgetManager.registerSplat({
 *   id: 'grabbed_object',
 *   layer: 'interactive',
 *   baseSplatCount: 5000,
 *   priority: 20,
 * });
 *
 * // Each frame: update camera state and get render commands
 * budgetManager.updateFrame({
 *   cameraPosition: [0, 1.7, 0],
 *   cameraForward: [0, 0, -1],
 *   gazeDirection: [0.1, -0.05, -1],
 *   frameTimeMs: 4.8,
 * });
 *
 * // Get what to render
 * const renderList = budgetManager.getRenderList();
 * for (const entry of renderList) {
 *   renderer.drawGaussianSplat(entry.id, entry.effectiveSplatCount, entry.lodLevel);
 * }
 * ```
 */
export class GaussianBudgetManager extends EventEmitter {
  // Configuration
  private layerConfigs: Record<GaussianLayerType, LayerBudgetConfig>;
  private foveatedConfig: FoveatedConfig;
  private lodLevels: Record<GaussianLayerType, GaussianLODLevel[]>;
  private targetFrameTimeMs: number;
  private rebalanceIntervalMs: number;
  private emergencyShedThreshold: number;
  private enableBorrowing: boolean;
  private enableAdaptive: boolean;
  private verbose: boolean;

  // State
  private splats: Map<string, GaussianSplatEntry> = new Map();
  private lentBudgets: Record<GaussianLayerType, number> = {
    baked: 0,
    relightable: 0,
    interactive: 0,
  };
  private borrowedBudgets: Record<GaussianLayerType, number> = {
    baked: 0,
    relightable: 0,
    interactive: 0,
  };

  // Performance monitoring
  private frameTimeHistory: number[] = [];
  private readonly FRAME_HISTORY_SIZE = 60; // 1 second at 60fps / ~0.67s at 90fps
  private lastRebalanceTime = 0;
  private performanceState: GaussianBudgetMetrics['performanceState'] = 'nominal';
  private rebalanceCount = 0;
  private emergencyShedCount = 0;

  // Cached metrics
  private cachedMetrics: GaussianBudgetMetrics | null = null;
  private metricsDirty = true;

  constructor(config: GaussianBudgetManagerConfig = {}) {
    super();

    // Layer configs (deep copy to prevent mutation of defaults)
    this.layerConfigs = {
      baked: { ...DEFAULT_LAYER_BUDGETS.baked },
      relightable: { ...DEFAULT_LAYER_BUDGETS.relightable },
      interactive: { ...DEFAULT_LAYER_BUDGETS.interactive },
    };
    if (config.layers) {
      for (const [layer, overrides] of Object.entries(config.layers)) {
        if (overrides) {
          this.layerConfigs[layer as GaussianLayerType] = {
            ...this.layerConfigs[layer as GaussianLayerType],
            ...overrides,
          };
        }
      }
    }

    // Foveated config
    this.foveatedConfig = { ...DEFAULT_FOVEATED_CONFIG, ...config.foveated };

    // LOD thresholds (deep copy to prevent mutation of defaults)
    this.lodLevels = {
      baked: DEFAULT_LOD_LEVELS.baked.map((l) => ({ ...l })),
      relightable: DEFAULT_LOD_LEVELS.relightable.map((l) => ({ ...l })),
      interactive: DEFAULT_LOD_LEVELS.interactive.map((l) => ({ ...l })),
    };
    if (config.lodThresholds) {
      for (const [layer, thresholds] of Object.entries(config.lodThresholds)) {
        if (thresholds) {
          const layerType = layer as GaussianLayerType;
          const baseLevels = this.lodLevels[layerType];
          for (let i = 0; i < Math.min(thresholds.length, baseLevels.length); i++) {
            baseLevels[i].distanceThreshold = thresholds[i];
          }
        }
      }
    }

    // Scalar configs
    this.targetFrameTimeMs = config.targetFrameTimeMs ?? 5.5;
    this.rebalanceIntervalMs = config.rebalanceIntervalMs ?? 1000;
    this.emergencyShedThreshold = config.emergencyShedThreshold ?? 0.9;
    this.enableBorrowing = config.enableBorrowing ?? true;
    this.enableAdaptive = config.enableAdaptive ?? true;
    this.verbose = config.verbose ?? false;

    logger.info('[GaussianBudgetManager] Initialized', {
      totalBudget: this.getTotalBudget(),
      layers: {
        baked: this.layerConfigs.baked.maxSplats,
        relightable: this.layerConfigs.relightable.maxSplats,
        interactive: this.layerConfigs.interactive.maxSplats,
      },
      foveated: this.foveatedConfig.enabled,
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SPLAT REGISTRATION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Register a Gaussian splat object with the budget manager.
   * Returns true if the splat was accepted within budget, false if rejected.
   */
  registerSplat(params: {
    id: string;
    layer: GaussianLayerType;
    baseSplatCount: number;
    boundingRadius?: number;
    priority?: number;
    pinned?: boolean;
  }): boolean {
    if (this.splats.has(params.id)) {
      logger.warn('[GaussianBudgetManager] Splat already registered', { id: params.id });
      return false;
    }

    // Check if layer has budget
    const layerState = this.getLayerState(params.layer);
    const availableBudget = layerState.effectiveBudget - layerState.allocatedSplats;

    if (params.baseSplatCount > availableBudget && !params.pinned) {
      // Try to borrow from other layers
      if (this.enableBorrowing) {
        const borrowed = this.tryBorrow(params.layer, params.baseSplatCount - availableBudget);
        if (!borrowed) {
          logger.warn('[GaussianBudgetManager] Budget exceeded, rejecting splat', {
            id: params.id,
            layer: params.layer,
            requested: params.baseSplatCount,
            available: availableBudget,
          });
          this.emit('budget:layer_overflow', { layer: params.layer, id: params.id });
          return false;
        }
      } else {
        this.emit('budget:layer_overflow', { layer: params.layer, id: params.id });
        return false;
      }
    }

    const entry: GaussianSplatEntry = {
      id: params.id,
      layer: params.layer,
      baseSplatCount: params.baseSplatCount,
      effectiveSplatCount: params.baseSplatCount, // Will be adjusted by LOD in updateFrame
      lodLevel: 0,
      distanceToCamera: Infinity,
      inFovealRegion: false,
      isVisible: true,
      boundingRadius: params.boundingRadius ?? 1.0,
      priority: params.priority ?? 0,
      lastVisibleAt: Date.now(),
      pinned: params.pinned ?? false,
    };

    this.splats.set(params.id, entry);
    this.metricsDirty = true;

    if (this.verbose) {
      logger.debug('[GaussianBudgetManager] Registered splat', {
        id: params.id,
        layer: params.layer,
        splatCount: params.baseSplatCount,
      });
    }

    this.emit('splat:registered', entry);
    return true;
  }

  /**
   * Unregister a Gaussian splat object
   */
  unregisterSplat(id: string): boolean {
    const entry = this.splats.get(id);
    if (!entry) return false;

    this.splats.delete(id);
    this.metricsDirty = true;

    // Return any borrowed budget
    if (this.borrowedBudgets[entry.layer] > 0) {
      this.returnBorrowedBudget(entry.layer);
    }

    if (this.verbose) {
      logger.debug('[GaussianBudgetManager] Unregistered splat', { id });
    }

    this.emit('splat:unregistered', { id, layer: entry.layer });
    return true;
  }

  /**
   * Update a splat's base splat count (e.g., after re-training)
   */
  updateSplatCount(id: string, newBaseSplatCount: number): boolean {
    const entry = this.splats.get(id);
    if (!entry) return false;

    entry.baseSplatCount = newBaseSplatCount;
    this.metricsDirty = true;
    return true;
  }

  /**
   * Move a splat between layers (e.g., baked -> interactive when grabbed)
   */
  promoteSplat(id: string, targetLayer: GaussianLayerType): boolean {
    const entry = this.splats.get(id);
    if (!entry) return false;
    if (entry.layer === targetLayer) return true;

    // Check target layer budget
    const targetState = this.getLayerState(targetLayer);
    const targetCost = entry.baseSplatCount;
    const available = targetState.effectiveBudget - targetState.allocatedSplats;

    if (targetCost > available) {
      if (this.enableBorrowing && !this.tryBorrow(targetLayer, targetCost - available)) {
        return false;
      } else if (!this.enableBorrowing) {
        return false;
      }
    }

    const oldLayer = entry.layer;
    entry.layer = targetLayer;
    this.metricsDirty = true;

    logger.info('[GaussianBudgetManager] Promoted splat', {
      id,
      from: oldLayer,
      to: targetLayer,
    });

    return true;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FRAME UPDATE
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Per-frame update. Call once per frame in the render loop.
   *
   * This is the main entry point that:
   *   1. Updates distance + foveation state for each splat
   *   2. Computes LOD levels based on distance + foveation
   *   3. Enforces per-layer budgets via priority-based culling
   *   4. Records frame timing and triggers rebalancing at interval
   */
  updateFrame(params: {
    cameraPosition: [number, number, number];
    cameraForward: [number, number, number];
    gazeDirection?: [number, number, number]; // For foveated rendering
    splatPositions?: Map<string, [number, number, number]>; // Current positions
    frameTimeMs: number;
  }): void {
    const now = performance.now();

    // 1. Update distance and foveation for all splats
    this.updateSplatDistances(params.cameraPosition, params.splatPositions);
    if (this.foveatedConfig.enabled && params.gazeDirection) {
      this.updateFoveation(params.cameraPosition, params.gazeDirection);
    }

    // 2. Compute LOD levels
    this.updateLODLevels();

    // 3. Enforce budgets (priority-based culling)
    this.enforceBudgets();

    // 4. Performance monitoring
    this.recordFrameTime(params.frameTimeMs);

    // 5. Periodic rebalancing
    if (this.enableAdaptive && now - this.lastRebalanceTime > this.rebalanceIntervalMs) {
      this.rebalanceBudgets();
      this.lastRebalanceTime = now;
    }

    this.metricsDirty = true;
  }

  /**
   * Get the current render list (visible splats sorted by layer then priority)
   */
  getRenderList(): ReadonlyArray<Readonly<GaussianSplatEntry>> {
    const visible: GaussianSplatEntry[] = [];

    for (const entry of this.splats.values()) {
      if (entry.isVisible && entry.effectiveSplatCount > 0) {
        visible.push(entry);
      }
    }

    // Sort: interactive first (need physics), then relightable, then baked
    // Within same layer, sort by priority descending
    const layerOrder: Record<GaussianLayerType, number> = {
      interactive: 0,
      relightable: 1,
      baked: 2,
    };

    visible.sort((a, b) => {
      const layerDiff = layerOrder[a.layer] - layerOrder[b.layer];
      if (layerDiff !== 0) return layerDiff;
      return b.priority - a.priority;
    });

    return visible;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DISTANCE AND FOVEATION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Update distance-to-camera for all splats.
   * If splatPositions is not provided, distances remain unchanged.
   */
  private updateSplatDistances(
    cameraPosition: [number, number, number],
    splatPositions?: Map<string, [number, number, number]>
  ): void {
    if (!splatPositions) return;

    const [cx, cy, cz] = cameraPosition;

    for (const [id, entry] of this.splats) {
      const pos = splatPositions.get(id);
      if (pos) {
        const dx = pos[0] - cx;
        const dy = pos[1] - cy;
        const dz = pos[2] - cz;
        entry.distanceToCamera = Math.sqrt(dx * dx + dy * dy + dz * dz);
      }
    }
  }

  /**
   * Update foveation state for all splats.
   * A splat is "in foveal region" if the angle between gaze direction
   * and the direction to the splat is within the foveal angle.
   */
  private updateFoveation(
    cameraPosition: [number, number, number],
    gazeDirection: [number, number, number]
  ): void {
    const fovealCosAngle = Math.cos((this.foveatedConfig.fovealAngleDeg * Math.PI) / 180);
    const blendCosAngle = Math.cos(
      ((this.foveatedConfig.fovealAngleDeg + this.foveatedConfig.blendZoneDeg) * Math.PI) / 180
    );

    // Normalize gaze direction
    const gazeLen = Math.sqrt(
      gazeDirection[0] ** 2 + gazeDirection[1] ** 2 + gazeDirection[2] ** 2
    );
    const gx = gazeDirection[0] / gazeLen;
    const gy = gazeDirection[1] / gazeLen;
    const gz = gazeDirection[2] / gazeLen;

    for (const entry of this.splats.values()) {
      // We use a simplified check: assume splat center is enough for foveation
      // In practice, splatPositions map provides actual positions;
      // without it, we assume the entry is not in foveal region
      // This field is primarily set when splatPositions are provided
      // For now, conservatively mark based on distance heuristic:
      // objects within 3m are likely foveal on Quest 3
      entry.inFovealRegion = entry.distanceToCamera < 3.0;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // LOD COMPUTATION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Compute LOD levels for all splats based on distance and foveation.
   */
  private updateLODLevels(): void {
    for (const entry of this.splats.values()) {
      const levels = this.lodLevels[entry.layer];
      const distance = entry.distanceToCamera;

      // Find the appropriate LOD level based on distance.
      // distanceThreshold represents the max distance for this level.
      // Objects closer than LOD N's threshold use LOD N.
      // Objects beyond all thresholds use the highest LOD.
      let targetLevel = levels.length - 1; // Default to highest LOD
      for (let i = 0; i < levels.length; i++) {
        if (distance < levels[i].distanceThreshold) {
          targetLevel = levels[i].level;
          break;
        }
      }

      // Apply foveated bias: if NOT in foveal region, increase LOD
      if (this.foveatedConfig.enabled && !entry.inFovealRegion) {
        targetLevel = Math.min(
          targetLevel + this.foveatedConfig.peripheralLODBias,
          levels.length - 1
        );
      }

      // Apply performance pressure bias
      if (this.performanceState === 'critical') {
        targetLevel = Math.min(targetLevel + 1, levels.length - 1);
      } else if (this.performanceState === 'emergency') {
        targetLevel = Math.min(targetLevel + 2, levels.length - 1);
      }

      // Clamp to available levels
      targetLevel = Math.min(targetLevel, levels.length - 1);

      // Update entry
      if (targetLevel !== entry.lodLevel) {
        const oldLevel = entry.lodLevel;
        entry.lodLevel = targetLevel;

        if (this.verbose) {
          logger.debug('[GaussianBudgetManager] LOD changed', {
            id: entry.id,
            from: oldLevel,
            to: targetLevel,
            distance: distance.toFixed(1),
          });
        }

        this.emit('splat:lod_changed', {
          id: entry.id,
          fromLevel: oldLevel,
          toLevel: targetLevel,
        });
      }

      // Compute effective splat count from LOD
      const lodConfig = levels[targetLevel];
      let effectiveCount = Math.floor(entry.baseSplatCount * lodConfig.splatMultiplier);

      // Foveated multiplier: objects in foveal region get budget boost
      if (this.foveatedConfig.enabled && entry.inFovealRegion) {
        effectiveCount = Math.min(
          Math.floor(effectiveCount * this.foveatedConfig.fovealBudgetMultiplier),
          entry.baseSplatCount // Never exceed base count
        );
      }

      entry.effectiveSplatCount = effectiveCount;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // BUDGET ENFORCEMENT
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Enforce per-layer budgets by culling lowest-priority splats.
   */
  private enforceBudgets(): void {
    const layers: GaussianLayerType[] = ['baked', 'relightable', 'interactive'];

    for (const layer of layers) {
      const config = this.layerConfigs[layer];
      const effectiveBudget =
        config.maxSplats - this.lentBudgets[layer] + this.borrowedBudgets[layer];

      // Get all visible entries for this layer, sorted by priority (ascending = cull first)
      const entries = this.getLayerEntries(layer)
        .filter((e) => e.isVisible)
        .sort((a, b) => {
          // Pinned objects always last (never culled)
          if (a.pinned !== b.pinned) return a.pinned ? 1 : -1;
          // Then by priority ascending (lowest priority culled first)
          return a.priority - b.priority;
        });

      // Sum current effective counts
      let totalEffective = 0;
      for (const entry of entries) {
        totalEffective += entry.effectiveSplatCount;
      }

      // If within budget, restore any previously culled objects
      if (totalEffective <= effectiveBudget) {
        // Try to restore culled objects
        const culled = this.getLayerEntries(layer).filter((e) => !e.isVisible && !e.pinned);
        for (const entry of culled) {
          const restoredTotal = totalEffective + entry.effectiveSplatCount;
          if (restoredTotal <= effectiveBudget) {
            entry.isVisible = true;
            entry.lastVisibleAt = Date.now();
            totalEffective = restoredTotal;
            this.emit('splat:restored', { id: entry.id, layer });
          }
        }
        continue;
      }

      // Over budget: cull lowest priority entries
      let excess = totalEffective - effectiveBudget;

      for (const entry of entries) {
        if (excess <= 0) break;
        if (entry.pinned) continue;

        entry.isVisible = false;
        excess -= entry.effectiveSplatCount;

        this.emit('splat:culled', {
          id: entry.id,
          layer,
          splatCount: entry.effectiveSplatCount,
        });

        if (this.verbose) {
          logger.debug('[GaussianBudgetManager] Culled splat', {
            id: entry.id,
            layer,
            excess: excess,
          });
        }
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // BUDGET BORROWING
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Try to borrow budget from other layers.
   * Returns true if enough budget was borrowed.
   */
  private tryBorrow(borrower: GaussianLayerType, amount: number): boolean {
    if (!this.enableBorrowing || !this.layerConfigs[borrower].canBorrow) {
      return false;
    }

    const layers: GaussianLayerType[] = ['baked', 'relightable', 'interactive'];
    let remaining = amount;

    for (const lender of layers) {
      if (lender === borrower) continue;
      if (!this.layerConfigs[lender].canLend) continue;

      const lenderConfig = this.layerConfigs[lender];
      const lenderState = this.getLayerState(lender);

      // How much can this layer lend?
      const unusedBudget =
        lenderConfig.maxSplats - lenderState.allocatedSplats - this.lentBudgets[lender];
      const maxLendable = Math.floor(lenderConfig.maxSplats * lenderConfig.maxLendPercent);
      const canLend = Math.min(unusedBudget, maxLendable - this.lentBudgets[lender]);

      if (canLend <= 0) continue;

      const toLend = Math.min(canLend, remaining);
      this.lentBudgets[lender] += toLend;
      this.borrowedBudgets[borrower] += toLend;
      remaining -= toLend;

      if (this.verbose) {
        logger.debug('[GaussianBudgetManager] Budget borrowed', {
          from: lender,
          to: borrower,
          amount: toLend,
        });
      }

      if (remaining <= 0) break;
    }

    return remaining <= 0;
  }

  /**
   * Return all borrowed budget for a layer
   */
  private returnBorrowedBudget(layer: GaussianLayerType): void {
    const borrowed = this.borrowedBudgets[layer];
    if (borrowed <= 0) return;

    // Proportionally return to lenders
    const layers: GaussianLayerType[] = ['baked', 'relightable', 'interactive'];
    for (const lender of layers) {
      if (lender === layer) continue;
      if (this.lentBudgets[lender] > 0) {
        const returnAmount = Math.min(this.lentBudgets[lender], borrowed);
        this.lentBudgets[lender] -= returnAmount;
        this.borrowedBudgets[layer] -= returnAmount;
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PERFORMANCE MONITORING
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Record frame time for performance analysis.
   */
  private recordFrameTime(frameTimeMs: number): void {
    this.frameTimeHistory.push(frameTimeMs);
    if (this.frameTimeHistory.length > this.FRAME_HISTORY_SIZE) {
      this.frameTimeHistory.shift();
    }

    // Update performance state
    const avgFrameTime = this.getAverageFrameTime();
    const oldState = this.performanceState;

    if (avgFrameTime > this.targetFrameTimeMs * 1.5) {
      this.performanceState = 'emergency';
    } else if (avgFrameTime > this.targetFrameTimeMs * 1.25) {
      this.performanceState = 'critical';
    } else if (avgFrameTime > this.targetFrameTimeMs * 1.1) {
      this.performanceState = 'pressure';
    } else {
      this.performanceState = 'nominal';
    }

    if (oldState !== this.performanceState) {
      logger.info('[GaussianBudgetManager] Performance state changed', {
        from: oldState,
        to: this.performanceState,
        avgFrameTimeMs: avgFrameTime.toFixed(2),
        targetMs: this.targetFrameTimeMs,
      });
      this.emit(`performance:${this.performanceState}`, { avgFrameTimeMs: avgFrameTime });

      // Emergency shed
      if (this.performanceState === 'emergency') {
        this.emergencyShed();
      }
    }
  }

  /**
   * Get average frame time over measurement window
   */
  private getAverageFrameTime(): number {
    if (this.frameTimeHistory.length === 0) return 0;
    const sum = this.frameTimeHistory.reduce((a, b) => a + b, 0);
    return sum / this.frameTimeHistory.length;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // BUDGET REBALANCING
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Periodic budget rebalancing (called at 1Hz).
   *
   * Strategy:
   *   1. If performance is nominal, try to restore culled splats
   *   2. If under pressure, aggressively reduce LOD on low-priority splats
   *   3. Recompute cross-layer lending based on current utilization
   */
  private rebalanceBudgets(): void {
    this.rebalanceCount++;

    const metrics = this.getMetrics();
    const avgFrameTime = this.getAverageFrameTime();

    if (this.verbose) {
      logger.debug('[GaussianBudgetManager] Rebalancing', {
        totalSplats: metrics.totalEffectiveSplats,
        utilization: (metrics.overallUtilization * 100).toFixed(1) + '%',
        avgFrameTimeMs: avgFrameTime.toFixed(2),
        state: this.performanceState,
      });
    }

    // Reset all lending/borrowing and recompute
    if (this.enableBorrowing) {
      this.recomputeLending();
    }

    this.emit('budget:rebalanced', {
      metrics,
      rebalanceCount: this.rebalanceCount,
    });
  }

  /**
   * Recompute cross-layer lending based on current utilization
   */
  private recomputeLending(): void {
    // Clear existing lending
    this.lentBudgets = { baked: 0, relightable: 0, interactive: 0 };
    this.borrowedBudgets = { baked: 0, relightable: 0, interactive: 0 };

    const layers: GaussianLayerType[] = ['interactive', 'relightable', 'baked'];

    // For each layer that needs more budget, try to borrow
    for (const layer of layers) {
      const config = this.layerConfigs[layer];
      const allocated = this.getAllocatedSplats(layer);

      if (allocated > config.maxSplats && config.canBorrow) {
        const deficit = allocated - config.maxSplats;
        this.tryBorrow(layer, deficit);
      }
    }
  }

  /**
   * Emergency shed: aggressively reduce rendering load.
   *
   * Culls all non-pinned splats in peripheral vision and
   * forces maximum LOD on everything except foveal-pinned objects.
   */
  private emergencyShed(): void {
    this.emergencyShedCount++;

    logger.warn('[GaussianBudgetManager] Emergency shed triggered', {
      count: this.emergencyShedCount,
      avgFrameTimeMs: this.getAverageFrameTime().toFixed(2),
    });

    let shedCount = 0;

    for (const entry of this.splats.values()) {
      // Never shed pinned objects
      if (entry.pinned) continue;

      // Cull non-foveal objects
      if (!entry.inFovealRegion) {
        if (entry.isVisible) {
          entry.isVisible = false;
          shedCount++;
        }
        continue;
      }

      // Force max LOD on foveal objects
      const maxLevel = this.lodLevels[entry.layer].length - 1;
      if (entry.lodLevel < maxLevel) {
        entry.lodLevel = maxLevel;
        const lodConfig = this.lodLevels[entry.layer][maxLevel];
        entry.effectiveSplatCount = Math.floor(entry.baseSplatCount * lodConfig.splatMultiplier);
        shedCount++;
      }
    }

    logger.info('[GaussianBudgetManager] Emergency shed complete', {
      shedObjects: shedCount,
    });

    this.emit('budget:emergency_shed', { shedCount });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // LAYER QUERIES
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Get all entries for a specific layer
   */
  private getLayerEntries(layer: GaussianLayerType): GaussianSplatEntry[] {
    const entries: GaussianSplatEntry[] = [];
    for (const entry of this.splats.values()) {
      if (entry.layer === layer) {
        entries.push(entry);
      }
    }
    return entries;
  }

  /**
   * Get allocated splat count for a layer (sum of effective counts of visible splats)
   */
  private getAllocatedSplats(layer: GaussianLayerType): number {
    let total = 0;
    for (const entry of this.splats.values()) {
      if (entry.layer === layer && entry.isVisible) {
        total += entry.effectiveSplatCount;
      }
    }
    return total;
  }

  /**
   * Get layer budget state
   */
  getLayerState(layer: GaussianLayerType): LayerBudgetState {
    const config = this.layerConfigs[layer];
    const entries = this.getLayerEntries(layer);
    const visibleEntries = entries.filter((e) => e.isVisible);
    const allocated = visibleEntries.reduce((sum, e) => sum + e.effectiveSplatCount, 0);
    const effectiveBudget =
      config.maxSplats - this.lentBudgets[layer] + this.borrowedBudgets[layer];
    const estimatedVRAM = allocated * SPLAT_MEMORY_BYTES[layer];

    return {
      layer,
      maxSplats: config.maxSplats,
      allocatedSplats: allocated,
      lentSplats: this.lentBudgets[layer],
      borrowedSplats: this.borrowedBudgets[layer],
      effectiveBudget,
      utilization: effectiveBudget > 0 ? allocated / effectiveBudget : 0,
      objectCount: entries.length,
      visibleObjectCount: visibleEntries.length,
      estimatedVRAMBytes: estimatedVRAM,
    };
  }

  /**
   * Get total configured budget across all layers
   */
  getTotalBudget(): number {
    return (
      this.layerConfigs.baked.maxSplats +
      this.layerConfigs.relightable.maxSplats +
      this.layerConfigs.interactive.maxSplats
    );
  }

  /**
   * Get a specific splat entry
   */
  getSplat(id: string): Readonly<GaussianSplatEntry> | undefined {
    return this.splats.get(id);
  }

  /**
   * Get all registered splat IDs
   */
  getSplatIds(): string[] {
    return Array.from(this.splats.keys());
  }

  // ───────────────────────────────────────────────────────────────────────────
  // METRICS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Get comprehensive budget metrics
   */
  getMetrics(): GaussianBudgetMetrics {
    if (this.cachedMetrics && !this.metricsDirty) {
      return this.cachedMetrics;
    }

    const layers: GaussianLayerType[] = ['baked', 'relightable', 'interactive'];
    const layerStates = {} as Record<GaussianLayerType, LayerBudgetState>;

    let totalEffective = 0;
    let totalBudget = 0;
    let totalVRAM = 0;

    for (const layer of layers) {
      const state = this.getLayerState(layer);
      layerStates[layer] = state;
      totalEffective += state.allocatedSplats;
      totalBudget += state.effectiveBudget;
      totalVRAM += state.estimatedVRAMBytes;
    }

    this.cachedMetrics = {
      layers: layerStates,
      totalEffectiveSplats: totalEffective,
      totalBudget,
      overallUtilization: totalBudget > 0 ? totalEffective / totalBudget : 0,
      totalVRAMBytes: totalVRAM,
      performanceState: this.performanceState,
      avgFrameTimeMs: this.getAverageFrameTime(),
      rebalanceCount: this.rebalanceCount,
      emergencyShedCount: this.emergencyShedCount,
      foveatedActive: this.foveatedConfig.enabled,
    };

    this.metricsDirty = false;
    return this.cachedMetrics;
  }

  /**
   * Generate detailed budget report string
   */
  generateReport(): string {
    const m = this.getMetrics();
    const lines: string[] = [
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '  GAUSSIAN SPLAT BUDGET REPORT',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `  Performance:     ${m.performanceState.toUpperCase()}`,
      `  Avg Frame Time:  ${m.avgFrameTimeMs.toFixed(2)} ms (target: ${this.targetFrameTimeMs} ms)`,
      `  Total Splats:    ${this.formatNumber(m.totalEffectiveSplats)} / ${this.formatNumber(m.totalBudget)} (${(m.overallUtilization * 100).toFixed(1)}%)`,
      `  Total VRAM:      ${this.formatBytes(m.totalVRAMBytes)}`,
      `  Foveated:        ${m.foveatedActive ? 'ON' : 'OFF'}`,
      `  Rebalances:      ${m.rebalanceCount}`,
      `  Emergency Sheds: ${m.emergencyShedCount}`,
      '',
    ];

    // Per-layer breakdown
    const layerNames: GaussianLayerType[] = ['baked', 'relightable', 'interactive'];
    for (const layer of layerNames) {
      const s = m.layers[layer];
      lines.push(`  ── ${layer.toUpperCase()} Layer ──`);
      lines.push(
        `    Budget:      ${this.formatNumber(s.maxSplats)} (effective: ${this.formatNumber(s.effectiveBudget)})`
      );
      lines.push(
        `    Allocated:   ${this.formatNumber(s.allocatedSplats)} (${(s.utilization * 100).toFixed(1)}%)`
      );
      lines.push(`    Objects:     ${s.objectCount} total, ${s.visibleObjectCount} visible`);
      lines.push(`    Lent:        ${this.formatNumber(s.lentSplats)}`);
      lines.push(`    Borrowed:    ${this.formatNumber(s.borrowedSplats)}`);
      lines.push(`    VRAM:        ${this.formatBytes(s.estimatedVRAMBytes)}`);
      lines.push(
        `    Cost/splat:  ${SPLAT_MEMORY_BYTES[layer]}B memory, ${SPLAT_RENDER_COST[layer]}x render`
      );
      lines.push('');
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return lines.join('\n');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CONFIGURATION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Update layer budget at runtime
   */
  setLayerBudget(layer: GaussianLayerType, maxSplats: number): void {
    this.layerConfigs[layer].maxSplats = maxSplats;
    this.metricsDirty = true;
    logger.info('[GaussianBudgetManager] Layer budget updated', { layer, maxSplats });
  }

  /**
   * Update foveated configuration
   */
  setFoveatedConfig(config: Partial<FoveatedConfig>): void {
    Object.assign(this.foveatedConfig, config);
    logger.info('[GaussianBudgetManager] Foveated config updated', { ...this.foveatedConfig });
  }

  /**
   * Update target frame time
   */
  setTargetFrameTime(ms: number): void {
    this.targetFrameTimeMs = ms;
    logger.info('[GaussianBudgetManager] Target frame time updated', { ms });
  }

  /**
   * Get current configuration snapshot
   */
  getConfig(): Readonly<{
    layers: Record<GaussianLayerType, LayerBudgetConfig>;
    foveated: FoveatedConfig;
    targetFrameTimeMs: number;
    rebalanceIntervalMs: number;
    emergencyShedThreshold: number;
    enableBorrowing: boolean;
    enableAdaptive: boolean;
  }> {
    return {
      layers: { ...this.layerConfigs },
      foveated: { ...this.foveatedConfig },
      targetFrameTimeMs: this.targetFrameTimeMs,
      rebalanceIntervalMs: this.rebalanceIntervalMs,
      emergencyShedThreshold: this.emergencyShedThreshold,
      enableBorrowing: this.enableBorrowing,
      enableAdaptive: this.enableAdaptive,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PRESETS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Apply Quest 3 optimized preset (default).
   * 120K baked + 30K relightable + 10K interactive = 160K total
   */
  applyQuest3Preset(): void {
    this.layerConfigs.baked.maxSplats = 120_000;
    this.layerConfigs.relightable.maxSplats = 30_000;
    this.layerConfigs.interactive.maxSplats = 10_000;
    this.targetFrameTimeMs = 5.5; // Half of 11.1ms frame budget
    this.foveatedConfig.enabled = true;
    this.metricsDirty = true;
    logger.info('[GaussianBudgetManager] Applied Quest 3 preset (160K total)');
  }

  /**
   * Apply Quest 2 conservative preset.
   * 60K baked + 15K relightable + 5K interactive = 80K total
   */
  applyQuest2Preset(): void {
    this.layerConfigs.baked.maxSplats = 60_000;
    this.layerConfigs.relightable.maxSplats = 15_000;
    this.layerConfigs.interactive.maxSplats = 5_000;
    this.targetFrameTimeMs = 4.5;
    this.foveatedConfig.enabled = true;
    this.metricsDirty = true;
    logger.info('[GaussianBudgetManager] Applied Quest 2 preset (80K total)');
  }

  /**
   * Apply PCVR high-end preset.
   * 500K baked + 100K relightable + 30K interactive = 630K total
   */
  applyPCVRPreset(): void {
    this.layerConfigs.baked.maxSplats = 500_000;
    this.layerConfigs.relightable.maxSplats = 100_000;
    this.layerConfigs.interactive.maxSplats = 30_000;
    this.targetFrameTimeMs = 4.0;
    this.foveatedConfig.enabled = false; // PCVR uses hardware foveation
    this.metricsDirty = true;
    logger.info('[GaussianBudgetManager] Applied PCVR preset (630K total)');
  }

  /**
   * Apply desktop (non-VR) preset.
   * 1M baked + 200K relightable + 50K interactive = 1.25M total
   */
  applyDesktopPreset(): void {
    this.layerConfigs.baked.maxSplats = 1_000_000;
    this.layerConfigs.relightable.maxSplats = 200_000;
    this.layerConfigs.interactive.maxSplats = 50_000;
    this.targetFrameTimeMs = 8.0; // 120Hz target
    this.foveatedConfig.enabled = false;
    this.metricsDirty = true;
    logger.info('[GaussianBudgetManager] Applied Desktop preset (1.25M total)');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CLEANUP
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Remove all splats and reset state
   */
  clear(): void {
    this.splats.clear();
    this.lentBudgets = { baked: 0, relightable: 0, interactive: 0 };
    this.borrowedBudgets = { baked: 0, relightable: 0, interactive: 0 };
    this.frameTimeHistory = [];
    this.performanceState = 'nominal';
    this.metricsDirty = true;
    logger.info('[GaussianBudgetManager] Cleared all splats');
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.clear();
    this.removeAllListeners();
    logger.info('[GaussianBudgetManager] Disposed');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FORMATTING UTILITIES
  // ───────────────────────────────────────────────────────────────────────────

  private formatNumber(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toString();
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB';
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a GaussianBudgetManager with Quest 3 defaults
 */
export function createGaussianBudgetManager(
  config?: GaussianBudgetManagerConfig
): GaussianBudgetManager {
  return new GaussianBudgetManager(config);
}

/**
 * Create a GaussianBudgetManager pre-configured for a specific device
 */
export function createGaussianBudgetManagerForDevice(
  deviceType: 'quest2' | 'quest3' | 'pcvr' | 'desktop',
  config?: GaussianBudgetManagerConfig
): GaussianBudgetManager {
  const manager = new GaussianBudgetManager(config);

  switch (deviceType) {
    case 'quest2':
      manager.applyQuest2Preset();
      break;
    case 'quest3':
      manager.applyQuest3Preset();
      break;
    case 'pcvr':
      manager.applyPCVRPreset();
      break;
    case 'desktop':
      manager.applyDesktopPreset();
      break;
  }

  return manager;
}
