import { describe, expect, it, vi } from 'vitest';

vi.mock('~/server/api/trpc', () => {
  const procedure = { query: (fn: unknown) => fn };
  return { createTRPCRouter: (routes: unknown) => routes, protectedProcedure: procedure };
});

const PERIOD = {
  periodStart: new Date('2026-11-01T00:00:00Z'),
  periodEnd: new Date('2026-12-01T00:00:00Z'),
};

vi.mock('~/server/billing', () => ({
  isBillingEnabled: () => false,
  getPlanForUser: vi.fn(async () => ({
    plan: 'free',
    status: null,
    limits: { discoveriesPerPeriod: 2, monitoredProducts: 5 },
    cancelAtPeriodEnd: false,
    ...PERIOD,
  })),
  getDiscoveryUsage: vi.fn(async () => ({ used: 1, limit: 2, remaining: 1, ...PERIOD })),
  getMonitoredProductUsage: vi.fn(async () => ({ used: 3, limit: 5, remaining: 2 })),
}));

import { billingRouter } from './billing';

describe('billing.getStatus', () => {
  it('returns plan, limits, usage and whether billing is enabled', async () => {
    const getStatus = billingRouter.getStatus as unknown as (opts: {
      ctx: { session: { user: { id: string } } };
    }) => Promise<unknown>;

    expect(await getStatus({ ctx: { session: { user: { id: 'user-alice' } } } })).toEqual({
      billingEnabled: false,
      plan: 'free',
      status: null,
      cancelAtPeriodEnd: false,
      limits: { discoveriesPerPeriod: 2, monitoredProducts: 5 },
      ...PERIOD,
      usage: {
        discoveries: { used: 1, limit: 2, remaining: 1, ...PERIOD },
        monitoredProducts: { used: 3, limit: 5, remaining: 2 },
      },
    });
  });
});
