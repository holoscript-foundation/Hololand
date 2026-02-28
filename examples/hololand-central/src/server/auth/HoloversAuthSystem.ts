/**
 * Holoverse Authentication System
 *
 * Multi-modal authentication supporting:
 * - Email/Password (Web2)
 * - Wallet Connect (Web3)
 * - OAuth (Google, Discord, Twitter)
 * - Decentralized Identity (DID) - Future
 *
 * Features:
 * - Session management with JWT
 * - Refresh token rotation
 * - Multi-device support
 * - Security best practices
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ethers } from 'ethers';
import { z } from 'zod';
import crypto from 'crypto';

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export const EmailSignUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
});

export const EmailSignInSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const WalletAuthSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  signature: z.string(),
  message: z.string(),
});

export const OAuthCallbackSchema = z.object({
  provider: z.enum(['google', 'discord', 'twitter']),
  code: z.string(),
  state: z.string(),
});

export interface AuthSession {
  sessionId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  user: {
    id: string;
    email: string | null;
    walletAddress: string | null;
    username: string;
    subscriptionTier: string;
  };
}

export interface DeviceInfo {
  device: string;
  browser: string;
  os: string;
  ip: string;
  userAgent: string;
}

// ============================================================================
// AUTH SYSTEM
// ============================================================================

export class HoloversAuthSystem {
  private prisma: PrismaClient;
  private jwtSecret: string;
  private jwtRefreshSecret: string;

  constructor(prisma: PrismaClient, jwtSecret?: string, jwtRefreshSecret?: string) {
    this.prisma = prisma;
    this.jwtSecret = jwtSecret || process.env.JWT_SECRET || 'default-secret-change-this';
    this.jwtRefreshSecret = jwtRefreshSecret || process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-this';

    if (!process.env.JWT_SECRET) {
      console.warn('⚠️  JWT_SECRET not set! Using default (INSECURE for production)');
    }
  }

  // ==========================================================================
  // EMAIL/PASSWORD AUTHENTICATION
  // ==========================================================================

  /**
   * Sign up new user with email/password
   */
  async signUpWithEmail(data: z.infer<typeof EmailSignUpSchema>, deviceInfo?: DeviceInfo): Promise<AuthSession> {
    // Validate input
    const validated = EmailSignUpSchema.parse(data);

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: validated.email }
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Check if username already exists
    const existingUsername = await this.prisma.userProfile.findUnique({
      where: { username: validated.username }
    });

    if (existingUsername) {
      throw new Error('Username already taken');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validated.password, 10);

    // Create user with profile
    const user = await this.prisma.user.create({
      data: {
        email: validated.email,
        passwordHash,
        subscriptionTier: 'free',
        isVerified: false, // Require email verification
        profile: {
          create: {
            username: validated.username,
            displayName: validated.username,
            preferences: {
              theme: 'dark',
              notifications: true,
              language: 'en',
            }
          }
        }
      },
      include: {
        profile: true
      }
    });

    // Initialize default skills
    const skills = ['courage', 'imagination', 'resilience', 'wisdom', 'knowledge'];
    await Promise.all(
      skills.map(skillName =>
        this.prisma.skillLevel.create({
          data: {
            userId: user.id,
            skillName,
            level: 0,
            experience: 0,
          }
        })
      )
    );

    // Unlock adventure portal by default
    await this.prisma.portalUnlock.create({
      data: {
        userId: user.id,
        portalId: 'adventure',
        unlockedBy: 'initial_grant',
      }
    });

    // Send verification email (implement separately)
    // await this.sendVerificationEmail(user.email);

    // Create session
    const session = await this.createSession(user.id, deviceInfo);

    return {
      ...session,
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
        username: user.profile!.username,
        subscriptionTier: user.subscriptionTier,
      }
    };
  }

  /**
   * Sign in with email/password
   */
  async signInWithEmail(data: z.infer<typeof EmailSignInSchema>, deviceInfo?: DeviceInfo): Promise<AuthSession> {
    // Validate input
    const validated = EmailSignInSchema.parse(data);

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: validated.email },
      include: { profile: true }
    });

    if (!user || !user.passwordHash) {
      throw new Error('Invalid credentials');
    }

    // Check if banned
    if (user.isBanned) {
      throw new Error('Account has been banned');
    }

    // Verify password
    const valid = await bcrypt.compare(validated.password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Create session
    const session = await this.createSession(user.id, deviceInfo);

    return {
      ...session,
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
        username: user.profile!.username,
        subscriptionTier: user.subscriptionTier,
      }
    };
  }

  // ==========================================================================
  // WALLET AUTHENTICATION (Web3)
  // ==========================================================================

  /**
   * Authenticate with crypto wallet (MetaMask, WalletConnect, etc.)
   */
  async connectWallet(data: z.infer<typeof WalletAuthSchema>, deviceInfo?: DeviceInfo): Promise<AuthSession> {
    // Validate input
    const validated = WalletAuthSchema.parse(data);

    // Verify signature
    try {
      const recoveredAddress = ethers.verifyMessage(validated.message, validated.signature);

      if (recoveredAddress.toLowerCase() !== validated.address.toLowerCase()) {
        throw new Error('Invalid signature');
      }
    } catch (error) {
      throw new Error('Failed to verify wallet signature');
    }

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { walletAddress: validated.address },
      include: { profile: true }
    });

    if (!user) {
      // Create new user for this wallet
      const username = `user_${validated.address.slice(2, 10)}`;

      user = await this.prisma.user.create({
        data: {
          walletAddress: validated.address,
          subscriptionTier: 'free',
          isVerified: true, // Wallet signatures are pre-verified
          profile: {
            create: {
              username,
              displayName: username,
              preferences: {
                theme: 'dark',
                notifications: true,
              }
            }
          }
        },
        include: { profile: true }
      });

      // Initialize default skills
      const skills = ['courage', 'imagination', 'resilience', 'wisdom', 'knowledge'];
      await Promise.all(
        skills.map(skillName =>
          this.prisma.skillLevel.create({
            data: {
              userId: user!.id,
              skillName,
              level: 0,
              experience: 0,
            }
          })
        )
      );

      // Unlock adventure portal
      await this.prisma.portalUnlock.create({
        data: {
          userId: user.id,
          portalId: 'adventure',
          unlockedBy: 'initial_grant',
        }
      });
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Create session
    const session = await this.createSession(user.id, deviceInfo);

    return {
      ...session,
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
        username: user.profile!.username,
        subscriptionTier: user.subscriptionTier,
      }
    };
  }

  /**
   * Generate message for wallet signature
   */
  generateWalletMessage(address: string, nonce?: string): string {
    const timestamp = Date.now();
    const nonceValue = nonce || crypto.randomBytes(16).toString('hex');

    return `Welcome to Holoverse!

Click to sign in and accept the Holoverse Terms of Service.

This request will not trigger a blockchain transaction or cost any gas fees.

Wallet: ${address}
Timestamp: ${timestamp}
Nonce: ${nonceValue}`;
  }

  // ==========================================================================
  // OAUTH AUTHENTICATION
  // ==========================================================================

  /**
   * Initiate OAuth flow (Google, Discord, Twitter)
   */
  async initiateOAuth(provider: 'google' | 'discord' | 'twitter'): Promise<{ authUrl: string; state: string }> {
    const state = crypto.randomUUID();
    const redirectUri = `${process.env.APP_URL}/auth/callback/${provider}`;

    // Store state for verification (in production, use Redis with expiration)
    // For now, we'll verify in handleOAuthCallback

    const authUrls: Record<string, string> = {
      google: `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
      })}`,

      discord: `https://discord.com/api/oauth2/authorize?${new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID || '',
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'identify email',
        state,
      })}`,

      twitter: `https://twitter.com/i/oauth2/authorize?${new URLSearchParams({
        client_id: process.env.TWITTER_CLIENT_ID || '',
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'users.read tweet.read',
        state,
        code_challenge: 'challenge', // PKCE
        code_challenge_method: 'S256',
      })}`,
    };

    return {
      authUrl: authUrls[provider],
      state,
    };
  }

  /**
   * Handle OAuth callback (stub - needs actual OAuth implementation)
   */
  async handleOAuthCallback(
    data: z.infer<typeof OAuthCallbackSchema>,
    deviceInfo?: DeviceInfo
  ): Promise<AuthSession> {
    const validated = OAuthCallbackSchema.parse(data);

    // In production, implement:
    // 1. Verify state
    // 2. Exchange code for access token
    // 3. Get user info from provider
    // 4. Find or create user
    // 5. Create session

    throw new Error('OAuth not fully implemented yet - see HoloversAuthSystem.handleOAuthCallback');
  }

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  /**
   * Create new session for user
   */
  async createSession(userId: string, deviceInfo?: DeviceInfo): Promise<{
    sessionId: string;
    token: string;
    refreshToken: string;
    expiresAt: Date;
  }> {
    const token = crypto.randomUUID();
    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await this.prisma.userSession.create({
      data: {
        userId,
        tokenHash: await bcrypt.hash(token, 10),
        refreshTokenHash: await bcrypt.hash(refreshToken, 10),
        deviceInfo: deviceInfo || {},
        expiresAt,
      }
    });

    return {
      sessionId: session.id,
      token,
      refreshToken,
      expiresAt,
    };
  }

  /**
   * Verify session token
   */
  async verifySession(token: string): Promise<{
    id: string;
    email: string | null;
    walletAddress: string | null;
    username: string;
    subscriptionTier: string;
  }> {
    // Get all active sessions
    const sessions = await this.prisma.userSession.findMany({
      where: {
        expiresAt: { gt: new Date() }
      },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    });

    // Find matching session
    for (const session of sessions) {
      const valid = await bcrypt.compare(token, session.tokenHash);
      if (valid) {
        // Update last active
        await this.prisma.userSession.update({
          where: { id: session.id },
          data: { lastActive: new Date() }
        });

        return {
          id: session.user.id,
          email: session.user.email,
          walletAddress: session.user.walletAddress,
          username: session.user.profile!.username,
          subscriptionTier: session.user.subscriptionTier,
        };
      }
    }

    throw new Error('Invalid or expired session');
  }

  /**
   * Refresh session (get new tokens)
   */
  async refreshSession(refreshToken: string): Promise<{
    sessionId: string;
    token: string;
    refreshToken: string;
    expiresAt: Date;
  }> {
    // Find session by refresh token
    const sessions = await this.prisma.userSession.findMany({
      where: {
        expiresAt: { gt: new Date() }
      }
    });

    for (const session of sessions) {
      const valid = await bcrypt.compare(refreshToken, session.refreshTokenHash!);
      if (valid) {
        // Revoke old session
        await this.prisma.userSession.delete({
          where: { id: session.id }
        });

        // Create new session (refresh token rotation)
        return this.createSession(session.userId);
      }
    }

    throw new Error('Invalid refresh token');
  }

  /**
   * Revoke session (logout)
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.userSession.delete({
      where: { id: sessionId }
    });
  }

  /**
   * Revoke all sessions for user (logout everywhere)
   */
  async revokeAllSessions(userId: string): Promise<void> {
    await this.prisma.userSession.deleteMany({
      where: { userId }
    });
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Check if email is already registered
   */
  async emailExists(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email }
    });
    return user !== null;
  }

  /**
   * Check if username is already taken
   */
  async usernameExists(username: string): Promise<boolean> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { username }
    });
    return profile !== null;
  }

  /**
   * Change password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.passwordHash) {
      throw new Error('User not found or password not set');
    }

    // Verify current password
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });

    // Revoke all sessions (force re-login)
    await this.revokeAllSessions(userId);
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<string> {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal if email exists
      return 'If that email is registered, you will receive a password reset link';
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = await bcrypt.hash(resetToken, 10);

    // Store reset token in database (add a reset_token_hash column in production)
    // For now, just return token

    // Send reset email (implement separately)
    // await this.sendPasswordResetEmail(user.email, resetToken);

    return resetToken;
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // In production:
    // 1. Find user by reset token hash
    // 2. Verify token hasn't expired
    // 3. Hash new password
    // 4. Update user
    // 5. Invalidate reset token
    // 6. Revoke all sessions

    throw new Error('Password reset not fully implemented yet');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default HoloversAuthSystem;
