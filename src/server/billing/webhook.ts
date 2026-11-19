import type Stripe from 'stripe';

import type { BillingDuplicateRefund, BillingSubscription } from '~/server/db/schema';

import { isPaidSubscription } from './plans';
import type { StripeClient } from './stripe';
import type { BillingStore, DuplicateRefundStatus, SubscriptionFields } from './store';

export type WebhookOutcome = 'processed' | 'duplicate';

type Log = (message: string, meta?: Record<string, unknown>) => void;

export interface WebhookDeps {
  stripe: StripeClient;
  store: BillingStore;
  log?: Log;
  /** For things a human must look at, such as a refunded duplicate subscription. */
  alert?: Log;
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

const defaultLog: Log = (message, meta) => console.log(`[BILLING] ${message}`, meta ?? {});
const defaultAlert: Log = (message, meta) =>
  console.error(`[BILLING] ALERT: ${message}`, meta ?? {});

/** Statuses of a subscription the customer is (or is about to be) paying for. */
const KEEPER_STATUSES = new Set<string>(['active', 'trialing', 'past_due']);
/** Statuses whose access depends on what was actually paid, so the paid period is looked up. */
const PAID_LOOKUP_STATUSES = new Set<string>(['active', 'past_due', 'canceled']);

interface Period {
  start: Date;
  end: Date;
}

function idOf(value: string | { id?: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : (value.id ?? null);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function later(a: Period | null, b: Period | null): Period | null {
  if (!a) return b;
  if (!b) return a;
  return b.end.getTime() > a.end.getTime() ? b : a;
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
 * The service period a paid invoice bought for this subscription: its non-proration subscription
 * lines. A proration-only invoice (a mid-cycle change) buys no new period and returns null.
 */
export function invoiceServicePeriod(
  invoice: Pick<Stripe.Invoice, 'lines'>,
  subscriptionId: string,
): Period | null {
  let best: Period | null = null;
  for (const line of invoice.lines?.data ?? []) {
    const details = line.parent?.subscription_item_details;
    if (line.parent?.type !== 'subscription_item_details' || !details || details.proration) {
      continue;
    }
    if (details.subscription && details.subscription !== subscriptionId) continue;
    best = later(best, {
      start: new Date(line.period.start * 1000),
      end: new Date(line.period.end * 1000),
    });
  }
  return best;
}

/** Re-read Stripe for the latest service period this subscription has paid for. */
async function latestPaidPeriod(subscriptionId: string, stripe: StripeClient) {
  const { data } = await stripe.invoices.list({
    subscription: subscriptionId,
    status: 'paid',
    limit: 5,
  });
  let best: Period | null = null;
  for (const invoice of data) best = later(best, invoiceServicePeriod(invoice, subscriptionId));
  return best;
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

/**
 * Refund what the duplicate's first invoice collected (Checkout charges it immediately, so this
 * is everything the customer paid for it), or void it if it is still open. Safe to repeat: the
 * refund uses one idempotency key per subscription, and a charge that is already refunded counts
 * as done.
 */
async function refundDuplicate(
  sub: Stripe.Subscription,
  deps: FullDeps,
): Promise<{ status: Exclude<DuplicateRefundStatus, 'pending'>; refundId: string | null }> {
  const invoiceId = idOf(sub.latest_invoice);
  if (!invoiceId) return { status: 'nothing_to_refund', refundId: null };
  const invoice = await deps.stripe.invoices.retrieve(invoiceId, { expand: ['payments'] });
  if (invoice.status === 'open') {
    // Not paid yet (for example a delayed payment method): void it so it can never be collected.
    await deps.stripe.invoices.voidInvoice(invoiceId);
    return { status: 'voided', refundId: null };
  }
  if (invoice.status === 'void') return { status: 'voided', refundId: null };
  const paid = invoice.payments?.data.find((payment) => payment.status === 'paid');
  const paymentIntent = idOf(paid?.payment.payment_intent);
  const charge = idOf(paid?.payment.charge);
  if (!paymentIntent && !charge) return { status: 'nothing_to_refund', refundId: null };
  try {
    const refund = await deps.stripe.refunds.create(
      {
        ...(paymentIntent ? { payment_intent: paymentIntent } : { charge: charge! }),
        reason: 'duplicate',
        metadata: { subscription: sub.id, reason: 'duplicate_subscription' },
      },
      { idempotencyKey: `sagelytics-duplicate-refund-${sub.id}` },
    );
    return { status: 'refunded', refundId: refund.id };
  } catch (error) {
    if (isAlreadyRefunded(error)) return { status: 'refunded', refundId: null };
    throw error;
  }
}

/**
 * Cancel and refund one recorded duplicate. Runs under the owner's billing lock, after the event
 * that recorded it has committed. Returns false, with the failure stored on the row, if Stripe
 * refused; the row stays pending and the next attempt repeats the same idempotent calls.
 */
async function settleDuplicate(
  pending: BillingDuplicateRefund,
  store: BillingStore,
  deps: FullDeps,
): Promise<boolean> {
  const subscriptionId = pending.stripeSubscriptionId;
  const current = await store.getDuplicateRefund(subscriptionId);
  if (!current || current.status !== 'pending') return true;
  try {
    let sub = await deps.stripe.subscriptions.retrieve(subscriptionId);
    if (sub.status !== 'canceled' && sub.status !== 'incomplete_expired') {
      sub = await deps.stripe.subscriptions.cancel(
        subscriptionId,
        { prorate: false, invoice_now: false },
        { idempotencyKey: `sagelytics-duplicate-cancel-${subscriptionId}` },
      );
    }
    const { status, refundId } = await refundDuplicate(sub, deps);
    await store.resolveDuplicateRefund(subscriptionId, status, refundId);
    deps.alert('duplicate subscription canceled and refunded', {
      customer: current.stripeCustomerId,
      kept: current.keptSubscriptionId,
      canceled: subscriptionId,
      refund: refundId,
      outcome: status,
    });
    return true;
  } catch (error) {
    await store.recordDuplicateRefundFailure(subscriptionId, errorMessage(error));
    deps.alert('duplicate subscription refund failed; it stays pending and will be retried', {
      customer: current.stripeCustomerId,
      subscription: subscriptionId,
      attempts: current.attempts + 1,
      error: errorMessage(error),
    });
    return false;
  }
}

/** Settle every pending duplicate for a customer. Returns the ones still pending. */
async function settleDuplicates(customerId: string, deps: FullDeps) {
  const pending = await deps.store.listPendingDuplicateRefunds(customerId);
  const left: BillingDuplicateRefund[] = [];
  for (const row of pending) {
    const done = await deps.store.withUserLock(row.userId, (locked) =>
      settleDuplicate(row, locked, deps),
    );
    if (!done) left.push(row);
  }
  return left;
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
 * for one user apply one at a time and a slow, older read can never land after a newer one.
 *
 * After that, and on every redelivery, any duplicate subscription recorded for the customer is
 * canceled and refunded. If the refund that this event recorded is still owed, this throws
 * DuplicateRefundPendingError so the route answers 500 and Stripe redelivers the event. The
 * ledger row keeps the obligation after Stripe stops retrying; later events for the customer
 * retry it too.
 */
export async function handleStripeEvent(
  event: Stripe.Event,
  deps: WebhookDeps,
): Promise<WebhookOutcome> {
  const full: FullDeps = { log: defaultLog, alert: defaultAlert, ...deps };
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
    );
    outcome = ran ? 'processed' : 'duplicate';
  }
  if (outcome === 'duplicate') {
    full.log('duplicate event ignored', { id: event.id, type: event.type });
  }

  const { customerId } = eventRefs(event);
  if (customerId) {
    const owed = (await settleDuplicates(customerId, full)).filter(
      (row) => row.sourceEventId === event.id,
    );
    if (owed.length > 0) {
      throw new DuplicateRefundPendingError(owed.map((row) => row.stripeSubscriptionId));
    }
  }
  return outcome;
}
