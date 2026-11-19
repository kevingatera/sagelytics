import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as MicroserviceClientModule from '~/lib/services/microservice-client';

const state = vi.hoisted(() => ({
  session: { user: { id: 'user-alice' } } as
    | null
    | { user: { id: string }; sessionVerified?: boolean },
  discover: vi.fn(),
  catalogUrl: 'https://acme.example/catalog' as string | null,
}));

vi.mock('~/server/auth', async () => {
  const { checkWriteSession } = await import('~/server/auth/write-session');
  return {
    auth: vi.fn(async () => state.session),
    requireWriteSession: vi.fn(async () => checkWriteSession(state.session as never)),
  };
});

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
            productCatalogUrl: state.catalogUrl,
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

vi.mock('~/lib/services/microservice-client', async (importOriginal) => ({
  ...(await importOriginal<typeof MicroserviceClientModule>()),
  MicroserviceClient: { getInstance: () => ({ discoverCompetitors: state.discover }) },
}));

const svc = vi.hoisted(() => {
  const owners = new Map<string, string>();
  return {
    owners,
    getSessionOwner: vi.fn(async (sessionId: string) => owners.get(sessionId) ?? null),
    claimSession: vi.fn(async (sessionId: string, userId: string) => {
      if (owners.has(sessionId)) return false;
      owners.set(sessionId, userId);
      return true;
    }),
    setProgress: vi.fn(async () => undefined),
    setComplete: vi.fn(async () => undefined),
    setError: vi.fn(async () => undefined),
  };
});
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
import { DiscoveryFailedError } from '~/lib/services/microservice-client';
import * as route from './route';

const { POST } = route;

function request(sessionId?: string) {
  const query = sessionId ? `?sessionId=${sessionId}` : '';
  return new Request(`http://localhost/api/competitor-initial${query}`, { method: 'POST' });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  state.discover.mockReset();
  state.session = { user: { id: 'user-alice' } };
  state.catalogUrl = 'https://acme.example/catalog';
  svc.owners.clear();
  svc.owners.set('sess-1', 'user-alice');
  billing.recordDiscoveryUsage.mockImplementation(async () => ({ usageId: 'usage-1' }));
});

describe('POST /api/competitor-initial session ownership', () => {
  it('rejects an unknown session id without claiming it or writing anything', async () => {
    const res = await POST(request('sess-new'));

    expect(res.status).toBe(404);
    expect(svc.claimSession).not.toHaveBeenCalled();
    expect(svc.owners.has('sess-new')).toBe(false);
    expect(svc.setProgress).not.toHaveBeenCalled();
    expect(svc.setError).not.toHaveBeenCalled();
    expect(billing.recordDiscoveryUsage).not.toHaveBeenCalled();
    expect(state.discover).not.toHaveBeenCalled();
  });

  it('keeps working for the session owner', async () => {
    svc.owners.set('sess-1', 'user-alice');
    state.discover.mockResolvedValue({ competitors: [], userProducts: [] });

    const res = await POST(request('sess-1'));

    expect(res.status).toBe(200);
    expect(svc.claimSession).not.toHaveBeenCalled();
    expect(svc.setComplete).toHaveBeenCalledWith('sess-1', expect.any(String));
  });

  it("refuses to let user B write to user A's session", async () => {
    svc.owners.set('sess-alice', 'user-alice');
    state.session = { user: { id: 'user-bob' } };

    const res = await POST(request('sess-alice'));

    expect(res.status).toBe(404);
    expect(svc.claimSession).not.toHaveBeenCalled();
    expect(svc.setProgress).not.toHaveBeenCalled();
    expect(svc.setError).not.toHaveBeenCalled();
    expect(svc.setComplete).not.toHaveBeenCalled();
    expect(billing.recordDiscoveryUsage).not.toHaveBeenCalled();
    expect(state.discover).not.toHaveBeenCalled();
    expect(svc.owners.get('sess-alice')).toBe('user-alice');
  });
});

describe('POST /api/competitor-initial allowance', () => {
  it('reserves a discovery under the session id and keeps it when the run returns', async () => {
    state.discover.mockResolvedValue({ competitors: [], userProducts: [] });

    const res = await POST(request('sess-1'));

    expect(res.status).toBe(200);
    expect(billing.recordDiscoveryUsage).toHaveBeenCalledWith('user-alice', 'sess-1');
    expect(billing.releaseDiscoveryUsage).not.toHaveBeenCalled();
    expect(svc.setComplete).toHaveBeenCalled();
  });

  it('runs discovery for a business that gave no catalog page', async () => {
    state.catalogUrl = null;
    state.discover.mockResolvedValue({ competitors: [], userProducts: [] });

    const res = await POST(request('sess-1'));

    expect(res.status).toBe(200);
    expect(state.discover).toHaveBeenCalledWith(expect.objectContaining({ productCatalogUrl: '' }));
  });

  it('falls back to the company domain as the usage ref', async () => {
    state.discover.mockResolvedValue({ competitors: [], userProducts: [] });

    await POST(request());

    expect(billing.recordDiscoveryUsage).toHaveBeenCalledWith('user-alice', 'https://acme.example');
  });

  it('answers 402 at the limit, records the reason on the session and skips the microservice', async () => {
    billing.recordDiscoveryUsage.mockRejectedValue(
      new BillingLimitError({ resource: 'discovery', plan: 'free', limit: 2, used: 2, resetsAt: new Date('2026-12-01T00:00:00Z') }),
    );

    const res = await POST(request('sess-1'));

    expect(res.status).toBe(402);
    expect(await res.json()).toMatchObject({ code: 'BILLING_LIMIT_REACHED', resource: 'discovery' });
    expect(state.discover).not.toHaveBeenCalled();
    expect(svc.setError).toHaveBeenCalledWith(
      'sess-1',
      expect.stringContaining('resets on December 1, 2026'),
      'BILLING_LIMIT_REACHED',
    );
  });

  it('releases the reservation when the service reports that no paid call started', async () => {
    state.discover.mockRejectedValue(new DiscoveryFailedError('microservice down', 0));

    await expect(POST(request('sess-1'))).rejects.toThrow('microservice down');

    expect(billing.releaseDiscoveryUsage).toHaveBeenCalledWith('user-alice', 'usage-1');
    expect(svc.setError).toHaveBeenCalledWith('sess-1', expect.stringContaining('microservice down'));
  });

  it.each([
    ['a transport timeout', new Error('Microservice discover_competitors did not respond within 90 seconds')],
    ['a run that started paid calls', new DiscoveryFailedError('Competitor discovery failed', 1)],
  ])('keeps the charge and fails the session after %s', async (_name, error) => {
    state.discover.mockRejectedValue(error);

    await expect(POST(request('sess-1'))).rejects.toThrow();

    expect(billing.releaseDiscoveryUsage).not.toHaveBeenCalled();
    expect(svc.setError).toHaveBeenCalledWith('sess-1', expect.stringContaining('Competitor analysis failed'));
  });
});

describe('POST /api/competitor-initial write guard', () => {
  it('exposes no GET handler, so a link or prefetch cannot start a paid discovery', () => {
    expect('GET' in route).toBe(false);
  });

  it('answers 401 when signed out and starts nothing', async () => {
    state.session = null;

    const res = await POST(request('sess-1'));

    expect(res.status).toBe(401);
    expect(billing.recordDiscoveryUsage).not.toHaveBeenCalled();
    expect(state.discover).not.toHaveBeenCalled();
  });

  it('answers 503 when the session could not be verified and starts nothing', async () => {
    state.session = { user: { id: 'user-alice' }, sessionVerified: false };

    const res = await POST(request('sess-1'));

    expect(res.status).toBe(503);
    expect(billing.recordDiscoveryUsage).not.toHaveBeenCalled();
    expect(state.discover).not.toHaveBeenCalled();
    expect(svc.setProgress).not.toHaveBeenCalled();
  });
});
