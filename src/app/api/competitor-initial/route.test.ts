import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  session: { user: { id: 'user-alice' } } as null | { user: { id: string } },
  discover: vi.fn(),
}));

vi.mock('~/server/auth', () => ({ auth: vi.fn(async () => state.session) }));

vi.mock('~/server/db', () => {
  type Chain = Promise<unknown[]> & {
    values: () => Chain;
    set: () => Chain;
    where: () => Chain;
    onConflictDoUpdate: () => Chain;
  };
  const chain = (): Chain =>
    Object.assign(Promise.resolve([]), {
      values: () => chain(),
      set: () => chain(),
      where: () => chain(),
      onConflictDoUpdate: () => chain(),
    });
  return {
    db: {
      query: {
        userOnboarding: {
          findFirst: async () => ({
            userId: 'user-alice',
            companyDomain: 'https://acme.example',
            productCatalogUrl: 'https://acme.example/catalog',
            businessType: 'ecommerce',
            identifiedCompetitors: [],
          }),
        },
      },
      insert: () => chain(),
      update: () => chain(),
    },
  };
});

vi.mock('~/server/db/competitor-analysis', () => ({ persistCompetitorForUser: vi.fn(async () => 'c1') }));
vi.mock('~/server/db/queries/competitor-analysis', () => ({ createCompetitorAnalysisStore: vi.fn() }));

vi.mock('~/lib/services/microservice-client', () => ({
  MicroserviceClient: { getInstance: () => ({ discoverCompetitors: state.discover }) },
}));

const svc = vi.hoisted(() => ({
  setProgress: vi.fn(async () => undefined),
  setComplete: vi.fn(async () => undefined),
  setError: vi.fn(async () => undefined),
}));
vi.mock('~/lib/services/progress-service', () => ({ progressService: svc }));

const billing = vi.hoisted(() => ({
  recordDiscoveryUsage: vi.fn(async (_userId: string, _ref?: string | null) => ({ usageId: 'usage-1' })),
  releaseDiscoveryUsage: vi.fn(async (_userId: string, _usageId: string) => true),
}));

vi.mock('~/server/billing', async () => {
  const errors = await import('~/server/billing/errors');
  return { ...billing, isBillingLimitError: errors.isBillingLimitError };
});

import { BillingLimitError } from '~/server/billing/errors';
import { GET } from './route';

function request(sessionId?: string) {
  const query = sessionId ? `?sessionId=${sessionId}` : '';
  return new Request(`http://localhost/api/competitor-initial${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  state.discover.mockReset();
  billing.recordDiscoveryUsage.mockImplementation(async () => ({ usageId: 'usage-1' }));
});

describe('GET /api/competitor-initial allowance', () => {
  it('reserves a discovery under the session id and keeps it when the run returns', async () => {
    state.discover.mockResolvedValue({ competitors: [], userProducts: [] });

    const res = await GET(request('sess-1'));

    expect(res.status).toBe(200);
    expect(billing.recordDiscoveryUsage).toHaveBeenCalledWith('user-alice', 'sess-1');
    expect(billing.releaseDiscoveryUsage).not.toHaveBeenCalled();
    expect(svc.setComplete).toHaveBeenCalled();
  });

  it('falls back to the company domain as the usage ref', async () => {
    state.discover.mockResolvedValue({ competitors: [], userProducts: [] });

    await GET(request());

    expect(billing.recordDiscoveryUsage).toHaveBeenCalledWith('user-alice', 'https://acme.example');
  });

  it('answers 402 at the limit, records the reason on the session and skips the microservice', async () => {
    billing.recordDiscoveryUsage.mockRejectedValue(
      new BillingLimitError({ resource: 'discovery', plan: 'free', limit: 2, used: 2, resetsAt: new Date('2026-12-01T00:00:00Z') }),
    );

    const res = await GET(request('sess-1'));

    expect(res.status).toBe(402);
    expect(await res.json()).toMatchObject({ code: 'BILLING_LIMIT_REACHED', resource: 'discovery' });
    expect(state.discover).not.toHaveBeenCalled();
    expect(svc.setError).toHaveBeenCalledWith(
      'sess-1',
      expect.stringContaining('resets on December 1, 2026'),
      'BILLING_LIMIT_REACHED',
    );
  });

  it('releases the reservation and fails the session when the microservice throws', async () => {
    state.discover.mockRejectedValue(new Error('microservice down'));

    await expect(GET(request('sess-1'))).rejects.toThrow('microservice down');

    expect(billing.releaseDiscoveryUsage).toHaveBeenCalledWith('user-alice', 'usage-1');
    expect(svc.setError).toHaveBeenCalledWith('sess-1', expect.stringContaining('microservice down'));
  });
});
