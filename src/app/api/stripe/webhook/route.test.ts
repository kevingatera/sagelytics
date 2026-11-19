import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  env: {} as Record<string, string | number | undefined>,
  stripe: null as unknown,
  store: null as unknown,
}));

vi.mock('~/env', () => ({ env: state.env }));
vi.mock('~/server/billing', () => ({
  get billingStore() {
    return state.store;
  },
}));
vi.mock('~/server/billing/stripe', () => ({ getStripe: () => state.stripe }));

import {
  createFakeStripe,
  event,
  signedPayload,
  subscription,
  TEST_WEBHOOK_SECRET,
} from '~/server/billing/testing/fake-stripe';
import { createMemoryBillingStore } from '~/server/billing/testing/memory-store';

import { POST } from './route';

const BASE_ENV = {
  STRIPE_SECRET_KEY: 'sk_test_placeholder',
  STRIPE_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
  STRIPE_PRICE_ID: 'price_test',
  APP_URL: 'https://app.example',
  BILLING_FREE_DISCOVERIES_PER_MONTH: 2,
  BILLING_PRO_DISCOVERIES_PER_MONTH: 50,
  BILLING_FREE_MONITORED_PRODUCTS: 5,
  BILLING_PRO_MONITORED_PRODUCTS: 200,
};

let mem: ReturnType<typeof createMemoryBillingStore>;
let stripe: ReturnType<typeof createFakeStripe>;

function webhookRequest(payload: string, signature?: string) {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (signature) headers.set('stripe-signature', signature);
  return new Request('http://localhost/api/stripe/webhook', {
    method: 'POST',
    body: payload,
    headers,
  });
}

beforeEach(async () => {
  for (const key of Object.keys(state.env)) delete state.env[key];
  Object.assign(state.env, BASE_ENV);
  mem = createMemoryBillingStore({ users: ['user-alice'] });
  stripe = createFakeStripe();
  state.store = mem.store;
  state.stripe = stripe.client;
  await mem.store.linkCustomer('user-alice', 'cus_alice');
  stripe.setSubscription(subscription({ id: 'sub_1', customer: 'cus_alice' }));
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

describe('POST /api/stripe/webhook', () => {
  it('rejects a bad signature with 400 and changes nothing', async () => {
    const { payload } = signedPayload(
      event('evt_1', 'customer.subscription.updated', { id: 'sub_1' }),
    );
    const { signature } = signedPayload({ other: true });

    const res = await POST(webhookRequest(payload, signature));

    expect(res.status).toBe(400);
    expect(mem.events.size).toBe(0);
    expect(stripe.fake.subscriptions.retrieve).not.toHaveBeenCalled();
  });

  it('rejects a payload signed with another secret', async () => {
    const { payload, signature } = signedPayload(
      event('evt_1', 'customer.subscription.updated', { id: 'sub_1' }),
      'whsec_attacker',
    );
    expect((await POST(webhookRequest(payload, signature))).status).toBe(400);
  });

  it('rejects a request without a stripe-signature header', async () => {
    expect((await POST(webhookRequest('{}'))).status).toBe(400);
  });

  it('processes a signed event once and acknowledges the duplicate', async () => {
    const { payload, signature } = signedPayload(
      event('evt_1', 'customer.subscription.updated', { id: 'sub_1' }),
    );

    const first = await POST(webhookRequest(payload, signature));
    const second = await POST(webhookRequest(payload, signature));

    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ received: true, outcome: 'processed' });
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ received: true, outcome: 'duplicate' });
    expect(stripe.fake.subscriptions.retrieve).toHaveBeenCalledTimes(1);
    expect(mem.subscriptions.get('user-alice')?.status).toBe('active');
  });

  it('returns 500 so Stripe retries when handling fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { payload, signature } = signedPayload(
      event('evt_1', 'customer.subscription.updated', { id: 'sub_missing' }),
    );
    expect((await POST(webhookRequest(payload, signature))).status).toBe(500);
    expect(mem.events.size).toBe(0);
  });

  it('answers 500 while a duplicate refund is owed, then refunds once on the retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    stripe.payPeriod(subscription({ id: 'sub_1', customer: 'cus_alice' }));
    stripe.setSubscription(
      subscription({ id: 'sub_1', customer: 'cus_alice', created: 1_794_000_000 }),
    );
    stripe.setSubscription(
      subscription({
        id: 'sub_2',
        customer: 'cus_alice',
        created: 1_794_003_600,
        latestInvoice: 'in_2',
      }),
    );
    stripe.setInvoice({
      id: 'in_2',
      status: 'paid',
      payments: {
        object: 'list',
        has_more: false,
        url: '',
        data: [{ status: 'paid', payment: { type: 'payment_intent', payment_intent: 'pi_2' } }],
      } as never,
    });
    stripe.fake.refunds.create.mockRejectedValueOnce(new Error('stripe 500'));
    const { payload, signature } = signedPayload(
      event('evt_dup', 'checkout.session.completed', {
        id: 'cs_2',
        mode: 'subscription',
        client_reference_id: 'user-alice',
        customer: 'cus_alice',
        subscription: 'sub_2',
      }),
    );

    const first = await POST(webhookRequest(payload, signature));
    expect(first.status).toBe(500);

    const retry = await POST(webhookRequest(payload, signature));
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ received: true, outcome: 'duplicate' });
    expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(2);
    expect(
      new Set(stripe.fake.refunds.create.mock.calls.map((call) => call[1]?.idempotencyKey)),
    ).toEqual(new Set(['sagelytics-duplicate-refund-sub_2']));
    expect(mem.refunds.get('sub_2')).toMatchObject({ status: 'refunded', refundId: 're_1' });

    expect((await POST(webhookRequest(payload, signature))).status).toBe(200);
    expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(2);
  });

  it('answers 503 when billing is not configured', async () => {
    delete state.env.STRIPE_SECRET_KEY;
    const { payload, signature } = signedPayload(
      event('evt_1', 'customer.subscription.updated', { id: 'sub_1' }),
    );
    expect((await POST(webhookRequest(payload, signature))).status).toBe(503);
  });
});
