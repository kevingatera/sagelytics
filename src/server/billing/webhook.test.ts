import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BillingConfig } from './config';
import { resolvePlan } from './plans';
import { createBillingService } from './service';
import { createFakeStripe, event, paidInvoice, subscription } from './testing/fake-stripe';
import { createMemoryBillingStore } from './testing/memory-store';
import { DuplicateRefundPendingError, handleStripeEvent } from './webhook';

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

/** Store a subscription in Stripe along with a paid invoice for its current period. */
function setPaid(sub: ReturnType<typeof subscription>) {
  stripe.setSubscription(sub);
  stripe.payPeriod(sub);
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
    setPaid(subscription({ id: 'sub_1', customer: 'cus_alice' }));
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
    setPaid(subscription({ id: 'sub_1', customer: 'cus_alice', status: 'active' }));
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
    setPaid(subscription({ id: 'sub_new', customer: 'cus_alice', status: 'active' }));
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
    setPaid(subscription({ id: 'sub_first', customer: 'cus_alice', created: OLDER }));
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

describe('duplicate refund obligations', () => {
  const OLDER = 1_794_000_000;
  const NEWER = OLDER + 3600;
  const dupCheckout = event('evt_dup', 'checkout.session.completed', {
    id: 'cs_2',
    mode: 'subscription',
    client_reference_id: ALICE,
    customer: 'cus_alice',
    subscription: 'sub_second',
  });

  beforeEach(async () => {
    await mem.store.linkCustomer(ALICE, 'cus_alice');
    setPaid(subscription({ id: 'sub_first', customer: 'cus_alice', created: OLDER }));
    await handle(event('evt_first', 'customer.subscription.created', { id: 'sub_first' }));
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
        data: [{ status: 'paid', payment: { type: 'payment_intent', payment_intent: 'pi_2' } }],
      } as never,
    });
  });

  it('records the duplicate before canceling it, then marks it refunded', async () => {
    const order: string[] = [];
    const record = mem.store.recordDuplicateRefund.bind(mem.store);
    vi.spyOn(mem.store, 'recordDuplicateRefund').mockImplementation(async (row) => {
      order.push('record');
      return record(row);
    });
    const cancel = stripe.fake.subscriptions.cancel.getMockImplementation()!;
    stripe.fake.subscriptions.cancel.mockImplementation(async (...args) => {
      order.push('cancel');
      return cancel(...args);
    });

    expect(await handle(dupCheckout)).toBe('processed');

    expect(order).toEqual(['record', 'cancel']);
    expect(mem.refunds.get('sub_second')).toMatchObject({
      status: 'refunded',
      refundId: 're_1',
      userId: ALICE,
      keptSubscriptionId: 'sub_first',
      sourceEventId: 'evt_dup',
    });
  });

  it('keeps a failed refund owed, fails the event so Stripe retries, and refunds once on retry', async () => {
    stripe.fake.refunds.create.mockRejectedValueOnce(new Error('stripe 500'));

    // First delivery: the cancel goes through, the refund does not. The route answers 500.
    await expect(handle(dupCheckout)).rejects.toBeInstanceOf(DuplicateRefundPendingError);
    expect(mem.refunds.get('sub_second')).toMatchObject({
      status: 'pending',
      attempts: 1,
      lastError: 'stripe 500',
    });
    // The rest of the event committed: the kept subscription stays, the duplicate is recorded.
    expect(mem.events.has('evt_dup')).toBe(true);
    expect(mem.subscriptions.get(ALICE)?.stripeSubscriptionId).toBe('sub_first');

    // Stripe's retry: the duplicate is now canceled in Stripe, but the refund is still owed.
    expect(await handle(dupCheckout)).toBe('duplicate');
    expect(stripe.fake.subscriptions.cancel).toHaveBeenCalledTimes(1);
    expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(2);
    for (const call of stripe.fake.refunds.create.mock.calls) {
      expect(call[1]).toEqual({ idempotencyKey: 'sagelytics-duplicate-refund-sub_second' });
    }
    expect(mem.refunds.get('sub_second')).toMatchObject({ status: 'refunded', refundId: 're_1' });

    // Later redeliveries do nothing more.
    expect(await handle(dupCheckout)).toBe('duplicate');
    expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(2);
  });

  it('retries the cancel too when it was the call that failed', async () => {
    stripe.fake.subscriptions.cancel.mockRejectedValueOnce(new Error('timeout'));
    await expect(handle(dupCheckout)).rejects.toBeInstanceOf(DuplicateRefundPendingError);
    expect(stripe.fake.refunds.create).not.toHaveBeenCalled();

    expect(await handle(dupCheckout)).toBe('duplicate');
    expect(stripe.fake.subscriptions.cancel).toHaveBeenCalledTimes(2);
    expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(1);
    expect(mem.refunds.get('sub_second')?.status).toBe('refunded');
  });

  it('settles a refund still owed when a later event for the customer arrives', async () => {
    stripe.fake.refunds.create.mockRejectedValueOnce(new Error('stripe 500'));
    await expect(handle(dupCheckout)).rejects.toBeInstanceOf(DuplicateRefundPendingError);

    // Stripe gave up on evt_dup; the kept subscription's next event settles the debt.
    expect(
      await handle(
        event('evt_later', 'customer.subscription.updated', {
          id: 'sub_first',
          customer: 'cus_alice',
        }),
      ),
    ).toBe('processed');
    expect(mem.refunds.get('sub_second')?.status).toBe('refunded');
  });

  it('does not fail an unrelated event while an older refund is still owed', async () => {
    stripe.fake.refunds.create.mockRejectedValue(new Error('card network down'));
    await expect(handle(dupCheckout)).rejects.toBeInstanceOf(DuplicateRefundPendingError);
    expect(
      await handle(
        event('evt_later', 'customer.subscription.updated', {
          id: 'sub_first',
          customer: 'cus_alice',
        }),
      ),
    ).toBe('processed');
    expect(mem.refunds.get('sub_second')).toMatchObject({ status: 'pending', attempts: 2 });
  });

  it('treats a charge Stripe already refunded as settled', async () => {
    stripe.fake.refunds.create.mockRejectedValueOnce(
      Object.assign(new Error('Charge has already been refunded.'), {
        code: 'charge_already_refunded',
      }),
    );
    expect(await handle(dupCheckout)).toBe('processed');
    expect(mem.refunds.get('sub_second')?.status).toBe('refunded');
  });

  describe('refunds Stripe has not finished', () => {
    const refundEvent = (id: string, type: 'refund.updated' | 'refund.failed', refundId: string) =>
      event(id, type, stripe.refunds.get(refundId)!);

    it('keeps a pending refund owed, then closes it when Stripe reports it succeeded', async () => {
      stripe.setNextRefundStatus('pending');

      // Stripe accepted the refund: the event is done, but the obligation is not.
      expect(await handle(dupCheckout)).toBe('processed');
      expect(mem.refunds.get('sub_second')).toMatchObject({ status: 'pending', refundId: 're_1' });

      // Redeliveries and later customer events follow the same refund by id; no new refund.
      expect(await handle(dupCheckout)).toBe('duplicate');
      expect(stripe.fake.refunds.retrieve).toHaveBeenLastCalledWith('re_1');
      expect(mem.refunds.get('sub_second')?.status).toBe('pending');

      stripe.setRefundStatus('re_1', 'succeeded');
      expect(await handle(refundEvent('evt_re_upd', 'refund.updated', 're_1'))).toBe('processed');
      expect(mem.refunds.get('sub_second')).toMatchObject({
        status: 'refunded',
        refundId: 're_1',
        attempts: 0,
      });
      expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(1);
    });

    it('reopens a refund Stripe failed and retries it under a new idempotency key', async () => {
      stripe.setNextRefundStatus('pending');
      await handle(dupCheckout);
      stripe.setRefundStatus('re_1', 'failed', 'lost_or_stolen_card');
      stripe.setNextRefundStatus('succeeded');

      expect(await handle(refundEvent('evt_re_fail', 'refund.failed', 're_1'))).toBe('processed');

      const keys = stripe.fake.refunds.create.mock.calls.map((call) => call[1]?.idempotencyKey);
      expect(keys).toEqual([
        'sagelytics-duplicate-refund-sub_second',
        'sagelytics-duplicate-refund-sub_second-after-re_1',
      ]);
      expect(mem.refunds.get('sub_second')).toMatchObject({
        status: 'refunded',
        refundId: 're_2',
        attempts: 1,
      });
    });

    it('fails the refund.failed delivery while the replacement refund cannot be made', async () => {
      stripe.setNextRefundStatus('pending');
      await handle(dupCheckout);
      stripe.setRefundStatus('re_1', 'failed', 'expired_or_canceled_card');
      stripe.fake.refunds.create.mockRejectedValueOnce(new Error('stripe 500'));
      const failed = refundEvent('evt_re_fail', 'refund.failed', 're_1');

      await expect(handle(failed)).rejects.toBeInstanceOf(DuplicateRefundPendingError);
      expect(mem.refunds.get('sub_second')).toMatchObject({ status: 'pending', refundId: 're_1' });

      stripe.setNextRefundStatus('succeeded');
      expect(await handle(failed)).toBe('duplicate');
      expect(stripe.fake.refunds.create.mock.calls.at(-1)?.[1]).toEqual({
        idempotencyKey: 'sagelytics-duplicate-refund-sub_second-after-re_1',
      });
      // One Stripe error, one failed refund.
      expect(mem.refunds.get('sub_second')).toMatchObject({
        status: 'refunded',
        refundId: 're_2',
        attempts: 2,
      });
    });

    it('closes the obligation when the payment is already fully refunded', async () => {
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
              amount_paid: 1900,
              payment: { type: 'payment_intent', payment_intent: 'pi_2' },
            },
          ],
        } as never,
      });
      stripe.fake.refunds.create.mockRejectedValueOnce(new Error('stripe 500'));
      await expect(handle(dupCheckout)).rejects.toBeInstanceOf(DuplicateRefundPendingError);

      // Someone refunds it in the dashboard; Stripe sends charge.refunded for the customer.
      stripe.addRefund({
        id: 're_dash',
        payment_intent: 'pi_2',
        amount: 1900,
        status: 'succeeded',
      });
      expect(
        await handle(
          event('evt_ch_refunded', 'charge.refunded', {
            id: 'ch_2',
            customer: 'cus_alice',
            refunded: true,
          }),
        ),
      ).toBe('processed');

      expect(mem.refunds.get('sub_second')).toMatchObject({
        status: 'refunded',
        refundId: 're_dash',
      });
      expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(1);
    });

    it('ignores refund events for refunds that are not ours', async () => {
      stripe.addRefund({ id: 're_other', status: 'succeeded' });
      expect(await handle(refundEvent('evt_other', 'refund.updated', 're_other'))).toBe(
        'processed',
      );
      expect(stripe.fake.refunds.retrieve).not.toHaveBeenCalled();
    });
  });

  it('never stores the recorded duplicate as the user subscription', async () => {
    stripe.fake.refunds.create.mockRejectedValueOnce(new Error('stripe 500'));
    await expect(handle(dupCheckout)).rejects.toBeInstanceOf(DuplicateRefundPendingError);
    await handle(event('evt_dup_upd', 'customer.subscription.updated', { id: 'sub_second' }));
    expect(mem.subscriptions.get(ALICE)?.stripeSubscriptionId).toBe('sub_first');
  });
});

describe('paid period and renewals', () => {
  const CONFIG: BillingConfig = {
    enabled: true,
    webhookSecret: 'whsec_test',
    priceId: 'price_test',
    appUrl: 'https://app.example',
    limits: LIMITS,
  };
  let now: Date;
  const service = () =>
    createBillingService({ store: mem.store, config: () => CONFIG, now: () => now });

  // Paid for Oct 5 - Nov 5; usage on Oct 20 belongs to that period.
  beforeEach(async () => {
    now = new Date('2026-10-20T00:00:00Z');
    await mem.store.linkCustomer(ALICE, 'cus_alice');
    setPaid(
      subscription({
        id: 'sub_1',
        customer: 'cus_alice',
        periodStart: '2026-10-05T00:00:00Z',
        periodEnd: '2026-11-05T00:00:00Z',
      }),
    );
    await handle(event('evt_created', 'customer.subscription.created', { id: 'sub_1' }));
    mem.addUsage(ALICE, new Date('2026-10-20T00:00:00Z'));
  });

  function renewedSubscription(status: 'active' | 'past_due') {
    // Stripe advances the item period on renewal whether or not the invoice is paid.
    return subscription({
      id: 'sub_1',
      customer: 'cus_alice',
      status,
      periodStart: '2026-11-05T00:00:00Z',
      periodEnd: '2026-12-05T00:00:00Z',
    });
  }

  const renewalInvoice = paidInvoice({
    id: 'in_renewal',
    subscription: 'sub_1',
    customer: 'cus_alice',
    periodStart: '2026-11-05T00:00:00Z',
    periodEnd: '2026-12-05T00:00:00Z',
  });

  it('keeps the old usage window after a failed renewal and drops pro after paid end + grace', async () => {
    stripe.setSubscription(renewedSubscription('past_due'));
    await handle(
      event('evt_failed', 'invoice.payment_failed', { ...renewalInvoice, status: 'open' }),
    );
    expect(mem.subscriptions.get(ALICE)).toMatchObject({
      status: 'past_due',
      currentPeriodEnd: new Date('2026-12-05T00:00:00Z'),
      paidPeriodStart: new Date('2026-10-05T00:00:00Z'),
      paidPeriodEnd: new Date('2026-11-05T00:00:00Z'),
    });

    now = new Date('2026-11-06T00:00:00Z');
    const plan = await service().getPlanForUser(ALICE);
    expect(plan.plan).toBe('pro');
    const usage = await service().getDiscoveryUsage(ALICE);
    // The Oct 20 discovery still counts: no fresh allowance for the unpaid period.
    expect(usage).toMatchObject({ used: 1, limit: 50 });
    expect(usage.periodStart.toISOString()).toBe('2026-10-05T00:00:00.000Z');
    expect(usage.periodEnd.toISOString()).toBe('2026-11-08T00:00:00.000Z');

    now = new Date('2026-11-08T00:00:00Z');
    expect((await service().getPlanForUser(ALICE)).plan).toBe('free');
    // Stripe still reports the advanced period, but it never grants pro.
    now = new Date('2026-12-01T00:00:00Z');
    expect((await service().getPlanForUser(ALICE)).plan).toBe('free');
  });

  it('advances the usage window when the renewal is paid', async () => {
    stripe.setSubscription(renewedSubscription('active'));
    stripe.setInvoice(renewalInvoice);
    await handle(event('evt_paid', 'invoice.paid', renewalInvoice));

    now = new Date('2026-11-06T00:00:00Z');
    const usage = await service().getDiscoveryUsage(ALICE);
    expect(usage).toMatchObject({ used: 0, remaining: 50 });
    expect(usage.periodStart.toISOString()).toBe('2026-11-05T00:00:00.000Z');
    expect(usage.periodEnd.toISOString()).toBe('2026-12-05T00:00:00.000Z');
  });

  it('trusts the signed invoice.paid period even if the invoice list lags', async () => {
    stripe.setSubscription(renewedSubscription('active'));
    // invoices.list does not have the renewal yet.
    await handle(event('evt_paid', 'invoice.paid', renewalInvoice));
    expect(mem.subscriptions.get(ALICE)?.paidPeriodEnd).toEqual(new Date('2026-12-05T00:00:00Z'));
  });

  it('recovers a failed renewal once the retried payment succeeds', async () => {
    stripe.setSubscription(renewedSubscription('past_due'));
    await handle(event('evt_failed', 'invoice.payment_failed', renewalInvoice));
    stripe.setSubscription(renewedSubscription('active'));
    stripe.setInvoice(renewalInvoice);
    await handle(event('evt_upd', 'customer.subscription.updated', { id: 'sub_1' }));
    expect(mem.subscriptions.get(ALICE)?.paidPeriodEnd).toEqual(new Date('2026-12-05T00:00:00Z'));
  });

  it('does not count a proration-only invoice as a new paid period', async () => {
    stripe.setSubscription(renewedSubscription('past_due'));
    stripe.setInvoice(
      paidInvoice({
        id: 'in_proration',
        subscription: 'sub_1',
        periodStart: '2026-11-05T00:00:00Z',
        periodEnd: '2026-12-05T00:00:00Z',
        proration: true,
      }),
    );
    await handle(event('evt_upd', 'customer.subscription.updated', { id: 'sub_1' }));
    expect(mem.subscriptions.get(ALICE)?.paidPeriodEnd).toEqual(new Date('2026-11-05T00:00:00Z'));
  });

  it('never moves the paid period backwards on a lagging read', async () => {
    stripe.setSubscription(renewedSubscription('active'));
    await handle(event('evt_paid', 'invoice.paid', renewalInvoice));
    // A later event re-reads Stripe while invoices.list still only has the October invoice.
    await handle(event('evt_upd', 'customer.subscription.updated', { id: 'sub_1' }));
    expect(mem.subscriptions.get(ALICE)?.paidPeriodEnd).toEqual(new Date('2026-12-05T00:00:00Z'));
  });

  it('counts a trial as granted without an invoice', async () => {
    stripe.setSubscription(
      subscription({
        id: 'sub_trial',
        customer: 'cus_bob',
        status: 'trialing',
        metadata: { userId: BOB },
        periodStart: '2026-10-15T00:00:00Z',
        periodEnd: '2026-10-29T00:00:00Z',
      }),
    );
    await handle(event('evt_trial', 'customer.subscription.created', { id: 'sub_trial' }));
    expect(mem.subscriptions.get(BOB)).toMatchObject({
      paidPeriodStart: new Date('2026-10-15T00:00:00Z'),
      paidPeriodEnd: new Date('2026-10-29T00:00:00Z'),
    });
    expect((await service().getPlanForUser(BOB)).plan).toBe('pro');
  });

  it('reads invoices under the user lock, inside the event', async () => {
    const lock = vi.spyOn(mem.store, 'runEventOnce');
    stripe.setSubscription(renewedSubscription('active'));
    await handle(
      event('evt_upd', 'customer.subscription.updated', { id: 'sub_1', customer: 'cus_alice' }),
    );
    expect(lock.mock.calls[0]![3]).toBe(ALICE);
    expect(stripe.fake.invoices.list).toHaveBeenCalledWith({
      subscription: 'sub_1',
      status: 'paid',
      limit: 5,
    });
  });
});
