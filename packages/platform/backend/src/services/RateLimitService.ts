/**
 * @hololand/backend -- RateLimitService
 *
 * Token-bucket rate limiter for API endpoints with configurable windows.
 * Supports per-IP and per-user limits. In-memory implementation with a
 * Redis-compatible interface for future migration.
 *
 * Window Types:
 *   auth     -  5 req/min  (login, signup, password reset)
 *   api      - 100 req/min (general API endpoints)
 *   upload   -  10 req/min (file and asset uploads)
 *   search   -  30 req/min (search and autocomplete)
 *
 * Token Bucket Model:
 *   Each bucket starts full (capacity = window limit).
 *   Tokens are consumed per request. Tokens refill at a steady rate
 *   computed as capacity / windowMs, so the bucket fully refills within
 *   one window period.
 *
 * Usage:
 *   const limiter = RateLimitService.getInstance();
 *   const result = limiter.checkLimit('ip:192.168.1.1', 'api');
 *   if (!result.allowed) {
 *     return res.status(429).json({ error: 'Too many requests', retryAfter: result.retryAfterMs });
 *   }
 *   limiter.consumeToken('ip:192.168.1.1', 'api');
 *
 * Middleware:
 *   app.use('/api/auth/*', createRateLimitMiddleware('auth'));
 *   app.use('/api/*', createRateLimitMiddleware('api'));
 *
 * @version 1.0.0
 */

// =============================================================================
// Types
// =============================================================================

export type RateLimitWindowType = 'auth' | 'api' | 'upload' | 'search';

export interface RateLimitWindowConfig {
  /** Maximum requests allowed within the window. */
  capacity: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

export interface TokenBucket {
  /** Current number of available tokens. */
  tokens: number;
  /** Timestamp (ms) of the last token refill calculation. */
  lastRefill: number;
  /** The window type this bucket is configured for. */
  windowType: RateLimitWindowType;
}

export interface RateLimitResult {
  /** Whether the request is allowed. */
  allowed: boolean;
  /** Remaining tokens after this check (does not consume). */
  remaining: number;
  /** Total capacity of the bucket. */
  limit: number;
  /** Milliseconds until a token becomes available (0 if allowed). */
  retryAfterMs: number;
  /** Timestamp when the bucket will have at least 1 token. */
  resetAt: number;
}

export interface RateLimitServiceConfig {
  /** Override default window configurations. */
  windows?: Partial<Record<RateLimitWindowType, RateLimitWindowConfig>>;
  /** Interval (ms) between cleanup sweeps of expired buckets. Default: 60000. */
  cleanupIntervalMs?: number;
  /** TTL (ms) for idle buckets before cleanup. Default: 300000 (5 min). */
  bucketTtlMs?: number;
}

// =============================================================================
// Default Window Configurations
// =============================================================================

const DEFAULT_WINDOWS: Record<RateLimitWindowType, RateLimitWindowConfig> = {
  auth: { capacity: 5, windowMs: 60_000 },
  api: { capacity: 100, windowMs: 60_000 },
  upload: { capacity: 10, windowMs: 60_000 },
  search: { capacity: 30, windowMs: 60_000 },
};

// =============================================================================
// Service
// =============================================================================

export class RateLimitService {
  private static instance: RateLimitService | null = null;

  private readonly windows: Record<RateLimitWindowType, RateLimitWindowConfig>;
  private readonly bucketTtlMs: number;
  private readonly cleanupIntervalMs: number;

  /** Buckets keyed by "compositeKey" = `${key}:${windowType}`. */
  private buckets: Map<string, TokenBucket> = new Map();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: RateLimitServiceConfig = {}) {
    this.windows = {
      auth: config.windows?.auth ?? DEFAULT_WINDOWS.auth,
      api: config.windows?.api ?? DEFAULT_WINDOWS.api,
      upload: config.windows?.upload ?? DEFAULT_WINDOWS.upload,
      search: config.windows?.search ?? DEFAULT_WINDOWS.search,
    };
    this.bucketTtlMs = config.bucketTtlMs ?? 300_000;
    this.cleanupIntervalMs = config.cleanupIntervalMs ?? 60_000;

    this.startCleanup();
  }

  static getInstance(): RateLimitService {
    if (!RateLimitService.instance) {
      RateLimitService.instance = new RateLimitService();
    }
    return RateLimitService.instance;
  }

  // ---------------------------------------------------------------------------
  // Core API
  // ---------------------------------------------------------------------------

  /**
   * Check whether a request is allowed under the given rate limit window.
   * Does NOT consume a token -- call consumeToken() separately after the
   * check passes, or use the combined consume-and-check pattern.
   */
  checkLimit(key: string, windowType: RateLimitWindowType): RateLimitResult {
    const windowConfig = this.windows[windowType];
    if (!windowConfig) {
      return {
        allowed: true,
        remaining: Infinity,
        limit: Infinity,
        retryAfterMs: 0,
        resetAt: Date.now(),
      };
    }

    const compositeKey = `${key}:${windowType}`;
    const bucket = this.getOrCreateBucket(compositeKey, windowType);
    this.refillBucket(bucket, windowConfig);

    const allowed = bucket.tokens >= 1;
    const remaining = Math.max(0, Math.floor(bucket.tokens));

    // Compute retry-after: time until at least 1 token is available
    let retryAfterMs = 0;
    let resetAt = Date.now();
    if (!allowed) {
      const refillRate = windowConfig.capacity / windowConfig.windowMs; // tokens/ms
      const tokensNeeded = 1 - bucket.tokens;
      retryAfterMs = Math.ceil(tokensNeeded / refillRate);
      resetAt = Date.now() + retryAfterMs;
    }

    return {
      allowed,
      remaining,
      limit: windowConfig.capacity,
      retryAfterMs,
      resetAt,
    };
  }

  /**
   * Consume a single token from the bucket for the given key and window type.
   * Returns true if a token was successfully consumed, false if the bucket is empty.
   */
  consumeToken(key: string, windowType: RateLimitWindowType): boolean {
    const windowConfig = this.windows[windowType];
    if (!windowConfig) return true;

    const compositeKey = `${key}:${windowType}`;
    const bucket = this.getOrCreateBucket(compositeKey, windowType);
    this.refillBucket(bucket, windowConfig);

    if (bucket.tokens < 1) {
      return false;
    }

    bucket.tokens -= 1;
    return true;
  }

  /**
   * Get the number of remaining tokens for a given key and window type.
   */
  getRemainingTokens(key: string, windowType: RateLimitWindowType): number {
    const windowConfig = this.windows[windowType];
    if (!windowConfig) return Infinity;

    const compositeKey = `${key}:${windowType}`;
    const bucket = this.buckets.get(compositeKey);
    if (!bucket) {
      return windowConfig.capacity;
    }

    this.refillBucket(bucket, windowConfig);
    return Math.max(0, Math.floor(bucket.tokens));
  }

  /**
   * Reset a bucket to full capacity.
   * Useful for admin overrides or after a successful CAPTCHA verification.
   */
  resetBucket(key: string, windowType: RateLimitWindowType): void {
    const compositeKey = `${key}:${windowType}`;
    const bucket = this.buckets.get(compositeKey);
    if (bucket) {
      const windowConfig = this.windows[windowType];
      bucket.tokens = windowConfig.capacity;
      bucket.lastRefill = Date.now();
    }
  }

  /**
   * Reset all buckets for a given key across all window types.
   */
  resetAllBuckets(key: string): void {
    const windowTypes: RateLimitWindowType[] = ['auth', 'api', 'upload', 'search'];
    for (const wt of windowTypes) {
      this.resetBucket(key, wt);
    }
  }

  // ---------------------------------------------------------------------------
  // Middleware Factory
  // ---------------------------------------------------------------------------

  /**
   * Get the rate limit key from a request object.
   * Works with both Express (req.ip) and Next.js (headers) request shapes.
   */
  static extractKey(req: any, userId?: string): string {
    if (userId) {
      return `user:${userId}`;
    }

    // Next.js App Router
    const forwarded = req.headers?.get?.('x-forwarded-for') ?? req.headers?.['x-forwarded-for'];
    if (forwarded) {
      const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded;
      return `ip:${ip}`;
    }

    // Express
    if (req.ip) {
      return `ip:${req.ip}`;
    }

    // Fallback
    const remoteAddr = req.socket?.remoteAddress ?? req.connection?.remoteAddress ?? 'unknown';
    return `ip:${remoteAddr}`;
  }

  // ---------------------------------------------------------------------------
  // Express/Next.js compatible middleware
  // ---------------------------------------------------------------------------

  /**
   * Create rate limit middleware for Express or Next.js API routes.
   *
   * Express usage:
   *   app.use('/api/auth', createRateLimitMiddleware('auth'));
   *
   * Next.js API route usage:
   *   export const middleware = createRateLimitMiddleware('api');
   */
  static createRateLimitMiddleware(windowType: RateLimitWindowType) {
    return function rateLimitMiddleware(req: any, res: any, next?: () => void) {
      const limiter = RateLimitService.getInstance();
      const key = RateLimitService.extractKey(req);

      const result = limiter.checkLimit(key, windowType);

      // Set standard rate limit headers
      if (res.setHeader) {
        res.setHeader('X-RateLimit-Limit', result.limit);
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));
      }

      if (!result.allowed) {
        if (res.setHeader) {
          res.setHeader('Retry-After', Math.ceil(result.retryAfterMs / 1000));
        }

        // Express-style response
        if (res.status && typeof res.json === 'function') {
          return res.status(429).json({
            success: false,
            error: 'Too many requests',
            retryAfterMs: result.retryAfterMs,
            retryAfterSec: Math.ceil(result.retryAfterMs / 1000),
          });
        }

        // Next.js Response (return a Response object)
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Too many requests',
            retryAfterMs: result.retryAfterMs,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)),
              'X-RateLimit-Limit': String(result.limit),
              'X-RateLimit-Remaining': String(result.remaining),
              'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
            },
          }
        );
      }

      // Consume the token
      limiter.consumeToken(key, windowType);

      // Express-style: call next()
      if (next) {
        return next();
      }

      // Next.js middleware: return undefined to continue
      return undefined;
    };
  }

  // ---------------------------------------------------------------------------
  // Stats & Diagnostics
  // ---------------------------------------------------------------------------

  /**
   * Get stats about the current rate limiter state.
   */
  getStats(): {
    totalBuckets: number;
    bucketsByWindow: Record<RateLimitWindowType, number>;
    windowConfigs: Record<RateLimitWindowType, RateLimitWindowConfig>;
  } {
    const bucketsByWindow: Record<RateLimitWindowType, number> = {
      auth: 0,
      api: 0,
      upload: 0,
      search: 0,
    };

    for (const bucket of this.buckets.values()) {
      bucketsByWindow[bucket.windowType]++;
    }

    return {
      totalBuckets: this.buckets.size,
      bucketsByWindow,
      windowConfigs: { ...this.windows },
    };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Stop the background cleanup timer. Call this during graceful shutdown.
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.buckets.clear();
    if (RateLimitService.instance === this) {
      RateLimitService.instance = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private getOrCreateBucket(compositeKey: string, windowType: RateLimitWindowType): TokenBucket {
    let bucket = this.buckets.get(compositeKey);
    if (!bucket) {
      const windowConfig = this.windows[windowType];
      bucket = {
        tokens: windowConfig.capacity,
        lastRefill: Date.now(),
        windowType,
      };
      this.buckets.set(compositeKey, bucket);
    }
    return bucket;
  }

  /**
   * Refill tokens based on elapsed time since last refill.
   * Token refill rate = capacity / windowMs (continuous refill).
   */
  private refillBucket(bucket: TokenBucket, windowConfig: RateLimitWindowConfig): void {
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    if (elapsed <= 0) return;

    const refillRate = windowConfig.capacity / windowConfig.windowMs; // tokens per ms
    const tokensToAdd = elapsed * refillRate;

    bucket.tokens = Math.min(windowConfig.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  /**
   * Periodically clean up stale buckets that haven't been accessed recently.
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      for (const [key, bucket] of this.buckets.entries()) {
        const windowConfig = this.windows[bucket.windowType];
        // If the bucket is full and hasn't been touched for bucketTtlMs, remove it
        if (
          bucket.tokens >= windowConfig.capacity &&
          now - bucket.lastRefill > this.bucketTtlMs
        ) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        this.buckets.delete(key);
      }
    }, this.cleanupIntervalMs);

    // Allow the process to exit even if this timer is running
    if (this.cleanupTimer && typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
      (this.cleanupTimer as NodeJS.Timeout).unref();
    }
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

export function getRateLimitService(): RateLimitService {
  return RateLimitService.getInstance();
}

export const createRateLimitMiddleware = RateLimitService.createRateLimitMiddleware;
