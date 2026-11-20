import type Stripe from 'stripe';

import type { BillingDuplicateRefund, BillingSubscription } from '~/server/db/schema';

import { invoiceServicePeriod, later, latestPaidPeriod, type Period } from './paid-period';
import { isPaidSubscription } from './plans';
import type { StripeClient } from './stripe';
import {
  OPEN_DUPLICATE_REFUND_STATUSES,
  type BillingStore,
  type SubscriptionFields,
} from './store';

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

/**
 * How a duplicate's refund obligation stands after a settlement attempt. `needs_attention` is
 * still owed, but only a person can pay it now, so Stripe redelivering the event would not help.
 * `in_flight` means this settler saw a refund of ours that Stripe accepted. `contended` means
 * another settler moved the row first (took the attempt, re-pointed or flagged the row), so this
 * one does not know whether a refund exists: that settler's refund may yet fail, or never be made.
 */
export type Settlement = 'settled' | 'in_flight' | 'contended' | 'owed' | 'needs_attention';

/** Stripe accepted these refunds but has not moved the money yet. */
const IN_FLIGHT_REFUND_STATUSES = new Set(['pending', 'requires_action']);

/**
 * Refunds we make for one duplicate, counting the first. When the last of them fails, the row
 * goes to `needs_attention` instead of getting another replacement.
 */
export const MAX_DUPLICATE_REFUND_ATTEMPTS = 3;

/**
 * Failure reasons a new refund to the same payment method cannot fix
 * (https://docs.stripe.com/refunds#failed-refunds). Refunds only go back to the original payment
 * method, so a lost, stolen, expired or canceled card stays that way. A refund left pending 45
 * days for lack of balance, one failed at the business's request, and one on a charge disputed
 * meanwhile (the dispute decides it) are all, per Stripe, for a person to settle another way.
 * `declined` and `unknown` may be transient and are retried up to the cap.
 */
export const PERMANENT_REFUND_FAILURES: ReadonlySet<string> = new Set([
  'lost_or_stolen_card',
  'expired_or_canceled_card',
  'insufficient_funds',
  'merchant_request',
  'charge_for_pending_refund_disputed',
]);

export const DUPLICATE_REFUND_MANUAL_LOG = '[Billing] duplicate refund needs manual resolution';

/** A canceled refund was stopped on purpose (in the dashboard, or by us), so it is not redone. */
function isPermanentFailure(refund: Stripe.Refund): boolean {
  return refund.status === 'canceled' || PERMANENT_REFUND_FAILURES.has(refund.failure_reason ?? '');
}

/**
 * Idempotency key for a duplicate's refund attempt (1-based). The first keeps the original key.
 * Each later attempt gets its own key, because an earlier key would only replay the failed
 * refund. Retrying the same attempt, after a crash or a lost response, reuses its key, so within
 * Stripe's 24-hour key window it gets the same refund back. Past that window the attempt number in
 * the refund's metadata is what stops a second refund (see settleDuplicate).
 */
export function duplicateRefundKey(subscriptionId: string, attempt: number): string {
  const base = `sagelytics-duplicate-refund-${subscriptionId}`;
  return attempt <= 1 ? base : `${base}-attempt-${attempt}`;
}

/** The attempt number our code wrote on a refund, or null for one made without it. */
function attemptOf(refund: Stripe.Refund): number | null {
  const attempt = Number(refund.metadata?.attempt);
  return Number.isInteger(attempt) && attempt > 0 ? attempt : null;
}

type DuplicateCharge =
  | { kind: 'open' | 'voided' | 'nothing_to_refund' }
  | { kind: 'payment'; paymentIntent: string | null; charge: string | null; amount: number | null };

/** What an invoice (retrieved with `payments` expanded) collected. Changes nothing in Stripe. */
function chargeOf(invoice: Stripe.Invoice): DuplicateCharge {
  if (invoice.status === 'open') return { kind: 'open' };
  if (invoice.status === 'void') return { kind: 'voided' };
  const paid = invoice.payments?.data.find((payment) => payment.status === 'paid');
  const paymentIntent = idOf(paid?.payment.payment_intent);
  const charge = idOf(paid?.payment.charge);
  if (!paymentIntent && !charge) return { kind: 'nothing_to_refund' };
  const amount = paid?.amount_paid ?? invoice.amount_paid ?? null;
  return { kind: 'payment', paymentIntent, charge, amount };
}

/**
 * What the duplicate's checkout invoice collected (Checkout charges it immediately, so this is
 * everything the customer paid at checkout). Read only: an open invoice comes back as `open`.
 */
async function duplicateCharge(invoiceId: string, deps: FullDeps): Promise<DuplicateCharge> {
  const invoice = await deps.stripe.invoices.retrieve(invoiceId, { expand: ['payments'] });
  return chargeOf(invoice);
}

/** Every invoice of a subscription, all pages. */
async function invoicesOf(subscriptionId: string, deps: FullDeps): Promise<Stripe.Invoice[]> {
  const all: Stripe.Invoice[] = [];
  let startingAfter: string | undefined;
  for (;;) {
    const page = await deps.stripe.invoices.list({
      subscription: subscriptionId,
      limit: 100,
      ...(startingAfter && { starting_after: startingAfter }),
    });
    all.push(...page.data);
    const last = page.data.at(-1)?.id;
    if (!page.has_more || !last) return all;
    startingAfter = last;
  }
}

/**
 * The duplicate's invoices other than its checkout invoice (`invoice_id` on the row): renewals it
 * made before it was canceled.
 */
async function renewalsOf(row: BillingDuplicateRefund, deps: FullDeps): Promise<Stripe.Invoice[]> {
  const invoices = await invoicesOf(row.stripeSubscriptionId, deps);
  return invoices.filter((invoice) => invoice.id !== row.invoiceId);
}

/** Whether a refund is on the given payment. */
function refundOnPayment(
  refund: Stripe.Refund,
  target: Extract<DuplicateCharge, { kind: 'payment' }>,
): boolean {
  return target.paymentIntent
    ? idOf(refund.payment_intent) === target.paymentIntent
    : idOf(refund.charge) === target.charge;
}

/**
 * Renewals of the duplicate the customer paid and has not been fully refunded for. A paid
 * invoice whose payment cannot be found counts too, so a person looks at it.
 */
async function unrefundedRenewals(others: Stripe.Invoice[], deps: FullDeps): Promise<string[]> {
  const owed: string[] = [];
  for (const invoice of others) {
    if (invoice.status !== 'paid' || !invoice.amount_paid || !invoice.id) continue;
    const target = await duplicateCharge(invoice.id, deps);
    if (target.kind === 'payment' && (await refundsOf(target, deps)).fullyRefundedBy) continue;
    owed.push(invoice.id);
  }
  return owed;
}

type ClosedStatus = 'refunded' | 'voided' | 'nothing_to_refund';

/**
 * Close a row once its checkout invoice is settled. A pending row first checks the duplicate's
 * other invoices (`others`, listed here if not given): a paid renewal not yet refunded sends the
 * row to a person instead (flagPaidRenewal). A row a person owns was checked by settleFlagged.
 */
async function closeRow(
  row: BillingDuplicateRefund,
  status: ClosedStatus,
  refundId: string | null,
  deps: FullDeps,
  others?: Stripe.Invoice[],
): Promise<Settlement> {
  if (row.status === 'pending') {
    const current = await voidOpenRenewals(others ?? (await renewalsOf(row, deps)), deps);
    const renewals = await unrefundedRenewals(current, deps);
    if (renewals.length > 0) {
      const current = await deps.store.getDuplicateRefund(row.stripeSubscriptionId);
      if (current?.status !== 'pending') return 'contended';
      return flagPaidRenewal(current, renewals, deps);
    }
  }
  if (!(await deps.store.resolveDuplicateRefund(row.stripeSubscriptionId, status, refundId))) {
    return 'settled';
  }
  if (status === 'refunded') {
    deps.alert('duplicate subscription canceled and refunded', {
      customer: row.stripeCustomerId,
      kept: row.keptSubscriptionId,
      canceled: row.stripeSubscriptionId,
      refund: refundId,
      outcome: 'refunded',
    });
  } else {
    deps.alert('duplicate subscription canceled; nothing was collected', {
      customer: row.stripeCustomerId,
      kept: row.keptSubscriptionId,
      canceled: row.stripeSubscriptionId,
      outcome: status,
    });
  }
  return 'settled';
}

/**
 * Void the duplicate's open renewals, so none can be collected. Never closes the row. Returns the
 * invoices as they stand afterwards.
 */
async function voidOpenRenewals(
  others: Stripe.Invoice[],
  deps: FullDeps,
): Promise<Stripe.Invoice[]> {
  const after: Stripe.Invoice[] = [];
  for (const invoice of others) {
    if (invoice.status !== 'open' || !invoice.id) {
      after.push(invoice);
      continue;
    }
    await voidInvoice(invoice.id, deps);
    deps.log('voided an open renewal of a duplicate subscription', {
      subscription: idOf(invoice.parent?.subscription_details?.subscription),
      invoice: invoice.id,
    });
    after.push({ ...invoice, status: 'void' });
  }
  return after;
}

/** Void an invoice. One a concurrent settler voided first counts as done. */
async function voidInvoice(invoiceId: string, deps: FullDeps): Promise<void> {
  try {
    await deps.stripe.invoices.voidInvoice(invoiceId);
  } catch (error) {
    const invoice = await deps.stripe.invoices.retrieve(invoiceId);
    if (invoice.status !== 'void') throw error;
  }
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
  if (status === 'succeeded') return closeRow(row, 'refunded', refund.id, deps);
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

type Payment = { payment_intent: string } | { charge: string };

function paymentOf(target: Extract<DuplicateCharge, { kind: 'payment' }>): Payment {
  return target.paymentIntent
    ? { payment_intent: target.paymentIntent }
    : { charge: target.charge! };
}

/** Every refund Stripe shows for the payment, ours or not, and whether they cover all of it. */
async function refundsOf(
  target: Extract<DuplicateCharge, { kind: 'payment' }>,
  deps: FullDeps,
): Promise<{ refunds: Stripe.Refund[]; fullyRefundedBy: Stripe.Refund[] | null }> {
  const { data: refunds } = await deps.stripe.refunds.list({ ...paymentOf(target), limit: 100 });
  const succeeded = refunds.filter((refund) => refund.status === 'succeeded');
  const refunded = succeeded.reduce((total, refund) => total + refund.amount, 0);
  const full = target.amount !== null && refunded >= target.amount;
  return { refunds, fullyRefundedBy: full ? succeeded : null };
}

/**
 * Our refunds for one duplicate, newest first: those on the payment carrying its subscription in
 * their metadata, plus `current` (the row's own refund, just retrieved, so fresher than the list).
 */
function ourRefunds(
  refunds: Stripe.Refund[],
  subscriptionId: string,
  current: Stripe.Refund | null,
): Stripe.Refund[] {
  const ours = refunds
    .filter((refund) => refund.metadata?.subscription === subscriptionId)
    .map((refund) => (refund.id === current?.id ? current : refund));
  if (current && !ours.some((refund) => refund.id === current.id)) ours.unshift(current);
  return ours;
}

/**
 * Stop refunding a duplicate automatically and hand it to a person. Compare-and-set on the refund
 * and attempt count the row was read with, so of several settlers handling the same failure only
 * one moves the row and logs.
 */
async function flagForPerson(
  row: BillingDuplicateRefund,
  failed: Stripe.Refund | null,
  attempts: number,
  deps: FullDeps,
): Promise<Settlement> {
  const flagged = await deps.store.flagDuplicateRefund(
    row.stripeSubscriptionId,
    row.refundId,
    failed ? refundFailure(failed) : `${attempts} refunds failed`,
    { refundId: failed?.id ?? row.refundId, attempts, expectedAttempts: row.attempts },
  );
  if (!flagged) return 'contended';
  // One line, ids and the reason only, so log alerts can match it.
  console.error(
    `${DUPLICATE_REFUND_MANUAL_LOG} ${JSON.stringify({
      subscription: row.stripeSubscriptionId,
      refund: flagged.refundId,
      attempts: flagged.attempts,
      reason: failed?.failure_reason ?? failed?.status ?? 'attempts exhausted',
    })}`,
  );
  return 'needs_attention';
}

/**
 * The checkout invoice is settled, but the duplicate renewed and the customer paid a renewal too.
 * Refunding several payments per row would need per-payment attempts and keys, so a person
 * refunds the renewal. Compare-and-set like flagForPerson.
 */
async function flagPaidRenewal(
  row: BillingDuplicateRefund,
  renewals: string[],
  deps: FullDeps,
): Promise<Settlement> {
  const flagged = await deps.store.flagDuplicateRefund(
    row.stripeSubscriptionId,
    row.refundId,
    `renewal paid: ${renewals.join(', ')}; checkout invoice ${row.invoiceId ?? '(unknown)'} settled; refund the renewal by hand`,
    { refundId: row.refundId, attempts: row.attempts, expectedAttempts: row.attempts },
  );
  if (!flagged) return 'contended';
  console.error(
    `${DUPLICATE_REFUND_MANUAL_LOG} ${JSON.stringify({
      subscription: row.stripeSubscriptionId,
      refund: flagged.refundId,
      attempts: flagged.attempts,
      reason: 'renewal_paid',
      invoices: renewals,
    })}`,
  );
  return 'needs_attention';
}

const MISSING_CHECKOUT_INVOICE = 'missing checkout invoice';

/**
 * Hand a row to a person, changing nothing in Stripe, when its checkout invoice is unknown or what
 * it records does not belong to that invoice's payment: a refund on another payment, or more
 * attempts than that payment shows. Only older code wrote such rows, and it may have refunded a
 * renewal instead, so neither closing the row nor refunding again is safe. Compare-and-set like
 * flagForPerson.
 */
async function flagMissingInvoice(
  row: BillingDuplicateRefund,
  reason: string,
  deps: FullDeps,
): Promise<Settlement> {
  const flagged = await deps.store.flagDuplicateRefund(
    row.stripeSubscriptionId,
    row.refundId,
    MISSING_CHECKOUT_INVOICE,
    { refundId: row.refundId, attempts: row.attempts, expectedAttempts: row.attempts },
  );
  if (!flagged) return 'contended';
  console.error(
    `${DUPLICATE_REFUND_MANUAL_LOG} ${JSON.stringify({
      subscription: row.stripeSubscriptionId,
      refund: flagged.refundId,
      attempts: flagged.attempts,
      reason,
    })}`,
  );
  return 'needs_attention';
}

/**
 * A row a person owns is only read: nothing is voided, canceled or refunded. It closes, as
 * `refunded`, once Stripe shows the checkout payment fully refunded (for example by a refund made
 * in the dashboard) and no paid renewal is left unrefunded. A row with no checkout invoice stays
 * with the person.
 */
async function settleFlagged(row: BillingDuplicateRefund, deps: FullDeps): Promise<Settlement> {
  try {
    if (!row.invoiceId) return 'needs_attention';
    const target = await duplicateCharge(row.invoiceId, deps);
    // An open checkout invoice is left alone too: voiding it is for a person, not a re-check.
    if (target.kind !== 'payment') return 'needs_attention';
    const { fullyRefundedBy } = await refundsOf(target, deps);
    if (!fullyRefundedBy) return 'needs_attention';
    const others = await renewalsOf(row, deps);
    if ((await unrefundedRenewals(others, deps)).length > 0) return 'needs_attention';
    return await closeRow(row, 'refunded', fullyRefundedBy[0]?.id ?? null, deps, others);
  } catch (error) {
    deps.log('could not re-check a duplicate refund that needs attention', {
      subscription: row.stripeSubscriptionId,
      error: errorMessage(error),
    });
    return 'needs_attention';
  }
}

/**
 * Cancel and refund one recorded duplicate, after the event that recorded it has committed.
 *
 * The payment refunded is the checkout invoice's, stored on the row (see checkoutInvoiceOf). A row
 * without one, or whose refund or attempts are not on that payment, goes to a person untouched. Any
 * renewal the duplicate made that is still open is voided as part of the cancel, but that never
 * closes the row: it closes as `voided` only when the checkout invoice itself was open and is now
 * void. A paid renewal sends the row to a person once the checkout invoice is settled.
 *
 * The obligation closes only when Stripe reports a refund succeeded, the payment is fully refunded
 * by any means (a dashboard refund counts), or there was nothing to refund. While a refund is
 * pending its id stays on the row and each settlement retrieves it.
 *
 * Before making a refund, Stripe's list of the payment's refunds is the record of what was tried:
 * every refund carrying this subscription in its metadata counts, in any status, even one whose
 * response we never saw. One of ours in flight is adopted. One failed for a reason a new refund
 * cannot fix (PERMANENT_REFUND_FAILURES, or canceled) moves the row to `needs_attention`. Other
 * failures are replaced, up to MAX_DUPLICATE_REFUND_ATTEMPTS refunds in all, counted as the larger
 * of the row's `attempts` and what Stripe shows. Each attempt is written to the row before Stripe
 * is asked, and its number goes in the refund's metadata and idempotency key.
 *
 * Runs outside any transaction and without the user's lock, so no pool connection waits on
 * Stripe here. Concurrent settlers are safe: one reserves each attempt by compare-and-set on
 * `attempts`, a retry of an attempt reuses its idempotency key, and the row's refund moves only by
 * compare-and-set on the refund it last saw.
 */
async function settleDuplicate(subscriptionId: string, deps: FullDeps): Promise<Settlement> {
  const { store, stripe } = deps;
  const row = await store.getDuplicateRefund(subscriptionId);
  if (row?.status === 'needs_attention') return settleFlagged(row, deps);
  if (row?.status !== 'pending') return 'settled';
  if (!row.invoiceId) return flagMissingInvoice(row, 'missing_checkout_invoice', deps);
  const checkout = row.invoiceId;
  let attempts = row.attempts;
  try {
    const invoice = await stripe.invoices.retrieve(checkout, { expand: ['payments'] });
    // A stored renewal (older code took `latest_invoice`) must not be refunded in its place.
    if (invoice.billing_reason && invoice.billing_reason !== 'subscription_create') {
      return await flagMissingInvoice(row, 'stored_invoice_not_checkout', deps);
    }
    const target = chargeOf(invoice);
    // The refund the row is waiting on. Past this block it is either absent or failed.
    let failed: Stripe.Refund | null = null;
    if (row.refundId) {
      const current = await stripe.refunds.retrieve(row.refundId);
      if (target.kind !== 'payment' || !refundOnPayment(current, target)) {
        return await flagMissingInvoice(row, 'refund_not_on_checkout_payment', deps);
      }
      const outcome = await followRefund(row, current, deps);
      if (outcome !== 'failed') return outcome;
      failed = current;
    }
    // Checked before any cancel or void, so a row handed to a person has had nothing done to it.
    if (target.kind === 'payment' && row.attempts > 1) {
      const ours = ourRefunds((await refundsOf(target, deps)).refunds, subscriptionId, failed);
      const made = Math.max(ours.length, ...ours.map((refund) => attemptOf(refund) ?? 0));
      if (row.attempts > made + 1) {
        return await flagMissingInvoice(row, 'attempts_not_on_checkout_payment', deps);
      }
    }

    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    if (sub.status !== 'canceled' && sub.status !== 'incomplete_expired') {
      await stripe.subscriptions.cancel(
        subscriptionId,
        { prorate: false, invoice_now: false },
        { idempotencyKey: `sagelytics-duplicate-cancel-${subscriptionId}` },
      );
    }

    // Canceling stops new renewals; ones it already made and that are still open are voided, so
    // they can never be collected. That alone never closes the row.
    const others = await voidOpenRenewals(await renewalsOf(row, deps), deps);
    if (target.kind === 'open') {
      // Only the checkout invoice itself being voided closes the row as `voided`.
      await voidInvoice(checkout, deps);
      return await closeRow(row, 'voided', null, deps, others);
    }
    if (target.kind !== 'payment') return await closeRow(row, target.kind, null, deps, others);
    const { refunds, fullyRefundedBy } = await refundsOf(target, deps);
    if (fullyRefundedBy) {
      return await closeRow(row, 'refunded', fullyRefundedBy[0]?.id ?? null, deps, others);
    }

    // Every refund we made for this duplicate, in any status, including any whose response we
    // never saw (a timeout or crash after Stripe accepted it). The row may not know about those,
    // so Stripe decides what has already been tried.
    const ours = ourRefunds(refunds, subscriptionId, failed);
    const succeeded = ours.find((refund) => refund.status === 'succeeded');
    if (succeeded) return await closeRow(row, 'refunded', succeeded.id, deps, others);
    const made = Math.max(ours.length, ...ours.map((refund) => attemptOf(refund) ?? 0));
    // One reserved attempt Stripe does not show yet is a crash or a lost response, retried below
    // under its key. More than that were made on some other payment.
    if (row.attempts > made + 1) {
      return await flagMissingInvoice(row, 'attempts_not_on_checkout_payment', deps);
    }
    attempts = Math.max(row.attempts, made);
    const inFlight = ours.find((refund) => IN_FLIGHT_REFUND_STATUSES.has(refund.status ?? ''));
    // Past the in-flight check, every refund of ours failed or was canceled. The newest comes first.
    const lastFailed = inFlight ? failed : (failed ?? ours[0] ?? null);
    const gaveUp = inFlight ? undefined : ours.find(isPermanentFailure);
    if (gaveUp) return await flagForPerson(row, gaveUp, attempts, deps);

    let refund: Stripe.Refund;
    if (inFlight) {
      refund = inFlight;
    } else {
      let attempt: number;
      if (row.attempts > made) {
        // Reserved earlier, but Stripe shows no refund for it: a crash or an API error stopped
        // it. Retry it under the same key, so a refund Stripe did make comes back instead.
        attempt = row.attempts;
      } else {
        attempt = made + 1;
        if (attempt > MAX_DUPLICATE_REFUND_ATTEMPTS) {
          return await flagForPerson(row, lastFailed, attempts, deps);
        }
        // Count the attempt before asking Stripe, so a refund whose response is lost still counts.
        if (!(await store.reserveDuplicateRefundAttempt(subscriptionId, row.attempts, attempt))) {
          // Another settler took this attempt first. Its refund may fail or not be made at all,
          // so this is not proof that a refund exists (see refundCovered).
          return 'contended';
        }
        attempts = attempt;
      }
      try {
        refund = await stripe.refunds.create(
          {
            ...paymentOf(target),
            reason: 'duplicate',
            metadata: {
              subscription: subscriptionId,
              reason: 'duplicate_subscription',
              attempt: String(attempt),
            },
          },
          { idempotencyKey: duplicateRefundKey(subscriptionId, attempt) },
        );
      } catch (error) {
        if (!isAlreadyRefunded(error)) throw error;
        // Stripe itself reports the charge fully refunded.
        return await closeRow(row, 'refunded', null, deps, others);
      }
    }
    const counted = Math.max(attempts, attemptOf(refund) ?? 0);
    const failure = lastFailed ? refundFailure(lastFailed) : null;
    if (
      !(await store.trackDuplicateRefund(subscriptionId, row.refundId, refund.id, {
        attempts: counted,
        failure,
      }))
    ) {
      // Another settler moved the row on first; it follows its own refund from here.
      return 'contended';
    }
    if (lastFailed) {
      deps.alert('duplicate refund failed at Stripe; replaced with a new refund', {
        customer: row.stripeCustomerId,
        subscription: subscriptionId,
        failed: lastFailed.id,
        reason: lastFailed.failure_reason ?? null,
        replacement: refund.id,
        attempts: counted,
      });
    }
    const outcome = await followRefund({ ...row, refundId: refund.id }, refund, deps);
    // Failed on creation: it is already counted, and the next settlement replaces or flags it.
    return outcome === 'failed' ? 'owed' : outcome;
  } catch (error) {
    // An API error is not a new attempt: a reserved attempt is retried under the same key.
    await store.recordDuplicateRefundError(subscriptionId, errorMessage(error));
    deps.alert('duplicate subscription refund failed; it stays owed and will be retried', {
      customer: row.stripeCustomerId,
      subscription: subscriptionId,
      attempts,
      error: errorMessage(error),
    });
    return 'owed';
  }
}

/**
 * Whether a row the event answers for can be acknowledged after this event's settler lost a race
 * to another one. Re-reads the row: closed or with a person is covered, and so is a pending row
 * whose recorded refund Stripe shows in flight or succeeded. A pending row with no refund
 * recorded, or one whose refund failed, is not: the winning settler may have hit an API error,
 * crashed, or not stored its refund yet. Losing the race is never taken as proof a refund exists.
 */
async function refundCovered(subscriptionId: string, deps: FullDeps): Promise<boolean> {
  const row = await deps.store.getDuplicateRefund(subscriptionId);
  if (row?.status !== 'pending') return true;
  if (!row.refundId) return false;
  try {
    const refund = await deps.stripe.refunds.retrieve(row.refundId);
    const status = refund.status ?? 'pending';
    return status === 'succeeded' || IN_FLIGHT_REFUND_STATUSES.has(status);
  } catch (error) {
    deps.log('could not check the refund another settler recorded', {
      subscription: subscriptionId,
      refund: row.refundId,
      error: errorMessage(error),
    });
    return false;
  }
}

/**
 * The ledger rows an event should settle, and whether it answers for them: if a row it answers
 * for is still owed with no refund confirmed at Stripe, the event fails so Stripe redelivers it.
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
      const open = row && OPEN_DUPLICATE_REFUND_STATUSES.some((status) => status === row.status);
      return { rows: open ? [row] : [], answersFor: () => true };
    }
    // Any refund of the customer's charges, including one made in the dashboard.
    case 'charge.refunded': {
      const customerId = idOf(event.data.object.customer);
      const rows = customerId ? await store.listOpenDuplicateRefunds(customerId) : [];
      return { rows, answersFor: () => false };
    }
    // Every other event for the customer, so a row whose own event Stripe stopped retrying (about
    // 3 days) is settled by the customer's next checkout, subscription or invoice event.
    default: {
      const { customerId } = eventRefs(event);
      const rows = customerId ? await store.listOpenDuplicateRefunds(customerId) : [];
      return { rows, answersFor: (row) => row.sourceEventId === event.id };
    }
  }
}

export interface DuplicateSweepResult {
  subscription: string;
  customer: string;
  /** The row's status after the settlement. */
  status: string;
  settlement: Settlement;
}

/**
 * Settle every open duplicate refund, for every customer: the backstop for a row whose events
 * Stripe stopped retrying (about 3 days) and whose customer sends no further webhook. The same
 * settlement a webhook runs, so it is safe alongside live webhooks and may cancel, void or refund.
 * Rows a person owns are only re-checked. scripts/maintenance/resync-paid-periods.mjs runs it.
 */
export async function settleOpenDuplicateRefunds(
  deps: WebhookDeps,
): Promise<DuplicateSweepResult[]> {
  const full: FullDeps = {
    log: defaultLog,
    alert: defaultAlert,
    lockWaitMs: WEBHOOK_LOCK_WAIT_MS,
    ...deps,
  };
  const results: DuplicateSweepResult[] = [];
  for (const row of await full.store.listOpenDuplicateRefunds()) {
    const settlement = await settleDuplicate(row.stripeSubscriptionId, full);
    const after = await full.store.getDuplicateRefund(row.stripeSubscriptionId);
    results.push({
      subscription: row.stripeSubscriptionId,
      customer: row.stripeCustomerId,
      status: after?.status ?? row.status,
      settlement,
    });
  }
  return results;
}

/**
 * The invoice the checkout session created: the session's own `invoice`, else the subscription's
 * `subscription_create` invoice. Never `latest_invoice`: if this event is processed late, the
 * duplicate may already have renewed. Null if neither is found; settlement then hands the row to
 * a person.
 */
async function checkoutInvoiceOf(
  subscriptionId: string,
  sessionInvoice: string | null,
  deps: FullDeps,
): Promise<string | null> {
  if (sessionInvoice) return sessionInvoice;
  const invoices = await invoicesOf(subscriptionId, deps);
  return invoices.find((invoice) => invoice.billing_reason === 'subscription_create')?.id ?? null;
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
  sessionInvoice: string | null,
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
    invoiceId: await checkoutInvoiceOf(created.id, sessionInvoice, deps),
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
      const keep = await resolveDuplicate(
        sub,
        idOf(session.invoice),
        customerId,
        userId,
        event.id,
        store,
        deps,
      );
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
 * settleDuplicate). If one the event answers for is still owed with no refund confirmed at Stripe,
 * this throws DuplicateRefundPendingError so the route answers 500 and Stripe redelivers the
 * event. A settler that lost a race to another one re-reads the row first (refundCovered): only a
 * recorded refund Stripe shows in flight or succeeded, or a closed or flagged row, lets it
 * acknowledge. A refund in flight is followed through refund webhooks and later settlements.
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
    if (!answersFor(row)) continue;
    if (
      settlement === 'owed' ||
      (settlement === 'contended' && !(await refundCovered(row.stripeSubscriptionId, full)))
    ) {
      owed.push(row.stripeSubscriptionId);
    }
  }
  if (owed.length > 0) throw new DuplicateRefundPendingError(owed);
  return outcome;
}
