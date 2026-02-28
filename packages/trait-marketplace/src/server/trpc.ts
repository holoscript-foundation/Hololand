/**
 * tRPC Server Configuration for Trait Marketplace
 */

import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

// Context
interface Context {
  userId?: string;
  userEmail?: string;
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

// ============================================================================
// TRAIT MARKETPLACE ROUTER
// ============================================================================

export const traitMarketplaceRouter = router({
  // ========================================
  // PUBLIC ROUTES (Browse & Search)
  // ========================================

  // Get all traits (with filters)
  getTraits: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
        search: z.string().optional(),
        sort: z.enum(['popular', 'recent', 'rating', 'price-low', 'price-high']).default('popular'),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { category, search, sort, limit, cursor } = input;

      const where: any = {
        status: 'APPROVED',
      };

      if (category) {
        where.category = category;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { displayName: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { tags: { has: search } },
        ];
      }

      const orderBy: any = {};
      if (sort === 'recent') orderBy.createdAt = 'desc';
      else if (sort === 'rating') orderBy.rating = 'desc';
      else if (sort === 'price-low') orderBy.price = 'asc';
      else if (sort === 'price-high') orderBy.price = 'desc';
      else orderBy.downloads = 'desc'; // popular

      const traits = await prisma.trait.findMany({
        where,
        orderBy,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              avatar: true,
              rating: true,
            },
          },
          _count: {
            select: {
              reviews: true,
              favorites: true,
            },
          },
        },
      });

      let nextCursor: string | undefined = undefined;
      if (traits.length > limit) {
        const nextItem = traits.pop();
        nextCursor = nextItem!.id;
      }

      return {
        traits,
        nextCursor,
      };
    }),

  // Get single trait by ID
  getTrait: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const trait = await prisma.trait.findUnique({
        where: { id: input.id },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              avatar: true,
              bio: true,
              rating: true,
              totalSales: true,
            },
          },
          reviews: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 10,
          },
        },
      });

      if (!trait) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Trait not found' });
      }

      // Increment view count
      await prisma.analytics.create({
        data: {
          traitId: trait.id,
          event: 'VIEW',
        },
      });

      await prisma.trait.update({
        where: { id: trait.id },
        data: { views: { increment: 1 } },
      });

      return trait;
    }),

  // Get featured traits
  getFeatured: publicProcedure.query(async () => {
    return await prisma.trait.findMany({
      where: {
        status: 'APPROVED',
        featured: true,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
      take: 10,
      orderBy: {
        rating: 'desc',
      },
    });
  }),

  // ========================================
  // PROTECTED ROUTES (Purchase & Manage)
  // ========================================

  // Purchase trait
  purchaseTrait: protectedProcedure
    .input(
      z.object({
        traitId: z.string(),
        paymentMethod: z.enum(['stripe', 'crypto']),
        paymentMethodId: z.string().optional(), // Stripe payment method ID
        cryptoTxHash: z.string().optional(),    // Crypto transaction hash
      })
    )
    .mutation(async ({ input, ctx }) => {
      const trait = await prisma.trait.findUnique({
        where: { id: input.traitId },
        include: { creator: true },
      });

      if (!trait || trait.status !== 'APPROVED') {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Trait not available' });
      }

      // Check if already purchased
      const existing = await prisma.purchase.findUnique({
        where: {
          traitId_userId: {
            traitId: input.traitId,
            userId: ctx.userId,
          },
        },
      });

      if (existing) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Already purchased' });
      }

      // Process payment
      let paymentId: string | undefined;

      if (input.paymentMethod === 'stripe' && input.paymentMethodId) {
        // Create Stripe payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(trait.price * 100), // Convert to cents
          currency: trait.currency.toLowerCase(),
          payment_method: input.paymentMethodId,
          confirm: true,
          metadata: {
            traitId: trait.id,
            userId: ctx.userId,
          },
        });

        paymentId = paymentIntent.id;

        if (paymentIntent.status !== 'succeeded') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Payment failed' });
        }
      } else if (input.paymentMethod === 'crypto') {
        paymentId = input.cryptoTxHash;
        // TODO: Verify crypto transaction
      }

      // Create purchase record
      const purchase = await prisma.purchase.create({
        data: {
          traitId: input.traitId,
          userId: ctx.userId,
          price: trait.price,
          currency: trait.currency,
          stripePaymentId: input.paymentMethod === 'stripe' ? paymentId : undefined,
          nftTransactionHash: input.paymentMethod === 'crypto' ? paymentId : undefined,
          licenseKey: generateLicenseKey(),
        },
      });

      // Update trait stats
      await prisma.trait.update({
        where: { id: trait.id },
        data: {
          downloads: { increment: 1 },
        },
      });

      // Update creator stats
      const commission = getCommission(trait.creator.sellerTier);
      const creatorRevenue = trait.price * (1 - commission);

      await prisma.user.update({
        where: { id: trait.creatorId },
        data: {
          totalSales: { increment: 1 },
          totalRevenue: { increment: creatorRevenue },
        },
      });

      // Track analytics
      await prisma.analytics.create({
        data: {
          traitId: trait.id,
          event: 'PURCHASE',
          metadata: {
            price: trait.price,
            currency: trait.currency,
            paymentMethod: input.paymentMethod,
          },
        },
      });

      return purchase;
    }),

  // Get user's purchased traits
  getMyPurchases: protectedProcedure.query(async ({ ctx }) => {
    return await prisma.purchase.findMany({
      where: { userId: ctx.userId },
      include: {
        trait: {
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: {
        purchasedAt: 'desc',
      },
    });
  }),

  // ========================================
  // SELLER ROUTES (Create & Manage Traits)
  // ========================================

  // Create new trait listing
  createTrait: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).regex(/^@[a-zA-Z_][a-zA-Z0-9_]*$/), // Must start with @
        displayName: z.string().min(1),
        description: z.string().min(10),
        longDescription: z.string().optional(),
        category: z.string(),
        tags: z.array(z.string()),
        code: z.string().min(50), // Trait implementation code
        price: z.number().min(0),
        license: z.enum(['PERSONAL', 'COMMERCIAL', 'UNLIMITED', 'OPEN_SOURCE']),
        thumbnail: z.string().optional(),
        demoVideoUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user is a seller
      const user = await prisma.user.findUnique({
        where: { id: ctx.userId },
      });

      if (!user?.isSeller) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be a registered seller to create traits',
        });
      }

      // Create trait
      const trait = await prisma.trait.create({
        data: {
          ...input,
          category: input.category as any,
          license: input.license as any,
          currency: 'USD',
          creatorId: ctx.userId,
          status: 'PENDING', // Awaiting review
        },
      });

      return trait;
    }),

  // Update trait
  updateTrait: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        displayName: z.string().optional(),
        description: z.string().optional(),
        price: z.number().min(0).optional(),
        code: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input;

      // Verify ownership
      const trait = await prisma.trait.findUnique({
        where: { id },
      });

      if (!trait || trait.creatorId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      return await prisma.trait.update({
        where: { id },
        data: updates,
      });
    }),

  // Get seller dashboard stats
  getSellerStats: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
    });

    if (!user?.isSeller) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const traits = await prisma.trait.findMany({
      where: { creatorId: ctx.userId },
    });

    const totalDownloads = traits.reduce((sum, t) => sum + t.downloads, 0);
    const totalViews = traits.reduce((sum, t) => sum + t.views, 0);
    const avgRating = traits.reduce((sum, t) => sum + t.rating, 0) / traits.length || 0;

    return {
      totalTraits: traits.length,
      totalSales: user.totalSales,
      totalRevenue: user.totalRevenue,
      totalDownloads,
      totalViews,
      avgRating,
      sellerTier: user.sellerTier,
      traits: traits.map((t) => ({
        id: t.id,
        name: t.displayName,
        downloads: t.downloads,
        views: t.views,
        rating: t.rating,
        revenue: t.price * t.downloads,
      })),
    };
  }),

  // ========================================
  // REVIEW ROUTES
  // ========================================

  // Submit review
  submitReview: protectedProcedure
    .input(
      z.object({
        traitId: z.string(),
        rating: z.number().min(1).max(5),
        title: z.string().optional(),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify purchase
      const purchase = await prisma.purchase.findUnique({
        where: {
          traitId_userId: {
            traitId: input.traitId,
            userId: ctx.userId,
          },
        },
      });

      if (!purchase) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must purchase the trait before reviewing',
        });
      }

      // Create or update review
      const review = await prisma.review.upsert({
        where: {
          traitId_userId: {
            traitId: input.traitId,
            userId: ctx.userId,
          },
        },
        create: {
          ...input,
          userId: ctx.userId,
          verified: true,
        },
        update: {
          rating: input.rating,
          title: input.title,
          comment: input.comment,
        },
      });

      // Update trait rating
      const reviews = await prisma.review.findMany({
        where: { traitId: input.traitId },
      });

      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

      await prisma.trait.update({
        where: { id: input.traitId },
        data: {
          rating: avgRating,
          reviewCount: reviews.length,
        },
      });

      return review;
    }),

  // ========================================
  // FAVORITES
  // ========================================

  // Toggle favorite
  toggleFavorite: protectedProcedure
    .input(z.object({ traitId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.favorite.findUnique({
        where: {
          traitId_userId: {
            traitId: input.traitId,
            userId: ctx.userId,
          },
        },
      });

      if (existing) {
        await prisma.favorite.delete({
          where: { id: existing.id },
        });

        await prisma.trait.update({
          where: { id: input.traitId },
          data: { favoriteCount: { decrement: 1 } },
        });

        return { favorited: false };
      } else {
        await prisma.favorite.create({
          data: {
            traitId: input.traitId,
            userId: ctx.userId,
          },
        });

        await prisma.trait.update({
          where: { id: input.traitId },
          data: { favoriteCount: { increment: 1 } },
        });

        return { favorited: true };
      }
    }),
});

// Helper functions
function generateLicenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = 4;
  const segmentLength = 4;

  return Array.from({ length: segments }, () =>
    Array.from({ length: segmentLength }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('')
  ).join('-');
}

function getCommission(tier: string): number {
  switch (tier) {
    case 'FREE': return 0.30;      // 30%
    case 'PRO': return 0.20;       // 20%
    case 'PREMIUM': return 0.15;   // 15%
    case 'ENTERPRISE': return 0.10; // 10%
    default: return 0.30;
  }
}

export type TraitMarketplaceRouter = typeof traitMarketplaceRouter;
