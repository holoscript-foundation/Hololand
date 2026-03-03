/**
 * StripePaymentService Integration Tests
 *
 * Tests payment intent creation, webhook handling, and refund flow.
 * The Stripe SDK and database are fully mocked -- no live API calls.
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

// Mock Stripe SDK
const mockPaymentIntentsCreate = vi.fn();
const mockPaymentIntentsRetrieve = vi.fn();
const mockRefundsCreate = vi.fn();
const mockTransfersCreate = vi.fn();
const mockWebhooksConstructEvent = vi.fn();

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      paymentIntents: {
        create: mockPaymentIntentsCreate,
        retrieve: mockPaymentIntentsRetrieve,
      },
      refunds: {
        create: mockRefundsCreate,
      },
      transfers: {
        create: mockTransfersCreate,
      },
      webhooks: {
        constructEvent: mockWebhooksConstructEvent,
      },
    })),
  };
});

// Import after mocks
import {
  StripePaymentService,
  type PaymentIntentResult,
  type RefundResult,
  type WebhookResult,
} from '../StripePaymentService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createService(overrides: Record<string, unknown> = {}) {
  return new StripePaymentService({
    stripeSecretKey: 'sk_test_fake_key',
    webhookSecret: 'whsec_test_secret',
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StripePaymentService', () => {
  let service: StripePaymentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ========================================================================
  // Constructor
  // ========================================================================

  describe('constructor', () => {
    it('throws if no Stripe secret key is provided', () => {
      // Remove env var and pass no config key
      const original = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;

      expect(() => new StripePaymentService({})).toThrow(
        'STRIPE_SECRET_KEY environment variable is required'
      );

      process.env.STRIPE_SECRET_KEY = original;
    });

    it('uses custom platform fee percentage when provided', () => {
      const svc = createService({ platformFeePercent: 0.2 });
      expect(svc).toBeDefined();
    });
  });

  // ========================================================================
  // Payment Intent Creation
  // ========================================================================

  describe('createPaymentIntent', () => {
    it('creates a payment intent and persists the record', async () => {
      mockPaymentIntentsCreate.mockResolvedValueOnce({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_abc',
        amount: 2000,
        currency: 'usd',
      });
      mockQuery.mockResolvedValueOnce({ rows: [] }); // persistPaymentRecord

      const result = await service.createPaymentIntent({
        amount: 2000,
        assetId: 'asset-001',
        buyerId: 'buyer-001',
        sellerId: 'seller-001',
      });

      expect(result.paymentIntentId).toBe('pi_test_123');
      expect(result.clientSecret).toBe('pi_test_123_secret_abc');
      expect(result.amount).toBe(2000);
      expect(result.currency).toBe('usd');
      expect(result.status).toBe('pending');
      expect(result.metadata.asset_id).toBe('asset-001');
      expect(result.metadata.platform).toBe('hololand_marketplace');
    });

    it('sets application_fee_amount and transfer_data for Connect sellers', async () => {
      mockPaymentIntentsCreate.mockResolvedValueOnce({
        id: 'pi_test_connect',
        client_secret: 'pi_test_connect_secret',
        amount: 5000,
        currency: 'usd',
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await service.createPaymentIntent({
        amount: 5000,
        assetId: 'asset-002',
        buyerId: 'buyer-002',
        sellerId: 'seller-002',
        sellerConnectedAccountId: 'acct_seller_002',
      });

      const createCall = mockPaymentIntentsCreate.mock.calls[0];
      const params = createCall[0];
      expect(params.application_fee_amount).toBe(750); // 15% of 5000
      expect(params.transfer_data.destination).toBe('acct_seller_002');
    });

    it('uses the provided idempotency key', async () => {
      mockPaymentIntentsCreate.mockResolvedValueOnce({
        id: 'pi_test_idem',
        client_secret: 'secret',
        amount: 1000,
        currency: 'usd',
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await service.createPaymentIntent({
        amount: 1000,
        assetId: 'asset-003',
        buyerId: 'buyer-003',
        sellerId: 'seller-003',
        idempotencyKey: 'custom_idem_key_001',
      });

      const createOptions = mockPaymentIntentsCreate.mock.calls[0][1];
      expect(createOptions.idempotencyKey).toBe('custom_idem_key_001');
    });

    it('propagates Stripe errors', async () => {
      mockPaymentIntentsCreate.mockRejectedValueOnce(
        new Error('Your card was declined')
      );

      await expect(
        service.createPaymentIntent({
          amount: 1000,
          assetId: 'asset-err',
          buyerId: 'buyer-err',
          sellerId: 'seller-err',
        })
      ).rejects.toThrow('Your card was declined');
    });
  });

  // ========================================================================
  // Webhook Handling
  // ========================================================================

  describe('handleWebhook', () => {
    it('returns error result when signature verification fails', async () => {
      mockWebhooksConstructEvent.mockImplementationOnce(() => {
        throw new Error('Signature mismatch');
      });

      const result = await service.handleWebhook('body', 'bad_sig');
      expect(result.handled).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });

    it('handles payment_intent.succeeded event', async () => {
      const fakeEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_success_001',
            amount: 3000,
            currency: 'usd',
            metadata: {
              asset_id: 'asset-001',
              buyer_id: 'buyer-001',
              seller_id: 'seller-001',
            },
          },
        },
      };
      mockWebhooksConstructEvent.mockReturnValueOnce(fakeEvent);
      // updatePaymentStatus
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // INSERT into marketplace_purchases
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // UPDATE seller_earnings
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.handleWebhook('body', 'valid_sig');
      expect(result.handled).toBe(true);
      expect(result.eventType).toBe('payment_intent.succeeded');
      expect(result.paymentIntentId).toBe('pi_success_001');
    });

    it('handles payment_intent.payment_failed event', async () => {
      const fakeEvent = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_fail_001',
            last_payment_error: { message: 'Insufficient funds' },
          },
        },
      };
      mockWebhooksConstructEvent.mockReturnValueOnce(fakeEvent);
      mockQuery.mockResolvedValueOnce({ rows: [] }); // updatePaymentStatus

      const result = await service.handleWebhook('body', 'valid_sig');
      expect(result.handled).toBe(true);
      expect(result.eventType).toBe('payment_intent.payment_failed');
      expect(result.paymentIntentId).toBe('pi_fail_001');
    });

    it('handles charge.refunded event (full refund)', async () => {
      const fakeEvent = {
        type: 'charge.refunded',
        data: {
          object: {
            payment_intent: 'pi_refund_001',
            refunded: true,
          },
        },
      };
      mockWebhooksConstructEvent.mockReturnValueOnce(fakeEvent);
      // updatePaymentStatus
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // UPDATE marketplace_purchases
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // SELECT purchase for earnings reversal
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            seller_id: 'seller-001',
            amount_cents: 3000,
            platform_fee_cents: 450,
          },
        ],
      });
      // UPDATE seller_earnings (reversal)
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.handleWebhook('body', 'valid_sig');
      expect(result.handled).toBe(true);
      expect(result.eventType).toBe('charge.refunded');
    });

    it('handles charge.refunded event (partial refund)', async () => {
      const fakeEvent = {
        type: 'charge.refunded',
        data: {
          object: {
            payment_intent: 'pi_partial_001',
            refunded: false, // partial
          },
        },
      };
      mockWebhooksConstructEvent.mockReturnValueOnce(fakeEvent);
      mockQuery.mockResolvedValueOnce({ rows: [] }); // updatePaymentStatus
      mockQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE marketplace_purchases

      const result = await service.handleWebhook('body', 'valid_sig');
      expect(result.handled).toBe(true);
      expect(result.eventType).toBe('charge.refunded');
    });

    it('returns unhandled for unknown event types', async () => {
      const fakeEvent = {
        type: 'customer.created',
        data: { object: {} },
      };
      mockWebhooksConstructEvent.mockReturnValueOnce(fakeEvent);

      const result = await service.handleWebhook('body', 'valid_sig');
      expect(result.handled).toBe(false);
      expect(result.eventType).toBe('customer.created');
    });

    it('returns not handled when succeeded event has missing metadata', async () => {
      const fakeEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_no_meta',
            amount: 1000,
            currency: 'usd',
            metadata: {},
          },
        },
      };
      mockWebhooksConstructEvent.mockReturnValueOnce(fakeEvent);

      const result = await service.handleWebhook('body', 'valid_sig');
      expect(result.handled).toBe(false);
    });
  });

  // ========================================================================
  // Refund Flow
  // ========================================================================

  describe('createRefund', () => {
    it('creates a full refund', async () => {
      mockRefundsCreate.mockResolvedValueOnce({
        id: 're_full_001',
        amount: 2000,
        status: 'succeeded',
      });
      mockQuery.mockResolvedValueOnce({ rows: [] }); // INSERT refund record

      const result = await service.createRefund({
        paymentIntentId: 'pi_test_123',
        reason: 'requested_by_customer',
      });

      expect(result.refundId).toBe('re_full_001');
      expect(result.amount).toBe(2000);
      expect(result.reason).toBe('requested_by_customer');
    });

    it('creates a partial refund with specified amount', async () => {
      mockRefundsCreate.mockResolvedValueOnce({
        id: 're_partial_001',
        amount: 500,
        status: 'succeeded',
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.createRefund({
        paymentIntentId: 'pi_test_456',
        amount: 500,
        reason: 'asset_not_as_described',
      });

      expect(result.refundId).toBe('re_partial_001');
      expect(result.amount).toBe(500);
    });

    it('maps refund reasons to Stripe-supported values', async () => {
      // 'duplicate' -> 'duplicate'
      mockRefundsCreate.mockResolvedValueOnce({
        id: 're_dup',
        amount: 100,
        status: 'succeeded',
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await service.createRefund({
        paymentIntentId: 'pi_dup',
        reason: 'duplicate',
      });

      const refundParams = mockRefundsCreate.mock.calls[0][0];
      expect(refundParams.reason).toBe('duplicate');
    });

    it('uses custom idempotency key when provided', async () => {
      mockRefundsCreate.mockResolvedValueOnce({
        id: 're_idem',
        amount: 1000,
        status: 'succeeded',
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await service.createRefund({
        paymentIntentId: 'pi_idem',
        reason: 'fraudulent',
        idempotencyKey: 'custom_refund_key',
      });

      const createOptions = mockRefundsCreate.mock.calls[0][1];
      expect(createOptions.idempotencyKey).toBe('custom_refund_key');
    });

    it('propagates Stripe refund errors', async () => {
      mockRefundsCreate.mockRejectedValueOnce(
        new Error('Charge already fully refunded')
      );

      await expect(
        service.createRefund({
          paymentIntentId: 'pi_already_refunded',
          reason: 'duplicate',
        })
      ).rejects.toThrow('Charge already fully refunded');
    });
  });

  // ========================================================================
  // Seller Transfer (Stripe Connect)
  // ========================================================================

  describe('transferToSeller', () => {
    it('creates a transfer to a connected account', async () => {
      mockTransfersCreate.mockResolvedValueOnce({
        id: 'tr_test_001',
        amount: 1700,
        currency: 'usd',
      });
      mockQuery.mockResolvedValueOnce({ rows: [] }); // INSERT payout record

      const result = await service.transferToSeller({
        sellerId: 'seller-001',
        connectedAccountId: 'acct_seller_001',
        amount: 1700,
      });

      expect(result.transferId).toBe('tr_test_001');
      expect(result.amount).toBe(1700);
      expect(result.sellerId).toBe('seller-001');
      expect(result.connectedAccountId).toBe('acct_seller_001');
    });

    it('propagates transfer errors', async () => {
      mockTransfersCreate.mockRejectedValueOnce(
        new Error('Insufficient platform balance')
      );

      await expect(
        service.transferToSeller({
          sellerId: 'seller-err',
          connectedAccountId: 'acct_err',
          amount: 99999,
        })
      ).rejects.toThrow('Insufficient platform balance');
    });
  });

  // ========================================================================
  // Fee Calculations (Static)
  // ========================================================================

  describe('static fee calculations', () => {
    it('calculates 15% platform fee', () => {
      expect(StripePaymentService.calculatePlatformFee(10000)).toBe(1500);
      expect(StripePaymentService.calculatePlatformFee(100)).toBe(15);
    });

    it('calculates Stripe processing fee (2.9% + $0.30)', () => {
      // For $100.00 (10000 cents): 10000 * 0.029 = 290 + 30 = 320
      expect(StripePaymentService.calculateProcessingFee(10000)).toBe(320);
    });

    it('calculates seller net after all fees', () => {
      // $100 = 10000 cents
      // Platform fee: 1500
      // Processing fee: 320
      // Seller net: 10000 - 1500 - 320 = 8180
      expect(StripePaymentService.calculateSellerNet(10000)).toBe(8180);
    });

    it('seller net never goes negative', () => {
      expect(StripePaymentService.calculateSellerNet(10)).toBeGreaterThanOrEqual(0);
    });

    it('supports custom fee percentage', () => {
      expect(StripePaymentService.calculatePlatformFee(10000, 0.20)).toBe(2000);
    });
  });

  // ========================================================================
  // Query Helpers
  // ========================================================================

  describe('getPaymentByIntentId', () => {
    it('returns the payment record if found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ payment_intent_id: 'pi_found', status: 'succeeded' }],
      });

      const result = await service.getPaymentByIntentId('pi_found');
      expect(result).toBeDefined();
      expect(result.payment_intent_id).toBe('pi_found');
    });

    it('returns null if not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.getPaymentByIntentId('pi_missing');
      expect(result).toBeNull();
    });
  });

  describe('retrievePaymentIntent', () => {
    it('delegates to Stripe SDK', async () => {
      const fakePi = { id: 'pi_retrieve', status: 'succeeded' };
      mockPaymentIntentsRetrieve.mockResolvedValueOnce(fakePi);

      const result = await service.retrievePaymentIntent('pi_retrieve');
      expect(result.id).toBe('pi_retrieve');
    });
  });
});
