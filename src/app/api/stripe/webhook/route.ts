import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { billingStore } from '~/server/billing';
import { getBillingConfig } from '~/server/billing/config';
import { getStripe } from '~/server/billing/stripe';
import { handleStripeEvent } from '~/server/billing/webhook';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Stripe webhook. Unauthenticated by design: trust comes from the signature, not a session. */
export async function POST(req: Request) {
  const config = getBillingConfig();
  if (!config.enabled || !config.webhookSecret) {
    return NextResponse.json({ error: 'billing not configured' }, { status: 503 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  // The signature covers the exact bytes Stripe sent, so read the raw body, never req.json().
  const payload = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, config.webhookSecret);
  } catch (error) {
    console.warn('[BILLING] Webhook signature verification failed:', (error as Error).message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    const outcome = await handleStripeEvent(event, { stripe, store: billingStore });
    return NextResponse.json({ received: true, outcome });
  } catch (error) {
    // 500 makes Stripe retry; the event id was rolled back with the failed writes.
    console.error('[BILLING] Webhook handling failed:', { id: event.id, type: event.type, error });
    return NextResponse.json({ error: 'Webhook handling failed' }, { status: 500 });
  }
}
