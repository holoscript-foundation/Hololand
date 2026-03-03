/**
 * @hololand/backend -- EmailVerificationService
 *
 * Email verification flow for user registration and email changes.
 * Generates cryptographically secure tokens, stores them with expiry,
 * and validates them on verification. Integrates with the existing
 * EmailService for sending verification emails.
 *
 * Token Lifecycle:
 *   generateVerificationToken(userId, email)
 *       -> creates crypto.randomBytes(32) hex token
 *       -> stores with 24h expiry
 *       -> sends verification email via EmailService
 *
 *   verifyEmail(token)
 *       -> validates token exists and is not expired
 *       -> marks email as verified
 *       -> deletes token
 *
 *   resendVerification(userId)
 *       -> 60s cooldown between resends
 *       -> generates new token, invalidates old one
 *       -> sends new verification email
 *
 * Storage:
 *   In-memory for now (same pattern as other services).
 *   DB-backed in production via Supabase.
 *
 * Usage:
 *   const verifier = EmailVerificationService.getInstance();
 *   const token = await verifier.generateVerificationToken(userId, email);
 *   // User clicks link in email...
 *   const result = await verifier.verifyEmail(token);
 *   if (result.verified) { ... }
 *
 * @version 1.0.0
 */

import crypto from 'crypto';
import { EmailService, getEmailService } from './EmailService';

// =============================================================================
// Types
// =============================================================================

export interface VerificationToken {
  token: string;
  userId: string;
  email: string;
  createdAt: number;
  expiresAt: number;
  /** Whether this token has been used. */
  used: boolean;
}

export interface VerifiedEmail {
  userId: string;
  email: string;
  verifiedAt: number;
}

export interface VerificationResult {
  verified: boolean;
  userId?: string;
  email?: string;
  error?: string;
}

export interface ResendResult {
  sent: boolean;
  error?: string;
  /** Seconds until next resend is allowed. */
  cooldownRemainingSec?: number;
}

export interface EmailVerificationServiceConfig {
  /** Token expiry in milliseconds. Default: 86400000 (24 hours). */
  tokenExpiryMs?: number;
  /** Cooldown between resends in milliseconds. Default: 60000 (60 seconds). */
  resendCooldownMs?: number;
  /** Base URL for verification links. Default: process.env.APP_URL or 'https://central.hololand.io'. */
  baseUrl?: string;
  /** Verification route path. Default: '/verify-email'. */
  verifyPath?: string;
}

// =============================================================================
// Defaults
// =============================================================================

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const DEFAULT_BASE_URL = 'https://central.hololand.io';
const DEFAULT_VERIFY_PATH = '/verify-email';

// =============================================================================
// Service
// =============================================================================

export class EmailVerificationService {
  private static instance: EmailVerificationService | null = null;

  private readonly config: Required<EmailVerificationServiceConfig>;

  /** Tokens indexed by token string. */
  private tokens: Map<string, VerificationToken> = new Map();

  /** Tokens indexed by userId for quick lookup. */
  private userTokens: Map<string, string> = new Map(); // userId -> token

  /** Verified emails indexed by userId. */
  private verifiedEmails: Map<string, VerifiedEmail> = new Map();

  /** Last resend timestamp per userId for cooldown enforcement. */
  private lastResendTimestamps: Map<string, number> = new Map();

  /** Reference to the email service for sending emails. */
  private emailService: EmailService | null = null;

  constructor(config: EmailVerificationServiceConfig = {}) {
    this.config = {
      tokenExpiryMs: config.tokenExpiryMs ?? TOKEN_EXPIRY_MS,
      resendCooldownMs: config.resendCooldownMs ?? RESEND_COOLDOWN_MS,
      baseUrl: config.baseUrl ?? process.env.APP_URL ?? DEFAULT_BASE_URL,
      verifyPath: config.verifyPath ?? DEFAULT_VERIFY_PATH,
    };
  }

  static getInstance(): EmailVerificationService {
    if (!EmailVerificationService.instance) {
      EmailVerificationService.instance = new EmailVerificationService();
    }
    return EmailVerificationService.instance;
  }

  // ---------------------------------------------------------------------------
  // Core API
  // ---------------------------------------------------------------------------

  /**
   * Generate a verification token for a user's email address.
   * Sends a verification email via EmailService.
   *
   * If the user already has a pending token, it is invalidated and replaced.
   *
   * @returns The generated token string (for testing; in production, only sent via email).
   */
  async generateVerificationToken(userId: string, email: string): Promise<string> {
    if (!userId || !email) {
      throw new Error('userId and email are required');
    }

    // Validate email format
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Invalidate any existing token for this user
    this.invalidateUserToken(userId);

    // Generate cryptographically secure token
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();

    const verificationToken: VerificationToken = {
      token,
      userId,
      email: email.toLowerCase().trim(),
      createdAt: now,
      expiresAt: now + this.config.tokenExpiryMs,
      used: false,
    };

    // Store token
    this.tokens.set(token, verificationToken);
    this.userTokens.set(userId, token);
    this.lastResendTimestamps.set(userId, now);

    // Send verification email
    await this.sendVerificationEmail(email, token, userId);

    return token;
  }

  /**
   * Verify an email using the provided token.
   *
   * Validates that:
   *   - Token exists
   *   - Token has not expired
   *   - Token has not already been used
   *
   * On success, marks the email as verified and removes the token.
   */
  async verifyEmail(token: string): Promise<VerificationResult> {
    if (!token) {
      return { verified: false, error: 'Token is required' };
    }

    const record = this.tokens.get(token);

    if (!record) {
      return { verified: false, error: 'Invalid or expired verification token' };
    }

    if (record.used) {
      return { verified: false, error: 'Token has already been used' };
    }

    if (Date.now() > record.expiresAt) {
      // Clean up expired token
      this.tokens.delete(token);
      this.userTokens.delete(record.userId);
      return { verified: false, error: 'Verification token has expired' };
    }

    // Mark as used
    record.used = true;

    // Store verified email
    this.verifiedEmails.set(record.userId, {
      userId: record.userId,
      email: record.email,
      verifiedAt: Date.now(),
    });

    // Clean up token
    this.tokens.delete(token);
    this.userTokens.delete(record.userId);

    return {
      verified: true,
      userId: record.userId,
      email: record.email,
    };
  }

  /**
   * Resend a verification email to the user.
   *
   * Enforces a cooldown period (default 60s) between resends.
   * Generates a new token and invalidates the old one.
   */
  async resendVerification(userId: string): Promise<ResendResult> {
    if (!userId) {
      return { sent: false, error: 'userId is required' };
    }

    // Check cooldown
    const lastResend = this.lastResendTimestamps.get(userId) ?? 0;
    const elapsed = Date.now() - lastResend;
    const cooldownRemaining = this.config.resendCooldownMs - elapsed;

    if (cooldownRemaining > 0) {
      return {
        sent: false,
        error: 'Please wait before requesting another verification email',
        cooldownRemainingSec: Math.ceil(cooldownRemaining / 1000),
      };
    }

    // Find the user's existing token to get their email
    const existingTokenStr = this.userTokens.get(userId);
    let email: string | undefined;

    if (existingTokenStr) {
      const existingToken = this.tokens.get(existingTokenStr);
      email = existingToken?.email;
    }

    // Also check verified emails for the email address
    if (!email) {
      const verified = this.verifiedEmails.get(userId);
      email = verified?.email;
    }

    if (!email) {
      return { sent: false, error: 'No email found for this user. Please provide an email address.' };
    }

    // Generate new token (this invalidates the old one)
    await this.generateVerificationToken(userId, email);

    return { sent: true };
  }

  // ---------------------------------------------------------------------------
  // Query API
  // ---------------------------------------------------------------------------

  /**
   * Check if a user's email is verified.
   */
  isEmailVerified(userId: string): boolean {
    return this.verifiedEmails.has(userId);
  }

  /**
   * Get the verified email record for a user.
   */
  getVerifiedEmail(userId: string): VerifiedEmail | undefined {
    return this.verifiedEmails.get(userId);
  }

  /**
   * Check if a user has a pending (unexpired) verification token.
   */
  hasPendingVerification(userId: string): boolean {
    const tokenStr = this.userTokens.get(userId);
    if (!tokenStr) return false;

    const token = this.tokens.get(tokenStr);
    if (!token) return false;

    return !token.used && Date.now() <= token.expiresAt;
  }

  /**
   * Get the pending verification email for a user.
   */
  getPendingEmail(userId: string): string | undefined {
    const tokenStr = this.userTokens.get(userId);
    if (!tokenStr) return undefined;

    const token = this.tokens.get(tokenStr);
    if (!token || token.used || Date.now() > token.expiresAt) return undefined;

    return token.email;
  }

  // ---------------------------------------------------------------------------
  // Admin API
  // ---------------------------------------------------------------------------

  /**
   * Manually mark an email as verified (admin override).
   */
  markEmailVerified(userId: string, email: string): void {
    this.verifiedEmails.set(userId, {
      userId,
      email: email.toLowerCase().trim(),
      verifiedAt: Date.now(),
    });

    // Clean up any pending tokens
    this.invalidateUserToken(userId);
  }

  /**
   * Revoke email verification for a user.
   */
  revokeVerification(userId: string): boolean {
    return this.verifiedEmails.delete(userId);
  }

  /**
   * Get service statistics.
   */
  getStats(): {
    pendingTokens: number;
    verifiedEmails: number;
    expiredTokens: number;
  } {
    const now = Date.now();
    let expired = 0;
    let pending = 0;

    for (const token of this.tokens.values()) {
      if (token.used || now > token.expiresAt) {
        expired++;
      } else {
        pending++;
      }
    }

    return {
      pendingTokens: pending,
      verifiedEmails: this.verifiedEmails.size,
      expiredTokens: expired,
    };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Clean up expired tokens. Call periodically or before operations.
   */
  cleanupExpiredTokens(): number {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, token] of this.tokens.entries()) {
      if (token.used || now > token.expiresAt) {
        keysToDelete.push(key);
        // Also clean up user mapping
        const userToken = this.userTokens.get(token.userId);
        if (userToken === key) {
          this.userTokens.delete(token.userId);
        }
      }
    }

    for (const key of keysToDelete) {
      this.tokens.delete(key);
    }

    return keysToDelete.length;
  }

  /**
   * Destroy the service instance and clear all data.
   */
  destroy(): void {
    this.tokens.clear();
    this.userTokens.clear();
    this.verifiedEmails.clear();
    this.lastResendTimestamps.clear();
    if (EmailVerificationService.instance === this) {
      EmailVerificationService.instance = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private invalidateUserToken(userId: string): void {
    const existingTokenStr = this.userTokens.get(userId);
    if (existingTokenStr) {
      this.tokens.delete(existingTokenStr);
      this.userTokens.delete(userId);
    }
  }

  private isValidEmail(email: string): boolean {
    // RFC 5322 simplified validation
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private async sendVerificationEmail(email: string, token: string, _userId: string): Promise<void> {
    try {
      if (!this.emailService) {
        this.emailService = getEmailService();
      }

      const verifyUrl = `${this.config.baseUrl}${this.config.verifyPath}?token=${token}`;

      await this.emailService.sendEmail({
        to: email,
        template: 'verify',
        data: {
          verifyUrl,
        },
      });
    } catch (error) {
      // Log but don't throw -- the token is still valid even if email fails
      console.error(`[EmailVerificationService] Failed to send verification email to ${email}:`, error);
    }
  }
}

// =============================================================================
// Singleton accessor
// =============================================================================

export function getEmailVerificationService(): EmailVerificationService {
  return EmailVerificationService.getInstance();
}
