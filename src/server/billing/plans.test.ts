import { describe, expect, it } from 'vitest';

import {
  calendarMonth,
  isLiveSubscriptionStatus,
  isPaidSubscription,
  PAID_PERIOD_GRACE_MS,
  resolvePlan,
  type BillingLimits,
  type SubscriptionState,
} from './plans';

const LIMITS: BillingLimits = {
  free: { discoveriesPerPeriod: 2, monitoredProducts: 5 },
  pro: { discoveriesPerPeriod: 50, monitoredProducts: 200 },
};

const NOW = new Date('2026-11-18T12:00:00Z');
const PERIOD_START = new Date('2026-11-05T00:00:00Z');
const PERIOD_END = new Date('2026-12-05T00:00:00Z');

/** A subscription whose current period is also the paid one, unless overridden. */
function sub(status: string | null, overrides: Partial<SubscriptionState> = {}): SubscriptionState {
  return {
    status,
    currentPeriodStart: PERIOD_START,
    currentPeriodEnd: PERIOD_END,
    paidPeriodStart: PERIOD_START,
    paidPeriodEnd: PERIOD_END,
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

/** Same row before migration 00xx: the paid period columns are NULL. */
function unmigrated(state: SubscriptionState): SubscriptionState {
  return { ...state, paidPeriodStart: null, paidPeriodEnd: null };
}

/**
 * The paid-period backfill in drizzle/0009: active and trialing rows copy their current period.
 * Every other status (past_due and canceled included) stays NULL: its current period may be a
 * renewal that was never paid. scripts/maintenance/resync-paid-periods.mjs fills those later.
 */
function backfill(state: SubscriptionState): SubscriptionState {
  if (state.paidPeriodEnd !== null) return state;
  if (!['active', 'trialing'].includes(state.status ?? '')) return state;
  return {
    ...state,
    paidPeriodStart: state.currentPeriodStart,
    paidPeriodEnd: state.currentPeriodEnd,
  };
}

describe('resolvePlan', () => {
  it('puts a user with no billing row on the free plan for the calendar month', () => {
    const plan = resolvePlan(null, NOW, LIMITS, true);
    expect(plan).toMatchObject({ plan: 'free', status: null, limits: LIMITS.free });
    expect(plan.periodStart.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(plan.periodEnd.toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });

  it('puts a customer without a subscription on the free plan', () => {
    expect(resolvePlan(sub(null), NOW, LIMITS, true).plan).toBe('free');
  });

  it.each(['active', 'trialing'])(
    'gives %s subscriptions the pro plan on the Stripe period',
    (status) => {
      const plan = resolvePlan(sub(status), NOW, LIMITS, true);
      expect(plan).toMatchObject({ plan: 'pro', status, limits: LIMITS.pro });
      expect(plan.periodStart).toEqual(PERIOD_START);
      expect(plan.periodEnd).toEqual(PERIOD_END);
    },
  );

  it('keeps canceled on pro until the paid period ends, then free with no grace', () => {
    expect(resolvePlan(sub('canceled'), NOW, LIMITS, true).plan).toBe('pro');
    const justEnded = new Date(NOW.getTime() - 1000);
    const lapsed = resolvePlan(sub('canceled', { paidPeriodEnd: justEnded }), NOW, LIMITS, true);
    expect(lapsed).toMatchObject({ plan: 'free', status: 'canceled', limits: LIMITS.free });
    expect(lapsed.periodStart.toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });

  it.each(['active', 'trialing', 'past_due'])(
    'keeps %s on pro for the 3-day grace after the period ends, then free',
    (status) => {
      const start = new Date('2026-10-16T12:00:00Z');
      const end = new Date('2026-11-16T12:00:00Z');
      const state = sub(status, { paidPeriodStart: start, paidPeriodEnd: end });
      const inGrace = resolvePlan(state, NOW, LIMITS, true);
      expect(inGrace.plan).toBe('pro');
      // The grace extends the paid window; it does not open a fresh allowance.
      expect(inGrace.periodStart).toEqual(start);
      expect(inGrace.periodEnd.getTime()).toBe(end.getTime() + PAID_PERIOD_GRACE_MS);

      const afterGrace = new Date(end.getTime() + PAID_PERIOD_GRACE_MS);
      expect(resolvePlan(state, afterGrace, LIMITS, true)).toMatchObject({
        plan: 'free',
        status,
        limits: LIMITS.free,
      });
    },
  );

  it('does not grant pro from a stale active row long after its period ended', () => {
    const stale = sub('active', {
      currentPeriodStart: new Date('2026-09-05T00:00:00Z'),
      currentPeriodEnd: new Date('2026-10-05T00:00:00Z'),
      paidPeriodStart: new Date('2026-09-05T00:00:00Z'),
      paidPeriodEnd: new Date('2026-10-05T00:00:00Z'),
    });
    expect(resolvePlan(stale, NOW, LIMITS, true).plan).toBe('free');
  });

  it.each(['incomplete', 'incomplete_expired', 'unpaid', 'paused'])(
    'treats %s as free',
    (status) => {
      expect(resolvePlan(sub(status), NOW, LIMITS, true).plan).toBe('free');
    },
  );

  it('puts everyone on free when billing is disabled, even with an active row', () => {
    expect(resolvePlan(sub('active'), NOW, LIMITS, false)).toMatchObject({
      plan: 'free',
      limits: LIMITS.free,
    });
  });

  it('does not grant pro to a paid status with no known paid period end', () => {
    const plan = resolvePlan(
      sub('active', { paidPeriodStart: null, paidPeriodEnd: null }),
      NOW,
      LIMITS,
      true,
    );
    expect(plan.plan).toBe('free');
    expect(plan.periodStart.toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });

  it('bases pro on the paid period, not a renewal period Stripe advanced without payment', () => {
    // Paid Oct 5 - Nov 5. The Nov 5 renewal failed: Stripe moved current_period_* forward and set
    // past_due, but nothing paid for Nov 5 - Dec 5.
    const failedRenewal = sub('past_due', {
      currentPeriodStart: new Date('2026-11-05T00:00:00Z'),
      currentPeriodEnd: new Date('2026-12-05T00:00:00Z'),
      paidPeriodStart: new Date('2026-10-05T00:00:00Z'),
      paidPeriodEnd: new Date('2026-11-05T00:00:00Z'),
    });
    const inGrace = resolvePlan(failedRenewal, new Date('2026-11-06T00:00:00Z'), LIMITS, true);
    expect(inGrace.plan).toBe('pro');
    // Still the old (paid) usage window, stretched by the grace; no fresh allowance.
    expect(inGrace.periodStart.toISOString()).toBe('2026-10-05T00:00:00.000Z');
    expect(inGrace.periodEnd.toISOString()).toBe('2026-11-08T00:00:00.000Z');

    // Paid period + 3 days, not the unpaid period + 3 days.
    expect(resolvePlan(failedRenewal, new Date('2026-11-08T00:00:00Z'), LIMITS, true).plan).toBe(
      'free',
    );
    expect(resolvePlan(failedRenewal, NOW, LIMITS, true).plan).toBe('free');
  });

  describe('paid period backfill for rows written before the columns existed', () => {
    it.each(['active', 'trialing'])('keeps a current %s subscriber on pro', (status) => {
      const before = resolvePlan(sub(status), NOW, LIMITS, true);
      const row = backfill(unmigrated(sub(status)));
      expect(row.paidPeriodEnd).toEqual(PERIOD_END);
      expect(resolvePlan(row, NOW, LIMITS, true)).toEqual(before);
    });

    it('does not give a past_due row the period its failed renewal opened', () => {
      const row = backfill(
        unmigrated(
          sub('past_due', {
            currentPeriodStart: new Date('2026-11-15T00:00:00Z'),
            currentPeriodEnd: new Date('2026-12-15T00:00:00Z'),
          }),
        ),
      );
      expect(row.paidPeriodEnd).toBeNull();
      expect(resolvePlan(row, NOW, LIMITS, true).plan).toBe('free');
    });

    it('puts a canceled row on free, even one whose last period was never paid', () => {
      // Went past_due on a renewal (period advanced, unpaid), then canceled before the migration.
      const unpaidRenewal = sub('canceled', {
        currentPeriodStart: new Date('2026-11-15T00:00:00Z'),
        currentPeriodEnd: new Date('2026-12-15T00:00:00Z'),
      });
      for (const state of [sub('canceled'), unpaidRenewal]) {
        const row = backfill(unmigrated(state));
        expect(row.paidPeriodStart).toBeNull();
        expect(row.paidPeriodEnd).toBeNull();
        const plan = resolvePlan(row, NOW, LIMITS, true);
        expect(plan).toMatchObject({ plan: 'free', status: 'canceled', limits: LIMITS.free });
        expect(plan.periodStart.toISOString()).toBe('2026-11-01T00:00:00.000Z');
        expect(plan.periodEnd.toISOString()).toBe('2026-12-01T00:00:00.000Z');
      }
    });

    it.each(['unpaid', 'incomplete', 'paused'])('leaves %s without a paid period', (status) => {
      expect(backfill(unmigrated(sub(status))).paidPeriodEnd).toBeNull();
    });

    it.each(['past_due', 'canceled', 'unpaid'])(
      'resolves a %s row with no paid period to free without throwing',
      (status) => {
        const row = unmigrated(sub(status));
        expect(isPaidSubscription(row, NOW)).toBe(false);
        expect(resolvePlan(row, NOW, LIMITS, true).plan).toBe('free');
        expect(resolvePlan({ ...row, currentPeriodEnd: null }, NOW, LIMITS, true).plan).toBe(
          'free',
        );
      },
    );
  });

  it('reports cancel_at_period_end', () => {
    expect(
      resolvePlan(sub('active', { cancelAtPeriodEnd: true }), NOW, LIMITS, true).cancelAtPeriodEnd,
    ).toBe(true);
  });
});

describe('isLiveSubscriptionStatus', () => {
  it.each(['active', 'trialing', 'past_due', 'unpaid', 'paused'])('%s can still bill', (status) => {
    expect(isLiveSubscriptionStatus(status)).toBe(true);
  });

  it.each(['canceled', 'incomplete', 'incomplete_expired', null])('%s cannot', (status) => {
    expect(isLiveSubscriptionStatus(status)).toBe(false);
  });
});

describe('calendarMonth', () => {
  it('rolls December into January in UTC', () => {
    const { start, end } = calendarMonth(new Date('2026-12-31T23:59:59Z'));
    expect(start.toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
});
