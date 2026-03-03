/**
 * @hololand/backend -- StripePaymentService
 *
 * Production Stripe integration for the HoloLand marketplace.
 * Replaces the previous stubbed x402 payment protocol with real
 * Stripe payment intents, Stripe Connect seller payouts, webhook
 * verification, and refund handling.
 *
 * Architecture:
 *   Buyer  --> createPaymentIntent --> Stripe --> webhook --> fulfillment
 *                                                   |
 *                                          transferToSeller (Connect)
 *                                                   |
 *                                          platformFee (15%)
 *
 * Security:
 *   - Webhook signature verification via stripe.webhooks.constructEvent
 *   - Idempotency keys for all write operations
 *   - API keys sourced exclusively from environment variables
 *   - No secrets are ever logged or serialized
 */

import Stripe from 'stripe';
import { query } from '../db/pool';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Platform fee as a decimal (15%). */
const PLATFORM_FEE_PERCENT = 0.15;

/** Stripe processing fee estimate: 2.9% + $0.30 per transaction. */
const STRIPE_PROCESSING_RATE = 0.029;
const STRIPE_PROCESSING_FIXED_CENTS = 30;

/** Supported currencies. */
const DEFAULT_CURRENCY = 'usd';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'canceled';

export type RefundReason =
  | 'duplicate'
  | 'fraudulent'
  | 'requested_by_customer'
  | 'asset_not_as_described'
  | 'technical_issue';

export interface PaymentIntentResult {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  metadata: Record<string, string>;
}

export interface WebhookResult {
  handled: boolean;
  eventType: string;
  paymentIntentId?: string;
  error?: string;
}

export interface RefundResult {
  refundId: string;
  paymentIntentId: string;
  amount: number;
  status: string;
  reason: RefundReason;
}

export interface SellerPayoutResult {
  transferId: string;
  amount: number;
  currency: string;
  sellerId: string;
  connectedAccountId: string;
}

export interface StripePaymentServiceConfig {
  /** Override for testing. Falls back to STRIPE_SECRET_KEY env var. */
  stripeSecretKey?: string;
  /** Override for testing. Falls back to STRIPE_WEBHOOK_SECRET env var. */
  webhookSecret?: string;
  /** Platform fee percentage (0-1). Default: 0.15 (15%) */
  platformFeePercent?: number;
  /** Default currency. Default: 'usd' */
  defaultCurrency?: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class StripePaymentService {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;
  private readonly platformFeePercent: number;
  private readonly defaultCurrency: string;

  constructor(config: StripePaymentServiceConfig = {}) {
    const secretKey = config.stripeSecretKey || process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error(
        'StripePaymentService: STRIPE_SECRET_KEY environment variable is required'
      );
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16' as any,
      typescript: true,
    });

    this.webhookSecret = config.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || '';
    this.platformFeePercent = config.platformFeePercent ?? PLATFORM_FEE_PERCENT;
    this.defaultCurrency = config.defaultCurrency ?? DEFAULT_CURRENCY;
  }

  // -----------------------------------------------------------------------
  // Payment Intent Creation
  // -----------------------------------------------------------------------

  /**
   * Create a payment intent for an asset purchase.
   *
   * The `idempotencyKey` prevents duplicate charges when clients retry.
   * Metadata is attached so that webhook handlers can route fulfillment.
   */
  async createPaymentIntent(opts: {
    amount: number;                // Amount in the smallest currency unit (cents for USD)
    currency?: string;
    assetId: string;
    buyerId: string;
    sellerId: string;
    sellerConnectedAccountId?: string;
    description?: string;
    idempotencyKey?: string;
  }): Promise<PaymentIntentResult> {
    const currency = opts.currency ?? this.defaultCurrency;
    const idempotencyKey =
      opts.idempotencyKey ?? `pi_${opts.assetId}_${opts.buyerId}_${Date.now()}`;

    const metadata: Record<string, string> = {
      asset_id: opts.assetId,
      buyer_id: opts.buyerId,
      seller_id: opts.sellerId,
      platform: 'hololand_marketplace',
    };

    if (opts.sellerConnectedAccountId) {
      metadata.connected_account_id = opts.sellerConnectedAccountId;
    }

    try {
      // Build create params
      const createParams: Stripe.PaymentIntentCreateParams = {
        amount: opts.amount,
        currency,
        metadata,
        description: opts.description ?? `HoloLand Marketplace purchase: ${opts.assetId}`,
        automatic_payment_methods: { enabled: true },
      };

      // If the seller has a connected account, set up application_fee_amount
      // so that Stripe Connect handles the split automatically.
      if (opts.sellerConnectedAccountId) {
        const applicationFee = Math.round(opts.amount * this.platformFeePercent);
        createParams.application_fee_amount = applicationFee;
        createParams.transfer_data = {
          destination: opts.sellerConnectedAccountId,
        };
      }

      const paymentIntent = await this.stripe.paymentIntents.create(
        createParams,
        { idempotencyKey }
      );

      // Persist the payment intent record
      await this.persistPaymentRecord({
        paymentIntentId: paymentIntent.id,
        assetId: opts.assetId,
        buyerId: opts.buyerId,
        sellerId: opts.sellerId,
        amount: opts.amount,
        currency,
        status: 'pending',
      });

      logger.info(
        `[StripePaymentService] Created payment intent ${paymentIntent.id} for asset ${opts.assetId} — $${(opts.amount / 100).toFixed(2)}`
      );

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        amount: opts.amount,
        currency,
        status: 'pending',
        metadata,
      };
    } catch (error: any) {
      logger.error(
        `[StripePaymentService] Failed to create payment intent: ${error.message}`
      );
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // Webhook Handler
  // -----------------------------------------------------------------------

  /**
   * Verify and handle an incoming Stripe webhook event.
   *
   * SECURITY: Always verify the webhook signature before processing.
   */
  async handleWebhook(rawBody: string | Buffer, signature: string): Promise<WebhookResult> {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch (err: any) {
      logger.error(`[StripePaymentService] Webhook signature verification failed: ${err.message}`);
      return { handled: false, eventType: 'unknown', error: 'Invalid signature' };
    }

    logger.info(`[StripePaymentService] Webhook received: ${event.type}`);

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          return await this.handlePaymentIntentSucceeded(
            event.data.object as Stripe.PaymentIntent
          );

        case 'payment_intent.payment_failed':
          return await this.handlePaymentIntentFailed(
            event.data.object as Stripe.PaymentIntent
          );

        case 'charge.refunded':
          return await this.handleChargeRefunded(
            event.data.object as Stripe.Charge
          );

        default:
          logger.debug(`[StripePaymentService] Unhandled event type: ${event.type}`);
          return { handled: false, eventType: event.type };
      }
    } catch (error: any) {
      logger.error(
        `[StripePaymentService] Error processing webhook ${event.type}: ${error.message}`
      );
      return {
        handled: false,
        eventType: event.type,
        error: error.message,
      };
    }
  }

  // -----------------------------------------------------------------------
  // Webhook Event Handlers (private)
  // -----------------------------------------------------------------------

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<WebhookResult> {
    const { metadata, id: paymentIntentId, amount } = paymentIntent;
    const assetId = metadata.asset_id;
    const buyerId = metadata.buyer_id;
    const sellerId = metadata.seller_id;

    if (!assetId || !buyerId || !sellerId) {
      logger.warn(
        `[StripePaymentService] payment_intent.succeeded missing metadata on ${paymentIntentId}`
      );
      return { handled: false, eventType: 'payment_intent.succeeded', paymentIntentId };
    }

    // Update payment record status
    await this.updatePaymentStatus(paymentIntentId, 'succeeded');

    // Record the purchase in marketplace_purchases
    await query(
      `INSERT INTO "marketplace_purchases" (
        payment_intent_id, asset_id, buyer_id, seller_id,
        amount_cents, platform_fee_cents, seller_amount_cents,
        currency, status, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed', NOW())
      ON CONFLICT (payment_intent_id) DO UPDATE SET
        status = 'completed', completed_at = NOW(), updated_at = NOW()`,
      [
        paymentIntentId,
        assetId,
        buyerId,
        sellerId,
        amount,
        Math.round(amount * this.platformFeePercent),
        amount - Math.round(amount * this.platformFeePercent),
        paymentIntent.currency,
      ]
    );

    // Update seller earnings
    await query(
      `INSERT INTO "seller_earnings" (seller_id, total_gross_cents, total_platform_fee_cents, total_net_cents, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (seller_id) DO UPDATE SET
         total_gross_cents = seller_earnings.total_gross_cents + EXCLUDED.total_gross_cents,
         total_platform_fee_cents = seller_earnings.total_platform_fee_cents + EXCLUDED.total_platform_fee_cents,
         total_net_cents = seller_earnings.total_net_cents + EXCLUDED.total_net_cents,
         updated_at = NOW()`,
      [
        sellerId,
        amount,
        Math.round(amount * this.platformFeePercent),
        amount - Math.round(amount * this.platformFeePercent),
      ]
    );

    logger.info(
      `[StripePaymentService] Payment succeeded: ${paymentIntentId} | asset=${assetId} buyer=${buyerId} seller=${sellerId} amount=$${(amount / 100).toFixed(2)}`
    );

    return { handled: true, eventType: 'payment_intent.succeeded', paymentIntentId };
  }

  private async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<WebhookResult> {
    const { id: paymentIntentId, last_payment_error } = paymentIntent;

    await this.updatePaymentStatus(paymentIntentId, 'failed');

    logger.warn(
      `[StripePaymentService] Payment failed: ${paymentIntentId} — ${last_payment_error?.message ?? 'unknown error'}`
    );

    return { handled: true, eventType: 'payment_intent.payment_failed', paymentIntentId };
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<WebhookResult> {
    const paymentIntentId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id;

    if (!paymentIntentId) {
      return { handled: false, eventType: 'charge.refunded' };
    }

    const isFullRefund = charge.refunded;
    const newStatus: PaymentStatus = isFullRefund ? 'refunded' : 'partially_refunded';

    await this.updatePaymentStatus(paymentIntentId, newStatus);

    // Update marketplace_purchases
    await query(
      `UPDATE "marketplace_purchases"
       SET status = $1, refunded_at = NOW(), updated_at = NOW()
       WHERE payment_intent_id = $2`,
      [isFullRefund ? 'refunded' : 'partially_refunded', paymentIntentId]
    );

    // If full refund, reverse seller earnings
    if (isFullRefund) {
      const { rows } = await query(
        `SELECT seller_id, amount_cents, platform_fee_cents
         FROM "marketplace_purchases"
         WHERE payment_intent_id = $1`,
        [paymentIntentId]
      );

      if (rows.length > 0) {
        const purchase = rows[0];
        const sellerAmount = purchase.amount_cents - purchase.platform_fee_cents;

        await query(
          `UPDATE "seller_earnings"
           SET total_gross_cents = GREATEST(0, total_gross_cents - $2),
               total_platform_fee_cents = GREATEST(0, total_platform_fee_cents - $3),
               total_net_cents = GREATEST(0, total_net_cents - $4),
               updated_at = NOW()
           WHERE seller_id = $1`,
          [
            purchase.seller_id,
            purchase.amount_cents,
            purchase.platform_fee_cents,
            sellerAmount,
          ]
        );
      }
    }

    logger.info(
      `[StripePaymentService] Refund processed for ${paymentIntentId}: ${isFullRefund ? 'full' : 'partial'}`
    );

    return { handled: true, eventType: 'charge.refunded', paymentIntentId };
  }

  // -----------------------------------------------------------------------
  // Refund Flow
  // -----------------------------------------------------------------------

  /**
   * Issue a refund for a payment intent.
   *
   * Supports partial refunds (pass `amount` in cents) or full refunds
   * (omit `amount`).
   */
  async createRefund(opts: {
    paymentIntentId: string;
    amount?: number;               // Partial refund amount in cents; omit for full refund
    reason: RefundReason;
    idempotencyKey?: string;
  }): Promise<RefundResult> {
    const idempotencyKey =
      opts.idempotencyKey ?? `ref_${opts.paymentIntentId}_${Date.now()}`;

    const stripeReason = this.mapRefundReason(opts.reason);

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: opts.paymentIntentId,
      reason: stripeReason,
    };

    if (opts.amount !== undefined && opts.amount > 0) {
      refundParams.amount = opts.amount;
    }

    try {
      const refund = await this.stripe.refunds.create(refundParams, {
        idempotencyKey,
      });

      // Record refund
      await query(
        `INSERT INTO "marketplace_refunds" (
          refund_id, payment_intent_id, amount_cents, reason, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          refund.id,
          opts.paymentIntentId,
          refund.amount,
          opts.reason,
          refund.status,
        ]
      );

      logger.info(
        `[StripePaymentService] Refund created: ${refund.id} for ${opts.paymentIntentId} — $${(refund.amount / 100).toFixed(2)} (${opts.reason})`
      );

      return {
        refundId: refund.id,
        paymentIntentId: opts.paymentIntentId,
        amount: refund.amount,
        status: refund.status,
        reason: opts.reason,
      };
    } catch (error: any) {
      logger.error(`[StripePaymentService] Refund failed: ${error.message}`);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // Seller Payout (Stripe Connect)
  // -----------------------------------------------------------------------

  /**
   * Transfer funds to a seller's connected Stripe account.
   *
   * Uses Stripe Connect transfers with the platform fee already deducted.
   * This is used when payment intents are NOT using `transfer_data`
   * (i.e., for manual payouts).
   */
  async transferToSeller(opts: {
    sellerId: string;
    connectedAccountId: string;
    amount: number;                // Amount in cents to transfer
    currency?: string;
    description?: string;
    idempotencyKey?: string;
  }): Promise<SellerPayoutResult> {
    const currency = opts.currency ?? this.defaultCurrency;
    const idempotencyKey =
      opts.idempotencyKey ?? `xfer_${opts.sellerId}_${Date.now()}`;

    try {
      const transfer = await this.stripe.transfers.create(
        {
          amount: opts.amount,
          currency,
          destination: opts.connectedAccountId,
          description:
            opts.description ??
            `HoloLand marketplace payout for seller ${opts.sellerId}`,
          metadata: {
            seller_id: opts.sellerId,
            platform: 'hololand_marketplace',
          },
        },
        { idempotencyKey }
      );

      // Record payout
      await query(
        `INSERT INTO "seller_payouts" (
          transfer_id, seller_id, connected_account_id,
          amount_cents, currency, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, 'completed', NOW())`,
        [
          transfer.id,
          opts.sellerId,
          opts.connectedAccountId,
          opts.amount,
          currency,
        ]
      );

      logger.info(
        `[StripePaymentService] Transfer ${transfer.id} to seller ${opts.sellerId}: $${(opts.amount / 100).toFixed(2)}`
      );

      return {
        transferId: transfer.id,
        amount: opts.amount,
        currency,
        sellerId: opts.sellerId,
        connectedAccountId: opts.connectedAccountId,
      };
    } catch (error: any) {
      logger.error(`[StripePaymentService] Transfer failed: ${error.message}`);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // Query Helpers
  // -----------------------------------------------------------------------

  /**
   * Get the payment record for a specific payment intent.
   */
  async getPaymentByIntentId(paymentIntentId: string) {
    const { rows } = await query(
      'SELECT * FROM "marketplace_payments" WHERE payment_intent_id = $1 LIMIT 1',
      [paymentIntentId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Retrieve the Stripe PaymentIntent object for inspection.
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  // -----------------------------------------------------------------------
  // Fee Calculations (static utilities)
  // -----------------------------------------------------------------------

  /**
   * Calculate the platform fee for a given amount in cents.
   */
  static calculatePlatformFee(
    amountCents: number,
    feePercent: number = PLATFORM_FEE_PERCENT
  ): number {
    return Math.round(amountCents * feePercent);
  }

  /**
   * Calculate the estimated Stripe processing fee for a given amount.
   */
  static calculateProcessingFee(amountCents: number): number {
    return Math.round(amountCents * STRIPE_PROCESSING_RATE) + STRIPE_PROCESSING_FIXED_CENTS;
  }

  /**
   * Calculate what the seller receives after platform + processing fees.
   */
  static calculateSellerNet(
    amountCents: number,
    feePercent: number = PLATFORM_FEE_PERCENT
  ): number {
    const platformFee = StripePaymentService.calculatePlatformFee(amountCents, feePercent);
    const processingFee = StripePaymentService.calculateProcessingFee(amountCents);
    return Math.max(0, amountCents - platformFee - processingFee);
  }

  // -----------------------------------------------------------------------
  // Internal Helpers
  // -----------------------------------------------------------------------

  private async persistPaymentRecord(record: {
    paymentIntentId: string;
    assetId: string;
    buyerId: string;
    sellerId: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
  }): Promise<void> {
    await query(
      `INSERT INTO "marketplace_payments" (
        payment_intent_id, asset_id, buyer_id, seller_id,
        amount_cents, currency, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (payment_intent_id) DO UPDATE SET
        status = EXCLUDED.status, updated_at = NOW()`,
      [
        record.paymentIntentId,
        record.assetId,
        record.buyerId,
        record.sellerId,
        record.amount,
        record.currency,
        record.status,
      ]
    );
  }

  private async updatePaymentStatus(
    paymentIntentId: string,
    status: PaymentStatus
  ): Promise<void> {
    await query(
      `UPDATE "marketplace_payments"
       SET status = $1, updated_at = NOW()
       WHERE payment_intent_id = $2`,
      [status, paymentIntentId]
    );
  }

  private mapRefundReason(
    reason: RefundReason
  ): 'duplicate' | 'fraudulent' | 'requested_by_customer' {
    switch (reason) {
      case 'duplicate':
        return 'duplicate';
      case 'fraudulent':
        return 'fraudulent';
      default:
        return 'requested_by_customer';
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let instance: StripePaymentService | null = null;

export function getStripePaymentService(
  config?: StripePaymentServiceConfig
): StripePaymentService {
  if (!instance) {
    instance = new StripePaymentService(config);
  }
  return instance;
}
