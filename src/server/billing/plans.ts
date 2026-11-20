export type PlanName = 'free' | 'pro';

export interface PlanLimits {
  discoveriesPerPeriod: number;
  monitoredProducts: number;
}

export type BillingLimits = Record<PlanName, PlanLimits>;

/** The subset of a sg_billing_subscription row that plan resolution needs. */
export interface SubscriptionState {
  status: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  /** Service period of the latest paid invoice, or the trial. Pro is granted from this. */
  paidPeriodStart: Date | null;
  paidPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface PlanInfo {
  plan: PlanName;
  /** Stripe subscription status, or null when the user never subscribed. */
  status: string | null;
  limits: PlanLimits;
  /** Usage window for metered limits: the paid period for pro, calendar month (UTC) otherwise. */
  periodStart: Date;
  periodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

/** Statuses that grant the paid plan while the paid period (plus grace) has not ended. */
const PAID_STATUSES = new Set(['active', 'trialing', 'past_due']);
/** Canceled keeps the paid plan until the already-paid period ends, with no grace. */
const ENDED_PAID_STATUSES = new Set(['canceled']);
/**
 * Statuses where the Stripe subscription still exists and can bill again. A user in one of these
 * must manage it in the portal; a second checkout would create a duplicate subscription.
 */
const LIVE_STATUSES = new Set(['active', 'trialing', 'past_due', 'unpaid', 'paused']);

/**
 * How long past the end of the last paid period a paid status keeps pro. Covers an `invoice.paid`
 * webhook that lands late, and a short dunning window. Stripe moves a failed renewal to past_due
 * and advances current_period_end anyway, which is why pro is never based on current_period_end.
 */
export const PAID_PERIOD_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

export function isLiveSubscriptionStatus(status: string | null | undefined): boolean {
  return Boolean(status && LIVE_STATUSES.has(status));
}

/**
 * When the paid service ends. A canceled subscription also ends at its own period end, which can
 * be earlier than what the last invoice covered (canceled at once, or refunded).
 */
function paidServiceEnd(state: SubscriptionState): Date | null {
  const paidEnd = state.paidPeriodEnd;
  if (!paidEnd) return null;
  if (state.status && ENDED_PAID_STATUSES.has(state.status) && state.currentPeriodEnd) {
    return state.currentPeriodEnd.getTime() < paidEnd.getTime() ? state.currentPeriodEnd : paidEnd;
  }
  return paidEnd;
}

export function isPaidSubscription(state: SubscriptionState | null, now: Date): boolean {
  if (!state?.status) return false;
  const paidEnd = paidServiceEnd(state);
  if (!paidEnd) return false;
  const end = paidEnd.getTime();
  if (PAID_STATUSES.has(state.status)) return now.getTime() < end + PAID_PERIOD_GRACE_MS;
  if (ENDED_PAID_STATUSES.has(state.status)) return now.getTime() < end;
  // incomplete, incomplete_expired, unpaid, paused
  return false;
}

export function calendarMonth(now: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

/**
 * Resolve a user's plan. With billing disabled everyone is free, whatever is stored.
 * Pro needs a known paid period end (see isPaidSubscription). Pro users are metered over their
 * paid period. Inside the grace window after it ends, the same window is stretched to the end of
 * the grace, so an unpaid renewal never starts a fresh allowance.
 */
export function resolvePlan(
  state: SubscriptionState | null,
  now: Date,
  limits: BillingLimits,
  billingEnabled: boolean,
): PlanInfo {
  const month = calendarMonth(now);
  const paid = billingEnabled && isPaidSubscription(state, now);

  if (!paid) {
    return {
      plan: 'free',
      status: state?.status ?? null,
      limits: limits.free,
      periodStart: month.start,
      periodEnd: month.end,
      cancelAtPeriodEnd: state?.cancelAtPeriodEnd ?? false,
    };
  }

  const start = state?.paidPeriodStart ?? null;
  const paidEnd = state ? paidServiceEnd(state) : null;
  // isPaidSubscription already checked that now is before the paid end (plus grace, if any).
  const end =
    paidEnd && now.getTime() >= paidEnd.getTime()
      ? new Date(paidEnd.getTime() + PAID_PERIOD_GRACE_MS)
      : paidEnd;
  const paidPeriodValid =
    start !== null &&
    end !== null &&
    start.getTime() <= now.getTime() &&
    now.getTime() < end.getTime();

  return {
    plan: 'pro',
    status: state?.status ?? null,
    limits: limits.pro,
    periodStart: paidPeriodValid ? start : month.start,
    periodEnd: paidPeriodValid ? end : month.end,
    cancelAtPeriodEnd: state?.cancelAtPeriodEnd ?? false,
  };
}
