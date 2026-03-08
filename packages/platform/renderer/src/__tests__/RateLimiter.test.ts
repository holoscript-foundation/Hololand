import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

import { RateLimiter } from '../security/RateLimiter';
import type { RateLimiterConfig } from '../security/RateLimiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  const defaultConfig: RateLimiterConfig = {
    maxRequests: 5,
    windowMs: 60_000,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = new RateLimiter(defaultConfig);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── 1. allows requests within limit ─────────────────────────────────

  it('should allow requests within the limit', () => {
    const deviceId = 'device-alpha';

    for (let i = 0; i < 5; i++) {
      const result = limiter.check(deviceId);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5 - i);
      limiter.record(deviceId);
    }

    // After 5 recorded requests the remaining should be 0.
    const final = limiter.check(deviceId);
    expect(final.allowed).toBe(false);
    expect(final.remaining).toBe(0);
  });

  // ── 2. blocks requests over the limit ───────────────────────────────

  it('should block requests that exceed the limit', () => {
    const deviceId = 'device-beta';

    // Record exactly maxRequests
    for (let i = 0; i < 5; i++) {
      limiter.record(deviceId);
    }

    const result = limiter.check(deviceId);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  // ── 3. reset clears limits for a device ─────────────────────────────

  it('should reset limits for a specific device', () => {
    const deviceId = 'device-gamma';

    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      limiter.record(deviceId);
    }
    expect(limiter.check(deviceId).allowed).toBe(false);

    // Reset
    limiter.reset(deviceId);

    // Should be allowed again with full capacity
    const result = limiter.check(deviceId);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
  });

  // ── 4. burst allowance grants extra capacity ────────────────────────

  it('should honour burstAllowance for extra capacity', () => {
    const burstLimiter = new RateLimiter({
      maxRequests: 3,
      windowMs: 60_000,
      burstAllowance: 2,
    });

    const deviceId = 'device-delta';

    // Effective max = 3 + 2 = 5
    for (let i = 0; i < 5; i++) {
      const result = burstLimiter.check(deviceId);
      expect(result.allowed).toBe(true);
      burstLimiter.record(deviceId);
    }

    // 6th request should be denied
    const denied = burstLimiter.check(deviceId);
    expect(denied.allowed).toBe(false);
    expect(denied.remaining).toBe(0);
  });

  // ── 5. sliding window releases old slots ────────────────────────────

  it('should slide the window and release expired slots', () => {
    const deviceId = 'device-epsilon';

    // Record 5 requests at t=0
    for (let i = 0; i < 5; i++) {
      limiter.record(deviceId);
    }

    // All slots consumed
    expect(limiter.check(deviceId).allowed).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(60_001);

    // All old timestamps should have been evicted; slots are free again
    const result = limiter.check(deviceId);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
  });
});
