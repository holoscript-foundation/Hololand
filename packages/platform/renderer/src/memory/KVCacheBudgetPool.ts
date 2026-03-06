/**
 * @hololand/renderer KVCacheBudgetPool
 *
 * Memory pool for agent KV (key-value) cache used during LLM inference.
 */

export interface KVCacheAllocation {
  agentId: string;
  sequenceLength: number;
  headCount: number;
  headDim: number;
  layers: number;
  totalBytes: number;
}

export class KVCacheBudgetPool {
  private budgetBytes: number;
  private allocations: Map<string, KVCacheAllocation> = new Map();
  private usedBytes: number = 0;

  constructor(budgetBytes: number) {
    this.budgetBytes = budgetBytes;
  }

  allocate(agentId: string, sequenceLength: number, headCount: number = 32, headDim: number = 64, layers: number = 26): boolean {
    // KV cache size: 2 * layers * seqLen * headCount * headDim * 2 bytes (fp16)
    const bytes = 2 * layers * sequenceLength * headCount * headDim * 2;
    if (this.usedBytes + bytes > this.budgetBytes) return false;

    this.allocations.set(agentId, { agentId, sequenceLength, headCount, headDim, layers, totalBytes: bytes });
    this.usedBytes += bytes;
    return true;
  }

  release(agentId: string): void {
    const alloc = this.allocations.get(agentId);
    if (alloc) {
      this.usedBytes -= alloc.totalBytes;
      this.allocations.delete(agentId);
    }
  }

  getMaxSequenceLength(headCount: number = 32, headDim: number = 64, layers: number = 26): number {
    const remaining = this.budgetBytes - this.usedBytes;
    return Math.floor(remaining / (2 * layers * headCount * headDim * 2));
  }

  getUsedBytes(): number { return this.usedBytes; }
  getBudgetBytes(): number { return this.budgetBytes; }
  getAllocationCount(): number { return this.allocations.size; }
  getUtilization(): number { return this.usedBytes / this.budgetBytes; }

  setBudget(bytes: number): void { this.budgetBytes = bytes; }
}
