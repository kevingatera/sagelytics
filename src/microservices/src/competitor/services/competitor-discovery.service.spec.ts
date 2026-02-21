import { ConfigService } from '@nestjs/config';
import { CompetitorDiscoveryService } from './competitor-discovery.service';
import { WebsiteDiscoveryService } from '../../website/services/website-discovery.service';
import { PerplexityService } from '../../llm-tools/perplexity.service';
import { OpenRouterService } from '../../llm-tools/openrouter.service';

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

  beforeEach(() => {
    jest.clearAllMocks();

    websiteDiscoveryMock.discoverWebsiteContent = jest
      .fn()
      .mockResolvedValue({
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
    openRouterMock.strictCompetitorFilterViaOpenAi = jest.fn().mockResolvedValue({
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

    const result = await service.discoverCompetitors(
      'example.com',
      'user-1',
      'hospitality',
      [],
      '',
      undefined,
    );

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

    const result = await service.discoverCompetitors(
      'example.com',
      'user-1',
      'hospitality',
      [],
      '',
      undefined,
    );

    expect(openRouterMock.webSearchDiscoveryViaOpenAi).toHaveBeenCalledTimes(1);
    expect(openRouterMock.strictCompetitorFilterViaOpenAi).toHaveBeenCalledTimes(2);
    expect(result.competitors.some((c) => c.domain === 'escalated-rival.com')).toBe(
      true,
    );
  });
});
