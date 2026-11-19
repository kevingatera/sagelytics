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

/** Statuses that grant the paid plan outright. */
const PAID_STATUSES = new Set(['active', 'trialing']);
/** Statuses that keep the paid plan until the already-paid period ends. */
const GRACE_STATUSES = new Set(['past_due', 'canceled']);

export function isPaidSubscription(state: SubscriptionState | null, now: Date): boolean {
  if (!state?.status) return false;
  if (PAID_STATUSES.has(state.status)) return true;
  if (GRACE_STATUSES.has(state.status)) {
    return state.currentPeriodEnd !== null && state.currentPeriodEnd.getTime() > now.getTime();
  }
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
 * Pro users are metered over their Stripe period; if Stripe has not told us the period yet
 * (or it has already lapsed) we fall back to the calendar month.
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
