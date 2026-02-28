/**
 * User Router
 *
 * Handles user profile, preferences, and subscription management
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const userRouter = router({
  // ==========================================================================
  // PROFILE MANAGEMENT
  // ==========================================================================

  /**
   * Get current user's full profile
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      include: {
        profile: true,
        skillLevels: {
          orderBy: { level: 'desc' },
        },
        badges: {
          orderBy: { earnedAt: 'desc' },
        },
        portalUnlocks: {
          orderBy: { unlockedAt: 'desc' },
        },
      },
    });

    return user;
  }),

  /**
   * Update user profile
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        username: z.string().min(3).max(20).optional(),
        displayName: z.string().max(50).optional(),
        bio: z.string().max(500).optional(),
        avatarUrl: z.string().url().optional(),
        location: z.string().max(100).optional(),
        website: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.prisma.userProfile.upsert({
        where: { userId: ctx.user.id },
        create: {
          userId: ctx.user.id,
          username: input.username || ctx.user.username,
          ...input,
        },
        update: input,
      });

      return profile;
    }),

  /**
   * Update user preferences
   */
  updatePreferences: protectedProcedure
    .input(
      z.object({
        theme: z.enum(['light', 'dark', 'auto']).optional(),
        notifications: z.boolean().optional(),
        language: z.string().optional(),
        accessibility: z
          .object({
            reduceMotion: z.boolean().optional(),
            highContrast: z.boolean().optional(),
            largeText: z.boolean().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.prisma.userProfile.update({
        where: { userId: ctx.user.id },
        data: {
          preferences: input,
        },
      });

      return profile;
    }),

  // ==========================================================================
  // SKILL LEVELS
  // ==========================================================================

  /**
   * Get all skill levels for current user
   */
  getSkills: protectedProcedure.query(async ({ ctx }) => {
    const skills = await ctx.prisma.skillLevel.findMany({
      where: { userId: ctx.user.id },
      orderBy: { level: 'desc' },
    });

    return skills;
  }),

  /**
   * Get specific skill level
   */
  getSkill: protectedProcedure
    .input(z.object({ skillName: z.string() }))
    .query(async ({ ctx, input }) => {
      const skill = await ctx.prisma.skillLevel.findUnique({
        where: {
          user_id_skill_name: {
            userId: ctx.user.id,
            skillName: input.skillName,
          },
        },
      });

      return skill;
    }),

  // ==========================================================================
  // BADGES
  // ==========================================================================

  /**
   * Get all badges for current user
   */
  getBadges: protectedProcedure.query(async ({ ctx }) => {
    const badges = await ctx.prisma.badge.findMany({
      where: { userId: ctx.user.id },
      orderBy: { earnedAt: 'desc' },
    });

    return badges;
  }),

  // ==========================================================================
  // SUBSCRIPTION MANAGEMENT
  // ==========================================================================

  /**
   * Get current subscription info
   */
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        subscriptionTier: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
      },
    });

    return user;
  }),

  /**
   * Upgrade subscription tier
   */
  upgradeSubscription: protectedProcedure
    .input(
      z.object({
        tier: z.enum(['free', 'scholar', 'master', 'creator']),
        paymentIntentId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Integrate with payment provider (Stripe)
      // For now, just update the tier
      const user = await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          subscriptionTier: input.tier,
          subscriptionStartDate: new Date(),
          // Set end date based on tier (example: 30 days)
          subscriptionEndDate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ),
        },
      });

      return user;
    }),

  // ==========================================================================
  // USER STATS
  // ==========================================================================

  /**
   * Get comprehensive user statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const [
      totalSkills,
      totalBadges,
      totalPortals,
      questStats,
      totalTimeSpent,
    ] = await Promise.all([
      ctx.prisma.skillLevel.count({
        where: { userId: ctx.user.id },
      }),
      ctx.prisma.badge.count({
        where: { userId: ctx.user.id },
      }),
      ctx.prisma.portalUnlock.count({
        where: { userId: ctx.user.id },
      }),
      ctx.prisma.questProgress.aggregate({
        where: { userId: ctx.user.id },
        _count: { status: true },
      }),
      ctx.prisma.questProgress.aggregate({
        where: { userId: ctx.user.id },
        _sum: { timeSpentSeconds: true },
      }),
    ]);

    const topSkills = await ctx.prisma.skillLevel.findMany({
      where: { userId: ctx.user.id },
      orderBy: { level: 'desc' },
      take: 5,
    });

    return {
      totalSkills,
      totalBadges,
      totalPortals,
      totalQuests: questStats._count.status,
      totalTimeSpent: totalTimeSpent._sum.timeSpentSeconds || 0,
      topSkills,
    };
  }),
});
