import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as MicroserviceClientModule from '~/lib/services/microservice-client';

const state = vi.hoisted(() => ({
  session: { user: { id: 'user-alice', email: 'alice@example.com', name: 'Alice' } } as
    | { user: { id: string; email: string; name: string } }
    | null,
  jobs: new Map<string, string>(),
  current: true,
  discover: vi.fn(),
  updates: [] as Record<string, unknown>[],
}));

vi.mock('~/server/auth', async () => {
  const { checkWriteSession } = await import('~/server/auth/write-session');
  return {
    auth: vi.fn(async () => state.session),
    requireWriteSession: vi.fn(async () => checkWriteSession(state.session as never)),
  };
});

vi.mock('~/server/db', () => {
  type Chain = Promise<{ id: string }[]> & {
    values: () => Chain;
    set: (values: Record<string, unknown>) => Chain;
    where: () => Chain;
    onConflictDoNothing: () => Chain;
    onConflictDoUpdate: () => Chain;
    returning: () => Chain;
  };
  const chain = (): Chain =>
    Object.assign(Promise.resolve([{ id: 'row-1' }]), {
      values: () => chain(),
      set: (values: Record<string, unknown>) => {
        state.updates.push(values);
        return chain();
      },
      where: () => chain(),
      onConflictDoNothing: () => chain(),
      onConflictDoUpdate: () => chain(),
      returning: () => chain(),
    });
  return {
    db: {
      query: {
        users: { findFirst: async () => ({ id: 'user-alice', onboardingCompleted: false }) },
        userOnboarding: { findFirst: async () => undefined },
        competitors: { findFirst: async () => undefined },
      },
      insert: () => chain(),
      update: () => chain(),
    },
  };
});

vi.mock('~/server/db/queries/monitoring', () => ({
  createMonitoringTask: vi.fn(async () => undefined),
}));

const billing = vi.hoisted(() => ({
  recordDiscoveryUsage: vi.fn(async (_userId: string, _ref?: string | null) => ({ usageId: 'usage-1' })),
  releaseDiscoveryUsage: vi.fn(async (_userId: string, _usageId: string) => true),
  getMonitoredProductUsage: vi.fn(async (_userId: string) => ({ used: 0, limit: 5, remaining: 5 })),
}));

vi.mock('~/server/billing', async () => {
  const errors = await import('~/server/billing/errors');
  return { ...billing, isBillingLimitError: errors.isBillingLimitError };
});

vi.mock('~/server/monitoring/reservation', () => ({
  withMonitoringCapacity: (_userId: string, write: (tx: object, service: typeof billing) => Promise<unknown>) =>
    write({}, billing),
}));

vi.mock('~/lib/services/microservice-client', async (importOriginal) => ({
  ...(await importOriginal<typeof MicroserviceClientModule>()),
  MicroserviceClient: { getInstance: () => ({ discoverCompetitors: state.discover }) },
}));

// Plain function mocks rather than methods, so tests can reference them directly.
const svc = vi.hoisted(() => ({
  setProgress: vi.fn(async () => undefined),
  setComplete: vi.fn(async () => undefined),
  setError: vi.fn(async () => undefined),
  claimSession: vi.fn(async (_sessionId: string, _userId: string) => true),
  claimOnboardingJob: vi.fn(async (userId: string, domainKey: string, sessionId: string) => {
    const key = `${userId}:${domainKey}`;
    const existing = state.jobs.get(key);
    if (existing) return { claimed: false as const, sessionId: existing };
    state.jobs.set(key, sessionId);
    return { claimed: true as const };
  }),
  isCurrentOnboardingJob: vi.fn(async () => state.current),
  releaseOnboardingJob: vi.fn(async (userId: string, domainKey: string, sessionId: string) => {
    const key = `${userId}:${domainKey}`;
    if (state.jobs.get(key) === sessionId) state.jobs.delete(key);
  }),
}));

vi.mock('~/lib/services/progress-service', () => ({ progressService: svc }));

import { BillingLimitError } from '~/server/billing/errors';
import { createMonitoringTask } from '~/server/db/queries/monitoring';
import { DiscoveryFailedError } from '~/lib/services/microservice-client';
import { POST } from './route';

function submit(extra: Record<string, string> = {}) {
  return POST(
    new Request('http://localhost/api/onboarding', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        companyDomain: 'https://acme.example',
        businessType: 'saas',
        competitor1: '',
        competitor2: '',
        competitor3: '',
        ...extra,
      }),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  state.session = { user: { id: 'user-alice', email: 'alice@example.com', name: 'Alice' } };
  state.jobs.clear();
  state.current = true;
  state.updates.length = 0;
  state.discover.mockReset();
  billing.recordDiscoveryUsage.mockImplementation(async () => ({ usageId: 'usage-1' }));
  billing.getMonitoredProductUsage.mockImplementation(async () => ({ used: 0, limit: 5, remaining: 5 }));
});

describe('POST /api/onboarding session ids', () => {
  it('issues a random server-side id and binds it to the caller', async () => {
    state.discover.mockImplementation(() => new Promise(() => undefined));

    const res = await submit();
    const body = (await res.json()) as { sessionId: string };

    expect(body.sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(body.sessionId).not.toContain('user-alice');
    expect(svc.claimSession).toHaveBeenCalledWith(body.sessionId, 'user-alice');
  });

  it('issues a different id on every request', async () => {
    state.discover.mockImplementation(() => new Promise(() => undefined));

    const first = (await (await submit()).json()) as { sessionId: string };
    state.jobs.clear();
    const second = (await (await submit()).json()) as { sessionId: string };

    expect(first.sessionId).not.toBe(second.sessionId);
  });

  it('fails the request and starts no work when the id cannot be claimed', async () => {
    svc.claimSession.mockResolvedValueOnce(false);

    const res = await submit();

    expect(res.status).toBe(500);
    expect(svc.claimOnboardingJob).not.toHaveBeenCalled();
    expect(billing.recordDiscoveryUsage).not.toHaveBeenCalled();
    expect(state.discover).not.toHaveBeenCalled();
  });

  it('accepts and ignores the retired API key fields from older clients', async () => {
    state.discover.mockImplementation(() => new Promise(() => undefined));

    const res = await submit({ apiKey: 'key-from-old-client', apiSecret: 'secret-from-old-client' });

    expect(res.status).toBe(200);
  });
});

describe('POST /api/onboarding job coordination', () => {
  it('reuses the in-flight job when the same user submits twice for one domain', async () => {
    state.discover.mockImplementation(() => new Promise(() => undefined));

    const first = await submit();
    const firstBody = (await first.json()) as { sessionId: string; reused?: boolean };
    const second = await submit();
    const secondBody = (await second.json()) as { sessionId: string; reused?: boolean };

    expect(firstBody.reused).toBeUndefined();
    expect(secondBody).toEqual({ success: true, sessionId: firstBody.sessionId, reused: true });
    await vi.waitFor(() => expect(state.discover).toHaveBeenCalledTimes(1));
  });

  it('does not finalize a job that a newer one has superseded', async () => {
    state.discover.mockResolvedValue({ competitors: [], userProducts: [] });
    state.current = false;

    const res = await submit();
    const body = (await res.json()) as { sessionId: string };

    await vi.waitFor(() =>
      expect(svc.setError).toHaveBeenCalledWith(
        body.sessionId,
        expect.stringContaining('replaced'),
      ),
    );
    expect(svc.setComplete).not.toHaveBeenCalled();
    expect(state.updates.some((u) => 'onboardingCompleted' in u)).toBe(false);
    await vi.waitFor(() => expect(svc.releaseOnboardingJob).toHaveBeenCalled());
  });

  it('finalizes a job that is still the current one', async () => {
    state.discover.mockResolvedValue({ competitors: [], userProducts: [] });

    const res = await submit();
    const body = (await res.json()) as { sessionId: string };

    await vi.waitFor(() => expect(svc.setComplete).toHaveBeenCalledWith(body.sessionId, expect.any(String)));
    expect(state.updates.some((u) => u.onboardingCompleted === true)).toBe(true);
  });

  it('releases the claim when the request fails before its job starts', async () => {
    vi.mocked(svc.setProgress).mockRejectedValueOnce(new Error('redis down'));

    const failed = await submit();
    expect(failed.status).toBe(500);
    expect(svc.releaseOnboardingJob).toHaveBeenCalledWith(
      'user-alice',
      'acme.example',
      expect.any(String),
    );

    state.discover.mockImplementation(() => new Promise(() => undefined));
    const retry = await submit();
    expect(retry.status).toBe(200);
    expect(((await retry.json()) as { reused?: boolean }).reused).toBeUndefined();
  });
});

describe('POST /api/onboarding monitoring tasks', () => {
  function competitor(productUrls: Array<{ id: string; name: string; url: string }>) {
    return {
      domain: 'rival.example',
      businessName: 'Rival',
      matchScore: 80,
      products: [],
      monitoringData: { productUrls, extractionMethod: 'direct_crawl' },
    };
  }

  it('stores only public product URLs from discovery', async () => {
    state.discover.mockResolvedValue({
      competitors: [
        competitor([
          { id: 'a', name: 'Pro', url: 'https://rival.example/pro' },
          { id: 'b', name: 'Meta', url: 'http://169.254.169.254/latest/meta-data' },
          { id: 'c', name: 'Admin', url: 'http://localhost:3000/admin' },
        ]),
      ],
      userProducts: [],
    });

    await submit();

    await vi.waitFor(() => expect(createMonitoringTask).toHaveBeenCalledTimes(1));
    expect(createMonitoringTask).toHaveBeenCalledWith(
      expect.objectContaining({
        competitorDomain: 'rival.example',
        productUrls: [{ id: 'a', name: 'Pro', url: 'https://rival.example/pro' }],
      }),
      expect.any(Object),
    );
  });

  it('creates no task when every discovered URL is non-public', async () => {
    state.discover.mockResolvedValue({
      competitors: [competitor([{ id: 'b', name: 'Loop', url: 'http://127.0.0.1/p' }])],
      userProducts: [],
    });

    const res = await submit();
    const body = (await res.json()) as { sessionId: string };

    await vi.waitFor(() =>
      expect(svc.setComplete).toHaveBeenCalledWith(body.sessionId, expect.any(String)),
    );
    expect(createMonitoringTask).not.toHaveBeenCalled();
  });
});

function competitorWithUrls(domain: string, count: number) {
  return {
    domain,
    businessName: domain,
    matchScore: 80,
    products: [],
    monitoringData: {
      extractionMethod: 'perplexity',
      productUrls: Array.from({ length: count }, (_, i) => ({
        id: `${domain}-${i}`,
        name: `Product ${i}`,
        url: `https://${domain}/p/${i}`,
      })),
    },
  };
}

describe('POST /api/onboarding discovery allowance', () => {
  it('reserves a discovery before calling the microservice and keeps it when the run returns', async () => {
    state.discover.mockResolvedValue({ competitors: [], userProducts: [] });

    const res = await submit();
    const body = (await res.json()) as { sessionId: string };

    expect(res.status).toBe(200);
    expect(billing.recordDiscoveryUsage).toHaveBeenCalledWith('user-alice', body.sessionId);
    await vi.waitFor(() => expect(svc.setComplete).toHaveBeenCalled());
    expect(billing.recordDiscoveryUsage.mock.invocationCallOrder[0]).toBeLessThan(
      state.discover.mock.invocationCallOrder[0]!,
    );
    expect(billing.releaseDiscoveryUsage).not.toHaveBeenCalled();
  });

  it('answers 402, marks the session failed with a limit reason and never calls the microservice', async () => {
    billing.recordDiscoveryUsage.mockRejectedValue(
      new BillingLimitError({
        resource: 'discovery',
        plan: 'free',
        limit: 2,
        used: 2,
        resetsAt: new Date('2026-12-01T00:00:00Z'),
      }),
    );

    const res = await submit();

    expect(res.status).toBe(402);
    expect(await res.json()).toMatchObject({
      code: 'BILLING_LIMIT_REACHED',
      resource: 'discovery',
      limit: 2,
      used: 2,
      remaining: 0,
      resetsAt: '2026-12-01T00:00:00.000Z',
    });
    expect(state.discover).not.toHaveBeenCalled();
    expect(svc.setError).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('2 of 2 competitor discoveries'),
      'BILLING_LIMIT_REACHED',
    );
    // The claim is released, so the session is not left "running".
    expect(state.jobs.size).toBe(0);
    expect(svc.setProgress).not.toHaveBeenCalled();
  });

  it('releases the reservation when the service reports that no paid call started', async () => {
    state.discover.mockRejectedValue(new DiscoveryFailedError('microservice down', 0));

    const res = await submit();
    const body = (await res.json()) as { sessionId: string };

    await vi.waitFor(() =>
      expect(svc.setError).toHaveBeenCalledWith(body.sessionId, expect.stringContaining('microservice down')),
    );
    expect(billing.releaseDiscoveryUsage).toHaveBeenCalledWith('user-alice', 'usage-1');
  });

  it.each([
    ['a transport timeout', new Error('Microservice discover_competitors did not respond within 90 seconds')],
    ['a run that started paid calls', new DiscoveryFailedError('Competitor discovery failed', 3)],
    ['an unknown paid call count', new DiscoveryFailedError('Competitor discovery failed', null)],
  ])('keeps the charge after %s', async (_name, error) => {
    state.discover.mockRejectedValue(error);

    const res = await submit();
    const body = (await res.json()) as { sessionId: string };

    await vi.waitFor(() => expect(svc.setError).toHaveBeenCalledWith(body.sessionId, expect.any(String)));
    await vi.waitFor(() => expect(svc.releaseOnboardingJob).toHaveBeenCalled());
    expect(billing.releaseDiscoveryUsage).not.toHaveBeenCalled();
  });

  it('logs only the host of a signed catalog URL', async () => {
    state.discover.mockResolvedValue({ competitors: [], userProducts: [] });
    const log = vi.mocked(console.log);

    const res = await submit({
      productCatalog: 'https://cdn.acme.example/catalog.csv?sig=top-secret-token',
      competitor1: 'https://rival.example/pricing?ref=private-ref',
    });
    await vi.waitFor(() => expect(svc.setComplete).toHaveBeenCalled());

    expect(res.status).toBe(200);
    const output = JSON.stringify(log.mock.calls);
    expect(output).toContain('cdn.acme.example');
    expect(output).not.toContain('top-secret-token');
    expect(output).not.toContain('catalog.csv');
    expect(output).not.toContain('private-ref');
  });

  it('releases the reservation when the request fails before the run starts', async () => {
    vi.mocked(svc.setProgress).mockRejectedValueOnce(new Error('redis down'));

    const res = await submit();

    expect(res.status).toBe(500);
    expect(billing.releaseDiscoveryUsage).toHaveBeenCalledWith('user-alice', 'usage-1');
    expect(state.discover).not.toHaveBeenCalled();
  });

  it('does not reserve again when a double submit reuses the running job', async () => {
    state.discover.mockImplementation(() => new Promise(() => undefined));

    await submit();
    await submit();

    expect(billing.recordDiscoveryUsage).toHaveBeenCalledTimes(1);
  });

  it('truncates monitored product URLs to the remaining allowance instead of failing', async () => {
    let remaining = 3;
    billing.getMonitoredProductUsage.mockImplementation(async () => ({ used: 5 - remaining, limit: 5, remaining }));
    vi.mocked(createMonitoringTask).mockImplementation(async (data) => {
      remaining -= data.productUrls.length;
      return undefined;
    });
    state.discover.mockResolvedValue({
      competitors: [competitorWithUrls('a.example', 2), competitorWithUrls('b.example', 4), competitorWithUrls('c.example', 1)],
      userProducts: [],
    });

    const res = await submit();
    const body = (await res.json()) as { sessionId: string };

    await vi.waitFor(() => expect(svc.setComplete).toHaveBeenCalledWith(body.sessionId, expect.any(String)));
    const created = vi.mocked(createMonitoringTask).mock.calls.map(([data]) => ({
      domain: data.competitorDomain,
      urls: data.productUrls.length,
    }));
    expect(created).toEqual([
      { domain: 'a.example', urls: 2 },
      { domain: 'b.example', urls: 1 },
    ]);
    expect(billing.getMonitoredProductUsage).toHaveBeenCalledTimes(3);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('dropping product URLs'),
      expect.objectContaining({ domain: 'b.example', kept: 1, dropped: 3 }),
    );
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('dropping product URLs'),
      expect.objectContaining({ domain: 'c.example', kept: 0, dropped: 1 }),
    );
  });
});
