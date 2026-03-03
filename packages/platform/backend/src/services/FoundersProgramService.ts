/**
 * Founders Program Service
 *
 * Manages the HoloLand Founders Program:
 *   - Application flow with invite code generation
 *   - Waitlist management with priority scoring
 *   - Founder badge assignment (Pioneer/Visionary/Architect tiers)
 *   - Quota overrides via QuotaTrait integration (founders get 3x defaults)
 *   - Referral tracking and scoring
 *
 * Follows the singleton + direct SQL pattern used by SubscriptionService
 * and CreditService for consistency.
 */

import { randomUUID } from 'crypto';
import { query } from '../db/pool';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errorHandling';

// ============================================================================
// Types
// ============================================================================

export type FounderApplicationStatus =
  | 'pending'
  | 'waitlisted'
  | 'approved'
  | 'rejected'
  | 'revoked';

export type FounderBadgeTier = 'pioneer' | 'visionary' | 'architect';

export type FounderOnboardingStep =
  | 'welcome'
  | 'profile'
  | 'first_world'
  | 'tutorial'
  | 'community'
  | 'complete';

export interface Founder {
  id: string;
  userId: string;
  applicationStatus: FounderApplicationStatus;
  inviteCode: string | null;
  score: number;
  badgeTier: FounderBadgeTier | null;
  onboardingStep: FounderOnboardingStep;
  onboardingCompletedAt: Date | null;
  referredBy: string | null;
  referralCount: number;
  quotaWorlds: number;
  quotaAssets: number;
  quotaStorageMb: number;
  portfolioUrl: string | null;
  applicationNote: string | null;
  createdAt: Date;
  approvedAt: Date | null;
  updatedAt: Date;
}

export interface FounderApplication {
  userId: string;
  portfolioUrl?: string;
  applicationNote?: string;
  referralCode?: string;  // Invite code from an existing founder
}

export interface WaitlistEntry {
  id: string;
  userId: string;
  email: string;
  username: string;
  score: number;
  referralCount: number;
  portfolioUrl: string | null;
  applicationNote: string | null;
  priorityScore: number;
  createdAt: Date;
}

/**
 * QuotaTrait: defines the quota overrides for a given tenant tier.
 * Founders receive 3x the default quotas.
 */
export interface QuotaTrait {
  maxWorlds: number;
  maxAssets: number;
  maxStorageMb: number;
}

/** Default quotas for standard users */
const DEFAULT_QUOTAS: QuotaTrait = {
  maxWorlds: 10,
  maxAssets: 50,
  maxStorageMb: 1024,
};

/** Founder quota multiplier */
const FOUNDER_QUOTA_MULTIPLIER = 3;

/** Founder quotas (3x default) */
const FOUNDER_QUOTAS: QuotaTrait = {
  maxWorlds: DEFAULT_QUOTAS.maxWorlds * FOUNDER_QUOTA_MULTIPLIER,
  maxAssets: DEFAULT_QUOTAS.maxAssets * FOUNDER_QUOTA_MULTIPLIER,
  maxStorageMb: DEFAULT_QUOTAS.maxStorageMb * FOUNDER_QUOTA_MULTIPLIER,
};

/**
 * Badge tier score thresholds.
 * Score is derived from portfolio quality + referral count.
 *   - Pioneer:   score < 50   (early adopters, base tier)
 *   - Visionary:  50 <= score < 80 (strong portfolio or moderate referrals)
 *   - Architect:  score >= 80  (exceptional contributors)
 */
const BADGE_THRESHOLDS: Record<FounderBadgeTier, { min: number; max: number }> = {
  pioneer:   { min: 0,  max: 49.99 },
  visionary: { min: 50, max: 79.99 },
  architect: { min: 80, max: Infinity },
};

// ============================================================================
// Service
// ============================================================================

export class FoundersProgramService {
  private static instance: FoundersProgramService;

  private constructor() {}

  public static getInstance(): FoundersProgramService {
    if (!FoundersProgramService.instance) {
      FoundersProgramService.instance = new FoundersProgramService();
    }
    return FoundersProgramService.instance;
  }

  // --------------------------------------------------------------------------
  // Invite Code Generation
  // --------------------------------------------------------------------------

  /**
   * Generate a unique 8-character invite code from crypto.randomUUID.
   * Format: uppercase alphanumeric, e.g. "A1B2C3D4"
   */
  private generateInviteCode(): string {
    return randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
  }

  /**
   * Ensure the invite code is unique in the database.
   * Retries up to 5 times if a collision occurs.
   */
  private async generateUniqueInviteCode(): Promise<string> {
    const MAX_RETRIES = 5;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const code = this.generateInviteCode();
      const { rows } = await query(
        'SELECT id FROM founders WHERE invite_code = $1 LIMIT 1',
        [code]
      );

      if (!rows || rows.length === 0) {
        return code;
      }

      logger.debug(`[FoundersProgram] Invite code collision on attempt ${attempt + 1}, retrying...`);
    }

    throw new Error('Failed to generate unique invite code after maximum retries');
  }

  // --------------------------------------------------------------------------
  // Application Flow
  // --------------------------------------------------------------------------

  /**
   * Submit a founder application.
   * Creates a founder record in 'pending' status with an invite code.
   * If a referral code is provided, links to the referring founder.
   */
  async submitApplication(application: FounderApplication): Promise<Founder> {
    try {
      // Check if user already has a founder record
      const existing = await this.getFounderByUserId(application.userId);
      if (existing) {
        throw new Error('User already has a founder application');
      }

      // Resolve referral
      let referredById: string | null = null;
      if (application.referralCode) {
        const referrer = await this.getFounderByInviteCode(application.referralCode);
        if (!referrer) {
          throw new Error('Invalid referral code');
        }
        if (referrer.applicationStatus !== 'approved') {
          throw new Error('Referral code belongs to a non-approved founder');
        }
        referredById = referrer.id;
      }

      // Generate unique invite code
      const inviteCode = await this.generateUniqueInviteCode();

      // Calculate initial score based on portfolio
      const initialScore = application.portfolioUrl
        ? this.calculatePortfolioScore(application.portfolioUrl)
        : 0;

      const { rows } = await query(
        `INSERT INTO founders (
          user_id, application_status, invite_code, score,
          portfolio_url, application_note, referred_by,
          quota_worlds, quota_assets, quota_storage_mb
        )
        VALUES ($1, 'pending', $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          application.userId,
          inviteCode,
          initialScore,
          application.portfolioUrl || null,
          application.applicationNote || null,
          referredById,
          FOUNDER_QUOTAS.maxWorlds,
          FOUNDER_QUOTAS.maxAssets,
          FOUNDER_QUOTAS.maxStorageMb,
        ]
      );

      if (!rows || rows.length === 0) {
        throw new Error('Failed to create founder application');
      }

      const founder = this.mapToFounder(rows[0]);

      logger.info(
        `[FoundersProgram] Application submitted for user ${application.userId} ` +
        `(score: ${initialScore}, invite: ${inviteCode})`
      );

      return founder;
    } catch (error) {
      logger.error('[FoundersProgram] Error submitting application:', getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Move an application to the waitlist.
   * Typically called after initial review.
   */
  async moveToWaitlist(founderId: string): Promise<Founder> {
    try {
      const { rows } = await query(
        `UPDATE founders
         SET application_status = 'waitlisted', updated_at = NOW()
         WHERE id = $1 AND application_status = 'pending'
         RETURNING *`,
        [founderId]
      );

      if (!rows || rows.length === 0) {
        throw new Error('Founder not found or not in pending status');
      }

      const founder = this.mapToFounder(rows[0]);
      logger.info(`[FoundersProgram] Founder ${founderId} moved to waitlist`);
      return founder;
    } catch (error) {
      logger.error('[FoundersProgram] Error moving to waitlist:', getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Approve a founder application.
   * Assigns badge tier based on score and activates quota overrides.
   */
  async approveApplication(founderId: string): Promise<Founder> {
    try {
      // Get current founder record for score
      const current = await this.getFounderById(founderId);
      if (!current) {
        throw new Error('Founder not found');
      }

      if (current.applicationStatus === 'approved') {
        throw new Error('Application already approved');
      }

      if (current.applicationStatus === 'rejected' || current.applicationStatus === 'revoked') {
        throw new Error(`Cannot approve application in '${current.applicationStatus}' status`);
      }

      // Determine badge tier from total score (portfolio + referrals)
      const totalScore = current.score + (current.referralCount * 5);
      const badgeTier = this.determineBadgeTier(totalScore);

      const { rows } = await query(
        `UPDATE founders
         SET application_status = 'approved',
             badge_tier = $1,
             approved_at = NOW(),
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [badgeTier, founderId]
      );

      if (!rows || rows.length === 0) {
        throw new Error('Failed to approve founder application');
      }

      const founder = this.mapToFounder(rows[0]);

      logger.info(
        `[FoundersProgram] Founder ${founderId} approved with badge tier: ${badgeTier} ` +
        `(total score: ${totalScore})`
      );

      return founder;
    } catch (error) {
      logger.error('[FoundersProgram] Error approving application:', getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Reject a founder application.
   */
  async rejectApplication(founderId: string, reason?: string): Promise<Founder> {
    try {
      const { rows } = await query(
        `UPDATE founders
         SET application_status = 'rejected', updated_at = NOW()
         WHERE id = $1 AND application_status IN ('pending', 'waitlisted')
         RETURNING *`,
        [founderId]
      );

      if (!rows || rows.length === 0) {
        throw new Error('Founder not found or not in rejectable status');
      }

      const founder = this.mapToFounder(rows[0]);

      logger.info(
        `[FoundersProgram] Founder ${founderId} rejected` +
        (reason ? `: ${reason}` : '')
      );

      return founder;
    } catch (error) {
      logger.error('[FoundersProgram] Error rejecting application:', getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Revoke founder status (e.g. for violations).
   * Resets quotas to default values.
   */
  async revokeFounderStatus(founderId: string): Promise<Founder> {
    try {
      const { rows } = await query(
        `UPDATE founders
         SET application_status = 'revoked',
             badge_tier = NULL,
             quota_worlds = $1,
             quota_assets = $2,
             quota_storage_mb = $3,
             updated_at = NOW()
         WHERE id = $4 AND application_status = 'approved'
         RETURNING *`,
        [DEFAULT_QUOTAS.maxWorlds, DEFAULT_QUOTAS.maxAssets, DEFAULT_QUOTAS.maxStorageMb, founderId]
      );

      if (!rows || rows.length === 0) {
        throw new Error('Founder not found or not in approved status');
      }

      const founder = this.mapToFounder(rows[0]);
      logger.info(`[FoundersProgram] Founder ${founderId} status revoked`);
      return founder;
    } catch (error) {
      logger.error('[FoundersProgram] Error revoking founder status:', getErrorMessage(error));
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // Waitlist Management
  // --------------------------------------------------------------------------

  /**
   * Get the waitlist ordered by priority score (portfolio quality + referral count).
   * Priority score = founder.score + (referral_count * 5)
   */
  async getWaitlist(limit: number = 50, offset: number = 0): Promise<WaitlistEntry[]> {
    try {
      const { rows } = await query(
        `SELECT
          f.id, f.user_id, u.email, u.username,
          f.score, f.referral_count, f.portfolio_url, f.application_note,
          (f.score + (f.referral_count * 5)) AS priority_score,
          f.created_at
        FROM founders f
        JOIN users u ON f.user_id = u.id
        WHERE f.application_status = 'waitlisted'
        ORDER BY (f.score + (f.referral_count * 5)) DESC, f.created_at ASC
        LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return (rows || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        email: row.email,
        username: row.username,
        score: parseFloat(row.score),
        referralCount: parseInt(row.referral_count, 10),
        portfolioUrl: row.portfolio_url,
        applicationNote: row.application_note,
        priorityScore: parseFloat(row.priority_score),
        createdAt: new Date(row.created_at),
      }));
    } catch (error) {
      logger.error('[FoundersProgram] Error fetching waitlist:', getErrorMessage(error));
      return [];
    }
  }

  /**
   * Get waitlist position for a specific founder.
   * Returns 0-based position, or -1 if not on waitlist.
   */
  async getWaitlistPosition(founderId: string): Promise<number> {
    try {
      const { rows } = await query(
        `SELECT position FROM (
          SELECT
            f.id,
            ROW_NUMBER() OVER (
              ORDER BY (f.score + (f.referral_count * 5)) DESC, f.created_at ASC
            ) - 1 AS position
          FROM founders f
          WHERE f.application_status = 'waitlisted'
        ) ranked
        WHERE id = $1`,
        [founderId]
      );

      if (!rows || rows.length === 0) {
        return -1;
      }

      return parseInt(rows[0].position, 10);
    } catch (error) {
      logger.error('[FoundersProgram] Error getting waitlist position:', getErrorMessage(error));
      return -1;
    }
  }

  /**
   * Get total waitlist count.
   */
  async getWaitlistCount(): Promise<number> {
    try {
      const { rows } = await query(
        `SELECT COUNT(*) as count FROM founders WHERE application_status = 'waitlisted'`
      );
      return parseInt(rows[0]?.count || '0', 10);
    } catch (error) {
      logger.error('[FoundersProgram] Error getting waitlist count:', getErrorMessage(error));
      return 0;
    }
  }

  /**
   * Batch approve top N founders from the waitlist based on priority score.
   */
  async approveTopFromWaitlist(count: number): Promise<Founder[]> {
    try {
      const waitlist = await this.getWaitlist(count);
      const approved: Founder[] = [];

      for (const entry of waitlist) {
        try {
          const founder = await this.approveApplication(entry.id);
          approved.push(founder);
        } catch (err) {
          logger.warn(
            `[FoundersProgram] Failed to approve founder ${entry.id}: ${getErrorMessage(err)}`
          );
        }
      }

      logger.info(
        `[FoundersProgram] Batch approved ${approved.length}/${count} founders from waitlist`
      );

      return approved;
    } catch (error) {
      logger.error('[FoundersProgram] Error batch approving from waitlist:', getErrorMessage(error));
      return [];
    }
  }

  /**
   * Update a founder's score (e.g. after portfolio review).
   */
  async updateScore(founderId: string, newScore: number): Promise<Founder> {
    try {
      if (newScore < 0 || newScore > 100) {
        throw new Error('Score must be between 0 and 100');
      }

      const { rows } = await query(
        `UPDATE founders SET score = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [newScore, founderId]
      );

      if (!rows || rows.length === 0) {
        throw new Error('Founder not found');
      }

      const founder = this.mapToFounder(rows[0]);

      // If founder is already approved, check if badge tier should change
      if (founder.applicationStatus === 'approved') {
        const totalScore = newScore + (founder.referralCount * 5);
        const newTier = this.determineBadgeTier(totalScore);

        if (newTier !== founder.badgeTier) {
          await query(
            `UPDATE founders SET badge_tier = $1, updated_at = NOW() WHERE id = $2`,
            [newTier, founderId]
          );
          founder.badgeTier = newTier;
          logger.info(
            `[FoundersProgram] Founder ${founderId} badge upgraded to ${newTier} (total: ${totalScore})`
          );
        }
      }

      return founder;
    } catch (error) {
      logger.error('[FoundersProgram] Error updating score:', getErrorMessage(error));
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // Badge Tier
  // --------------------------------------------------------------------------

  /**
   * Determine badge tier from total score.
   *   Pioneer:   score < 50
   *   Visionary:  50 <= score < 80
   *   Architect:  score >= 80
   */
  private determineBadgeTier(totalScore: number): FounderBadgeTier {
    if (totalScore >= BADGE_THRESHOLDS.architect.min) {
      return 'architect';
    }
    if (totalScore >= BADGE_THRESHOLDS.visionary.min) {
      return 'visionary';
    }
    return 'pioneer';
  }

  /**
   * Calculate a base portfolio quality score (0-100).
   * In production this would involve AI analysis or manual review.
   * For now, provides a deterministic base score from URL characteristics.
   */
  private calculatePortfolioScore(portfolioUrl: string): number {
    let score = 10; // Base score for providing a portfolio at all

    // Known portfolio platforms get bonus points
    const knownPlatforms = [
      { pattern: 'github.com', bonus: 15 },
      { pattern: 'behance.net', bonus: 20 },
      { pattern: 'dribbble.com', bonus: 18 },
      { pattern: 'artstation.com', bonus: 20 },
      { pattern: 'linkedin.com', bonus: 10 },
      { pattern: 'sketchfab.com', bonus: 22 },
      { pattern: 'unity.com', bonus: 15 },
      { pattern: 'unrealengine.com', bonus: 15 },
    ];

    const url = portfolioUrl.toLowerCase();
    for (const platform of knownPlatforms) {
      if (url.includes(platform.pattern)) {
        score += platform.bonus;
        break;
      }
    }

    // Personal domains get moderate bonus (shows commitment)
    if (!knownPlatforms.some(p => url.includes(p.pattern))) {
      score += 12;
    }

    // HTTPS bonus
    if (url.startsWith('https://')) {
      score += 3;
    }

    // Cap at 50 for auto-scoring; manual review can push to 100
    return Math.min(score, 50);
  }

  // --------------------------------------------------------------------------
  // Quota / TenantTrait Integration
  // --------------------------------------------------------------------------

  /**
   * Get quota overrides for a user.
   * Returns founder quotas if the user is an approved founder,
   * otherwise returns default quotas.
   */
  async getQuotasForUser(userId: string): Promise<QuotaTrait> {
    try {
      const founder = await this.getFounderByUserId(userId);

      if (!founder || founder.applicationStatus !== 'approved') {
        return { ...DEFAULT_QUOTAS };
      }

      return {
        maxWorlds: founder.quotaWorlds,
        maxAssets: founder.quotaAssets,
        maxStorageMb: founder.quotaStorageMb,
      };
    } catch (error) {
      logger.error('[FoundersProgram] Error getting quotas for user:', getErrorMessage(error));
      return { ...DEFAULT_QUOTAS };
    }
  }

  /**
   * Check if a user has founder-tier tenant provisioning.
   * Used by TenantTrait to determine elevated resource limits.
   */
  async isFounder(userId: string): Promise<boolean> {
    try {
      const founder = await this.getFounderByUserId(userId);
      return founder !== null && founder.applicationStatus === 'approved';
    } catch (error) {
      logger.error('[FoundersProgram] Error checking founder status:', getErrorMessage(error));
      return false;
    }
  }

  /**
   * Get the TenantTrait provisioning tier name for a user.
   * Returns the badge tier name for founders, or 'standard' for non-founders.
   */
  async getTenantTier(userId: string): Promise<string> {
    try {
      const founder = await this.getFounderByUserId(userId);

      if (!founder || founder.applicationStatus !== 'approved') {
        return 'standard';
      }

      return `founder_${founder.badgeTier || 'pioneer'}`;
    } catch (error) {
      logger.error('[FoundersProgram] Error getting tenant tier:', getErrorMessage(error));
      return 'standard';
    }
  }

  // --------------------------------------------------------------------------
  // Lookups
  // --------------------------------------------------------------------------

  /**
   * Get a founder record by ID.
   */
  async getFounderById(founderId: string): Promise<Founder | null> {
    try {
      const { rows } = await query(
        'SELECT * FROM founders WHERE id = $1 LIMIT 1',
        [founderId]
      );

      if (!rows || rows.length === 0) {
        return null;
      }

      return this.mapToFounder(rows[0]);
    } catch (error) {
      logger.error('[FoundersProgram] Error getting founder by ID:', getErrorMessage(error));
      return null;
    }
  }

  /**
   * Get a founder record by user ID.
   */
  async getFounderByUserId(userId: string): Promise<Founder | null> {
    try {
      const { rows } = await query(
        'SELECT * FROM founders WHERE user_id = $1 LIMIT 1',
        [userId]
      );

      if (!rows || rows.length === 0) {
        return null;
      }

      return this.mapToFounder(rows[0]);
    } catch (error) {
      logger.error('[FoundersProgram] Error getting founder by user ID:', getErrorMessage(error));
      return null;
    }
  }

  /**
   * Get a founder by invite code.
   */
  async getFounderByInviteCode(inviteCode: string): Promise<Founder | null> {
    try {
      const { rows } = await query(
        'SELECT * FROM founders WHERE invite_code = $1 LIMIT 1',
        [inviteCode.toUpperCase()]
      );

      if (!rows || rows.length === 0) {
        return null;
      }

      return this.mapToFounder(rows[0]);
    } catch (error) {
      logger.error('[FoundersProgram] Error getting founder by invite code:', getErrorMessage(error));
      return null;
    }
  }

  /**
   * List all founders, optionally filtered by status.
   */
  async listFounders(
    status?: FounderApplicationStatus,
    limit: number = 50,
    offset: number = 0
  ): Promise<Founder[]> {
    try {
      let sql = 'SELECT * FROM founders';
      const params: any[] = [];

      if (status) {
        sql += ' WHERE application_status = $1';
        params.push(status);
      }

      sql += ' ORDER BY created_at DESC';
      sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const { rows } = await query(sql, params);
      return (rows || []).map((row: any) => this.mapToFounder(row));
    } catch (error) {
      logger.error('[FoundersProgram] Error listing founders:', getErrorMessage(error));
      return [];
    }
  }

  /**
   * Get referrals for a founder.
   */
  async getReferrals(founderId: string): Promise<Founder[]> {
    try {
      const { rows } = await query(
        `SELECT * FROM founders WHERE referred_by = $1 ORDER BY created_at DESC`,
        [founderId]
      );

      return (rows || []).map((row: any) => this.mapToFounder(row));
    } catch (error) {
      logger.error('[FoundersProgram] Error getting referrals:', getErrorMessage(error));
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // Statistics
  // --------------------------------------------------------------------------

  /**
   * Get program statistics.
   */
  async getStats(): Promise<{
    totalApplications: number;
    pending: number;
    waitlisted: number;
    approved: number;
    rejected: number;
    revoked: number;
    byTier: Record<FounderBadgeTier, number>;
    totalReferrals: number;
  }> {
    try {
      const { rows: statusCounts } = await query(
        `SELECT application_status, COUNT(*) as count
         FROM founders
         GROUP BY application_status`
      );

      const { rows: tierCounts } = await query(
        `SELECT badge_tier, COUNT(*) as count
         FROM founders
         WHERE badge_tier IS NOT NULL
         GROUP BY badge_tier`
      );

      const { rows: referralTotal } = await query(
        `SELECT COALESCE(SUM(referral_count), 0) as total FROM founders`
      );

      const statusMap: Record<string, number> = {};
      for (const row of statusCounts || []) {
        statusMap[row.application_status] = parseInt(row.count, 10);
      }

      const tierMap: Record<string, number> = {};
      for (const row of tierCounts || []) {
        tierMap[row.badge_tier] = parseInt(row.count, 10);
      }

      const total = Object.values(statusMap).reduce((sum, n) => sum + n, 0);

      return {
        totalApplications: total,
        pending: statusMap['pending'] || 0,
        waitlisted: statusMap['waitlisted'] || 0,
        approved: statusMap['approved'] || 0,
        rejected: statusMap['rejected'] || 0,
        revoked: statusMap['revoked'] || 0,
        byTier: {
          pioneer: tierMap['pioneer'] || 0,
          visionary: tierMap['visionary'] || 0,
          architect: tierMap['architect'] || 0,
        },
        totalReferrals: parseInt(referralTotal?.[0]?.total || '0', 10),
      };
    } catch (error) {
      logger.error('[FoundersProgram] Error getting stats:', getErrorMessage(error));
      return {
        totalApplications: 0,
        pending: 0,
        waitlisted: 0,
        approved: 0,
        rejected: 0,
        revoked: 0,
        byTier: { pioneer: 0, visionary: 0, architect: 0 },
        totalReferrals: 0,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Mapping
  // --------------------------------------------------------------------------

  private mapToFounder(row: any): Founder {
    return {
      id: row.id,
      userId: row.user_id,
      applicationStatus: row.application_status,
      inviteCode: row.invite_code,
      score: parseFloat(row.score),
      badgeTier: row.badge_tier,
      onboardingStep: row.onboarding_step || 'welcome',
      onboardingCompletedAt: row.onboarding_completed_at
        ? new Date(row.onboarding_completed_at)
        : null,
      referredBy: row.referred_by,
      referralCount: parseInt(row.referral_count || '0', 10),
      quotaWorlds: parseInt(row.quota_worlds || String(FOUNDER_QUOTAS.maxWorlds), 10),
      quotaAssets: parseInt(row.quota_assets || String(FOUNDER_QUOTAS.maxAssets), 10),
      quotaStorageMb: parseInt(row.quota_storage_mb || String(FOUNDER_QUOTAS.maxStorageMb), 10),
      portfolioUrl: row.portfolio_url,
      applicationNote: row.application_note,
      createdAt: new Date(row.created_at),
      approvedAt: row.approved_at ? new Date(row.approved_at) : null,
      updatedAt: new Date(row.updated_at),
    };
  }
}

// Singleton accessor
export const foundersProgramService = FoundersProgramService.getInstance();

export function getFoundersProgramService(): FoundersProgramService {
  return FoundersProgramService.getInstance();
}
