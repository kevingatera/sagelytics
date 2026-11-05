import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CompetitorDiscoveryService } from './competitor-discovery.service';
import type { DiscoveryCostSummary } from './discovery-cost-ledger';
import { WebsiteDiscoveryService } from '../../website/services/website-discovery.service';
import { PerplexityService } from '../../llm-tools/perplexity.service';
import { OpenRouterService } from '../../llm-tools/openrouter.service';

// Service-level regressions for review findings 2, 3, 4 (partial results), 5, 6 and 7.
const mockRedisStore = new Map<string, string>();
const mockRedisSetex = jest.fn((key: string, _ttl: number, value: string) => {
  mockRedisStore.set(key, value);
  return Promise.resolve('OK');
});
const mockRedis = {
  on: jest.fn(),
  get: jest.fn((key: string) => Promise.resolve(mockRedisStore.get(key) ?? null)),
  setex: mockRedisSetex,
  publish: jest.fn(() => Promise.resolve(1)),
  disconnect: jest.fn(),
};

jest.mock('ioredis', () => ({
  Redis: jest.fn(() => mockRedis),
}));

const verdicts = (domains: string[]) => ({
  competitors: domains.map((domain) => ({ domain, reason: 'local lodge' })),
  excluded: [],
  usage: {},
  rawText: '{}',
});

const never = () => new Promise<never>(() => undefined);

const uncachedConfig = {
  NODE_ENV: 'test',
  REDIS_URL: 'redis://localhost:6379',
  PERPLEXITY_API_KEY: 'test-key',
  DISCOVERY_ESCALATION_THRESHOLD: '1',
};
const cachedConfig = { ...uncachedConfig, NODE_ENV: 'development' };

function providers() {
  const website = {
    discoverWebsiteContent: jest.fn().mockResolvedValue({
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
    }),
  } as unknown as WebsiteDiscoveryService;
  const perplexity = {
    discoverCompetitors: jest.fn().mockResolvedValue({
      competitors: [
        { name: 'Perplexity Rival', domain: 'perplexity-rival.com', description: 'local lodge' },
      ],
      sources: [],
    }),
    researchCompetitor: jest.fn().mockResolvedValue({
      businessName: 'Rival',
      insights: 'insight',
      products: [{ name: 'Standard Room', price: 200, currency: 'USD' }],
      sources: [],
    }),
  } as unknown as PerplexityService;
  const openRouter = {
    strictCompetitorFilterViaOpenAi: jest
      .fn()
      .mockResolvedValue(verdicts(['perplexity-rival.com'])),
    strictCompetitorFilter: jest.fn().mockRejectedValue(new Error('fallback down')),
    webSearchDiscoveryViaOpenAi: jest
      .fn()
      .mockResolvedValue({ competitors: [], usage: {}, rawText: '{}' }),
    webSearchDiscovery: jest
      .fn()
      .mockResolvedValue({ competitors: [], usage: {}, rawText: '{}' }),
  } as unknown as OpenRouterService;
  return { website, perplexity, openRouter };
}

const build = (
  config: Record<string, string>,
  parts: ReturnType<typeof providers>,
) =>
  new CompetitorDiscoveryService(
    parts.website,
    new ConfigService(config),
    parts.perplexity,
    parts.openRouter,
  );

const discover = (
  service: CompetitorDiscoveryService,
  known: string[] = [],
  sessionId?: string,
) => service.discoverCompetitors('example.com', 'user-1', 'hospitality', known, '', sessionId);

const discoveryTtls = () =>
  mockRedisSetex.mock.calls
    .filter(([key]) => String(key).startsWith('competitor:discovery:'))
    .map(([, ttl]) => ttl);

describe('CompetitorDiscoveryService review regressions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisStore.clear();
  });

  it('finding 2: drops invented, denylisted and duplicate domains from the strict filter output', async () => {
    const parts = providers();
    parts.openRouter.strictCompetitorFilterViaOpenAi = jest.fn().mockResolvedValue({
      competitors: [
        { domain: 'invented-lodge.com', reason: 'never submitted' },
        { domain: 'tripadvisor.com', reason: 'directory' },
        { domain: 'perplexity-rival.com', reason: 'first' },
        { domain: 'perplexity-rival.com', reason: 'duplicate' },
      ],
      excluded: [],
      usage: {},
      rawText: '{}',
    });

    const result = await discover(build(uncachedConfig, parts));

    expect(result.competitors.map((c) => c.domain)).toEqual(['perplexity-rival.com']);
  });

  it('finding 2: treats schema-invalid strict output as a failure and uses the fallback filter', async () => {
    const parts = providers();
    parts.openRouter.strictCompetitorFilterViaOpenAi = jest.fn().mockResolvedValue({
      competitors: 'perplexity-rival.com',
      excluded: [],
      usage: {},
      rawText: '{}',
    });
    parts.openRouter.strictCompetitorFilter = jest
      .fn()
      .mockResolvedValue(verdicts(['perplexity-rival.com']));

    const result = await discover(build(uncachedConfig, parts));

    expect(parts.openRouter.strictCompetitorFilter).toHaveBeenCalledTimes(1);
    expect(result.competitors.map((c) => c.domain)).toEqual(['perplexity-rival.com']);
  });

  it('finding 3: a failed re-filter after escalation keeps the previously approved set', async () => {
    const parts = providers();
    parts.openRouter.strictCompetitorFilterViaOpenAi = jest
      .fn()
      .mockResolvedValueOnce(verdicts(['perplexity-rival.com']))
      .mockRejectedValueOnce(new Error('OpenAI primary upstream error (500)'));
    parts.openRouter.webSearchDiscoveryViaOpenAi = jest.fn().mockResolvedValue({
      competitors: [{ domain: 'escalated-rival.com', reason: 'web' }],
      usage: {},
      rawText: '{}',
    });
    const config = { ...uncachedConfig, DISCOVERY_ESCALATION_THRESHOLD: '2' };

    const result = await discover(build(config, parts));

    expect(parts.openRouter.webSearchDiscoveryViaOpenAi).toHaveBeenCalledTimes(1);
    expect(parts.openRouter.strictCompetitorFilterViaOpenAi).toHaveBeenCalledTimes(2);
    expect(result.competitors.map((c) => c.domain)).toEqual(['perplexity-rival.com']);
    expect(result.quality.degraded).toBe(false);
  });

  it('finding 3: when no strict filter succeeds, heuristic results are degraded, capped and cached briefly', async () => {
    const parts = providers();
    parts.openRouter.strictCompetitorFilterViaOpenAi = jest
      .fn()
      .mockRejectedValue(new Error('OpenAI primary unauthorized (401)'));
    parts.openRouter.strictCompetitorFilter = jest
      .fn()
      .mockRejectedValue(new Error('OpenRouter unauthorized (401)'));

    const result = await discover(build(cachedConfig, parts));

    expect(result.competitors.map((c) => c.domain)).toEqual(['perplexity-rival.com']);
    expect(result.quality).toMatchObject({
      degraded: true,
      partial: false,
      confidence: 'low',
    });
    expect(result.quality.reasons).toContain('strict_filter_unavailable');
    expect(result.competitors[0].matchScore).toBeLessThanOrEqual(40);
    expect(result.competitors[0].dataGaps).toContain(
      'Unverified: strict relevance filter unavailable',
    );
    expect(discoveryTtls()).toEqual([600]);
  });

  it('finding 4: returns an explicit partial result when the discovery budget runs out', async () => {
    jest.useFakeTimers();
    try {
      const parts = providers();
      parts.perplexity.discoverCompetitors = jest.fn(() => never()) as never;
      const config = {
        ...uncachedConfig,
        DISCOVERY_BUDGET_MS: '30000',
        PERPLEXITY_TIMEOUT_MS: '60000',
      };

      const settled = discover(build(config, parts)).then(
        (value) => value,
        (error: unknown) => error,
      );
      await jest.advanceTimersByTimeAsync(60_000);
      const result = await settled;

      expect(result).toMatchObject({
        competitors: [],
        quality: { partial: true, degraded: true, confidence: 'low' },
      });
      expect((result as { quality: { reasons: string[] } }).quality.reasons).toContain(
        'budget_exhausted:perplexity_discovery',
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('finding 5: a finalist whose enrichment fails stays in the result with a marker, and caches briefly', async () => {
    const parts = providers();
    parts.perplexity.researchCompetitor = jest
      .fn()
      .mockRejectedValue(new Error('Competitor research failed: upstream'));

    const result = await discover(build(cachedConfig, parts));

    expect(result.competitors).toHaveLength(1);
    expect(result.competitors[0]).toMatchObject({
      domain: 'perplexity-rival.com',
      matchScore: 0,
      products: [],
      dataGaps: ['Failed to fetch detailed product information'],
    });
    expect(result.stats.failedAnalyses).toBe(1);
    expect(result.quality).toMatchObject({ degraded: true, enrichmentFailures: 1 });
    expect(discoveryTtls()).toEqual([600]);
  });

  it('finding 5: an empty discovery result is not cached at the normal six-hour TTL', async () => {
    const parts = providers();
    parts.perplexity.discoverCompetitors = jest
      .fn()
      .mockResolvedValue({ competitors: [], sources: [] });

    const result = await discover(build(cachedConfig, parts));

    expect(result.competitors).toEqual([]);
    expect(discoveryTtls()).toEqual([600]);
  });

  it('finding 6: concurrent discoveries share one research call for the same domain', async () => {
    jest.useFakeTimers();
    try {
      const parts = providers();
      parts.perplexity.researchCompetitor = jest.fn(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  businessName: 'Rival',
                  insights: 'insight',
                  products: [{ name: 'Standard Room', price: 200, currency: 'USD' }],
                  sources: [],
                }),
              1000,
            ),
          ),
      ) as never;

      const service = build(uncachedConfig, parts);
      const both = Promise.all([
        discover(service, ['https://known-a.com']),
        discover(service, ['https://known-b.com']),
      ]);
      await jest.advanceTimersByTimeAsync(5_000);
      await both;

      expect(parts.perplexity.researchCompetitor).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('finding 7: cost summary counts nested research, fallback attempts and output that fails parsing', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log');
    const parts = providers();
    parts.perplexity.discoverCompetitors = jest.fn(
      async (
        _domain: string,
        _businessType: string,
        _region?: string,
        options?: { onUsage?: (event: unknown) => void },
      ) => {
        options?.onUsage?.({ provider: 'perplexity', operation: 'research' });
        options?.onUsage?.({ provider: 'perplexity', operation: 'discover', model: 'sonar' });
        options?.onUsage?.({ provider: 'perplexity', operation: 'discover', model: 'sonar-pro' });
        return {
          competitors: [{ name: 'Perplexity Rival', domain: 'perplexity-rival.com' }],
          sources: [],
        };
      },
    ) as never;
    parts.openRouter.strictCompetitorFilterViaOpenAi = jest.fn(
      async (params: { onUsage?: (event: unknown) => void }) => {
        params.onUsage?.({ provider: 'openai', operation: 'filter', costUsd: 0.002 });
        throw new Error('OpenAI primary strict filter returned invalid JSON');
      },
    ) as never;
    parts.openRouter.strictCompetitorFilter = jest
      .fn()
      .mockResolvedValue(verdicts(['perplexity-rival.com']));

    await discover(build(uncachedConfig, parts));

    const summary = logSpy.mock.calls.find(
      ([message]) => message === '[TwoStage] API cost summary',
    )?.[1] as DiscoveryCostSummary | undefined;
    logSpy.mockRestore();

    expect(summary).toBeDefined();
    expect(summary?.perplexityResearchCalls).toBe(1);
    expect(summary?.buckets.perplexity_discovery.calls).toBe(2);
    expect(summary?.buckets.openai_filter).toEqual({
      calls: 1,
      estimatedUsd: 0.002,
      unknownCostCalls: 0,
    });
    expect(summary?.costComplete).toBe(true);
  });
});
