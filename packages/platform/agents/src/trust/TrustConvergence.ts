/**
 * @hololand/agents TrustConvergence
 *
 * Measures trust convergence across the gossip mesh.
 */

export class TrustConvergence {
  private snapshots: Map<string, number>[] = [];
  private maxSnapshots: number = 100;

  recordSnapshot(scores: Map<string, number>): void {
    this.snapshots.push(new Map(scores));
    if (this.snapshots.length > this.maxSnapshots) this.snapshots.shift();
  }

  hasConverged(tolerance: number = 0.05): boolean {
    if (this.snapshots.length < 2) return false;
    const prev = this.snapshots[this.snapshots.length - 2];
    const curr = this.snapshots[this.snapshots.length - 1];
    let maxDiff = 0;
    for (const [key, val] of curr) {
      const prevVal = prev.get(key) ?? 0;
      maxDiff = Math.max(maxDiff, Math.abs(val - prevVal));
    }
    return maxDiff <= tolerance;
  }

  getRoundsToConvergence(): number { return this.snapshots.length; }
}
