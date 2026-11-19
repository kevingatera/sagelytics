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
  cancelAtPeriodEnd: boolean;
}

export interface PlanInfo {
  plan: PlanName;
  /** Stripe subscription status, or null when the user never subscribed. */
  status: string | null;
  limits: PlanLimits;
  /** Usage window for metered limits: Stripe period for pro, calendar month (UTC) otherwise. */
  periodStart: Date;
  periodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

/** Statuses that grant the paid plan while the period (plus grace) has not ended. */
const PAID_STATUSES = new Set(['active', 'trialing', 'past_due']);
/** Canceled keeps the paid plan until the already-paid period ends, with no grace. */
const ENDED_PAID_STATUSES = new Set(['canceled']);
/**
 * Statuses where the Stripe subscription still exists and can bill again. A user in one of these
 * must manage it in the portal; a second checkout would create a duplicate subscription.
 */
const LIVE_STATUSES = new Set(['active', 'trialing', 'past_due', 'unpaid', 'paused']);

/**
 * How long past `current_period_end` a paid status keeps pro. Covers a renewal webhook that lands
 * late; Stripe's own dunning moves a failed renewal to past_due with a new period end.
 */
export const PAID_PERIOD_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

export function isLiveSubscriptionStatus(status: string | null | undefined): boolean {
  return Boolean(status && LIVE_STATUSES.has(status));
}

export function isPaidSubscription(state: SubscriptionState | null, now: Date): boolean {
  if (!state?.status || !state.currentPeriodEnd) return false;
  const end = state.currentPeriodEnd.getTime();
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
 * Pro needs a known period end (see isPaidSubscription). Pro users are metered over their Stripe
 * period; inside the grace window after it ends we fall back to the calendar month.
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

  const start = state?.currentPeriodStart ?? null;
  const end = state?.currentPeriodEnd ?? null;
  const stripePeriodValid =
    start !== null &&
    end !== null &&
    start.getTime() <= now.getTime() &&
    now.getTime() < end.getTime();

  return {
    plan: 'pro',
    status: state?.status ?? null,
    limits: limits.pro,
    periodStart: stripePeriodValid ? start : month.start,
    periodEnd: stripePeriodValid ? end : month.end,
    cancelAtPeriodEnd: state?.cancelAtPeriodEnd ?? false,
  };
}
