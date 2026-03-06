/**
 * @hololand/agents ReasoningTier
 *
 * Defines inference reasoning tiers with different update frequencies.
 * Spatial reasoning runs at 1-5Hz producing cached state;
 * VR renderer consumes the cache at 90Hz.
 */

export enum ReasoningTierLevel {
  /** Strategic planning, world model updates. 0.2-1Hz. */
  Strategic = 0,
  /** Spatial reasoning, pathfinding, object relationships. 1-5Hz. */
  Spatial = 1,
  /** Reactive behaviors, animation blending, gaze response. 10-30Hz. */
  Reactive = 2,
  /** Render-rate consumption of cached state. 60-90Hz. */
  RenderRate = 3,
}

export interface ReasoningTierConfig {
  level: ReasoningTierLevel;
  name: string;
  minFrequencyHz: number;
  maxFrequencyHz: number;
  /** Maximum compute time budget per invocation in ms. */
  computeBudgetMs: number;
  /** Whether results should be cached for lower tiers. */
  cacheable: boolean;
  /** Priority (lower = higher priority for scheduling). */
  priority: number;
}

export const DEFAULT_TIER_CONFIGS: Record<ReasoningTierLevel, ReasoningTierConfig> = {
  [ReasoningTierLevel.Strategic]: {
    level: ReasoningTierLevel.Strategic,
    name: 'Strategic',
    minFrequencyHz: 0.2,
    maxFrequencyHz: 1,
    computeBudgetMs: 500,
    cacheable: true,
    priority: 3,
  },
  [ReasoningTierLevel.Spatial]: {
    level: ReasoningTierLevel.Spatial,
    name: 'Spatial',
    minFrequencyHz: 1,
    maxFrequencyHz: 5,
    computeBudgetMs: 50,
    cacheable: true,
    priority: 2,
  },
  [ReasoningTierLevel.Reactive]: {
    level: ReasoningTierLevel.Reactive,
    name: 'Reactive',
    minFrequencyHz: 10,
    maxFrequencyHz: 30,
    computeBudgetMs: 5,
    cacheable: true,
    priority: 1,
  },
  [ReasoningTierLevel.RenderRate]: {
    level: ReasoningTierLevel.RenderRate,
    name: 'RenderRate',
    minFrequencyHz: 60,
    maxFrequencyHz: 90,
    computeBudgetMs: 1,
    cacheable: false,
    priority: 0,
  },
};

export interface InferenceTask {
  id: string;
  agentId: string;
  tier: ReasoningTierLevel;
  inputData: unknown;
  createdAt: number;
  deadline: number;
  /** Callback to produce the result. */
  compute: () => Promise<unknown> | unknown;
}

export interface InferenceResult {
  taskId: string;
  agentId: string;
  tier: ReasoningTierLevel;
  result: unknown;
  computeTimeMs: number;
  timestamp: number;
  fromCache: boolean;
}

/**
 * Manages reasoning tier configuration and task creation.
 */
export class ReasoningTierManager {
  private configs: Map<ReasoningTierLevel, ReasoningTierConfig> = new Map();

  constructor(overrides?: Partial<Record<ReasoningTierLevel, Partial<ReasoningTierConfig>>>) {
    for (const [level, config] of Object.entries(DEFAULT_TIER_CONFIGS)) {
      const numLevel = Number(level) as ReasoningTierLevel;
      const override = overrides?.[numLevel];
      this.configs.set(numLevel, override ? { ...config, ...override } : { ...config });
    }
  }

  getConfig(tier: ReasoningTierLevel): ReasoningTierConfig {
    return this.configs.get(tier)!;
  }

  /**
   * Compute the target interval in ms for a tier.
   */
  getTargetIntervalMs(tier: ReasoningTierLevel): number {
    const config = this.configs.get(tier)!;
    const avgHz = (config.minFrequencyHz + config.maxFrequencyHz) / 2;
    return 1000 / avgHz;
  }

  /**
   * Check if a task can still meet its deadline.
   */
  canMeetDeadline(task: InferenceTask, now: number = Date.now()): boolean {
    const config = this.configs.get(task.tier)!;
    return now + config.computeBudgetMs <= task.deadline;
  }

  /**
   * Create an inference task for a given tier.
   */
  createTask(
    agentId: string,
    tier: ReasoningTierLevel,
    inputData: unknown,
    compute: () => Promise<unknown> | unknown,
  ): InferenceTask {
    const config = this.configs.get(tier)!;
    const now = Date.now();
    return {
      id: `task_${agentId}_${tier}_${now}`,
      agentId,
      tier,
      inputData,
      createdAt: now,
      deadline: now + config.computeBudgetMs * 2,
      compute,
    };
  }
}
