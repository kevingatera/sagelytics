import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { CompetitorDiscoveryService } from './competitor-discovery.service';
import { WebsiteDiscoveryService } from '../../website/services/website-discovery.service';
import { PerplexityService } from '../../llm-tools/perplexity.service';
import { OpenRouterService } from '../../llm-tools/openrouter.service';

// Tenant isolation for the two-stage discovery cache and in-flight dedupe. Redis is an
// in-memory map and every provider is a mock, so no network is used.
const mockRedisStore = new Map<string, string>();
const mockRedis = {
  on: jest.fn(),
  get: jest.fn((key: string) => Promise.resolve(mockRedisStore.get(key) ?? null)),
  setex: jest.fn((key: string, _ttl: number, value: string) => {
    mockRedisStore.set(key, value);
    return Promise.resolve('OK');
  }),
  publish: jest.fn(() => Promise.resolve(1)),
  disconnect: jest.fn(),
};

jest.mock('ioredis', () => ({
  Redis: jest.fn(() => mockRedis),
}));

const DOMAIN = 'acme.example';
const CATALOG = 'https://acme.example/catalog?sig=alice-secret';

// The cache is on (NODE_ENV is not test). No ValueSERP key, so no SERP request is made.
const config = {
  NODE_ENV: 'development',
  REDIS_URL: 'redis://localhost:6379',
  PERPLEXITY_API_KEY: 'test-key',
  DISCOVERY_ESCALATION_THRESHOLD: '1',
};

const discoveryKeys = () =>
  [...mockRedisStore.keys()].filter((key) => key.startsWith('competitor:discovery:'));

function build(perplexityDelayMs = 0) {
  let websiteCalls = 0;
  const website = {
    // Every call returns a new product, so a result shared between runs would be visible.
    discoverWebsiteContent: jest.fn(() => {
      websiteCalls += 1;
      return Promise.resolve({
        url: DOMAIN,
        title: 'Acme',
        description: 'Lodge',
        products: [{ name: `Room ${websiteCalls}`, price: 100 + websiteCalls, currency: 'USD' }],
        services: [],
        categories: [],
        keywords: [],
        mainContent: '',
        metadata: {},
      });
    }),
  } as unknown as WebsiteDiscoveryService;
  const perplexity = {
    discoverCompetitors: jest.fn(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                competitors: [{ name: 'Rival', domain: 'rival.example', description: 'lodge' }],
                sources: [],
              }),
            perplexityDelayMs,
          ),
        ),
    ),
    researchCompetitor: jest.fn().mockResolvedValue({
      businessName: 'Rival',
      insights: 'insight',
      products: [{ name: 'Room', price: 90, currency: 'USD' }],
      sources: [],
    }),
  } as unknown as PerplexityService;
  const openRouter = {
    strictCompetitorFilterViaOpenAi: jest.fn().mockResolvedValue({
      competitors: [{ domain: 'rival.example', reason: 'same market' }],
      excluded: [],
      usage: {},
      rawText: '{}',
    }),
    strictCompetitorFilter: jest.fn(),
    webSearchDiscoveryViaOpenAi: jest.fn(),
    webSearchDiscovery: jest.fn(),
  } as unknown as OpenRouterService;

  const service = new CompetitorDiscoveryService(
    website,
    new ConfigService(config),
    perplexity,
    openRouter,
  );
  const runs = () => (perplexity.discoverCompetitors as jest.Mock).mock.calls.length;
  return { service, runs };
}

const discover = (
  service: CompetitorDiscoveryService,
  userId: string,
  catalog = CATALOG,
) => service.discoverCompetitors(DOMAIN, userId, 'hospitality', [], catalog, undefined);

describe('two-stage discovery tenant isolation', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisStore.clear();
    global.fetch = jest.fn(() =>
      Promise.reject(new Error('network is not allowed in this test')),
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('does not serve one user a cached result written for another user', async () => {
    const { service, runs } = build();

    const alice = await discover(service, 'user-alice');
    const bob = await discover(service, 'user-bob');

    expect(runs()).toBe(2);
    expect(discoveryKeys()).toHaveLength(2);
    const aliceNames = alice.userProducts?.map((p) => p.name) ?? [];
    const bobNames = bob.userProducts?.map((p) => p.name) ?? [];
    expect(aliceNames.length).toBeGreaterThan(0);
    expect(bobNames.length).toBeGreaterThan(0);
    expect(bobNames.filter((name) => aliceNames.includes(name))).toEqual([]);
  });

  it('does not share an in-flight discovery between users', async () => {
    jest.useFakeTimers();
    try {
      const { service, runs } = build(1000);

      const both = Promise.all([
        discover(service, 'user-alice'),
        discover(service, 'user-bob'),
        discover(service, 'user-alice'),
      ]);
      await jest.advanceTimersByTimeAsync(5000);
      const [alice, bob, aliceAgain] = await both;

      // Alice's two calls share one run; Bob gets his own.
      expect(runs()).toBe(2);
      expect(aliceAgain).toBe(alice);
      expect(bob).not.toBe(alice);
      expect(bob.userProducts).not.toEqual(alice.userProducts);
    } finally {
      jest.useRealTimers();
    }
  });

  it('gives the same user different keys for catalog URLs that differ only in the query', async () => {
    const { service, runs } = build();

    await discover(service, 'user-alice', 'https://acme.example/catalog?sig=one');
    await discover(service, 'user-alice', 'https://acme.example/catalog?sig=two');

    expect(runs()).toBe(2);
    expect(discoveryKeys()).toHaveLength(2);
  });

  it('shares a key for catalog URLs that differ only in the fragment', async () => {
    const { service, runs } = build();

    await discover(service, 'user-alice', 'https://acme.example/catalog?sig=one#rooms');
    await discover(service, 'user-alice', 'https://acme.example/catalog?sig=one#suites');

    expect(runs()).toBe(1);
    expect(discoveryKeys()).toHaveLength(1);
  });

  it('never reads an entry written under the old shared version prefix', async () => {
    // The key exactly as version 2 built it: no user id, catalog query dropped.
    const oldPayload = {
      version: 2,
      pipeline: 'two_stage',
      userDomain: DOMAIN,
      businessType: 'hospitality',
      knownCompetitors: [],
      productCatalogUrl: 'https://acme.example/catalog',
    };
    const oldKey = `competitor:discovery:two-stage:${createHash('sha1')
      .update(JSON.stringify(oldPayload))
      .digest('hex')}`;
    mockRedisStore.set(
      oldKey,
      JSON.stringify({ competitors: [], userProducts: [{ name: 'Leaked Room' }] }),
    );

    const { service, runs } = build();
    const result = await discover(service, 'user-bob');

    expect(runs()).toBe(1);
    expect(result.userProducts?.map((p) => p.name)).not.toContain('Leaked Room');
    const discoveryReads = mockRedis.get.mock.calls
      .map(([key]) => key)
      .filter((key) => key.startsWith('competitor:discovery:'));
    expect(discoveryReads.length).toBeGreaterThan(0);
    expect(discoveryReads.every((key) => key.startsWith('competitor:discovery:v3:'))).toBe(true);
  });

  it('stores no catalog URL or signature in any Redis key', async () => {
    const { service } = build();

    await discover(service, 'user-alice');

    for (const key of mockRedisStore.keys()) {
      expect(key).not.toContain('alice-secret');
      expect(key).not.toContain('catalog');
    }
  });
});
