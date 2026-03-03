/**
 * MarketplaceCheckout Integration Tests
 *
 * Tests checkout session creation, purchase history, fee calculations,
 * and payout eligibility for the HoloLand marketplace.
 *
 * The StripePaymentService and database are fully mocked.
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

// Mock StripePaymentService
const mockCreatePaymentIntent = vi.fn();
const mockTransferToSeller = vi.fn();

vi.mock('../StripePaymentService', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    // Keep static methods from the real class
    StripePaymentService: actual.StripePaymentService,
    getStripePaymentService: () => ({
      createPaymentIntent: mockCreatePaymentIntent,
      transferToSeller: mockTransferToSeller,
    }),
  };
});

// Import after mocks
import {
  MarketplaceCheckout,
  type CheckoutSession,
} from '../MarketplaceCheckout';
import { StripePaymentService } from '../StripePaymentService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createCheckout() {
  return new MarketplaceCheckout({
    createPaymentIntent: mockCreatePaymentIntent,
    transferToSeller: mockTransferToSeller,
  } as any);
}

function makeCheckoutSessionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-001',
    asset_id: 'asset-001',
    listing_id: 'listing-001',
    buyer_id: 'buyer-001',
    seller_id: 'seller-001',
    amount_cents: '2000',
    currency: 'usd',
    platform_fee_cents: '300',
    processing_fee_cents: '88',
    seller_net_cents: '1612',
    payment_intent_id: 'pi_test_001',
    client_secret: 'pi_test_001_secret',
    status: 'payment_pending',
    created_at: new Date().toISOString(),
    completed_at: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MarketplaceCheckout', () => {
  let checkout: MarketplaceCheckout;

  beforeEach(() => {
    vi.clearAllMocks();
    checkout = createCheckout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ========================================================================
  // Checkout Session Creation
  // ========================================================================

  describe('createCheckoutSession', () => {
    it('creates a checkout session with correct fee breakdown', async () => {
      // hasUserPurchasedAsset: not already purchased
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // INSERT checkout session
      mockQuery.mockResolvedValueOnce({
        rows: [makeCheckoutSessionRow()],
      });
      // createPaymentIntent
      mockCreatePaymentIntent.mockResolvedValueOnce({
        paymentIntentId: 'pi_test_001',
        clientSecret: 'pi_test_001_secret',
        amount: 2000,
        currency: 'usd',
        status: 'pending',
        metadata: {},
      });
      // UPDATE session with payment intent
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const session = await checkout.createCheckoutSession({
        assetId: 'asset-001',
        listingId: 'listing-001',
        buyerId: 'buyer-001',
        sellerId: 'seller-001',
        amountCents: 2000,
      });

      expect(session.id).toBe('session-001');
      expect(session.status).toBe('payment_pending');
      expect(session.paymentIntentId).toBe('pi_test_001');
      expect(session.clientSecret).toBe('pi_test_001_secret');
      expect(session.amountCents).toBe(2000);
      expect(session.platformFeeCents).toBeGreaterThan(0);
      expect(session.processingFeeCents).toBeGreaterThan(0);
      expect(session.sellerNetCents).toBeGreaterThan(0);
    });

    it('prevents buyer from purchasing their own asset', async () => {
      await expect(
        checkout.createCheckoutSession({
          assetId: 'asset-self',
          listingId: 'listing-self',
          buyerId: 'user-same',
          sellerId: 'user-same',
          amountCents: 1000,
        })
      ).rejects.toThrow('Cannot purchase your own asset');
    });

    it('prevents duplicate purchases of the same asset', async () => {
      // hasUserPurchasedAsset: already purchased
      mockQuery.mockResolvedValueOnce({
        rows: [{ 1: 1 }],
      });

      await expect(
        checkout.createCheckoutSession({
          assetId: 'asset-dup',
          listingId: 'listing-dup',
          buyerId: 'buyer-dup',
          sellerId: 'seller-dup',
          amountCents: 500,
        })
      ).rejects.toThrow('You have already purchased this asset');
    });

    it('passes sellerConnectedAccountId to payment intent creation', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // no dupe
      mockQuery.mockResolvedValueOnce({
        rows: [makeCheckoutSessionRow()],
      });
      mockCreatePaymentIntent.mockResolvedValueOnce({
        paymentIntentId: 'pi_connect',
        clientSecret: 'secret',
        amount: 2000,
        currency: 'usd',
        status: 'pending',
        metadata: {},
      });
      mockQuery.mockResolvedValueOnce({ rows: [] }); // update session

      await checkout.createCheckoutSession({
        assetId: 'asset-connect',
        listingId: 'listing-connect',
        buyerId: 'buyer-connect',
        sellerId: 'seller-connect',
        amountCents: 2000,
        sellerConnectedAccountId: 'acct_seller_connect',
      });

      expect(mockCreatePaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          sellerConnectedAccountId: 'acct_seller_connect',
        })
      );
    });
  });

  // ========================================================================
  // Session Retrieval and Completion
  // ========================================================================

  describe('getCheckoutSession', () => {
    it('returns a session by ID', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeCheckoutSessionRow()],
      });

      const session = await checkout.getCheckoutSession('session-001');
      expect(session).not.toBeNull();
      expect(session!.id).toBe('session-001');
    });

    it('returns null for non-existent session', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const session = await checkout.getCheckoutSession('missing');
      expect(session).toBeNull();
    });
  });

  describe('completeCheckoutSession', () => {
    it('marks a session as completed by payment intent ID', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeCheckoutSessionRow({
            status: 'completed',
            completed_at: new Date().toISOString(),
          }),
        ],
      });

      const session = await checkout.completeCheckoutSession('pi_test_001');
      expect(session).not.toBeNull();
      expect(session!.status).toBe('completed');
      expect(session!.completedAt).not.toBeNull();
    });

    it('returns null when no matching session exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const session = await checkout.completeCheckoutSession('pi_ghost');
      expect(session).toBeNull();
    });
  });

  // ========================================================================
  // Purchase History
  // ========================================================================

  describe('getUserPurchaseHistory', () => {
    it('returns purchase history with total count', async () => {
      // COUNT query
      mockQuery.mockResolvedValueOnce({
        rows: [{ total: '3' }],
      });
      // SELECT purchases
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            purchase_id: 'p1',
            asset_id: 'a1',
            listing_id: 'l1',
            title: 'Cool Asset',
            amount_cents: '1500',
            currency: 'usd',
            status: 'completed',
            purchased_at: new Date().toISOString(),
          },
          {
            purchase_id: 'p2',
            asset_id: 'a2',
            listing_id: 'l2',
            title: 'Another Asset',
            amount_cents: '3000',
            currency: 'usd',
            status: 'completed',
            purchased_at: new Date().toISOString(),
          },
        ],
      });

      const { purchases, total } = await checkout.getUserPurchaseHistory(
        'buyer-001'
      );

      expect(total).toBe(3);
      expect(purchases).toHaveLength(2);
      expect(purchases[0].title).toBe('Cool Asset');
      expect(purchases[0].amountCents).toBe(1500);
    });

    it('returns empty list when user has no purchases', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { purchases, total } = await checkout.getUserPurchaseHistory(
        'buyer-new'
      );

      expect(total).toBe(0);
      expect(purchases).toHaveLength(0);
    });

    it('respects limit and offset parameters', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: '10' }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await checkout.getUserPurchaseHistory('buyer-001', {
        limit: 5,
        offset: 5,
      });

      // Verify the SELECT query was called with limit and offset
      const selectCall = mockQuery.mock.calls[1];
      expect(selectCall[1]).toEqual(['buyer-001', 5, 5]);
    });
  });

  describe('hasUserPurchasedAsset', () => {
    it('returns true when the user has purchased the asset', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ 1: 1 }] });

      const result = await checkout.hasUserPurchasedAsset(
        'buyer-001',
        'asset-001'
      );
      expect(result).toBe(true);
    });

    it('returns false when the user has not purchased the asset', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await checkout.hasUserPurchasedAsset(
        'buyer-new',
        'asset-new'
      );
      expect(result).toBe(false);
    });
  });

  // ========================================================================
  // Fee Calculations (via StripePaymentService static methods)
  // ========================================================================

  describe('fee calculations', () => {
    it('calculates 15% platform fee correctly', () => {
      // $20.00 = 2000 cents -> 300 cents (15%)
      expect(StripePaymentService.calculatePlatformFee(2000)).toBe(300);
    });

    it('calculates Stripe processing fee (2.9% + $0.30)', () => {
      // $20.00 = 2000 cents -> 2000 * 0.029 = 58 + 30 = 88
      expect(StripePaymentService.calculateProcessingFee(2000)).toBe(88);
    });

    it('calculates seller net after all fees', () => {
      // $20.00 = 2000 cents
      // Platform: 300, Processing: 88
      // Net: 2000 - 300 - 88 = 1612
      expect(StripePaymentService.calculateSellerNet(2000)).toBe(1612);
    });

    it('fee breakdown sums correctly: gross = platform + processing + net', () => {
      const grossCents = 5000;
      const platform = StripePaymentService.calculatePlatformFee(grossCents);
      const processing =
        StripePaymentService.calculateProcessingFee(grossCents);
      const net = StripePaymentService.calculateSellerNet(grossCents);

      expect(platform + processing + net).toBe(grossCents);
    });
  });

  // ========================================================================
  // Seller Earnings
  // ========================================================================

  describe('getSellerEarnings', () => {
    it('returns earnings summary with pending payout', async () => {
      // Earnings from completed sessions
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total_gross: '50000',
            total_platform_fee: '7500',
            total_processing_fee: '1480',
            total_net: '41020',
          },
        ],
      });
      // Payouts already completed
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total_paid: '20000',
            last_payout: new Date('2026-02-20').toISOString(),
          },
        ],
      });

      const earnings = await checkout.getSellerEarnings('seller-001');

      expect(earnings.sellerId).toBe('seller-001');
      expect(earnings.totalGrossCents).toBe(50000);
      expect(earnings.totalPlatformFeeCents).toBe(7500);
      expect(earnings.totalProcessingFeeCents).toBe(1480);
      expect(earnings.totalNetCents).toBe(41020);
      expect(earnings.totalPaidOutCents).toBe(20000);
      expect(earnings.pendingPayoutCents).toBe(21020);
      expect(earnings.lastPayoutAt).toBeInstanceOf(Date);
    });

    it('marks payout as eligible when balance >= $25', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total_gross: '10000',
            total_platform_fee: '1500',
            total_processing_fee: '320',
            total_net: '8180',
          },
        ],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ total_paid: '0', last_payout: null }],
      });

      const earnings = await checkout.getSellerEarnings('seller-002');

      // 8180 cents = $81.80, >= $25 threshold
      expect(earnings.nextPayoutEligible).toBe(true);
    });

    it('marks payout as not eligible when balance < $25', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total_gross: '2000',
            total_platform_fee: '300',
            total_processing_fee: '88',
            total_net: '1612',
          },
        ],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ total_paid: '0', last_payout: null }],
      });

      const earnings = await checkout.getSellerEarnings('seller-003');

      // 1612 cents = $16.12, < $25 threshold
      expect(earnings.nextPayoutEligible).toBe(false);
    });
  });

  describe('getSellerEarningsSummary', () => {
    it('converts cents to USD in the summary', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total_gross: '10000',
            total_platform_fee: '1500',
            total_processing_fee: '320',
            total_net: '8180',
          },
        ],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ total_paid: '5000', last_payout: null }],
      });

      const summary = await checkout.getSellerEarningsSummary('seller-001');

      expect(summary.grossRevenue).toBe(100); // $100.00
      expect(summary.platformFees).toBe(15); // $15.00
      expect(summary.processingFees).toBe(3.2); // $3.20
      expect(summary.netEarnings).toBe(81.8); // $81.80
      expect(summary.pendingPayout).toBe(31.8); // $31.80
      expect(summary.totalPaidOut).toBe(50); // $50.00
    });
  });

  // ========================================================================
  // Payout Eligibility
  // ========================================================================

  describe('processWeeklyPayouts', () => {
    it('processes payouts for eligible sellers with connected accounts', async () => {
      // Find eligible sellers
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            seller_id: 'seller-eligible',
            total_net: '10000',
            total_paid: '0',
          },
        ],
      });
      // Look up connected Stripe account
      mockQuery.mockResolvedValueOnce({
        rows: [
          { stripe_connected_account_id: 'acct_eligible' },
        ],
      });
      // INSERT payout record
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'payout-001',
            seller_id: 'seller-eligible',
            amount_cents: '10000',
            currency: 'usd',
            status: 'pending',
            scheduled_for: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        ],
      });
      // Transfer succeeds
      mockTransferToSeller.mockResolvedValueOnce({
        transferId: 'tr_weekly_001',
        amount: 10000,
        currency: 'usd',
        sellerId: 'seller-eligible',
        connectedAccountId: 'acct_eligible',
      });
      // UPDATE payout with transfer details
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await checkout.processWeeklyPayouts();

      expect(result.eligibleSellers).toBe(1);
      expect(result.totalAmountCents).toBe(10000);
      expect(result.payouts).toHaveLength(1);
    });

    it('defers payouts for sellers without connected accounts', async () => {
      // Find eligible sellers
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            seller_id: 'seller-no-acct',
            total_net: '5000',
            total_paid: '0',
          },
        ],
      });
      // No connected account
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // INSERT payout record (pending, no transfer)
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'payout-deferred',
            seller_id: 'seller-no-acct',
            amount_cents: '5000',
            currency: 'usd',
            status: 'pending',
            scheduled_for: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        ],
      });

      const result = await checkout.processWeeklyPayouts();

      // Payout created but transfer was not attempted
      expect(result.payouts).toHaveLength(1);
      expect(mockTransferToSeller).not.toHaveBeenCalled();
    });

    it('marks payout as failed when transfer throws', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            seller_id: 'seller-fail',
            total_net: '3000',
            total_paid: '0',
          },
        ],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ stripe_connected_account_id: 'acct_fail' }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'payout-fail',
            seller_id: 'seller-fail',
            amount_cents: '3000',
            currency: 'usd',
            status: 'pending',
            scheduled_for: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        ],
      });
      mockTransferToSeller.mockRejectedValueOnce(
        new Error('Transfer declined')
      );
      // UPDATE payout to failed
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await checkout.processWeeklyPayouts();

      expect(result.payouts).toHaveLength(1);
      // Verify the failed status update was attempted
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'failed'"),
        expect.arrayContaining(['payout-fail'])
      );
    });

    it('returns empty result when no sellers are eligible', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await checkout.processWeeklyPayouts();

      expect(result.eligibleSellers).toBe(0);
      expect(result.totalAmountCents).toBe(0);
      expect(result.payouts).toHaveLength(0);
    });
  });

  // ========================================================================
  // Payout History
  // ========================================================================

  describe('getSellerPayoutHistory', () => {
    it('returns payout history with total count', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: '2' }] });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'payout-a',
            seller_id: 'seller-001',
            amount_cents: '5000',
            currency: 'usd',
            transfer_id: 'tr_a',
            status: 'completed',
            scheduled_for: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
          {
            id: 'payout-b',
            seller_id: 'seller-001',
            amount_cents: '3000',
            currency: 'usd',
            transfer_id: null,
            status: 'pending',
            scheduled_for: new Date().toISOString(),
            completed_at: null,
            created_at: new Date().toISOString(),
          },
        ],
      });

      const { payouts, total } = await checkout.getSellerPayoutHistory(
        'seller-001'
      );

      expect(total).toBe(2);
      expect(payouts).toHaveLength(2);
      expect(payouts[0].status).toBe('completed');
      expect(payouts[1].status).toBe('pending');
    });
  });
});
