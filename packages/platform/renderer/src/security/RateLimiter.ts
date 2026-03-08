/**
 * Sliding-window rate limiter for cross-reality handoff operations.
 *
 * Uses a per-device request timestamp log so the window slides
 * continuously rather than resetting at fixed intervals.
 *
 * @module security/RateLimiter
 */

export interface RateLimiterConfig {
  /** Maximum requests allowed within the window. */
  maxRequests: number;
  /** Sliding window duration in milliseconds (e.g. 60_000 = 1 minute). */
  windowMs: number;
  /** Extra burst capacity on top of maxRequests (default: 0). */
  burstAllowance?: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed. */
  allowed: boolean;
  /** Number of requests still available in the current window. */
  remaining: number;
  /** Milliseconds until the oldest request in the window expires. */
  resetMs: number;
  /** If the request is denied, how long the caller should wait (ms). */
  retryAfterMs?: number;
}

interface DeviceRecord {
  /** Timestamps of requests that fall inside the current window. */
  timestamps: number[];
}

export class RateLimiter {
  private readonly config: Required<RateLimiterConfig>;
  private readonly devices: Map<string, DeviceRecord> = new Map();

  constructor(config: RateLimiterConfig) {
    this.config = {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      burstAllowance: config.burstAllowance ?? 0,
    };
  }

  // ── public API ────────────────────────────────────────────────────────

  /**
   * Check whether a request from `deviceId` would be allowed right now.
   * Does **not** record the request; call {@link record} after a
   * successful check if you want to consume a slot.
   */
  check(deviceId: string): RateLimitResult {
    const now = Date.now();
    const effectiveMax = this.config.maxRequests + this.config.burstAllowance;

    const record = this.devices.get(deviceId);
    if (!record) {
      return {
        allowed: true,
        remaining: effectiveMax,
        resetMs: this.config.windowMs,
      };
    }

    // Evict timestamps outside the sliding window.
    this.evict(record, now);

    const count = record.timestamps.length;
    const remaining = Math.max(0, effectiveMax - count);

    if (count >= effectiveMax) {
      // The oldest timestamp in the window determines when a slot opens.
      const oldestTs = record.timestamps[0];
      const retryAfterMs = oldestTs + this.config.windowMs - now;
      return {
        allowed: false,
        remaining: 0,
        resetMs: Math.max(0, retryAfterMs),
        retryAfterMs: Math.max(0, retryAfterMs),
      };
    }

    const resetMs =
      record.timestamps.length > 0
        ? record.timestamps[0] + this.config.windowMs - now
        : this.config.windowMs;

    return {
      allowed: true,
      remaining,
      resetMs: Math.max(0, resetMs),
    };
  }

  /**
   * Record a request for `deviceId`.
   * Should be called after {@link check} returns `allowed: true`.
   */
  record(deviceId: string): void {
    const now = Date.now();
    let rec = this.devices.get(deviceId);
    if (!rec) {
      rec = { timestamps: [] };
      this.devices.set(deviceId, rec);
    }
    this.evict(rec, now);
    rec.timestamps.push(now);
  }

  /** Reset the rate-limit state for a single device. */
  reset(deviceId: string): void {
    this.devices.delete(deviceId);
  }

  /** Reset rate-limit state for all devices. */
  resetAll(): void {
    this.devices.clear();
  }

  /** Return current usage statistics for a device. */
  getUsage(deviceId: string): { count: number; windowStart: number } {
    const now = Date.now();
    const rec = this.devices.get(deviceId);
    if (!rec) {
      return { count: 0, windowStart: now };
    }
    this.evict(rec, now);
    return {
      count: rec.timestamps.length,
      windowStart:
        rec.timestamps.length > 0 ? rec.timestamps[0] : now,
    };
  }

  // ── internal helpers ──────────────────────────────────────────────────

  /** Remove timestamps that have fallen outside the sliding window. */
  private evict(record: DeviceRecord, now: number): void {
    const cutoff = now - this.config.windowMs;
    while (record.timestamps.length > 0 && record.timestamps[0] <= cutoff) {
      record.timestamps.shift();
    }
  }
}
