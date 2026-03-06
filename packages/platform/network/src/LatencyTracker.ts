/**
 * @hololand/network LatencyTracker
 *
 * Rolling RTT statistics for adaptive interpolation delay.
 * Maintains a ring buffer of RTT samples and computes mean, jitter,
 * and an adaptive interpolation delay that responds to network conditions.
 */

export class LatencyTracker {
  private samples: number[];
  private head: number = 0;
  private count: number = 0;
  private readonly maxSamples: number;

  private _meanRTT: number = 100;
  private _jitter: number = 0;
  private _adaptiveDelay: number = 100;
  private readonly smoothingFactor: number = 0.9;
  private readonly minDelay: number = 50;
  private readonly maxDelay: number = 500;

  constructor(maxSamples: number = 60) {
    this.maxSamples = maxSamples;
    this.samples = new Array(maxSamples).fill(0);
  }

  /**
   * Add a new RTT sample (in ms).
   * Called from NetworkClient.handlePong().
   */
  addSample(rttMs: number): void {
    this.samples[this.head] = rttMs;
    this.head = (this.head + 1) % this.maxSamples;
    if (this.count < this.maxSamples) this.count++;

    this.recompute();
  }

  private recompute(): void {
    if (this.count === 0) return;

    // Compute mean RTT
    let sum = 0;
    for (let i = 0; i < this.count; i++) {
      sum += this.samples[i];
    }
    const mean = sum / this.count;

    // Compute jitter (mean absolute deviation)
    let jitterSum = 0;
    for (let i = 0; i < this.count; i++) {
      jitterSum += Math.abs(this.samples[i] - mean);
    }
    const jitter = jitterSum / this.count;

    this._meanRTT = mean;
    this._jitter = jitter;

    // Adaptive delay: half RTT + 2*jitter + 20ms safety margin
    const computed = mean / 2 + 2 * jitter + 20;

    // EMA smoothing to avoid sudden jumps
    this._adaptiveDelay = this.smoothingFactor * this._adaptiveDelay
      + (1 - this.smoothingFactor) * computed;

    // Clamp to sane range
    this._adaptiveDelay = Math.max(this.minDelay, Math.min(this.maxDelay, this._adaptiveDelay));
  }

  /** Mean round-trip time in ms. */
  get meanRTT(): number { return this._meanRTT; }

  /** Mean absolute deviation of RTT in ms. */
  get jitter(): number { return this._jitter; }

  /**
   * Recommended interpolation delay in ms.
   * Smoothed via EMA, clamped to [50ms, 500ms].
   */
  get adaptiveDelay(): number { return this._adaptiveDelay; }

  /**
   * Recommended extrapolation horizon in ms.
   * Based on mean RTT + 2*jitter + safety margin.
   */
  get extrapolationHorizon(): number {
    return this._meanRTT + 2 * this._jitter + 20;
  }

  /** Number of samples collected so far. */
  get sampleCount(): number { return this.count; }
}
