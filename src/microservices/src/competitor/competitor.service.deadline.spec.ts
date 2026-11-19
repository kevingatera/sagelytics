import { ConfigService } from '@nestjs/config';
import { CompetitorService } from './competitor.service';
import { IntelligentAgentService } from './services/intelligent-agent.service';
import { WebsiteDiscoveryService } from '../website/services/website-discovery.service';
import { PerplexityService } from '../llm-tools/perplexity.service';
import { ModelManagerService } from '@shared/services/model-manager.service';
import {
  createPaidRun,
  type PaidRun,
} from '../shared/services/paid-work-deadline';

// The legacy pipeline under a caller deadline. Redis is an in-memory map, Perplexity is the real
// client over a mocked fetch, and the other providers are mocks, so no network is used.
const mockRedisStore = new Map<string, string>();
jest.mock('ioredis', () => ({
  Redis: jest.fn(() => ({
    on: jest.fn(),
    get: jest.fn((key: string) =>
      Promise.resolve(mockRedisStore.get(key) ?? null),
    ),
    setex: jest.fn((key: string, _ttl: number, value: string) => {
      mockRedisStore.set(key, value);
      return Promise.resolve('OK');
    }),
    publish: jest.fn(() => Promise.resolve(1)),
    disconnect: jest.fn(),
  })),
}));

const DOMAIN = 'acme.example';
const config = new ConfigService({
  NODE_ENV: 'development',
  REDIS_URL: 'redis://localhost:6379',
  PERPLEXITY_API_KEY: 'test-key',
});

const emptySite = (url: string) => ({
  url,
  title: 'Acme',
  description: 'Lodge',
  products: [],
  services: [],
  categories: [],
  keywords: [],
  mainContent: '',
  metadata: {},
});

function build(onWebsiteCall: () => void = () => undefined) {
  const website = {
    discoverWebsiteContent: jest.fn((url: string) => {
      onWebsiteCall();
      return Promise.resolve(emptySite(url));
    }),
  };
  const agent = {
    discoverCompetitors: jest.fn().mockResolvedValue([]),
    analyzeCompetitor: jest.fn().mockResolvedValue(null),
  };
  const service = new CompetitorService(
    agent as unknown as IntelligentAgentService,
    website as unknown as WebsiteDiscoveryService,
    new PerplexityService(config),
    config,
    {} as ModelManagerService,
  );
  return { service, website, agent };
}

const discover = (
  service: CompetitorService,
  run: PaidRun,
  known: string[] = [],
) =>
  service
    .discoverCompetitors(
      DOMAIN,
      'user-alice',
      'hospitality',
      known,
      '',
      undefined,
      run,
    )
    .catch((error: unknown) => error);

describe('legacy discovery under a caller deadline', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    mockRedisStore.clear();
    fetchMock = jest
      .fn()
      .mockRejectedValue(new Error('network disabled in tests'));
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('passes the deadline and abort signal to website discovery and Perplexity', async () => {
    const controller = new AbortController();
    const deadlineAt = Date.now() + 60_000;
    const run = createPaidRun({ deadlineAt, signal: controller.signal });
    const { service, website } = build();

    await discover(service, run);

    expect(website.discoverWebsiteContent).toHaveBeenCalledWith(DOMAIN, {
      signal: controller.signal,
      llmDeadlineAt: deadlineAt,
    });
    expect(fetchMock).toHaveBeenCalled();
    for (const [, init] of fetchMock.mock.calls as [string, RequestInit][]) {
      expect(init.signal).toBeInstanceOf(AbortSignal);
      controller.abort();
      expect(init.signal?.aborted).toBe(true);
    }
    // Website discovery plus every Perplexity request that was dispatched.
    expect(run.paidCallsStarted).toBe(1 + fetchMock.mock.calls.length);
  });

  it('starts no paid provider call once the deadline has passed', async () => {
    const controller = new AbortController();
    const run = createPaidRun({
      deadlineAt: Date.now() + 60_000,
      signal: controller.signal,
    });
    // The deadline passes while the homepage is being read.
    const { service, website, agent } = build(() => controller.abort());

    await discover(service, run, ['rival.example']);

    expect(website.discoverWebsiteContent).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(agent.discoverCompetitors).not.toHaveBeenCalled();
    expect(agent.analyzeCompetitor).not.toHaveBeenCalled();
    expect(run.paidCallsStarted).toBe(1);
  });

  it('does not cache a result cut short by the deadline', async () => {
    const controller = new AbortController();
    const run = createPaidRun({
      deadlineAt: Date.now() + 60_000,
      signal: controller.signal,
    });
    const { service } = build(() => controller.abort());

    await discover(service, run);

    expect(
      [...mockRedisStore.keys()].some((key) =>
        key.startsWith('competitor:discovery:'),
      ),
    ).toBe(false);
  });
});

describe('match enhancement through the model queue', () => {
  const originalFetch = global.fetch;
  const pairs = [
    {
      userProductName: 'Garden Suite',
      competitorProductName: 'Garden View Suite',
      currentScore: 20,
    },
  ];

  function buildWithQueue() {
    const manager = new ModelManagerService(
      new ConfigService({
        GEMINI_API_KEY: 'test-key',
        GROQ_API_KEY: 'test-key',
      }),
    );
    const service = new CompetitorService(
      {} as IntelligentAgentService,
      {} as WebsiteDiscoveryService,
      new PerplexityService(config),
      config,
      manager,
    );
    // Other work holds the enhancement model's queue for 5 s.
    const blocker = manager.withBatchProcessing(
      () => new Promise((resolve) => setTimeout(resolve, 5_000)),
      'blocker',
      'gemini-2.5-flash',
    );
    return { manager, service, blocker };
  }

  let provider: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    provider = jest.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  role: 'model',
                  parts: [
                    {
                      text: JSON.stringify([
                        {
                          userProductName: 'Garden Suite',
                          competitorProductName: 'Garden View Suite',
                          score: 90,
                        },
                      ]),
                    },
                  ],
                },
                finishReason: 'STOP',
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );
    global.fetch = provider as unknown as typeof fetch;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('drops a queued enhancement whose deadline passes while it waits', async () => {
    const { manager, service, blocker } = buildWithQueue();
    const controller = new AbortController();
    const run = createPaidRun({
      deadlineAt: Date.now() + 1_000,
      signal: controller.signal,
    });
    setTimeout(() => controller.abort(new Error('deadline')), 1_000);

    const enhanced = service.batchEnhanceProductMatches(pairs, run);
    await jest.advanceTimersByTimeAsync(10_000);
    await blocker;
    manager.onModuleDestroy();

    // The heuristic score is kept and nothing was sent or counted.
    await expect(enhanced).resolves.toEqual([
      expect.objectContaining({ enhancedScore: 20 }),
    ]);
    expect(provider).not.toHaveBeenCalled();
    expect(run.paidCallsStarted).toBe(0);
  });

  it('counts an enhancement only when the queue dispatches it', async () => {
    const { manager, service, blocker } = buildWithQueue();
    const run = createPaidRun({
      deadlineAt: Date.now() + 60_000,
      signal: new AbortController().signal,
    });

    const enhanced = service.batchEnhanceProductMatches(pairs, run);
    await jest.advanceTimersByTimeAsync(1_000);
    expect(run.paidCallsStarted).toBe(0);
    await jest.advanceTimersByTimeAsync(9_000);
    await blocker;
    manager.onModuleDestroy();

    await expect(enhanced).resolves.toEqual([
      expect.objectContaining({ enhancedScore: 90 }),
    ]);
    expect(provider).toHaveBeenCalledTimes(1);
    expect(run.paidCallsStarted).toBe(1);
  });
});
