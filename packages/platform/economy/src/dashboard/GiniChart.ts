/**
 * @hololand/economy GiniChart
 *
 * Gini coefficient time series chart data provider.
 */

export interface GiniDataPoint {
  gini: number;
  timestamp: number;
  playerCount: number;
}

export class GiniChart {
  private dataPoints: GiniDataPoint[] = [];
  private maxPoints: number;
  private targetGini: number;

  constructor(targetGini: number = 0.4, maxPoints: number = 500) {
    this.targetGini = targetGini;
    this.maxPoints = maxPoints;
  }

  record(gini: number, playerCount: number): GiniDataPoint {
    const point: GiniDataPoint = { gini, timestamp: Date.now(), playerCount };
    this.dataPoints.push(point);
    if (this.dataPoints.length > this.maxPoints) this.dataPoints.shift();
    return point;
  }

  getCurrentGini(): number {
    return this.dataPoints.length > 0 ? this.dataPoints[this.dataPoints.length - 1].gini : 0;
  }

  isAboveTarget(): boolean {
    return this.getCurrentGini() > this.targetGini;
  }

  getDeviationFromTarget(): number {
    return this.getCurrentGini() - this.targetGini;
  }

  getDataPoints(): GiniDataPoint[] {
    return [...this.dataPoints];
  }

  getTargetGini(): number {
    return this.targetGini;
  }
}
