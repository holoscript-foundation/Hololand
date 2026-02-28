/**
 * Quest Router
 *
 * Handles quest progress, completion, and rewards
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const questRouter = router({
  // ==========================================================================
  // QUEST PROGRESS
  // ==========================================================================

  /**
   * Get all quest progress for current user
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const quests = await ctx.prisma.questProgress.findMany({
      where: { userId: ctx.user.id },
      orderBy: { startedAt: 'desc' },
    });
    return quests;
  }),

  /**
   * Get specific quest progress
   */
  get: protectedProcedure
    .input(z.object({ questId: z.string() }))
    .query(async ({ ctx, input }) => {
      const quest = await ctx.prisma.questProgress.findUnique({
        where: {
          user_id_quest_id: {
            userId: ctx.user.id,
            questId: input.questId,
          },
        },
      });
      return quest;
    }),

  /**
   * Start a new quest
   */
  start: protectedProcedure
    .input(
      z.object({
        questId: z.string(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const quest = await ctx.prisma.questProgress.create({
        data: {
          userId: ctx.user.id,
          questId: input.questId,
          status: 'active',
          progress: 0,
          currentStage: 1,
          metadata: input.metadata,
        },
      });

      return quest;
    }),

  /**
   * Update quest progress
   */
  updateProgress: protectedProcedure
    .input(
      z.object({
        questId: z.string(),
        progress: z.number().min(0).max(100),
        currentStage: z.number().optional(),
        timeSpent: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const quest = await ctx.prisma.questProgress.update({
        where: {
          user_id_quest_id: {
            userId: ctx.user.id,
            questId: input.questId,
          },
        },
        data: {
          progress: input.progress,
          currentStage: input.currentStage,
          timeSpentSeconds: input.timeSpent,
        },
      });

      return quest;
    }),

  /**
   * Complete a quest
   */
  complete: protectedProcedure
    .input(
      z.object({
        questId: z.string(),
        rewards: z.object({
          skills: z.record(z.number()).optional(),
          badges: z.array(z.string()).optional(),
          unlocks: z.array(z.string()).optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Mark quest as completed
      const quest = await ctx.prisma.questProgress.update({
        where: {
          user_id_quest_id: {
            userId: ctx.user.id,
            questId: input.questId,
          },
        },
        data: {
          status: 'completed',
          completedAt: new Date(),
          progress: 100,
          rewards: input.rewards,
        },
      });

      // Apply skill rewards
      if (input.rewards.skills) {
        for (const [skillName, amount] of Object.entries(input.rewards.skills)) {
          await ctx.prisma.skillLevel.upsert({
            where: {
              user_id_skill_name: {
                userId: ctx.user.id,
                skillName,
              },
            },
            create: {
              userId: ctx.user.id,
              skillName,
              level: amount,
              experience: amount * 10,
              lastIncreased: new Date(),
            },
            update: {
              level: { increment: amount },
              experience: { increment: amount * 10 },
              lastIncreased: new Date(),
            },
          });
        }
      }

      // Award badges
      if (input.rewards.badges) {
        for (const badgeName of input.rewards.badges) {
          await ctx.prisma.badge.create({
            data: {
              userId: ctx.user.id,
              badgeName,
            },
          });
        }
      }

      // Unlock portals
      if (input.rewards.unlocks) {
        for (const portalId of input.rewards.unlocks) {
          await ctx.prisma.portalUnlock.create({
            data: {
              userId: ctx.user.id,
              portalId,
              unlockedBy: input.questId,
            },
          });
        }
      }

      return quest;
    }),

  /**
   * Abandon/fail a quest
   */
  abandon: protectedProcedure
    .input(z.object({ questId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const quest = await ctx.prisma.questProgress.update({
        where: {
          user_id_quest_id: {
            userId: ctx.user.id,
            questId: input.questId,
          },
        },
        data: {
          status: 'failed',
        },
      });

      return quest;
    }),

  // ==========================================================================
  // QUEST STATS
  // ==========================================================================

  /**
   * Get quest statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const [total, completed, active] = await Promise.all([
      ctx.prisma.questProgress.count({
        where: { userId: ctx.user.id },
      }),
      ctx.prisma.questProgress.count({
        where: { userId: ctx.user.id, status: 'completed' },
      }),
      ctx.prisma.questProgress.count({
        where: { userId: ctx.user.id, status: 'active' },
      }),
    ]);

    const totalTime = await ctx.prisma.questProgress.aggregate({
      where: { userId: ctx.user.id },
      _sum: { timeSpentSeconds: true },
    });

    return {
      total,
      completed,
      active,
      failed: total - completed - active,
      totalTimeSpent: totalTime._sum.timeSpentSeconds || 0,
    };
  }),
});
