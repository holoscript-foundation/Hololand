/**
 * Auth Router
 *
 * Handles authentication: sign up, sign in, wallet connect, OAuth
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import {
  EmailSignUpSchema,
  EmailSignInSchema,
  WalletAuthSchema,
} from '../../auth/HoloversAuthSystem';

export const authRouter = router({
  // ==========================================================================
  // EMAIL/PASSWORD AUTH
  // ==========================================================================

  /**
   * Sign up with email/password
   */
  signUp: publicProcedure
    .input(EmailSignUpSchema)
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.auth.signUpWithEmail(input);
      return session;
    }),

  /**
   * Sign in with email/password
   */
  signIn: publicProcedure
    .input(EmailSignInSchema)
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.auth.signInWithEmail(input);
      return session;
    }),

  // ==========================================================================
  // WALLET AUTH (Web3)
  // ==========================================================================

  /**
   * Generate message for wallet signature
   */
  getWalletMessage: publicProcedure
    .input(z.object({ address: z.string() }))
    .query(({ ctx, input }) => {
      const message = ctx.auth.generateWalletMessage(input.address);
      return { message };
    }),

  /**
   * Connect wallet (verify signature)
   */
  connectWallet: publicProcedure
    .input(WalletAuthSchema)
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.auth.connectWallet(input);
      return session;
    }),

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  /**
   * Get current session (who am I?)
   */
  getSession: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      return null;
    }

    // Get full user data
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      include: {
        profile: true,
        skillLevels: true,
        portalUnlocks: true,
        badges: true,
      },
    });

    return user;
  }),

  /**
   * Refresh session (get new tokens)
   */
  refreshSession: publicProcedure
    .input(z.object({ refreshToken: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const newSession = await ctx.auth.refreshSession(input.refreshToken);
      return newSession;
    }),

  /**
   * Sign out (revoke session)
   */
  signOut: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.auth.revokeSession(input.sessionId);
      return { success: true };
    }),

  /**
   * Sign out everywhere (revoke all sessions)
   */
  signOutEverywhere: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.auth.revokeAllSessions(ctx.user.id);
    return { success: true };
  }),

  // ==========================================================================
  // PASSWORD MANAGEMENT
  // ==========================================================================

  /**
   * Change password
   */
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.auth.changePassword(
        ctx.user.id,
        input.currentPassword,
        input.newPassword
      );
      return { success: true };
    }),

  /**
   * Request password reset
   */
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.auth.requestPasswordReset(input.email);
      return { message };
    }),

  // ==========================================================================
  // AVAILABILITY CHECKS
  // ==========================================================================

  /**
   * Check if email is available
   */
  checkEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ ctx, input }) => {
      const exists = await ctx.auth.emailExists(input.email);
      return { available: !exists };
    }),

  /**
   * Check if username is available
   */
  checkUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const exists = await ctx.auth.usernameExists(input.username);
      return { available: !exists };
    }),
});
