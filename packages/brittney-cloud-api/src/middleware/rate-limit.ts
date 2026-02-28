/**
 * Rate Limiting Middleware
 *
 * Token bucket algorithm implemented in Redis:
 * - Per-user rate limits based on tier
 * - Separate limits for requests/minute and requests/day
 * - Returns appropriate headers (X-RateLimit-*)
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import pino from 'pino';

const logger = pino({ name: 'rate-limit-middleware' });

interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerDay: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  free: {
    requestsPerMinute: parseInt(process.env.RATE_LIMIT_FREE_RPM || '3', 10),
    requestsPerDay: parseInt(process.env.RATE_LIMIT_FREE_RPD || '100', 10),
  },
  payg: {
    requestsPerMinute: parseInt(process.env.RATE_LIMIT_PAYG_RPM || '60', 10),
    requestsPerDay: parseInt(process.env.RATE_LIMIT_PAYG_RPD || '10000', 10),
  },
  pro: {
    requestsPerMinute: parseInt(process.env.RATE_LIMIT_PRO_RPM || '300', 10),
    requestsPerDay: parseInt(process.env.RATE_LIMIT_PRO_RPD || '999999', 10),
  },
  enterprise: {
    requestsPerMinute: parseInt(process.env.RATE_LIMIT_ENTERPRISE_RPM || '10000', 10),
    requestsPerDay: parseInt(process.env.RATE_LIMIT_ENTERPRISE_RPD || '999999', 10),
  },
};

/**
 * Rate limit middleware using token bucket algorithm
 */
export async function rateLimitMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      // Should never happen (auth middleware runs first)
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    const { redis } = req.services;
    const userId = req.user.id;
    const tier = req.user.tier;

    // Get rate limits for tier
    const limits = RATE_LIMITS[tier] || RATE_LIMITS.free;

    // Check minute limit
    const minuteKey = `ratelimit:minute:${userId}`;
    const minuteAllowed = await checkTokenBucket(
      redis,
      minuteKey,
      limits.requestsPerMinute,
      60 // 60 seconds window
    );

    if (!minuteAllowed.allowed) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded for requests per minute',
        retryAfter: minuteAllowed.retryAfter,
      });
      res.setHeader('X-RateLimit-Limit-Requests', limits.requestsPerMinute);
      res.setHeader('X-RateLimit-Remaining-Requests', 0);
      res.setHeader('X-RateLimit-Reset-Requests', minuteAllowed.resetAt);
      res.setHeader('Retry-After', minuteAllowed.retryAfter);
      return;
    }

    // Check day limit
    const dayKey = `ratelimit:day:${userId}`;
    const dayAllowed = await checkTokenBucket(
      redis,
      dayKey,
      limits.requestsPerDay,
      86400 // 24 hours window
    );

    if (!dayAllowed.allowed) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded for requests per day',
        retryAfter: dayAllowed.retryAfter,
      });
      res.setHeader('X-RateLimit-Limit-Requests', limits.requestsPerDay);
      res.setHeader('X-RateLimit-Remaining-Requests', 0);
      res.setHeader('X-RateLimit-Reset-Requests', dayAllowed.resetAt);
      res.setHeader('Retry-After', dayAllowed.retryAfter);
      return;
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit-Requests', limits.requestsPerMinute);
    res.setHeader('X-RateLimit-Remaining-Requests', minuteAllowed.remaining);
    res.setHeader('X-RateLimit-Reset-Requests', minuteAllowed.resetAt);

    logger.debug({
      userId,
      tier,
      minuteRemaining: minuteAllowed.remaining,
      dayRemaining: dayAllowed.remaining,
    }, 'Rate limit check passed');

    next();
  } catch (error) {
    logger.error({ error }, 'Rate limit error');
    // On error, allow request (fail open)
    next();
  }
}

/**
 * Token bucket algorithm implementation
 */
async function checkTokenBucket(
  redis: any,
  key: string,
  maxTokens: number,
  windowSeconds: number
): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter: number;
}> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - windowSeconds;

  // Get current token count
  const currentStr = await redis.get(key);
  const current = currentStr ? parseInt(currentStr, 10) : 0;

  // Check if window has expired
  const ttl = await redis.ttl(key);
  if (ttl === -1) {
    // No TTL set, reset the bucket
    await redis.set(key, '0', windowSeconds);
  }

  if (current >= maxTokens) {
    // Rate limit exceeded
    const resetAt = now + (ttl > 0 ? ttl : windowSeconds);
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter: ttl > 0 ? ttl : windowSeconds,
    };
  }

  // Increment token count
  await redis.incr(key);
  const newCurrent = current + 1;

  // Set expiration if not set
  if (ttl === -2 || ttl === -1) {
    await redis.expire(key, windowSeconds);
  }

  const resetAt = now + windowSeconds;
  return {
    allowed: true,
    remaining: maxTokens - newCurrent,
    resetAt,
    retryAfter: 0,
  };
}
