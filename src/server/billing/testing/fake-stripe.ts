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
    /** Unix seconds. */
    created?: number;
    latestInvoice?: string | null;
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
    created: overrides.created ?? start,
    latest_invoice: overrides.latestInvoice ?? null,
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

export interface FakeCheckoutSession {
  id: string;
  url: string | null;
  status: Stripe.Checkout.Session.Status;
  expires_at: number;
}

export function createFakeStripe() {
  const subscriptions = new Map<string, Stripe.Subscription>();
  const sessions = new Map<string, FakeCheckoutSession>();
  const invoices = new Map<string, Stripe.Invoice>();
  let nextSession = 1;
  const fake = {
    webhooks: { constructEvent: webhooks.constructEvent.bind(webhooks) },
    customers: {
      create: vi.fn(async (params: Stripe.CustomerCreateParams, _opts?: Stripe.RequestOptions) => ({
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
      list: vi.fn(async (params: Stripe.SubscriptionListParams) => ({
        object: 'list',
        has_more: false,
        data: [...subscriptions.values()].filter(
          (sub) => !params.customer || sub.customer === params.customer,
        ),
      })),
      cancel: vi.fn(
        async (
          id: string,
          _params?: Stripe.SubscriptionCancelParams,
          _opts?: Stripe.RequestOptions,
        ) => {
          const sub = subscriptions.get(id);
          if (!sub) throw new Error(`No such subscription: ${id}`);
          const canceled = { ...sub, status: 'canceled' } as Stripe.Subscription;
          subscriptions.set(id, canceled);
          return canceled;
        },
      ),
    },
    invoices: {
      retrieve: vi.fn(async (id: string, _params?: Stripe.InvoiceRetrieveParams) => {
        const invoice = invoices.get(id);
        if (!invoice) throw new Error(`No such invoice: ${id}`);
        return invoice;
      }),
      voidInvoice: vi.fn(async (id: string) => ({ id, status: 'void' })),
    },
    refunds: {
      create: vi.fn(async (params: Stripe.RefundCreateParams, _opts?: Stripe.RequestOptions) => ({
        id: 're_1',
        object: 'refund',
        ...params,
      })),
    },
    checkout: {
      sessions: {
        create: vi.fn(
          async (params: Stripe.Checkout.SessionCreateParams, _opts?: Stripe.RequestOptions) => {
            const id = `cs_test_${nextSession++}`;
            const session: FakeCheckoutSession = {
              id,
              url: `https://checkout.stripe.test/${id}`,
              status: 'open',
              expires_at: params.expires_at ?? Math.floor(Date.now() / 1000) + 24 * 3600,
            };
            sessions.set(id, session);
            return session;
          },
        ),
        retrieve: vi.fn(async (id: string) => {
          const session = sessions.get(id);
          if (!session) throw new Error(`No such checkout.session: ${id}`);
          return session;
        }),
        expire: vi.fn(async (id: string) => {
          const session = sessions.get(id);
          if (!session) throw new Error(`No such checkout.session: ${id}`);
          session.status = 'expired';
          session.url = null;
          return session;
        }),
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
    sessions,
    setSubscription: (sub: Stripe.Subscription) => {
      subscriptions.set(sub.id, sub);
    },
    setInvoice: (invoice: Partial<Stripe.Invoice> & { id: string }) => {
      invoices.set(invoice.id, invoice as Stripe.Invoice);
    },
  };
}
