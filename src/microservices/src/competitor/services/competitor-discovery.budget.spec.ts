import { ConfigService } from '@nestjs/config';
import {
  CompetitorDiscoveryService,
  type DiscoveryResultWithQuality,
} from './competitor-discovery.service';
import { WebsiteDiscoveryService } from '../../website/services/website-discovery.service';
import { PerplexityService } from '../../llm-tools/perplexity.service';
import { OpenRouterService } from '../../llm-tools/openrouter.service';

// Budget cascade under virtual time: every stage gets a slice of DISCOVERY_BUDGET_MS, and a stage
// that runs out returns partial, degraded results instead of hanging or throwing.
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

const never = () => new Promise<never>(() => undefined);
const after = <T>(ms: number, value: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

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

const emptyVerdicts = {
  competitors: [],
  excluded: [],
  usage: {},
  rawText: '{}',
};

function providers() {
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
  return { website, perplexity, openRouter };
}

const configFor = (extra: Record<string, string> = {}) =>
  new ConfigService({
    NODE_ENV: 'test',
    REDIS_URL: 'redis://localhost:6379',
    PERPLEXITY_API_KEY: 'test-key',
    DISCOVERY_ESCALATION_THRESHOLD: '2',
    ...extra,
  });

const build = (
  parts: ReturnType<typeof providers>,
  extra?: Record<string, string>,
) =>
  new CompetitorDiscoveryService(
    parts.website,
    configFor(extra),
    parts.perplexity,
    parts.openRouter,
  );

const discover = (
  service: CompetitorDiscoveryService,
  knownCompetitors: string[] = [],
) =>
  service.discoverCompetitors(
    'example.com',
    'user-1',
    'hospitality',
    knownCompetitors,
    '',
    undefined,
  );

// Records when the OpenAI strict filter was called and the timeout it was given.
function captureFilter(parts: ReturnType<typeof providers>, started: number) {
  const seen: { atMs?: number; timeoutMs?: number } = {};
  parts.openRouter.strictCompetitorFilterViaOpenAi = jest.fn(
    (request: { timeoutMs: number }) => {
      seen.atMs = Date.now() - started;
      seen.timeoutMs = request.timeoutMs;
      return Promise.resolve(emptyVerdicts);
    },
  ) as never;
  return seen;
}

// A fetch that never answers but rejects when its signal aborts, as the real fetch does.
const hangingFetch = (dispatched: number[], started: number) =>
  jest.spyOn(globalThis, 'fetch').mockImplementation(
    (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        dispatched.push(Date.now() - started);
        init?.signal?.addEventListener('abort', () =>
          reject(init?.signal?.reason as Error),
        );
      }),
  );

describe('CompetitorDiscoveryService budget cascade', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('returns a partial, degraded result inside the 65 s default budget when every stage hangs', async () => {
    const parts = providers();
    parts.website.discoverWebsiteContent = jest.fn(() => never()) as never;
    parts.perplexity.discoverCompetitors = jest.fn(() => never()) as never;
    parts.openRouter.webSearchDiscoveryViaOpenAi = jest.fn(() =>
      never(),
    ) as never;
    parts.openRouter.webSearchDiscovery = jest.fn(() => never()) as never;

    const outcome: { result?: DiscoveryResultWithQuality } = {};
    const started = Date.now();
    const promise = discover(build(parts)).then((value) => {
      outcome.result = value;
      return value;
    });

    await jest.advanceTimersByTimeAsync(65_000);

    expect(outcome.result).toBeDefined();
    expect(Date.now() - started).toBeLessThanOrEqual(65_000);
    expect(outcome.result).toMatchObject({
      competitors: [],
      quality: { partial: true, degraded: true, confidence: 'low' },
    });
    expect(outcome.result?.quality.reasons).toEqual(
      expect.arrayContaining([
        'budget_exhausted:website_discovery',
        'budget_exhausted:perplexity_discovery',
        'budget_exhausted:escalation',
      ]),
    );
    await promise;
  });

  it('skips escalation when the budget left cannot fit its slice and the enrichment reserve', async () => {
    const parts = providers();
    // 9 s of candidate discovery and a 2 s filter leave 19 s of a 30 s budget, under the 20 s
    // escalation minimum.
    parts.perplexity.discoverCompetitors = jest.fn(() =>
      after(9_000, { competitors: [], sources: [] }),
    ) as never;
    parts.openRouter.strictCompetitorFilterViaOpenAi = jest.fn(() =>
      after(2_000, emptyVerdicts),
    ) as never;

    const promise = discover(build(parts, { DISCOVERY_BUDGET_MS: '30000' }), [
      'rival-lodge.com',
    ]);
    await jest.advanceTimersByTimeAsync(40_000);
    const result = await promise;

    expect(parts.openRouter.webSearchDiscoveryViaOpenAi).not.toHaveBeenCalled();
    expect(parts.openRouter.webSearchDiscovery).not.toHaveBeenCalled();
    expect(result.quality.partial).toBe(true);
    expect(result.quality.reasons).toContain('budget_exhausted:escalation');
  });

  it('runs escalation when the remaining budget fits it', async () => {
    const parts = providers();
    parts.perplexity.discoverCompetitors = jest.fn(() =>
      after(12_000, { competitors: [], sources: [] }),
    ) as never;

    const promise = discover(build(parts));
    await jest.advanceTimersByTimeAsync(60_000);
    const result = await promise;

    expect(parts.openRouter.webSearchDiscoveryViaOpenAi).toHaveBeenCalledTimes(
      1,
    );
    expect(result.quality.reasons).not.toContain('budget_exhausted:escalation');
  });

  it('gives the strict filter its full 17 s slice after the website and candidate stages time out', async () => {
    const parts = providers();
    parts.website.discoverWebsiteContent = jest.fn(() => never()) as never;
    parts.perplexity.discoverCompetitors = jest.fn(() => never()) as never;
    const started = Date.now();
    const filter = captureFilter(parts, started);

    const promise = discover(build(parts), ['rival-lodge.com']);
    await jest.advanceTimersByTimeAsync(65_000);
    const result = await promise;

    // Website 18 s, then candidates 10 s.
    expect(filter.atMs).toBe(28_000);
    expect(filter.timeoutMs).toBeGreaterThan(16_000);
    expect(filter.timeoutMs).toBeLessThanOrEqual(17_000);
    expect(result.quality.reasons).not.toContain('strict_filter_unavailable');
  });

  it('caps each ValueSERP request at 8 s, so the strict filter starts before the 10 s candidate slice ends', async () => {
    const parts = providers();
    const started = Date.now();
    const dispatched: number[] = [];
    hangingFetch(dispatched, started);
    const filter = captureFilter(parts, started);

    const promise = discover(build(parts, { VALUESERP_API_KEY: 'serp-key' }), [
      'rival-lodge.com',
    ]);
    await jest.advanceTimersByTimeAsync(65_000);
    const result = await promise;

    expect(dispatched.length).toBeGreaterThan(0);
    expect(dispatched.every((at) => at === 0)).toBe(true);
    expect(filter.atMs).toBe(8_000);
    expect(filter.timeoutMs).toBe(17_000);
    expect(result.quality.reasons).toContain('budget_exhausted:valueserp');
  });

  it('reads stage slices and the ValueSERP cap from the environment', async () => {
    const parts = providers();
    parts.website.discoverWebsiteContent = jest.fn(() => never()) as never;
    const started = Date.now();
    const dispatched: number[] = [];
    hangingFetch(dispatched, started);
    const filter = captureFilter(parts, started);

    const promise = discover(
      build(parts, {
        VALUESERP_API_KEY: 'serp-key',
        VALUESERP_TIMEOUT_MS: '20000',
        DISCOVERY_WEBSITE_STAGE_MS: '6000',
        DISCOVERY_CANDIDATE_STAGE_MS: '7000',
        DISCOVERY_STRICT_STAGE_MS: '12000',
      }),
      ['rival-lodge.com'],
    );
    await jest.advanceTimersByTimeAsync(65_000);
    await promise;

    // The 20 s ValueSERP cap is cut to the 7 s candidate slice.
    expect(filter.atMs).toBe(13_000);
    expect(filter.timeoutMs).toBe(12_000);
  });

  it('finishes inside the default budget when the filter, escalation and research all hang', async () => {
    const parts = providers();
    parts.website.discoverWebsiteContent = jest.fn(() => never()) as never;
    parts.perplexity.discoverCompetitors = jest.fn(() => never()) as never;
    parts.perplexity.researchCompetitor = jest.fn(() => never()) as never;
    parts.openRouter.strictCompetitorFilterViaOpenAi = jest.fn(() =>
      never(),
    ) as never;
    parts.openRouter.webSearchDiscoveryViaOpenAi = jest.fn(() =>
      never(),
    ) as never;
    parts.openRouter.webSearchDiscovery = jest.fn(() => never()) as never;

    const outcome: { result?: DiscoveryResultWithQuality; atMs?: number } = {};
    const started = Date.now();
    const promise = discover(build(parts), ['rival-lodge.com']).then(
      (value) => {
        outcome.result = value;
        outcome.atMs = Date.now() - started;
        return value;
      },
    );
    await jest.advanceTimersByTimeAsync(70_000);
    await promise;

    expect(outcome.atMs).toBeLessThanOrEqual(65_000);
    expect(outcome.result?.quality.reasons).toEqual(
      expect.arrayContaining([
        'strict_filter_unavailable',
        'budget_exhausted:strict_filter',
      ]),
    );
  });
});
