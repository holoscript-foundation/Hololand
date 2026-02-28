/**
 * tRPC Server Configuration
 *
 * Defines the tRPC context, middleware, and procedure types
 */

import { initTRPC, TRPCError } from '@trpc/server';
import { PrismaClient } from '@prisma/client';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { HoloversAuthSystem } from '../auth/HoloversAuthSystem';

// Initialize Prisma Client
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Initialize Auth System
const auth = new HoloversAuthSystem(prisma);

// ============================================================================
// CONTEXT
// ============================================================================

/**
 * Context available to all tRPC procedures
 */
export interface Context {
  prisma: PrismaClient;
  auth: HoloversAuthSystem;
  user: {
    id: string;
    email: string | null;
    walletAddress: string | null;
    username: string;
    subscriptionTier: string;
  } | null;
  sessionToken: string | null;
}

/**
 * Create context for each request
 */
export async function createContext({ req }: { req?: any }): Promise<Context> {
  // Extract token from Authorization header
  const authHeader = req?.headers?.authorization;
  const token = authHeader?.replace('Bearer ', '');

  let user = null;

  // Verify session if token provided
  if (token) {
    try {
      user = await auth.verifySession(token);
    } catch (error) {
      // Invalid token - just set user to null
      console.warn('Invalid session token:', error);
    }
  }

  return {
    prisma,
    auth,
    user,
    sessionToken: token || null,
  };
}

// ============================================================================
// TRPC INITIALIZATION
// ============================================================================

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// ============================================================================
// PROCEDURES & MIDDLEWARE
// ============================================================================

/**
 * Public procedure (no auth required)
 */
export const publicProcedure = t.procedure;

/**
 * Protected procedure (requires authentication)
 */
const enforceUserIsAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // Type narrowing
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

/**
 * Admin procedure (requires admin role)
 */
const enforceUserIsAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  // Check if user is admin (implement admin check logic)
  const user = await ctx.prisma.user.findUnique({
    where: { id: ctx.user.id },
  });

  if (user?.subscriptionTier !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You must be an admin to access this resource',
    });
  }

  return next({ ctx });
});

export const adminProcedure = t.procedure.use(enforceUserIsAdmin);

/**
 * Router creator
 */
export const router = t.router;

/**
 * Merge routers
 */
export const mergeRouters = t.mergeRouters;

// ============================================================================
// EXPORTS
// ============================================================================

export { prisma, auth };
