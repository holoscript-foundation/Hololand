/**
 * @hololand/backend -- AssetListingService
 *
 * Enhanced asset listing management for the HoloLand marketplace.
 * Adds review/approval queue, DMCA takedown flow, pricing tiers,
 * and featured listing support with boost pricing on top of the
 * existing MarketplaceService foundation.
 *
 * Responsibilities:
 *   - Moderation queue: pending -> approved | rejected
 *   - DMCA takedown flow: takedown request -> review -> remove with reason
 *   - Pricing tiers: free / starter ($1-$10) / premium ($10-$50) / enterprise ($50+)
 *   - Featured listing boost with configurable pricing
 *
 * All database operations use the shared connection pool from `../db/pool`.
 */

import { query } from '../db/pool';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Pricing tier boundaries in USD. */
export const PRICING_TIER_BOUNDARIES = {
  free: { min: 0, max: 0 },
  starter: { min: 1, max: 10 },
  premium: { min: 10.01, max: 50 },
  enterprise: { min: 50.01, max: Infinity },
} as const;

/** Cost to feature/boost a listing, in cents. */
const DEFAULT_BOOST_PRICE_CENTS = 999; // $9.99

/** Duration of a featured boost in days. */
const DEFAULT_BOOST_DURATION_DAYS = 7;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ListingStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'suspended'
  | 'taken_down';

export type PricingTier = 'free' | 'starter' | 'premium' | 'enterprise';

export type TakedownStatus = 'pending' | 'reviewing' | 'upheld' | 'dismissed';

export interface AssetListing {
  id: string;
  assetId: string;
  sellerId: string;
  title: string;
  description: string;
  priceCents: number;
  pricingTier: PricingTier;
  status: ListingStatus;
  featured: boolean;
  featuredUntil: Date | null;
  boostPriceCents: number;
  reviewNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModerationQueueItem {
  listingId: string;
  assetId: string;
  sellerId: string;
  title: string;
  description: string;
  priceCents: number;
  pricingTier: PricingTier;
  status: ListingStatus;
  submittedAt: Date;
}

export interface ModerationDecision {
  listingId: string;
  moderatorId: string;
  decision: 'approved' | 'rejected';
  reason: string;
}

export interface TakedownRequest {
  id: string;
  listingId: string;
  assetId: string;
  requesterId: string;
  requesterEmail: string;
  reason: string;
  evidenceUrls: string[];
  status: TakedownStatus;
  reviewedBy: string | null;
  reviewNotes: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
}

export interface FeaturedBoost {
  listingId: string;
  durationDays: number;
  priceCents: number;
  startedAt: Date;
  expiresAt: Date;
}

export interface AssetListingServiceConfig {
  /** Price to boost/feature a listing in cents. Default: 999 ($9.99) */
  boostPriceCents?: number;
  /** Duration of a featured boost in days. Default: 7 */
  boostDurationDays?: number;
  /** Auto-publish after approval. Default: true */
  autoPublishOnApproval?: boolean;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class AssetListingService {
  private readonly boostPriceCents: number;
  private readonly boostDurationDays: number;
  private readonly autoPublishOnApproval: boolean;

  constructor(config: AssetListingServiceConfig = {}) {
    this.boostPriceCents = config.boostPriceCents ?? DEFAULT_BOOST_PRICE_CENTS;
    this.boostDurationDays = config.boostDurationDays ?? DEFAULT_BOOST_DURATION_DAYS;
    this.autoPublishOnApproval = config.autoPublishOnApproval ?? true;
  }

  // -----------------------------------------------------------------------
  // Pricing Tier Resolution
  // -----------------------------------------------------------------------

  /**
   * Determine the pricing tier for a given price in cents.
   */
  static resolvePricingTier(priceCents: number): PricingTier {
    const priceUsd = priceCents / 100;
    if (priceUsd <= 0) return 'free';
    if (priceUsd <= PRICING_TIER_BOUNDARIES.starter.max) return 'starter';
    if (priceUsd <= PRICING_TIER_BOUNDARIES.premium.max) return 'premium';
    return 'enterprise';
  }

  /**
   * Validate that a price falls within the allowed range for its tier.
   */
  static validatePriceForTier(priceCents: number, tier: PricingTier): boolean {
    const priceUsd = priceCents / 100;
    const bounds = PRICING_TIER_BOUNDARIES[tier];
    return priceUsd >= bounds.min && priceUsd <= bounds.max;
  }

  // -----------------------------------------------------------------------
  // Listing CRUD
  // -----------------------------------------------------------------------

  /**
   * Create a new listing in draft status.
   */
  async createListing(opts: {
    assetId: string;
    sellerId: string;
    title: string;
    description: string;
    priceCents: number;
  }): Promise<AssetListing> {
    const pricingTier = AssetListingService.resolvePricingTier(opts.priceCents);

    const { rows } = await query(
      `INSERT INTO "asset_listings" (
        asset_id, seller_id, title, description,
        price_cents, pricing_tier, status, featured,
        boost_price_cents, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'draft', false, $7, NOW(), NOW())
      RETURNING *`,
      [
        opts.assetId,
        opts.sellerId,
        opts.title,
        opts.description,
        opts.priceCents,
        pricingTier,
        this.boostPriceCents,
      ]
    );

    logger.info(
      `[AssetListingService] Created listing for asset ${opts.assetId} at $${(opts.priceCents / 100).toFixed(2)} (${pricingTier})`
    );

    return this.mapToListing(rows[0]);
  }

  /**
   * Get a single listing by ID.
   */
  async getListing(listingId: string): Promise<AssetListing | null> {
    const { rows } = await query(
      'SELECT * FROM "asset_listings" WHERE id = $1 LIMIT 1',
      [listingId]
    );
    return rows.length > 0 ? this.mapToListing(rows[0]) : null;
  }

  /**
   * Get a listing by asset ID.
   */
  async getListingByAssetId(assetId: string): Promise<AssetListing | null> {
    const { rows } = await query(
      'SELECT * FROM "asset_listings" WHERE asset_id = $1 LIMIT 1',
      [assetId]
    );
    return rows.length > 0 ? this.mapToListing(rows[0]) : null;
  }

  /**
   * Update listing fields (only allowed in draft or rejected status).
   */
  async updateListing(
    listingId: string,
    updates: {
      title?: string;
      description?: string;
      priceCents?: number;
    }
  ): Promise<AssetListing> {
    const listing = await this.getListing(listingId);
    if (!listing) throw new Error(`Listing ${listingId} not found`);
    if (listing.status !== 'draft' && listing.status !== 'rejected') {
      throw new Error(`Cannot update listing in ${listing.status} status`);
    }

    const newPrice = updates.priceCents ?? listing.priceCents;
    const newTier = AssetListingService.resolvePricingTier(newPrice);

    const { rows } = await query(
      `UPDATE "asset_listings"
       SET title = COALESCE($2, title),
           description = COALESCE($3, description),
           price_cents = $4,
           pricing_tier = $5,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        listingId,
        updates.title ?? null,
        updates.description ?? null,
        newPrice,
        newTier,
      ]
    );

    return this.mapToListing(rows[0]);
  }

  // -----------------------------------------------------------------------
  // Review / Approval Queue
  // -----------------------------------------------------------------------

  /**
   * Submit a draft listing for moderation review.
   */
  async submitForReview(listingId: string): Promise<AssetListing> {
    const listing = await this.getListing(listingId);
    if (!listing) throw new Error(`Listing ${listingId} not found`);
    if (listing.status !== 'draft' && listing.status !== 'rejected') {
      throw new Error(`Cannot submit listing in ${listing.status} status for review`);
    }

    const { rows } = await query(
      `UPDATE "asset_listings"
       SET status = 'pending_review', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [listingId]
    );

    logger.info(`[AssetListingService] Listing ${listingId} submitted for review`);
    return this.mapToListing(rows[0]);
  }

  /**
   * Get all listings in the moderation queue (pending_review status).
   */
  async getModerationQueue(opts?: {
    limit?: number;
    offset?: number;
  }): Promise<{ items: ModerationQueueItem[]; total: number }> {
    const limit = opts?.limit ?? 50;
    const offset = opts?.offset ?? 0;

    const { rows: countRows } = await query(
      `SELECT COUNT(*) as total FROM "asset_listings" WHERE status = 'pending_review'`
    );
    const total = parseInt(countRows[0]?.total ?? '0', 10);

    const { rows } = await query(
      `SELECT id, asset_id, seller_id, title, description, price_cents, pricing_tier, status, created_at
       FROM "asset_listings"
       WHERE status = 'pending_review'
       ORDER BY created_at ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const items: ModerationQueueItem[] = rows.map((row: any) => ({
      listingId: row.id,
      assetId: row.asset_id,
      sellerId: row.seller_id,
      title: row.title,
      description: row.description,
      priceCents: parseInt(row.price_cents, 10),
      pricingTier: row.pricing_tier as PricingTier,
      status: row.status as ListingStatus,
      submittedAt: new Date(row.created_at),
    }));

    return { items, total };
  }

  /**
   * Approve or reject a listing under moderation.
   */
  async moderateListing(decision: ModerationDecision): Promise<AssetListing> {
    const listing = await this.getListing(decision.listingId);
    if (!listing) throw new Error(`Listing ${decision.listingId} not found`);
    if (listing.status !== 'pending_review') {
      throw new Error(`Listing is not pending review (current status: ${listing.status})`);
    }

    let newStatus: ListingStatus;
    if (decision.decision === 'approved') {
      newStatus = this.autoPublishOnApproval ? 'published' : 'approved';
    } else {
      newStatus = 'rejected';
    }

    const { rows } = await query(
      `UPDATE "asset_listings"
       SET status = $2,
           review_notes = $3,
           reviewed_by = $4,
           reviewed_at = NOW(),
           published_at = CASE WHEN $2 = 'published' THEN NOW() ELSE published_at END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [decision.listingId, newStatus, decision.reason, decision.moderatorId]
    );

    // Record moderation decision
    await query(
      `INSERT INTO "listing_moderation_log" (
        listing_id, moderator_id, decision, reason, created_at
      ) VALUES ($1, $2, $3, $4, NOW())`,
      [decision.listingId, decision.moderatorId, decision.decision, decision.reason]
    );

    logger.info(
      `[AssetListingService] Listing ${decision.listingId} ${decision.decision} by ${decision.moderatorId}: ${decision.reason}`
    );

    return this.mapToListing(rows[0]);
  }

  // -----------------------------------------------------------------------
  // DMCA Takedown Flow
  // -----------------------------------------------------------------------

  /**
   * Submit a DMCA takedown request for a listing.
   *
   * Flow: takedown request -> review -> remove with reason (or dismiss)
   */
  async submitTakedownRequest(opts: {
    listingId: string;
    assetId: string;
    requesterId: string;
    requesterEmail: string;
    reason: string;
    evidenceUrls?: string[];
  }): Promise<TakedownRequest> {
    const { rows } = await query(
      `INSERT INTO "dmca_takedown_requests" (
        listing_id, asset_id, requester_id, requester_email,
        reason, evidence_urls, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
      RETURNING *`,
      [
        opts.listingId,
        opts.assetId,
        opts.requesterId,
        opts.requesterEmail,
        opts.reason,
        JSON.stringify(opts.evidenceUrls ?? []),
      ]
    );

    logger.info(
      `[AssetListingService] DMCA takedown request submitted for listing ${opts.listingId} by ${opts.requesterId}`
    );

    return this.mapToTakedown(rows[0]);
  }

  /**
   * Get pending DMCA takedown requests.
   */
  async getPendingTakedowns(opts?: {
    limit?: number;
    offset?: number;
  }): Promise<{ requests: TakedownRequest[]; total: number }> {
    const limit = opts?.limit ?? 50;
    const offset = opts?.offset ?? 0;

    const { rows: countRows } = await query(
      `SELECT COUNT(*) as total FROM "dmca_takedown_requests" WHERE status IN ('pending', 'reviewing')`
    );
    const total = parseInt(countRows[0]?.total ?? '0', 10);

    const { rows } = await query(
      `SELECT * FROM "dmca_takedown_requests"
       WHERE status IN ('pending', 'reviewing')
       ORDER BY created_at ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return {
      requests: rows.map((row: any) => this.mapToTakedown(row)),
      total,
    };
  }

  /**
   * Review and resolve a DMCA takedown request.
   *
   * If upheld, the listing is taken down with the provided reason.
   * If dismissed, the request is closed and the listing remains active.
   */
  async resolveTakedown(opts: {
    takedownId: string;
    reviewerId: string;
    decision: 'upheld' | 'dismissed';
    reviewNotes: string;
  }): Promise<TakedownRequest> {
    // Update the takedown request
    const { rows } = await query(
      `UPDATE "dmca_takedown_requests"
       SET status = $2,
           reviewed_by = $3,
           review_notes = $4,
           resolved_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [opts.takedownId, opts.decision, opts.reviewerId, opts.reviewNotes]
    );

    if (rows.length === 0) {
      throw new Error(`Takedown request ${opts.takedownId} not found`);
    }

    const takedown = this.mapToTakedown(rows[0]);

    // If upheld, take down the listing
    if (opts.decision === 'upheld') {
      await query(
        `UPDATE "asset_listings"
         SET status = 'taken_down',
             review_notes = $2,
             updated_at = NOW()
         WHERE id = $1`,
        [takedown.listingId, `DMCA takedown: ${opts.reviewNotes}`]
      );

      logger.info(
        `[AssetListingService] DMCA takedown upheld for listing ${takedown.listingId}: ${opts.reviewNotes}`
      );
    } else {
      logger.info(
        `[AssetListingService] DMCA takedown dismissed for listing ${takedown.listingId}: ${opts.reviewNotes}`
      );
    }

    return takedown;
  }

  // -----------------------------------------------------------------------
  // Featured Listings & Boost
  // -----------------------------------------------------------------------

  /**
   * Get the current boost price in cents.
   */
  getBoostPrice(): number {
    return this.boostPriceCents;
  }

  /**
   * Apply a featured boost to a listing.
   *
   * Requires the listing to be in 'published' status.
   * Returns the boost details including expiration.
   */
  async applyFeaturedBoost(
    listingId: string,
    opts?: { durationDays?: number; priceCents?: number }
  ): Promise<FeaturedBoost> {
    const listing = await this.getListing(listingId);
    if (!listing) throw new Error(`Listing ${listingId} not found`);
    if (listing.status !== 'published') {
      throw new Error('Can only boost published listings');
    }

    const durationDays = opts?.durationDays ?? this.boostDurationDays;
    const priceCents = opts?.priceCents ?? this.boostPriceCents;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    await query(
      `UPDATE "asset_listings"
       SET featured = true,
           featured_until = $2,
           boost_price_cents = $3,
           updated_at = NOW()
       WHERE id = $1`,
      [listingId, expiresAt.toISOString(), priceCents]
    );

    // Record boost purchase
    await query(
      `INSERT INTO "listing_boosts" (
        listing_id, duration_days, price_cents, started_at, expires_at
      ) VALUES ($1, $2, $3, NOW(), $4)`,
      [listingId, durationDays, priceCents, expiresAt.toISOString()]
    );

    logger.info(
      `[AssetListingService] Featured boost applied to listing ${listingId} for ${durationDays} days ($${(priceCents / 100).toFixed(2)})`
    );

    return {
      listingId,
      durationDays,
      priceCents,
      startedAt: now,
      expiresAt,
    };
  }

  /**
   * Remove expired featured boosts.
   * Should be called periodically (e.g., via cron job).
   */
  async expireFeaturedBoosts(): Promise<number> {
    const { rowCount } = await query(
      `UPDATE "asset_listings"
       SET featured = false, featured_until = NULL, updated_at = NOW()
       WHERE featured = true AND featured_until < NOW()`
    );

    if (rowCount > 0) {
      logger.info(
        `[AssetListingService] Expired ${rowCount} featured boost(s)`
      );
    }

    return rowCount;
  }

  /**
   * Get all currently featured listings.
   */
  async getFeaturedListings(limit = 20): Promise<AssetListing[]> {
    const { rows } = await query(
      `SELECT * FROM "asset_listings"
       WHERE featured = true AND status = 'published'
       AND (featured_until IS NULL OR featured_until > NOW())
       ORDER BY updated_at DESC
       LIMIT $1`,
      [limit]
    );

    return rows.map((row: any) => this.mapToListing(row));
  }

  // -----------------------------------------------------------------------
  // Listing Queries
  // -----------------------------------------------------------------------

  /**
   * Get listings by pricing tier.
   */
  async getListingsByTier(
    tier: PricingTier,
    opts?: { limit?: number; offset?: number }
  ): Promise<{ listings: AssetListing[]; total: number }> {
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;

    const { rows: countRows } = await query(
      `SELECT COUNT(*) as total FROM "asset_listings" WHERE pricing_tier = $1 AND status = 'published'`,
      [tier]
    );
    const total = parseInt(countRows[0]?.total ?? '0', 10);

    const { rows } = await query(
      `SELECT * FROM "asset_listings"
       WHERE pricing_tier = $1 AND status = 'published'
       ORDER BY featured DESC, updated_at DESC
       LIMIT $2 OFFSET $3`,
      [tier, limit, offset]
    );

    return {
      listings: rows.map((row: any) => this.mapToListing(row)),
      total,
    };
  }

  /**
   * Get all listings by a seller.
   */
  async getSellerListings(
    sellerId: string,
    opts?: { status?: ListingStatus; limit?: number; offset?: number }
  ): Promise<AssetListing[]> {
    const limit = opts?.limit ?? 50;
    const offset = opts?.offset ?? 0;

    let sql = 'SELECT * FROM "asset_listings" WHERE seller_id = $1';
    const params: any[] = [sellerId];
    let paramCount = 1;

    if (opts?.status) {
      paramCount++;
      sql += ` AND status = $${paramCount}`;
      params.push(opts.status);
    }

    sql += ' ORDER BY created_at DESC';

    paramCount++;
    sql += ` LIMIT $${paramCount}`;
    params.push(limit);

    paramCount++;
    sql += ` OFFSET $${paramCount}`;
    params.push(offset);

    const { rows } = await query(sql, params);
    return rows.map((row: any) => this.mapToListing(row));
  }

  // -----------------------------------------------------------------------
  // Internal Mappers
  // -----------------------------------------------------------------------

  private mapToListing(row: any): AssetListing {
    return {
      id: row.id,
      assetId: row.asset_id,
      sellerId: row.seller_id,
      title: row.title,
      description: row.description,
      priceCents: parseInt(row.price_cents, 10),
      pricingTier: row.pricing_tier as PricingTier,
      status: row.status as ListingStatus,
      featured: row.featured ?? false,
      featuredUntil: row.featured_until ? new Date(row.featured_until) : null,
      boostPriceCents: parseInt(row.boost_price_cents ?? '0', 10),
      reviewNotes: row.review_notes ?? null,
      reviewedBy: row.reviewed_by ?? null,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
      publishedAt: row.published_at ? new Date(row.published_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapToTakedown(row: any): TakedownRequest {
    let evidenceUrls: string[] = [];
    try {
      evidenceUrls =
        typeof row.evidence_urls === 'string'
          ? JSON.parse(row.evidence_urls)
          : row.evidence_urls ?? [];
    } catch {
      evidenceUrls = [];
    }

    return {
      id: row.id,
      listingId: row.listing_id,
      assetId: row.asset_id,
      requesterId: row.requester_id,
      requesterEmail: row.requester_email,
      reason: row.reason,
      evidenceUrls,
      status: row.status as TakedownStatus,
      reviewedBy: row.reviewed_by ?? null,
      reviewNotes: row.review_notes ?? null,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
      createdAt: new Date(row.created_at),
    };
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let instance: AssetListingService | null = null;

export function getAssetListingService(
  config?: AssetListingServiceConfig
): AssetListingService {
  if (!instance) {
    instance = new AssetListingService(config);
  }
  return instance;
}
