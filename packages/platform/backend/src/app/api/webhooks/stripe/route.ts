// Stripe webhook handlers for payment processing
//
// This route handles both legacy transaction-based webhooks (Supabase)
// and the new marketplace payment webhooks (StripePaymentService).
// Marketplace events are identified by the `platform: hololand_marketplace`
// metadata field set by StripePaymentService.createPaymentIntent.
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getDatabaseService } from '../../../../lib/DatabaseService';
import { getStripePaymentService } from '../../../../services/StripePaymentService';
import { getMarketplaceCheckout } from '../../../../services/MarketplaceCheckout';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature') || '';

  try {
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    // Check if this is a marketplace payment event
    const eventObject = (event.data?.object as any) ?? {};
    const metadata = eventObject.metadata ?? {};
    const isMarketplaceEvent = metadata.platform === 'hololand_marketplace';

    if (isMarketplaceEvent) {
      // Delegate to StripePaymentService for marketplace payments
      const stripePaymentService = getStripePaymentService();
      const result = await stripePaymentService.handleWebhook(body, signature);

      // If a payment succeeded, also complete the checkout session
      if (event.type === 'payment_intent.succeeded' && result.paymentIntentId) {
        const checkout = getMarketplaceCheckout();
        await checkout.completeCheckoutSession(result.paymentIntentId);
      }

      return NextResponse.json({ received: true, marketplace: true });
    }

    // Legacy handler for non-marketplace events
    const db = getDatabaseService();

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent, db);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent, db);
        break;

      case 'charge.refunded':
        await handleRefund(event.data.object as Stripe.Charge, db);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription, db);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error(`Webhook error: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent, db: any) {
  const { metadata, amount } = paymentIntent;

  if (!metadata?.transactionId) {
    console.warn('Payment succeeded but no transaction ID in metadata');
    return;
  }

  // Update transaction status
  const { data: transaction } = await db.supabase
    .from('transactions')
    .update({ status: 'completed', stripe_payment_id: paymentIntent.id })
    .eq('id', metadata.transactionId);

  if (transaction) {
    // Calculate creator payout (70%)
    const creatorAmount = Math.floor((amount || 0) * 0.7);

    // Credit creator earnings
    const { data: creator } = await db.supabase
      .from('creator_profiles')
      .select('total_earnings')
      .eq('user_id', transaction[0].creator_id)
      .single();

    if (creator) {
      await db.supabase
        .from('creator_profiles')
        .update({ total_earnings: (creator.total_earnings || 0) + creatorAmount })
        .eq('user_id', transaction[0].creator_id);
    }

    // Track analytics
    await db.supabase.from('analytics_events').insert({
      event_type: 'purchase',
      user_id: transaction[0].buyer_id,
      world_id: transaction[0].world_id,
      metadata: { amount: creatorAmount },
    });

    console.log(`Transaction ${metadata.transactionId} completed. Creator earned $${creatorAmount / 100}`);
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent, db: any) {
  const { metadata } = paymentIntent;

  if (!metadata?.transactionId) {
    return;
  }

  // Mark transaction as failed
  await db.supabase
    .from('transactions')
    .update({ status: 'failed' })
    .eq('id', metadata.transactionId);

  console.log(`Transaction ${metadata.transactionId} failed`);
}

async function handleRefund(charge: Stripe.Charge, db: any) {
  const metadata = charge.metadata;

  if (!metadata?.transactionId) {
    return;
  }

  // Mark as refunded
  const { data: transaction } = await db.supabase
    .from('transactions')
    .update({ status: 'refunded' })
    .eq('id', metadata.transactionId)
    .select()
    .single();

  if (transaction) {
    // Deduct from creator earnings
    const creatorAmount = Math.floor((charge.amount || 0) * 0.7);

    const { data: creator } = await db.supabase
      .from('creator_profiles')
      .select('total_earnings')
      .eq('user_id', transaction.creator_id)
      .single();

    if (creator) {
      await db.supabase
        .from('creator_profiles')
        .update({
          total_earnings: Math.max(0, (creator.total_earnings || 0) - creatorAmount),
        })
        .eq('user_id', transaction.creator_id);
    }
  }

  console.log(`Refund processed for transaction ${metadata.transactionId}`);
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription, db: any) {
  // Handle subscription cancellations if needed
  console.log(`Subscription ${subscription.id} canceled`);
}
