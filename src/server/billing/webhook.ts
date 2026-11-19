import type Stripe from 'stripe';

import type { BillingDuplicateRefund, BillingSubscription } from '~/server/db/schema';

import { invoiceServicePeriod, later, latestPaidPeriod, type Period } from './paid-period';
import { isPaidSubscription } from './plans';
import type { StripeClient } from './stripe';
import type { BillingStore, SubscriptionFields } from './store';

export { invoiceServicePeriod };

export type WebhookOutcome = 'processed' | 'duplicate';

type Log = (message: string, meta?: Record<string, unknown>) => void;

export interface WebhookDeps {
  stripe: StripeClient;
  store: BillingStore;
  log?: Log;
  /** For things a human must look at, such as a refunded duplicate subscription. */
  alert?: Log;
  /** How long an event waits for the user's billing lock before failing (default 5 s). */
  lockWaitMs?: number;
}

type FullDeps = Required<WebhookDeps>;

/**
 * Thrown after an event is recorded when the duplicate refund it found has not gone through yet.
 * The route answers 500, so Stripe redelivers the event and the refund is tried again.
 */
export class DuplicateRefundPendingError extends Error {
  readonly subscriptions: string[];
  constructor(subscriptions: string[]) {
    super(`duplicate subscription refund still pending: ${subscriptions.join(', ')}`);
    this.name = 'DuplicateRefundPendingError';
    this.subscriptions = subscriptions;
  }
}

/**
 * The lock is held by another event or checkout for this user, each bounded by Stripe's client
 * timeout. Waiting longer would pile pool connections behind a slow Stripe; failing lets Stripe
 * redeliver the event later, still in order, because nothing was recorded.
 */
export const WEBHOOK_LOCK_WAIT_MS = 5_000;

const defaultLog: Log = (message, meta) => console.log(`[BILLING] ${message}`, meta ?? {});
const defaultAlert: Log = (message, meta) =>
  console.error(`[BILLING] ALERT: ${message}`, meta ?? {});

/** Statuses of a subscription the customer is (or is about to be) paying for. */
const KEEPER_STATUSES = new Set<string>(['active', 'trialing', 'past_due']);
/** Statuses whose access depends on what was actually paid, so the paid period is looked up. */
const PAID_LOOKUP_STATUSES = new Set<string>(['active', 'past_due', 'canceled']);

function idOf(value: string | { id?: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : (value.id ?? null);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function subscriptionFields(
  sub: Stripe.Subscription,
  paidPeriod: Period | null,
): SubscriptionFields {
  // Since API 2025-03-31.basil the billing period lives on the subscription items.
  const item = sub.items.data[0];
  return {
    stripeSubscriptionId: sub.id,
    status: sub.status,
    priceId: item?.price.id ?? null,
    currentPeriodStart: item ? new Date(item.current_period_start * 1000) : null,
    currentPeriodEnd: item ? new Date(item.current_period_end * 1000) : null,
    paidPeriodStart: paidPeriod?.start ?? null,
    paidPeriodEnd: paidPeriod?.end ?? null,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  };
}

/**
 * The period that grants pro. A trial counts as granted. Otherwise it is the latest paid invoice's
 * service period, never current_period_end: Stripe advances that on renewal whether or not the
 * renewal is paid. For the same subscription the stored paid period never moves backwards, so a
 * lagging read cannot undo a payment we already saw. `hint` is a period from a signed
 * invoice.paid payload.
 */
async function paidPeriodFor(
  sub: Stripe.Subscription,
  row: BillingSubscription | null,
  stripe: StripeClient,
  hint: Period | null,
): Promise<Period | null> {
  const item = sub.items.data[0];
  let period: Period | null = null;
  if (sub.status === 'trialing' && item) {
    period = {
      start: new Date(item.current_period_start * 1000),
      end: new Date(item.current_period_end * 1000),
    };
  } else if (PAID_LOOKUP_STATUSES.has(sub.status)) {
    period = await latestPaidPeriod(sub.id, stripe);
  }
  period = later(period, hint);
  if (row?.stripeSubscriptionId === sub.id && row.paidPeriodStart && row.paidPeriodEnd) {
    period = later({ start: row.paidPeriodStart, end: row.paidPeriodEnd }, period);
  }
  return period;
}

/**
 * Persist a subscription for the user who owns its customer. The user is found from our own
 * customer link; Stripe metadata (written by our server at checkout) is only a fallback for a
 * user with no link yet. Nothing in the payload can move a customer to a different user.
 */
async function applySubscription(
  sub: Stripe.Subscription,
  store: BillingStore,
  deps: FullDeps,
  hint: Period | null = null,
) {
  const { log } = deps;
  const customerId = idOf(sub.customer);
  if (!customerId) return log('subscription without customer, skipped', { subscription: sub.id });

  if (await store.getDuplicateRefund(sub.id)) {
    return log('duplicate subscription ignored; it is canceled and refunded', {
      subscription: sub.id,
    });
  }

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

  // One subscription per user: a different subscription that can no longer bill (canceled or
  // never paid) must not overwrite a live one.
  const now = new Date();
  if (
    row.stripeSubscriptionId &&
    row.stripeSubscriptionId !== sub.id &&
    isPaidSubscription(row, now) &&
    !KEEPER_STATUSES.has(sub.status)
  ) {
    return log('stale subscription ignored; user has another live subscription', {
      userId: row.userId,
      subscription: sub.id,
    });
  }

  const paidPeriod = await paidPeriodFor(sub, row, deps.stripe, hint);
  await store.saveSubscription(row.userId, customerId, subscriptionFields(sub, paidPeriod));
  log('subscription saved', {
    userId: row.userId,
    subscription: sub.id,
    status: sub.status,
    paidPeriodEnd: paidPeriod?.end.toISOString() ?? null,
  });
}

function isAlreadyRefunded(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === 'charge_already_refunded';
}

/** How a duplicate's refund obligation stands after a settlement attempt. */
type Settlement = 'settled' | 'in_flight' | 'owed';

/** Stripe accepted these refunds but has not moved the money yet. */
const IN_FLIGHT_REFUND_STATUSES = new Set(['pending', 'requires_action']);

/**
 * Idempotency key for a duplicate's refund. The first refund keeps the original key. A refund
 * that replaces one Stripe failed is keyed on the failed refund's id: the old key would only
 * replay the failed refund, and concurrent settlers replacing the same failure still create one.
 */
export function duplicateRefundKey(subscriptionId: string, replaces: string | null): string {
  const base = `sagelytics-duplicate-refund-${subscriptionId}`;
  return replaces ? `${base}-after-${replaces}` : base;
}

type DuplicateCharge =
  | { kind: 'voided' | 'nothing_to_refund' }
  | { kind: 'payment'; paymentIntent: string | null; charge: string | null; amount: number | null };

/**
 * What the duplicate's first invoice collected (Checkout charges it immediately, so this is
 * everything the customer paid for it). An invoice that is still open is voided here, so it can
 * never be collected.
 */
async function duplicateCharge(sub: Stripe.Subscription, deps: FullDeps): Promise<DuplicateCharge> {
  const invoiceId = idOf(sub.latest_invoice);
  if (!invoiceId) return { kind: 'nothing_to_refund' };
  const invoice = await deps.stripe.invoices.retrieve(invoiceId, { expand: ['payments'] });
  if (invoice.status === 'open') {
    await deps.stripe.invoices.voidInvoice(invoiceId);
    return { kind: 'voided' };
  }
  if (invoice.status === 'void') return { kind: 'voided' };
  const paid = invoice.payments?.data.find((payment) => payment.status === 'paid');
  const paymentIntent = idOf(paid?.payment.payment_intent);
  const charge = idOf(paid?.payment.charge);
  if (!paymentIntent && !charge) return { kind: 'nothing_to_refund' };
  const amount = paid?.amount_paid ?? invoice.amount_paid ?? null;
  return { kind: 'payment', paymentIntent, charge, amount };
}

async function closeRefunded(row: BillingDuplicateRefund, refundId: string | null, deps: FullDeps) {
  if (!(await deps.store.resolveDuplicateRefund(row.stripeSubscriptionId, 'refunded', refundId))) {
    return;
  }
  deps.alert('duplicate subscription canceled and refunded', {
    customer: row.stripeCustomerId,
    kept: row.keptSubscriptionId,
    canceled: row.stripeSubscriptionId,
    refund: refundId,
    outcome: 'refunded',
  });
}

/**
 * Where a refund Stripe accepted leaves the row: succeeded closes it, pending or requires_action
 * keeps waiting on it, and failed or canceled (no money moved) means it must be replaced.
 */
async function followRefund(
  row: BillingDuplicateRefund,
  refund: Stripe.Refund,
  deps: FullDeps,
): Promise<Settlement | 'failed'> {
  const status = refund.status ?? 'pending';
  if (status === 'succeeded') {
    await closeRefunded(row, refund.id, deps);
    return 'settled';
  }
  if (!IN_FLIGHT_REFUND_STATUSES.has(status)) return 'failed';
  if (status === 'requires_action') {
    deps.alert('duplicate refund needs action in Stripe before it can complete', {
      customer: row.stripeCustomerId,
      subscription: row.stripeSubscriptionId,
      refund: refund.id,
    });
  }
  return 'in_flight';
}

function refundFailure(refund: Stripe.Refund): string {
  return `refund ${refund.id} ${refund.status}: ${refund.failure_reason ?? 'no reason given'}`;
}

/**
 * Cancel and refund one recorded duplicate, after the event that recorded it has committed.
 *
 * The obligation closes only when Stripe reports a refund succeeded, the payment is fully refunded
 * by any means (a dashboard refund counts), or there was nothing to refund. While a refund is
 * pending its id stays on the row and each settlement retrieves it. When Stripe fails it, the
 * failure is counted and a replacement refund is made under a new idempotency key.
 *
 * Runs outside any transaction and without the user's lock, so no pool connection waits on
 * Stripe here. Concurrent settlers are safe: Stripe writes are idempotent (one key per refund
 * being replaced), and the ledger only moves by compare-and-set on the refund it last saw.
 */
async function settleDuplicate(subscriptionId: string, deps: FullDeps): Promise<Settlement> {
  const { store, stripe } = deps;
  const row = await store.getDuplicateRefund(subscriptionId);
  if (row?.status !== 'pending') return 'settled';
  try {
    // The refund the row is waiting on. Past this block it is either absent or failed.
    let failed: Stripe.Refund | null = null;
    if (row.refundId) {
      const current = await stripe.refunds.retrieve(row.refundId);
      const outcome = await followRefund(row, current, deps);
      if (outcome !== 'failed') return outcome;
      failed = current;
    }
    const replaces = failed?.id ?? null;

    let sub = await stripe.subscriptions.retrieve(subscriptionId);
    if (sub.status !== 'canceled' && sub.status !== 'incomplete_expired') {
      sub = await stripe.subscriptions.cancel(
        subscriptionId,
        { prorate: false, invoice_now: false },
        { idempotencyKey: `sagelytics-duplicate-cancel-${subscriptionId}` },
      );
    }

    const target = await duplicateCharge(sub, deps);
    if (target.kind !== 'payment') {
      if (await store.resolveDuplicateRefund(subscriptionId, target.kind, null)) {
        deps.alert('duplicate subscription canceled; nothing was collected', {
          customer: row.stripeCustomerId,
          kept: row.keptSubscriptionId,
          canceled: subscriptionId,
          outcome: target.kind,
        });
      }
      return 'settled';
    }
    const payment = target.paymentIntent
      ? { payment_intent: target.paymentIntent }
      : { charge: target.charge! };

    // Everything Stripe shows for this payment, ours or not.
    const { data: refunds } = await stripe.refunds.list({ ...payment, limit: 100 });
    const succeeded = refunds.filter((refund) => refund.status === 'succeeded');
    const refunded = succeeded.reduce((total, refund) => total + refund.amount, 0);
    if (target.amount !== null && refunded >= target.amount) {
      await closeRefunded(row, succeeded[0]?.id ?? null, deps);
      return 'settled';
    }
    // A refund of ours Stripe is still working on (for example, made before a crash).
    const inFlight = refunds.find(
      (refund) =>
        refund.id !== replaces &&
        refund.metadata?.subscription === subscriptionId &&
        IN_FLIGHT_REFUND_STATUSES.has(refund.status ?? ''),
    );

    let refund: Stripe.Refund;
    if (inFlight) {
      refund = inFlight;
    } else {
      try {
        refund = await stripe.refunds.create(
          {
            ...payment,
            reason: 'duplicate',
            metadata: { subscription: subscriptionId, reason: 'duplicate_subscription' },
          },
          { idempotencyKey: duplicateRefundKey(subscriptionId, replaces) },
        );
      } catch (error) {
        if (!isAlreadyRefunded(error)) throw error;
        // Stripe itself reports the charge fully refunded.
        await closeRefunded(row, null, deps);
        return 'settled';
      }
    }
    if (!(await store.trackDuplicateRefund(subscriptionId, row.refundId, refund.id))) {
      // Another settler moved the row on first; it follows its own refund from here.
      return 'in_flight';
    }
    if (failed) {
      // Counted once, here, where it is replaced.
      await store.recordDuplicateRefundFailure(subscriptionId, refundFailure(failed));
      deps.alert('duplicate refund failed at Stripe; replaced with a new refund', {
        customer: row.stripeCustomerId,
        subscription: subscriptionId,
        failed: failed.id,
        reason: failed.failure_reason ?? null,
        replacement: refund.id,
      });
    }
    const outcome = await followRefund({ ...row, refundId: refund.id }, refund, deps);
    // Failed on creation: the next settlement replaces it, and counts it then.
    return outcome === 'failed' ? 'owed' : outcome;
  } catch (error) {
    await store.recordDuplicateRefundFailure(subscriptionId, errorMessage(error));
    deps.alert('duplicate subscription refund failed; it stays owed and will be retried', {
      customer: row.stripeCustomerId,
      subscription: subscriptionId,
      attempts: row.attempts + 1,
      error: errorMessage(error),
    });
    return 'owed';
  }
}

/**
 * The ledger rows an event should settle, and whether it answers for them: if a row it answers
 * for is still owed with no refund in flight, the event fails so Stripe redelivers it.
 */
async function duplicatesFor(
  event: Stripe.Event,
  store: BillingStore,
): Promise<{
  rows: BillingDuplicateRefund[];
  answersFor: (row: BillingDuplicateRefund) => boolean;
}> {
  switch (event.type) {
    // Our refunds carry the duplicate's subscription in their metadata.
    case 'refund.updated':
    case 'refund.failed':
    case 'charge.refund.updated': {
      const subscriptionId = event.data.object.metadata?.subscription;
      const row = subscriptionId ? await store.getDuplicateRefund(subscriptionId) : null;
      return { rows: row?.status === 'pending' ? [row] : [], answersFor: () => true };
    }
    // Any refund of the customer's charges, including one made in the dashboard.
    case 'charge.refunded': {
      const customerId = idOf(event.data.object.customer);
      const rows = customerId ? await store.listPendingDuplicateRefunds(customerId) : [];
      return { rows, answersFor: () => false };
    }
    default: {
      const { customerId } = eventRefs(event);
      const rows = customerId ? await store.listPendingDuplicateRefunds(customerId) : [];
      return { rows, answersFor: (row) => row.sourceEventId === event.id };
    }
  }
}

/**
 * Backstop for the checkout guard. If the customer already has an older subscription they are
 * paying for, the one this checkout created is a duplicate. It is recorded in the refund ledger
 * here, in the event transaction, and canceled and refunded once that commits. The oldest live
 * subscription always wins, so the outcome does not depend on event order. Returns the
 * subscription to store for the user.
 */
async function resolveDuplicate(
  created: Stripe.Subscription,
  customerId: string,
  userId: string,
  eventId: string,
  store: BillingStore,
  deps: FullDeps,
): Promise<Stripe.Subscription> {
  if (!KEEPER_STATUSES.has(created.status)) return created;
  const { data } = await deps.stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 20,
  });
  const keeper = data
    .filter((sub) => sub.id !== created.id && KEEPER_STATUSES.has(sub.status))
    .filter(
      (sub) =>
        sub.created < created.created || (sub.created === created.created && sub.id < created.id),
    )
    .sort((a, b) => a.created - b.created || a.id.localeCompare(b.id))[0];
  if (!keeper) return created;

  await store.recordDuplicateRefund({
    stripeSubscriptionId: created.id,
    stripeCustomerId: customerId,
    userId,
    keptSubscriptionId: keeper.id,
    sourceEventId: eventId,
  });
  deps.alert('duplicate subscription found; canceling and refunding it', {
    customer: customerId,
    kept: keeper.id,
    duplicate: created.id,
  });
  return keeper;
}

/** The customer an event concerns, and the server-written user id to fall back on. */
function eventRefs(event: Stripe.Event): { customerId: string | null; fallback: string | null } {
  switch (event.type) {
    case 'checkout.session.completed':
      return {
        customerId: idOf(event.data.object.customer),
        fallback: event.data.object.client_reference_id,
      };
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      return {
        customerId: idOf(event.data.object.customer),
        fallback: event.data.object.metadata?.userId ?? null,
      };
    case 'invoice.paid':
    case 'invoice.payment_failed':
      return { customerId: idOf(event.data.object.customer), fallback: null };
    default:
      return { customerId: null, fallback: null };
  }
}

/** The user whose billing lock an event must hold: from our customer link, else server metadata. */
async function lockUserFor(event: Stripe.Event, store: BillingStore): Promise<string | null> {
  const { customerId, fallback } = eventRefs(event);
  if (!customerId && !fallback) return null;
  const row = customerId ? await store.findByCustomerId(customerId) : null;
  return row?.userId ?? fallback ?? null;
}

/**
 * Apply an event. Runs inside the event transaction, under the user's billing lock, so the
 * Stripe re-read and the write happen as one step: whichever event commits last wrote the
 * freshest snapshot Stripe had at that moment.
 */
async function apply(event: Stripe.Event, store: BillingStore, deps: FullDeps): Promise<void> {
  const { stripe, log } = deps;
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.mode !== 'subscription') return;
      const userId = session.client_reference_id;
      const customerId = idOf(session.customer);
      const subscriptionId = idOf(session.subscription);
      if (!userId || !customerId) {
        return log('checkout session without user or customer, skipped', { session: session.id });
      }

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
      await store.clearCheckoutSession(userId, session.id);
      if (!subscriptionId) return;
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const keep = await resolveDuplicate(sub, customerId, userId, event.id, store, deps);
      return applySubscription(keep, store, deps);
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = await stripe.subscriptions.retrieve(event.data.object.id);
      return applySubscription(sub, store, deps);
    }

    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const subscriptionId = idOf(invoice.parent?.subscription_details?.subscription);
      log(event.type === 'invoice.paid' ? 'invoice paid' : 'invoice payment failed', {
        invoice: invoice.id,
        customer: idOf(invoice.customer),
        subscription: subscriptionId,
      });
      if (!subscriptionId) return;
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      // The signed payload is a paid invoice, so its period counts even if a list read lags.
      const hint =
        event.type === 'invoice.paid' && invoice.status === 'paid'
          ? invoiceServicePeriod(invoice, subscriptionId)
          : null;
      return applySubscription(sub, store, deps, hint);
    }

    default:
      return;
  }
}

/**
 * Apply a verified Stripe event exactly once. The event id is recorded in the same transaction
 * as the writes, so a failure rolls both back and Stripe's retry processes the event again. That
 * transaction holds the owning user's billing lock while it re-reads Stripe, so concurrent events
 * for one user apply one at a time and a slow, older read can never land after a newer one. The
 * wait for that lock is bounded (lockWaitMs): an event that cannot get it throws
 * BillingLockBusyError, nothing is recorded, and Stripe redelivers it later.
 *
 * After that, and on every redelivery, the duplicate refunds the event concerns are settled (see
 * settleDuplicate). If one the event answers for is still owed with no refund in flight, this
 * throws DuplicateRefundPendingError so the route answers 500 and Stripe redelivers the event. A
 * refund in flight is followed through refund webhooks and later settlements instead.
 */
export async function handleStripeEvent(
  event: Stripe.Event,
  deps: WebhookDeps,
): Promise<WebhookOutcome> {
  const full: FullDeps = {
    log: defaultLog,
    alert: defaultAlert,
    lockWaitMs: WEBHOOK_LOCK_WAIT_MS,
    ...deps,
  };
  let outcome: WebhookOutcome;
  // Fast path for redeliveries; runEventOnce below is the authoritative check.
  if (await full.store.isEventProcessed(event.id)) {
    outcome = 'duplicate';
  } else {
    const lockUserId = await lockUserFor(event, full.store);
    const ran = await full.store.runEventOnce(
      event.id,
      event.type,
      (store) => apply(event, store, full),
      lockUserId,
      { maxWaitMs: full.lockWaitMs },
    );
    outcome = ran ? 'processed' : 'duplicate';
  }
  if (outcome === 'duplicate') {
    full.log('duplicate event ignored', { id: event.id, type: event.type });
  }

  const { rows, answersFor } = await duplicatesFor(event, full.store);
  const owed: string[] = [];
  for (const row of rows) {
    const settlement = await settleDuplicate(row.stripeSubscriptionId, full);
    if (settlement === 'owed' && answersFor(row)) owed.push(row.stripeSubscriptionId);
  }
  if (owed.length > 0) throw new DuplicateRefundPendingError(owed);
  return outcome;
}
