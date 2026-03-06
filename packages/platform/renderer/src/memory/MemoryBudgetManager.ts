/**
 * @hololand/renderer MemoryBudgetManager
 *
 * Dynamic memory budget manager for Quest 3's 8GB RAM.
 * Balances Gaussian primitives, agent KV cache, and model weights.
 */

export interface MemoryBudgetConfig {
  totalBudgetBytes: number;
  gaussianFraction: number;
  kvCacheFraction: number;
  modelWeightFraction: number;
  reservedFraction: number;
  rebalanceIntervalMs: number;
}

const DEFAULT_CONFIG: MemoryBudgetConfig = {
  totalBudgetBytes: 8 * 1024 * 1024 * 1024, // 8GB
  gaussianFraction: 0.40,
  kvCacheFraction: 0.20,
  modelWeightFraction: 0.25,
  reservedFraction: 0.15,
  rebalanceIntervalMs: 1000,
};

export interface PoolStatus {
  name: string;
  allocatedBytes: number;
  usedBytes: number;
  budgetBytes: number;
  utilization: number;
}

export interface BudgetMetrics {
  totalUsed: number;
  totalBudget: number;
  utilization: number;
  pools: PoolStatus[];
  underPressure: boolean;
}

export type MemoryPool = { name: string; allocated: number; used: number; budget: number };

export class MemoryBudgetManager {
  private config: MemoryBudgetConfig;
  private pools: Map<string, MemoryPool> = new Map();

  constructor(config?: Partial<MemoryBudgetConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    const total = this.config.totalBudgetBytes;
    this.pools.set('gaussian', { name: 'gaussian', allocated: 0, used: 0, budget: total * this.config.gaussianFraction });
    this.pools.set('kvCache', { name: 'kvCache', allocated: 0, used: 0, budget: total * this.config.kvCacheFraction });
    this.pools.set('modelWeights', { name: 'modelWeights', allocated: 0, used: 0, budget: total * this.config.modelWeightFraction });
  }

  allocate(poolName: string, bytes: number): boolean {
    const pool = this.pools.get(poolName);
    if (!pool) return false;
    if (pool.allocated + bytes > pool.budget) return false;
    pool.allocated += bytes;
    pool.used += bytes;
    return true;
  }

  release(poolName: string, bytes: number): void {
    const pool = this.pools.get(poolName);
    if (!pool) return;
    pool.allocated = Math.max(0, pool.allocated - bytes);
    pool.used = Math.max(0, pool.used - bytes);
  }

  rebalance(): void {
    const totalUsed = this.getTotalUsed();
    const totalBudget = this.config.totalBudgetBytes * (1 - this.config.reservedFraction);

    for (const pool of this.pools.values()) {
      const utilization = pool.budget > 0 ? pool.used / pool.budget : 0;
      if (utilization < 0.5 && totalUsed > totalBudget * 0.8) {
        // Shrink underutilized pools to give room to others
        const surplus = (pool.budget - pool.used) * 0.25;
        pool.budget -= surplus;
        // Redistribute surplus
        for (const other of this.pools.values()) {
          if (other.name !== pool.name && other.used > other.budget * 0.8) {
            other.budget += surplus / (this.pools.size - 1);
          }
        }
      }
    }
  }

  getPoolStatus(poolName: string): PoolStatus | undefined {
    const pool = this.pools.get(poolName);
    if (!pool) return undefined;
    return {
      name: pool.name,
      allocatedBytes: pool.allocated,
      usedBytes: pool.used,
      budgetBytes: pool.budget,
      utilization: pool.budget > 0 ? pool.used / pool.budget : 0,
    };
  }

  getMetrics(): BudgetMetrics {
    const totalUsed = this.getTotalUsed();
    const pools = Array.from(this.pools.values()).map((p) => ({
      name: p.name,
      allocatedBytes: p.allocated,
      usedBytes: p.used,
      budgetBytes: p.budget,
      utilization: p.budget > 0 ? p.used / p.budget : 0,
    }));

    return {
      totalUsed,
      totalBudget: this.config.totalBudgetBytes,
      utilization: totalUsed / this.config.totalBudgetBytes,
      pools,
      underPressure: totalUsed > this.config.totalBudgetBytes * 0.85,
    };
  }

  getTotalUsed(): number {
    let total = 0;
    for (const pool of this.pools.values()) total += pool.used;
    return total;
  }

  isUnderPressure(): boolean {
    return this.getTotalUsed() > this.config.totalBudgetBytes * 0.85;
  }
}
