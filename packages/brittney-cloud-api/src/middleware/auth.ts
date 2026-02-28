/**
 * Authentication Middleware
 *
 * Validates API keys and injects user context into requests
 */

import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import pino from 'pino';

const logger = pino({ name: 'auth-middleware' });

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    tier: string;
  };
  apiKey?: {
    id: string;
    name: string;
  };
  services: any;
}

/**
 * Authenticate API key from Authorization header
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract API key from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header. Expected: Bearer <api_key>',
      });
      return;
    }

    const apiKey = authHeader.substring(7); // Remove "Bearer "

    // Validate API key format
    const validPrefixes = [
      process.env.API_KEY_PREFIX_LIVE || 'britt_sk_live_',
      process.env.API_KEY_PREFIX_TEST || 'britt_sk_test_',
    ];

    const hasValidPrefix = validPrefixes.some((prefix) => apiKey.startsWith(prefix));
    if (!hasValidPrefix) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key format',
      });
      return;
    }

    // Hash the API key for lookup
    const keyHash = hashApiKey(apiKey);

    // Check Redis cache first (fast path)
    const { redis, database } = req.services;
    const cachedUserId = await redis.get(`apikey:${keyHash}`);

    let userId: string;
    let apiKeyId: string;
    let apiKeyName: string;

    if (cachedUserId) {
      // Cache hit
      const cached = JSON.parse(cachedUserId);
      userId = cached.userId;
      apiKeyId = cached.apiKeyId;
      apiKeyName = cached.apiKeyName;
    } else {
      // Cache miss - lookup in database
      const result = await database.query(
        `SELECT ak.id, ak.user_id, ak.name, ak.revoked_at
         FROM api_keys ak
         WHERE ak.key_hash = $1`,
        [keyHash]
      );

      if (result.rows.length === 0) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid API key',
        });
        return;
      }

      const keyRecord = result.rows[0];

      // Check if revoked
      if (keyRecord.revoked_at) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'API key has been revoked',
        });
        return;
      }

      userId = keyRecord.user_id;
      apiKeyId = keyRecord.id;
      apiKeyName = keyRecord.name;

      // Cache for 5 minutes
      await redis.set(
        `apikey:${keyHash}`,
        JSON.stringify({ userId, apiKeyId, apiKeyName }),
        300
      );

      // Update last_used_at (async, don't wait)
      database.query(
        'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
        [apiKeyId]
      ).catch((error) => {
        logger.error({ error }, 'Failed to update API key last_used_at');
      });
    }

    // Get user details
    const userResult = await database.query(
      'SELECT id, email, tier, active FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found',
      });
      return;
    }

    const user = userResult.rows[0];

    // Check if user is active
    if (!user.active) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Account is inactive',
      });
      return;
    }

    // Inject user and API key into request
    req.user = {
      id: user.id,
      email: user.email,
      tier: user.tier,
    };

    req.apiKey = {
      id: apiKeyId,
      name: apiKeyName,
    };

    logger.debug({ userId: user.id, tier: user.tier }, 'Request authenticated');
    next();
  } catch (error) {
    logger.error({ error }, 'Authentication error');
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
}

/**
 * Hash API key for storage and lookup
 */
function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}
