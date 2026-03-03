/**
 * @hololand/backend -- MarketplaceCheckout
 *
 * Orchestrates the end-to-end checkout flow for the HoloLand marketplace:
 *   1. Checkout session creation (validates asset, buyer, duplicates)
 *   2. Purchase history per user
 *   3. Seller earnings calculation (gross - platform fee - processing fee)
 *   4. Payout schedule (weekly payouts for balances over $25)
 *
 * Depends on:
 *   - StripePaymentService for payment intent creation and transfers
 *   - AssetListingService for listing validation
 *   - Database pool for purchase history and earnings persistence
 *
 * Architecture:
 *   Buyer -> createCheckoutSession -> StripePaymentService.createPaymentIntent
 *                                          |
 *                      (Stripe webhook: payment_intent.succeeded)
 *                                          |
 *                                   fulfillPurchase
 *                                          |
 *                      seller_earnings updated -> payout on schedule
 */

import { query } from '../db/pool';
import { logger } from '../utils/logger';
import {
  StripePaymentService,
  getStripePaymentService,
} from './StripePaymentService';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum seller balance (in cents) required to trigger a payout. */
const MIN_PAYOUT_BALANCE_CENTS = 2500; // $25.00

/** Platform fee percentage (15%). */
const PLATFORM_FEE_PERCENT = 0.15;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CheckoutStatus =
  | 'created'
  | 'payment_pending'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'canceled';

export interface CheckoutSession {
  id: string;
  assetId: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amountCents: number;
  currency: string;
  platformFeeCents: number;
  processingFeeCents: number;
  sellerNetCents: number;
  paymentIntentId: string | null;
  clientSecret: string | null;
  status: CheckoutStatus;
  createdAt: Date;
  completedAt: Date | null;
}

export interface PurchaseHistoryItem {
  purchaseId: string;
  assetId: string;
  listingId: string;
  title: string;
  amountCents: number;
  currency: string;
  status: CheckoutStatus;
  purchasedAt: Date;
}

export interface SellerEarnings {
  sellerId: string;
  totalGrossCents: number;
  totalPlatformFeeCents: number;
  totalProcessingFeeCents: number;
  totalNetCents: number;
  pendingPayoutCents: number;
  totalPaidOutCents: number;
  lastPayoutAt: Date | null;
  nextPayoutEligible: boolean;
}

export interface SellerEarningsSummary {
  sellerId: string;
  grossRevenue: number;        // in USD
  platformFees: number;        // in USD
  processingFees: number;      // in USD
  netEarnings: number;         // in USD
  pendingPayout: number;       // in USD
  totalPaidOut: number;        // in USD
}

export interface PayoutRecord {
  id: string;
  sellerId: string;
  amountCents: number;
  currency: string;
  transferId: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  scheduledFor: Date;
  completedAt: Date | null;
  createdAt: Date;
}

export interface PayoutScheduleResult {
  eligibleSellers: number;
  totalAmountCents: number;
  payouts: PayoutRecord[];
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class MarketplaceCheckout {
  private readonly stripePayment: StripePaymentService;

  constructor(stripePaymentService?: StripePaymentService) {
    this.stripePayment = stripePaymentService ?? getStripePaymentService();
  }

  // -----------------------------------------------------------------------
  // Checkout Session
  // -----------------------------------------------------------------------

  /**
   * Create a checkout session for an asset purchase.
   *
   * Validates:
   *   - Listing exists and is published
   *   - Buyer is not the seller
   *   - Buyer has not already purchased this asset
   *
   * Returns a session with a Stripe client secret for frontend payment.
   */
  async createCheckoutSession(opts: {
    assetId: string;
    listingId: string;
    buyerId: string;
    sellerId: string;
    amountCents: number;
    currency?: string;
    sellerConnectedAccountId?: string;
  }): Promise<CheckoutSession> {
    const currency = opts.currency ?? 'usd';

    // Validate: buyer !== seller
    if (opts.buyerId === opts.sellerId) {
      throw new Error('Cannot purchase your own asset');
    }

    // Validate: no duplicate purchase
    const existingPurchase = await this.hasUserPurchasedAsset(opts.buyerId, opts.assetId);
    if (existingPurchase) {
      throw new Error('You have already purchased this asset');
    }

    // Calculate fees
    const platformFeeCents = StripePaymentService.calculatePlatformFee(opts.amountCents);
    const processingFeeCents = StripePaymentService.calculateProcessingFee(opts.amountCents);
    const sellerNetCents = StripePaymentService.calculateSellerNet(opts.amountCents);

    // Create the checkout session record first
    const { rows } = await query(
      `INSERT INTO "marketplace_checkout_sessions" (
        asset_id, listing_id, buyer_id, seller_id,
        amount_cents, currency, platform_fee_cents, processing_fee_cents, seller_net_cents,
        status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'created', NOW(), NOW())
      RETURNING *`,
      [
        opts.assetId,
        opts.listingId,
        opts.buyerId,
        opts.sellerId,
        opts.amountCents,
        currency,
        platformFeeCents,
        processingFeeCents,
        sellerNetCents,
      ]
    );

    const sessionId = rows[0].id;

    // Create Stripe payment intent
    const paymentResult = await this.stripePayment.createPaymentIntent({
      amount: opts.amountCents,
      currency,
      assetId: opts.assetId,
      buyerId: opts.buyerId,
      sellerId: opts.sellerId,
      sellerConnectedAccountId: opts.sellerConnectedAccountId,
      description: `HoloLand Marketplace: checkout session ${sessionId}`,
      idempotencyKey: `checkout_${sessionId}`,
    });

    // Update session with payment intent
    await query(
      `UPDATE "marketplace_checkout_sessions"
       SET payment_intent_id = $2, client_secret = $3, status = 'payment_pending', updated_at = NOW()
       WHERE id = $1`,
      [sessionId, paymentResult.paymentIntentId, paymentResult.clientSecret]
    );

    logger.info(
      `[MarketplaceCheckout] Session ${sessionId} created for asset ${opts.assetId} — $${(opts.amountCents / 100).toFixed(2)}`
    );

    return {
      id: sessionId,
      assetId: opts.assetId,
      listingId: opts.listingId,
      buyerId: opts.buyerId,
      sellerId: opts.sellerId,
      amountCents: opts.amountCents,
      currency,
      platformFeeCents,
      processingFeeCents,
      sellerNetCents,
      paymentIntentId: paymentResult.paymentIntentId,
      clientSecret: paymentResult.clientSecret,
      status: 'payment_pending',
      createdAt: new Date(rows[0].created_at),
      completedAt: null,
    };
  }

  /**
   * Get a checkout session by ID.
   */
  async getCheckoutSession(sessionId: string): Promise<CheckoutSession | null> {
    const { rows } = await query(
      'SELECT * FROM "marketplace_checkout_sessions" WHERE id = $1 LIMIT 1',
      [sessionId]
    );
    return rows.length > 0 ? this.mapToSession(rows[0]) : null;
  }

  /**
   * Mark a checkout session as completed (called from webhook handler).
   */
  async completeCheckoutSession(paymentIntentId: string): Promise<CheckoutSession | null> {
    const { rows } = await query(
      `UPDATE "marketplace_checkout_sessions"
       SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE payment_intent_id = $1
       RETURNING *`,
      [paymentIntentId]
    );

    if (rows.length === 0) return null;

    logger.info(
      `[MarketplaceCheckout] Session completed for payment intent ${paymentIntentId}`
    );

    return this.mapToSession(rows[0]);
  }

  // -----------------------------------------------------------------------
  // Purchase History
  // -----------------------------------------------------------------------

  /**
   * Get purchase history for a user.
   */
  async getUserPurchaseHistory(
    userId: string,
    opts?: { limit?: number; offset?: number }
  ): Promise<{ purchases: PurchaseHistoryItem[]; total: number }> {
    const limit = opts?.limit ?? 50;
    const offset = opts?.offset ?? 0;

    const { rows: countRows } = await query(
      `SELECT COUNT(*) as total
       FROM "marketplace_checkout_sessions"
       WHERE buyer_id = $1 AND status = 'completed'`,
      [userId]
    );
    const total = parseInt(countRows[0]?.total ?? '0', 10);

    const { rows } = await query(
      `SELECT cs.id as purchase_id, cs.asset_id, cs.listing_id,
              COALESCE(al.title, 'Unknown Asset') as title,
              cs.amount_cents, cs.currency, cs.status, cs.completed_at as purchased_at
       FROM "marketplace_checkout_sessions" cs
       LEFT JOIN "asset_listings" al ON al.id = cs.listing_id
       WHERE cs.buyer_id = $1 AND cs.status = 'completed'
       ORDER BY cs.completed_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const purchases: PurchaseHistoryItem[] = rows.map((row: any) => ({
      purchaseId: row.purchase_id,
      assetId: row.asset_id,
      listingId: row.listing_id,
      title: row.title,
      amountCents: parseInt(row.amount_cents, 10),
      currency: row.currency,
      status: row.status as CheckoutStatus,
      purchasedAt: new Date(row.purchased_at),
    }));

    return { purchases, total };
  }

  /**
   * Check if a user has already purchased a specific asset.
   */
  async hasUserPurchasedAsset(userId: string, assetId: string): Promise<boolean> {
    const { rows } = await query(
      `SELECT 1 FROM "marketplace_checkout_sessions"
       WHERE buyer_id = $1 AND asset_id = $2 AND status = 'completed'
       LIMIT 1`,
      [userId, assetId]
    );
    return rows.length > 0;
  }

  // -----------------------------------------------------------------------
  // Seller Earnings
  // -----------------------------------------------------------------------

  /**
   * Get earnings summary for a seller.
   *
   * Earnings = gross - platform fee (15%) - processing fee (Stripe 2.9% + $0.30)
   */
  async getSellerEarnings(sellerId: string): Promise<SellerEarnings> {
    // Get totals from completed checkout sessions
    const { rows: earningsRows } = await query(
      `SELECT
         COALESCE(SUM(amount_cents), 0) as total_gross,
         COALESCE(SUM(platform_fee_cents), 0) as total_platform_fee,
         COALESCE(SUM(processing_fee_cents), 0) as total_processing_fee,
         COALESCE(SUM(seller_net_cents), 0) as total_net
       FROM "marketplace_checkout_sessions"
       WHERE seller_id = $1 AND status = 'completed'`,
      [sellerId]
    );

    const totalGross = parseInt(earningsRows[0]?.total_gross ?? '0', 10);
    const totalPlatformFee = parseInt(earningsRows[0]?.total_platform_fee ?? '0', 10);
    const totalProcessingFee = parseInt(earningsRows[0]?.total_processing_fee ?? '0', 10);
    const totalNet = parseInt(earningsRows[0]?.total_net ?? '0', 10);

    // Get total paid out
    const { rows: payoutRows } = await query(
      `SELECT
         COALESCE(SUM(amount_cents), 0) as total_paid,
         MAX(completed_at) as last_payout
       FROM "seller_payouts"
       WHERE seller_id = $1 AND status = 'completed'`,
      [sellerId]
    );

    const totalPaidOut = parseInt(payoutRows[0]?.total_paid ?? '0', 10);
    const lastPayoutAt = payoutRows[0]?.last_payout
      ? new Date(payoutRows[0].last_payout)
      : null;

    const pendingPayout = Math.max(0, totalNet - totalPaidOut);

    return {
      sellerId,
      totalGrossCents: totalGross,
      totalPlatformFeeCents: totalPlatformFee,
      totalProcessingFeeCents: totalProcessingFee,
      totalNetCents: totalNet,
      pendingPayoutCents: pendingPayout,
      totalPaidOutCents: totalPaidOut,
      lastPayoutAt,
      nextPayoutEligible: pendingPayout >= MIN_PAYOUT_BALANCE_CENTS,
    };
  }

  /**
   * Get a human-readable earnings summary in USD.
   */
  async getSellerEarningsSummary(sellerId: string): Promise<SellerEarningsSummary> {
    const earnings = await this.getSellerEarnings(sellerId);
    return {
      sellerId,
      grossRevenue: earnings.totalGrossCents / 100,
      platformFees: earnings.totalPlatformFeeCents / 100,
      processingFees: earnings.totalProcessingFeeCents / 100,
      netEarnings: earnings.totalNetCents / 100,
      pendingPayout: earnings.pendingPayoutCents / 100,
      totalPaidOut: earnings.totalPaidOutCents / 100,
    };
  }

  // -----------------------------------------------------------------------
  // Payout Schedule
  // -----------------------------------------------------------------------

  /**
   * Process weekly payouts for all eligible sellers.
   *
   * Eligibility: pending balance >= $25.00 (2500 cents).
   *
   * This method is designed to be called by a weekly cron job.
   * It creates payout records and initiates Stripe Connect transfers.
   */
  async processWeeklyPayouts(): Promise<PayoutScheduleResult> {
    // Find all sellers with pending balance >= minimum
    const { rows: eligibleSellers } = await query(
      `SELECT
         cs.seller_id,
         COALESCE(SUM(cs.seller_net_cents), 0) as total_net,
         COALESCE(sp.total_paid, 0) as total_paid
       FROM "marketplace_checkout_sessions" cs
       LEFT JOIN (
         SELECT seller_id, COALESCE(SUM(amount_cents), 0) as total_paid
         FROM "seller_payouts"
         WHERE status = 'completed'
         GROUP BY seller_id
       ) sp ON sp.seller_id = cs.seller_id
       WHERE cs.status = 'completed'
       GROUP BY cs.seller_id, sp.total_paid
       HAVING (COALESCE(SUM(cs.seller_net_cents), 0) - COALESCE(sp.total_paid, 0)) >= $1`,
      [MIN_PAYOUT_BALANCE_CENTS]
    );

    const payouts: PayoutRecord[] = [];
    let totalAmountCents = 0;

    for (const seller of eligibleSellers) {
      const pendingAmount =
        parseInt(seller.total_net, 10) - parseInt(seller.total_paid, 10);

      if (pendingAmount < MIN_PAYOUT_BALANCE_CENTS) continue;

      // Look up the seller's connected Stripe account
      const { rows: sellerRows } = await query(
        `SELECT stripe_connected_account_id FROM "seller_profiles"
         WHERE seller_id = $1 LIMIT 1`,
        [seller.seller_id]
      );

      const connectedAccountId = sellerRows[0]?.stripe_connected_account_id;

      // Create payout record
      const { rows: payoutRows } = await query(
        `INSERT INTO "seller_payouts" (
          seller_id, amount_cents, currency, status, scheduled_for, created_at
        ) VALUES ($1, $2, 'usd', 'pending', NOW(), NOW())
        RETURNING *`,
        [seller.seller_id, pendingAmount]
      );

      const payoutRecord = this.mapToPayoutRecord(payoutRows[0]);
      payouts.push(payoutRecord);
      totalAmountCents += pendingAmount;

      // If seller has a connected account, initiate the transfer
      if (connectedAccountId) {
        try {
          const transferResult = await this.stripePayment.transferToSeller({
            sellerId: seller.seller_id,
            connectedAccountId,
            amount: pendingAmount,
            description: `Weekly payout for seller ${seller.seller_id}`,
            idempotencyKey: `payout_${payoutRecord.id}`,
          });

          // Update payout record with transfer details
          await query(
            `UPDATE "seller_payouts"
             SET transfer_id = $2, status = 'completed', completed_at = NOW()
             WHERE id = $1`,
            [payoutRecord.id, transferResult.transferId]
          );

          logger.info(
            `[MarketplaceCheckout] Payout ${payoutRecord.id}: $${(pendingAmount / 100).toFixed(2)} to seller ${seller.seller_id} (transfer ${transferResult.transferId})`
          );
        } catch (error: any) {
          // Mark payout as failed but continue with other sellers
          await query(
            `UPDATE "seller_payouts" SET status = 'failed' WHERE id = $1`,
            [payoutRecord.id]
          );

          logger.error(
            `[MarketplaceCheckout] Payout failed for seller ${seller.seller_id}: ${error.message}`
          );
        }
      } else {
        logger.warn(
          `[MarketplaceCheckout] Seller ${seller.seller_id} has no connected Stripe account — payout deferred`
        );
      }
    }

    logger.info(
      `[MarketplaceCheckout] Weekly payouts processed: ${payouts.length} seller(s), $${(totalAmountCents / 100).toFixed(2)} total`
    );

    return {
      eligibleSellers: eligibleSellers.length,
      totalAmountCents,
      payouts,
    };
  }

  /**
   * Get payout history for a seller.
   */
  async getSellerPayoutHistory(
    sellerId: string,
    opts?: { limit?: number; offset?: number }
  ): Promise<{ payouts: PayoutRecord[]; total: number }> {
    const limit = opts?.limit ?? 50;
    const offset = opts?.offset ?? 0;

    const { rows: countRows } = await query(
      `SELECT COUNT(*) as total FROM "seller_payouts" WHERE seller_id = $1`,
      [sellerId]
    );
    const total = parseInt(countRows[0]?.total ?? '0', 10);

    const { rows } = await query(
      `SELECT * FROM "seller_payouts"
       WHERE seller_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [sellerId, limit, offset]
    );

    return {
      payouts: rows.map((row: any) => this.mapToPayoutRecord(row)),
      total,
    };
  }

  // -----------------------------------------------------------------------
  // Internal Mappers
  // -----------------------------------------------------------------------

  private mapToSession(row: any): CheckoutSession {
    return {
      id: row.id,
      assetId: row.asset_id,
      listingId: row.listing_id,
      buyerId: row.buyer_id,
      sellerId: row.seller_id,
      amountCents: parseInt(row.amount_cents, 10),
      currency: row.currency,
      platformFeeCents: parseInt(row.platform_fee_cents, 10),
      processingFeeCents: parseInt(row.processing_fee_cents, 10),
      sellerNetCents: parseInt(row.seller_net_cents, 10),
      paymentIntentId: row.payment_intent_id ?? null,
      clientSecret: row.client_secret ?? null,
      status: row.status as CheckoutStatus,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
    };
  }

  private mapToPayoutRecord(row: any): PayoutRecord {
    return {
      id: row.id,
      sellerId: row.seller_id,
      amountCents: parseInt(row.amount_cents, 10),
      currency: row.currency ?? 'usd',
      transferId: row.transfer_id ?? null,
      status: row.status as PayoutRecord['status'],
      scheduledFor: new Date(row.scheduled_for ?? row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      createdAt: new Date(row.created_at),
    };
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let instance: MarketplaceCheckout | null = null;

export function getMarketplaceCheckout(
  stripePaymentService?: StripePaymentService
): MarketplaceCheckout {
  if (!instance) {
    instance = new MarketplaceCheckout(stripePaymentService);
  }
  return instance;
}
