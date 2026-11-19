import Stripe from 'stripe';
import { vi } from 'vitest';

import type { StripeClient } from '../stripe';

export const TEST_WEBHOOK_SECRET = 'whsec_test_secret';

/** Signature verification is pure HMAC, so the real implementation runs offline. */
const webhooks = Stripe.webhooks;

export function signedPayload(event: object, secret = TEST_WEBHOOK_SECRET) {
  const payload = JSON.stringify(event);
  const signature = webhooks.generateTestHeaderString({ payload, secret });
  return { payload, signature };
}

export function subscription(
  overrides: {
    id?: string;
    customer?: string;
    status?: Stripe.Subscription.Status;
    priceId?: string;
    periodStart?: string;
    periodEnd?: string;
    cancelAtPeriodEnd?: boolean;
    metadata?: Record<string, string>;
  } = {},
): Stripe.Subscription {
  const start = Math.floor(
    new Date(overrides.periodStart ?? '2026-11-05T00:00:00Z').getTime() / 1000,
  );
  const end = Math.floor(new Date(overrides.periodEnd ?? '2026-12-05T00:00:00Z').getTime() / 1000);
  return {
    id: overrides.id ?? 'sub_1',
    object: 'subscription',
    customer: overrides.customer ?? 'cus_1',
    status: overrides.status ?? 'active',
    cancel_at_period_end: overrides.cancelAtPeriodEnd ?? false,
    metadata: overrides.metadata ?? {},
    items: {
      object: 'list',
      has_more: false,
      url: '/v1/subscription_items',
      data: [
        {
          id: 'si_1',
          object: 'subscription_item',
          price: { id: overrides.priceId ?? 'price_test' },
          current_period_start: start,
          current_period_end: end,
        },
      ],
    },
  } as unknown as Stripe.Subscription;
}

export function event<T extends Stripe.Event['type']>(
  id: string,
  type: T,
  object: object,
): Stripe.Event {
  return {
    id,
    object: 'event',
    type,
    api_version: '2025-07-30.basil',
    created: 1795000000,
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    data: { object },
  } as unknown as Stripe.Event;
}

export function createFakeStripe() {
  const subscriptions = new Map<string, Stripe.Subscription>();
  const fake = {
    webhooks: { constructEvent: webhooks.constructEvent.bind(webhooks) },
    customers: {
      create: vi.fn(async (params: Stripe.CustomerCreateParams) => ({
        id: 'cus_new',
        object: 'customer',
        ...params,
      })),
    },
    subscriptions: {
      retrieve: vi.fn(async (id: string) => {
        const sub = subscriptions.get(id);
        if (!sub) throw new Error(`No such subscription: ${id}`);
        return sub;
      }),
    },
    checkout: {
      sessions: {
        create: vi.fn(async (_params: Stripe.Checkout.SessionCreateParams) => ({
          id: 'cs_test_1',
          url: 'https://checkout.stripe.test/cs_test_1',
        })),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn(async (_params: Stripe.BillingPortal.SessionCreateParams) => ({
          id: 'bps_1',
          url: 'https://billing.stripe.test/bps_1',
        })),
      },
    },
  };
  return {
    client: fake as unknown as StripeClient,
    fake,
    setSubscription: (sub: Stripe.Subscription) => {
      subscriptions.set(sub.id, sub);
    },
  };
}
