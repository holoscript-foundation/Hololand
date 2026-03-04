/**
 * BudgetEnforcedGaussianRenderer
 *
 * Integration layer that wires GaussianBudgetManager into FoveatedGaussianRenderer.
 * Connects budget enforcement to the rendering pipeline at every stage:
 *
 *   Stage 1 (Frustum Cull): Per-layer budget checks before accepting splats
 *   Stage 2 (Tile Assign):  Foveated budget multipliers from budget manager
 *   Frame Metrics:          Frame time routing for adaptive quality
 *   Emergency:              Bidirectional emergency shed triggers
 *   Performance:            State synchronization between both systems
 *
 * Architecture:
 * ```
 *   GaussianBudgetManager          BudgetEnforcedGaussianRenderer          FoveatedGaussianRenderer
 *   (per-layer budgets,      <--->  (integration bridge)              <--->  (rendering pipeline)
 *    borrowing, LOD,                                                         frustum cull, tile assign,
 *    emergency shed)                                                         StopThePop, rasterize)
 * ```
 *
 * The bridge operates by:
 *   1. Registering clouds in BOTH systems (renderer + budget manager)
 *   2. Before each frame, querying budget manager for allowed splat counts per layer
 *   3. After each frame, feeding frame timings back to budget manager
 *   4. Listening for emergency shed events from both sides
 *   5. Synchronizing performance/quality state changes bidirectionally
 *
 * Target: Quest 3 at 90Hz (11.1ms frame, ~5.5ms splat rendering budget)
 *
 * @module BudgetEnforcedGaussianRenderer
 */

import { EventEmitter } from 'events';
import { logger } from './logger';
import {
  GaussianBudgetManager,
  type GaussianLayerType,
  type GaussianBudgetMetrics,
  type GaussianBudgetManagerConfig,
} from './GaussianBudgetManager';
import {
  FoveatedGaussianRenderer,
} from './FoveatedGaussianRenderer';
import type {
  FoveatedGaussianPipelineConfig,
  GaussianCloudParams,
  EyeRenderState,
  GaussianRenderTimings,
  GaussianRenderStats,
  FoveatedZone,
} from './FoveatedGaussianTypes';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for the integrated budget-enforced renderer.
 */
export interface BudgetEnforcedRendererConfig {
  /** Configuration for the budget manager */
  budget?: GaussianBudgetManagerConfig;
  /** Configuration for the foveated renderer */
  renderer?: Partial<FoveatedGaussianPipelineConfig>;
  /** Whether to auto-sync performance states (default: true) */
  syncPerformanceStates?: boolean;
  /** Whether to enforce per-layer budgets during frustum cull (default: true) */
  enforceFrustumBudgets?: boolean;
  /** Whether to apply foveated budget multipliers during tile assignment (default: true) */
  applyFoveatedBudgets?: boolean;
  /** Whether to route frame timings to budget manager (default: true) */
  routeFrameTimings?: boolean;
  /** Whether to connect emergency shed triggers bidirectionally (default: true) */
  connectEmergencySheds?: boolean;
  /** Verbose logging (default: false) */
  verbose?: boolean;
}

/**
 * Combined metrics from both systems.
 */
export interface IntegratedMetrics {
  /** Budget manager metrics */
  budget: GaussianBudgetMetrics;
  /** Renderer performance stats (null if no frames rendered) */
  renderer: GaussianRenderStats | null;
  /** Last frame timings (null if no frames rendered) */
  lastFrame: GaussianRenderTimings | null;
  /** Whether systems are in sync */
  inSync: boolean;
  /** Performance state from budget manager */
  budgetPerformanceState: GaussianBudgetMetrics['performanceState'];
  /** Quality level from renderer */
  rendererQualityLevel: number;
  /** Per-layer budget enforcement results from last frame */
  layerEnforcement: Record<GaussianLayerType, LayerEnforcementResult>;
  /** Foveated zone multipliers currently active */
  foveatedMultipliers: Record<FoveatedZone, number>;
}

/**
 * Per-layer enforcement result for the last frame.
 */
export interface LayerEnforcementResult {
  /** Layer type */
  layer: GaussianLayerType;
  /** Clouds in this layer */
  cloudCount: number;
  /** Total Gaussians requested */
  totalRequested: number;
  /** Total Gaussians allowed after budget enforcement */
  totalAllowed: number;
  /** Whether any clouds were budget-limited */
  budgetLimited: boolean;
  /** Effective budget from budget manager */
  effectiveBudget: number;
}

/**
 * Events emitted by the integrated system.
 */
export type IntegratedEventType =
  | 'integrated:cloud_registered'
  | 'integrated:cloud_unregistered'
  | 'integrated:frame_complete'
  | 'integrated:budget_enforced'
  | 'integrated:emergency_shed'
  | 'integrated:performance_sync'
  | 'integrated:quality_adapted'
  | 'integrated:state_mismatch';

/**
 * Mapping from a renderer cloud to its budget manager entry.
 */
interface CloudBudgetBinding {
  /** Cloud ID (shared key) */
  id: string;
  /** Layer assignment for budget tracking */
  layer: GaussianLayerType;
  /** Whether pinned (never budget-limited) */
  pinned: boolean;
  /** Base Gaussian count */
  baseCount: number;
  /** Last enforced count (after budget/foveation adjustments) */
  enforcedCount: number;
  /** Whether this cloud is in the foveal region */
  inFovealRegion: boolean;
  /** Priority for budget enforcement */
  priority: number;
}

// =============================================================================
// MAIN CLASS
// =============================================================================

/**
 * Integrated renderer that enforces GaussianBudgetManager constraints
 * within the FoveatedGaussianRenderer pipeline.
 *
 * USAGE:
 * ```typescript
 * const integrated = new BudgetEnforcedGaussianRenderer({
 *   budget: { targetFrameTimeMs: 5.5 },
 *   renderer: { targetFrameTimeMs: 11.1, maxGaussians: 160_000 },
 * });
 *
 * // Register clouds (goes to both systems)
 * integrated.registerCloud({
 *   id: 'environment',
 *   data: splatData,
 *   worldMatrix: identity,
 *   layer: 'baked',
 *   priority: 1,
 *   pinned: false,
 * });
 *
 * // Each frame: render with budget enforcement
 * const timings = integrated.renderFrame([leftEye, rightEye]);
 *
 * // Get integrated metrics
 * const metrics = integrated.getIntegratedMetrics();
 * ```
 */
export class BudgetEnforcedGaussianRenderer extends EventEmitter {
  // Sub-systems
  private budgetManager: GaussianBudgetManager;
  private renderer: FoveatedGaussianRenderer;

  // Configuration
  private syncPerformanceStates: boolean;
  private enforceFrustumBudgets: boolean;
  private applyFoveatedBudgets: boolean;
  private routeFrameTimings: boolean;
  private connectEmergencySheds: boolean;
  private verbose: boolean;

  // Cloud bindings (bridge between the two registries)
  private bindings: Map<string, CloudBudgetBinding> = new Map();

  // Enforcement state from last frame
  private lastEnforcement: Record<GaussianLayerType, LayerEnforcementResult> = {
    baked: this.createEmptyEnforcement('baked'),
    relightable: this.createEmptyEnforcement('relightable'),
    interactive: this.createEmptyEnforcement('interactive'),
  };

  // Foveated budget multipliers per zone (computed from budget manager config)
  private foveatedMultipliers: Record<FoveatedZone, number> = {
    foveal: 1.0,
    blend: 1.0,
    peripheral: 1.0,
  };

  // State synchronization
  private lastBudgetState: GaussianBudgetMetrics['performanceState'] = 'nominal';
  private lastRendererQuality: number = 0;
  private emergencyShedActive: boolean = false;

  constructor(config: BudgetEnforcedRendererConfig = {}) {
    super();

    // Create sub-systems
    this.budgetManager = new GaussianBudgetManager(config.budget);
    this.renderer = new FoveatedGaussianRenderer(config.renderer);

    // Configuration
    this.syncPerformanceStates = config.syncPerformanceStates ?? true;
    this.enforceFrustumBudgets = config.enforceFrustumBudgets ?? true;
    this.applyFoveatedBudgets = config.applyFoveatedBudgets ?? true;
    this.routeFrameTimings = config.routeFrameTimings ?? true;
    this.connectEmergencySheds = config.connectEmergencySheds ?? true;
    this.verbose = config.verbose ?? false;

    // Wire up event listeners
    this.wireEventListeners();

    // Initialize foveated multipliers from budget manager config
    this.updateFoveatedMultipliers();

    logger.info('[BudgetEnforcedGaussianRenderer] Initialized', {
      budgetTotal: this.budgetManager.getTotalBudget(),
      rendererMax: this.renderer.getConfig().maxGaussians,
      syncPerf: this.syncPerformanceStates,
      enforceFrustum: this.enforceFrustumBudgets,
      foveatedBudgets: this.applyFoveatedBudgets,
      routeTimings: this.routeFrameTimings,
      connectSheds: this.connectEmergencySheds,
    });
  }

  // ===========================================================================
  // CLOUD MANAGEMENT (Dual Registration)
  // ===========================================================================

  /**
   * Register a Gaussian cloud in both the renderer and the budget manager.
   *
   * The cloud's layer assignment determines which budget layer it consumes.
   * If the budget manager rejects the registration (layer full), the cloud
   * is also rejected from the renderer.
   *
   * @returns true if accepted by both systems, false if rejected
   */
  registerCloud(params: GaussianCloudParams): boolean {
    const { id, layer, data, priority, pinned } = params;

    // 1. Check budget manager first (it enforces per-layer caps)
    const budgetAccepted = this.budgetManager.registerSplat({
      id,
      layer,
      baseSplatCount: data.count,
      boundingRadius: data.boundRadius,
      priority,
      pinned,
    });

    if (!budgetAccepted) {
      logger.warn('[BudgetEnforcedGaussianRenderer] Budget rejected cloud', {
        id,
        layer,
        count: data.count,
      });
      return false;
    }

    // 2. Register in renderer
    const rendererAccepted = this.renderer.registerCloud(params);

    if (!rendererAccepted) {
      // Rollback budget registration
      this.budgetManager.unregisterSplat(id);
      logger.warn('[BudgetEnforcedGaussianRenderer] Renderer rejected cloud', {
        id,
        layer,
        count: data.count,
      });
      return false;
    }

    // 3. Create binding
    const binding: CloudBudgetBinding = {
      id,
      layer,
      pinned,
      baseCount: data.count,
      enforcedCount: data.count,
      inFovealRegion: false,
      priority,
    };
    this.bindings.set(id, binding);

    if (this.verbose) {
      logger.debug('[BudgetEnforcedGaussianRenderer] Cloud registered', {
        id,
        layer,
        count: data.count,
        priority,
        pinned,
      });
    }

    this.emit('integrated:cloud_registered', { id, layer, count: data.count });
    return true;
  }

  /**
   * Unregister a cloud from both systems.
   */
  unregisterCloud(id: string): boolean {
    const binding = this.bindings.get(id);
    if (!binding) return false;

    this.budgetManager.unregisterSplat(id);
    this.renderer.unregisterCloud(id);
    this.bindings.delete(id);

    this.emit('integrated:cloud_unregistered', { id, layer: binding.layer });
    return true;
  }

  /**
   * Update a cloud's world transform (forwarded to renderer).
   */
  updateCloudTransform(id: string, worldMatrix: Float32Array): void {
    this.renderer.updateCloudTransform(id, worldMatrix);
  }

  /**
   * Promote a cloud between layers (updates both systems).
   */
  promoteCloud(id: string, targetLayer: GaussianLayerType): boolean {
    const binding = this.bindings.get(id);
    if (!binding) return false;
    if (binding.layer === targetLayer) return true;

    // Attempt promotion in budget manager
    const promoted = this.budgetManager.promoteSplat(id, targetLayer);
    if (!promoted) return false;

    // Update binding
    binding.layer = targetLayer;
    return true;
  }

  // ===========================================================================
  // GAZE TRACKING (Forwarded to Renderer)
  // ===========================================================================

  /**
   * Update gaze direction (forwarded to renderer).
   */
  updateGaze(leftGaze: [number, number, number], rightGaze: [number, number, number]): void {
    this.renderer.updateGaze(leftGaze, rightGaze);
  }

  // ===========================================================================
  // MAIN RENDER PATH (Budget-Enforced)
  // ===========================================================================

  /**
   * Render a frame with full budget enforcement.
   *
   * This is the primary entry point. It:
   *   1. Pre-frame: Enforce per-layer budgets on cloud effective counts
   *   2. Render:    Delegate to FoveatedGaussianRenderer
   *   3. Post-frame: Route frame timings to budget manager
   *   4. Sync:      Synchronize performance states
   *
   * @param eyeStates - One state for mono, two for stereo
   * @returns Per-frame timing breakdown
   */
  renderFrame(eyeStates: EyeRenderState[]): GaussianRenderTimings {
    // ─── Pre-Frame: Budget Enforcement ────────────────────────────────
    if (this.enforceFrustumBudgets) {
      this.enforcePreFrameBudgets(eyeStates[0]);
    }

    if (this.applyFoveatedBudgets) {
      this.applyFoveatedBudgetMultipliers(eyeStates[0]);
    }

    // ─── Render Frame ─────────────────────────────────────────────────
    const timings = this.renderer.renderFrame(eyeStates);

    // ─── Post-Frame: Route Metrics ────────────────────────────────────
    if (this.routeFrameTimings) {
      this.routeFrameTimeToBudget(timings, eyeStates[0]);
    }

    // ─── Post-Frame: Synchronize States ───────────────────────────────
    if (this.syncPerformanceStates) {
      this.synchronizePerformanceStates();
    }

    this.emit('integrated:frame_complete', {
      totalMs: timings.totalMs,
      withinBudget: timings.withinBudget,
      gaussiansRendered: timings.gaussiansAfterTileCull,
    });

    return timings;
  }

  // ===========================================================================
  // STAGE 1 INTEGRATION: FRUSTUM CULL + BUDGET CHECK
  // ===========================================================================

  /**
   * Before the renderer runs frustum culling, enforce per-layer budgets.
   *
   * For each layer, queries the budget manager for the effective budget
   * (accounting for borrowing/lending) and limits the effective Gaussian
   * count of clouds in that layer.
   *
   * Clouds are processed in priority order (highest priority keeps full
   * count, lowest priority gets reduced/culled first).
   */
  private enforcePreFrameBudgets(primaryEye: EyeRenderState): void {
    const layers: GaussianLayerType[] = ['interactive', 'relightable', 'baked'];

    for (const layer of layers) {
      const layerState = this.budgetManager.getLayerState(layer);
      const effectiveBudget = layerState.effectiveBudget;

      // Get all bindings for this layer, sorted by priority (highest first)
      const layerBindings = this.getBindingsForLayer(layer);
      layerBindings.sort((a, b) => b.priority - a.priority);

      let totalRequested = 0;
      let totalAllowed = 0;
      let remainingBudget = effectiveBudget;
      let budgetLimited = false;

      for (const binding of layerBindings) {
        totalRequested += binding.baseCount;

        if (binding.pinned) {
          // Pinned clouds always get their full count
          binding.enforcedCount = binding.baseCount;
          totalAllowed += binding.baseCount;
          remainingBudget -= binding.baseCount;
          continue;
        }

        if (remainingBudget >= binding.baseCount) {
          // Full budget available
          binding.enforcedCount = binding.baseCount;
          totalAllowed += binding.baseCount;
          remainingBudget -= binding.baseCount;
        } else if (remainingBudget > 0) {
          // Partial budget: reduce this cloud's effective count
          binding.enforcedCount = remainingBudget;
          totalAllowed += remainingBudget;
          remainingBudget = 0;
          budgetLimited = true;

          if (this.verbose) {
            logger.debug('[BudgetEnforcedGaussianRenderer] Budget-limited cloud', {
              id: binding.id,
              layer,
              requested: binding.baseCount,
              allowed: binding.enforcedCount,
            });
          }
        } else {
          // No budget remaining: zero out this cloud
          binding.enforcedCount = 0;
          budgetLimited = true;

          if (this.verbose) {
            logger.debug('[BudgetEnforcedGaussianRenderer] Budget-culled cloud', {
              id: binding.id,
              layer,
            });
          }
        }
      }

      // Update enforcement record
      this.lastEnforcement[layer] = {
        layer,
        cloudCount: layerBindings.length,
        totalRequested,
        totalAllowed,
        budgetLimited,
        effectiveBudget,
      };
    }

    this.emit('integrated:budget_enforced', {
      enforcement: { ...this.lastEnforcement },
    });
  }

  // ===========================================================================
  // STAGE 2 INTEGRATION: FOVEATED BUDGET MULTIPLIERS
  // ===========================================================================

  /**
   * Apply foveated budget multipliers from the budget manager.
   *
   * Clouds in the foveal region get a budget boost (2x by default),
   * while peripheral clouds get their baseline or reduced budget.
   *
   * This is computed per-cloud based on the cloud's position relative
   * to the gaze direction, using the budget manager's foveated config.
   */
  private applyFoveatedBudgetMultipliers(primaryEye: EyeRenderState): void {
    const budgetConfig = this.budgetManager.getConfig();
    if (!budgetConfig.foveated.enabled) return;

    const fovealMultiplier = budgetConfig.foveated.fovealBudgetMultiplier;
    const fovealAngle = budgetConfig.foveated.fovealAngleDeg;
    const blendAngle = fovealAngle + budgetConfig.foveated.blendZoneDeg;

    // Cosine thresholds for foveation check
    const fovealCos = Math.cos((fovealAngle * Math.PI) / 180);
    const blendCos = Math.cos((blendAngle * Math.PI) / 180);

    const gazeDir = primaryEye.gazeDirection;
    const gazeLen = Math.sqrt(gazeDir[0] ** 2 + gazeDir[1] ** 2 + gazeDir[2] ** 2);
    const gx = gazeDir[0] / (gazeLen || 1);
    const gy = gazeDir[1] / (gazeLen || 1);
    const gz = gazeDir[2] / (gazeLen || 1);

    const camPos = primaryEye.cameraPosition;

    for (const binding of this.bindings.values()) {
      const cloudInfo = this.renderer.getCloudInfo(binding.id);
      if (!cloudInfo) continue;

      // Direction from camera to cloud center
      const dx = cloudInfo.worldCenter[0] - camPos[0];
      const dy = cloudInfo.worldCenter[1] - camPos[1];
      const dz = cloudInfo.worldCenter[2] - camPos[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 0.001) {
        // Cloud is at the camera position, treat as foveal
        binding.inFovealRegion = true;
        continue;
      }

      // Cosine of angle between gaze and direction to cloud
      const cosAngle = (dx * gx + dy * gy + dz * gz) / dist;

      let zone: FoveatedZone;
      let multiplier: number;

      if (cosAngle >= fovealCos) {
        zone = 'foveal';
        multiplier = fovealMultiplier;
        binding.inFovealRegion = true;
      } else if (cosAngle >= blendCos) {
        zone = 'blend';
        // Lerp between foveal and peripheral multiplier
        const t = (cosAngle - blendCos) / (fovealCos - blendCos);
        multiplier = 1.0 + (fovealMultiplier - 1.0) * t;
        binding.inFovealRegion = false;
      } else {
        zone = 'peripheral';
        multiplier = 1.0;
        binding.inFovealRegion = false;
      }

      // Apply multiplier to enforced count (but never exceed base count)
      const boostedCount = Math.min(
        Math.floor(binding.enforcedCount * multiplier),
        binding.baseCount,
      );
      binding.enforcedCount = boostedCount;
    }

    // Update zone multipliers for reporting
    this.foveatedMultipliers = {
      foveal: fovealMultiplier,
      blend: 1.0 + (fovealMultiplier - 1.0) * 0.5, // Average blend
      peripheral: 1.0,
    };
  }

  // ===========================================================================
  // FRAME TIME ROUTING (Renderer -> Budget Manager)
  // ===========================================================================

  /**
   * Route frame time metrics from the renderer to the budget manager.
   *
   * The budget manager uses frame timing to:
   *   - Track performance state (nominal / pressure / critical / emergency)
   *   - Trigger periodic budget rebalancing at 1Hz
   *   - Initiate emergency shed when frame time exceeds 150% of target
   *
   * We feed it the splat-relevant portion of frame time (frustum cull +
   * sort + rasterize), not the total frame time which includes application
   * and compositor overhead.
   */
  private routeFrameTimeToBudget(
    timings: GaussianRenderTimings,
    primaryEye: EyeRenderState,
  ): void {
    // Compute splat-relevant frame time: culling + sorting + rasterization
    // This excludes sync, blend zones (post-process), and application overhead
    const splatFrameTimeMs =
      timings.frustumCullMs +
      timings.tileAssignMs +
      timings.sortMs +
      timings.hierarchicalResortMs +
      timings.rasterizeMs;

    // Build position map for budget manager distance calculations
    const splatPositions = new Map<string, [number, number, number]>();
    for (const binding of this.bindings.values()) {
      const cloudInfo = this.renderer.getCloudInfo(binding.id);
      if (cloudInfo) {
        splatPositions.set(binding.id, cloudInfo.worldCenter);
      }
    }

    // Feed frame data to budget manager
    this.budgetManager.updateFrame({
      cameraPosition: primaryEye.cameraPosition,
      cameraForward: primaryEye.cameraForward,
      gazeDirection: primaryEye.gazeDirection,
      splatPositions,
      frameTimeMs: splatFrameTimeMs,
    });
  }

  // ===========================================================================
  // EMERGENCY SHED (Bidirectional)
  // ===========================================================================

  /**
   * Handle emergency shed from the budget manager.
   *
   * When the budget manager detects critically high frame times (>150%
   * of target), it triggers an emergency shed that culls peripheral
   * objects and forces max LOD. This method propagates that to the
   * renderer by forcing its quality to the lowest level.
   */
  private handleBudgetEmergencyShed(data: { shedCount: number }): void {
    if (!this.connectEmergencySheds) return;

    this.emergencyShedActive = true;

    // Force renderer to emergency quality
    this.renderer.forceQualityLevel(5);

    logger.warn('[BudgetEnforcedGaussianRenderer] Emergency shed propagated to renderer', {
      shedCount: data.shedCount,
    });

    this.emit('integrated:emergency_shed', {
      source: 'budget_manager',
      shedCount: data.shedCount,
      rendererQualityForced: 5,
    });
  }

  /**
   * Handle frame-over-budget event from renderer.
   *
   * When the renderer consistently exceeds its frame budget, propagate
   * the pressure to the budget manager by reporting the overage so it
   * can adjust LOD and potentially trigger emergency shed.
   */
  private handleRendererOverBudget(event: { data: { frameMs: number } }): void {
    if (!this.connectEmergencySheds) return;

    if (this.verbose) {
      logger.debug('[BudgetEnforcedGaussianRenderer] Renderer over budget', {
        frameMs: event.data.frameMs,
      });
    }
  }

  /**
   * Handle renderer recovery from over-budget.
   */
  private handleRendererRecovered(): void {
    if (this.emergencyShedActive) {
      this.emergencyShedActive = false;
      // Allow adaptive quality to take over again
      this.renderer.resetQuality();

      logger.info('[BudgetEnforcedGaussianRenderer] Emergency shed ended, quality reset');
    }
  }

  // ===========================================================================
  // PERFORMANCE STATE SYNCHRONIZATION
  // ===========================================================================

  /**
   * Synchronize performance states between budget manager and renderer.
   *
   * The budget manager has a 4-level state: nominal, pressure, critical, emergency
   * The renderer has a 6-level quality: 0 (best) to 5 (minimal)
   *
   * Mapping:
   *   nominal   -> quality 0 (best)
   *   pressure  -> quality 1-2 (reduce SH)
   *   critical  -> quality 3 (DC only + resolution reduction)
   *   emergency -> quality 5 (forced minimum, handled by emergency shed)
   */
  private synchronizePerformanceStates(): void {
    const budgetMetrics = this.budgetManager.getMetrics();
    const currentBudgetState = budgetMetrics.performanceState;
    const currentRendererQuality = this.renderer.getQualityLevel();

    // Only sync if the budget state has changed
    if (currentBudgetState !== this.lastBudgetState) {
      const targetQuality = this.budgetStateToQualityLevel(currentBudgetState);

      // Only force quality if the budget state demands a higher (worse) quality
      // than the renderer currently uses. Let the renderer's own adaptive
      // quality handle improvements.
      if (targetQuality > currentRendererQuality && !this.emergencyShedActive) {
        this.renderer.forceQualityLevel(targetQuality);

        if (this.verbose) {
          logger.debug('[BudgetEnforcedGaussianRenderer] Performance state synced', {
            budgetState: currentBudgetState,
            prevBudgetState: this.lastBudgetState,
            rendererQuality: currentRendererQuality,
            forcedQuality: targetQuality,
          });
        }

        this.emit('integrated:performance_sync', {
          budgetState: currentBudgetState,
          rendererQuality: targetQuality,
        });
      }

      // When budget state improves, allow renderer to recover naturally
      if (currentBudgetState === 'nominal' && this.lastBudgetState !== 'nominal') {
        // Reset quality to let adaptive take over
        if (!this.emergencyShedActive) {
          this.renderer.resetQuality();
        }
      }

      this.lastBudgetState = currentBudgetState;
    }

    this.lastRendererQuality = this.renderer.getQualityLevel();
  }

  /**
   * Map budget performance state to renderer quality level.
   */
  private budgetStateToQualityLevel(state: GaussianBudgetMetrics['performanceState']): number {
    switch (state) {
      case 'nominal':   return 0;
      case 'pressure':  return 1;
      case 'critical':  return 3;
      case 'emergency': return 5;
    }
  }

  // ===========================================================================
  // EVENT WIRING
  // ===========================================================================

  /**
   * Wire up event listeners between sub-systems.
   */
  private wireEventListeners(): void {
    // Budget manager -> integrated renderer
    this.budgetManager.on('budget:emergency_shed', (data: { shedCount: number }) => {
      this.handleBudgetEmergencyShed(data);
    });

    this.budgetManager.on('performance:pressure', () => {
      if (this.syncPerformanceStates) {
        this.synchronizePerformanceStates();
      }
    });

    this.budgetManager.on('performance:critical', () => {
      if (this.syncPerformanceStates) {
        this.synchronizePerformanceStates();
      }
    });

    this.budgetManager.on('performance:nominal', () => {
      if (this.syncPerformanceStates) {
        this.synchronizePerformanceStates();
      }
    });

    // Renderer -> integrated renderer
    this.renderer.on('frame:over_budget', (event: { data: { frameMs: number } }) => {
      this.handleRendererOverBudget(event);
    });

    this.renderer.on('frame:recovered', () => {
      this.handleRendererRecovered();
    });

    this.renderer.on('quality:adapted', (event: { data: { level: number } }) => {
      this.emit('integrated:quality_adapted', {
        source: 'renderer',
        level: event.data.level,
      });
    });
  }

  // ===========================================================================
  // FOVEATED MULTIPLIER COMPUTATION
  // ===========================================================================

  /**
   * Update foveated multipliers from budget manager configuration.
   */
  private updateFoveatedMultipliers(): void {
    const config = this.budgetManager.getConfig();
    if (!config.foveated.enabled) {
      this.foveatedMultipliers = { foveal: 1.0, blend: 1.0, peripheral: 1.0 };
      return;
    }

    this.foveatedMultipliers = {
      foveal: config.foveated.fovealBudgetMultiplier,
      blend: 1.0 + (config.foveated.fovealBudgetMultiplier - 1.0) * 0.5,
      peripheral: 1.0,
    };
  }

  // ===========================================================================
  // QUERIES AND METRICS
  // ===========================================================================

  /**
   * Get integrated metrics from both systems.
   */
  getIntegratedMetrics(): IntegratedMetrics {
    const budgetMetrics = this.budgetManager.getMetrics();
    const rendererStats = this.renderer.getPerformanceStats();
    const lastFrame = this.renderer.getLastTiming();

    return {
      budget: budgetMetrics,
      renderer: rendererStats,
      lastFrame,
      inSync: this.areSystemsInSync(),
      budgetPerformanceState: budgetMetrics.performanceState,
      rendererQualityLevel: this.renderer.getQualityLevel(),
      layerEnforcement: { ...this.lastEnforcement },
      foveatedMultipliers: { ...this.foveatedMultipliers },
    };
  }

  /**
   * Check if the two systems are in sync.
   */
  private areSystemsInSync(): boolean {
    const budgetState = this.budgetManager.getMetrics().performanceState;
    const qualityLevel = this.renderer.getQualityLevel();
    const expectedMinQuality = this.budgetStateToQualityLevel(budgetState);

    // In sync if renderer quality meets or exceeds budget expectations
    return qualityLevel >= expectedMinQuality;
  }

  /**
   * Get the budget manager instance (for direct access if needed).
   */
  getBudgetManager(): GaussianBudgetManager {
    return this.budgetManager;
  }

  /**
   * Get the renderer instance (for direct access if needed).
   */
  getRenderer(): FoveatedGaussianRenderer {
    return this.renderer;
  }

  /**
   * Get cloud binding info.
   */
  getCloudBinding(id: string): Readonly<CloudBudgetBinding> | undefined {
    return this.bindings.get(id);
  }

  /**
   * Get all cloud bindings.
   */
  getAllBindings(): ReadonlyMap<string, Readonly<CloudBudgetBinding>> {
    return this.bindings;
  }

  /**
   * Get per-layer enforcement results from the last frame.
   */
  getLayerEnforcement(): Readonly<Record<GaussianLayerType, LayerEnforcementResult>> {
    return this.lastEnforcement;
  }

  /**
   * Get current foveated multipliers.
   */
  getFoveatedMultipliers(): Readonly<Record<FoveatedZone, number>> {
    return this.foveatedMultipliers;
  }

  /**
   * Whether emergency shed is currently active.
   */
  isEmergencyShedActive(): boolean {
    return this.emergencyShedActive;
  }

  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================

  /**
   * Apply a device preset to both systems.
   */
  applyDevicePreset(device: 'quest2' | 'quest3' | 'pcvr' | 'desktop'): void {
    switch (device) {
      case 'quest2':
        this.budgetManager.applyQuest2Preset();
        this.renderer.applyQuest2Preset();
        break;
      case 'quest3':
        this.budgetManager.applyQuest3Preset();
        this.renderer.applyQuest3Preset();
        break;
      case 'pcvr':
        this.budgetManager.applyPCVRPreset();
        this.renderer.applyPCVRPreset();
        break;
      case 'desktop':
        this.budgetManager.applyDesktopPreset();
        this.renderer.applyDesktopPreset();
        break;
    }

    this.updateFoveatedMultipliers();

    logger.info('[BudgetEnforcedGaussianRenderer] Applied device preset', { device });
  }

  /**
   * Set target frame time on both systems.
   *
   * The budget manager gets the splat-specific portion (~50% of full frame),
   * and the renderer gets the full frame budget.
   */
  setTargetFrameTime(fullFrameMs: number, splatBudgetRatio: number = 0.5): void {
    this.renderer.setTargetFrameTime(fullFrameMs);
    this.budgetManager.setTargetFrameTime(fullFrameMs * splatBudgetRatio);
  }

  /**
   * Update foveated config on both systems.
   */
  setFoveatedEnabled(enabled: boolean): void {
    this.renderer.setFoveatedConfig({ enabled });
    this.budgetManager.setFoveatedConfig({ enabled });
    this.updateFoveatedMultipliers();
  }

  // ===========================================================================
  // REPORT GENERATION
  // ===========================================================================

  /**
   * Generate an integrated report combining both systems.
   */
  generateReport(): string {
    const lines: string[] = [
      '',
      '====================================================================',
      '  BUDGET-ENFORCED GAUSSIAN RENDERER - INTEGRATED REPORT',
      '  GaussianBudgetManager + FoveatedGaussianRenderer',
      '====================================================================',
      '',
    ];

    // Integration state
    const metrics = this.getIntegratedMetrics();
    lines.push('-- Integration State --');
    lines.push(`  Systems In Sync:       ${metrics.inSync ? 'YES' : 'NO (MISMATCH)'}`);
    lines.push(`  Budget Perf State:     ${metrics.budgetPerformanceState.toUpperCase()}`);
    lines.push(`  Renderer Quality:      Level ${metrics.rendererQualityLevel} / 5`);
    lines.push(`  Emergency Shed:        ${this.emergencyShedActive ? 'ACTIVE' : 'inactive'}`);
    lines.push(`  Registered Clouds:     ${this.bindings.size}`);
    lines.push('');

    // Per-layer enforcement
    lines.push('-- Layer Budget Enforcement (Last Frame) --');
    const layers: GaussianLayerType[] = ['baked', 'relightable', 'interactive'];
    for (const layer of layers) {
      const e = this.lastEnforcement[layer];
      const pct = e.totalRequested > 0
        ? ((e.totalAllowed / e.totalRequested) * 100).toFixed(1)
        : '100.0';
      lines.push(`  ${layer.toUpperCase().padEnd(14)} ${e.cloudCount} clouds | ${this.formatNumber(e.totalAllowed)} / ${this.formatNumber(e.totalRequested)} (${pct}%) | budget: ${this.formatNumber(e.effectiveBudget)} ${e.budgetLimited ? '[LIMITED]' : ''}`);
    }
    lines.push('');

    // Foveated multipliers
    lines.push('-- Foveated Budget Multipliers --');
    lines.push(`  Foveal:      ${metrics.foveatedMultipliers.foveal.toFixed(1)}x`);
    lines.push(`  Blend:       ${metrics.foveatedMultipliers.blend.toFixed(1)}x`);
    lines.push(`  Peripheral:  ${metrics.foveatedMultipliers.peripheral.toFixed(1)}x`);
    lines.push('');

    // Cloud bindings
    if (this.bindings.size > 0) {
      lines.push('-- Cloud Bindings --');
      for (const [id, binding] of this.bindings) {
        const fov = binding.inFovealRegion ? 'FOV' : 'PER';
        const pct = binding.baseCount > 0
          ? ((binding.enforcedCount / binding.baseCount) * 100).toFixed(0)
          : '0';
        lines.push(`  ${id.padEnd(20)} ${binding.layer.padEnd(14)} ${fov} | ${this.formatNumber(binding.enforcedCount)} / ${this.formatNumber(binding.baseCount)} (${pct}%) | p=${binding.priority} ${binding.pinned ? '[PINNED]' : ''}`);
      }
      lines.push('');
    }

    // Append sub-system reports
    lines.push(this.budgetManager.generateReport());
    lines.push('');
    lines.push(this.renderer.generateReport());

    return lines.join('\n');
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  /**
   * Clear all state in both systems.
   */
  clear(): void {
    this.bindings.clear();
    this.budgetManager.clear();
    this.renderer.clear();
    this.emergencyShedActive = false;
    this.lastBudgetState = 'nominal';
    this.lastRendererQuality = 0;
    this.lastEnforcement = {
      baked: this.createEmptyEnforcement('baked'),
      relightable: this.createEmptyEnforcement('relightable'),
      interactive: this.createEmptyEnforcement('interactive'),
    };
    logger.info('[BudgetEnforcedGaussianRenderer] Cleared all state');
  }

  /**
   * Dispose both systems and remove all listeners.
   */
  dispose(): void {
    this.clear();
    this.budgetManager.dispose();
    this.renderer.dispose();
    this.removeAllListeners();
    logger.info('[BudgetEnforcedGaussianRenderer] Disposed');
  }

  // ===========================================================================
  // INTERNAL UTILITIES
  // ===========================================================================

  /**
   * Get all bindings for a specific layer.
   */
  private getBindingsForLayer(layer: GaussianLayerType): CloudBudgetBinding[] {
    const result: CloudBudgetBinding[] = [];
    for (const binding of this.bindings.values()) {
      if (binding.layer === layer) {
        result.push(binding);
      }
    }
    return result;
  }

  /**
   * Create an empty enforcement result.
   */
  private createEmptyEnforcement(layer: GaussianLayerType): LayerEnforcementResult {
    return {
      layer,
      cloudCount: 0,
      totalRequested: 0,
      totalAllowed: 0,
      budgetLimited: false,
      effectiveBudget: 0,
    };
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
 * Create a BudgetEnforcedGaussianRenderer with default configuration.
 */
export function createBudgetEnforcedGaussianRenderer(
  config?: BudgetEnforcedRendererConfig,
): BudgetEnforcedGaussianRenderer {
  return new BudgetEnforcedGaussianRenderer(config);
}

/**
 * Create a BudgetEnforcedGaussianRenderer pre-configured for a specific device.
 */
export function createBudgetEnforcedGaussianRendererForDevice(
  deviceType: 'quest2' | 'quest3' | 'pcvr' | 'desktop',
  config?: BudgetEnforcedRendererConfig,
): BudgetEnforcedGaussianRenderer {
  const integrated = new BudgetEnforcedGaussianRenderer(config);
  integrated.applyDevicePreset(deviceType);
  return integrated;
}
