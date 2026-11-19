import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  env: {} as Record<string, string | number | undefined>,
  session: null as null | {
    user: { id: string; email?: string; name?: string };
    sessionVerified?: boolean;
  },
  stripe: null as unknown,
  store: null as unknown,
}));

vi.mock('~/env', () => ({ env: state.env }));
vi.mock('~/server/auth', async () => {
  const { checkWriteSession } = await import('~/server/auth/write-session');
  return {
    auth: vi.fn(async () => state.session),
    requireWriteSession: vi.fn(async () => checkWriteSession(state.session as never)),
  };
});
vi.mock('~/server/billing', () => ({
  get billingStore() {
    return state.store;
  },
}));
vi.mock('~/server/billing/stripe', () => ({ getStripe: () => state.stripe }));

import { createFakeStripe } from '~/server/billing/testing/fake-stripe';
import { createMemoryBillingStore } from '~/server/billing/testing/memory-store';

import { POST as portal } from '../portal/route';
import { POST as checkout } from './route';

const BASE_ENV = {
  STRIPE_SECRET_KEY: 'sk_test_placeholder',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
  STRIPE_PRICE_ID: 'price_test',
  APP_URL: 'https://app.example',
  BILLING_FREE_DISCOVERIES_PER_MONTH: 2,
  BILLING_PRO_DISCOVERIES_PER_MONTH: 50,
  BILLING_FREE_MONITORED_PRODUCTS: 5,
  BILLING_PRO_MONITORED_PRODUCTS: 200,
};

let mem: ReturnType<typeof createMemoryBillingStore>;
let stripe: ReturnType<typeof createFakeStripe>;

beforeEach(() => {
  for (const key of Object.keys(state.env)) delete state.env[key];
  Object.assign(state.env, BASE_ENV);
  state.session = { user: { id: 'user-alice', email: 'alice@example.com', name: 'Alice' } };
  mem = createMemoryBillingStore({ users: ['user-alice'] });
  stripe = createFakeStripe();
  state.store = mem.store;
  state.stripe = stripe.client;
});

describe('POST /api/billing/checkout', () => {
  it('requires a session', async () => {
    state.session = null;
    expect((await checkout()).status).toBe(401);
  });

  it('answers 503 without touching Stripe when the session version could not be confirmed', async () => {
    state.session = { ...state.session!, sessionVerified: false };

    const res = await checkout();

    expect(res.status).toBe(503);
    expect(stripe.fake.customers.create).not.toHaveBeenCalled();
    expect(stripe.fake.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('answers 503 "billing not configured" without STRIPE_SECRET_KEY and never calls Stripe', async () => {
    delete state.env.STRIPE_SECRET_KEY;
    state.stripe = new Proxy(
      {},
      {
        get: () => {
          throw new Error('Stripe must not be touched');
        },
      },
    );

    const res = await checkout();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'billing not configured' });
  });

  it.each(['STRIPE_PRICE_ID', 'STRIPE_WEBHOOK_SECRET'])(
    'answers 503 and never calls Stripe when only %s is missing',
    async (name) => {
      delete state.env[name];
      const res = await checkout();
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: 'billing not configured' });
      expect(stripe.fake.customers.create).not.toHaveBeenCalled();
      expect(stripe.fake.checkout.sessions.create).not.toHaveBeenCalled();
    },
  );

  it('creates a customer once and a subscription checkout for the user', async () => {
    const res = await checkout();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.test/cs_test_1' });
    expect(mem.subscriptions.get('user-alice')?.checkoutSessionId).toBe('cs_test_1');
    expect(stripe.fake.customers.create).toHaveBeenCalledWith(
      { email: 'alice@example.com', name: 'Alice', metadata: { userId: 'user-alice' } },
      { idempotencyKey: 'sagelytics-customer-user-alice' },
    );
    expect(mem.subscriptions.get('user-alice')?.stripeCustomerId).toBe('cus_new');

    const params = stripe.fake.checkout.sessions.create.mock.calls[0]![0];
    expect(params).toMatchObject({
      mode: 'subscription',
      customer: 'cus_new',
      client_reference_id: 'user-alice',
      line_items: [{ price: 'price_test', quantity: 1 }],
      subscription_data: { metadata: { userId: 'user-alice' } },
    });
    expect(params.success_url).toBe(
      'https://app.example/settings?tab=billing&checkout=success&session_id={CHECKOUT_SESSION_ID}',
    );
    expect(params.cancel_url).toBe('https://app.example/settings?tab=billing&checkout=cancelled');

    const again = await checkout();
    expect(await again.json()).toEqual({ url: 'https://checkout.stripe.test/cs_test_1' });
    expect(stripe.fake.customers.create).toHaveBeenCalledTimes(1);
    expect(stripe.fake.checkout.sessions.create).toHaveBeenCalledTimes(1);
  });

  it('falls back to NEXTAUTH_URL for redirects', async () => {
    delete state.env.APP_URL;
    state.env.NEXTAUTH_URL = 'https://auth.example';
    await checkout();
    expect(stripe.fake.checkout.sessions.create.mock.calls[0]![0].cancel_url).toMatch(
      /^https:\/\/auth\.example\/settings/,
    );
  });

  it('answers 409 for a user who is already subscribed', async () => {
    await mem.store.saveSubscription('user-alice', 'cus_alice', {
      stripeSubscriptionId: 'sub_1',
      status: 'active',
      priceId: 'price_test',
      currentPeriodStart: new Date('2026-11-01T00:00:00Z'),
      currentPeriodEnd: new Date('2099-01-01T00:00:00Z'),
      cancelAtPeriodEnd: false,
    });
    const res = await checkout();
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: expect.stringContaining('already subscribed'),
      portalUrl: 'https://billing.stripe.test/bps_1',
    });
    expect(stripe.fake.checkout.sessions.create).not.toHaveBeenCalled();
  });
});

describe('POST /api/billing/portal', () => {
  it('answers 503 when billing is disabled', async () => {
    delete state.env.STRIPE_SECRET_KEY;
    expect((await portal()).status).toBe(503);
  });

  it('answers 503 on partial config (no webhook secret)', async () => {
    delete state.env.STRIPE_WEBHOOK_SECRET;
    await mem.store.linkCustomer('user-alice', 'cus_alice');
    expect((await portal()).status).toBe(503);
  });

  it('answers 409 for a user without a Stripe customer', async () => {
    expect((await portal()).status).toBe(409);
    expect(stripe.fake.billingPortal.sessions.create).not.toHaveBeenCalled();
  });

  it('opens the portal for the linked customer', async () => {
    await mem.store.linkCustomer('user-alice', 'cus_alice');
    const res = await portal();
    expect(await res.json()).toEqual({ url: 'https://billing.stripe.test/bps_1' });
    expect(stripe.fake.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: 'cus_alice',
      return_url: 'https://app.example/settings?tab=billing',
    });
  });
});
