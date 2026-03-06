/**
 * @hololand/economy PIDFaucetSink
 *
 * PID-controlled currency faucets and sinks for inflation management.
 * Uses a PID controller targeting a desired money supply growth rate.
 * Faucets inject currency; sinks remove it.
 */

export interface PIDConfig {
  /** Proportional gain. */
  kp: number;
  /** Integral gain. */
  ki: number;
  /** Derivative gain. */
  kd: number;
  /** Target inflation rate (e.g., 0.02 = 2%/period). */
  targetInflationRate: number;
  /** Minimum faucet rate. */
  minFaucetRate: number;
  /** Maximum faucet rate. */
  maxFaucetRate: number;
  /** Minimum sink rate. */
  minSinkRate: number;
  /** Maximum sink rate. */
  maxSinkRate: number;
}

const DEFAULT_PID: PIDConfig = {
  kp: 0.5,
  ki: 0.1,
  kd: 0.05,
  targetInflationRate: 0.02,
  minFaucetRate: 0,
  maxFaucetRate: 1000,
  minSinkRate: 0,
  maxSinkRate: 500,
};

export interface EconomySnapshot {
  totalMoneySupply: number;
  inflationRate: number;
  faucetRate: number;
  sinkRate: number;
  netFlow: number;
  timestamp: number;
}

/**
 * PID-controlled faucet/sink system for VR economy inflation management.
 */
export class PIDFaucetSink {
  private config: PIDConfig;
  private totalMoneySupply: number;
  private previousSupply: number;
  private integral: number = 0;
  private previousError: number = 0;
  private currentFaucetRate: number = 0;
  private currentSinkRate: number = 0;
  private history: EconomySnapshot[] = [];
  private maxHistory: number = 1000;

  constructor(initialSupply: number = 10_000, config?: Partial<PIDConfig>) {
    this.config = { ...DEFAULT_PID, ...config };
    this.totalMoneySupply = initialSupply;
    this.previousSupply = initialSupply;
  }

  /**
   * Update the PID controller for one period.
   * Adjusts faucet and sink rates based on inflation error.
   */
  update(): EconomySnapshot {
    // Calculate current inflation rate
    const inflationRate =
      this.previousSupply > 0
        ? (this.totalMoneySupply - this.previousSupply) / this.previousSupply
        : 0;

    // PID error: difference from target inflation
    const error = this.config.targetInflationRate - inflationRate;
    this.integral += error;
    const derivative = error - this.previousError;
    this.previousError = error;

    // PID output
    const pidOutput =
      this.config.kp * error +
      this.config.ki * this.integral +
      this.config.kd * derivative;

    // Map PID output to faucet/sink rates
    if (pidOutput > 0) {
      // Need more money in circulation
      this.currentFaucetRate = Math.min(this.config.maxFaucetRate, Math.max(this.config.minFaucetRate, pidOutput * 100));
      this.currentSinkRate = this.config.minSinkRate;
    } else {
      // Need less money in circulation
      this.currentFaucetRate = this.config.minFaucetRate;
      this.currentSinkRate = Math.min(this.config.maxSinkRate, Math.max(this.config.minSinkRate, Math.abs(pidOutput) * 100));
    }

    // Apply rates
    this.previousSupply = this.totalMoneySupply;
    this.totalMoneySupply += this.currentFaucetRate - this.currentSinkRate;
    this.totalMoneySupply = Math.max(0, this.totalMoneySupply);

    const snapshot: EconomySnapshot = {
      totalMoneySupply: this.totalMoneySupply,
      inflationRate,
      faucetRate: this.currentFaucetRate,
      sinkRate: this.currentSinkRate,
      netFlow: this.currentFaucetRate - this.currentSinkRate,
      timestamp: Date.now(),
    };

    this.history.push(snapshot);
    if (this.history.length > this.maxHistory) this.history.shift();

    return snapshot;
  }

  /**
   * Inject currency directly (e.g., quest rewards).
   */
  inject(amount: number): void {
    this.totalMoneySupply += amount;
  }

  /**
   * Remove currency directly (e.g., NPC shop purchases).
   */
  drain(amount: number): void {
    this.totalMoneySupply = Math.max(0, this.totalMoneySupply - amount);
  }

  getTotalSupply(): number {
    return this.totalMoneySupply;
  }

  getFaucetRate(): number {
    return this.currentFaucetRate;
  }

  getSinkRate(): number {
    return this.currentSinkRate;
  }

  getHistory(): EconomySnapshot[] {
    return [...this.history];
  }

  getLatestSnapshot(): EconomySnapshot | undefined {
    return this.history.length > 0 ? { ...this.history[this.history.length - 1] } : undefined;
  }
}
