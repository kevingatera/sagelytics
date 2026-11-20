import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CompetitorDiscoveryService } from './competitor-discovery.service';
import type { DiscoveryCostSummary } from './discovery-cost-ledger';
import { WebsiteDiscoveryService } from '../../website/services/website-discovery.service';
import { PerplexityService } from '../../llm-tools/perplexity.service';
import { OpenRouterService } from '../../llm-tools/openrouter.service';

// Ledger cost for ValueSERP calls: flat rate when configured, unknown when not, $0 for failures
// the provider never billed (401, network), and unknown for a call that timed out mid-flight.
const mockRedis = {
  on: jest.fn(),
  get: jest.fn(() => Promise.resolve(null)),
  setex: jest.fn(() => Promise.resolve('OK')),
  publish: jest.fn(() => Promise.resolve(1)),
  disconnect: jest.fn(),
};

jest.mock('ioredis', () => ({
  Redis: jest.fn(() => mockRedis),
}));

const emptyVerdicts = {
  competitors: [],
  excluded: [],
  usage: {},
  rawText: '{}',
};

const websiteContent = {
  url: 'example.com',
  title: 'Le Bambou Gorilla Lodge',
  description: 'Luxury gorilla lodge in Rwanda',
  products: [
    {
      name: 'Standard Room',
      price: 220,
      currency: 'USD',
      url: 'https://example.com/standard',
    },
  ],
  services: [],
  categories: [],
  keywords: [],
  mainContent: 'Located in Rwanda',
  metadata: {},
};

function build(valueserpCost?: string, timeoutMs?: string) {
  const website = {
    discoverWebsiteContent: jest.fn().mockResolvedValue(websiteContent),
  } as unknown as WebsiteDiscoveryService;
  const perplexity = {
    discoverCompetitors: jest
      .fn()
      .mockResolvedValue({ competitors: [], sources: [] }),
    researchCompetitor: jest.fn().mockResolvedValue({
      businessName: 'Rival',
      insights: 'insight',
      products: [],
      sources: [],
    }),
  } as unknown as PerplexityService;
  const openRouter = {
    strictCompetitorFilterViaOpenAi: jest.fn().mockResolvedValue(emptyVerdicts),
    strictCompetitorFilter: jest
      .fn()
      .mockRejectedValue(new Error('fallback down')),
    webSearchDiscoveryViaOpenAi: jest.fn().mockResolvedValue(emptyVerdicts),
    webSearchDiscovery: jest.fn().mockResolvedValue(emptyVerdicts),
  } as unknown as OpenRouterService;

  const config: Record<string, string> = {
    NODE_ENV: 'test',
    REDIS_URL: 'redis://localhost:6379',
    PERPLEXITY_API_KEY: 'test-key',
    VALUESERP_API_KEY: 'serp-key',
    DISCOVERY_ESCALATION_THRESHOLD: '1',
  };
  if (valueserpCost !== undefined) {
    config.VALUESERP_COST_PER_QUERY_USD = valueserpCost;
  }
  if (timeoutMs !== undefined) {
    config.VALUESERP_TIMEOUT_MS = timeoutMs;
  }

  return new CompetitorDiscoveryService(
    website,
    new ConfigService(config),
    perplexity,
    openRouter,
  );
}

const discover = (service: CompetitorDiscoveryService) =>
  service.discoverCompetitors(
    'example.com',
    'user-1',
    'hospitality',
    [],
    '',
    undefined,
  );

describe('CompetitorDiscoveryService ValueSERP cost ledger', () => {
  let logSpy: jest.SpyInstance;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  const costSummary = (): DiscoveryCostSummary => {
    const call = logSpy.mock.calls.find(
      ([message]) => message === '[TwoStage] API cost summary',
    );
    if (!call) {
      throw new Error('cost summary was not logged');
    }
    return call[1] as DiscoveryCostSummary;
  };

  it('bills each successful ValueSERP call at the configured flat rate', async () => {
    fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(
        async () =>
          new Response(JSON.stringify({ organic_results: [] }), {
            status: 200,
          }),
      );

    await discover(build('0.0025'));

    const calls = fetchSpy.mock.calls.length;
    expect(calls).toBeGreaterThan(0);
    const bucket = costSummary().buckets.valueserp;
    expect(bucket).toEqual({
      calls,
      estimatedUsd: Number((calls * 0.0025).toFixed(6)),
      unknownCostCalls: 0,
    });
  });

  it('reports ValueSERP calls as unknown cost, not zero, when no price is configured', async () => {
    fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(
        async () =>
          new Response(JSON.stringify({ organic_results: [] }), {
            status: 200,
          }),
      );

    const result = await discover(build(undefined));

    const calls = fetchSpy.mock.calls.length;
    const summary = costSummary();
    expect(summary.buckets.valueserp).toEqual({
      calls,
      estimatedUsd: 0,
      unknownCostCalls: calls,
    });
    expect(summary.costComplete).toBe(false);
    expect(result.quality.degraded).toBe(false);
  });

  it('counts a 401 as $0 known, disables ValueSERP for the run, and reports it', async () => {
    fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => new Response('bad key', { status: 401 }));

    const result = await discover(build('0.0025'));

    const calls = fetchSpy.mock.calls.length;
    expect(costSummary().buckets.valueserp).toEqual({
      calls,
      estimatedUsd: 0,
      unknownCostCalls: 0,
    });
    expect(result.quality.accountErrors).toEqual([
      { provider: 'valueserp', reason: 'unauthorized' },
    ]);
    expect(result.quality.reasons).toContain(
      'account_error:valueserp:unauthorized',
    );
  });

  it('counts a network failure before any response as $0 known', async () => {
    fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.reject(new TypeError('fetch failed')));

    const result = await discover(build('0.0025'));

    const calls = fetchSpy.mock.calls.length;
    expect(costSummary().buckets.valueserp).toEqual({
      calls,
      estimatedUsd: 0,
      unknownCostCalls: 0,
    });
    expect(result.quality.reasons).toContain('stage_failed:valueserp');
  });

  it('counts a call that times out mid-flight as unknown cost', async () => {
    jest.useFakeTimers();
    fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(init?.signal?.reason),
          );
        }),
    );

    const promise = discover(build('0.0025', '10000'));
    await jest.advanceTimersByTimeAsync(60_000);
    await promise;

    const calls = fetchSpy.mock.calls.length;
    expect(calls).toBeGreaterThan(0);
    const bucket = costSummary().buckets.valueserp;
    expect(bucket.calls).toBe(calls);
    expect(bucket.unknownCostCalls).toBe(calls);
    expect(bucket.estimatedUsd).toBe(0);
  });
});
