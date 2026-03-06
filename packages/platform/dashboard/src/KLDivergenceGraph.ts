/**
 * @hololand/dashboard KLDivergenceGraph
 *
 * Tracks KL divergence between reference and trained policy during GRPO.
 * Provides real-time monitoring with configurable KL penalty thresholds
 * and divergence alerts for VR dashboard visualization.
 */

export interface KLDataPoint {
  step: number;
  klDivergence: number;
  reverseKL: number;
  timestamp: number;
}

export interface KLAlert {
  step: number;
  klValue: number;
  threshold: number;
  severity: 'warning' | 'critical';
  message: string;
}

export interface KLSnapshot {
  points: KLDataPoint[];
  currentKL: number;
  averageKL: number;
  maxKL: number;
  minKL: number;
  alerts: KLAlert[];
  withinBudget: boolean;
  klBudget: number;
}

export class KLDivergenceGraph {
  private data: KLDataPoint[] = [];
  private alerts: KLAlert[] = [];
  private klBudget: number;
  private warningThreshold: number;
  private criticalThreshold: number;
  private maxPoints: number;

  constructor(
    klBudget: number = 0.2,
    warningThreshold: number = 0.15,
    criticalThreshold: number = 0.25,
    maxPoints: number = 10_000,
  ) {
    this.klBudget = klBudget;
    this.warningThreshold = warningThreshold;
    this.criticalThreshold = criticalThreshold;
    this.maxPoints = maxPoints;
  }

  addPoint(step: number, klDivergence: number, reverseKL?: number): void {
    const point: KLDataPoint = {
      step,
      klDivergence,
      reverseKL: reverseKL ?? this.estimateReverseKL(klDivergence),
      timestamp: Date.now(),
    };
    this.data.push(point);

    // Evict oldest
    if (this.data.length > this.maxPoints) {
      this.data.shift();
    }

    // Check thresholds
    if (klDivergence >= this.criticalThreshold) {
      this.alerts.push({
        step,
        klValue: klDivergence,
        threshold: this.criticalThreshold,
        severity: 'critical',
        message: `KL divergence ${klDivergence.toFixed(4)} exceeds critical threshold ${this.criticalThreshold}`,
      });
    } else if (klDivergence >= this.warningThreshold) {
      this.alerts.push({
        step,
        klValue: klDivergence,
        threshold: this.warningThreshold,
        severity: 'warning',
        message: `KL divergence ${klDivergence.toFixed(4)} exceeds warning threshold ${this.warningThreshold}`,
      });
    }
  }

  /** Rough estimate of reverse KL from forward KL using Pinsker's bound */
  private estimateReverseKL(forwardKL: number): number {
    // Reverse KL is typically larger; approximate as 1.2x forward for small values
    return forwardKL * 1.2;
  }

  addBatch(points: Array<{ step: number; klDivergence: number; reverseKL?: number }>): void {
    for (const p of points) {
      this.addPoint(p.step, p.klDivergence, p.reverseKL);
    }
  }

  getPoints(): KLDataPoint[] {
    return [...this.data];
  }

  getAlerts(): KLAlert[] {
    return [...this.alerts];
  }

  getCriticalAlerts(): KLAlert[] {
    return this.alerts.filter(a => a.severity === 'critical');
  }

  getWarningAlerts(): KLAlert[] {
    return this.alerts.filter(a => a.severity === 'warning');
  }

  /** Check if current KL is within the configured budget */
  isWithinBudget(): boolean {
    if (this.data.length === 0) return true;
    return this.data[this.data.length - 1].klDivergence <= this.klBudget;
  }

  /** Compute statistics over the full history */
  getStatistics(): { mean: number; std: number; min: number; max: number; median: number } {
    if (this.data.length === 0) {
      return { mean: 0, std: 0, min: 0, max: 0, median: 0 };
    }

    const values = this.data.map(d => d.klDivergence);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    return {
      mean,
      std: Math.sqrt(variance),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median,
    };
  }

  /** Compute moving average for smoothed visualization */
  computeMovingAverage(windowSize: number = 20): number[] {
    const ma: number[] = [];
    for (let i = 0; i < this.data.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const window = this.data.slice(start, i + 1);
      const avg = window.reduce((sum, p) => sum + p.klDivergence, 0) / window.length;
      ma.push(avg);
    }
    return ma;
  }

  /** Get full snapshot for dashboard rendering */
  getSnapshot(): KLSnapshot {
    if (this.data.length === 0) {
      return {
        points: [],
        currentKL: 0,
        averageKL: 0,
        maxKL: 0,
        minKL: 0,
        alerts: [],
        withinBudget: true,
        klBudget: this.klBudget,
      };
    }

    const stats = this.getStatistics();

    return {
      points: [...this.data],
      currentKL: this.data[this.data.length - 1].klDivergence,
      averageKL: stats.mean,
      maxKL: stats.max,
      minKL: stats.min,
      alerts: [...this.alerts],
      withinBudget: this.isWithinBudget(),
      klBudget: this.klBudget,
    };
  }

  /** Suggest KL coefficient adjustment based on recent trend */
  suggestKLCoefficient(): { suggestion: 'increase' | 'decrease' | 'maintain'; reason: string } {
    if (this.data.length < 10) {
      return { suggestion: 'maintain', reason: 'Insufficient data' };
    }

    const recent = this.data.slice(-10);
    const recentAvg = recent.reduce((s, d) => s + d.klDivergence, 0) / recent.length;

    if (recentAvg > this.klBudget * 1.5) {
      return { suggestion: 'increase', reason: `Recent KL avg (${recentAvg.toFixed(4)}) far exceeds budget (${this.klBudget})` };
    }
    if (recentAvg < this.klBudget * 0.3) {
      return { suggestion: 'decrease', reason: `Recent KL avg (${recentAvg.toFixed(4)}) well below budget (${this.klBudget}), may under-explore` };
    }
    return { suggestion: 'maintain', reason: `Recent KL avg (${recentAvg.toFixed(4)}) within healthy range` };
  }

  getKLBudget(): number {
    return this.klBudget;
  }

  setKLBudget(budget: number): void {
    this.klBudget = budget;
  }

  getTotalPoints(): number {
    return this.data.length;
  }

  clear(): void {
    this.data = [];
    this.alerts = [];
  }
}
