/**
 * @hololand/lifecycle StageManager
 *
 * Manages the 7-stage lifecycle of a VR world.
 * Implements stage transition validation (can't skip stages), entry/exit hooks,
 * transition history, rollback support, stage-specific configuration,
 * and timeout handling.
 */

export type LifecycleStage = 'Design' | 'Train' | 'Test' | 'Deploy' | 'Monitor' | 'Optimize' | 'Decommission';
const STAGE_ORDER: LifecycleStage[] = ['Design', 'Train', 'Test', 'Deploy', 'Monitor', 'Optimize', 'Decommission'];

export interface StageTransition {
  from: LifecycleStage;
  to: LifecycleStage;
  timestamp: number;
}

export interface DetailedTransition extends StageTransition {
  triggeredBy: string;
  duration: number;       // ms spent in the 'from' stage
  wasRollback: boolean;
}

export type StageHook = (stage: LifecycleStage, worldId: string) => Promise<boolean> | boolean;

export interface StageConfig {
  /** Maximum time allowed in this stage (ms). 0 = no timeout */
  timeoutMs: number;
  /** Whether this stage can be rolled back from */
  allowRollback: boolean;
  /** Custom configuration data for this stage */
  data: Record<string, unknown>;
}

const DEFAULT_STAGE_CONFIGS: Record<LifecycleStage, StageConfig> = {
  Design: { timeoutMs: 0, allowRollback: false, data: {} },
  Train: { timeoutMs: 3_600_000, allowRollback: true, data: {} },       // 1 hour
  Test: { timeoutMs: 1_800_000, allowRollback: true, data: {} },        // 30 min
  Deploy: { timeoutMs: 600_000, allowRollback: true, data: {} },        // 10 min
  Monitor: { timeoutMs: 0, allowRollback: true, data: {} },
  Optimize: { timeoutMs: 7_200_000, allowRollback: true, data: {} },    // 2 hours
  Decommission: { timeoutMs: 300_000, allowRollback: false, data: {} }, // 5 min
};

export class StageManager {
  readonly worldId: string;
  private currentStage: LifecycleStage = 'Design';
  private transitions: DetailedTransition[] = [];
  private stageEntryTime: number = Date.now();
  private stageConfigs: Record<LifecycleStage, StageConfig>;

  // Hooks
  private entryHooks: Map<LifecycleStage, StageHook[]> = new Map();
  private exitHooks: Map<LifecycleStage, StageHook[]> = new Map();

  // Rollback stack
  private rollbackStack: LifecycleStage[] = [];

  constructor(worldId: string, configs?: Partial<Record<LifecycleStage, Partial<StageConfig>>>) {
    this.worldId = worldId;
    this.stageConfigs = { ...DEFAULT_STAGE_CONFIGS };
    if (configs) {
      for (const [stage, cfg] of Object.entries(configs)) {
        const s = stage as LifecycleStage;
        this.stageConfigs[s] = { ...this.stageConfigs[s], ...cfg };
      }
    }
  }

  // ── Original API (preserved) ─────────────────────────────────────

  advance(): LifecycleStage {
    const idx = STAGE_ORDER.indexOf(this.currentStage);
    if (idx < STAGE_ORDER.length - 1) {
      const next = STAGE_ORDER[idx + 1];
      this.recordTransition(this.currentStage, next, 'advance', false);
      this.rollbackStack.push(this.currentStage);
      this.currentStage = next;
      this.stageEntryTime = Date.now();
    }
    return this.currentStage;
  }

  setStage(stage: LifecycleStage): void {
    this.recordTransition(this.currentStage, stage, 'setStage', false);
    this.rollbackStack.push(this.currentStage);
    this.currentStage = stage;
    this.stageEntryTime = Date.now();
  }

  getCurrentStage(): LifecycleStage {
    return this.currentStage;
  }

  getTransitions(): StageTransition[] {
    return [...this.transitions];
  }

  canAdvance(): boolean {
    return STAGE_ORDER.indexOf(this.currentStage) < STAGE_ORDER.length - 1;
  }

  // ── Validated transition (no stage skipping) ─────────────────────

  /**
   * Attempt to transition to a target stage with validation.
   * Stages cannot be skipped -- must transition through each sequential stage.
   * Entry and exit hooks are called and can abort the transition.
   *
   * @returns true if transition succeeded, false if blocked
   */
  async transitionTo(
    target: LifecycleStage,
    triggeredBy: string = 'system',
  ): Promise<boolean> {
    const currentIdx = STAGE_ORDER.indexOf(this.currentStage);
    const targetIdx = STAGE_ORDER.indexOf(target);

    if (targetIdx === currentIdx) return true; // already there

    // Forward transition: must be exactly the next stage (no skipping)
    if (targetIdx > currentIdx) {
      if (targetIdx !== currentIdx + 1) {
        // Cannot skip stages -- must advance one at a time
        return false;
      }

      // Run exit hooks for current stage
      const exitOk = await this.runHooks('exit', this.currentStage);
      if (!exitOk) return false;

      // Run entry hooks for target stage
      const entryOk = await this.runHooks('entry', target);
      if (!entryOk) return false;

      this.rollbackStack.push(this.currentStage);
      this.recordTransition(this.currentStage, target, triggeredBy, false);
      this.currentStage = target;
      this.stageEntryTime = Date.now();
      return true;
    }

    // Backward transition: only allowed as rollback
    return this.rollbackTo(target, triggeredBy);
  }

  // ── Rollback support ─────────────────────────────────────────────

  /**
   * Roll back to a previous stage. Only works if the current stage allows rollback
   * and the target stage is in the rollback history.
   */
  async rollbackTo(
    target: LifecycleStage,
    triggeredBy: string = 'rollback',
  ): Promise<boolean> {
    const config = this.stageConfigs[this.currentStage];
    if (!config.allowRollback) return false;

    const targetIdx = STAGE_ORDER.indexOf(target);
    const currentIdx = STAGE_ORDER.indexOf(this.currentStage);
    if (targetIdx >= currentIdx) return false; // not a rollback

    // Check if target is in rollback stack
    if (!this.rollbackStack.includes(target)) return false;

    // Run exit hooks
    const exitOk = await this.runHooks('exit', this.currentStage);
    if (!exitOk) return false;

    // Run entry hooks for target
    const entryOk = await this.runHooks('entry', target);
    if (!entryOk) return false;

    this.recordTransition(this.currentStage, target, triggeredBy, true);

    // Pop rollback stack back to target
    while (this.rollbackStack.length > 0 && this.rollbackStack[this.rollbackStack.length - 1] !== target) {
      this.rollbackStack.pop();
    }

    this.currentStage = target;
    this.stageEntryTime = Date.now();
    return true;
  }

  canRollback(): boolean {
    return this.stageConfigs[this.currentStage].allowRollback && this.rollbackStack.length > 0;
  }

  getRollbackStack(): LifecycleStage[] {
    return [...this.rollbackStack];
  }

  // ── Hooks ────────────────────────────────────────────────────────

  /**
   * Register a hook that runs when entering a stage.
   * Return false from the hook to abort the transition.
   */
  onStageEntry(stage: LifecycleStage, hook: StageHook): void {
    if (!this.entryHooks.has(stage)) this.entryHooks.set(stage, []);
    this.entryHooks.get(stage)!.push(hook);
  }

  /**
   * Register a hook that runs when exiting a stage.
   * Return false from the hook to abort the transition.
   */
  onStageExit(stage: LifecycleStage, hook: StageHook): void {
    if (!this.exitHooks.has(stage)) this.exitHooks.set(stage, []);
    this.exitHooks.get(stage)!.push(hook);
  }

  private async runHooks(type: 'entry' | 'exit', stage: LifecycleStage): Promise<boolean> {
    const hooks = type === 'entry' ? this.entryHooks.get(stage) : this.exitHooks.get(stage);
    if (!hooks) return true;

    for (const hook of hooks) {
      const result = await hook(stage, this.worldId);
      if (result === false) return false;
    }
    return true;
  }

  // ── Timeout handling ─────────────────────────────────────────────

  /**
   * Check if the current stage has exceeded its timeout.
   * Returns remaining time in ms (negative = overdue).
   */
  checkTimeout(now: number = Date.now()): { isExpired: boolean; remainingMs: number } {
    const config = this.stageConfigs[this.currentStage];
    if (config.timeoutMs === 0) {
      return { isExpired: false, remainingMs: Infinity };
    }

    const elapsed = now - this.stageEntryTime;
    const remaining = config.timeoutMs - elapsed;
    return { isExpired: remaining <= 0, remainingMs: remaining };
  }

  /**
   * Get elapsed time in the current stage (ms).
   */
  getStageElapsedMs(now: number = Date.now()): number {
    return now - this.stageEntryTime;
  }

  // ── Stage configuration ──────────────────────────────────────────

  getStageConfig(stage: LifecycleStage): StageConfig {
    return { ...this.stageConfigs[stage] };
  }

  updateStageConfig(stage: LifecycleStage, updates: Partial<StageConfig>): void {
    this.stageConfigs[stage] = { ...this.stageConfigs[stage], ...updates };
  }

  setStageData(stage: LifecycleStage, key: string, value: unknown): void {
    this.stageConfigs[stage].data[key] = value;
  }

  getStageData(stage: LifecycleStage, key: string): unknown {
    return this.stageConfigs[stage].data[key];
  }

  // ── Transition history ───────────────────────────────────────────

  private recordTransition(
    from: LifecycleStage,
    to: LifecycleStage,
    triggeredBy: string,
    wasRollback: boolean,
  ): void {
    const now = Date.now();
    this.transitions.push({
      from,
      to,
      timestamp: now,
      triggeredBy,
      duration: now - this.stageEntryTime,
      wasRollback,
    });
  }

  getDetailedTransitions(): DetailedTransition[] {
    return [...this.transitions];
  }

  /**
   * Get average duration spent in each stage (from completed transitions).
   */
  getStageDurations(): Partial<Record<LifecycleStage, number>> {
    const durations: Partial<Record<LifecycleStage, { total: number; count: number }>> = {};

    for (const t of this.transitions) {
      if (!durations[t.from]) durations[t.from] = { total: 0, count: 0 };
      durations[t.from]!.total += t.duration;
      durations[t.from]!.count++;
    }

    const averages: Partial<Record<LifecycleStage, number>> = {};
    for (const [stage, data] of Object.entries(durations)) {
      averages[stage as LifecycleStage] = data!.total / data!.count;
    }
    return averages;
  }

  /**
   * Get the complete ordered list of stages.
   */
  static getStageOrder(): LifecycleStage[] {
    return [...STAGE_ORDER];
  }
}
