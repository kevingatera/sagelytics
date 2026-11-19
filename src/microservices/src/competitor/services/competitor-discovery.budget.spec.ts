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

const discover = (service: CompetitorDiscoveryService) =>
  service.discoverCompetitors(
    'example.com',
    'user-1',
    'hospitality',
    [],
    '',
    undefined,
  );

describe('CompetitorDiscoveryService budget cascade', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns a partial, degraded result inside the 55 s default budget when every stage hangs', async () => {
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

    await jest.advanceTimersByTimeAsync(55_000);

    expect(outcome.result).toBeDefined();
    expect(Date.now() - started).toBeLessThanOrEqual(55_000);
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
    // 12 s of candidate discovery leaves 18 s of a 30 s budget, under the 20 s escalation minimum.
    parts.perplexity.discoverCompetitors = jest.fn(() =>
      after(12_000, { competitors: [], sources: [] }),
    ) as never;

    const promise = discover(build(parts, { DISCOVERY_BUDGET_MS: '30000' }));
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
});
