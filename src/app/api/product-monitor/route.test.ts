import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = { ownerId: string; productUrl: string; date: string; price: number };

const state = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  rows: [] as Row[],
  linked: [] as Array<{ userId: string; domain: string }>,
  trackPriceHistory: vi.fn(),
  monitorCompetitorPrices: vi.fn(),
  discoverWebsiteContent: vi.fn(),
  storedCatalog: vi.fn(),
}));

vi.mock('~/server/auth', async () => {
  const { checkWriteSession } = await import('~/server/auth/write-session');
  return {
    auth: vi.fn(async () => state.session),
    requireWriteSession: vi.fn(async () => checkWriteSession(state.session as never)),
  };
});

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, eq: (_column: unknown, value: unknown) => ({ value }) };
});

vi.mock('~/server/db', () => ({
  db: {
    query: {
      userCompetitors: {
        findMany: vi.fn(async ({ where }: { where: { value: string } }) =>
          state.linked
            .filter((link) => link.userId === where.value)
            .map((link) => ({ competitor: { domain: link.domain } })),
        ),
      },
      userProducts: { findMany: state.storedCatalog },
      userOnboarding: {
        findFirst: vi.fn(async () => ({ productCatalogUrl: 'https://own.example/catalog' })),
      },
    },
  },
}));

// Stand-in for the microservice with the same contract as getPriceSeriesForUser:
// only rows from the caller's own tasks are returned.
vi.mock('~/lib/services/microservice-client', () => ({
  MicroserviceClient: {
    getInstance: () => ({
      trackPriceHistory: state.trackPriceHistory,
      monitorCompetitorPrices: state.monitorCompetitorPrices,
      discoverWebsiteContent: state.discoverWebsiteContent,
    }),
  },
}));

vi.mock('~/server/monitoring/paid-work', () => ({
  PaidWorkLimitError: class extends Error {},
  runPaidWork: (_userId: string, _kind: string, work: (deadlineAt: number) => Promise<unknown>) =>
    work(Date.now() + 45_000),
}));

import { GET, POST } from './route';

const ALICE = 'user-alice';
const BOB = 'user-bob';
const URL_A = 'https://competitor.example/pro';

function getRequest(productUrl?: string) {
  const query = productUrl === undefined ? '' : `?productUrl=${encodeURIComponent(productUrl)}`;
  return new Request(`http://localhost/api/product-monitor${query}`);
}

function postRequest(body: unknown) {
  return new Request('http://localhost/api/product-monitor', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  state.session = null;
  state.rows = [
    { ownerId: ALICE, productUrl: URL_A, date: '2026-11-01T00:00:00.000Z', price: 40 },
    { ownerId: ALICE, productUrl: URL_A, date: '2026-11-10T00:00:00.000Z', price: 49 },
  ];
  state.linked = [{ userId: ALICE, domain: 'competitor.example' }];
  state.trackPriceHistory.mockImplementation(async (userId: string, productUrl: string) => {
    const history = state.rows
      .filter((row) => row.ownerId === userId && row.productUrl === productUrl)
      .map((row) => ({ date: row.date, price: row.price, change: null }));
    return { current: history.at(-1)?.price ?? null, history };
  });
  state.storedCatalog.mockResolvedValue([]);
  state.discoverWebsiteContent.mockResolvedValue({ products: [] });
  state.monitorCompetitorPrices.mockResolvedValue([]);
});

describe('GET /api/product-monitor', () => {
  it('rejects a request without a session', async () => {
    const res = await GET(getRequest(URL_A));
    expect(res.status).toBe(401);
    expect(state.trackPriceHistory).not.toHaveBeenCalled();
  });

  it("returns the owner's history and passes the caller's id to the microservice", async () => {
    state.session = { user: { id: ALICE } };

    const res = await GET(getRequest(URL_A));
    const body = (await res.json()) as { history: { current: number | null; history: unknown[] } };

    expect(res.status).toBe(200);
    expect(state.trackPriceHistory).toHaveBeenCalledWith(ALICE, URL_A);
    expect(body.history.current).toBe(49);
    expect(body.history.history).toHaveLength(2);
  });

  it("does not let one user read another user's history", async () => {
    state.session = { user: { id: BOB } };

    const res = await GET(getRequest(URL_A));
    const body = (await res.json()) as { history: { current: number | null; history: unknown[] } };

    expect(state.trackPriceHistory).toHaveBeenCalledWith(BOB, URL_A);
    expect(body.history).toEqual({ current: null, history: [] });
  });

  it('answers a foreign URL exactly like an unknown URL', async () => {
    state.session = { user: { id: BOB } };

    const foreign = await GET(getRequest(URL_A));
    const unknown = await GET(getRequest('https://nobody.example/none'));

    expect(foreign.status).toBe(unknown.status);
    expect(await foreign.json()).toEqual(await unknown.json());
  });
});

describe('POST /api/product-monitor', () => {
  it('rejects a request without a session', async () => {
    const res = await POST(postRequest({ competitorDomain: 'competitor.example' }));
    expect(res.status).toBe(401);
  });

  it('refuses to crawl a competitor the user has not linked', async () => {
    state.session = { user: { id: BOB } };

    const res = await POST(postRequest({ competitorDomain: 'competitor.example' }));

    expect(res.status).toBe(404);
    expect(state.discoverWebsiteContent).not.toHaveBeenCalled();
    expect(state.monitorCompetitorPrices).not.toHaveBeenCalled();
  });

  it("monitors a competitor the user has linked, using the user's own catalog", async () => {
    state.session = { user: { id: ALICE } };

    const res = await POST(postRequest({ competitorDomain: 'https://www.Competitor.example/' }));

    expect(res.status).toBe(200);
    expect(state.discoverWebsiteContent).toHaveBeenCalledWith('https://own.example/catalog', expect.any(Number));
    expect(state.monitorCompetitorPrices).toHaveBeenCalledWith({
      competitorDomain: 'competitor.example',
      userProducts: [],
    }, expect.any(Number));
  });
  it('uses stored products without crawling the own catalog', async () => {
    state.session = { user: { id: ALICE } };
    state.storedCatalog.mockResolvedValue([{ name: 'Pro', description: null, price: '29.50' }]);

    const res = await POST(postRequest({ competitorDomain: 'competitor.example', productIds: ['Pro'] }));

    expect(res.status).toBe(200);
    expect(state.discoverWebsiteContent).not.toHaveBeenCalled();
    expect(state.monitorCompetitorPrices).toHaveBeenCalledWith({
      competitorDomain: 'competitor.example',
      userProducts: [{ name: 'Pro', price: 29.5 }],
    }, expect.any(Number));
  });

});
