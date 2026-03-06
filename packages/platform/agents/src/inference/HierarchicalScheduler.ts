/**
 * @hololand/agents HierarchicalScheduler
 *
 * Schedules inference tasks across reasoning tiers with priority queuing.
 * Spatial reasoning at 1-5Hz produces cached state; VR renderer consumes
 * at 90Hz via the RenderBridge.
 *
 * Architecture:
 * - Priority queue per tier, ordered by deadline
 * - Compute budget enforcement per tier
 * - Automatic caching of results
 * - Starvation prevention for lower-priority tiers
 */

import { InferenceCache } from './InferenceCache';
import { RenderBridge } from './RenderBridge';
import {
  ReasoningTierManager,
  ReasoningTierLevel,
  type InferenceTask,
  type InferenceResult,
} from './ReasoningTier';

export interface HierarchicalSchedulerConfig {
  /** Total compute budget per tick in ms. */
  totalComputeBudgetMs: number;
  /** Fraction of budget reserved for each tier (must sum to <= 1). */
  tierBudgetFractions: Record<ReasoningTierLevel, number>;
  /** Maximum queued tasks per tier. */
  maxQueueSizePerTier: number;
}

const DEFAULT_SCHEDULER_CONFIG: HierarchicalSchedulerConfig = {
  totalComputeBudgetMs: 11.1, // 90fps budget
  tierBudgetFractions: {
    [ReasoningTierLevel.Strategic]: 0.1,
    [ReasoningTierLevel.Spatial]: 0.4,
    [ReasoningTierLevel.Reactive]: 0.4,
    [ReasoningTierLevel.RenderRate]: 0.1,
  },
  maxQueueSizePerTier: 64,
};

export interface SchedulerMetrics {
  tasksScheduled: number;
  tasksCompleted: number;
  tasksDropped: number;
  averageLatencyMs: Record<ReasoningTierLevel, number>;
  cacheHitRate: number;
  budgetUtilization: number;
}

/**
 * Hierarchical inference scheduler for multi-tier agent reasoning.
 */
export class HierarchicalScheduler {
  private config: HierarchicalSchedulerConfig;
  private tierManager: ReasoningTierManager;
  private cache: InferenceCache;
  private renderBridge: RenderBridge;
  private queues: Map<ReasoningTierLevel, InferenceTask[]> = new Map();
  private stats = {
    tasksScheduled: 0,
    tasksCompleted: 0,
    tasksDropped: 0,
    latencies: new Map<ReasoningTierLevel, number[]>(),
    totalComputeUsed: 0,
    totalComputeBudget: 0,
  };

  constructor(
    cache: InferenceCache,
    renderBridge: RenderBridge,
    config?: Partial<HierarchicalSchedulerConfig>,
  ) {
    this.config = { ...DEFAULT_SCHEDULER_CONFIG, ...config };
    this.tierManager = new ReasoningTierManager();
    this.cache = cache;
    this.renderBridge = renderBridge;

    // Initialize queues
    for (const tier of [
      ReasoningTierLevel.Strategic,
      ReasoningTierLevel.Spatial,
      ReasoningTierLevel.Reactive,
      ReasoningTierLevel.RenderRate,
    ]) {
      this.queues.set(tier, []);
      this.stats.latencies.set(tier, []);
    }
  }

  /**
   * Submit an inference task for scheduling.
   */
  scheduleTask(
    agentId: string,
    tier: ReasoningTierLevel,
    cacheKey: string,
    inputData: unknown,
    compute: () => Promise<unknown> | unknown,
  ): boolean {
    // Check if cached result is still valid
    const cached = this.cache.get(agentId, tier, cacheKey);
    if (cached) {
      // Reuse cached result, push to render bridge
      this.renderBridge.pushInferenceResult(agentId, cached);
      return true;
    }

    const queue = this.queues.get(tier)!;
    if (queue.length >= this.config.maxQueueSizePerTier) {
      this.stats.tasksDropped++;
      return false;
    }

    const task = this.tierManager.createTask(agentId, tier, inputData, compute);
    // Insert sorted by deadline (earliest first)
    const insertIdx = queue.findIndex((t) => t.deadline > task.deadline);
    if (insertIdx === -1) {
      queue.push(task);
    } else {
      queue.splice(insertIdx, 0, task);
    }

    this.stats.tasksScheduled++;
    return true;
  }

  /**
   * Process one scheduling tick. Dequeues and executes tasks
   * within the compute budget for each tier.
   */
  async processTick(): Promise<InferenceResult[]> {
    const results: InferenceResult[] = [];
    const now = Date.now();
    let totalBudgetUsed = 0;

    // Process tiers in priority order (RenderRate first, then Reactive, etc.)
    const tierOrder = [
      ReasoningTierLevel.RenderRate,
      ReasoningTierLevel.Reactive,
      ReasoningTierLevel.Spatial,
      ReasoningTierLevel.Strategic,
    ];

    for (const tier of tierOrder) {
      const queue = this.queues.get(tier)!;
      const tierBudget =
        this.config.totalComputeBudgetMs * this.config.tierBudgetFractions[tier];
      let tierBudgetUsed = 0;

      while (queue.length > 0 && tierBudgetUsed < tierBudget) {
        const task = queue[0];

        // Skip expired tasks
        if (!this.tierManager.canMeetDeadline(task, now)) {
          queue.shift();
          this.stats.tasksDropped++;
          continue;
        }

        queue.shift();
        const startTime = performance.now();

        try {
          const rawResult = await task.compute();
          const computeTime = performance.now() - startTime;
          tierBudgetUsed += computeTime;
          totalBudgetUsed += computeTime;

          const result: InferenceResult = {
            taskId: task.id,
            agentId: task.agentId,
            tier: task.tier,
            result: rawResult,
            computeTimeMs: computeTime,
            timestamp: Date.now(),
            fromCache: false,
          };

          // Cache if tier supports it
          const tierConfig = this.tierManager.getConfig(tier);
          if (tierConfig.cacheable) {
            const cacheKey = this.extractCacheKey(task);
            this.cache.put(task.agentId, tier, cacheKey, result);
          }

          // Push to render bridge
          this.renderBridge.pushInferenceResult(task.agentId, result);

          results.push(result);
          this.stats.tasksCompleted++;

          // Track latency
          const latencies = this.stats.latencies.get(tier)!;
          latencies.push(computeTime);
          if (latencies.length > 100) latencies.shift();
        } catch {
          this.stats.tasksDropped++;
        }
      }
    }

    this.stats.totalComputeUsed += totalBudgetUsed;
    this.stats.totalComputeBudget += this.config.totalComputeBudgetMs;

    return results;
  }

  /**
   * Get scheduler metrics.
   */
  getMetrics(): SchedulerMetrics {
    const avgLatencies: Record<ReasoningTierLevel, number> = {
      [ReasoningTierLevel.Strategic]: 0,
      [ReasoningTierLevel.Spatial]: 0,
      [ReasoningTierLevel.Reactive]: 0,
      [ReasoningTierLevel.RenderRate]: 0,
    };

    for (const [tier, latencies] of this.stats.latencies) {
      if (latencies.length > 0) {
        avgLatencies[tier] = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      }
    }

    return {
      tasksScheduled: this.stats.tasksScheduled,
      tasksCompleted: this.stats.tasksCompleted,
      tasksDropped: this.stats.tasksDropped,
      averageLatencyMs: avgLatencies,
      cacheHitRate: this.cache.getStats().hitRate,
      budgetUtilization:
        this.stats.totalComputeBudget > 0
          ? this.stats.totalComputeUsed / this.stats.totalComputeBudget
          : 0,
    };
  }

  /**
   * Get queue depths per tier.
   */
  getQueueDepths(): Record<ReasoningTierLevel, number> {
    const depths: Record<ReasoningTierLevel, number> = {
      [ReasoningTierLevel.Strategic]: 0,
      [ReasoningTierLevel.Spatial]: 0,
      [ReasoningTierLevel.Reactive]: 0,
      [ReasoningTierLevel.RenderRate]: 0,
    };
    for (const [tier, queue] of this.queues) {
      depths[tier] = queue.length;
    }
    return depths;
  }

  /**
   * Get underlying components.
   */
  getCache(): InferenceCache {
    return this.cache;
  }

  getRenderBridge(): RenderBridge {
    return this.renderBridge;
  }

  getTierManager(): ReasoningTierManager {
    return this.tierManager;
  }

  private extractCacheKey(task: InferenceTask): string {
    return `${task.agentId}_${task.tier}`;
  }
}
