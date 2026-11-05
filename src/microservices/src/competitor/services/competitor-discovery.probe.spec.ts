import { ConfigService } from '@nestjs/config';
import { CompetitorDiscoveryService } from './competitor-discovery.service';
import { WebsiteDiscoveryService } from '../../website/services/website-discovery.service';
import { PerplexityService } from '../../llm-tools/perplexity.service';
import { OpenRouterService } from '../../llm-tools/openrouter.service';

// Network-free probe for review findings 1 (no dispatch after a deadline), 4 (end-to-end
// budget and OpenAI-primary timeouts) and 6 (concurrent identical requests coalesce).
// Every provider is a mock and time is virtual, so wall time and dispatch counts are exact.

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

const report = (probe: string, data: Record<string, unknown>) =>
  process.stdout.write(`PROBE ${probe} ${JSON.stringify(data)}\n`);

const websiteContent = {
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
};

const perplexityCandidates = {
  competitors: [
    { name: 'Perplexity Rival', domain: 'perplexity-rival.com', description: 'local lodge' },
  ],
  sources: [],
};

const researchResult = {
  businessName: 'Rival',
  insights: 'insight',
  products: [{ name: 'Standard Room', price: 200, currency: 'USD' }],
  sources: [],
};

const filterResult = (domains: string[]) => ({
  competitors: domains.map((domain) => ({ domain, reason: 'local lodge' })),
  excluded: [],
  usage: {},
  rawText: '{}',
});

const never = () => new Promise<never>(() => undefined);

function buildProviders() {
  const website = {
    discoverWebsiteContent: jest.fn().mockResolvedValue(websiteContent),
  } as unknown as WebsiteDiscoveryService;
  const perplexity = {
    discoverCompetitors: jest.fn().mockResolvedValue(perplexityCandidates),
    researchCompetitor: jest.fn().mockResolvedValue(researchResult),
  } as unknown as PerplexityService;
  const openRouter = {
    strictCompetitorFilterViaOpenAi: jest
      .fn()
      .mockResolvedValue(filterResult(['perplexity-rival.com'])),
    strictCompetitorFilter: jest.fn().mockResolvedValue(filterResult([])),
    webSearchDiscoveryViaOpenAi: jest
      .fn()
      .mockResolvedValue({ competitors: [], usage: {}, rawText: '{}' }),
    webSearchDiscovery: jest
      .fn()
      .mockResolvedValue({ competitors: [], usage: {}, rawText: '{}' }),
  } as unknown as OpenRouterService;
  return { website, perplexity, openRouter };
}

// Advances virtual time in small steps until the promise settles, then flushes
// background work that a discarded stage may still be running.
async function drive<T>(
  promise: Promise<T>,
  startedAt: number,
  tailMs = 0,
): Promise<{ settled: 'ok' | 'error'; value?: T; wallMs: number }> {
  const state: {
    done: boolean;
    settled?: 'ok' | 'error';
    value?: T;
    finishedAt?: number;
  } = { done: false };
  promise.then(
    (value) => {
      Object.assign(state, { done: true, settled: 'ok', value, finishedAt: Date.now() });
    },
    () => {
      Object.assign(state, { done: true, settled: 'error', finishedAt: Date.now() });
    },
  );
  for (let elapsed = 0; !state.done && elapsed < 900_000; elapsed += 250) {
    await jest.advanceTimersByTimeAsync(250);
  }
  if (!state.done) {
    throw new Error('probe did not settle within 900s of virtual time');
  }
  for (let elapsed = 0; elapsed < tailMs; elapsed += 1000) {
    await jest.advanceTimersByTimeAsync(1000);
  }
  return {
    settled: state.settled as 'ok' | 'error',
    value: state.value,
    wallMs: (state.finishedAt ?? Date.now()) - startedAt,
  };
}

describe('competitor discovery probe', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it('finding 1: no ValueSERP request is dispatched after its stage deadline', async () => {
    const { website, perplexity, openRouter } = buildProviders();
    // Every SERP request takes 40s and fails. The stage deadline is 30s.
    const fetchStartTimes: number[] = [];
    const start = Date.now();
    global.fetch = jest.fn(
      () =>
        new Promise((resolve) => {
          fetchStartTimes.push(Date.now() - start);
          setTimeout(
            () =>
              resolve({
                ok: false,
                status: 500,
                text: async () => 'slow upstream',
                json: async () => ({}),
              } as unknown as Response),
            40_000,
          );
        }),
    ) as unknown as typeof fetch;

    const service = new CompetitorDiscoveryService(
      website,
      new ConfigService({
        NODE_ENV: 'test',
        REDIS_URL: 'redis://localhost:6379',
        PERPLEXITY_API_KEY: 'test-key',
        VALUESERP_API_KEY: 'valueserp-key',
        VALUESERP_TIMEOUT_MS: '30000',
        DISCOVERY_ESCALATION_THRESHOLD: '1',
      }),
      perplexity,
      openRouter,
    );

    const outcome = await drive(
      service.discoverCompetitors('example.com', 'user-1', 'hospitality', [], '', undefined),
      start,
      300_000,
    );

    const dispatchedAfterDeadline = fetchStartTimes.filter((t) => t > 30_000);
    report('finding1', {
      valueserpDispatched: fetchStartTimes.length,
      dispatchedAfterDeadline: dispatchedAfterDeadline.length,
      dispatchTimesMs: fetchStartTimes,
      discoveryWallMs: outcome.wallMs,
    });
    expect(dispatchedAfterDeadline).toEqual([]);
  });

  it('finding 4: end-to-end budget holds and OpenAI calls use OPENAI_PRIMARY timeouts', async () => {
    const { website, perplexity, openRouter } = buildProviders();
    // Every LLM and research call hangs and ignores its signal.
    openRouter.strictCompetitorFilterViaOpenAi = jest.fn(() => never()) as never;
    openRouter.strictCompetitorFilter = jest.fn(() => never()) as never;
    openRouter.webSearchDiscoveryViaOpenAi = jest.fn(() => never()) as never;
    openRouter.webSearchDiscovery = jest.fn(() => never()) as never;
    perplexity.researchCompetitor = jest.fn(() => never()) as never;

    const service = new CompetitorDiscoveryService(
      website,
      new ConfigService({
        NODE_ENV: 'test',
        REDIS_URL: 'redis://localhost:6379',
        PERPLEXITY_API_KEY: 'test-key',
        DISCOVERY_ESCALATION_THRESHOLD: '2',
        DISCOVERY_BUDGET_MS: '120000',
        OPENAI_PRIMARY_FILTER_TIMEOUT_MS: '20000',
        OPENROUTER_FILTER_TIMEOUT_MS: '45000',
        OPENROUTER_ESCALATION_TIMEOUT_MS: '180000',
        PERPLEXITY_TIMEOUT_MS: '30000',
        COMPETITOR_RESEARCH_TIMEOUT_MS: '30000',
      }),
      perplexity,
      openRouter,
    );

    const start = Date.now();
    const outcome = await drive(
      service.discoverCompetitors('example.com', 'user-1', 'hospitality', [], '', undefined),
      start,
    );

    const openAiTimeoutArg = (
      openRouter.strictCompetitorFilterViaOpenAi as unknown as jest.Mock
    ).mock.calls[0]?.[0]?.timeoutMs;
    report('finding4', {
      settled: outcome.settled,
      wallMs: outcome.wallMs,
      budgetMs: 120000,
      openAiFilterTimeoutArg: openAiTimeoutArg,
    });
    expect(openAiTimeoutArg).toBe(20000);
    expect(outcome.wallMs).toBeLessThanOrEqual(120_000);
  });

  it('finding 6: two concurrent identical discoveries make one paid discovery call', async () => {
    const { website, perplexity, openRouter } = buildProviders();
    // Slow Perplexity so both calls overlap. Cache is disabled under NODE_ENV=test.
    perplexity.discoverCompetitors = jest.fn(
      () =>
        new Promise((resolve) => setTimeout(() => resolve(perplexityCandidates), 1000)),
    ) as never;

    const service = new CompetitorDiscoveryService(
      website,
      new ConfigService({
        NODE_ENV: 'test',
        REDIS_URL: 'redis://localhost:6379',
        PERPLEXITY_API_KEY: 'test-key',
        DISCOVERY_ESCALATION_THRESHOLD: '1',
      }),
      perplexity,
      openRouter,
    );

    const start = Date.now();
    const both = Promise.all([
      service.discoverCompetitors('example.com', 'user-1', 'hospitality', [], '', undefined),
      service.discoverCompetitors('example.com', 'user-1', 'hospitality', [], '', undefined),
    ]);
    const outcome = await drive(both, start);

    const perplexityCalls = (perplexity.discoverCompetitors as unknown as jest.Mock).mock
      .calls.length;
    const filterCalls = (
      openRouter.strictCompetitorFilterViaOpenAi as unknown as jest.Mock
    ).mock.calls.length;
    report('finding6', {
      settled: outcome.settled,
      perplexityDiscoverCalls: perplexityCalls,
      strictFilterCalls: filterCalls,
    });
    expect(perplexityCalls).toBe(1);
    expect(filterCalls).toBe(1);
  });
});
