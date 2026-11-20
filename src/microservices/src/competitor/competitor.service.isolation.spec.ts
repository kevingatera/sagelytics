import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { CompetitorService, fetchErrorCodeForLog } from './competitor.service';
import { IntelligentAgentService } from './services/intelligent-agent.service';
import { WebsiteDiscoveryService } from '../website/services/website-discovery.service';
import { PerplexityService } from '../llm-tools/perplexity.service';
import { ModelManagerService } from '@shared/services/model-manager.service';

// Tenant isolation for the legacy discovery cache. Redis is an in-memory map and every
// provider is a mock, so no network is used.
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

function build() {
  let websiteCalls = 0;
  const website = {
    discoverWebsiteContent: jest.fn((url: string) => {
      websiteCalls += 1;
      return Promise.resolve({
        url,
        title: 'Acme',
        description: 'Lodge',
        products: [{ name: `Room ${websiteCalls}`, price: 100, currency: 'USD' }],
        services: [],
        categories: [],
        keywords: [],
        mainContent: '',
        metadata: {},
      });
    }),
  } as unknown as WebsiteDiscoveryService;
  const agent = {
    discoverCompetitors: jest.fn().mockResolvedValue([]),
    analyzeCompetitor: jest.fn(),
  } as unknown as IntelligentAgentService;
  // No PERPLEXITY_API_KEY: the legacy flow uses only the mocked agent.
  const service = new CompetitorService(
    agent,
    website,
    {} as PerplexityService,
    new ConfigService({ NODE_ENV: 'development', REDIS_URL: 'redis://localhost:6379' }),
    {} as ModelManagerService,
  );
  const runs = () => (agent.discoverCompetitors as jest.Mock).mock.calls.length;
  return { service, runs };
}

const discover = (service: CompetitorService, userId: string, catalog: string) =>
  service.discoverCompetitors(DOMAIN, userId, 'hospitality', [], catalog, undefined);

const discoveryKeys = () =>
  [...mockRedisStore.keys()].filter((key) => key.startsWith('competitor:discovery:'));

describe('catalog log redaction', () => {
  const SIGNED = 'https://acme.example/catalog?sig=top-secret-token';

  function captureLogs(service: CompetitorService) {
    const logger = (service as unknown as { logger: Record<string, jest.Mock> }).logger;
    const lines: string[] = [];
    for (const level of ['log', 'warn', 'error', 'debug', 'verbose']) {
      jest.spyOn(logger as never, level as never).mockImplementation(((
        ...args: unknown[]
      ) => {
        lines.push(JSON.stringify(args));
      }) as never);
    }
    return lines;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisStore.clear();
  });

  it('logs only the host when the catalog fetch succeeds', async () => {
    const { service } = build();
    const lines = captureLogs(service);

    await discover(service, 'user-alice', SIGNED);

    const output = lines.join('\n');
    expect(output).toContain('acme.example');
    expect(output).not.toContain('top-secret-token');
    expect(output).not.toContain('/catalog');
  });

  it('logs the host and a structured code, not the message, when the fetch fails', async () => {
    const website = {
      discoverWebsiteContent: jest.fn((url: string) =>
        url === SIGNED
          ? Promise.reject(new Error(`getaddrinfo failed for ${SIGNED}`))
          : Promise.resolve({ url, products: [], services: [], categories: [], keywords: [], metadata: {} }),
      ),
    } as unknown as WebsiteDiscoveryService;
    const service = new CompetitorService(
      { discoverCompetitors: jest.fn().mockResolvedValue([]) } as unknown as IntelligentAgentService,
      website,
      {} as PerplexityService,
      new ConfigService({ NODE_ENV: 'development', REDIS_URL: 'redis://localhost:6379' }),
      {} as ModelManagerService,
    );
    const lines = captureLogs(service);

    await discover(service, 'user-alice', SIGNED);

    const output = lines.join('\n');
    expect(output).toContain('acme.example');
    expect(output).toContain('"errorCode":"Error"');
    expect(output).not.toContain('top-secret-token');
  });
});

describe('fetchErrorCodeForLog', () => {
  it('maps known fetch failures, node codes and unknown values to bounded codes', () => {
    expect(fetchErrorCodeForLog(new Error('TIMEOUT'))).toBe('TIMEOUT');
    expect(fetchErrorCodeForLog(Object.assign(new Error('x https://a/?sig=s'), { code: 'ENOTFOUND' }))).toBe('ENOTFOUND');
    expect(fetchErrorCodeForLog(new TypeError('https://a/?sig=s'))).toBe('TypeError');
    expect(fetchErrorCodeForLog('https://a/?sig=s')).toBe('UNKNOWN');
  });
});

describe('legacy discovery tenant isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisStore.clear();
  });

  it('does not serve one user a cached result written for another user', async () => {
    const { service, runs } = build();
    const catalog = 'https://acme.example/catalog?sig=x';

    const alice = await discover(service, 'user-alice', catalog);
    const bob = await discover(service, 'user-bob', catalog);

    expect(runs()).toBe(2);
    expect(discoveryKeys()).toHaveLength(2);
    expect(bob.userProducts).not.toEqual(alice.userProducts);
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

    await discover(service, 'user-alice', 'https://acme.example/catalog#rooms');
    await discover(service, 'user-alice', 'https://acme.example/catalog#suites');

    expect(runs()).toBe(1);
    expect(discoveryKeys()).toHaveLength(1);
  });

  it('never reads an entry written under the old shared version prefix', async () => {
    const oldPayload = {
      version: 2,
      userDomain: DOMAIN,
      businessType: 'hospitality',
      knownCompetitors: [],
      productCatalogUrl: 'https://acme.example/catalog',
    };
    const oldKey = `competitor:discovery:${createHash('sha1')
      .update(JSON.stringify(oldPayload))
      .digest('hex')}`;
    mockRedisStore.set(
      oldKey,
      JSON.stringify({ competitors: [], userProducts: [{ name: 'Leaked Room' }] }),
    );

    const { service, runs } = build();
    const result = await discover(service, 'user-bob', 'https://acme.example/catalog?sig=b');

    expect(runs()).toBe(1);
    expect(result.userProducts?.map((p) => p.name)).not.toContain('Leaked Room');
    const reads = mockRedis.get.mock.calls
      .map(([key]) => key)
      .filter((key) => key.startsWith('competitor:discovery:'));
    expect(reads.length).toBeGreaterThan(0);
    expect(reads.every((key) => key.startsWith('competitor:discovery:v3:legacy:'))).toBe(true);
  });
});
