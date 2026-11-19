import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('~/server/api/trpc', () => {
  const procedure = {
    input: () => procedure,
    query: (fn: unknown) => fn,
    mutation: (fn: unknown) => fn,
  };
  return { createTRPCRouter: (routes: unknown) => routes, protectedProcedure: procedure };
});
vi.mock('~/server/db/queries/competitor-analysis', () => ({ createCompetitorAnalysisStore: vi.fn() }));
vi.mock('~/server/db/competitor-analysis', () => ({
  persistCompetitorForUser: vi.fn(async () => 'c1'),
  toCompetitorMetadata: vi.fn(),
}));
vi.mock('~/lib/metrics-service', () => ({ MetricsService: vi.fn() }));

const discover = vi.hoisted(() => vi.fn());
vi.mock('~/lib/services/microservice-client', () => ({
  MicroserviceClient: { getInstance: () => ({ discoverCompetitors: discover }) },
}));

const billing = vi.hoisted(() => ({
  recordDiscoveryUsage: vi.fn(async (_userId: string, _ref?: string | null) => ({ usageId: 'usage-1' })),
  releaseDiscoveryUsage: vi.fn(async (_userId: string, _usageId: string) => true),
}));
vi.mock('~/server/billing', async () => {
  const errors = await import('~/server/billing/errors');
  return { ...billing, isBillingLimitError: errors.isBillingLimitError };
});

import { TRPCError } from '@trpc/server';
import { BillingLimitError } from '~/server/billing/errors';
import { competitorRouter, discoveredProductSku, generatedProductSku } from './competitor';

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

describe('generatedProductSku', () => {
  it('builds the SKU from the product name with a random suffix', () => {
    expect(generatedProductSku('Double Bed Room')).toMatch(/^DOUBLE-BED-[0-9A-F]{6}$/);
  });

  it('uses a fixed prefix when the name has no letters or digits', () => {
    expect(generatedProductSku('!!!')).toMatch(/^PRODUCT-[0-9A-F]{6}$/);
  });

  it('gives a different SKU on each call for the same name', () => {
    const skus = new Set(Array.from({ length: 20 }, () => generatedProductSku('Double Bed Room')));
    expect(skus.size).toBeGreaterThan(1);
  });
});

describe('competitor.addProduct', () => {
  const addProduct = competitorRouter.addProduct as unknown as (opts: {
    ctx: { session: { user: { id: string } }; db: unknown };
    input: { name: string; sku?: string; price: number; category: string };
  }) => Promise<{ id: string; sku: string; success: boolean }>;
  const input = { name: 'Double Bed Room', price: 120, category: 'accommodation' };

  // Each insert returns the next queued result; an empty result means the SKU was taken.
  function fakeDb(results: Array<Array<{ id: string; sku: string }>>) {
    const inserted: Record<string, unknown>[] = [];
    const db = {
      insert: () => ({
        values: (row: Record<string, unknown>) => {
          inserted.push(row);
          return {
            onConflictDoNothing: () => ({
              returning: async () => results.shift() ?? [],
            }),
          };
        },
      }),
    };
    return { db, inserted };
  }

  it('generates a SKU when none is given and tries again if it is taken', async () => {
    const { db, inserted } = fakeDb([[], [{ id: 'p1', sku: 'DOUBLE-BED-ABC123' }]]);

    const result = await addProduct({ ctx: { session: { user: { id: 'user-alice' } }, db }, input });

    expect(inserted).toHaveLength(2);
    expect(inserted[0]?.sku).toMatch(/^DOUBLE-BED-[0-9A-F]{6}$/);
    expect(result).toMatchObject({ id: 'p1', sku: 'DOUBLE-BED-ABC123', success: true });
  });

  it('treats a blank SKU as missing', async () => {
    const { db, inserted } = fakeDb([[{ id: 'p2', sku: 'DOUBLE-BED-ABC123' }]]);

    await addProduct({ ctx: { session: { user: { id: 'user-alice' } }, db }, input: { ...input, sku: '   ' } });

    expect(inserted[0]?.sku).toMatch(/^DOUBLE-BED-[0-9A-F]{6}$/);
  });

  it('keeps a SKU the user typed, without surrounding spaces', async () => {
    const { db, inserted } = fakeDb([[{ id: 'p3', sku: 'DBR-001' }]]);

    await addProduct({ ctx: { session: { user: { id: 'user-alice' } }, db }, input: { ...input, sku: ' DBR-001 ' } });

    expect(inserted).toHaveLength(1);
    expect(inserted[0]?.sku).toBe('DBR-001');
  });

  it('reports a typed SKU that is already taken as a conflict', async () => {
    const { db } = fakeDb([[]]);

    await expect(
      addProduct({ ctx: { session: { user: { id: 'user-alice' } }, db }, input: { ...input, sku: 'DBR-001' } }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('gives up with an internal error when every generated SKU is taken', async () => {
    const { db, inserted } = fakeDb([[], [], [], [], []]);

    await expect(
      addProduct({ ctx: { session: { user: { id: 'user-alice' } }, db }, input }),
    ).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' });
    expect(inserted).toHaveLength(5);
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

describe('competitor.rediscover allowance', () => {
  const ctx = {
    session: { user: { id: 'user-alice' } },
    db: {
      query: {
        userOnboarding: {
          findFirst: vi.fn(async () => ({
            companyDomain: 'acme.example',
            productCatalogUrl: 'https://acme.example/catalog',
            businessType: 'ecommerce',
          })),
        },
        userCompetitors: { findMany: vi.fn(async () => []) },
      },
    },
  };
  const rediscover = competitorRouter.rediscover as unknown as (opts: {
    ctx: typeof ctx;
  }) => Promise<{ success: boolean }>;

  beforeEach(() => {
    vi.clearAllMocks();
    discover.mockReset();
    billing.recordDiscoveryUsage.mockImplementation(async () => ({ usageId: 'usage-1' }));
  });

  it('reserves a discovery before calling the microservice and keeps it on success', async () => {
    discover.mockResolvedValue({
      competitors: [],
      userProducts: [],
      recommendedSources: [],
      stats: { totalDiscovered: 0, newCompetitors: 0, existingCompetitors: 0, failedAnalyses: 0 },
    });

    await expect(rediscover({ ctx })).resolves.toMatchObject({ success: true });
    expect(billing.recordDiscoveryUsage).toHaveBeenCalledWith('user-alice', 'rediscover');
    expect(billing.recordDiscoveryUsage.mock.invocationCallOrder[0]).toBeLessThan(
      discover.mock.invocationCallOrder[0]!,
    );
    expect(billing.releaseDiscoveryUsage).not.toHaveBeenCalled();
  });

  it('throws FORBIDDEN with the limit error as cause and skips the microservice', async () => {
    const limit = new BillingLimitError({
      resource: 'discovery',
      plan: 'free',
      limit: 2,
      used: 2,
      resetsAt: new Date('2026-12-01T00:00:00Z'),
    });
    billing.recordDiscoveryUsage.mockRejectedValue(limit);

    const error = await rediscover({ ctx }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(TRPCError);
    expect(error).toMatchObject({ code: 'FORBIDDEN', cause: limit });
    expect((error as TRPCError).message).toContain('2 of 2 competitor discoveries');
    expect(discover).not.toHaveBeenCalled();
  });

  it('releases the reservation when the microservice fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    discover.mockRejectedValue(new Error('microservice down'));

    await expect(rediscover({ ctx })).rejects.toThrow('microservice down');
    expect(billing.releaseDiscoveryUsage).toHaveBeenCalledWith('user-alice', 'usage-1');
  });
});
