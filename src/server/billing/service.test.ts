import { describe, expect, it } from 'vitest';

import type { BillingConfig } from './config';
import { BillingLimitError } from './errors';
import { createBillingService } from './service';
import { createMemoryBillingStore } from './testing/memory-store';

const USER = 'user-alice';

function config(overrides: Partial<BillingConfig> = {}): BillingConfig {
  return {
    enabled: true,
    webhookSecret: 'whsec_test',
    priceId: 'price_test',
    appUrl: 'https://app.example',
    limits: {
      free: { discoveriesPerPeriod: 2, monitoredProducts: 5 },
      pro: { discoveriesPerPeriod: 50, monitoredProducts: 200 },
    },
    ...overrides,
  };
}

function setup(nowIso: string, cfg = config()) {
  let now = new Date(nowIso);
  const mem = createMemoryBillingStore({ now: () => now, users: [USER] });
  const service = createBillingService({ store: mem.store, config: () => cfg, now: () => now });
  return {
    mem,
    service,
    setNow: (iso: string) => {
      now = new Date(iso);
    },
  };
}

async function subscribe(
  mem: ReturnType<typeof createMemoryBillingStore>,
  start: string,
  end: string,
  status = 'active',
) {
  await mem.store.saveSubscription(USER, 'cus_alice', {
    stripeSubscriptionId: 'sub_alice',
    status,
    priceId: 'price_test',
    currentPeriodStart: new Date(start),
    currentPeriodEnd: new Date(end),
    cancelAtPeriodEnd: false,
  });
}

describe('discovery usage periods', () => {
  it('counts free usage per calendar month and resets on the 1st', async () => {
    const { mem, service, setNow } = setup('2026-11-18T12:00:00Z');
    mem.addUsage(USER, new Date('2026-10-31T23:59:59Z'));
    mem.addUsage(USER, new Date('2026-11-01T00:00:00Z'));
    mem.addUsage(USER, new Date('2026-11-30T23:59:59Z'));
    mem.addUsage(USER, new Date('2026-12-01T00:00:00Z'));

    expect(await service.getDiscoveryUsage(USER)).toMatchObject({
      used: 2,
      limit: 2,
      remaining: 0,
    });

    setNow('2026-12-02T00:00:00Z');
    const december = await service.getDiscoveryUsage(USER);
    expect(december).toMatchObject({ used: 1, remaining: 1 });
    expect(december.periodEnd.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });

  it('counts pro usage over the Stripe period, not the calendar month', async () => {
    const { mem, service } = setup('2026-11-18T12:00:00Z');
    await subscribe(mem, '2026-10-20T00:00:00Z', '2026-11-20T00:00:00Z');
    mem.addUsage(USER, new Date('2026-10-19T23:59:59Z'));
    mem.addUsage(USER, new Date('2026-10-25T00:00:00Z'));
    mem.addUsage(USER, new Date('2026-11-02T00:00:00Z'));

    const usage = await service.getDiscoveryUsage(USER);
    expect(usage).toMatchObject({ used: 2, limit: 50, remaining: 48 });
    expect(usage.periodStart.toISOString()).toBe('2026-10-20T00:00:00.000Z');
    expect(usage.periodEnd.toISOString()).toBe('2026-11-20T00:00:00.000Z');
  });

  it('drops a canceled user back to the free allowance after the period ends', async () => {
    const { mem, service, setNow } = setup('2026-11-18T12:00:00Z');
    await subscribe(mem, '2026-10-20T00:00:00Z', '2026-11-20T00:00:00Z', 'canceled');
    expect((await service.getPlanForUser(USER)).plan).toBe('pro');

    setNow('2026-11-21T00:00:00Z');
    const plan = await service.getPlanForUser(USER);
    expect(plan.plan).toBe('free');
    expect(plan.limits.discoveriesPerPeriod).toBe(2);
  });
});

describe('assertCanRunDiscovery', () => {
  it('passes under the limit and reports what is left', async () => {
    const { service } = setup('2026-11-18T12:00:00Z');
    expect(await service.assertCanRunDiscovery(USER)).toMatchObject({ used: 0, remaining: 2 });
  });

  it('throws a BillingLimitError with limit, remaining and reset date at the limit', async () => {
    const { mem, service } = setup('2026-11-18T12:00:00Z');
    mem.addUsage(USER, new Date('2026-11-02T00:00:00Z'));
    mem.addUsage(USER, new Date('2026-11-03T00:00:00Z'));

    const error = await service.assertCanRunDiscovery(USER).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BillingLimitError);
    const limitError = error as BillingLimitError;
    expect(limitError).toMatchObject({
      resource: 'discovery',
      plan: 'free',
      limit: 2,
      used: 2,
      remaining: 0,
    });
    expect(limitError.resetsAt?.toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(limitError.toJSON()).toEqual({
      error: expect.stringContaining('free plan includes 2 competitor discoveries'),
      code: 'BILLING_LIMIT_REACHED',
      resource: 'discovery',
      plan: 'free',
      limit: 2,
      used: 2,
      remaining: 0,
      resetsAt: '2026-12-01T00:00:00.000Z',
    });
  });

  it('uses the free allowance for everyone when billing is disabled', async () => {
    const { mem, service } = setup('2026-11-18T12:00:00Z', config({ enabled: false }));
    await subscribe(mem, '2026-11-01T00:00:00Z', '2026-12-01T00:00:00Z');
    mem.addUsage(USER, new Date('2026-11-02T00:00:00Z'));
    mem.addUsage(USER, new Date('2026-11-03T00:00:00Z'));
    await expect(service.assertCanRunDiscovery(USER)).rejects.toMatchObject({
      plan: 'free',
      limit: 2,
    });
  });
});

describe('recordDiscoveryUsage', () => {
  it('writes a ledger row with the ref and refuses once the limit is reached', async () => {
    const { mem, service } = setup('2026-11-18T12:00:00Z');
    const first = await service.recordDiscoveryUsage(USER, 'session-1');
    expect(first.usage).toMatchObject({ used: 1, remaining: 1 });
    expect(mem.usage.at(-1)).toMatchObject({ userId: USER, kind: 'discovery', ref: 'session-1' });
    await service.recordDiscoveryUsage(USER, 'session-2');
    await expect(service.recordDiscoveryUsage(USER, 'session-3')).rejects.toBeInstanceOf(
      BillingLimitError,
    );
    expect(mem.usage).toHaveLength(2);
  });

  it('lets only `limit` of many concurrent reservations through', async () => {
    const { mem, service } = setup('2026-11-18T12:00:00Z');
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, (_, i) => service.recordDiscoveryUsage(USER, `run-${i}`)),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(4);
    expect(mem.usage).toHaveLength(2);
  });

  it('refunds a reservation on release', async () => {
    const { mem, service } = setup('2026-11-18T12:00:00Z');
    const { usageId } = await service.recordDiscoveryUsage(USER, 'session-1');
    expect(await service.releaseDiscoveryUsage(USER, usageId)).toBe(true);
    expect(mem.usage).toHaveLength(0);
    expect(await service.releaseDiscoveryUsage('user-bob', usageId)).toBe(false);
  });
});

describe('monitored product limits', () => {
  it('throws when adding products would pass the plan limit', async () => {
    const { mem, service } = setup('2026-11-18T12:00:00Z');
    mem.setMonitoredProducts(USER, 4);
    expect(await service.assertCanMonitorProducts(USER, 1)).toMatchObject({ used: 4, limit: 5 });
    await expect(service.assertCanMonitorProducts(USER, 2)).rejects.toMatchObject({
      resource: 'monitored_product',
      limit: 5,
      used: 4,
      remaining: 1,
      resetsAt: null,
    });
  });
});
