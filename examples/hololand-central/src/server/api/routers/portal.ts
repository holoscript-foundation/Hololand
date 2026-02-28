/**
 * Portal Router
 *
 * Handles portal unlocks, navigation, and world access
 */

import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';

export const portalRouter = router({
  // ==========================================================================
  // PORTAL UNLOCKS
  // ==========================================================================

  /**
   * Get all unlocked portals for current user
   */
  getUnlocked: protectedProcedure.query(async ({ ctx }) => {
    const unlocks = await ctx.prisma.portalUnlock.findMany({
      where: { userId: ctx.user.id },
      orderBy: { unlockedAt: 'desc' },
    });

    return unlocks;
  }),

  /**
   * Check if specific portal is unlocked
   */
  isUnlocked: protectedProcedure
    .input(z.object({ portalId: z.string() }))
    .query(async ({ ctx, input }) => {
      const unlock = await ctx.prisma.portalUnlock.findUnique({
        where: {
          user_id_portal_id: {
            userId: ctx.user.id,
            portalId: input.portalId,
          },
        },
      });

      return { unlocked: !!unlock, unlockedAt: unlock?.unlockedAt };
    }),

  /**
   * Unlock a portal (manual unlock, e.g., via purchase)
   */
  unlock: protectedProcedure
    .input(
      z.object({
        portalId: z.string(),
        unlockedBy: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if already unlocked
      const existing = await ctx.prisma.portalUnlock.findUnique({
        where: {
          user_id_portal_id: {
            userId: ctx.user.id,
            portalId: input.portalId,
          },
        },
      });

      if (existing) {
        return existing;
      }

      // Create new unlock
      const unlock = await ctx.prisma.portalUnlock.create({
        data: {
          userId: ctx.user.id,
          portalId: input.portalId,
          unlockedBy: input.unlockedBy,
        },
      });

      return unlock;
    }),

  // ==========================================================================
  // PORTAL STATE & TRACKING
  // ==========================================================================

  /**
   * Update portal visit tracking
   */
  recordVisit: protectedProcedure
    .input(
      z.object({
        portalId: z.string(),
        duration: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Update portal unlock with last visited timestamp
      const unlock = await ctx.prisma.portalUnlock.update({
        where: {
          user_id_portal_id: {
            userId: ctx.user.id,
            portalId: input.portalId,
          },
        },
        data: {
          lastVisited: new Date(),
          visitCount: { increment: 1 },
          totalTimeSpent: input.duration
            ? { increment: input.duration }
            : undefined,
        },
      });

      return unlock;
    }),

  /**
   * Get portal statistics
   */
  getStats: protectedProcedure
    .input(z.object({ portalId: z.string() }))
    .query(async ({ ctx, input }) => {
      const unlock = await ctx.prisma.portalUnlock.findUnique({
        where: {
          user_id_portal_id: {
            userId: ctx.user.id,
            portalId: input.portalId,
          },
        },
      });

      if (!unlock) {
        return null;
      }

      return {
        unlockedAt: unlock.unlockedAt,
        lastVisited: unlock.lastVisited,
        visitCount: unlock.visitCount || 0,
        totalTimeSpent: unlock.totalTimeSpent || 0,
      };
    }),

  // ==========================================================================
  // PORTAL DISCOVERY
  // ==========================================================================

  /**
   * Get all available portals (public info)
   */
  getAll: publicProcedure.query(async ({ ctx }) => {
    // TODO: Once Portal model is created, query from database
    // For now, return hardcoded portal list
    const portals = [
      {
        id: 'library',
        name: 'The Grand Library',
        description: 'Central hub of knowledge and learning',
        category: 'hub',
        requiredLevel: 0,
      },
      {
        id: 'vr-lab',
        name: 'VR Prototyping Lab',
        description: 'Learn to build immersive experiences',
        category: 'learning',
        requiredLevel: 1,
      },
      {
        id: 'art-gallery',
        name: 'Digital Art Gallery',
        description: 'Explore and create digital art',
        category: 'creative',
        requiredLevel: 1,
      },
      {
        id: 'code-dojo',
        name: 'Code Dojo',
        description: 'Master programming skills',
        category: 'learning',
        requiredLevel: 2,
      },
      {
        id: 'creator-studio',
        name: 'Creator Studio',
        description: 'Build and monetize your worlds',
        category: 'creator',
        requiredLevel: 5,
      },
    ];

    // If user is authenticated, add unlock status
    if (ctx.user) {
      const unlocks = await ctx.prisma.portalUnlock.findMany({
        where: { userId: ctx.user.id },
        select: { portalId: true },
      });

      const unlockedIds = new Set(unlocks.map((u) => u.portalId));

      return portals.map((portal) => ({
        ...portal,
        unlocked: unlockedIds.has(portal.id),
      }));
    }

    return portals;
  }),

  /**
   * Get portal details
   */
  getDetails: publicProcedure
    .input(z.object({ portalId: z.string() }))
    .query(async ({ ctx, input }) => {
      // TODO: Query from database once Portal model exists
      // For now, return mock data
      const portalDetails = {
        id: input.portalId,
        name: 'Portal Name',
        description: 'Portal description',
        thumbnail: '/portals/default.jpg',
        requiredLevel: 0,
        unlockRequirements: {
          quests: [],
          skills: [],
          badges: [],
        },
      };

      // If user is authenticated, add unlock status
      if (ctx.user) {
        const unlock = await ctx.prisma.portalUnlock.findUnique({
          where: {
            user_id_portal_id: {
              userId: ctx.user.id,
              portalId: input.portalId,
            },
          },
        });

        return {
          ...portalDetails,
          unlocked: !!unlock,
          unlockedAt: unlock?.unlockedAt,
        };
      }

      return portalDetails;
    }),
});
