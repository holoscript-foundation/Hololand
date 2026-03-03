/**
 * FoundersProgramService Integration Tests
 *
 * Tests the application flow, invite codes, waitlist scoring,
 * and badge tier assignment for the HoloLand Founders Program.
 *
 * All database queries are mocked -- no live DB required.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock the database pool
const mockQuery = vi.fn();
vi.mock('../../db/pool', () => ({
  query: (...args: any[]) => mockQuery(...args),
}));

// Mock the logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock the error handling utility
vi.mock('../../utils/errorHandling', () => ({
  getErrorMessage: (err: unknown) =>
    err instanceof Error ? err.message : String(err),
}));

// Import after mocks are set up
import {
  FoundersProgramService,
  type Founder,
  type FounderApplication,
} from '../FoundersProgramService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a fake DB row that `mapToFounder` expects. */
function makeFounderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'founder-001',
    user_id: 'user-001',
    application_status: 'pending',
    invite_code: 'ABCD1234',
    score: '25',
    badge_tier: null,
    onboarding_step: 'welcome',
    onboarding_completed_at: null,
    referred_by: null,
    referral_count: '0',
    quota_worlds: '30',
    quota_assets: '150',
    quota_storage_mb: '3072',
    portfolio_url: null,
    application_note: null,
    created_at: new Date().toISOString(),
    approved_at: null,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FoundersProgramService', () => {
  let service: FoundersProgramService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the singleton so each test gets a clean instance
    (FoundersProgramService as any).instance = undefined;
    service = FoundersProgramService.getInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ========================================================================
  // Singleton
  // ========================================================================

  describe('getInstance', () => {
    it('returns the same instance on successive calls', () => {
      const a = FoundersProgramService.getInstance();
      const b = FoundersProgramService.getInstance();
      expect(a).toBe(b);
    });
  });

  // ========================================================================
  // Application Flow
  // ========================================================================

  describe('submitApplication', () => {
    it('creates a pending founder record with a generated invite code', async () => {
      // First call: check for existing founder (none found)
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Second call: check invite code uniqueness
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Third call: INSERT returning the new founder row
      const row = makeFounderRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const application: FounderApplication = {
        userId: 'user-001',
        portfolioUrl: 'https://github.com/test-user',
        applicationNote: 'Excited to build in VR',
      };

      const founder = await service.submitApplication(application);

      expect(founder).toBeDefined();
      expect(founder.userId).toBe('user-001');
      expect(founder.applicationStatus).toBe('pending');
      expect(founder.inviteCode).toBe('ABCD1234');
    });

    it('throws if the user already has an application', async () => {
      // Existing founder found
      mockQuery.mockResolvedValueOnce({
        rows: [makeFounderRow()],
      });

      await expect(
        service.submitApplication({ userId: 'user-001' })
      ).rejects.toThrow('User already has a founder application');
    });

    it('throws on invalid referral code', async () => {
      // No existing founder
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Referral code lookup: not found
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.submitApplication({
          userId: 'user-002',
          referralCode: 'BADCODE1',
        })
      ).rejects.toThrow('Invalid referral code');
    });

    it('links the referral when a valid approved referral code is provided', async () => {
      // No existing founder for the applicant
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Referral code lookup: found an approved founder
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeFounderRow({
            id: 'referrer-001',
            application_status: 'approved',
            invite_code: 'REF12345',
          }),
        ],
      });
      // Invite code uniqueness check
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // INSERT returning new row
      const newRow = makeFounderRow({
        id: 'founder-002',
        user_id: 'user-002',
        referred_by: 'referrer-001',
      });
      mockQuery.mockResolvedValueOnce({ rows: [newRow] });

      const founder = await service.submitApplication({
        userId: 'user-002',
        referralCode: 'REF12345',
      });

      expect(founder.referredBy).toBe('referrer-001');
    });
  });

  // ========================================================================
  // Invite Codes
  // ========================================================================

  describe('invite code generation', () => {
    it('generates an 8-character uppercase invite code', async () => {
      // Access the private method through the service
      const code = (service as any).generateInviteCode();
      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it('retries on invite code collision until unique', async () => {
      // First code check: collision (row found)
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing' }] });
      // Second code check: unique (no rows)
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const code = await (service as any).generateUniqueInviteCode();
      expect(code).toHaveLength(8);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });

  // ========================================================================
  // Waitlist Scoring
  // ========================================================================

  describe('waitlist management', () => {
    it('moves a pending founder to the waitlist', async () => {
      const waitlistedRow = makeFounderRow({
        application_status: 'waitlisted',
      });
      mockQuery.mockResolvedValueOnce({ rows: [waitlistedRow] });

      const founder = await service.moveToWaitlist('founder-001');
      expect(founder.applicationStatus).toBe('waitlisted');
    });

    it('throws when moving a non-pending founder to the waitlist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(service.moveToWaitlist('founder-001')).rejects.toThrow(
        'Founder not found or not in pending status'
      );
    });

    it('returns the ordered waitlist with priority scores', async () => {
      const rows = [
        {
          id: 'f-1',
          user_id: 'u-1',
          email: 'a@test.com',
          username: 'alice',
          score: '70',
          referral_count: '3',
          portfolio_url: null,
          application_note: null,
          priority_score: '85',
          created_at: new Date().toISOString(),
        },
        {
          id: 'f-2',
          user_id: 'u-2',
          email: 'b@test.com',
          username: 'bob',
          score: '40',
          referral_count: '1',
          portfolio_url: null,
          application_note: null,
          priority_score: '45',
          created_at: new Date().toISOString(),
        },
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const waitlist = await service.getWaitlist(50, 0);
      expect(waitlist).toHaveLength(2);
      expect(waitlist[0].priorityScore).toBe(85);
      expect(waitlist[1].priorityScore).toBe(45);
    });

    it('returns waitlist position for a specific founder', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ position: '3' }],
      });

      const position = await service.getWaitlistPosition('founder-001');
      expect(position).toBe(3);
    });

    it('returns -1 when founder is not on the waitlist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const position = await service.getWaitlistPosition('not-found');
      expect(position).toBe(-1);
    });

    it('returns the total waitlist count', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '42' }] });

      const count = await service.getWaitlistCount();
      expect(count).toBe(42);
    });
  });

  // ========================================================================
  // Badge Tier Assignment
  // ========================================================================

  describe('badge tier assignment', () => {
    it('assigns "pioneer" tier for score < 50', () => {
      const tier = (service as any).determineBadgeTier(30);
      expect(tier).toBe('pioneer');
    });

    it('assigns "visionary" tier for 50 <= score < 80', () => {
      const tier = (service as any).determineBadgeTier(65);
      expect(tier).toBe('visionary');
    });

    it('assigns "architect" tier for score >= 80', () => {
      const tier = (service as any).determineBadgeTier(95);
      expect(tier).toBe('architect');
    });

    it('assigns badge tier on approval based on total score (score + referrals * 5)', async () => {
      // getFounderById
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeFounderRow({
            application_status: 'waitlisted',
            score: '60',
            referral_count: '5',
          }),
        ],
      });
      // UPDATE returning approved founder
      const approvedRow = makeFounderRow({
        application_status: 'approved',
        badge_tier: 'architect',
        score: '60',
        referral_count: '5',
      });
      mockQuery.mockResolvedValueOnce({ rows: [approvedRow] });

      const founder = await service.approveApplication('founder-001');

      // totalScore = 60 + (5 * 5) = 85 -> architect
      expect(founder.applicationStatus).toBe('approved');
      expect(founder.badgeTier).toBe('architect');
    });

    it('rejects approval if already approved', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeFounderRow({ application_status: 'approved' })],
      });

      await expect(
        service.approveApplication('founder-001')
      ).rejects.toThrow('Application already approved');
    });

    it('prevents approval of rejected or revoked applications', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeFounderRow({ application_status: 'rejected' })],
      });

      await expect(
        service.approveApplication('founder-001')
      ).rejects.toThrow("Cannot approve application in 'rejected' status");
    });
  });

  // ========================================================================
  // Score Updates
  // ========================================================================

  describe('updateScore', () => {
    it('updates the score and returns the updated founder', async () => {
      const updatedRow = makeFounderRow({ score: '75' });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const founder = await service.updateScore('founder-001', 75);
      expect(founder.score).toBe(75);
    });

    it('throws if score is out of range', async () => {
      await expect(service.updateScore('founder-001', -1)).rejects.toThrow(
        'Score must be between 0 and 100'
      );
      await expect(service.updateScore('founder-001', 101)).rejects.toThrow(
        'Score must be between 0 and 100'
      );
    });

    it('upgrades badge tier for approved founders when score changes', async () => {
      // updateScore query returns approved founder with new score
      const updatedRow = makeFounderRow({
        application_status: 'approved',
        badge_tier: 'pioneer',
        score: '85',
        referral_count: '0',
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });
      // Badge tier update query
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const founder = await service.updateScore('founder-001', 85);
      // totalScore = 85 + 0*5 = 85 -> architect (was pioneer)
      expect(founder.badgeTier).toBe('architect');
    });
  });

  // ========================================================================
  // Quota / Tenant Integration
  // ========================================================================

  describe('quota management', () => {
    it('returns founder quotas (3x default) for approved founders', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeFounderRow({
            application_status: 'approved',
            quota_worlds: '30',
            quota_assets: '150',
            quota_storage_mb: '3072',
          }),
        ],
      });

      const quotas = await service.getQuotasForUser('user-001');
      expect(quotas.maxWorlds).toBe(30);
      expect(quotas.maxAssets).toBe(150);
      expect(quotas.maxStorageMb).toBe(3072);
    });

    it('returns default quotas for non-founders', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const quotas = await service.getQuotasForUser('user-unknown');
      expect(quotas.maxWorlds).toBe(10);
      expect(quotas.maxAssets).toBe(50);
      expect(quotas.maxStorageMb).toBe(1024);
    });

    it('isFounder returns true for approved founders', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeFounderRow({ application_status: 'approved' })],
      });

      expect(await service.isFounder('user-001')).toBe(true);
    });

    it('isFounder returns false for non-approved founders', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeFounderRow({ application_status: 'pending' })],
      });

      expect(await service.isFounder('user-001')).toBe(false);
    });

    it('getTenantTier returns founder_<tier> for approved founders', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeFounderRow({
            application_status: 'approved',
            badge_tier: 'visionary',
          }),
        ],
      });

      const tier = await service.getTenantTier('user-001');
      expect(tier).toBe('founder_visionary');
    });

    it('getTenantTier returns "standard" for non-founders', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const tier = await service.getTenantTier('user-unknown');
      expect(tier).toBe('standard');
    });
  });

  // ========================================================================
  // Revocation
  // ========================================================================

  describe('revokeFounderStatus', () => {
    it('revokes founder status and resets quotas to defaults', async () => {
      const revokedRow = makeFounderRow({
        application_status: 'revoked',
        badge_tier: null,
        quota_worlds: '10',
        quota_assets: '50',
        quota_storage_mb: '1024',
      });
      mockQuery.mockResolvedValueOnce({ rows: [revokedRow] });

      const founder = await service.revokeFounderStatus('founder-001');
      expect(founder.applicationStatus).toBe('revoked');
      expect(founder.badgeTier).toBeNull();
      expect(founder.quotaWorlds).toBe(10);
    });
  });

  // ========================================================================
  // Statistics
  // ========================================================================

  describe('getStats', () => {
    it('returns aggregated program statistics', async () => {
      // Status counts
      mockQuery.mockResolvedValueOnce({
        rows: [
          { application_status: 'pending', count: '5' },
          { application_status: 'waitlisted', count: '10' },
          { application_status: 'approved', count: '20' },
          { application_status: 'rejected', count: '2' },
        ],
      });
      // Tier counts
      mockQuery.mockResolvedValueOnce({
        rows: [
          { badge_tier: 'pioneer', count: '12' },
          { badge_tier: 'visionary', count: '5' },
          { badge_tier: 'architect', count: '3' },
        ],
      });
      // Referral total
      mockQuery.mockResolvedValueOnce({
        rows: [{ total: '45' }],
      });

      const stats = await service.getStats();

      expect(stats.totalApplications).toBe(37);
      expect(stats.pending).toBe(5);
      expect(stats.waitlisted).toBe(10);
      expect(stats.approved).toBe(20);
      expect(stats.rejected).toBe(2);
      expect(stats.byTier.pioneer).toBe(12);
      expect(stats.byTier.visionary).toBe(5);
      expect(stats.byTier.architect).toBe(3);
      expect(stats.totalReferrals).toBe(45);
    });
  });

  // ========================================================================
  // Portfolio Scoring
  // ========================================================================

  describe('calculatePortfolioScore (private)', () => {
    it('gives bonus points for known platforms', () => {
      const score = (service as any).calculatePortfolioScore(
        'https://github.com/test-user'
      );
      // base 10 + github 15 + https 3 = 28
      expect(score).toBe(28);
    });

    it('gives moderate bonus for personal domains', () => {
      const score = (service as any).calculatePortfolioScore(
        'https://my-portfolio.dev'
      );
      // base 10 + personal 12 + https 3 = 25
      expect(score).toBe(25);
    });

    it('caps auto-score at 50', () => {
      const score = (service as any).calculatePortfolioScore(
        'https://sketchfab.com/test-user'
      );
      // base 10 + sketchfab 22 + https 3 = 35 (under cap)
      expect(score).toBeLessThanOrEqual(50);
    });
  });
});
