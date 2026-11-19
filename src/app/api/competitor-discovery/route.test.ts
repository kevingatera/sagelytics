import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as MicroserviceClientModule from '~/lib/services/microservice-client';
import type { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  session: { user: { id: 'user-alice' } } as null | { user: { id: string } },
  discover: vi.fn(),
}));

vi.mock('~/server/auth', async () => {
  const { checkWriteSession } = await import('~/server/auth/write-session');
  return {
    auth: vi.fn(async () => state.session),
    requireWriteSession: vi.fn(async () => checkWriteSession(state.session as never)),
  };
});

vi.mock('~/lib/services/microservice-client', async (importOriginal) => ({
  ...(await importOriginal<typeof MicroserviceClientModule>()),
  MicroserviceClient: { getInstance: () => ({ discoverCompetitors: state.discover }) },
}));

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
import { POST } from './route';

const body = {
  domain: 'https://acme.example',
  businessType: 'ecommerce',
  knownCompetitors: [],
  productCatalogUrl: 'https://acme.example/catalog',
};

function request(payload: unknown = body) {
  return new Request('http://localhost/api/competitor-discovery', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  state.session = { user: { id: 'user-alice' } };
  state.discover.mockReset();
  billing.recordDiscoveryUsage.mockImplementation(async () => ({ usageId: 'usage-1' }));
});

describe('POST /api/competitor-discovery allowance', () => {
  it('reserves a discovery, runs it and keeps the charge', async () => {
    state.discover.mockResolvedValue({ competitors: [], userProducts: [] });

    const res = await POST(request());

    expect(res.status).toBe(200);
    expect(billing.recordDiscoveryUsage).toHaveBeenCalledWith('user-alice', body.domain);
    expect(state.discover).toHaveBeenCalledTimes(1);
    expect(billing.releaseDiscoveryUsage).not.toHaveBeenCalled();
  });

  it('answers 402 at the limit without calling the microservice', async () => {
    billing.recordDiscoveryUsage.mockRejectedValue(
      new BillingLimitError({ resource: 'discovery', plan: 'free', limit: 2, used: 2, resetsAt: new Date('2026-12-01T00:00:00Z') }),
    );

    const res = await POST(request());

    expect(res.status).toBe(402);
    expect(await res.json()).toMatchObject({ code: 'BILLING_LIMIT_REACHED', limit: 2, used: 2, remaining: 0 });
    expect(state.discover).not.toHaveBeenCalled();
  });

  it('releases the reservation when the service reports that no paid call started', async () => {
    state.discover.mockRejectedValue(new DiscoveryFailedError('Competitor discovery failed', 0));

    const res = await POST(request());

    expect(res.status).toBe(500);
    expect(billing.releaseDiscoveryUsage).toHaveBeenCalledWith('user-alice', 'usage-1');
  });

  it('keeps the charge after a transport timeout', async () => {
    state.discover.mockRejectedValue(
      new Error('Microservice discover_competitors did not respond within 90 seconds'),
    );

    const res = await POST(request());

    expect(res.status).toBe(500);
    expect(billing.releaseDiscoveryUsage).not.toHaveBeenCalled();
  });

  it.each([
    ['paid calls had started', 2],
    ['the service could not count paid calls', null],
  ])('keeps the charge when %s', async (_name, paidCallsStarted) => {
    state.discover.mockRejectedValue(
      new DiscoveryFailedError('Competitor discovery failed', paidCallsStarted),
    );

    const res = await POST(request());

    expect(res.status).toBe(500);
    expect(billing.releaseDiscoveryUsage).not.toHaveBeenCalled();
  });

  it('does not reserve for an invalid request', async () => {
    const res = await POST(request({ domain: 'https://acme.example' }));

    expect(res.status).toBe(400);
    expect(billing.recordDiscoveryUsage).not.toHaveBeenCalled();
  });
});
