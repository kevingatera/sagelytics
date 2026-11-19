import { describe, expect, it } from 'vitest';

import {
  calendarMonth,
  isLiveSubscriptionStatus,
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

function sub(status: string | null, overrides: Partial<SubscriptionState> = {}): SubscriptionState {
  return {
    status,
    currentPeriodStart: PERIOD_START,
    currentPeriodEnd: PERIOD_END,
    cancelAtPeriodEnd: false,
    ...overrides,
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
    const lapsed = resolvePlan(sub('canceled', { currentPeriodEnd: justEnded }), NOW, LIMITS, true);
    expect(lapsed).toMatchObject({ plan: 'free', status: 'canceled', limits: LIMITS.free });
    expect(lapsed.periodStart.toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });

  it.each(['active', 'trialing', 'past_due'])(
    'keeps %s on pro for the 3-day grace after the period ends, then free',
    (status) => {
      const end = new Date('2026-11-16T12:00:00Z');
      const inGrace = resolvePlan(sub(status, { currentPeriodEnd: end }), NOW, LIMITS, true);
      expect(inGrace.plan).toBe('pro');
      // The Stripe period is over, so usage falls back to the calendar month.
      expect(inGrace.periodStart.toISOString()).toBe('2026-11-01T00:00:00.000Z');

      const afterGrace = new Date(end.getTime() + PAID_PERIOD_GRACE_MS);
      expect(
        resolvePlan(sub(status, { currentPeriodEnd: end }), afterGrace, LIMITS, true),
      ).toMatchObject({
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

  it('does not grant pro to a paid status with no known period end', () => {
    const plan = resolvePlan(
      sub('active', { currentPeriodStart: null, currentPeriodEnd: null }),
      NOW,
      LIMITS,
      true,
    );
    expect(plan.plan).toBe('free');
    expect(plan.periodStart.toISOString()).toBe('2026-11-01T00:00:00.000Z');
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
