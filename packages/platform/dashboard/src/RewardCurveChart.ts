/**
 * @hololand/dashboard RewardCurveChart
 *
 * Tracks and visualizes GRPO reward curves across training steps.
 * Supports multiple reward groups and computes moving averages for
 * smooth trend visualization in VR.
 */

export interface RewardDataPoint {
  step: number;
  reward: number;
  groupId: string;
  timestamp: number;
}

export interface RewardCurveSnapshot {
  groupId: string;
  points: RewardDataPoint[];
  movingAverage: number[];
  currentReward: number;
  bestReward: number;
  bestStep: number;
  trend: 'improving' | 'plateaued' | 'declining';
}

export class RewardCurveChart {
  private data: Map<string, RewardDataPoint[]> = new Map();
  private windowSize: number;
  private maxPoints: number;

  constructor(windowSize: number = 50, maxPoints: number = 10_000) {
    this.windowSize = windowSize;
    this.maxPoints = maxPoints;
  }

  addPoint(step: number, reward: number, groupId: string = 'default'): void {
    if (!this.data.has(groupId)) {
      this.data.set(groupId, []);
    }
    const points = this.data.get(groupId)!;
    points.push({ step, reward, groupId, timestamp: Date.now() });

    // Evict oldest if over capacity
    if (points.length > this.maxPoints) {
      points.shift();
    }
  }

  addBatch(points: Array<{ step: number; reward: number; groupId?: string }>): void {
    for (const p of points) {
      this.addPoint(p.step, p.reward, p.groupId ?? 'default');
    }
  }

  getPoints(groupId: string = 'default'): RewardDataPoint[] {
    return [...(this.data.get(groupId) ?? [])];
  }

  getGroups(): string[] {
    return [...this.data.keys()];
  }

  /** Compute simple moving average for a group */
  computeMovingAverage(groupId: string = 'default'): number[] {
    const points = this.data.get(groupId);
    if (!points || points.length === 0) return [];

    const ma: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const start = Math.max(0, i - this.windowSize + 1);
      const window = points.slice(start, i + 1);
      const avg = window.reduce((sum, p) => sum + p.reward, 0) / window.length;
      ma.push(avg);
    }
    return ma;
  }

  /** Detect trend based on recent moving average slope */
  detectTrend(groupId: string = 'default'): 'improving' | 'plateaued' | 'declining' {
    const ma = this.computeMovingAverage(groupId);
    if (ma.length < 2) return 'plateaued';

    const recentCount = Math.min(20, Math.floor(ma.length / 2));
    const recent = ma.slice(-recentCount);
    const earlier = ma.slice(-recentCount * 2, -recentCount);

    if (earlier.length === 0) return 'plateaued';

    const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
    const earlierAvg = earlier.reduce((s, v) => s + v, 0) / earlier.length;
    const delta = recentAvg - earlierAvg;

    const threshold = 0.01;
    if (delta > threshold) return 'improving';
    if (delta < -threshold) return 'declining';
    return 'plateaued';
  }

  /** Get full snapshot for a group */
  getSnapshot(groupId: string = 'default'): RewardCurveSnapshot | null {
    const points = this.data.get(groupId);
    if (!points || points.length === 0) return null;

    const movingAverage = this.computeMovingAverage(groupId);
    let bestReward = -Infinity;
    let bestStep = 0;

    for (const p of points) {
      if (p.reward > bestReward) {
        bestReward = p.reward;
        bestStep = p.step;
      }
    }

    return {
      groupId,
      points: [...points],
      movingAverage,
      currentReward: points[points.length - 1].reward,
      bestReward,
      bestStep,
      trend: this.detectTrend(groupId),
    };
  }

  /** Get snapshots for all groups */
  getAllSnapshots(): RewardCurveSnapshot[] {
    const snapshots: RewardCurveSnapshot[] = [];
    for (const groupId of this.data.keys()) {
      const snap = this.getSnapshot(groupId);
      if (snap) snapshots.push(snap);
    }
    return snapshots;
  }

  /** Compute exponential moving average */
  computeEMA(groupId: string = 'default', alpha: number = 0.1): number[] {
    const points = this.data.get(groupId);
    if (!points || points.length === 0) return [];

    const ema: number[] = [points[0].reward];
    for (let i = 1; i < points.length; i++) {
      ema.push(alpha * points[i].reward + (1 - alpha) * ema[i - 1]);
    }
    return ema;
  }

  getTotalPoints(): number {
    let total = 0;
    for (const points of this.data.values()) {
      total += points.length;
    }
    return total;
  }

  clear(groupId?: string): void {
    if (groupId) {
      this.data.delete(groupId);
    } else {
      this.data.clear();
    }
  }
}
