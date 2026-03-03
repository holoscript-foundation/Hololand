/**
 * @hololand/backend -- EnterpriseTierService
 *
 * Plan management for free / pro / enterprise subscription tiers.
 *
 * Responsibilities:
 *   - Plan definitions with feature gates (maxWorlds, maxAssets, storage, etc.)
 *   - User plan queries and feature-access checks
 *   - Plan upgrades / downgrades with Stripe Subscriptions integration
 *   - Billing lifecycle: subscription creation, cancellation, payment method
 *     updates, invoice retrieval, and mid-cycle proration
 *   - Usage-vs-plan comparison for dashboard display
 *
 * Architecture:
 *   Client --> getUserPlan / checkFeatureAccess --> EnterpriseTierService
 *              upgradePlan / downgradePlan       --> Stripe Subscriptions API
 *              getInvoices / getUpcomingInvoice   --> Stripe Invoices API
 *
 * Security:
 *   - Stripe secret key sourced exclusively from environment variables
 *   - No secrets are ever logged or serialized
 *   - All DB writes use parameterized queries (SQL injection safe)
 */

import Stripe from 'stripe';
import { query } from '../../db/pool';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRODUCT_ID = 'hololand-platform';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlanId = 'free' | 'pro' | 'enterprise';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  /** Monthly price in USD (0 = free, custom = enterprise contact-sales). */
  priceMonthlyUsd: number;
  /** Stripe Price ID used to create subscriptions. Null for free tier. */
  stripePriceId: string | null;
  /** Feature gates */
  maxWorlds: number;
  maxAssets: number;
  maxStorageMb: number;
  maxCollaborators: number;
  voiceChannels: number;
  customDomain: boolean;
  ssoEnabled: boolean;
  prioritySupport: boolean;
  apiAccess: boolean;
  whiteLabel: boolean;
}

export interface UserPlan {
  userId: string;
  planId: PlanId;
  plan: PlanDefinition;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'unpaid';
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export type FeatureName =
  | 'customDomain'
  | 'ssoEnabled'
  | 'prioritySupport'
  | 'apiAccess'
  | 'whiteLabel'
  | 'voiceChannels';

export interface UsageVsPlan {
  planId: PlanId;
  planName: string;
  limits: {
    maxWorlds: number;
    maxAssets: number;
    maxStorageMb: number;
    maxCollaborators: number;
    voiceChannels: number;
  };
  usage: {
    worlds: number;
    assets: number;
    storageMb: number;
    collaborators: number;
    voiceChannels: number;
  };
  /** Per-metric percentage used (0-100+). Over 100 means over-limit. */
  percentages: {
    worlds: number;
    assets: number;
    storageMb: number;
    collaborators: number;
    voiceChannels: number;
  };
}

export interface InvoiceSummary {
  id: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: string;
  created: Date;
  periodStart: Date;
  periodEnd: Date;
  hostedInvoiceUrl: string | null;
  pdfUrl: string | null;
}

export interface PaginatedInvoices {
  invoices: InvoiceSummary[];
  hasMore: boolean;
}

export interface EnterpriseTierServiceConfig {
  /** Override for testing. Falls back to STRIPE_SECRET_KEY env var. */
  stripeSecretKey?: string;
}

// ---------------------------------------------------------------------------
// Plan Definitions
// ---------------------------------------------------------------------------

const PLAN_DEFINITIONS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthlyUsd: 0,
    stripePriceId: null,
    maxWorlds: 3,
    maxAssets: 50,
    maxStorageMb: 500,
    maxCollaborators: 2,
    voiceChannels: 1,
    customDomain: false,
    ssoEnabled: false,
    prioritySupport: false,
    apiAccess: false,
    whiteLabel: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthlyUsd: 29,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_placeholder',
    maxWorlds: 25,
    maxAssets: 500,
    maxStorageMb: 10_000,
    maxCollaborators: 15,
    voiceChannels: 5,
    customDomain: false,
    ssoEnabled: false,
    prioritySupport: true,
    apiAccess: true,
    whiteLabel: false,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthlyUsd: 199,
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_placeholder',
    maxWorlds: 500,
    maxAssets: 10_000,
    maxStorageMb: 500_000,
    maxCollaborators: 200,
    voiceChannels: 50,
    customDomain: true,
    ssoEnabled: true,
    prioritySupport: true,
    apiAccess: true,
    whiteLabel: true,
  },
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class EnterpriseTierService {
  private readonly stripe: Stripe;

  constructor(config: EnterpriseTierServiceConfig = {}) {
    const secretKey = config.stripeSecretKey || process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error(
        'EnterpriseTierService: STRIPE_SECRET_KEY environment variable is required'
      );
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16' as any,
      typescript: true,
    });
  }

  // -----------------------------------------------------------------------
  // Plan Queries
  // -----------------------------------------------------------------------

  /** Get the full plan definition by plan ID. */
  getPlanLimits(planId: PlanId): PlanDefinition {
    const plan = PLAN_DEFINITIONS[planId];
    if (!plan) {
      throw new Error(`Unknown plan: ${planId}`);
    }
    return { ...plan };
  }

  /** Get all available plan definitions. */
  getAllPlans(): PlanDefinition[] {
    return Object.values(PLAN_DEFINITIONS).map((p) => ({ ...p }));
  }

  /**
   * Get the current plan for a user.
   * Returns free plan if the user has no subscription record.
   */
  async getUserPlan(userId: string): Promise<UserPlan> {
    try {
      const { rows } = await query(
        `SELECT * FROM "enterprise_subscriptions"
         WHERE user_id = $1 AND status IN ('active', 'trialing', 'past_due')
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );

      if (!rows || rows.length === 0) {
        return this.buildFreePlan(userId);
      }

      const row = rows[0];
      const planId = row.plan_id as PlanId;
      const plan = PLAN_DEFINITIONS[planId] || PLAN_DEFINITIONS.free;

      return {
        userId,
        planId,
        plan: { ...plan },
        stripeSubscriptionId: row.stripe_subscription_id,
        stripeCustomerId: row.stripe_customer_id,
        status: row.status,
        currentPeriodStart: row.current_period_start ? new Date(row.current_period_start) : null,
        currentPeriodEnd: row.current_period_end ? new Date(row.current_period_end) : null,
        cancelAtPeriodEnd: row.cancel_at_period_end ?? false,
      };
    } catch (error: any) {
      logger.error(`[EnterpriseTierService] getUserPlan failed for ${userId}: ${error.message}`);
      return this.buildFreePlan(userId);
    }
  }

  /**
   * Check whether a user has access to a specific boolean feature.
   */
  async checkFeatureAccess(userId: string, featureName: FeatureName): Promise<boolean> {
    const userPlan = await this.getUserPlan(userId);
    const plan = userPlan.plan;

    switch (featureName) {
      case 'customDomain':
        return plan.customDomain;
      case 'ssoEnabled':
        return plan.ssoEnabled;
      case 'prioritySupport':
        return plan.prioritySupport;
      case 'apiAccess':
        return plan.apiAccess;
      case 'whiteLabel':
        return plan.whiteLabel;
      case 'voiceChannels':
        return plan.voiceChannels > 0;
      default:
        return false;
    }
  }

  /**
   * Get a comparison of actual usage against plan limits.
   */
  async getUsageVsPlan(userId: string): Promise<UsageVsPlan> {
    const userPlan = await this.getUserPlan(userId);
    const plan = userPlan.plan;

    // Query actual usage from relevant tables
    const [worldsResult, assetsResult, storageResult, collabResult, vcResult] = await Promise.all([
      query('SELECT COUNT(*) as count FROM "worlds" WHERE owner_id = $1', [userId]),
      query('SELECT COUNT(*) as count FROM "assets" WHERE owner_id = $1', [userId]),
      query(
        'SELECT COALESCE(SUM(size_bytes), 0) as total FROM "assets" WHERE owner_id = $1',
        [userId]
      ),
      query(
        `SELECT COUNT(DISTINCT collaborator_id) as count
         FROM "world_collaborators" wc
         JOIN "worlds" w ON w.id = wc.world_id
         WHERE w.owner_id = $1`,
        [userId]
      ),
      query(
        `SELECT COUNT(*) as count
         FROM "voice_channels" vc
         JOIN "worlds" w ON w.id = vc.world_id
         WHERE w.owner_id = $1`,
        [userId]
      ),
    ]);

    const usage = {
      worlds: parseInt(worldsResult.rows[0]?.count ?? '0', 10),
      assets: parseInt(assetsResult.rows[0]?.count ?? '0', 10),
      storageMb: Math.round(
        parseInt(storageResult.rows[0]?.total ?? '0', 10) / (1024 * 1024)
      ),
      collaborators: parseInt(collabResult.rows[0]?.count ?? '0', 10),
      voiceChannels: parseInt(vcResult.rows[0]?.count ?? '0', 10),
    };

    const limits = {
      maxWorlds: plan.maxWorlds,
      maxAssets: plan.maxAssets,
      maxStorageMb: plan.maxStorageMb,
      maxCollaborators: plan.maxCollaborators,
      voiceChannels: plan.voiceChannels,
    };

    const pct = (used: number, max: number) =>
      max === 0 ? (used > 0 ? 100 : 0) : Math.round((used / max) * 100);

    return {
      planId: userPlan.planId,
      planName: plan.name,
      limits,
      usage,
      percentages: {
        worlds: pct(usage.worlds, limits.maxWorlds),
        assets: pct(usage.assets, limits.maxAssets),
        storageMb: pct(usage.storageMb, limits.maxStorageMb),
        collaborators: pct(usage.collaborators, limits.maxCollaborators),
        voiceChannels: pct(usage.voiceChannels, limits.voiceChannels),
      },
    };
  }

  // -----------------------------------------------------------------------
  // Plan Changes
  // -----------------------------------------------------------------------

  /**
   * Upgrade a user's plan.
   * Creates a new Stripe subscription (or updates existing) with proration.
   */
  async upgradePlan(
    userId: string,
    targetPlan: PlanId,
    paymentMethodId: string
  ): Promise<UserPlan> {
    const currentPlan = await this.getUserPlan(userId);
    const targetDef = PLAN_DEFINITIONS[targetPlan];

    if (!targetDef) {
      throw new Error(`Unknown target plan: ${targetPlan}`);
    }
    if (targetPlan === 'free') {
      throw new Error('Cannot upgrade to free plan. Use downgradePlan instead.');
    }
    if (!targetDef.stripePriceId) {
      throw new Error(`No Stripe price configured for plan: ${targetPlan}`);
    }

    const planOrder: Record<PlanId, number> = { free: 0, pro: 1, enterprise: 2 };
    if (planOrder[targetPlan] <= planOrder[currentPlan.planId]) {
      throw new Error(
        `Cannot upgrade from ${currentPlan.planId} to ${targetPlan}. Target must be a higher tier.`
      );
    }

    try {
      // Ensure we have a Stripe customer
      const customerId = await this.ensureStripeCustomer(userId, paymentMethodId);

      let stripeSubscription: Stripe.Subscription;

      if (currentPlan.stripeSubscriptionId && currentPlan.status === 'active') {
        // Update existing subscription with proration
        const subscription = await this.stripe.subscriptions.retrieve(
          currentPlan.stripeSubscriptionId
        );
        stripeSubscription = await this.stripe.subscriptions.update(
          currentPlan.stripeSubscriptionId,
          {
            items: [
              {
                id: subscription.items.data[0].id,
                price: targetDef.stripePriceId,
              },
            ],
            proration_behavior: 'create_prorations',
            default_payment_method: paymentMethodId,
            metadata: {
              user_id: userId,
              plan_id: targetPlan,
              platform: 'hololand',
            },
          }
        );
      } else {
        // Create new subscription
        stripeSubscription = await this.stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: targetDef.stripePriceId }],
          default_payment_method: paymentMethodId,
          proration_behavior: 'create_prorations',
          metadata: {
            user_id: userId,
            plan_id: targetPlan,
            platform: 'hololand',
          },
        });
      }

      // Persist
      await this.upsertSubscriptionRecord(userId, targetPlan, stripeSubscription, customerId);

      logger.info(
        `[EnterpriseTierService] User ${userId} upgraded from ${currentPlan.planId} to ${targetPlan} (sub: ${stripeSubscription.id})`
      );

      return this.getUserPlan(userId);
    } catch (error: any) {
      logger.error(`[EnterpriseTierService] upgradePlan failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Downgrade a user's plan.
   * For downgrades to free: cancels at period end.
   * For downgrades to a lower paid tier: updates with proration.
   */
  async downgradePlan(userId: string, targetPlan: PlanId): Promise<UserPlan> {
    const currentPlan = await this.getUserPlan(userId);
    const targetDef = PLAN_DEFINITIONS[targetPlan];

    if (!targetDef) {
      throw new Error(`Unknown target plan: ${targetPlan}`);
    }

    const planOrder: Record<PlanId, number> = { free: 0, pro: 1, enterprise: 2 };
    if (planOrder[targetPlan] >= planOrder[currentPlan.planId]) {
      throw new Error(
        `Cannot downgrade from ${currentPlan.planId} to ${targetPlan}. Target must be a lower tier.`
      );
    }

    if (!currentPlan.stripeSubscriptionId) {
      throw new Error('No active subscription to downgrade.');
    }

    try {
      if (targetPlan === 'free') {
        // Cancel at period end (user keeps access until end of billing cycle)
        await this.stripe.subscriptions.update(currentPlan.stripeSubscriptionId, {
          cancel_at_period_end: true,
          metadata: {
            user_id: userId,
            downgrade_to: 'free',
            platform: 'hololand',
          },
        });

        await query(
          `UPDATE "enterprise_subscriptions"
           SET cancel_at_period_end = true, updated_at = NOW()
           WHERE user_id = $1 AND stripe_subscription_id = $2`,
          [userId, currentPlan.stripeSubscriptionId]
        );

        logger.info(
          `[EnterpriseTierService] User ${userId} scheduled downgrade to free at period end`
        );
      } else {
        // Downgrade to a lower paid tier
        const subscription = await this.stripe.subscriptions.retrieve(
          currentPlan.stripeSubscriptionId
        );

        if (!targetDef.stripePriceId) {
          throw new Error(`No Stripe price configured for plan: ${targetPlan}`);
        }

        const updatedSubscription = await this.stripe.subscriptions.update(
          currentPlan.stripeSubscriptionId,
          {
            items: [
              {
                id: subscription.items.data[0].id,
                price: targetDef.stripePriceId,
              },
            ],
            proration_behavior: 'create_prorations',
            metadata: {
              user_id: userId,
              plan_id: targetPlan,
              platform: 'hololand',
            },
          }
        );

        await this.upsertSubscriptionRecord(
          userId,
          targetPlan,
          updatedSubscription,
          currentPlan.stripeCustomerId!
        );

        logger.info(
          `[EnterpriseTierService] User ${userId} downgraded from ${currentPlan.planId} to ${targetPlan}`
        );
      }

      return this.getUserPlan(userId);
    } catch (error: any) {
      logger.error(`[EnterpriseTierService] downgradePlan failed: ${error.message}`);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // Billing / Subscription Management
  // -----------------------------------------------------------------------

  /**
   * Create a subscription for a user on a specific plan.
   * This is a lower-level method; prefer upgradePlan for user-facing flows.
   */
  async createSubscription(
    userId: string,
    planId: PlanId,
    paymentMethodId: string
  ): Promise<string> {
    const planDef = PLAN_DEFINITIONS[planId];
    if (!planDef || !planDef.stripePriceId) {
      throw new Error(`Cannot create subscription for plan: ${planId}`);
    }

    const customerId = await this.ensureStripeCustomer(userId, paymentMethodId);

    const subscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: planDef.stripePriceId }],
      default_payment_method: paymentMethodId,
      metadata: {
        user_id: userId,
        plan_id: planId,
        platform: 'hololand',
      },
    });

    await this.upsertSubscriptionRecord(userId, planId, subscription, customerId);

    logger.info(
      `[EnterpriseTierService] Created subscription ${subscription.id} for user ${userId} on plan ${planId}`
    );

    return subscription.id;
  }

  /**
   * Cancel a user's subscription at period end.
   */
  async cancelSubscription(userId: string): Promise<void> {
    const userPlan = await this.getUserPlan(userId);

    if (!userPlan.stripeSubscriptionId) {
      throw new Error('No active subscription to cancel.');
    }

    await this.stripe.subscriptions.update(userPlan.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await query(
      `UPDATE "enterprise_subscriptions"
       SET cancel_at_period_end = true, canceled_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND stripe_subscription_id = $2`,
      [userId, userPlan.stripeSubscriptionId]
    );

    logger.info(
      `[EnterpriseTierService] Subscription ${userPlan.stripeSubscriptionId} for user ${userId} set to cancel at period end`
    );
  }

  /**
   * Update the default payment method for a user's subscription.
   */
  async updatePaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    const userPlan = await this.getUserPlan(userId);

    if (!userPlan.stripeCustomerId) {
      throw new Error('No Stripe customer found for user.');
    }

    // Attach payment method to customer
    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: userPlan.stripeCustomerId,
    });

    // Set as default
    await this.stripe.customers.update(userPlan.stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // Also update subscription if active
    if (userPlan.stripeSubscriptionId) {
      await this.stripe.subscriptions.update(userPlan.stripeSubscriptionId, {
        default_payment_method: paymentMethodId,
      });
    }

    logger.info(
      `[EnterpriseTierService] Updated payment method for user ${userId} to ${paymentMethodId.slice(0, 8)}...`
    );
  }

  /**
   * Get paginated invoices for a user.
   */
  async getInvoices(
    userId: string,
    pagination: { limit?: number; startingAfter?: string } = {}
  ): Promise<PaginatedInvoices> {
    const userPlan = await this.getUserPlan(userId);

    if (!userPlan.stripeCustomerId) {
      return { invoices: [], hasMore: false };
    }

    const params: Stripe.InvoiceListParams = {
      customer: userPlan.stripeCustomerId,
      limit: pagination.limit ?? 10,
    };

    if (pagination.startingAfter) {
      params.starting_after = pagination.startingAfter;
    }

    const stripeInvoices = await this.stripe.invoices.list(params);

    const invoices: InvoiceSummary[] = stripeInvoices.data.map((inv) => ({
      id: inv.id,
      amountDue: inv.amount_due,
      amountPaid: inv.amount_paid,
      currency: inv.currency,
      status: inv.status ?? 'unknown',
      created: new Date(inv.created * 1000),
      periodStart: new Date((inv.period_start ?? inv.created) * 1000),
      periodEnd: new Date((inv.period_end ?? inv.created) * 1000),
      hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
      pdfUrl: inv.invoice_pdf ?? null,
    }));

    return { invoices, hasMore: stripeInvoices.has_more };
  }

  /**
   * Get the upcoming invoice for a user (preview of next charge).
   */
  async getUpcomingInvoice(userId: string): Promise<InvoiceSummary | null> {
    const userPlan = await this.getUserPlan(userId);

    if (!userPlan.stripeCustomerId || !userPlan.stripeSubscriptionId) {
      return null;
    }

    try {
      const upcoming = await this.stripe.invoices.retrieveUpcoming({
        customer: userPlan.stripeCustomerId,
        subscription: userPlan.stripeSubscriptionId,
      });

      return {
        id: 'upcoming',
        amountDue: upcoming.amount_due,
        amountPaid: upcoming.amount_paid,
        currency: upcoming.currency,
        status: 'upcoming',
        created: new Date(upcoming.created * 1000),
        periodStart: new Date((upcoming.period_start ?? upcoming.created) * 1000),
        periodEnd: new Date((upcoming.period_end ?? upcoming.created) * 1000),
        hostedInvoiceUrl: null,
        pdfUrl: null,
      };
    } catch (error: any) {
      // Stripe throws if no upcoming invoice exists
      if (error.code === 'invoice_upcoming_none') {
        return null;
      }
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // Internal Helpers
  // -----------------------------------------------------------------------

  private buildFreePlan(userId: string): UserPlan {
    return {
      userId,
      planId: 'free',
      plan: { ...PLAN_DEFINITIONS.free },
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      status: 'active',
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  /**
   * Ensure a Stripe Customer exists for the user, creating one if needed.
   * Attaches the given payment method as default.
   */
  private async ensureStripeCustomer(
    userId: string,
    paymentMethodId: string
  ): Promise<string> {
    // Check if we already have a customer ID in the DB
    const { rows } = await query(
      `SELECT stripe_customer_id FROM "enterprise_subscriptions"
       WHERE user_id = $1 AND stripe_customer_id IS NOT NULL
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (rows.length > 0 && rows[0].stripe_customer_id) {
      const customerId = rows[0].stripe_customer_id;
      // Attach payment method
      try {
        await this.stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId,
        });
      } catch {
        // May already be attached
      }
      return customerId;
    }

    // Look up user email for Stripe customer creation
    const { rows: userRows } = await query(
      'SELECT email, display_name FROM "users" WHERE id = $1 LIMIT 1',
      [userId]
    );

    const email = userRows[0]?.email;
    const name = userRows[0]?.display_name;

    const customer = await this.stripe.customers.create({
      email: email || undefined,
      name: name || undefined,
      payment_method: paymentMethodId,
      invoice_settings: { default_payment_method: paymentMethodId },
      metadata: {
        user_id: userId,
        platform: 'hololand',
      },
    });

    return customer.id;
  }

  /**
   * Upsert the subscription record in the enterprise_subscriptions table.
   */
  private async upsertSubscriptionRecord(
    userId: string,
    planId: PlanId,
    subscription: Stripe.Subscription,
    customerId: string
  ): Promise<void> {
    const currentPeriodStart = new Date(subscription.current_period_start * 1000);
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

    await query(
      `INSERT INTO "enterprise_subscriptions" (
        user_id, plan_id, stripe_subscription_id, stripe_customer_id,
        status, current_period_start, current_period_end,
        cancel_at_period_end, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (user_id, stripe_subscription_id) DO UPDATE SET
        plan_id = EXCLUDED.plan_id,
        status = EXCLUDED.status,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        updated_at = NOW()`,
      [
        userId,
        planId,
        subscription.id,
        customerId,
        subscription.status,
        currentPeriodStart.toISOString(),
        currentPeriodEnd.toISOString(),
        subscription.cancel_at_period_end || false,
      ]
    );
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let instance: EnterpriseTierService | null = null;

export function getEnterpriseTierService(
  config?: EnterpriseTierServiceConfig
): EnterpriseTierService {
  if (!instance) {
    instance = new EnterpriseTierService(config);
  }
  return instance;
}
