import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BillingConfig } from './config';
import { resolvePlan } from './plans';
import { createBillingService } from './service';
import {
  createFakeStripe,
  event,
  paidInvoice,
  subscription,
  subscriptionInvoice,
} from './testing/fake-stripe';
import { createMemoryBillingStore } from './testing/memory-store';
import {
  DUPLICATE_REFUND_MANUAL_LOG,
  DuplicateRefundPendingError,
  MAX_DUPLICATE_REFUND_ATTEMPTS,
  handleStripeEvent,
  settleOpenDuplicateRefunds,
} from './webhook';

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

  function completeSecondCheckout(invoice: string | null = null) {
    return handle(
      event('evt_dup', 'checkout.session.completed', {
        id: 'cs_2',
        mode: 'subscription',
        client_reference_id: ALICE,
        customer: 'cus_alice',
        subscription: 'sub_second',
        invoice,
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
        invoice: 'in_second',
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

    await completeSecondCheckout('in_open');

    expect(stripe.fake.invoices.voidInvoice).toHaveBeenCalledWith('in_open');
    expect(stripe.fake.refunds.create).not.toHaveBeenCalled();
    expect(stripe.fake.subscriptions.cancel).toHaveBeenCalledTimes(1);
    expect(mem.refunds.get('sub_second')).toMatchObject({
      status: 'voided',
      invoiceId: 'in_open',
    });
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
    invoice: 'in_second',
  });

  /** No Stripe writes of any kind. */
  function expectNoStripeWrites() {
    expect(stripe.fake.subscriptions.cancel).not.toHaveBeenCalled();
    expect(stripe.fake.invoices.voidInvoice).not.toHaveBeenCalled();
    expect(stripe.fake.refunds.create).not.toHaveBeenCalled();
  }

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
    // The attempt was counted before Stripe was called. The error is noted, and the retry
    // reuses the attempt's key instead of counting a new one.
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
    expect(mem.refunds.get('sub_second')).toMatchObject({
      status: 'pending',
      attempts: 1,
      lastError: 'card network down',
    });
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
        attempts: 1,
      });
      expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(1);
    });

    it('reopens a refund Stripe failed and retries it under a new idempotency key', async () => {
      stripe.setNextRefundStatus('pending');
      await handle(dupCheckout);
      stripe.setRefundStatus('re_1', 'failed', 'declined');
      stripe.setNextRefundStatus('succeeded');

      expect(await handle(refundEvent('evt_re_fail', 'refund.failed', 're_1'))).toBe('processed');

      const keys = stripe.fake.refunds.create.mock.calls.map((call) => call[1]?.idempotencyKey);
      expect(keys).toEqual([
        'sagelytics-duplicate-refund-sub_second',
        'sagelytics-duplicate-refund-sub_second-attempt-2',
      ]);
      expect(stripe.fake.refunds.create.mock.calls.map((call) => call[0].metadata)).toEqual([
        { subscription: 'sub_second', reason: 'duplicate_subscription', attempt: '1' },
        { subscription: 'sub_second', reason: 'duplicate_subscription', attempt: '2' },
      ]);
      expect(mem.refunds.get('sub_second')).toMatchObject({
        status: 'refunded',
        refundId: 're_2',
        attempts: 2,
      });
    });

    it('fails the refund.failed delivery while the replacement refund cannot be made', async () => {
      stripe.setNextRefundStatus('pending');
      await handle(dupCheckout);
      stripe.setRefundStatus('re_1', 'failed', 'unknown');
      stripe.fake.refunds.create.mockRejectedValueOnce(new Error('stripe 500'));
      const failed = refundEvent('evt_re_fail', 'refund.failed', 're_1');

      await expect(handle(failed)).rejects.toBeInstanceOf(DuplicateRefundPendingError);
      expect(mem.refunds.get('sub_second')).toMatchObject({ status: 'pending', refundId: 're_1' });

      stripe.setNextRefundStatus('succeeded');
      expect(await handle(failed)).toBe('duplicate');
      // The retry reuses the reserved attempt's key; the Stripe error added no attempt.
      expect(stripe.fake.refunds.create.mock.calls.map((call) => call[1]?.idempotencyKey)).toEqual([
        'sagelytics-duplicate-refund-sub_second',
        'sagelytics-duplicate-refund-sub_second-attempt-2',
        'sagelytics-duplicate-refund-sub_second-attempt-2',
      ]);
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

    describe('refunds that keep failing', () => {
      let errors: ReturnType<typeof vi.spyOn>;
      const manualLines = () =>
        errors.mock.calls.filter((call) => String(call[0]).startsWith(DUPLICATE_REFUND_MANUAL_LOG));

      beforeEach(() => {
        errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        // The duplicate's payment, so a full refund from elsewhere can be recognised.
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
        stripe.setNextRefundStatus('pending');
      });

      /** Stripe fails the refund the row waits on and sends refund.failed for it. */
      const fail = (n: number, reason: string) => {
        stripe.setRefundStatus(`re_${n}`, 'failed', reason);
        return handle(refundEvent(`evt_re_fail_${n}`, 'refund.failed', `re_${n}`));
      };

      it(`stops after ${MAX_DUPLICATE_REFUND_ATTEMPTS} failed refunds and hands the row to a person`, async () => {
        await handle(dupCheckout);
        expect(await fail(1, 'declined')).toBe('processed');
        expect(await fail(2, 'declined')).toBe('processed');
        expect(mem.refunds.get('sub_second')).toMatchObject({
          status: 'pending',
          refundId: 're_3',
          attempts: 3,
        });

        // The third failure: no fourth refund, and the delivery is answered 200, not retried.
        expect(await fail(3, 'declined')).toBe('processed');
        expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(3);
        expect(mem.refunds.get('sub_second')).toMatchObject({
          status: 'needs_attention',
          refundId: 're_3',
          attempts: 3,
          lastError: 'refund re_3 failed: declined',
          resolvedAt: null,
        });
        expect(manualLines()).toHaveLength(1);
        const line = String(manualLines()[0]![0]);
        expect(JSON.parse(line.slice(DUPLICATE_REFUND_MANUAL_LOG.length + 1))).toEqual({
          subscription: 'sub_second',
          refund: 're_3',
          attempts: 3,
          reason: 'declined',
        });
        expect(line).not.toMatch(/cus_|@|pi_/);

        // Redeliveries and later events for the customer make no refund and log nothing more.
        expect(await fail(3, 'declined')).toBe('duplicate');
        await handle(
          event('evt_later', 'customer.subscription.updated', {
            id: 'sub_first',
            customer: 'cus_alice',
          }),
        );
        expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(3);
        expect(manualLines()).toHaveLength(1);
        expect(mem.refunds.get('sub_second')?.status).toBe('needs_attention');
      });

      it.each(['lost_or_stolen_card', 'expired_or_canceled_card', 'insufficient_funds'])(
        'hands a %s failure to a person at once, without a replacement',
        async (reason) => {
          await handle(dupCheckout);
          expect(await fail(1, reason)).toBe('processed');
          expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(1);
          expect(mem.refunds.get('sub_second')).toMatchObject({
            status: 'needs_attention',
            refundId: 're_1',
            attempts: 1,
            lastError: `refund re_1 failed: ${reason}`,
          });
          expect(manualLines()).toHaveLength(1);
        },
      );

      it('does not redo a refund that was canceled', async () => {
        await handle(dupCheckout);
        stripe.setRefundStatus('re_1', 'canceled', 'merchant_request');
        await handle(refundEvent('evt_re_canceled', 'refund.updated', 're_1'));
        expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(1);
        expect(mem.refunds.get('sub_second')?.status).toBe('needs_attention');
      });

      it('closes a row in the manual state once the payment is refunded another way', async () => {
        await handle(dupCheckout);
        await fail(1, 'lost_or_stolen_card');
        expect(mem.refunds.get('sub_second')?.status).toBe('needs_attention');

        // Kevin refunds it from the dashboard; Stripe sends charge.refunded for the customer.
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
          lastError: null,
        });
        expect(mem.refunds.get('sub_second')?.resolvedAt).toBeInstanceOf(Date);
        expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(1);
      });

      it('keeps a manual row open while the payment is only partly refunded', async () => {
        await handle(dupCheckout);
        await fail(1, 'lost_or_stolen_card');
        stripe.addRefund({
          id: 're_part',
          payment_intent: 'pi_2',
          amount: 900,
          status: 'succeeded',
        });
        await handle(
          event('evt_ch_partial', 'charge.refunded', { id: 'ch_2', customer: 'cus_alice' }),
        );
        expect(mem.refunds.get('sub_second')?.status).toBe('needs_attention');
      });

      /** Hold every refunds.retrieve until `count` settlers have read the row and called it. */
      function barrierOnRetrieve(count: number) {
        const retrieve = stripe.fake.refunds.retrieve.getMockImplementation()!;
        let waiting = 0;
        let open!: () => void;
        const opened = new Promise<void>((resolve) => (open = resolve));
        stripe.fake.refunds.retrieve.mockImplementation(async (id: string) => {
          waiting += 1;
          if (waiting >= count) open();
          await opened;
          return retrieve(id);
        });
      }

      it('makes one replacement when failure events for the same refund race', async () => {
        await handle(dupCheckout);
        stripe.setRefundStatus('re_1', 'failed', 'declined');
        barrierOnRetrieve(2);

        await Promise.all([
          handle(refundEvent('evt_race_a', 'refund.failed', 're_1')),
          handle(refundEvent('evt_race_b', 'refund.updated', 're_1')),
        ]);

        expect([...stripe.refunds.keys()]).toEqual(['re_1', 're_2']);
        expect(mem.refunds.get('sub_second')).toMatchObject({
          status: 'pending',
          refundId: 're_2',
          attempts: 2,
        });
      });

      it('moves the row to the manual state once when failure events race at the cap', async () => {
        await handle(dupCheckout);
        await fail(1, 'declined');
        await fail(2, 'declined');
        stripe.setRefundStatus('re_3', 'failed', 'declined');
        barrierOnRetrieve(2);

        await Promise.all([
          handle(refundEvent('evt_cap_a', 'refund.failed', 're_3')),
          handle(refundEvent('evt_cap_b', 'refund.updated', 're_3')),
        ]);

        expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(3);
        expect(mem.refunds.get('sub_second')).toMatchObject({
          status: 'needs_attention',
          attempts: 3,
        });
        expect(manualLines()).toHaveLength(1);
      });

      describe('refunds whose response was lost', () => {
        /** Stripe's real create, which answers normally. */
        let create: NonNullable<
          ReturnType<typeof stripe.fake.refunds.create.getMockImplementation>
        >;
        beforeEach(() => {
          create = stripe.fake.refunds.create.getMockImplementation()!;
        });
        let eventNo = 0;
        /** Another webhook for the customer, which settles the open row. */
        const later = () =>
          handle(
            event(`evt_later_${++eventNo}`, 'customer.subscription.updated', {
              id: 'sub_first',
              customer: 'cus_alice',
            }),
          );

        /** Stripe makes every refund, but the response never reaches us (a timeout). */
        function loseResponses() {
          stripe.fake.refunds.create.mockImplementation(async (...args) => {
            await create(...args);
            throw new Error('Request timed out');
          });
        }

        it('hands the row to a person when an unseen refund fails permanently, even with its key pruned', async () => {
          loseResponses();
          await expect(handle(dupCheckout)).rejects.toBeInstanceOf(DuplicateRefundPendingError);
          // Stripe made re_1; the row never saw its id, but the attempt was counted first.
          expect([...stripe.refunds.keys()]).toEqual(['re_1']);
          expect(mem.refunds.get('sub_second')).toMatchObject({ refundId: null, attempts: 1 });

          stripe.setRefundStatus('re_1', 'failed', 'lost_or_stolen_card');
          // More than 24 hours later: a create with the old key would now make a new refund.
          stripe.pruneIdempotencyKeys();
          stripe.fake.refunds.create.mockImplementation(create);

          expect(await later()).toBe('processed');
          expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(1);
          expect([...stripe.refunds.keys()]).toEqual(['re_1']);
          expect(mem.refunds.get('sub_second')).toMatchObject({
            status: 'needs_attention',
            refundId: 're_1',
            attempts: 1,
            lastError: 'refund re_1 failed: lost_or_stolen_card',
          });
          expect(manualLines()).toHaveLength(1);
        });

        it('counts unseen refunds that failed toward the cap, so there is no 4th', async () => {
          loseResponses();
          await expect(handle(dupCheckout)).rejects.toBeInstanceOf(DuplicateRefundPendingError);
          for (const n of [1, 2]) {
            stripe.setRefundStatus(`re_${n}`, 'failed', 'declined');
            stripe.pruneIdempotencyKeys();
            await later();
            expect(mem.refunds.get('sub_second')).toMatchObject({
              status: 'pending',
              refundId: null,
              attempts: n + 1,
            });
          }
          stripe.setRefundStatus('re_3', 'failed', 'declined');
          stripe.pruneIdempotencyKeys();
          await later();

          expect([...stripe.refunds.keys()]).toEqual(['re_1', 're_2', 're_3']);
          expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(3);
          expect(
            stripe.fake.refunds.create.mock.calls.map(
              (call) => (call[0].metadata as Record<string, string>).attempt,
            ),
          ).toEqual(['1', '2', '3']);
          expect(mem.refunds.get('sub_second')).toMatchObject({
            status: 'needs_attention',
            refundId: 're_3',
            attempts: 3,
          });
          await later();
          expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(3);
        });

        it('counts failed refunds of ours the row never recorded at all', async () => {
          // Two refunds made before attempts were reserved (say, by an older release), both failed.
          stripe.fake.refunds.create.mockRejectedValueOnce(new Error('stripe 500'));
          await expect(handle(dupCheckout)).rejects.toBeInstanceOf(DuplicateRefundPendingError);
          mem.refunds.set('sub_second', { ...mem.refunds.get('sub_second')!, attempts: 0 });
          for (const id of ['re_old_1', 're_old_2']) {
            stripe.addRefund({
              id,
              payment_intent: 'pi_2',
              amount: 1900,
              status: 'failed',
              failure_reason: 'declined',
              metadata: { subscription: 'sub_second' },
            });
          }

          await later();
          expect(stripe.fake.refunds.create.mock.calls.at(-1)?.[1]).toEqual({
            idempotencyKey: 'sagelytics-duplicate-refund-sub_second-attempt-3',
          });
          const third = mem.refunds.get('sub_second')!.refundId!;
          expect(mem.refunds.get('sub_second')).toMatchObject({ status: 'pending', attempts: 3 });

          stripe.setRefundStatus(third, 'failed', 'declined');
          await later();
          expect(mem.refunds.get('sub_second')).toMatchObject({
            status: 'needs_attention',
            attempts: 3,
          });
          expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(2);
        });

        it('retries an attempt cut off after it was recorded, without counting it again', async () => {
          // The process dies after counting attempt 1, before it calls Stripe.
          const reserve = mem.store.reserveDuplicateRefundAttempt.bind(mem.store);
          vi.spyOn(mem.store, 'reserveDuplicateRefundAttempt').mockImplementationOnce(
            async (...args) => {
              await reserve(...args);
              throw new Error('process killed');
            },
          );
          await expect(handle(dupCheckout)).rejects.toBeInstanceOf(DuplicateRefundPendingError);
          expect(stripe.fake.refunds.create).not.toHaveBeenCalled();
          expect(mem.refunds.get('sub_second')).toMatchObject({ refundId: null, attempts: 1 });

          await later();
          expect(stripe.fake.refunds.create.mock.calls.map((call) => call[1])).toEqual([
            { idempotencyKey: 'sagelytics-duplicate-refund-sub_second' },
          ]);
          expect(mem.refunds.get('sub_second')).toMatchObject({ refundId: 're_1', attempts: 1 });
        });

        it('gets the same refund back when Stripe made it but its list does not show it yet', async () => {
          stripe.fake.refunds.create.mockImplementationOnce(async (...args) => {
            await create(...args);
            throw new Error('Request timed out');
          });
          await expect(handle(dupCheckout)).rejects.toBeInstanceOf(DuplicateRefundPendingError);
          expect(mem.refunds.get('sub_second')).toMatchObject({ refundId: null, attempts: 1 });

          // Within 24 hours, and the refund list lags behind the create.
          stripe.fake.refunds.list.mockResolvedValueOnce({
            object: 'list',
            has_more: false,
            data: [],
          } as never);
          await later();

          expect(stripe.fake.refunds.create.mock.calls.map((call) => call[1])).toEqual([
            { idempotencyKey: 'sagelytics-duplicate-refund-sub_second' },
            { idempotencyKey: 'sagelytics-duplicate-refund-sub_second' },
          ]);
          expect([...stripe.refunds.keys()]).toEqual(['re_1']);
          expect(mem.refunds.get('sub_second')).toMatchObject({
            status: 'pending',
            refundId: 're_1',
            attempts: 1,
          });
        });

        it('makes one refund per attempt when settlers race after a failure', async () => {
          loseResponses();
          await expect(handle(dupCheckout)).rejects.toBeInstanceOf(DuplicateRefundPendingError);
          stripe.setRefundStatus('re_1', 'failed', 'declined');
          stripe.pruneIdempotencyKeys();
          stripe.fake.refunds.create.mockImplementation(create);
          // Hold every settler at the refund list until all three have read the row.
          const list = stripe.fake.refunds.list.getMockImplementation()!;
          let waiting = 0;
          let open!: () => void;
          const opened = new Promise<void>((resolve) => (open = resolve));
          stripe.fake.refunds.list.mockImplementation(async (params) => {
            if (++waiting >= 3) open();
            await opened;
            return list(params);
          });

          await Promise.all([later(), later(), later()]);

          expect([...stripe.refunds.keys()]).toEqual(['re_1', 're_2']);
          expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(2);
          expect(mem.refunds.get('sub_second')).toMatchObject({
            status: 'pending',
            refundId: 're_2',
            attempts: 2,
          });
        });
      });
    });

    it('ignores refund events for refunds that are not ours', async () => {
      stripe.addRefund({ id: 're_other', status: 'succeeded' });
      expect(await handle(refundEvent('evt_other', 'refund.updated', 're_other'))).toBe(
        'processed',
      );
      expect(stripe.fake.refunds.retrieve).not.toHaveBeenCalled();
    });
  });

  describe('settlers racing the event that owns the row', () => {
    /** Our cancel makes Stripe send this for the duplicate; it settles the customer's rows too. */
    const deleted = event('evt_del', 'customer.subscription.deleted', {
      id: 'sub_second',
      customer: 'cus_alice',
    });

    /**
     * Hold the first reserveDuplicateRefundAttempt call (the owning event's) until `release`, so
     * another settler can reserve the attempt first. The owner has already read the row by then.
     */
    function holdOwnersReservation() {
      const reserve = mem.store.reserveDuplicateRefundAttempt.bind(mem.store);
      let reached!: () => void;
      const ownerWaiting = new Promise<void>((resolve) => (reached = resolve));
      let release!: () => void;
      const released = new Promise<void>((resolve) => (release = resolve));
      vi.spyOn(mem.store, 'reserveDuplicateRefundAttempt')
        .mockImplementationOnce(async (...args) => {
          reached();
          await released;
          return reserve(...args);
        })
        .mockImplementation(reserve);
      return { ownerWaiting, release };
    }

    it('keeps the owning event retryable when the settler that won its attempt got an API error', async () => {
      const { ownerWaiting, release } = holdOwnersReservation();
      const owner = handle(dupCheckout);
      await ownerWaiting;

      // The deleted event takes attempt 1, and Stripe answers its refund with an error. It does
      // not answer for the row, so it is acknowledged.
      stripe.fake.refunds.create.mockRejectedValueOnce(new Error('stripe 500'));
      expect(await handle(deleted)).toBe('processed');
      expect(mem.refunds.get('sub_second')).toMatchObject({
        status: 'pending',
        refundId: null,
        attempts: 1,
        lastError: 'stripe 500',
      });

      // The owner lost the reservation, but no refund exists, so Stripe must redeliver it.
      release();
      await expect(owner).rejects.toBeInstanceOf(DuplicateRefundPendingError);
      expect(stripe.refunds.size).toBe(0);

      // The redelivery makes the refund under attempt 1's key; nothing counts a second attempt.
      expect(await handle(dupCheckout)).toBe('duplicate');
      expect(stripe.fake.refunds.create.mock.calls.map((call) => call[1])).toEqual([
        { idempotencyKey: 'sagelytics-duplicate-refund-sub_second' },
        { idempotencyKey: 'sagelytics-duplicate-refund-sub_second' },
      ]);
      expect([...stripe.refunds.keys()]).toEqual(['re_1']);
      expect(mem.refunds.get('sub_second')).toMatchObject({
        status: 'refunded',
        refundId: 're_1',
        attempts: 1,
      });
    });

    it('acknowledges the owning event once the winning settler has a refund in flight', async () => {
      stripe.setNextRefundStatus('pending');
      const { ownerWaiting, release } = holdOwnersReservation();
      const owner = handle(dupCheckout);
      await ownerWaiting;

      expect(await handle(deleted)).toBe('processed');
      release();

      // Stripe accepted the winner's refund, so the owner has nothing left to retry.
      expect(await owner).toBe('processed');
      expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(1);
      expect(mem.refunds.get('sub_second')).toMatchObject({
        status: 'pending',
        refundId: 're_1',
        attempts: 1,
      });
    });

    it('keeps the owning event retryable when the winning refund failed on creation', async () => {
      stripe.setNextRefundStatus('failed');
      const { ownerWaiting, release } = holdOwnersReservation();
      const owner = handle(dupCheckout);
      await ownerWaiting;

      expect(await handle(deleted)).toBe('processed');
      release();
      await expect(owner).rejects.toBeInstanceOf(DuplicateRefundPendingError);

      // Its retry replaces the failed refund with attempt 2.
      stripe.setNextRefundStatus('succeeded');
      expect(await handle(dupCheckout)).toBe('duplicate');
      expect(mem.refunds.get('sub_second')).toMatchObject({
        status: 'refunded',
        refundId: 're_2',
        attempts: 2,
      });
    });

    it('makes at most one refund per attempt when the owner and other settlers race', async () => {
      stripe.setNextRefundStatus('pending');
      // Hold every settler at the refund list until all four have read the row.
      const list = stripe.fake.refunds.list.getMockImplementation()!;
      let waiting = 0;
      let open!: () => void;
      const opened = new Promise<void>((resolve) => (open = resolve));
      stripe.fake.refunds.list.mockImplementation(async (params) => {
        if (++waiting >= 4) open();
        await opened;
        return list(params);
      });
      const others = ['evt_race_1', 'evt_race_2', 'evt_race_3'].map((id) =>
        event(id, 'customer.subscription.updated', { id: 'sub_first', customer: 'cus_alice' }),
      );

      const results = await Promise.allSettled([
        handle(dupCheckout),
        ...others.map((e) => handle(e)),
      ]);

      expect(results.map((result) => result.status)).toEqual([
        'fulfilled',
        'fulfilled',
        'fulfilled',
        'fulfilled',
      ]);
      expect([...stripe.refunds.keys()]).toEqual(['re_1']);
      expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(1);
      expect(mem.refunds.get('sub_second')).toMatchObject({
        status: 'pending',
        refundId: 're_1',
        attempts: 1,
      });
    });
  });

  describe('a duplicate that renewed before it was settled', () => {
    const sweep = () =>
      settleOpenDuplicateRefunds({ stripe: stripe.client, store: mem.store, log, alert: log });
    const checkoutInvoice = (status: 'paid' | 'open' = 'paid') =>
      subscriptionInvoice({
        id: 'in_second',
        subscription: 'sub_second',
        status,
        billingReason: 'subscription_create',
        created: NEWER,
        paymentIntent: 'pi_2',
      });
    const renewalInvoice = (status: 'paid' | 'open') =>
      subscriptionInvoice({
        id: 'in_renewal',
        subscription: 'sub_second',
        status,
        billingReason: 'subscription_cycle',
        created: NEWER + 30 * 86400,
        paymentIntent: 'pi_renewal',
      });

    /**
     * The checkout event records the duplicate, but the cancel fails and Stripe stops retrying
     * the event. A month later the duplicate has renewed: latest_invoice is now the renewal.
     */
    async function renewBeforeSettling(
      renewal: 'paid' | 'open',
      checkout: 'paid' | 'open' = 'paid',
    ) {
      stripe.setInvoice(checkoutInvoice(checkout));
      stripe.fake.subscriptions.cancel.mockRejectedValueOnce(new Error('stripe 500'));
      await expect(handle(dupCheckout)).rejects.toBeInstanceOf(DuplicateRefundPendingError);
      expect(mem.refunds.get('sub_second')).toMatchObject({
        status: 'pending',
        invoiceId: 'in_second',
      });
      stripe.setSubscription(
        subscription({
          id: 'sub_second',
          customer: 'cus_alice',
          created: NEWER,
          latestInvoice: 'in_renewal',
          periodStart: '2026-12-05T00:00:00Z',
          periodEnd: '2027-01-05T00:00:00Z',
        }),
      );
      stripe.setInvoice(renewalInvoice(renewal));
      stripe.fake.subscriptions.cancel.mockClear();
    }

    it('refunds the paid checkout invoice and voids the open renewal, never closing as voided', async () => {
      await renewBeforeSettling('open');

      const results = await sweep();

      expect(stripe.fake.invoices.voidInvoice.mock.calls.map((call) => call[0])).toEqual([
        'in_renewal',
      ]);
      expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(1);
      expect(stripe.fake.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({ payment_intent: 'pi_2', reason: 'duplicate' }),
        { idempotencyKey: 'sagelytics-duplicate-refund-sub_second' },
      );
      expect(results).toEqual([
        expect.objectContaining({ subscription: 'sub_second', status: 'refunded' }),
      ]);
      expect(mem.refunds.get('sub_second')).toMatchObject({
        status: 'refunded',
        refundId: 're_1',
        invoiceId: 'in_second',
      });
    });

    it('keeps the row pending, not voided, while the checkout refund is in flight', async () => {
      await renewBeforeSettling('open');
      stripe.setNextRefundStatus('pending');

      expect(await sweep()).toEqual([
        expect.objectContaining({ status: 'pending', settlement: 'in_flight' }),
      ]);
      expect(stripe.fake.invoices.voidInvoice).toHaveBeenCalledWith('in_renewal');
      expect(stripe.fake.invoices.voidInvoice).not.toHaveBeenCalledWith('in_second');
      expect(mem.refunds.get('sub_second')).toMatchObject({ status: 'pending', refundId: 're_1' });
    });

    describe('rows older code recorded without a checkout invoice', () => {
      let errors: ReturnType<typeof vi.spyOn>;
      const manualLines = () =>
        errors.mock.calls.filter((call) => String(call[0]).startsWith(DUPLICATE_REFUND_MANUAL_LOG));
      beforeEach(() => {
        errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      });

      it('hands a row without invoice_id to a person, changing nothing in Stripe', async () => {
        await renewBeforeSettling('open');
        mem.refunds.set('sub_second', { ...mem.refunds.get('sub_second')!, invoiceId: null });

        expect(await sweep()).toEqual([
          expect.objectContaining({ status: 'needs_attention', settlement: 'needs_attention' }),
        ]);

        expectNoStripeWrites();
        expect(mem.refunds.get('sub_second')).toMatchObject({
          status: 'needs_attention',
          invoiceId: null,
          lastError: 'missing checkout invoice',
        });
        expect(manualLines()).toHaveLength(1);
        expect(String(manualLines()[0]![0])).toContain('"reason":"missing_checkout_invoice"');
      });

      it('does not close a legacy row whose succeeded refund was for the renewal', async () => {
        // Older code refunded latest_invoice (the paid renewal); that refund succeeded. The
        // checkout payment was never refunded.
        await renewBeforeSettling('paid');
        stripe.addRefund({
          id: 're_renewal',
          payment_intent: 'pi_renewal',
          amount: 1900,
          status: 'succeeded',
          metadata: { subscription: 'sub_second', attempt: '1' },
        });
        mem.refunds.set('sub_second', {
          ...mem.refunds.get('sub_second')!,
          invoiceId: null,
          refundId: 're_renewal',
          attempts: 1,
        });

        await sweep();
        await handle(event('evt_ch_r', 'charge.refunded', { id: 'ch_r', customer: 'cus_alice' }));

        expectNoStripeWrites();
        expect(mem.refunds.get('sub_second')).toMatchObject({
          status: 'needs_attention',
          refundId: 're_renewal',
          lastError: 'missing checkout invoice',
          resolvedAt: null,
        });
      });

      it('does not close a row whose recorded refund is on another payment', async () => {
        await renewBeforeSettling('paid');
        stripe.addRefund({
          id: 're_renewal',
          payment_intent: 'pi_renewal',
          amount: 1900,
          status: 'succeeded',
          metadata: { subscription: 'sub_second', attempt: '1' },
        });
        mem.refunds.set('sub_second', {
          ...mem.refunds.get('sub_second')!,
          refundId: 're_renewal',
          attempts: 1,
        });

        await sweep();

        expectNoStripeWrites();
        expect(mem.refunds.get('sub_second')).toMatchObject({
          status: 'needs_attention',
          lastError: 'missing checkout invoice',
        });
        expect(String(manualLines()[0]![0])).toContain('"reason":"refund_not_on_checkout_payment"');
      });

      it('makes no refund past the cap for a legacy row whose attempts hit another payment', async () => {
        // Older code made three refunds on the renewal, all failed; none is on the checkout payment.
        await renewBeforeSettling('paid');
        for (const n of [1, 2, 3]) {
          stripe.addRefund({
            id: `re_old_${n}`,
            payment_intent: 'pi_renewal',
            amount: 1900,
            status: 'failed',
            failure_reason: 'declined',
            metadata: { subscription: 'sub_second' },
          });
        }
        mem.refunds.set('sub_second', {
          ...mem.refunds.get('sub_second')!,
          invoiceId: null,
          refundId: 're_old_3',
          attempts: 3,
        });
        stripe.pruneIdempotencyKeys();

        await sweep();
        await handle(
          event('evt_later', 'customer.subscription.updated', {
            id: 'sub_first',
            customer: 'cus_alice',
          }),
        );

        expectNoStripeWrites();
        expect(mem.refunds.get('sub_second')).toMatchObject({
          status: 'needs_attention',
          attempts: 3,
          lastError: 'missing checkout invoice',
        });
      });

      it('makes no refund for a row whose attempts do not show on its checkout payment', async () => {
        await renewBeforeSettling('paid');
        mem.refunds.set('sub_second', {
          ...mem.refunds.get('sub_second')!,
          refundId: null,
          attempts: 3,
        });

        await sweep();

        expect(stripe.fake.refunds.create).not.toHaveBeenCalled();
        expect(mem.refunds.get('sub_second')).toMatchObject({
          status: 'needs_attention',
          attempts: 3,
          lastError: 'missing checkout invoice',
        });
        expect(String(manualLines()[0]![0])).toContain(
          '"reason":"attempts_not_on_checkout_payment"',
        );
      });
    });

    it('reads every page of the invoices when looking for paid renewals', async () => {
      const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      await renewBeforeSettling('paid');
      const list = stripe.fake.invoices.list.getMockImplementation()!;
      // The paid renewal is on the second page.
      stripe.fake.invoices.list.mockImplementation(async (params) => {
        const all = (await list(params)).data;
        const page = params?.starting_after
          ? all.filter((invoice) => invoice.id === 'in_renewal')
          : all.filter((invoice) => invoice.id !== 'in_renewal');
        return {
          object: 'list',
          has_more: !params?.starting_after,
          data: page,
        } as never;
      });

      await sweep();

      expect(stripe.fake.invoices.list).toHaveBeenCalledWith(
        expect.objectContaining({ subscription: 'sub_second', starting_after: 'in_second' }),
      );
      expect(mem.refunds.get('sub_second')).toMatchObject({
        status: 'needs_attention',
        lastError: expect.stringContaining('renewal paid: in_renewal'),
      });
      errors.mockRestore();
    });

    it('voids both and closes as voided when the checkout invoice was open too', async () => {
      await renewBeforeSettling('open', 'open');

      await sweep();

      expect(stripe.fake.invoices.voidInvoice.mock.calls.map((call) => call[0]).sort()).toEqual([
        'in_renewal',
        'in_second',
      ]);
      expect(stripe.fake.refunds.create).not.toHaveBeenCalled();
      expect(mem.refunds.get('sub_second')?.status).toBe('voided');
    });

    it('refunds the checkout payment, then hands a paid renewal to a person', async () => {
      const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      await renewBeforeSettling('paid');

      expect(await sweep()).toEqual([
        expect.objectContaining({ status: 'needs_attention', settlement: 'needs_attention' }),
      ]);
      // One refund, for the checkout payment only; the renewal is left to a person.
      expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(1);
      expect(stripe.fake.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({ payment_intent: 'pi_2' }),
        expect.anything(),
      );
      expect(mem.refunds.get('sub_second')).toMatchObject({
        status: 'needs_attention',
        refundId: 're_1',
        lastError: expect.stringContaining('renewal paid: in_renewal'),
      });
      const lines = errors.mock.calls.filter((call) =>
        String(call[0]).startsWith(DUPLICATE_REFUND_MANUAL_LOG),
      );
      expect(lines).toHaveLength(1);
      expect(String(lines[0]![0])).toContain('"reason":"renewal_paid"');

      // Refunded from the dashboard: charge.refunded closes the row.
      stripe.addRefund({
        id: 're_dash',
        payment_intent: 'pi_renewal',
        amount: 1900,
        status: 'succeeded',
      });
      await handle(
        event('evt_ch_renewal', 'charge.refunded', { id: 'ch_r', customer: 'cus_alice' }),
      );
      expect(mem.refunds.get('sub_second')?.status).toBe('refunded');
      expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(1);
      errors.mockRestore();
    });

    it('re-checks a needs_attention row without voiding, canceling or refunding anything', async () => {
      await renewBeforeSettling('open', 'open');
      mem.refunds.set('sub_second', {
        ...mem.refunds.get('sub_second')!,
        status: 'needs_attention',
        invoiceId: null,
      });

      await sweep();
      await handle(
        event('evt_later', 'customer.subscription.updated', {
          id: 'sub_first',
          customer: 'cus_alice',
        }),
      );

      expectNoStripeWrites();
      expect(mem.refunds.get('sub_second')).toMatchObject({
        status: 'needs_attention',
        invoiceId: null,
      });
    });
  });

  describe('a checkout event first processed after the duplicate renewed', () => {
    const renewal = subscriptionInvoice({
      id: 'in_renewal',
      subscription: 'sub_second',
      status: 'paid',
      billingReason: 'subscription_cycle',
      created: NEWER + 30 * 86400,
      paymentIntent: 'pi_renewal',
    });
    const checkout = subscriptionInvoice({
      id: 'in_second',
      subscription: 'sub_second',
      status: 'paid',
      billingReason: 'subscription_create',
      created: NEWER,
      paymentIntent: 'pi_2',
    });
    let errors: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      // By the time the event is handled, latest_invoice is the paid renewal.
      stripe.setSubscription(
        subscription({
          id: 'sub_second',
          customer: 'cus_alice',
          created: NEWER,
          latestInvoice: 'in_renewal',
          periodStart: '2026-12-05T00:00:00Z',
          periodEnd: '2027-01-05T00:00:00Z',
        }),
      );
      stripe.setInvoice(checkout);
      stripe.setInvoice(renewal);
    });

    function delayedCheckout(invoice: string | null) {
      return handle(
        event('evt_late', 'checkout.session.completed', {
          id: 'cs_2',
          mode: 'subscription',
          client_reference_id: ALICE,
          customer: 'cus_alice',
          subscription: 'sub_second',
          invoice,
        }),
      );
    }

    it("refunds the session's invoice, not latest_invoice, and hands the renewal to a person", async () => {
      await delayedCheckout('in_second');

      expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(1);
      expect(stripe.fake.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({ payment_intent: 'pi_2' }),
        { idempotencyKey: 'sagelytics-duplicate-refund-sub_second' },
      );
      expect(mem.refunds.get('sub_second')).toMatchObject({
        status: 'needs_attention',
        invoiceId: 'in_second',
        refundId: 're_1',
        lastError: expect.stringContaining('renewal paid: in_renewal; checkout invoice in_second'),
      });
    });

    it('falls back to the subscription_create invoice when the session has none', async () => {
      await delayedCheckout(null);

      expect(stripe.fake.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({ payment_intent: 'pi_2' }),
        expect.anything(),
      );
      expect(mem.refunds.get('sub_second')).toMatchObject({ invoiceId: 'in_second' });
    });

    it('records the row without an invoice and hands it to a person when none is found', async () => {
      stripe.setInvoice({ ...checkout, billing_reason: 'manual' });

      await delayedCheckout(null);

      expectNoStripeWrites();
      expect(mem.refunds.get('sub_second')).toMatchObject({
        status: 'needs_attention',
        invoiceId: null,
        lastError: 'missing checkout invoice',
      });
      expect(mem.subscriptions.get(ALICE)?.stripeSubscriptionId).toBe('sub_first');
      errors.mockRestore();
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
