/**
 * Billing Service
 *
 * Stripe integration for Brittney Cloud API:
 * - Monthly invoice generation
 * - Line items per model
 * - Auto-charge payment methods
 * - Invoice email + PDF
 * - Graduated pricing tier calculation
 */

import Stripe from 'stripe';
import { DatabaseService } from './database';
import pino from 'pino';

const logger = pino({ name: 'billing-service' });

export interface PricingTier {
  id: string;
  name: string;
  basePrice: number; // Monthly base fee
  includedTokens: number;
  overage1Price: number; // Per 1M tokens (first tier)
  overage1Threshold: number; // Tokens where tier 2 starts
  overage2Price: number; // Per 1M tokens (second tier)
}

export interface UsageLineItem {
  model: string;
  totalTokens: number;
  baseCharge: number;
  overageCharge: number;
  totalCharge: number;
}

export interface Invoice {
  invoiceId: string;
  userId: string;
  tier: string;
  periodStart: Date;
  periodEnd: Date;
  lineItems: UsageLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  stripeInvoiceId?: string;
  status: 'draft' | 'open' | 'paid' | 'void';
}

export class BillingService {
  private stripe: Stripe;
  private database: DatabaseService;

  // Pricing tiers configuration
  private pricingTiers: Map<string, PricingTier>;

  constructor(database: DatabaseService, stripeSecretKey: string) {
    this.database = database;
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
    });

    // Initialize pricing tiers from environment variables
    this.pricingTiers = new Map([
      ['free', {
        id: 'free',
        name: 'Free Tier',
        basePrice: 0,
        includedTokens: parseInt(process.env.QUOTA_FREE_MONTHLY_TOKENS || '100000', 10),
        overage1Price: 0,
        overage1Threshold: 0,
        overage2Price: 0,
      }],
      ['payg', {
        id: 'payg',
        name: 'Pay As You Go',
        basePrice: 0,
        includedTokens: 0,
        overage1Price: parseFloat(process.env.PRICE_PAYG || '0.30'),
        overage1Threshold: 999999999,
        overage2Price: parseFloat(process.env.PRICE_PAYG || '0.30'),
      }],
      ['pro', {
        id: 'pro',
        name: 'Pro Plan',
        basePrice: parseFloat(process.env.PRICE_PRO_BASE || '49'),
        includedTokens: parseInt(process.env.PRICE_PRO_INCLUDED_TOKENS || '10000000', 10),
        overage1Price: parseFloat(process.env.PRICE_PRO_OVERAGE_1 || '0.25'),
        overage1Threshold: 100000000,
        overage2Price: parseFloat(process.env.PRICE_PRO_OVERAGE_2 || '0.20'),
      }],
      ['enterprise', {
        id: 'enterprise',
        name: 'Enterprise',
        basePrice: parseFloat(process.env.PRICE_ENTERPRISE_BASE || '500'),
        includedTokens: 100000000,
        overage1Price: parseFloat(process.env.PRICE_ENTERPRISE_OVERAGE || '0.15'),
        overage1Threshold: 999999999,
        overage2Price: parseFloat(process.env.PRICE_ENTERPRISE_OVERAGE || '0.15'),
      }],
    ]);
  }

  /**
   * Create Stripe customer for a user
   */
  async createCustomer(
    userId: string,
    email: string,
    name: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          userId,
          ...metadata,
        },
      });

      // Store customer ID in database
      await this.database.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [customer.id, userId]
      );

      logger.info({ userId, customerId: customer.id }, 'Stripe customer created');
      return customer.id;
    } catch (error) {
      logger.error({ error, userId }, 'Failed to create Stripe customer');
      throw error;
    }
  }

  /**
   * Calculate invoice for a billing period
   */
  async calculateInvoice(
    userId: string,
    tier: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Invoice> {
    try {
      // Get usage data from database
      const usageQuery = `
        SELECT
          model,
          SUM(total_tokens) AS total_tokens
        FROM usage_summary
        WHERE user_id = $1
          AND hour >= $2
          AND hour < $3
        GROUP BY model;
      `;

      const result = await this.database.query(usageQuery, [
        userId,
        periodStart,
        periodEnd,
      ]);

      const pricingTier = this.pricingTiers.get(tier);
      if (!pricingTier) {
        throw new Error(`Unknown pricing tier: ${tier}`);
      }

      // Calculate line items
      const lineItems: UsageLineItem[] = [];
      let totalTokens = 0;

      for (const row of result.rows) {
        totalTokens += parseInt(row.total_tokens, 10);
      }

      // Calculate charges
      let remainingTokens = totalTokens - pricingTier.includedTokens;
      let overageCharge = 0;

      if (remainingTokens > 0) {
        // First tier overage
        const tier1Tokens = Math.min(
          remainingTokens,
          pricingTier.overage1Threshold - pricingTier.includedTokens
        );
        overageCharge += (tier1Tokens / 1000000) * pricingTier.overage1Price;
        remainingTokens -= tier1Tokens;

        // Second tier overage (if applicable)
        if (remainingTokens > 0) {
          overageCharge += (remainingTokens / 1000000) * pricingTier.overage2Price;
        }
      }

      const lineItem: UsageLineItem = {
        model: 'all',
        totalTokens,
        baseCharge: pricingTier.basePrice,
        overageCharge,
        totalCharge: pricingTier.basePrice + overageCharge,
      };

      lineItems.push(lineItem);

      const subtotal = lineItem.totalCharge;
      const tax = 0; // TODO: Implement tax calculation based on user location
      const total = subtotal + tax;

      return {
        invoiceId: `inv_${Date.now()}`,
        userId,
        tier,
        periodStart,
        periodEnd,
        lineItems,
        subtotal,
        tax,
        total,
        status: 'draft',
      };
    } catch (error) {
      logger.error({ error, userId, tier }, 'Failed to calculate invoice');
      throw error;
    }
  }

  /**
   * Create and send Stripe invoice
   */
  async createStripeInvoice(invoice: Invoice): Promise<string> {
    try {
      // Get Stripe customer ID
      const userQuery = await this.database.query(
        'SELECT stripe_customer_id FROM users WHERE id = $1',
        [invoice.userId]
      );

      if (userQuery.rows.length === 0) {
        throw new Error(`User not found: ${invoice.userId}`);
      }

      const customerId = userQuery.rows[0].stripe_customer_id;
      if (!customerId) {
        throw new Error(`User ${invoice.userId} does not have a Stripe customer ID`);
      }

      // Create invoice items
      for (const lineItem of invoice.lineItems) {
        // Base charge (subscription fee)
        if (lineItem.baseCharge > 0) {
          await this.stripe.invoiceItems.create({
            customer: customerId,
            amount: Math.round(lineItem.baseCharge * 100), // Convert to cents
            currency: 'usd',
            description: `${invoice.tier.toUpperCase()} Plan - ${this.formatPeriod(invoice.periodStart, invoice.periodEnd)}`,
          });
        }

        // Overage charge
        if (lineItem.overageCharge > 0) {
          await this.stripe.invoiceItems.create({
            customer: customerId,
            amount: Math.round(lineItem.overageCharge * 100),
            currency: 'usd',
            description: `Overage - ${lineItem.totalTokens.toLocaleString()} tokens (${this.formatPeriod(invoice.periodStart, invoice.periodEnd)})`,
          });
        }
      }

      // Create and finalize invoice
      const stripeInvoice = await this.stripe.invoices.create({
        customer: customerId,
        auto_advance: true, // Auto-finalize after 1 hour
        collection_method: 'charge_automatically',
        metadata: {
          userId: invoice.userId,
          tier: invoice.tier,
          periodStart: invoice.periodStart.toISOString(),
          periodEnd: invoice.periodEnd.toISOString(),
        },
      });

      // Attempt to charge immediately
      await this.stripe.invoices.pay(stripeInvoice.id);

      logger.info({
        userId: invoice.userId,
        stripeInvoiceId: stripeInvoice.id,
        amount: invoice.total,
      }, 'Stripe invoice created and charged');

      // Save invoice to database
      await this.database.query(`
        INSERT INTO invoices (
          id, user_id, tier, period_start, period_end,
          subtotal, tax, total, stripe_invoice_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        invoice.invoiceId,
        invoice.userId,
        invoice.tier,
        invoice.periodStart,
        invoice.periodEnd,
        invoice.subtotal,
        invoice.tax,
        invoice.total,
        stripeInvoice.id,
        'paid',
      ]);

      return stripeInvoice.id;
    } catch (error) {
      logger.error({ error, invoice }, 'Failed to create Stripe invoice');
      throw error;
    }
  }

  /**
   * Run monthly billing for all users
   */
  async runMonthlyBilling(): Promise<void> {
    try {
      logger.info('Starting monthly billing run...');

      // Get all active users with payment methods
      const usersQuery = `
        SELECT id, tier, email, name, stripe_customer_id
        FROM users
        WHERE tier != 'free'
          AND stripe_customer_id IS NOT NULL
          AND active = true;
      `;

      const result = await this.database.query(usersQuery);
      const users = result.rows;

      logger.info({ count: users.length }, 'Processing monthly billing');

      const periodEnd = new Date();
      const periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth() - 1, 1);

      let successCount = 0;
      let failureCount = 0;

      for (const user of users) {
        try {
          // Calculate invoice
          const invoice = await this.calculateInvoice(
            user.id,
            user.tier,
            periodStart,
            periodEnd
          );

          // Skip if total is $0
          if (invoice.total === 0) {
            logger.info({ userId: user.id }, 'Skipping $0 invoice');
            continue;
          }

          // Create and charge Stripe invoice
          await this.createStripeInvoice(invoice);
          successCount++;

          // Small delay to avoid rate limits
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          logger.error({ error, userId: user.id }, 'Failed to process billing for user');
          failureCount++;
        }
      }

      logger.info({
        total: users.length,
        success: successCount,
        failure: failureCount,
      }, 'Monthly billing run complete');
    } catch (error) {
      logger.error({ error }, 'Fatal error during monthly billing');
      throw error;
    }
  }

  /**
   * Helper: Format billing period for invoice description
   */
  private formatPeriod(start: Date, end: Date): string {
    const formatter = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
    });
    return `${formatter.format(start)} - ${formatter.format(end)}`;
  }
}
