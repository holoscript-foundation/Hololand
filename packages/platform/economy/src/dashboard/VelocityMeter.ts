/**
 * @hololand/economy VelocityMeter
 *
 * Measures money velocity (MV = PQ/M) for the VR economy.
 * Tracks how frequently currency changes hands.
 */

export interface VelocityReading {
  velocity: number;
  transactionCount: number;
  totalVolume: number;
  moneySupply: number;
  timestamp: number;
}

export class VelocityMeter {
  private readings: VelocityReading[] = [];
  private transactionCount: number = 0;
  private totalVolume: number = 0;
  private maxReadings: number;

  constructor(maxReadings: number = 200) {
    this.maxReadings = maxReadings;
  }

  recordTransaction(volume: number): void {
    this.transactionCount++;
    this.totalVolume += volume;
  }

  /**
   * Compute velocity for the current period and record it.
   */
  computeVelocity(moneySupply: number): VelocityReading {
    const velocity = moneySupply > 0 ? this.totalVolume / moneySupply : 0;
    const reading: VelocityReading = {
      velocity,
      transactionCount: this.transactionCount,
      totalVolume: this.totalVolume,
      moneySupply,
      timestamp: Date.now(),
    };
    this.readings.push(reading);
    if (this.readings.length > this.maxReadings) this.readings.shift();

    // Reset counters for next period
    this.transactionCount = 0;
    this.totalVolume = 0;

    return reading;
  }

  getCurrentVelocity(): number {
    return this.readings.length > 0 ? this.readings[this.readings.length - 1].velocity : 0;
  }

  getReadings(): VelocityReading[] {
    return [...this.readings];
  }

  getAverageVelocity(window: number = 10): number {
    const recent = this.readings.slice(-window);
    if (recent.length === 0) return 0;
    return recent.reduce((sum, r) => sum + r.velocity, 0) / recent.length;
  }
}
