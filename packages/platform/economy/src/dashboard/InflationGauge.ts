/**
 * @hololand/economy InflationGauge
 *
 * Real-time inflation gauge for economic dashboard.
 * Tracks CPI-equivalent metrics for the VR economy.
 */

export interface InflationReading {
  rate: number;
  timestamp: number;
  trend: 'rising' | 'falling' | 'stable';
  severity: 'normal' | 'warning' | 'critical';
}

export class InflationGauge {
  private readings: InflationReading[] = [];
  private maxReadings: number;
  private warningThreshold: number;
  private criticalThreshold: number;

  constructor(warningThreshold: number = 0.05, criticalThreshold: number = 0.15, maxReadings: number = 200) {
    this.warningThreshold = warningThreshold;
    this.criticalThreshold = criticalThreshold;
    this.maxReadings = maxReadings;
  }

  record(rate: number): InflationReading {
    const prev = this.readings.length > 0 ? this.readings[this.readings.length - 1] : null;
    const trend: InflationReading['trend'] = prev
      ? rate > prev.rate + 0.001 ? 'rising' : rate < prev.rate - 0.001 ? 'falling' : 'stable'
      : 'stable';

    const absRate = Math.abs(rate);
    const severity: InflationReading['severity'] =
      absRate >= this.criticalThreshold ? 'critical' :
      absRate >= this.warningThreshold ? 'warning' : 'normal';

    const reading: InflationReading = { rate, timestamp: Date.now(), trend, severity };
    this.readings.push(reading);
    if (this.readings.length > this.maxReadings) this.readings.shift();
    return reading;
  }

  getCurrentRate(): number {
    return this.readings.length > 0 ? this.readings[this.readings.length - 1].rate : 0;
  }

  getAverage(window: number = 10): number {
    const recent = this.readings.slice(-window);
    if (recent.length === 0) return 0;
    return recent.reduce((sum, r) => sum + r.rate, 0) / recent.length;
  }

  getTrend(): InflationReading['trend'] {
    return this.readings.length > 0 ? this.readings[this.readings.length - 1].trend : 'stable';
  }

  getReadings(): InflationReading[] {
    return [...this.readings];
  }
}
