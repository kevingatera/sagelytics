import { describe, expect, it, vi } from 'vitest';

vi.mock('~/server/api/trpc', () => {
  const procedure = {
    input: () => procedure,
    query: (fn: unknown) => fn,
    mutation: (fn: unknown) => fn,
  };
  return { createTRPCRouter: (routes: unknown) => routes, protectedProcedure: procedure };
});
vi.mock('~/server/db/queries/competitor-analysis', () => ({ createCompetitorAnalysisStore: vi.fn() }));
vi.mock('~/lib/metrics-service', () => ({ MetricsService: vi.fn() }));
vi.mock('~/lib/services/microservice-client', () => ({ MicroserviceClient: { getInstance: vi.fn() } }));

import { competitorRouter, discoveredProductSku } from './competitor';

describe('discoveredProductSku', () => {
  it('gives the same SKU for the same product name on every run', () => {
    expect(discoveredProductSku('Deluxe Safari Tent')).toBe(discoveredProductSku('Deluxe Safari Tent'));
    expect(discoveredProductSku('  Deluxe   Safari Tent ')).toBe(discoveredProductSku('deluxe safari tent'));
    expect(discoveredProductSku('Deluxe Safari Tent')).toMatch(/^DELUXE-SAF-[0-9A-F]{6}$/);
  });

  it('gives different products different SKUs', () => {
    expect(discoveredProductSku('Deluxe Safari Tent A')).not.toBe(discoveredProductSku('Deluxe Safari Tent B'));
  });
});

describe('competitor router', () => {
  it('no longer exposes the randomly generated pricing history', () => {
    expect(Object.keys(competitorRouter)).not.toContain('getPricingHistory');
  });

  it('reports sales as unknown instead of a random number', async () => {
    const ctx = {
      session: { user: { id: 'user-alice' } },
      db: {
        query: {
          userProducts: {
            findMany: vi.fn(async () => [
              {
                id: 'p1',
                name: 'Pro',
                sku: 'PRO-1',
                price: '40.00',
                isActive: true,
                category: 'other',
                description: null,
              },
            ]),
          },
          userCompetitors: { findMany: vi.fn(async () => []) },
        },
      },
    };
    const getProducts = competitorRouter.getProducts as unknown as (opts: {
      ctx: typeof ctx;
    }) => Promise<Array<{ sales: number | null }>>;

    const [first, second] = await Promise.all([getProducts({ ctx }), getProducts({ ctx })]);

    expect(first?.[0]?.sales).toBeNull();
    expect(second?.[0]?.sales).toBeNull();
  });
});
