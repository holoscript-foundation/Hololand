// Stripe webhook handlers for payment processing
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getDatabaseService } from '../../../../lib/DatabaseService';

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
