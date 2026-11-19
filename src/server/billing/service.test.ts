import { describe, expect, it, vi } from 'vitest';

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

  it('stamps the row with the same instant it used to pick the period', async () => {
    // The app clock reads Nov 30 when the period is chosen; the database clock has already
    // rolled into December. The row must land in November, the period it was checked against.
    const mem = createMemoryBillingStore({
      now: () => new Date('2026-12-01T00:00:00.050Z'),
      users: [USER],
    });
    const service = createBillingService({
      store: mem.store,
      config: () => config(),
      now: () => new Date('2026-11-30T23:59:59.990Z'),
    });

    const { usage } = await service.recordDiscoveryUsage(USER, 'boundary');

    expect(usage.periodStart.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(mem.usage[0]?.createdAt.toISOString()).toBe('2026-11-30T23:59:59.990Z');
    expect(
      await mem.store.countUsage(
        USER,
        'discovery',
        new Date('2026-11-01T00:00:00Z'),
        new Date('2026-12-01T00:00:00Z'),
      ),
    ).toBe(1);
  });

  it('samples the clock once per reservation, after taking the lock', async () => {
    const mem = createMemoryBillingStore({ users: [USER] });
    const now = vi.fn(() => new Date('2026-11-18T12:00:00Z'));
    const service = createBillingService({ store: mem.store, config: () => config(), now });
    const lock = vi.spyOn(mem.store, 'withUserLock');

    await service.recordDiscoveryUsage(USER, 'once');

    expect(now).toHaveBeenCalledTimes(1);
    expect(lock.mock.invocationCallOrder[0]!).toBeLessThan(now.mock.invocationCallOrder[0]!);
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

describe('reserveMonitoredProducts', () => {
  it('runs the write under the lock and reports the new usage', async () => {
    const { mem, service } = setup('2026-11-18T12:00:00Z');
    mem.setMonitoredProducts(USER, 3);
    const lock = vi.spyOn(mem.store, 'withUserLock');

    const { result, usage } = await service.reserveMonitoredProducts(USER, 2, async () => 'task-1');

    expect(result).toBe('task-1');
    expect(usage).toEqual({ used: 5, limit: 5, remaining: 0 });
    expect(lock).toHaveBeenCalledWith(USER, expect.any(Function));
  });

  it('throws before writing when the addition would pass the limit', async () => {
    const { mem, service } = setup('2026-11-18T12:00:00Z');
    mem.setMonitoredProducts(USER, 4);
    const write = vi.fn(async () => undefined);

    await expect(service.reserveMonitoredProducts(USER, 2, write)).rejects.toMatchObject({
      resource: 'monitored_product',
      limit: 5,
      used: 4,
    });
    expect(write).not.toHaveBeenCalled();
  });

  it('lets an edit that removes URLs through even when over the limit', async () => {
    const { mem, service } = setup('2026-11-18T12:00:00Z');
    mem.setMonitoredProducts(USER, 7);
    const { usage } = await service.reserveMonitoredProducts(USER, -1, async () => undefined);
    expect(usage).toMatchObject({ used: 6, remaining: 0 });
  });

  it('serialises concurrent reservations so only what fits gets written', async () => {
    const { mem, service } = setup('2026-11-18T12:00:00Z');
    let stored = 0;
    vi.spyOn(mem.store, 'countMonitoredProducts').mockImplementation(async () => stored);

    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () =>
        service.reserveMonitoredProducts(USER, 2, async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          stored += 2;
        }),
      ),
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
    expect(stored).toBe(4);
  });
});
