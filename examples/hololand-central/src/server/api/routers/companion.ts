/**
 * Companion Router
 *
 * Handles AI companion interactions, conversation history, and NPC relationships
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const companionRouter = router({
  // ==========================================================================
  // CONVERSATION MANAGEMENT
  // ==========================================================================

  /**
   * Get all conversations for current user
   */
  getConversations: protectedProcedure
    .input(
      z
        .object({
          companionId: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const conversations = await ctx.prisma.aIConversation.findMany({
        where: {
          userId: ctx.user.id,
          companionId: input?.companionId,
        },
        include: {
          messages: {
            orderBy: { timestamp: 'asc' },
            take: 10, // Only get recent messages per conversation
          },
        },
        orderBy: { lastMessageAt: 'desc' },
        take: input?.limit,
      });

      return conversations;
    }),

  /**
   * Get specific conversation with full message history
   */
  getConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const conversation = await ctx.prisma.aIConversation.findUnique({
        where: {
          id: input.conversationId,
          userId: ctx.user.id, // Ensure user owns this conversation
        },
        include: {
          messages: {
            orderBy: { timestamp: 'asc' },
          },
        },
      });

      return conversation;
    }),

  /**
   * Start a new conversation with a companion
   */
  startConversation: protectedProcedure
    .input(
      z.object({
        companionId: z.string(),
        context: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const conversation = await ctx.prisma.aIConversation.create({
        data: {
          userId: ctx.user.id,
          companionId: input.companionId,
          context: input.context,
        },
      });

      return conversation;
    }),

  // ==========================================================================
  // MESSAGE MANAGEMENT
  // ==========================================================================

  /**
   * Send a message to a companion
   */
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string().min(1).max(2000),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user owns this conversation
      const conversation = await ctx.prisma.aIConversation.findUnique({
        where: {
          id: input.conversationId,
          userId: ctx.user.id,
        },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Create user message
      const userMessage = await ctx.prisma.aIMessage.create({
        data: {
          conversationId: input.conversationId,
          role: 'user',
          content: input.content,
          metadata: input.metadata,
        },
      });

      // Update conversation last message timestamp
      await ctx.prisma.aIConversation.update({
        where: { id: input.conversationId },
        data: { lastMessageAt: new Date() },
      });

      return userMessage;
    }),

  /**
   * Save companion's response
   */
  saveResponse: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user owns this conversation
      const conversation = await ctx.prisma.aIConversation.findUnique({
        where: {
          id: input.conversationId,
          userId: ctx.user.id,
        },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Create assistant message
      const assistantMessage = await ctx.prisma.aIMessage.create({
        data: {
          conversationId: input.conversationId,
          role: 'assistant',
          content: input.content,
          metadata: input.metadata,
        },
      });

      // Update conversation last message timestamp
      await ctx.prisma.aIConversation.update({
        where: { id: input.conversationId },
        data: { lastMessageAt: new Date() },
      });

      return assistantMessage;
    }),

  /**
   * Get messages for a conversation
   */
  getMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        limit: z.number().min(1).max(200).default(100),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const messages = await ctx.prisma.aIMessage.findMany({
        where: {
          conversationId: input.conversationId,
        },
        orderBy: { timestamp: 'asc' },
        skip: input.offset,
        take: input.limit,
      });

      return messages;
    }),

  // ==========================================================================
  // COMPANION MANAGEMENT
  // ==========================================================================

  /**
   * Get all available companions
   */
  getCompanions: protectedProcedure.query(async ({ ctx }) => {
    // TODO: Once Companion model is created, query from database
    // For now, return hardcoded companion list
    return [
      {
        id: 'captain-compass',
        name: 'Captain Compass',
        role: 'Navigator & Quest Guide',
        personality: 'Wise, encouraging, adventurous',
        expertise: ['exploration', 'quests', 'navigation'],
      },
      {
        id: 'lumina',
        name: 'Lumina',
        role: 'Creative AI Muse',
        personality: 'Inspiring, artistic, playful',
        expertise: ['creativity', 'art', 'design'],
      },
      {
        id: 'raven',
        name: 'Raven',
        role: 'Technical Mentor',
        personality: 'Precise, knowledgeable, patient',
        expertise: ['programming', 'technology', 'problem-solving'],
      },
    ];
  }),

  /**
   * Get companion conversation stats
   */
  getCompanionStats: protectedProcedure
    .input(z.object({ companionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [conversationCount, messageCount] = await Promise.all([
        ctx.prisma.aIConversation.count({
          where: {
            userId: ctx.user.id,
            companionId: input.companionId,
          },
        }),
        ctx.prisma.aIMessage.count({
          where: {
            conversation: {
              userId: ctx.user.id,
              companionId: input.companionId,
            },
          },
        }),
      ]);

      const lastConversation = await ctx.prisma.aIConversation.findFirst({
        where: {
          userId: ctx.user.id,
          companionId: input.companionId,
        },
        orderBy: { lastMessageAt: 'desc' },
      });

      return {
        conversationCount,
        messageCount,
        lastInteraction: lastConversation?.lastMessageAt,
      };
    }),

  // ==========================================================================
  // CONVERSATION UTILITIES
  // ==========================================================================

  /**
   * Archive a conversation
   */
  archiveConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await ctx.prisma.aIConversation.update({
        where: {
          id: input.conversationId,
          userId: ctx.user.id,
        },
        data: {
          archived: true,
        },
      });

      return conversation;
    }),

  /**
   * Delete a conversation
   */
  deleteConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Delete all messages first (cascade might not be configured)
      await ctx.prisma.aIMessage.deleteMany({
        where: { conversationId: input.conversationId },
      });

      // Delete conversation
      await ctx.prisma.aIConversation.delete({
        where: {
          id: input.conversationId,
          userId: ctx.user.id,
        },
      });

      return { success: true };
    }),
});
