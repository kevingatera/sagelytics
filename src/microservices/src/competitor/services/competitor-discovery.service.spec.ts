import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CompetitorDiscoveryService } from './competitor-discovery.service';
import { WebsiteDiscoveryService } from '../../website/services/website-discovery.service';
import { PerplexityService } from '../../llm-tools/perplexity.service';
import { OpenRouterService } from '../../llm-tools/openrouter.service';

// Redis backs progress and cache writes. The mock keeps both observable without a server.
const mockRedisStore = new Map<string, string>();
const mockRedisPublish = jest.fn<Promise<number>, [string, string]>(() =>
  Promise.resolve(1),
);
const mockRedis = {
  on: jest.fn(),
  get: jest.fn((key: string) =>
    Promise.resolve(mockRedisStore.get(key) ?? null),
  ),
  setex: jest.fn((key: string, _ttl: number, value: string) => {
    mockRedisStore.set(key, value);
    return Promise.resolve('OK');
  }),
  publish: mockRedisPublish,
  disconnect: jest.fn(),
};

jest.mock('ioredis', () => ({
  Redis: jest.fn(() => mockRedis),
}));

describe('CompetitorDiscoveryService', () => {
  const originalFetch = global.fetch;

  const websiteDiscoveryMock = {
    discoverWebsiteContent: jest.fn(),
  } as unknown as WebsiteDiscoveryService;

  const perplexityMock = {
    discoverCompetitors: jest.fn(),
    researchCompetitor: jest.fn(),
  } as unknown as PerplexityService;

  const openRouterMock = {
    strictCompetitorFilter: jest.fn(),
    strictCompetitorFilterViaOpenAi: jest.fn(),
    webSearchDiscovery: jest.fn(),
    webSearchDiscoveryViaOpenAi: jest.fn(),
  } as unknown as OpenRouterService;

  const baseConfig = {
    NODE_ENV: 'test',
    REDIS_URL: 'redis://localhost:6379',
    REDIS_DB: '0',
    PERPLEXITY_API_KEY: 'test-key',
    VALUESERP_API_KEY: 'valueserp-key',
    DISCOVERY_ESCALATION_THRESHOLD: '2',
    DISCOVERY_PIPELINE: 'two_stage',
    COMPETITOR_DISCOVERY_LIMIT: '3',
    OPENROUTER_FILTER_TIMEOUT_MS: '45000',
    OPENROUTER_ESCALATION_TIMEOUT_MS: '180000',
    PERPLEXITY_TIMEOUT_MS: '30000',
  };

  // Threshold 1 means one surviving competitor skips escalation, which keeps call counts focused.
  const singleFilterConfig = {
    ...baseConfig,
    DISCOVERY_ESCALATION_THRESHOLD: '1',
  };
  // Enables the Redis-backed cache path. The mock store means no server is contacted.
  const cachedConfig = {
    ...singleFilterConfig,
    NODE_ENV: 'development',
  };

  const strictResult = (domains: string[]) => ({
    competitors: domains.map((domain) => ({ domain, reason: 'local lodge' })),
    excluded: [],
    usage: {},
    rawText: '{}',
  });

  const discover = (
    service: CompetitorDiscoveryService,
    knownCompetitors: string[] = [],
    sessionId?: string,
  ) =>
    service.discoverCompetitors(
      'example.com',
      'user-1',
      'hospitality',
      knownCompetitors,
      '',
      sessionId,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisStore.clear();

    websiteDiscoveryMock.discoverWebsiteContent = jest.fn().mockResolvedValue({
      url: 'example.com',
      title: 'Le Bambou Gorilla Lodge',
      description: 'Luxury gorilla lodge in Rwanda',
      products: [
        {
          name: 'Standard Room',
          description: 'Comfortable room',
          price: 220,
          currency: 'USD',
          url: 'https://example.com/standard',
        },
      ],
      services: [],
      categories: [],
      keywords: [],
      mainContent: 'Located in Rwanda near Volcanoes National Park',
      metadata: {},
    });

    perplexityMock.discoverCompetitors = jest.fn().mockResolvedValue({
      competitors: [
        {
          name: 'Perplexity Rival',
          domain: 'perplexity-rival.com',
          description: 'Perplexity discovered competitor',
        },
      ],
      sources: [],
    });

    perplexityMock.researchCompetitor = jest.fn().mockImplementation((domain) =>
      Promise.resolve({
        businessName: `Business ${domain}`,
        insights: `Insight for ${domain}`,
        products: [{ name: 'Standard Room', price: 200, currency: 'USD' }],
        sources: [],
      }),
    );

    openRouterMock.webSearchDiscovery = jest.fn().mockResolvedValue({
      competitors: [{ domain: 'escalated-rival.com', reason: 'web search' }],
      usage: {},
      rawText: '{}',
    });
    openRouterMock.webSearchDiscoveryViaOpenAi = jest.fn().mockResolvedValue({
      competitors: [{ domain: 'escalated-rival.com', reason: 'web search' }],
      usage: {},
      rawText: '{}',
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        organic_results: [
          {
            link: 'https://serp-rival.com',
            title: 'SERP Rival',
            snippet: 'A local competitor',
          },
        ],
        local_results: [],
        shopping_results: [],
      }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('merges Perplexity and ValueSERP candidates into strict filter stage', async () => {
    openRouterMock.strictCompetitorFilterViaOpenAi = jest
      .fn()
      .mockResolvedValue({
        competitors: [
          { domain: 'perplexity-rival.com', reason: 'same segment' },
          { domain: 'serp-rival.com', reason: 'same local market' },
        ],
        excluded: [],
        usage: {},
        rawText: '{}',
      });

    const service = new CompetitorDiscoveryService(
      websiteDiscoveryMock,
      new ConfigService(baseConfig),
      perplexityMock,
      openRouterMock,
    );

    const result = await discover(service);

    expect(perplexityMock.discoverCompetitors).toHaveBeenCalled();
    expect(openRouterMock.strictCompetitorFilterViaOpenAi).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: 'example.com',
        candidates: expect.arrayContaining([
          expect.objectContaining({ domain: 'perplexity-rival.com' }),
          expect.objectContaining({ domain: 'serp-rival.com' }),
        ]),
      }),
    );
    expect(result.competitors.length).toBeGreaterThanOrEqual(1);
    expect(result.userProducts?.length).toBe(1);
  });

  it('triggers escalation and re-runs strict filtering when threshold is not met', async () => {
    openRouterMock.strictCompetitorFilterViaOpenAi = jest
      .fn()
      .mockResolvedValueOnce({
        competitors: [{ domain: 'perplexity-rival.com', reason: 'initial' }],
        excluded: [],
        usage: {},
        rawText: '{}',
      })
      .mockResolvedValueOnce({
        competitors: [
          { domain: 'perplexity-rival.com', reason: 'initial' },
          { domain: 'escalated-rival.com', reason: 'escalated' },
        ],
        excluded: [],
        usage: {},
        rawText: '{}',
      });

    const service = new CompetitorDiscoveryService(
      websiteDiscoveryMock,
      new ConfigService(baseConfig),
      perplexityMock,
      openRouterMock,
    );

    const result = await discover(service);

    expect(openRouterMock.webSearchDiscoveryViaOpenAi).toHaveBeenCalledTimes(1);
    expect(
      openRouterMock.strictCompetitorFilterViaOpenAi,
    ).toHaveBeenCalledTimes(2);
    expect(
      result.competitors.some((c) => c.domain === 'escalated-rival.com'),
    ).toBe(true);
  });

  it('drops denylisted and near-duplicate domains before the strict filter', async () => {
    perplexityMock.discoverCompetitors = jest.fn().mockResolvedValue({
      competitors: [
        {
          name: 'Booking',
          domain: 'tripadvisor.com',
          description: 'directory',
        },
        {
          name: 'Lodge clone',
          domain: 'example-lodge.com',
          description: 'same brand',
        },
        {
          name: 'Perplexity Rival',
          domain: 'perplexity-rival.com',
          description: 'local lodge',
        },
      ],
      sources: [],
    });
    const strictFilter = jest
      .fn()
      .mockResolvedValue(strictResult(['perplexity-rival.com']));
    openRouterMock.strictCompetitorFilterViaOpenAi = strictFilter;

    const service = new CompetitorDiscoveryService(
      websiteDiscoveryMock,
      new ConfigService(singleFilterConfig),
      perplexityMock,
      openRouterMock,
    );
    await discover(service);

    const filterInput = strictFilter.mock.calls[0][0] as {
      candidates: Array<{ domain: string }>;
    };
    const domains = filterInput.candidates.map((candidate) => candidate.domain);
    expect(domains).toContain('perplexity-rival.com');
    expect(domains).not.toContain('tripadvisor.com');
    expect(domains).not.toContain('example-lodge.com');
  });

  it('falls back to OpenRouter when the OpenAI strict filter fails', async () => {
    const primaryFilter = jest
      .fn()
      .mockRejectedValue(new Error('OpenAI primary unauthorized (401)'));
    const fallbackFilter = jest
      .fn()
      .mockResolvedValue(strictResult(['perplexity-rival.com']));
    openRouterMock.strictCompetitorFilterViaOpenAi = primaryFilter;
    openRouterMock.strictCompetitorFilter = fallbackFilter;

    const service = new CompetitorDiscoveryService(
      websiteDiscoveryMock,
      new ConfigService(singleFilterConfig),
      perplexityMock,
      openRouterMock,
    );
    const result = await discover(service);

    expect(primaryFilter).toHaveBeenCalledTimes(1);
    expect(fallbackFilter).toHaveBeenCalledTimes(1);
    expect(result.competitors.map((c) => c.domain)).toEqual([
      'perplexity-rival.com',
    ]);
  });

  it('skips the second strict filter when escalation only repeats judged domains', async () => {
    const strictFilter = jest
      .fn()
      .mockResolvedValue(strictResult(['perplexity-rival.com']));
    const escalation = jest.fn().mockResolvedValue({
      competitors: [
        { domain: 'perplexity-rival.com', reason: 'again' },
        { domain: 'tripadvisor.com', reason: 'directory' },
      ],
      usage: {},
      rawText: '{}',
    });
    openRouterMock.strictCompetitorFilterViaOpenAi = strictFilter;
    openRouterMock.webSearchDiscoveryViaOpenAi = escalation;

    const service = new CompetitorDiscoveryService(
      websiteDiscoveryMock,
      new ConfigService(baseConfig),
      perplexityMock,
      openRouterMock,
    );
    const result = await discover(service);

    expect(escalation).toHaveBeenCalledTimes(1);
    expect(strictFilter).toHaveBeenCalledTimes(1);
    expect(result.competitors.map((c) => c.domain)).toEqual([
      'perplexity-rival.com',
    ]);
  });

  it('returns the cached discovery result without repeating discovery calls', async () => {
    openRouterMock.strictCompetitorFilterViaOpenAi = jest
      .fn()
      .mockResolvedValue(strictResult(['perplexity-rival.com']));

    const service = new CompetitorDiscoveryService(
      websiteDiscoveryMock,
      new ConfigService(cachedConfig),
      perplexityMock,
      openRouterMock,
    );
    const first = await discover(service);
    const second = await discover(service);

    expect(second).toEqual(first);
    expect(perplexityMock.discoverCompetitors).toHaveBeenCalledTimes(1);
    expect(
      openRouterMock.strictCompetitorFilterViaOpenAi,
    ).toHaveBeenCalledTimes(1);
  });

  it('reuses cached competitor research and counts only fresh Perplexity calls', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log');
    const research = jest.fn().mockImplementation((domain: string) =>
      Promise.resolve({
        businessName: `Business ${domain}`,
        insights: 'cached insight',
        products: [{ name: 'Standard Room', price: 200, currency: 'USD' }],
        sources: [],
      }),
    );
    perplexityMock.researchCompetitor = research;
    openRouterMock.strictCompetitorFilterViaOpenAi = jest
      .fn()
      .mockResolvedValue(strictResult(['perplexity-rival.com']));

    const service = new CompetitorDiscoveryService(
      websiteDiscoveryMock,
      new ConfigService(cachedConfig),
      perplexityMock,
      openRouterMock,
    );
    await discover(service);
    // A different known competitor changes the discovery key but not the research key.
    await discover(service, ['https://known-rival.com']);

    expect(research).toHaveBeenCalledTimes(1);
    const researchCounts = logSpy.mock.calls
      .filter(([message]) => message === '[TwoStage] API cost summary')
      .map(
        ([, metrics]) =>
          (metrics as { perplexityResearchCalls: number })
            .perplexityResearchCalls,
      );
    expect(researchCounts).toEqual([1, 0]);
    logSpy.mockRestore();
  });

  it('publishes progress for each pipeline stage when a session id is given', async () => {
    openRouterMock.strictCompetitorFilterViaOpenAi = jest
      .fn()
      .mockResolvedValue(strictResult(['perplexity-rival.com']));

    const service = new CompetitorDiscoveryService(
      websiteDiscoveryMock,
      new ConfigService(cachedConfig),
      perplexityMock,
      openRouterMock,
    );
    await discover(service, [], 'session-1');

    const steps = mockRedisPublish.mock.calls.map(
      ([, payload]) => (JSON.parse(payload) as { step: string }).step,
    );
    expect(mockRedisPublish).toHaveBeenCalledWith(
      'progress:session-1',
      expect.any(String),
    );
    expect(steps).toEqual(
      expect.arrayContaining([
        'analyzing_domain',
        'discovering_competitors',
        'analyzing_competitors',
        'processing_results',
      ]),
    );
  });

  it('scores finalists from catalog products that match their offerings', async () => {
    openRouterMock.strictCompetitorFilterViaOpenAi = jest
      .fn()
      .mockResolvedValue(strictResult(['perplexity-rival.com']));

    const service = new CompetitorDiscoveryService(
      websiteDiscoveryMock,
      new ConfigService(singleFilterConfig),
      perplexityMock,
      openRouterMock,
    );
    const result = await discover(service);

    const [finalist] = result.competitors;
    expect(finalist.domain).toBe('perplexity-rival.com');
    expect(finalist.products[0].matchedProducts).toEqual([
      {
        name: 'Standard Room',
        url: 'https://example.com/standard',
        matchScore: 100,
        priceDiff: expect.any(Number),
      },
    ]);
    // 200 against a 220 catalog price is about -9%.
    expect(finalist.products[0].matchedProducts[0].priceDiff).toBeCloseTo(
      -9.09,
      1,
    );
    // Base 60, plus 15 for a known business type, plus 5 for one matched product.
    expect(finalist.matchScore).toBe(80);
  });
});
