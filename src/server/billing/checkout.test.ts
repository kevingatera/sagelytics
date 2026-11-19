import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('~/env', () => ({ env: {} }));

import {
  CHECKOUT_IN_PROGRESS,
  CHECKOUT_SESSION_TTL_MS,
  CHECKOUT_STRIPE_REQUEST,
  createCheckoutSession,
} from './checkout';
import type { BillingConfig } from './config';
import { createFakeStripe, subscription } from './testing/fake-stripe';
import { createMemoryBillingStore } from './testing/memory-store';

const ALICE = { id: 'user-alice', email: 'alice@example.com', name: 'Alice' };
const NOW = new Date('2026-11-18T12:00:00Z');
const nowSec = Math.floor(NOW.getTime() / 1000);

const CONFIG: BillingConfig = {
  enabled: true,
  webhookSecret: 'whsec_test',
  priceId: 'price_test',
  appUrl: 'https://app.example',
  limits: {
    free: { discoveriesPerPeriod: 2, monitoredProducts: 5 },
    pro: { discoveriesPerPeriod: 50, monitoredProducts: 200 },
  },
};

let mem: ReturnType<typeof createMemoryBillingStore>;
let stripe: ReturnType<typeof createFakeStripe>;
let now: Date;

function checkout() {
  return createCheckoutSession(ALICE, {
    stripe: () => stripe.client,
    store: mem.store,
    config: CONFIG,
    now: () => now,
  });
}

beforeEach(() => {
  now = NOW;
  mem = createMemoryBillingStore({ users: [ALICE.id], now: () => now });
  stripe = createFakeStripe();
});

describe('createCheckoutSession', () => {
  it('creates a 30-minute session with an attempt-scoped idempotency key and stores it', async () => {
    const result = await checkout();

    expect(result).toEqual({ ok: true, url: 'https://checkout.stripe.test/cs_test_1' });
    const [params, opts] = stripe.fake.checkout.sessions.create.mock.calls[0]!;
    expect(params.expires_at).toBe(Math.floor((NOW.getTime() + CHECKOUT_SESSION_TTL_MS) / 1000));
    expect(params.expires_at! - nowSec).toBeGreaterThanOrEqual(30 * 60);
    expect(opts).toEqual({
      ...CHECKOUT_STRIPE_REQUEST,
      idempotencyKey: 'sagelytics-checkout-user-alice-1',
    });
    expect(CHECKOUT_STRIPE_REQUEST.timeout).toBeLessThanOrEqual(10_000);
    expect(mem.subscriptions.get(ALICE.id)).toMatchObject({
      checkoutSessionId: 'cs_test_1',
      checkoutAttempt: 1,
    });
    expect(mem.subscriptions.get(ALICE.id)?.checkoutSessionExpiresAt?.getTime()).toBe(
      params.expires_at! * 1000,
    );
  });

  it('refuses a user with a paid subscription and returns a portal URL instead', async () => {
    await mem.store.saveSubscription(ALICE.id, 'cus_alice', {
      stripeSubscriptionId: 'sub_1',
      status: 'active',
      priceId: 'price_test',
      currentPeriodStart: new Date('2026-11-05T00:00:00Z'),
      currentPeriodEnd: new Date('2026-12-05T00:00:00Z'),
      paidPeriodStart: new Date('2026-11-05T00:00:00Z'),
      paidPeriodEnd: new Date('2026-12-05T00:00:00Z'),
      cancelAtPeriodEnd: false,
    });

    const result = await checkout();

    expect(result).toMatchObject({
      ok: false,
      status: 409,
      portalUrl: 'https://billing.stripe.test/bps_1',
    });
    expect(stripe.fake.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_alice' }),
      CHECKOUT_STRIPE_REQUEST,
    );
    expect(stripe.fake.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it.each(['past_due', 'unpaid', 'paused'])(
    'refuses a %s subscriber even after the paid period, since Stripe can still bill them',
    async (status) => {
      await mem.store.saveSubscription(ALICE.id, 'cus_alice', {
        stripeSubscriptionId: 'sub_1',
        status,
        priceId: 'price_test',
        currentPeriodStart: new Date('2026-09-05T00:00:00Z'),
        currentPeriodEnd: new Date('2026-10-05T00:00:00Z'),
        paidPeriodStart: new Date('2026-09-05T00:00:00Z'),
        paidPeriodEnd: new Date('2026-10-05T00:00:00Z'),
        cancelAtPeriodEnd: false,
      });
      expect(await checkout()).toMatchObject({ ok: false, status: 409 });
      expect(stripe.fake.checkout.sessions.create).not.toHaveBeenCalled();
    },
  );

  it('refuses when Stripe has a live subscription our row has not heard about yet', async () => {
    await mem.store.linkCustomer(ALICE.id, 'cus_alice');
    stripe.setSubscription(subscription({ id: 'sub_missed', customer: 'cus_alice' }));
    expect(await checkout()).toMatchObject({ ok: false, status: 409 });
    expect(stripe.fake.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('lets a former subscriber whose subscription is canceled and over check out again', async () => {
    await mem.store.saveSubscription(ALICE.id, 'cus_alice', {
      stripeSubscriptionId: 'sub_old',
      status: 'canceled',
      priceId: 'price_test',
      currentPeriodStart: new Date('2026-09-05T00:00:00Z'),
      currentPeriodEnd: new Date('2026-10-05T00:00:00Z'),
      paidPeriodStart: new Date('2026-09-05T00:00:00Z'),
      paidPeriodEnd: new Date('2026-10-05T00:00:00Z'),
      cancelAtPeriodEnd: false,
    });
    stripe.setSubscription(
      subscription({ id: 'sub_old', customer: 'cus_alice', status: 'canceled' }),
    );
    expect(await checkout()).toMatchObject({ ok: true });
    expect(stripe.fake.checkout.sessions.create.mock.calls[0]![0].customer).toBe('cus_alice');
  });

  it('reuses the open, unexpired session instead of creating another', async () => {
    const first = await checkout();
    now = new Date(NOW.getTime() + 10 * 60 * 1000);
    const second = await checkout();

    expect(second).toEqual(first);
    expect(stripe.fake.checkout.sessions.create).toHaveBeenCalledTimes(1);
    expect(stripe.fake.checkout.sessions.retrieve).toHaveBeenCalledWith(
      'cs_test_1',
      {},
      CHECKOUT_STRIPE_REQUEST,
    );
  });

  it('answers concurrent clicks with a fast "in progress" instead of queueing on the lock', async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => checkout()));
    expect(results.filter((r) => r.ok)).toEqual([
      { ok: true, url: 'https://checkout.stripe.test/cs_test_1' },
    ]);
    expect(results.filter((r) => !r.ok)).toEqual(
      Array.from({ length: 4 }, () => ({ ok: false, status: 409, error: CHECKOUT_IN_PROGRESS })),
    );
    expect(stripe.fake.checkout.sessions.create).toHaveBeenCalledTimes(1);

    // Once the first one is done, the next click gets the same session back.
    expect(await checkout()).toEqual({ ok: true, url: 'https://checkout.stripe.test/cs_test_1' });
  });

  it('does not wait for a slow Stripe call held by another request', async () => {
    let release!: () => void;
    const original = stripe.fake.customers.create.getMockImplementation()!;
    stripe.fake.customers.create.mockImplementationOnce(async (...args) => {
      await new Promise<void>((resolve) => (release = resolve));
      return original(...args);
    });
    const slow = checkout();
    await vi.waitFor(() => expect(stripe.fake.customers.create).toHaveBeenCalledTimes(1));

    const started = Date.now();
    expect(await checkout()).toEqual({ ok: false, status: 409, error: CHECKOUT_IN_PROGRESS });
    expect(Date.now() - started).toBeLessThan(100);

    release();
    expect(await slow).toMatchObject({ ok: true });
  });

  it('replaces an expired session with a new one under the next attempt key', async () => {
    await checkout();
    stripe.sessions.get('cs_test_1')!.status = 'expired';
    now = new Date(NOW.getTime() + 40 * 60 * 1000);

    const result = await checkout();

    expect(result).toEqual({ ok: true, url: 'https://checkout.stripe.test/cs_test_2' });
    expect(stripe.fake.checkout.sessions.create.mock.calls[1]![1]).toEqual({
      ...CHECKOUT_STRIPE_REQUEST,
      idempotencyKey: 'sagelytics-checkout-user-alice-2',
    });
    expect(mem.subscriptions.get(ALICE.id)).toMatchObject({
      checkoutSessionId: 'cs_test_2',
      checkoutAttempt: 2,
    });
  });

  it('expires a session about to lapse before handing out a fresh one', async () => {
    await checkout();
    now = new Date(NOW.getTime() + 30 * 60 * 1000);

    const result = await checkout();

    expect(stripe.fake.checkout.sessions.expire).toHaveBeenCalledWith(
      'cs_test_1',
      {},
      CHECKOUT_STRIPE_REQUEST,
    );
    expect(result).toEqual({ ok: true, url: 'https://checkout.stripe.test/cs_test_2' });
  });

  it('starts over when the stored session no longer exists in Stripe', async () => {
    await checkout();
    stripe.sessions.delete('cs_test_1');
    stripe.fake.checkout.sessions.retrieve.mockRejectedValueOnce(
      Object.assign(new Error('No such checkout.session'), { code: 'resource_missing' }),
    );

    expect(await checkout()).toEqual({ ok: true, url: 'https://checkout.stripe.test/cs_test_2' });
    expect(mem.subscriptions.get(ALICE.id)?.checkoutSessionId).toBe('cs_test_2');
  });

  it('refuses while a completed session waits for its webhook', async () => {
    await checkout();
    stripe.sessions.get('cs_test_1')!.status = 'complete';
    expect(await checkout()).toMatchObject({ ok: false, status: 409 });
    expect(stripe.fake.checkout.sessions.create).toHaveBeenCalledTimes(1);
  });

  it('moves to the next attempt key if Stripe reports an idempotency conflict', async () => {
    const original = stripe.fake.checkout.sessions.create.getMockImplementation()!;
    stripe.fake.checkout.sessions.create.mockImplementationOnce(async () => {
      throw Object.assign(
        new Error('Keys for idempotent requests can only be used with the same parameters'),
        {
          type: 'StripeIdempotencyError',
        },
      );
    });
    stripe.fake.checkout.sessions.create.mockImplementation(original);

    const result = await checkout();

    expect(result).toMatchObject({ ok: true });
    expect(stripe.fake.checkout.sessions.create.mock.calls.map((call) => call[1])).toEqual([
      { ...CHECKOUT_STRIPE_REQUEST, idempotencyKey: 'sagelytics-checkout-user-alice-1' },
      { ...CHECKOUT_STRIPE_REQUEST, idempotencyKey: 'sagelytics-checkout-user-alice-2' },
    ]);
    expect(mem.subscriptions.get(ALICE.id)?.checkoutAttempt).toBe(2);
  });

  it('never calls Stripe when billing is not configured', async () => {
    const result = await createCheckoutSession(ALICE, {
      stripe: () => {
        throw new Error('Stripe must not be touched');
      },
      store: mem.store,
      config: { ...CONFIG, webhookSecret: null },
    });
    expect(result).toEqual({ ok: false, status: 503, error: 'billing not configured' });
  });
});
