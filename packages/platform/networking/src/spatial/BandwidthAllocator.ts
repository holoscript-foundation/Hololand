/**
 * @hololand/networking BandwidthAllocator
 *
 * Allocates network bandwidth across viewers and entity updates
 * based on priority. Ensures total bandwidth stays within budget
 * while maximizing update quality for high-priority entities.
 */

export interface BandwidthAllocation {
  viewerId: string;
  allocatedBytesPerSec: number;
  entityAllocations: Array<{
    entityId: string;
    bytesPerSec: number;
    updateRateHz: number;
  }>;
}

export interface BandwidthAllocatorConfig {
  /** Total bandwidth budget in bytes/sec across all viewers. */
  totalBudgetBytesPerSec: number;
  /** Minimum bytes/sec per entity update. */
  minEntityBytesPerSec: number;
  /** Maximum bytes/sec per entity update. */
  maxEntityBytesPerSec: number;
  /** Bytes per entity state update. */
  bytesPerUpdate: number;
}

const DEFAULT_CONFIG: BandwidthAllocatorConfig = {
  totalBudgetBytesPerSec: 1_600_000, // ~1.6 MB/s total
  minEntityBytesPerSec: 64,
  maxEntityBytesPerSec: 5_760, // 64 bytes * 90Hz
  bytesPerUpdate: 64,
};

/**
 * Priority-based bandwidth allocator for multiplayer state sync.
 */
export class BandwidthAllocator {
  private config: BandwidthAllocatorConfig;
  private allocations: Map<string, BandwidthAllocation> = new Map();
  private totalUsed: number = 0;

  constructor(config?: Partial<BandwidthAllocatorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Allocate bandwidth for a viewer based on their interest set.
   */
  allocate(
    viewerId: string,
    entities: Array<{ entityId: string; priority: number }>,
  ): BandwidthAllocation {
    const available = this.config.totalBudgetBytesPerSec - this.totalUsed;
    const perViewerBudget = Math.min(
      available,
      this.config.totalBudgetBytesPerSec / Math.max(1, this.allocations.size + 1),
    );

    // Sum priorities for proportional allocation
    const totalPriority = entities.reduce((sum, e) => sum + e.priority, 0);

    const entityAllocations = entities.map((entity) => {
      const fraction = totalPriority > 0 ? entity.priority / totalPriority : 1 / entities.length;
      const bytes = Math.max(
        this.config.minEntityBytesPerSec,
        Math.min(this.config.maxEntityBytesPerSec, perViewerBudget * fraction),
      );
      const updateRate = bytes / this.config.bytesPerUpdate;

      return {
        entityId: entity.entityId,
        bytesPerSec: bytes,
        updateRateHz: Math.min(90, Math.max(1, updateRate)),
      };
    });

    const totalAllocated = entityAllocations.reduce((sum, a) => sum + a.bytesPerSec, 0);

    const allocation: BandwidthAllocation = {
      viewerId,
      allocatedBytesPerSec: totalAllocated,
      entityAllocations,
    };

    // Remove old allocation for this viewer
    const old = this.allocations.get(viewerId);
    if (old) this.totalUsed -= old.allocatedBytesPerSec;

    this.allocations.set(viewerId, allocation);
    this.totalUsed += totalAllocated;

    return allocation;
  }

  /**
   * Release bandwidth for a viewer.
   */
  release(viewerId: string): void {
    const allocation = this.allocations.get(viewerId);
    if (allocation) {
      this.totalUsed -= allocation.allocatedBytesPerSec;
      this.allocations.delete(viewerId);
    }
  }

  /**
   * Get current allocation for a viewer.
   */
  getAllocation(viewerId: string): BandwidthAllocation | undefined {
    return this.allocations.get(viewerId);
  }

  /**
   * Get total bandwidth used.
   */
  getTotalUsed(): number {
    return this.totalUsed;
  }

  /**
   * Get remaining bandwidth budget.
   */
  getRemaining(): number {
    return Math.max(0, this.config.totalBudgetBytesPerSec - this.totalUsed);
  }

  /**
   * Get utilization ratio (0-1).
   */
  getUtilization(): number {
    return this.totalUsed / this.config.totalBudgetBytesPerSec;
  }

  /**
   * Get number of active allocations.
   */
  getAllocationCount(): number {
    return this.allocations.size;
  }

  /**
   * Clear all allocations.
   */
  clear(): void {
    this.allocations.clear();
    this.totalUsed = 0;
  }
}
