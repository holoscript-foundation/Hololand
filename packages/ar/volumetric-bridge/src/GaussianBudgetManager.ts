/**
 * GaussianBudgetManager
 *
 * Per-FRAME Gaussian splat budget enforcement for VR/AR rendering.
 * Sits above GaussianSplatLODManager to coordinate multiple splat scenes
 * and avatar reservations within a single frame budget.
 *
 * Key design decisions:
 *   - Per-frame enforcement (NOT per-scene): budget is checked and enforced
 *     every render frame, not just at scene load time. This prevents transient
 *     spikes from animations, avatar joins/leaves, or LOD pops.
 *   - Avatar reservation: 60K Gaussians per avatar (after SqueezeMe UV-space
 *     compression), max 3 simultaneous avatars. Reservations are subtracted
 *     from the total budget BEFORE scene content allocation.
 *   - LOD fallback cascade: When over budget, progressively drop LOD levels
 *     starting from the finest detail across ALL scenes. Three-stage cascade:
 *     (1) drop finest LOD levels, (2) reduce scene count, (3) emergency cull.
 *   - Memory footprint monitoring: Tracks estimated GPU memory with a 1.5GB
 *     ceiling for mobile VR (Quest 3). Emits warnings at configurable thresholds.
 *
 * Research references:
 *   W.034  - VR Gaussian budget (~180K total on Quest 3 at 72fps)
 *   P.030.05 - VR Gaussian Budget Management pattern
 *   G.030.03 - Avatar budget reservation gotcha
 *   G.030.06 - Memory footprint pre-check
 *
 * @module volumetric-bridge
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Per-splat memory cost in bytes.
 * positions(3) + scales(3) + rotations(4) + colors(4) + opacities(1) = 15 floats * 4 bytes = 60 bytes
 */
const BYTES_PER_GAUSSIAN = 60;

/**
 * Default mobile VR memory ceiling in bytes (1.5 GB).
 */
const MOBILE_VR_MEMORY_CEILING_BYTES = 1.5 * 1024 * 1024 * 1024;

/**
 * Budget manager configuration.
 */
export interface GaussianBudgetConfig {
  /**
   * Total Gaussian budget per frame.
   * Quest 3 at 72fps: 180,000
   * Quest 3 at 90fps: 100,000 (conservative)
   * Desktop: 500,000+ (or 0 for unlimited)
   */
  totalBudget: number;

  /**
   * Gaussians reserved per avatar (after SqueezeMe UV-space compression).
   * Default: 60,000
   */
  perAvatarReservation: number;

  /**
   * Maximum simultaneous avatars.
   * Default: 3
   */
  maxAvatars: number;

  /**
   * Memory ceiling in bytes for the target platform.
   * Default: 1.5 GB (mobile VR)
   * Set to 0 for unlimited.
   */
  memoryCeilingBytes: number;

  /**
   * Memory warning thresholds as fraction of ceiling (0-1).
   */
  memoryThresholds: MemoryThresholds;

  /**
   * Enable per-frame enforcement. When false, budget is checked only on
   * scene changes (cheaper but less safe). Default: true.
   */
  perFrameEnforcement: boolean;

  /**
   * Minimum milliseconds between full budget re-evaluations.
   * Prevents thrashing on fast-moving cameras. Default: 16 (one 60fps frame).
   */
  enforcementIntervalMs: number;

  /**
   * Enable LOD fallback cascade. When false, over-budget scenes are simply
   * clamped without progressive degradation. Default: true.
   */
  lodCascadeEnabled: boolean;

  /**
   * Number of cascade stages before emergency cull. Default: 3.
   * Stage 1: Drop finest LOD levels across all scenes
   * Stage 2: Cap per-scene budgets proportionally
   * Stage 3: Emergency cull (disable lowest-priority scenes)
   */
  cascadeStages: number;
}

/**
 * Memory warning thresholds.
 */
export interface MemoryThresholds {
  /** Emit warning event. Default: 0.70 (70% of ceiling) */
  warning: number;
  /** Begin LOD reduction. Default: 0.85 */
  reduction: number;
  /** Emergency mode: aggressive culling. Default: 0.95 */
  emergency: number;
}

/**
 * Registered scene in the budget manager.
 */
export interface BudgetScene {
  /** Unique scene identifier */
  id: string;
  /** Priority (higher = more important, less likely to be culled). Default: 1 */
  priority: number;
  /** Total Gaussians in this scene (all LOD levels) */
  totalGaussians: number;
  /** Currently visible Gaussians (after LOD selection) */
  visibleGaussians: number;
  /** Current deepest active LOD level */
  activeLODLevel: number;
  /** Maximum LOD levels available in this scene */
  maxLODLevels: number;
  /** Gaussians per LOD level (index = level, value = count) */
  gaussiansPerLevel: number[];
  /** Whether this scene is currently enabled */
  enabled: boolean;
  /** Estimated GPU memory for this scene in bytes */
  memoryBytes: number;
}

/**
 * Avatar registration in the budget manager.
 */
export interface BudgetAvatar {
  /** Unique avatar identifier */
  id: string;
  /** Gaussian count for this avatar. Default: perAvatarReservation */
  gaussianCount: number;
  /** Whether avatar is currently visible/active */
  active: boolean;
  /** Estimated GPU memory for this avatar in bytes */
  memoryBytes: number;
}

/**
 * Per-frame budget enforcement result.
 */
export interface BudgetEnforcementResult {
  /** Total budget for this frame */
  totalBudget: number;
  /** Gaussians reserved for avatars */
  avatarReservation: number;
  /** Budget available for scene content */
  sceneBudget: number;
  /** Total Gaussians requested by all scenes */
  totalRequested: number;
  /** Total Gaussians actually allocated */
  totalAllocated: number;
  /** Whether any scene was budget-capped */
  budgetCapped: boolean;
  /** Current cascade stage (0 = no cascade, 1-3 = active cascade) */
  cascadeStage: number;
  /** Number of scenes disabled by emergency cull */
  scenesDisabled: number;
  /** Per-scene allocation results */
  sceneAllocations: SceneAllocation[];
  /** Memory state */
  memoryState: MemoryState;
  /** Frame timestamp */
  timestamp: number;
}

/**
 * Per-scene allocation in a budget enforcement result.
 */
export interface SceneAllocation {
  sceneId: string;
  requested: number;
  allocated: number;
  capped: boolean;
  lodLevelsDropped: number;
  enabled: boolean;
}

/**
 * Memory monitoring state.
 */
export interface MemoryState {
  /** Total estimated GPU memory in bytes */
  totalBytes: number;
  /** Memory ceiling in bytes */
  ceilingBytes: number;
  /** Utilization as fraction (0-1) */
  utilization: number;
  /** Current threshold state */
  thresholdState: 'normal' | 'warning' | 'reduction' | 'emergency';
  /** Total Gaussians across all scenes + avatars */
  totalGaussians: number;
}

/**
 * Events emitted by the budget manager.
 */
export type BudgetEvent =
  | { type: 'budget:enforced'; result: BudgetEnforcementResult }
  | { type: 'budget:cascade'; stage: number; scenesAffected: number }
  | { type: 'memory:warning'; state: MemoryState }
  | { type: 'memory:reduction'; state: MemoryState }
  | { type: 'memory:emergency'; state: MemoryState }
  | { type: 'memory:normal'; state: MemoryState }
  | { type: 'avatar:added'; avatar: BudgetAvatar }
  | { type: 'avatar:removed'; avatarId: string }
  | { type: 'scene:registered'; scene: BudgetScene }
  | { type: 'scene:unregistered'; sceneId: string }
  | { type: 'scene:disabled'; sceneId: string; reason: string }
  | { type: 'scene:enabled'; sceneId: string };

export type BudgetEventHandler = (event: BudgetEvent) => void;

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_MEMORY_THRESHOLDS: MemoryThresholds = {
  warning: 0.70,
  reduction: 0.85,
  emergency: 0.95,
};

const DEFAULT_CONFIG: GaussianBudgetConfig = {
  totalBudget: 180_000,
  perAvatarReservation: 60_000,
  maxAvatars: 3,
  memoryCeilingBytes: MOBILE_VR_MEMORY_CEILING_BYTES,
  memoryThresholds: DEFAULT_MEMORY_THRESHOLDS,
  perFrameEnforcement: true,
  enforcementIntervalMs: 16,
  lodCascadeEnabled: true,
  cascadeStages: 3,
};

/** Quest 3 at 72fps -- optimized VR preset */
export const BUDGET_VR_OPTIMIZED: Partial<GaussianBudgetConfig> = {
  totalBudget: 180_000,
  perAvatarReservation: 60_000,
  maxAvatars: 3,
  memoryCeilingBytes: 1.5 * 1024 * 1024 * 1024,
  perFrameEnforcement: true,
  enforcementIntervalMs: 14, // ~72fps
  lodCascadeEnabled: true,
};

/** Quest 3 at 90fps -- conservative VR preset */
export const BUDGET_VR_CONSERVATIVE: Partial<GaussianBudgetConfig> = {
  totalBudget: 100_000,
  perAvatarReservation: 30_000,
  maxAvatars: 2,
  memoryCeilingBytes: 1.5 * 1024 * 1024 * 1024,
  perFrameEnforcement: true,
  enforcementIntervalMs: 11, // ~90fps
  lodCascadeEnabled: true,
};

/** Desktop -- relaxed preset */
export const BUDGET_DESKTOP: Partial<GaussianBudgetConfig> = {
  totalBudget: 500_000,
  perAvatarReservation: 100_000,
  maxAvatars: 5,
  memoryCeilingBytes: 4 * 1024 * 1024 * 1024,
  perFrameEnforcement: true,
  enforcementIntervalMs: 16,
  lodCascadeEnabled: true,
};

/** No budget -- unlimited (desktop dev/preview) */
export const BUDGET_UNLIMITED: Partial<GaussianBudgetConfig> = {
  totalBudget: 0,
  perAvatarReservation: 0,
  maxAvatars: 0,
  memoryCeilingBytes: 0,
  perFrameEnforcement: false,
};

// =============================================================================
// GAUSSIAN BUDGET MANAGER
// =============================================================================

/**
 * Per-frame Gaussian splat budget manager for VR/AR rendering.
 *
 * Coordinates multiple splat scenes and avatar reservations within a
 * single per-frame budget, with LOD fallback cascade and memory monitoring.
 *
 * Usage:
 * ```typescript
 * const budget = new GaussianBudgetManager(BUDGET_VR_OPTIMIZED);
 *
 * // Register scenes (from GaussianSplatLODManager)
 * budget.registerScene({
 *   id: 'environment',
 *   priority: 1,
 *   totalGaussians: 150000,
 *   visibleGaussians: 80000,
 *   activeLODLevel: 3,
 *   maxLODLevels: 6,
 *   gaussiansPerLevel: [5000, 10000, 15000, 20000, 30000, 70000],
 *   enabled: true,
 *   memoryBytes: 150000 * 60,
 * });
 *
 * // Register avatars
 * budget.addAvatar('avatar-1');
 * budget.addAvatar('avatar-2');
 *
 * // Each frame: enforce budget
 * const result = budget.enforceFrame();
 * if (result.budgetCapped) {
 *   // Apply LOD reductions to affected scenes
 *   for (const alloc of result.sceneAllocations) {
 *     if (alloc.capped) {
 *       lodManagers[alloc.sceneId].updateConfig({
 *         gaussianBudget: alloc.allocated,
 *       });
 *     }
 *   }
 * }
 *
 * // Listen for events
 * budget.on((event) => {
 *   if (event.type === 'memory:emergency') {
 *     console.error('Memory emergency!', event.state);
 *   }
 * });
 * ```
 */
export class GaussianBudgetManager {
  private config: GaussianBudgetConfig;
  private scenes: Map<string, BudgetScene> = new Map();
  private avatars: Map<string, BudgetAvatar> = new Map();
  private handlers: BudgetEventHandler[] = [];

  // Enforcement state
  private lastEnforcementTime = 0;
  private lastResult: BudgetEnforcementResult | null = null;
  private previousThresholdState: MemoryState['thresholdState'] = 'normal';

  // Memory tracking
  private additionalMemoryBytes = 0; // Non-Gaussian GPU memory (textures, shaders, etc.)

  constructor(config?: Partial<GaussianBudgetConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      memoryThresholds: {
        ...DEFAULT_MEMORY_THRESHOLDS,
        ...config?.memoryThresholds,
      },
      ...config,
    };
    // Re-apply memoryThresholds since spread above may have overwritten nested
    if (config?.memoryThresholds) {
      this.config.memoryThresholds = {
        ...DEFAULT_MEMORY_THRESHOLDS,
        ...config.memoryThresholds,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Event System
  // ---------------------------------------------------------------------------

  /**
   * Register an event handler. Returns unsubscribe function.
   */
  on(handler: BudgetEventHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  private emit(event: BudgetEvent): void {
    for (const h of this.handlers) {
      h(event);
    }
  }

  // ---------------------------------------------------------------------------
  // Scene Management
  // ---------------------------------------------------------------------------

  /**
   * Register a Gaussian splat scene for budget management.
   */
  registerScene(scene: BudgetScene): void {
    this.scenes.set(scene.id, { ...scene });
    this.emit({ type: 'scene:registered', scene: { ...scene } });
  }

  /**
   * Update a registered scene's current state (call after LOD update).
   */
  updateScene(
    sceneId: string,
    update: Partial<Omit<BudgetScene, 'id'>>,
  ): void {
    const scene = this.scenes.get(sceneId);
    if (!scene) return;
    Object.assign(scene, update);
    // Recalculate memory if visible count changed
    if (update.visibleGaussians !== undefined) {
      scene.memoryBytes = scene.visibleGaussians * BYTES_PER_GAUSSIAN;
    }
  }

  /**
   * Unregister a scene.
   */
  unregisterScene(sceneId: string): void {
    if (this.scenes.delete(sceneId)) {
      this.emit({ type: 'scene:unregistered', sceneId });
    }
  }

  /**
   * Get a registered scene.
   */
  getScene(sceneId: string): Readonly<BudgetScene> | undefined {
    const scene = this.scenes.get(sceneId);
    return scene ? { ...scene } : undefined;
  }

  /**
   * Get all registered scenes.
   */
  getScenes(): readonly BudgetScene[] {
    return Array.from(this.scenes.values()).map((s) => ({ ...s }));
  }

  // ---------------------------------------------------------------------------
  // Avatar Management
  // ---------------------------------------------------------------------------

  /**
   * Add an avatar with default or custom Gaussian count.
   * Returns false if max avatars reached.
   */
  addAvatar(avatarId: string, gaussianCount?: number): boolean {
    if (this.avatars.size >= this.config.maxAvatars) {
      return false;
    }
    const count = gaussianCount ?? this.config.perAvatarReservation;
    const avatar: BudgetAvatar = {
      id: avatarId,
      gaussianCount: count,
      active: true,
      memoryBytes: count * BYTES_PER_GAUSSIAN,
    };
    this.avatars.set(avatarId, avatar);
    this.emit({ type: 'avatar:added', avatar: { ...avatar } });
    return true;
  }

  /**
   * Remove an avatar, freeing its budget reservation.
   */
  removeAvatar(avatarId: string): boolean {
    if (this.avatars.delete(avatarId)) {
      this.emit({ type: 'avatar:removed', avatarId });
      return true;
    }
    return false;
  }

  /**
   * Set whether an avatar is currently active (visible).
   * Inactive avatars do not consume budget.
   */
  setAvatarActive(avatarId: string, active: boolean): void {
    const avatar = this.avatars.get(avatarId);
    if (avatar) {
      avatar.active = active;
    }
  }

  /**
   * Get active avatar count.
   */
  getActiveAvatarCount(): number {
    let count = 0;
    for (const avatar of this.avatars.values()) {
      if (avatar.active) count++;
    }
    return count;
  }

  /**
   * Get total Gaussian reservation for all active avatars.
   */
  getAvatarReservation(): number {
    let total = 0;
    for (const avatar of this.avatars.values()) {
      if (avatar.active) {
        total += avatar.gaussianCount;
      }
    }
    return total;
  }

  /**
   * Get all registered avatars.
   */
  getAvatars(): readonly BudgetAvatar[] {
    return Array.from(this.avatars.values()).map((a) => ({ ...a }));
  }

  // ---------------------------------------------------------------------------
  // Additional Memory Tracking
  // ---------------------------------------------------------------------------

  /**
   * Report additional GPU memory usage (textures, shaders, render targets)
   * that is not Gaussian splat data but counts toward the memory ceiling.
   */
  setAdditionalMemoryBytes(bytes: number): void {
    this.additionalMemoryBytes = Math.max(0, bytes);
  }

  /**
   * Get the additional (non-Gaussian) memory being tracked.
   */
  getAdditionalMemoryBytes(): number {
    return this.additionalMemoryBytes;
  }

  // ---------------------------------------------------------------------------
  // Per-Frame Budget Enforcement
  // ---------------------------------------------------------------------------

  /**
   * Enforce Gaussian budget for the current frame.
   *
   * This is the primary method called every frame. It:
   * 1. Computes avatar reservation
   * 2. Computes available scene budget
   * 3. Runs LOD fallback cascade if over budget
   * 4. Monitors memory footprint against ceiling
   * 5. Emits events for threshold crossings
   *
   * Returns the enforcement result with per-scene allocations.
   *
   * @param forceEnforcement - Skip interval check and always enforce
   */
  enforceFrame(forceEnforcement = false): BudgetEnforcementResult {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // Throttle enforcement to prevent thrashing
    if (
      !forceEnforcement &&
      this.config.perFrameEnforcement &&
      this.lastResult &&
      now - this.lastEnforcementTime < this.config.enforcementIntervalMs
    ) {
      return this.lastResult;
    }

    this.lastEnforcementTime = now;

    // Unlimited budget mode: skip enforcement
    if (this.config.totalBudget <= 0) {
      const result = this.buildUnlimitedResult(now);
      this.lastResult = result;
      this.checkMemoryThresholds(result.memoryState);
      return result;
    }

    // Step 1: Compute avatar reservation
    const avatarReservation = this.getAvatarReservation();

    // Step 2: Compute scene budget
    const sceneBudget = Math.max(0, this.config.totalBudget - avatarReservation);

    // Step 3: Compute total requested by all enabled scenes
    let totalRequested = 0;
    const enabledScenes: BudgetScene[] = [];
    for (const scene of this.scenes.values()) {
      if (scene.enabled) {
        totalRequested += scene.visibleGaussians;
        enabledScenes.push(scene);
      }
    }

    // Step 4: Run LOD fallback cascade if over budget
    let cascadeStage = 0;
    let scenesDisabled = 0;
    const sceneAllocations: SceneAllocation[] = [];

    if (totalRequested <= sceneBudget) {
      // Under budget -- no cascade needed
      for (const scene of enabledScenes) {
        sceneAllocations.push({
          sceneId: scene.id,
          requested: scene.visibleGaussians,
          allocated: scene.visibleGaussians,
          capped: false,
          lodLevelsDropped: 0,
          enabled: true,
        });
      }
    } else if (this.config.lodCascadeEnabled) {
      // Over budget -- run cascade
      const cascadeResult = this.runLODCascade(
        enabledScenes,
        sceneBudget,
      );
      cascadeStage = cascadeResult.stage;
      scenesDisabled = cascadeResult.scenesDisabled;
      sceneAllocations.push(...cascadeResult.allocations);

      if (cascadeStage > 0) {
        this.emit({
          type: 'budget:cascade',
          stage: cascadeStage,
          scenesAffected: sceneAllocations.filter((a) => a.capped).length,
        });
      }
    } else {
      // No cascade -- proportional capping
      const proportionalAllocations = this.proportionalCap(
        enabledScenes,
        sceneBudget,
      );
      sceneAllocations.push(...proportionalAllocations);
    }

    // Include disabled scenes
    for (const scene of this.scenes.values()) {
      if (!scene.enabled) {
        sceneAllocations.push({
          sceneId: scene.id,
          requested: scene.visibleGaussians,
          allocated: 0,
          capped: true,
          lodLevelsDropped: scene.maxLODLevels,
          enabled: false,
        });
      }
    }

    // Step 5: Compute totals
    let totalAllocated = 0;
    for (const alloc of sceneAllocations) {
      totalAllocated += alloc.allocated;
    }

    const budgetCapped = totalAllocated < totalRequested;

    // Step 6: Memory state
    const memoryState = this.computeMemoryState(
      totalAllocated + avatarReservation,
    );

    // Step 7: Build result
    const result: BudgetEnforcementResult = {
      totalBudget: this.config.totalBudget,
      avatarReservation,
      sceneBudget,
      totalRequested,
      totalAllocated,
      budgetCapped,
      cascadeStage,
      scenesDisabled,
      sceneAllocations,
      memoryState,
      timestamp: now,
    };

    this.lastResult = result;
    this.checkMemoryThresholds(memoryState);
    this.emit({ type: 'budget:enforced', result });

    return result;
  }

  // ---------------------------------------------------------------------------
  // LOD Fallback Cascade
  // ---------------------------------------------------------------------------

  /**
   * Three-stage LOD fallback cascade:
   *
   * Stage 1: Drop finest LOD levels across all scenes (uniform reduction).
   *   For each scene, remove the deepest LOD level and recalculate visible count.
   *   Repeat until under budget or all scenes at minimum LOD.
   *
   * Stage 2: Proportional per-scene budget capping.
   *   After stage 1, if still over budget, cap each scene proportionally to
   *   its priority-weighted share of the remaining budget.
   *
   * Stage 3: Emergency cull lowest-priority scenes.
   *   If still over budget after stage 2, disable scenes from lowest to highest
   *   priority until under budget.
   */
  private runLODCascade(
    scenes: BudgetScene[],
    budget: number,
  ): {
    stage: number;
    scenesDisabled: number;
    allocations: SceneAllocation[];
  } {
    // Working copy: track per-scene adjustments
    const working: Array<{
      scene: BudgetScene;
      currentLevel: number;
      levelsDropped: number;
      currentVisible: number;
      enabled: boolean;
    }> = scenes.map((s) => ({
      scene: s,
      currentLevel: s.activeLODLevel,
      levelsDropped: 0,
      currentVisible: s.visibleGaussians,
      enabled: true,
    }));

    let totalVisible = working.reduce((sum, w) => sum + w.currentVisible, 0);

    // ── Stage 1: Drop finest LOD levels ──────────────────────────────────────
    let stage = 0;
    if (totalVisible > budget && this.config.cascadeStages >= 1) {
      stage = 1;
      totalVisible = this.cascadeStage1DropFinestLOD(working, budget);
    }

    // ── Stage 2: Proportional per-scene capping ──────────────────────────────
    if (totalVisible > budget && this.config.cascadeStages >= 2) {
      stage = 2;
      totalVisible = this.cascadeStage2ProportionalCap(working, budget);
    }

    // ── Stage 3: Emergency cull lowest-priority scenes ───────────────────────
    let scenesDisabled = 0;
    if (totalVisible > budget && this.config.cascadeStages >= 3) {
      stage = 3;
      const cullResult = this.cascadeStage3EmergencyCull(working, budget);
      totalVisible = cullResult.totalVisible;
      scenesDisabled = cullResult.scenesDisabled;
    }

    // Build allocations
    const allocations: SceneAllocation[] = working.map((w) => {
      const allocated = w.enabled ? w.currentVisible : 0;

      // Update the actual scene state
      if (!w.enabled && this.scenes.has(w.scene.id)) {
        const actualScene = this.scenes.get(w.scene.id)!;
        actualScene.enabled = false;
        this.emit({
          type: 'scene:disabled',
          sceneId: w.scene.id,
          reason: `Emergency cull (cascade stage 3)`,
        });
      }

      return {
        sceneId: w.scene.id,
        requested: w.scene.visibleGaussians,
        allocated,
        capped: allocated < w.scene.visibleGaussians,
        lodLevelsDropped: w.levelsDropped,
        enabled: w.enabled,
      };
    });

    return { stage, scenesDisabled, allocations };
  }

  /**
   * Stage 1: Drop finest LOD levels across all scenes uniformly.
   * Each iteration removes one level of detail from every scene that
   * still has levels to drop.
   */
  private cascadeStage1DropFinestLOD(
    working: Array<{
      scene: BudgetScene;
      currentLevel: number;
      levelsDropped: number;
      currentVisible: number;
      enabled: boolean;
    }>,
    budget: number,
  ): number {
    let totalVisible = working.reduce((sum, w) => sum + w.currentVisible, 0);

    // Maximum iterations = max LOD levels across all scenes
    const maxIterations = Math.max(
      ...working.map((w) => w.scene.maxLODLevels),
      1,
    );

    for (let iter = 0; iter < maxIterations && totalVisible > budget; iter++) {
      let anyDropped = false;

      for (const w of working) {
        if (!w.enabled) continue;
        if (w.currentLevel <= 0) continue; // Already at coarsest

        // Drop one level
        const droppedLevel = w.currentLevel;
        const droppedCount =
          w.scene.gaussiansPerLevel[droppedLevel] ?? 0;

        w.currentVisible = Math.max(0, w.currentVisible - droppedCount);
        w.currentLevel--;
        w.levelsDropped++;
        totalVisible -= droppedCount;
        anyDropped = true;

        if (totalVisible <= budget) break;
      }

      if (!anyDropped) break; // All scenes at minimum
    }

    return totalVisible;
  }

  /**
   * Stage 2: Proportional per-scene capping based on priority.
   * Each scene gets a share of the remaining budget proportional to
   * its priority weight.
   */
  private cascadeStage2ProportionalCap(
    working: Array<{
      scene: BudgetScene;
      currentLevel: number;
      levelsDropped: number;
      currentVisible: number;
      enabled: boolean;
    }>,
    budget: number,
  ): number {
    const enabledWorking = working.filter((w) => w.enabled);
    const totalPriority = enabledWorking.reduce(
      (sum, w) => sum + w.scene.priority,
      0,
    );

    if (totalPriority <= 0) return budget;

    let totalVisible = 0;
    for (const w of enabledWorking) {
      const share = (w.scene.priority / totalPriority) * budget;
      w.currentVisible = Math.min(w.currentVisible, Math.floor(share));
      totalVisible += w.currentVisible;
    }

    return totalVisible;
  }

  /**
   * Stage 3: Emergency cull lowest-priority scenes until under budget.
   */
  private cascadeStage3EmergencyCull(
    working: Array<{
      scene: BudgetScene;
      currentLevel: number;
      levelsDropped: number;
      currentVisible: number;
      enabled: boolean;
    }>,
    budget: number,
  ): { totalVisible: number; scenesDisabled: number } {
    let totalVisible = working.reduce(
      (sum, w) => sum + (w.enabled ? w.currentVisible : 0),
      0,
    );
    let scenesDisabled = 0;

    // Sort by priority ascending (lowest priority culled first)
    const sortedByPriority = [...working]
      .filter((w) => w.enabled)
      .sort((a, b) => a.scene.priority - b.scene.priority);

    for (const w of sortedByPriority) {
      if (totalVisible <= budget) break;
      totalVisible -= w.currentVisible;
      w.currentVisible = 0;
      w.enabled = false;
      scenesDisabled++;
    }

    return { totalVisible, scenesDisabled };
  }

  /**
   * Simple proportional capping without cascade stages.
   */
  private proportionalCap(
    scenes: BudgetScene[],
    budget: number,
  ): SceneAllocation[] {
    const totalRequested = scenes.reduce(
      (sum, s) => sum + s.visibleGaussians,
      0,
    );
    const ratio = totalRequested > 0 ? budget / totalRequested : 1;

    return scenes.map((scene) => {
      const allocated = Math.floor(scene.visibleGaussians * ratio);
      return {
        sceneId: scene.id,
        requested: scene.visibleGaussians,
        allocated,
        capped: allocated < scene.visibleGaussians,
        lodLevelsDropped: 0,
        enabled: true,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Memory Footprint Monitoring
  // ---------------------------------------------------------------------------

  /**
   * Compute current memory state from total Gaussian count.
   */
  private computeMemoryState(totalGaussians: number): MemoryState {
    const gaussianMemory = totalGaussians * BYTES_PER_GAUSSIAN;
    const totalBytes = gaussianMemory + this.additionalMemoryBytes;
    const ceilingBytes = this.config.memoryCeilingBytes;

    let utilization: number;
    let thresholdState: MemoryState['thresholdState'];

    if (ceilingBytes <= 0) {
      // No ceiling
      utilization = 0;
      thresholdState = 'normal';
    } else {
      utilization = totalBytes / ceilingBytes;

      if (utilization >= this.config.memoryThresholds.emergency) {
        thresholdState = 'emergency';
      } else if (utilization >= this.config.memoryThresholds.reduction) {
        thresholdState = 'reduction';
      } else if (utilization >= this.config.memoryThresholds.warning) {
        thresholdState = 'warning';
      } else {
        thresholdState = 'normal';
      }
    }

    return {
      totalBytes,
      ceilingBytes,
      utilization,
      thresholdState,
      totalGaussians,
    };
  }

  /**
   * Check memory thresholds and emit events on state changes.
   */
  private checkMemoryThresholds(state: MemoryState): void {
    if (state.thresholdState !== this.previousThresholdState) {
      const previous = this.previousThresholdState;
      this.previousThresholdState = state.thresholdState;

      switch (state.thresholdState) {
        case 'warning':
          this.emit({ type: 'memory:warning', state });
          break;
        case 'reduction':
          this.emit({ type: 'memory:reduction', state });
          break;
        case 'emergency':
          this.emit({ type: 'memory:emergency', state });
          break;
        case 'normal':
          // Only emit normal if transitioning DOWN from a higher state
          if (previous !== 'normal') {
            this.emit({ type: 'memory:normal', state });
          }
          break;
      }
    }
  }

  /**
   * Build result for unlimited budget mode.
   */
  private buildUnlimitedResult(timestamp: number): BudgetEnforcementResult {
    const sceneAllocations: SceneAllocation[] = [];
    let totalAllocated = 0;

    for (const scene of this.scenes.values()) {
      const allocated = scene.enabled ? scene.visibleGaussians : 0;
      totalAllocated += allocated;
      sceneAllocations.push({
        sceneId: scene.id,
        requested: scene.visibleGaussians,
        allocated,
        capped: false,
        lodLevelsDropped: 0,
        enabled: scene.enabled,
      });
    }

    const avatarReservation = this.getAvatarReservation();
    const totalGaussians = totalAllocated + avatarReservation;
    const memoryState = this.computeMemoryState(totalGaussians);

    return {
      totalBudget: 0,
      avatarReservation,
      sceneBudget: 0,
      totalRequested: totalAllocated,
      totalAllocated,
      budgetCapped: false,
      cascadeStage: 0,
      scenesDisabled: 0,
      sceneAllocations,
      memoryState,
      timestamp,
    };
  }

  // ---------------------------------------------------------------------------
  // Queries & Diagnostics
  // ---------------------------------------------------------------------------

  /**
   * Get current configuration.
   */
  getConfig(): Readonly<GaussianBudgetConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration at runtime.
   */
  updateConfig(config: Partial<GaussianBudgetConfig>): void {
    if (config.memoryThresholds) {
      this.config.memoryThresholds = {
        ...this.config.memoryThresholds,
        ...config.memoryThresholds,
      };
    }
    this.config = { ...this.config, ...config };
    if (config.memoryThresholds) {
      // Restore merged thresholds since spread above may overwrite
      this.config.memoryThresholds = {
        ...DEFAULT_MEMORY_THRESHOLDS,
        ...config.memoryThresholds,
      };
    }
    // Force re-enforcement on next frame
    this.lastResult = null;
  }

  /**
   * Get the last enforcement result (or null if never enforced).
   */
  getLastResult(): Readonly<BudgetEnforcementResult> | null {
    return this.lastResult ? { ...this.lastResult } : null;
  }

  /**
   * Get current memory state snapshot.
   */
  getMemoryState(): MemoryState {
    let totalGaussians = this.getAvatarReservation();
    for (const scene of this.scenes.values()) {
      if (scene.enabled) {
        totalGaussians += scene.visibleGaussians;
      }
    }
    return this.computeMemoryState(totalGaussians);
  }

  /**
   * Get available scene budget (total minus avatar reservations).
   */
  getAvailableSceneBudget(): number {
    if (this.config.totalBudget <= 0) return Infinity;
    return Math.max(0, this.config.totalBudget - this.getAvatarReservation());
  }

  /**
   * Check if adding N more Gaussians would exceed the memory ceiling.
   * Returns the number of Gaussians that can be safely added, or -1 if unlimited.
   */
  checkMemoryHeadroom(additionalGaussians: number): number {
    if (this.config.memoryCeilingBytes <= 0) return -1;

    const currentState = this.getMemoryState();
    const additionalBytes = additionalGaussians * BYTES_PER_GAUSSIAN;
    const projectedTotal = currentState.totalBytes + additionalBytes;
    const remainingBytes = Math.max(
      0,
      this.config.memoryCeilingBytes - currentState.totalBytes,
    );

    if (projectedTotal <= this.config.memoryCeilingBytes) {
      return additionalGaussians;
    }

    // Return how many can safely fit
    return Math.floor(remainingBytes / BYTES_PER_GAUSSIAN);
  }

  /**
   * Generate a diagnostic report string.
   */
  generateReport(): string {
    const state = this.getMemoryState();
    const result = this.lastResult;

    const lines: string[] = [
      '====================================================================',
      '  GAUSSIAN BUDGET MANAGER REPORT',
      '====================================================================',
      '',
      '-- Configuration --',
      `  Total Budget:         ${this.config.totalBudget === 0 ? 'UNLIMITED' : this.config.totalBudget.toLocaleString() + ' Gaussians'}`,
      `  Per-Avatar Reserve:   ${this.config.perAvatarReservation.toLocaleString()} Gaussians`,
      `  Max Avatars:          ${this.config.maxAvatars}`,
      `  Memory Ceiling:       ${this.config.memoryCeilingBytes === 0 ? 'UNLIMITED' : this.formatBytes(this.config.memoryCeilingBytes)}`,
      `  Per-Frame Enforce:    ${this.config.perFrameEnforcement ? 'YES' : 'NO'}`,
      `  LOD Cascade:          ${this.config.lodCascadeEnabled ? 'YES (' + this.config.cascadeStages + ' stages)' : 'NO'}`,
      '',
      '-- Memory State --',
      `  Total GPU Memory:     ${this.formatBytes(state.totalBytes)}`,
      `  Memory Ceiling:       ${state.ceilingBytes === 0 ? 'UNLIMITED' : this.formatBytes(state.ceilingBytes)}`,
      `  Utilization:          ${state.ceilingBytes > 0 ? (state.utilization * 100).toFixed(1) + '%' : 'N/A'}`,
      `  Threshold State:      ${state.thresholdState.toUpperCase()}`,
      `  Total Gaussians:      ${state.totalGaussians.toLocaleString()}`,
      `  Additional Memory:    ${this.formatBytes(this.additionalMemoryBytes)}`,
      '',
      '-- Avatars --',
      `  Registered:           ${this.avatars.size}`,
      `  Active:               ${this.getActiveAvatarCount()}`,
      `  Reservation:          ${this.getAvatarReservation().toLocaleString()} Gaussians`,
    ];

    for (const avatar of this.avatars.values()) {
      lines.push(
        `    [${avatar.active ? 'ACTIVE' : 'IDLE'}] ${avatar.id}: ${avatar.gaussianCount.toLocaleString()} Gaussians (${this.formatBytes(avatar.memoryBytes)})`,
      );
    }

    lines.push('');
    lines.push('-- Scenes --');
    lines.push(`  Registered:           ${this.scenes.size}`);
    lines.push(
      `  Enabled:              ${Array.from(this.scenes.values()).filter((s) => s.enabled).length}`,
    );

    for (const scene of this.scenes.values()) {
      lines.push(
        `    [${scene.enabled ? 'ON' : 'OFF'}] ${scene.id}: ${scene.visibleGaussians.toLocaleString()}/${scene.totalGaussians.toLocaleString()} Gaussians, LOD ${scene.activeLODLevel}/${scene.maxLODLevels}, P=${scene.priority}`,
      );
    }

    if (result) {
      lines.push('');
      lines.push('-- Last Enforcement --');
      lines.push(`  Budget Capped:        ${result.budgetCapped ? 'YES' : 'NO'}`);
      lines.push(`  Cascade Stage:        ${result.cascadeStage}`);
      lines.push(`  Scenes Disabled:      ${result.scenesDisabled}`);
      lines.push(
        `  Requested:            ${result.totalRequested.toLocaleString()} Gaussians`,
      );
      lines.push(
        `  Allocated:            ${result.totalAllocated.toLocaleString()} Gaussians`,
      );
      lines.push(
        `  Avatar Reservation:   ${result.avatarReservation.toLocaleString()} Gaussians`,
      );
    }

    lines.push('');
    lines.push('====================================================================');

    return lines.join('\n');
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  /**
   * Clear all scenes, avatars, and state.
   */
  clear(): void {
    this.scenes.clear();
    this.avatars.clear();
    this.lastResult = null;
    this.lastEnforcementTime = 0;
    this.additionalMemoryBytes = 0;
    this.previousThresholdState = 'normal';
  }

  /**
   * Dispose the budget manager and remove all event handlers.
   */
  dispose(): void {
    this.clear();
    this.handlers = [];
  }
}
