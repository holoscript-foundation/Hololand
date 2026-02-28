/**
 * Creator Router
 *
 * Handles world creation, marketplace, and creator economy features
 */

import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';

export const creatorRouter = router({
  // ==========================================================================
  // WORLD MANAGEMENT
  // ==========================================================================

  /**
   * Get all worlds created by current user
   */
  getMyWorlds: protectedProcedure.query(async ({ ctx }) => {
    const worlds = await ctx.prisma.world.findMany({
      where: { creatorId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return worlds;
  }),

  /**
   * Get specific world details
   */
  getWorld: publicProcedure
    .input(z.object({ worldId: z.string() }))
    .query(async ({ ctx, input }) => {
      const world = await ctx.prisma.world.findUnique({
        where: { id: input.worldId },
        include: {
          creator: {
            include: {
              profile: true,
            },
          },
        },
      });

      return world;
    }),

  /**
   * Create a new world
   */
  createWorld: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(1000).optional(),
        holoScriptSource: z.string(),
        thumbnailUrl: z.string().url().optional(),
        isPublic: z.boolean().default(false),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const world = await ctx.prisma.world.create({
        data: {
          creatorId: ctx.user.id,
          name: input.name,
          description: input.description,
          holoScriptSource: input.holoScriptSource,
          thumbnailUrl: input.thumbnailUrl,
          isPublic: input.isPublic,
          tags: input.tags || [],
        },
      });

      return world;
    }),

  /**
   * Update existing world
   */
  updateWorld: protectedProcedure
    .input(
      z.object({
        worldId: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(1000).optional(),
        holoScriptSource: z.string().optional(),
        thumbnailUrl: z.string().url().optional(),
        isPublic: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { worldId, ...data } = input;

      const world = await ctx.prisma.world.update({
        where: {
          id: worldId,
          creatorId: ctx.user.id, // Ensure user owns this world
        },
        data,
      });

      return world;
    }),

  /**
   * Delete a world
   */
  deleteWorld: protectedProcedure
    .input(z.object({ worldId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.world.delete({
        where: {
          id: input.worldId,
          creatorId: ctx.user.id, // Ensure user owns this world
        },
      });

      return { success: true };
    }),

  /**
   * Publish world to marketplace
   */
  publishWorld: protectedProcedure
    .input(
      z.object({
        worldId: z.string(),
        price: z.number().min(0).optional(),
        licenseType: z.enum(['free', 'paid', 'subscription']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const world = await ctx.prisma.world.update({
        where: {
          id: input.worldId,
          creatorId: ctx.user.id,
        },
        data: {
          isPublic: true,
          publishedAt: new Date(),
          price: input.price,
          licenseType: input.licenseType,
        },
      });

      return world;
    }),

  // ==========================================================================
  // WORLD DISCOVERY
  // ==========================================================================

  /**
   * Browse public worlds
   */
  browseWorlds: publicProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          tags: z.array(z.string()).optional(),
          sortBy: z
            .enum(['recent', 'popular', 'trending', 'views'])
            .default('recent'),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        isPublic: true,
      };

      // Search filter
      if (input?.search) {
        where.OR = [
          { name: { contains: input.search, mode: 'insensitive' } },
          { description: { contains: input.search, mode: 'insensitive' } },
        ];
      }

      // Tags filter
      if (input?.tags && input.tags.length > 0) {
        where.tags = {
          hasSome: input.tags,
        };
      }

      // Determine sort order
      let orderBy: any = { createdAt: 'desc' };
      switch (input?.sortBy) {
        case 'popular':
          orderBy = { favoriteCount: 'desc' };
          break;
        case 'trending':
          orderBy = [{ favoriteCount: 'desc' }, { createdAt: 'desc' }];
          break;
        case 'views':
          orderBy = { viewCount: 'desc' };
          break;
      }

      const worlds = await ctx.prisma.world.findMany({
        where,
        orderBy,
        skip: input?.offset,
        take: input?.limit,
        include: {
          creator: {
            include: {
              profile: {
                select: {
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      return worlds;
    }),

  /**
   * Get featured worlds
   */
  getFeaturedWorlds: publicProcedure.query(async ({ ctx }) => {
    const worlds = await ctx.prisma.world.findMany({
      where: {
        isPublic: true,
        isFeatured: true,
      },
      orderBy: { featuredAt: 'desc' },
      take: 10,
      include: {
        creator: {
          include: {
            profile: {
              select: {
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return worlds;
  }),

  // ==========================================================================
  // WORLD INTERACTIONS
  // ==========================================================================

  /**
   * Record world view
   */
  recordView: publicProcedure
    .input(z.object({ worldId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.world.update({
        where: { id: input.worldId },
        data: {
          viewCount: { increment: 1 },
        },
      });

      return { success: true };
    }),

  /**
   * Favorite a world
   */
  favoriteWorld: protectedProcedure
    .input(z.object({ worldId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Create UserFavorite junction table
      // For now, just increment the favorite count
      await ctx.prisma.world.update({
        where: { id: input.worldId },
        data: {
          favoriteCount: { increment: 1 },
        },
      });

      return { success: true };
    }),

  /**
   * Unfavorite a world
   */
  unfavoriteWorld: protectedProcedure
    .input(z.object({ worldId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Delete from UserFavorite junction table
      // For now, just decrement the favorite count
      await ctx.prisma.world.update({
        where: { id: input.worldId },
        data: {
          favoriteCount: { decrement: 1 },
        },
      });

      return { success: true };
    }),

  // ==========================================================================
  // CREATOR STATS
  // ==========================================================================

  /**
   * Get creator statistics
   */
  getCreatorStats: protectedProcedure.query(async ({ ctx }) => {
    const stats = await ctx.prisma.world.aggregate({
      where: { creatorId: ctx.user.id },
      _count: { id: true },
      _sum: {
        viewCount: true,
        favoriteCount: true,
      },
    });

    const publishedCount = await ctx.prisma.world.count({
      where: {
        creatorId: ctx.user.id,
        isPublic: true,
      },
    });

    return {
      totalWorlds: stats._count.id,
      publishedWorlds: publishedCount,
      totalViews: stats._sum.viewCount || 0,
      totalFavorites: stats._sum.favoriteCount || 0,
    };
  }),

  /**
   * Get top performing worlds
   */
  getTopWorlds: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(10),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const worlds = await ctx.prisma.world.findMany({
        where: { creatorId: ctx.user.id },
        orderBy: [{ viewCount: 'desc' }, { favoriteCount: 'desc' }],
        take: input?.limit,
      });

      return worlds;
    }),
});
