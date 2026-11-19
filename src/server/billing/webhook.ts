import type Stripe from 'stripe';

import { isPaidSubscription } from './plans';
import type { StripeClient } from './stripe';
import type { BillingStore, SubscriptionFields } from './store';

export type WebhookOutcome = 'processed' | 'duplicate';

export interface WebhookDeps {
  stripe: StripeClient;
  store: BillingStore;
  log?: (message: string, meta?: Record<string, unknown>) => void;
}

type Apply = (store: BillingStore) => Promise<void>;

const defaultLog = (message: string, meta?: Record<string, unknown>) =>
  console.log(`[BILLING] ${message}`, meta ?? {});

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

export function subscriptionFields(sub: Stripe.Subscription): SubscriptionFields {
  // Since API 2025-03-31.basil the billing period lives on the subscription items.
  const item = sub.items.data[0];
  return {
    stripeSubscriptionId: sub.id,
    status: sub.status,
    priceId: item?.price.id ?? null,
    currentPeriodStart: item ? new Date(item.current_period_start * 1000) : null,
    currentPeriodEnd: item ? new Date(item.current_period_end * 1000) : null,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  };
}

/**
 * Persist a subscription for the user who owns its customer. The user is found from our own
 * customer link; Stripe metadata (written by our server at checkout) is only a fallback for a
 * user with no link yet. Nothing in the payload can move a customer to a different user.
 */
function applySubscription(sub: Stripe.Subscription, log: NonNullable<WebhookDeps['log']>): Apply {
  return async (store) => {
    const customerId = idOf(sub.customer);
    if (!customerId) return log('subscription without customer, skipped', { subscription: sub.id });

    let row = await store.findByCustomerId(customerId);
    if (!row) {
      const userId = sub.metadata?.userId;
      if (!userId || !(await store.userExists(userId))) {
        return log('subscription for unknown customer, skipped', {
          subscription: sub.id,
          customer: customerId,
        });
      }
      const existing = await store.getSubscription(userId);
      if (existing && existing.stripeCustomerId !== customerId) {
        return log('subscription metadata names a user linked to another customer, skipped', {
          subscription: sub.id,
          customer: customerId,
        });
      }
      await store.linkCustomer(userId, customerId);
      row = await store.findByCustomerId(customerId);
      if (!row) return;
    }

    // One subscription per user: an old, dead subscription must not overwrite a live one.
    const now = new Date();
    const fields = subscriptionFields(sub);
    if (
      row.stripeSubscriptionId &&
      row.stripeSubscriptionId !== sub.id &&
      isPaidSubscription(row, now) &&
      !isPaidSubscription(fields, now)
    ) {
      return log('stale subscription ignored; user has another live subscription', {
        userId: row.userId,
        subscription: sub.id,
      });
    }

    await store.saveSubscription(row.userId, customerId, fields);
    log('subscription saved', { userId: row.userId, subscription: sub.id, status: sub.status });
  };
}

/**
 * Work out what an event should change. Subscription state is re-read from Stripe rather than
 * taken from the payload, so out-of-order or replayed deliveries always converge on Stripe's
 * current state.
 */
async function prepare(event: Stripe.Event, deps: Required<WebhookDeps>): Promise<Apply | null> {
  const { stripe, log } = deps;
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.mode !== 'subscription') return null;
      const userId = session.client_reference_id;
      const customerId = idOf(session.customer);
      const subscriptionId = idOf(session.subscription);
      if (!userId || !customerId) {
        log('checkout session without user or customer, skipped', { session: session.id });
        return null;
      }
      const sub = subscriptionId ? await stripe.subscriptions.retrieve(subscriptionId) : null;
      return async (store) => {
        const byCustomer = await store.findByCustomerId(customerId);
        if (byCustomer && byCustomer.userId !== userId) {
          return log('checkout customer belongs to another user, skipped', { session: session.id });
        }
        if (!byCustomer) {
          if (!(await store.userExists(userId))) {
            return log('checkout for unknown user, skipped', { session: session.id });
          }
          const existing = await store.getSubscription(userId);
          if (existing && existing.stripeCustomerId !== customerId) {
            return log('checkout user is linked to another customer, skipped', {
              session: session.id,
            });
          }
          await store.linkCustomer(userId, customerId);
        }
        if (sub) await applySubscription(sub, log)(store);
      };
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const payload = event.data.object;
      const sub = await stripe.subscriptions.retrieve(payload.id);
      return applySubscription(sub, log);
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const subscriptionId = idOf(invoice.parent?.subscription_details?.subscription);
      log('invoice payment failed', {
        invoice: invoice.id,
        customer: idOf(invoice.customer),
        subscription: subscriptionId,
      });
      if (!subscriptionId) return null;
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      return applySubscription(sub, log);
    }

    default:
      return null;
  }
}

/**
 * Apply a verified Stripe event exactly once. Network reads happen before the transaction; the
 * event id is recorded in the same transaction as the writes, so a failure rolls both back and
 * Stripe's retry processes the event again.
 */
export async function handleStripeEvent(
  event: Stripe.Event,
  deps: WebhookDeps,
): Promise<WebhookOutcome> {
  const full: Required<WebhookDeps> = { log: defaultLog, ...deps };
  // Fast path for redeliveries; runEventOnce below is the authoritative check.
  if (await full.store.isEventProcessed(event.id)) {
    full.log('duplicate event ignored', { id: event.id, type: event.type });
    return 'duplicate';
  }
  const apply = await prepare(event, full);
  const ran = await full.store.runEventOnce(event.id, event.type, async (store) => {
    if (apply) await apply(store);
  });
  if (!ran) full.log('duplicate event ignored', { id: event.id, type: event.type });
  return ran ? 'processed' : 'duplicate';
}
