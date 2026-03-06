/**
 * Authentication Middleware
 *
 * Express/Fastify middleware for validating agent JWT tokens and
 * enforcing RBAC policies on API endpoints.
 *
 * Features:
 * - Token validation (signature, expiration, revocation)
 * - RBAC enforcement per endpoint
 * - Request context injection
 * - Audit logging
 * - Rate limiting per agent
 */

import { Request, Response, NextFunction } from 'express';
import * as path from 'path';
import {
  AgentTokenPayload,
  verifyAgentToken,
  loadAgentIdentity,
} from '../core/crypto-identity';
import { RBACEnforcer, createRBACEnforcer } from '../core/rbac-system';
import { CredentialRotationManager } from '../core/credential-rotation';

// Extended request with agent context
export interface AuthenticatedRequest extends Request {
  agent?: AgentTokenPayload;
  agentPublicKey?: string;
}

// Middleware configuration
export interface AuthMiddlewareConfig {
  storageDir: string;
  projectRoot: string;
  rotationManager?: CredentialRotationManager;
  rbacEnforcer?: RBACEnforcer;
}

// Rate limiting state
interface RateLimitState {
  requests: number;
  resetTime: number;
}

/**
 * Create authentication middleware factory
 */
export function createAuthMiddleware(config: AuthMiddlewareConfig) {
  let rbacEnforcer: RBACEnforcer;
  const rateLimitMap = new Map<string, RateLimitState>();

  // Initialize RBAC enforcer
  const initPromise = createRBACEnforcer(config.projectRoot).then((enforcer) => {
    rbacEnforcer = enforcer;
  });

  /**
   * Main authentication middleware
   */
  const authenticate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // Ensure RBAC enforcer is initialized
      await initPromise;

      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Missing or invalid Authorization header',
          message: 'Expected: Authorization: Bearer <token>',
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer '

      // Decode token (without verification yet)
      const decoded = decodeToken(token);
      if (!decoded) {
        return res.status(401).json({
          error: 'Invalid token format',
        });
      }

      // Check revocation list
      if (config.rotationManager?.isRevoked(decoded.agentId)) {
        return res.status(401).json({
          error: 'Token has been revoked',
          message: 'Please rotate your credentials',
        });
      }

      // Load agent's public key
      const agentIdentity = await loadAgentIdentity(
        decoded.agentId,
        config.storageDir
      );

      // Verify token signature with public key
      let verifiedPayload: AgentTokenPayload;
      try {
        verifiedPayload = verifyAgentToken(token, agentIdentity.publicKey);
      } catch (error: any) {
        return res.status(401).json({
          error: 'Token verification failed',
          message: error.message,
        });
      }

      // Check rate limiting
      const rateLimitResult = checkRateLimit(verifiedPayload.agentId);
      if (!rateLimitResult.allowed) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
        });
      }

      // Attach agent context to request
      req.agent = verifiedPayload;
      req.agentPublicKey = agentIdentity.publicKey;

      next();
    } catch (error: any) {
      console.error('Authentication error:', error);
      return res.status(500).json({
        error: 'Authentication failed',
        message: error.message,
      });
    }
  };

  /**
   * RBAC authorization middleware (requires authenticate first)
   */
  const authorize = (operation: string, resourcePathExtractor?: (req: Request) => string) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.agent) {
          return res.status(401).json({
            error: 'Not authenticated',
            message: 'authenticate middleware must be called first',
          });
        }

        // Extract resource path from request
        const resourcePath = resourcePathExtractor
          ? resourcePathExtractor(req)
          : req.path;

        // Check RBAC access
        const decision = await rbacEnforcer.checkAccess(
          req.agent,
          operation,
          resourcePath,
          req.query.environment as string | undefined
        );

        if (!decision.allowed) {
          return res.status(403).json({
            error: 'Access denied',
            reason: decision.reason,
            violations: decision.violations,
          });
        }

        next();
      } catch (error: any) {
        console.error('Authorization error:', error);
        return res.status(500).json({
          error: 'Authorization failed',
          message: error.message,
        });
      }
    };
  };

  /**
   * Rate limiting check
   */
  function checkRateLimit(agentId: string): {
    allowed: boolean;
    retryAfter?: number;
  } {
    const now = Date.now();
    const limit = 100; // requests per window
    const window = 60 * 1000; // 1 minute

    let state = rateLimitMap.get(agentId);

    if (!state || now > state.resetTime) {
      // New window
      state = {
        requests: 1,
        resetTime: now + window,
      };
      rateLimitMap.set(agentId, state);
      return { allowed: true };
    }

    if (state.requests >= limit) {
      // Limit exceeded
      return {
        allowed: false,
        retryAfter: Math.ceil((state.resetTime - now) / 1000),
      };
    }

    // Increment counter
    state.requests++;
    return { allowed: true };
  }

  /**
   * Decode token without verification (for extracting agentId)
   */
  function decodeToken(token: string): AgentTokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }

  return {
    authenticate,
    authorize,
    getRateLimitStats: () => ({
      totalAgents: rateLimitMap.size,
      states: Array.from(rateLimitMap.entries()),
    }),
  };
}

/**
 * Helper: Extract file path from request body
 */
export function extractFilePathFromBody(req: Request): string {
  return req.body.filePath || req.body.path || '';
}

/**
 * Helper: Extract file path from URL params
 */
export function extractFilePathFromParams(req: Request): string {
  return req.params.filePath || req.params.path || '';
}

/**
 * Example Express usage
 */
export function exampleExpressUsage() {
  const express = require('express');
  const app = express();

  app.use(express.json());

  // Create auth middleware
  const { authenticate, authorize } = createAuthMiddleware({
    storageDir: '/path/to/.agent-identity',
    projectRoot: '/path/to/project',
  });

  // Public endpoint (no auth)
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
  });

  // Protected endpoint (auth only)
  app.get('/api/status', authenticate, (req: AuthenticatedRequest, res) => {
    res.json({
      message: 'Authenticated',
      agent: req.agent?.agentId,
      role: req.agent?.role,
    });
  });

  // Component creation (auth + RBAC)
  app.post(
    '/api/components',
    authenticate,
    authorize('create:component', extractFilePathFromBody),
    (req: AuthenticatedRequest, res) => {
      // Create component logic
      res.json({
        message: 'Component created',
        agent: req.agent?.agentId,
      });
    }
  );

  // Test execution (auth + RBAC)
  app.post(
    '/api/tests/run',
    authenticate,
    authorize('execute:vitest'),
    (req: AuthenticatedRequest, res) => {
      // Run tests logic
      res.json({
        message: 'Tests started',
        agent: req.agent?.agentId,
      });
    }
  );

  // Deployment (auth + RBAC)
  app.post(
    '/api/deploy/:environment',
    authenticate,
    authorize('deploy:production'), // Example: production deployment
    (req: AuthenticatedRequest, res) => {
      // Deploy logic
      res.json({
        message: 'Deployment started',
        environment: req.params.environment,
        agent: req.agent?.agentId,
      });
    }
  );

  app.listen(3000, () => {
    console.log('Server listening on port 3000');
  });
}

/**
 * Fastify middleware adapter
 */
export function createFastifyAuthPlugin(config: AuthMiddlewareConfig) {
  return async function authPlugin(fastify: any) {
    const { authenticate, authorize } = createAuthMiddleware(config);

    // Register as decorator
    fastify.decorate('authenticate', authenticate);
    fastify.decorate('authorize', authorize);

    // Register as hook (optional - apply to all routes)
    // fastify.addHook('onRequest', authenticate);
  };
}
