import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resolvePlan } from './plans';
import { createFakeStripe, event, subscription } from './testing/fake-stripe';
import { createMemoryBillingStore } from './testing/memory-store';
import { handleStripeEvent } from './webhook';

const ALICE = 'user-alice';
const BOB = 'user-bob';
const LIMITS = {
  free: { discoveriesPerPeriod: 2, monitoredProducts: 5 },
  pro: { discoveriesPerPeriod: 50, monitoredProducts: 200 },
};
const NOW = new Date('2026-11-18T12:00:00Z');

let mem: ReturnType<typeof createMemoryBillingStore>;
let stripe: ReturnType<typeof createFakeStripe>;
const log = () => undefined;

function handle(e: ReturnType<typeof event>) {
  return handleStripeEvent(e, { stripe: stripe.client, store: mem.store, log });
}

function planOf(userId: string) {
  return resolvePlan(mem.subscriptions.get(userId) ?? null, NOW, LIMITS, true).plan;
}

beforeEach(() => {
  mem = createMemoryBillingStore({ users: [ALICE, BOB] });
  stripe = createFakeStripe();
});

describe('checkout.session.completed', () => {
  it('links the customer to client_reference_id and stores the subscription', async () => {
    stripe.setSubscription(subscription({ id: 'sub_1', customer: 'cus_alice' }));
    const outcome = await handle(
      event('evt_1', 'checkout.session.completed', {
        id: 'cs_1',
        mode: 'subscription',
        client_reference_id: ALICE,
        customer: 'cus_alice',
        subscription: 'sub_1',
      }),
    );

    expect(outcome).toBe('processed');
    expect(mem.subscriptions.get(ALICE)).toMatchObject({
      stripeCustomerId: 'cus_alice',
      stripeSubscriptionId: 'sub_1',
      status: 'active',
      priceId: 'price_test',
      cancelAtPeriodEnd: false,
    });
    expect(mem.subscriptions.get(ALICE)?.currentPeriodEnd?.toISOString()).toBe(
      '2026-12-05T00:00:00.000Z',
    );
    expect(planOf(ALICE)).toBe('pro');
  });

  it('refuses to move a customer that already belongs to another user', async () => {
    await mem.store.linkCustomer(ALICE, 'cus_alice');
    stripe.setSubscription(subscription({ id: 'sub_1', customer: 'cus_alice' }));
    await handle(
      event('evt_1', 'checkout.session.completed', {
        id: 'cs_1',
        mode: 'subscription',
        client_reference_id: BOB,
        customer: 'cus_alice',
        subscription: 'sub_1',
      }),
    );

    expect(mem.subscriptions.has(BOB)).toBe(false);
    expect(mem.subscriptions.get(ALICE)?.stripeSubscriptionId).toBeNull();
  });

  it('ignores an unknown client_reference_id', async () => {
    stripe.setSubscription(subscription({ id: 'sub_1', customer: 'cus_x' }));
    await handle(
      event('evt_1', 'checkout.session.completed', {
        id: 'cs_1',
        mode: 'subscription',
        client_reference_id: 'user-nobody',
        customer: 'cus_x',
        subscription: 'sub_1',
      }),
    );
    expect(mem.subscriptions.size).toBe(0);
  });
});

describe('subscription lifecycle', () => {
  beforeEach(async () => {
    await mem.store.linkCustomer(ALICE, 'cus_alice');
  });

  it('applies created → updated (cancel at period end) → deleted', async () => {
    stripe.setSubscription(subscription({ id: 'sub_1', customer: 'cus_alice', status: 'active' }));
    await handle(event('evt_1', 'customer.subscription.created', { id: 'sub_1' }));
    expect(planOf(ALICE)).toBe('pro');

    stripe.setSubscription(
      subscription({
        id: 'sub_1',
        customer: 'cus_alice',
        status: 'active',
        cancelAtPeriodEnd: true,
      }),
    );
    await handle(event('evt_2', 'customer.subscription.updated', { id: 'sub_1' }));
    expect(mem.subscriptions.get(ALICE)).toMatchObject({
      status: 'active',
      cancelAtPeriodEnd: true,
    });
    expect(planOf(ALICE)).toBe('pro');

    stripe.setSubscription(
      subscription({
        id: 'sub_1',
        customer: 'cus_alice',
        status: 'canceled',
        periodStart: '2026-10-05T00:00:00Z',
        periodEnd: '2026-11-05T00:00:00Z',
      }),
    );
    await handle(event('evt_3', 'customer.subscription.deleted', { id: 'sub_1' }));
    expect(mem.subscriptions.get(ALICE)).toMatchObject({
      status: 'canceled',
      stripeCustomerId: 'cus_alice',
    });
    expect(planOf(ALICE)).toBe('free');
  });

  it('re-reads the subscription from Stripe instead of trusting the payload', async () => {
    stripe.setSubscription(
      subscription({ id: 'sub_1', customer: 'cus_alice', status: 'past_due' }),
    );
    await handle(
      event('evt_1', 'customer.subscription.updated', {
        id: 'sub_1',
        status: 'active',
        customer: 'cus_alice',
      }),
    );
    expect(stripe.fake.subscriptions.retrieve).toHaveBeenCalledWith('sub_1');
    expect(mem.subscriptions.get(ALICE)?.status).toBe('past_due');
  });

  it('records past_due on invoice.payment_failed', async () => {
    stripe.setSubscription(
      subscription({ id: 'sub_1', customer: 'cus_alice', status: 'past_due' }),
    );
    await handle(
      event('evt_1', 'invoice.payment_failed', {
        id: 'in_1',
        customer: 'cus_alice',
        parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_1' } },
      }),
    );
    expect(mem.subscriptions.get(ALICE)?.status).toBe('past_due');
  });

  it('does not let a stale canceled subscription overwrite a live one', async () => {
    stripe.setSubscription(
      subscription({ id: 'sub_new', customer: 'cus_alice', status: 'active' }),
    );
    await handle(event('evt_1', 'customer.subscription.created', { id: 'sub_new' }));

    stripe.setSubscription(
      subscription({
        id: 'sub_old',
        customer: 'cus_alice',
        status: 'canceled',
        periodEnd: '2026-11-01T00:00:00Z',
      }),
    );
    await handle(event('evt_2', 'customer.subscription.deleted', { id: 'sub_old' }));

    expect(mem.subscriptions.get(ALICE)).toMatchObject({
      stripeSubscriptionId: 'sub_new',
      status: 'active',
    });
  });

  it('skips a subscription for a customer we do not know', async () => {
    stripe.setSubscription(subscription({ id: 'sub_9', customer: 'cus_unknown' }));
    await handle(event('evt_1', 'customer.subscription.created', { id: 'sub_9' }));
    expect([...mem.subscriptions.values()].map((r) => r.stripeCustomerId)).toEqual(['cus_alice']);
  });

  it('links an unlinked customer via server-written subscription metadata', async () => {
    stripe.setSubscription(
      subscription({ id: 'sub_b', customer: 'cus_bob', metadata: { userId: BOB } }),
    );
    await handle(event('evt_1', 'customer.subscription.created', { id: 'sub_b' }));
    expect(mem.subscriptions.get(BOB)).toMatchObject({
      stripeCustomerId: 'cus_bob',
      status: 'active',
    });
  });

  it('will not use metadata to attach a second customer to a linked user', async () => {
    stripe.setSubscription(
      subscription({ id: 'sub_x', customer: 'cus_other', metadata: { userId: ALICE } }),
    );
    await handle(event('evt_1', 'customer.subscription.created', { id: 'sub_x' }));
    expect(mem.subscriptions.get(ALICE)).toMatchObject({
      stripeCustomerId: 'cus_alice',
      stripeSubscriptionId: null,
    });
  });
});

describe('idempotency', () => {
  beforeEach(async () => {
    await mem.store.linkCustomer(ALICE, 'cus_alice');
    stripe.setSubscription(subscription({ id: 'sub_1', customer: 'cus_alice' }));
  });

  it('processes a redelivered event once', async () => {
    const e = event('evt_dup', 'customer.subscription.updated', { id: 'sub_1' });
    expect(await handle(e)).toBe('processed');
    expect(await handle(e)).toBe('duplicate');
    expect(stripe.fake.subscriptions.retrieve).toHaveBeenCalledTimes(1);
    expect([...mem.events.keys()]).toEqual(['evt_dup']);
  });

  it('forgets the event id when processing fails so the retry runs', async () => {
    const e = event('evt_fail', 'customer.subscription.updated', { id: 'sub_1' });
    const failure = vi
      .spyOn(mem.store, 'saveSubscription')
      .mockRejectedValueOnce(new Error('db down'));
    await expect(handle(e)).rejects.toThrow('db down');
    expect(mem.events.has('evt_fail')).toBe(false);

    failure.mockRestore();
    expect(await handle(e)).toBe('processed');
  });

  it('records ignored event types so they are not reprocessed', async () => {
    expect(await handle(event('evt_other', 'customer.created', { id: 'cus_alice' }))).toBe(
      'processed',
    );
    expect(mem.events.get('evt_other')).toBe('customer.created');
  });
});

describe('duplicate subscription backstop', () => {
  const OLDER = 1_794_000_000;
  const NEWER = OLDER + 3600;

  beforeEach(async () => {
    await mem.store.linkCustomer(ALICE, 'cus_alice');
    stripe.setSubscription(
      subscription({ id: 'sub_first', customer: 'cus_alice', created: OLDER }),
    );
    await handle(event('evt_first', 'customer.subscription.created', { id: 'sub_first' }));
  });

  function completeSecondCheckout() {
    return handle(
      event('evt_dup', 'checkout.session.completed', {
        id: 'cs_2',
        mode: 'subscription',
        client_reference_id: ALICE,
        customer: 'cus_alice',
        subscription: 'sub_second',
      }),
    );
  }

  it('cancels and refunds the newer subscription, keeps the older one, and alerts', async () => {
    stripe.setSubscription(
      subscription({
        id: 'sub_second',
        customer: 'cus_alice',
        created: NEWER,
        latestInvoice: 'in_second',
      }),
    );
    stripe.setInvoice({
      id: 'in_second',
      status: 'paid',
      payments: {
        object: 'list',
        has_more: false,
        url: '',
        data: [
          {
            status: 'paid',
            payment: { type: 'payment_intent', payment_intent: 'pi_second' },
          },
        ],
      } as never,
    });
    const alert = vi.fn();

    await handleStripeEvent(
      event('evt_dup', 'checkout.session.completed', {
        id: 'cs_2',
        mode: 'subscription',
        client_reference_id: ALICE,
        customer: 'cus_alice',
        subscription: 'sub_second',
      }),
      { stripe: stripe.client, store: mem.store, log, alert },
    );

    expect(stripe.fake.subscriptions.cancel).toHaveBeenCalledWith(
      'sub_second',
      { prorate: false, invoice_now: false },
      { idempotencyKey: 'sagelytics-duplicate-cancel-sub_second' },
    );
    expect(stripe.fake.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: 'pi_second', reason: 'duplicate' }),
      { idempotencyKey: 'sagelytics-duplicate-refund-sub_second' },
    );
    expect(alert).toHaveBeenCalledWith(
      'duplicate subscription canceled and refunded',
      expect.objectContaining({ kept: 'sub_first', canceled: 'sub_second', refund: 're_1' }),
    );
    expect(mem.subscriptions.get(ALICE)).toMatchObject({
      stripeSubscriptionId: 'sub_first',
      status: 'active',
    });
  });

  it("ignores the canceled duplicate's later events so the kept subscription stays", async () => {
    stripe.setSubscription(
      subscription({ id: 'sub_second', customer: 'cus_alice', created: NEWER }),
    );
    await completeSecondCheckout();
    // Stripe now reports the duplicate canceled, with its (paid-for, refunded) period still open.
    await handle(event('evt_dup_deleted', 'customer.subscription.deleted', { id: 'sub_second' }));

    expect(mem.subscriptions.get(ALICE)).toMatchObject({
      stripeSubscriptionId: 'sub_first',
      status: 'active',
    });
  });

  it('voids an unpaid first invoice instead of refunding', async () => {
    stripe.setSubscription(
      subscription({
        id: 'sub_second',
        customer: 'cus_alice',
        created: NEWER,
        latestInvoice: 'in_open',
      }),
    );
    stripe.setInvoice({ id: 'in_open', status: 'open' });

    await completeSecondCheckout();

    expect(stripe.fake.invoices.voidInvoice).toHaveBeenCalledWith('in_open');
    expect(stripe.fake.refunds.create).not.toHaveBeenCalled();
    expect(stripe.fake.subscriptions.cancel).toHaveBeenCalledTimes(1);
  });

  it('leaves a single subscription alone', async () => {
    await handle(
      event('evt_cs1', 'checkout.session.completed', {
        id: 'cs_1',
        mode: 'subscription',
        client_reference_id: ALICE,
        customer: 'cus_alice',
        subscription: 'sub_first',
      }),
    );
    expect(stripe.fake.subscriptions.cancel).not.toHaveBeenCalled();
    expect(stripe.fake.refunds.create).not.toHaveBeenCalled();
  });

  it('does not treat an earlier canceled subscription as a reason to cancel', async () => {
    stripe.setSubscription(
      subscription({ id: 'sub_first', customer: 'cus_alice', created: OLDER, status: 'canceled' }),
    );
    stripe.setSubscription(
      subscription({ id: 'sub_second', customer: 'cus_alice', created: NEWER }),
    );
    await completeSecondCheckout();
    expect(stripe.fake.subscriptions.cancel).not.toHaveBeenCalled();
    expect(mem.subscriptions.get(ALICE)?.stripeSubscriptionId).toBe('sub_second');
  });

  it('clears the stored open checkout session once it completes', async () => {
    await mem.store.saveCheckoutSession(ALICE, {
      id: 'cs_2',
      expiresAt: new Date('2099-01-01T00:00:00Z'),
      attempt: 1,
    });
    stripe.setSubscription(
      subscription({ id: 'sub_second', customer: 'cus_alice', created: NEWER }),
    );
    await completeSecondCheckout();
    expect(mem.subscriptions.get(ALICE)?.checkoutSessionId).toBeNull();
  });
});

describe('concurrent events for one customer', () => {
  beforeEach(async () => {
    await mem.store.linkCustomer(ALICE, 'cus_alice');
  });

  it('never lets an older Stripe read commit over a newer one', async () => {
    // Event A arrives first; its Stripe read is slow and returns the old "active" snapshot.
    // Event B (the cancellation) arrives while A is in flight. Without the lock, B's write
    // could land first and A's stale write after it, restoring Pro.
    const active = subscription({ id: 'sub_1', customer: 'cus_alice', status: 'active' });
    const canceled = subscription({
      id: 'sub_1',
      customer: 'cus_alice',
      status: 'canceled',
      periodStart: '2026-10-05T00:00:00Z',
      periodEnd: '2026-11-05T00:00:00Z',
    });

    let releaseA!: () => void;
    const aGate = new Promise<void>((resolve) => (releaseA = resolve));
    let stripeState = active;
    const reads: string[] = [];
    stripe.fake.subscriptions.retrieve.mockImplementation(async () => {
      const snapshot = stripeState;
      reads.push(snapshot.status);
      if (reads.length === 1) await aGate;
      return snapshot;
    });

    const a = handle(
      event('evt_a', 'customer.subscription.updated', { id: 'sub_1', customer: 'cus_alice' }),
    );
    await vi.waitFor(() => expect(reads).toHaveLength(1));

    stripeState = canceled;
    const b = handle(
      event('evt_b', 'customer.subscription.deleted', { id: 'sub_1', customer: 'cus_alice' }),
    );
    // B is queued on Alice's lock: it has not read Stripe yet.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(reads).toHaveLength(1);

    releaseA();
    await Promise.all([a, b]);

    expect(reads).toEqual(['active', 'canceled']);
    expect(mem.subscriptions.get(ALICE)?.status).toBe('canceled');
    expect(planOf(ALICE)).toBe('free');
  });

  it('takes the lock for the user owning the customer, not one named in the payload', async () => {
    const spy = vi.spyOn(mem.store, 'runEventOnce');
    stripe.setSubscription(
      subscription({ id: 'sub_1', customer: 'cus_alice', metadata: { userId: BOB } }),
    );
    await handle(
      event('evt_1', 'customer.subscription.updated', {
        id: 'sub_1',
        customer: 'cus_alice',
        metadata: { userId: BOB },
      }),
    );
    expect(spy.mock.calls[0]![3]).toBe(ALICE);
  });
});
