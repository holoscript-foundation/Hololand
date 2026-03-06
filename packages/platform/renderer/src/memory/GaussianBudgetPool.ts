/**
 * @hololand/renderer GaussianBudgetPool
 *
 * Memory pool for Gaussian splatting primitives.
 * Tracks splat counts, memory usage, and enforces LOD-based budgets.
 */

export interface GaussianAllocation {
  id: string;
  splatCount: number;
  bytesPerSplat: number;
  lodLevel: number;
  totalBytes: number;
}

export class GaussianBudgetPool {
  private budgetBytes: number;
  private allocations: Map<string, GaussianAllocation> = new Map();
  private usedBytes: number = 0;
  private readonly BYTES_PER_SPLAT = 64; // Position(12) + Color(16) + Covariance(24) + Opacity(4) + Padding(8)

  constructor(budgetBytes: number) {
    this.budgetBytes = budgetBytes;
  }

  allocate(id: string, splatCount: number, lodLevel: number = 0): boolean {
    const bytes = splatCount * this.BYTES_PER_SPLAT;
    if (this.usedBytes + bytes > this.budgetBytes) return false;

    this.allocations.set(id, { id, splatCount, bytesPerSplat: this.BYTES_PER_SPLAT, lodLevel, totalBytes: bytes });
    this.usedBytes += bytes;
    return true;
  }

  release(id: string): void {
    const alloc = this.allocations.get(id);
    if (alloc) {
      this.usedBytes -= alloc.totalBytes;
      this.allocations.delete(id);
    }
  }

  getMaxSplatsRemaining(): number {
    return Math.floor((this.budgetBytes - this.usedBytes) / this.BYTES_PER_SPLAT);
  }

  getUsedBytes(): number { return this.usedBytes; }
  getBudgetBytes(): number { return this.budgetBytes; }
  getAllocationCount(): number { return this.allocations.size; }
  getUtilization(): number { return this.usedBytes / this.budgetBytes; }

  setBudget(bytes: number): void { this.budgetBytes = bytes; }
}
