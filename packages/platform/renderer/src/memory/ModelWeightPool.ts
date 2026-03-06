/**
 * @hololand/renderer ModelWeightPool
 *
 * Memory pool for loaded model weights (ExecuTorch models).
 */

export interface ModelAllocation {
  modelId: string;
  sizeBytes: number;
  quantization: string;
  loadedAt: number;
  lastAccessedAt: number;
}

export class ModelWeightPool {
  private budgetBytes: number;
  private allocations: Map<string, ModelAllocation> = new Map();
  private usedBytes: number = 0;

  constructor(budgetBytes: number) {
    this.budgetBytes = budgetBytes;
  }

  allocate(modelId: string, sizeBytes: number, quantization: string = 'int4'): boolean {
    if (this.usedBytes + sizeBytes > this.budgetBytes) return false;

    this.allocations.set(modelId, {
      modelId, sizeBytes, quantization,
      loadedAt: Date.now(), lastAccessedAt: Date.now(),
    });
    this.usedBytes += sizeBytes;
    return true;
  }

  release(modelId: string): void {
    const alloc = this.allocations.get(modelId);
    if (alloc) {
      this.usedBytes -= alloc.sizeBytes;
      this.allocations.delete(modelId);
    }
  }

  touch(modelId: string): void {
    const alloc = this.allocations.get(modelId);
    if (alloc) alloc.lastAccessedAt = Date.now();
  }

  evictLRU(): string | null {
    let oldest: string | null = null;
    let oldestTime = Infinity;
    for (const [id, alloc] of this.allocations) {
      if (alloc.lastAccessedAt < oldestTime) {
        oldestTime = alloc.lastAccessedAt;
        oldest = id;
      }
    }
    if (oldest) this.release(oldest);
    return oldest;
  }

  getUsedBytes(): number { return this.usedBytes; }
  getBudgetBytes(): number { return this.budgetBytes; }
  getAllocationCount(): number { return this.allocations.size; }
  getUtilization(): number { return this.usedBytes / this.budgetBytes; }

  setBudget(bytes: number): void { this.budgetBytes = bytes; }
}
