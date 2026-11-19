import { ConfigService } from '@nestjs/config';
import type { Env } from '../../env';
import { ModelManagerService } from '../../shared/services/model-manager.service';
import {
  createAnalysisBudget,
  createPaidRun,
  runWithPaidDeadline,
  type AnalysisBudget,
  type PaidCallClaim,
  type PaidRun,
} from '../../shared/services/paid-work-deadline';
import {
  IntelligentAgentService,
  MAX_FALLBACK_SEARCH_QUERIES,
  MAX_FALLBACK_SERP_REQUESTS,
  normalizeSearchQueries,
  planSearches,
  searchTypesFor,
} from './intelligent-agent.service';

function setup() {
  const fetchContent = jest.fn<
    Promise<string>,
    [url?: string, signal?: AbortSignal]
  >(() =>
    Promise.resolve(
      (
        'A product has a long name and a useful description. '.repeat(10) + '.'
      ).repeat(5),
    ),
  );
  const categorizeOffering = jest.fn(
    (_: string, _context: object, budget: AnalysisBudget) => {
      budget.claimModelCall();
      return Promise.resolve({
        name: 'Executive Suite',
        category: 'Accommodation',
        type: 'room',
        features: [],
        pricing: { value: 100, currency: 'USD', unit: 'night' },
        sourceUrl: '',
      });
    },
  );
  const detectBusinessType = jest.fn(
    (_: string, _domain: string, budget: AnalysisBudget) => {
      budget.claimModelCall();
      return Promise.resolve({
        businessType: 'hospitality',
        specificType: 'Lodge',
        extractionStrategy: { offeringNomenclature: 'rooms' },
      });
    },
  );
  const service = new IntelligentAgentService({} as ModelManagerService, {
    analysis: {
      detectBusinessType,
      categorizeOffering,
      extractPricesForBusinessType: () => [],
      extractFeatures: () => Promise.resolve([]),
    },
    navigation: {
      findRelevantPages: () =>
        Promise.resolve([
          'https://rival.test/suites',
          'https://rival.test/rooms',
        ]),
      checkRobotsRules: () => Promise.resolve(true),
    },
    web: {
      fetchContent,
      extractText: (content) => content,
      extractMetaTags: () => ({}),
      extractStructuredData: () => [],
    },
    search: { serpSearch: () => Promise.resolve([]) },
  });
  return { service, fetchContent, categorizeOffering, detectBusinessType };
}

describe('bounded competitor analysis', () => {
  afterEach(() => jest.useRealTimers());

  it('counts business detection and stops categorizing at the model-call limit', async () => {
    const { service, fetchContent, detectBusinessType, categorizeOffering } =
      setup();
    await service.analyzeCompetitor('rival.test');
    expect(detectBusinessType).toHaveBeenCalledTimes(1);
    expect(categorizeOffering).toHaveBeenCalledTimes(2);
    expect(fetchContent).toHaveBeenCalledTimes(2);
  });

  it('aborts an in-flight fetch at the TCP deadline and starts no model calls', async () => {
    jest.useFakeTimers();
    const { service, fetchContent, detectBusinessType } = setup();
    const aborted = jest.fn();
    fetchContent.mockImplementationOnce(
      (_url?: string, signal?: AbortSignal) =>
        new Promise((_resolve, reject) =>
          signal?.addEventListener(
            'abort',
            () => {
              aborted();
              reject(signal.reason as Error);
            },
            { once: true },
          ),
        ),
    );
    const pending = runWithPaidDeadline(Date.now() + 50, (deadline) =>
      service.analyzeCompetitor(
        'rival.test',
        undefined,
        undefined,
        createAnalysisBudget(deadline),
      ),
    );
    const rejected = expect(pending).rejects.toThrow(
      'Paid work deadline exceeded',
    );
    await jest.advanceTimersByTimeAsync(50);
    await rejected;
    expect(aborted).toHaveBeenCalledTimes(1);
    expect(detectBusinessType).not.toHaveBeenCalled();
  });
});

describe('agent discovery fallback under a run deadline', () => {
  function fallbackSetup(onFeatures: () => void) {
    const serpSearch = jest.fn(() =>
      Promise.resolve([{ url: 'https://rival.test' }]),
    );
    const invoke = jest.fn();
    const modelManager = {
      invokeQueued: jest.fn(
        (_prompt: string, _signal: AbortSignal, claim: () => void) => {
          claim();
          invoke();
          return Promise.resolve({ content: '["lodges near acme"]' });
        },
      ),
    } as unknown as ModelManagerService;
    const fetchContent = jest.fn<
      Promise<string>,
      [url: string, signal?: AbortSignal]
    >(() => Promise.resolve('<html>Acme lodge</html>'));
    const service = new IntelligentAgentService(modelManager, {
      analysis: {
        detectBusinessType: jest.fn(),
        categorizeOffering: jest.fn(),
        extractPricesForBusinessType: () => [],
        extractFeatures: (_text: string, featureRun?: PaidCallClaim) => {
          featureRun?.claimPaidCall();
          onFeatures();
          return Promise.resolve(['lodge']);
        },
      },
      navigation: {
        findRelevantPages: () => Promise.resolve([]),
        checkRobotsRules: () => Promise.resolve(true),
      },
      web: {
        fetchContent,
        extractText: (content) => content,
        extractMetaTags: () => ({}),
        extractStructuredData: () => [],
      },
      search: { serpSearch },
    });
    return { service, serpSearch, invoke, fetchContent };
  }

  it('passes the run signal to its fetches and counts each paid call', async () => {
    const controller = new AbortController();
    const run = createPaidRun({
      deadlineAt: Date.now() + 60_000,
      signal: controller.signal,
    });
    const { service, serpSearch, fetchContent } = fallbackSetup(
      () => undefined,
    );

    await service.discoverCompetitors('acme.test', 'hospitality', [], run);

    expect(fetchContent.mock.calls[0]?.[1]).toBe(controller.signal);
    // Feature extraction, query generation, then one search per query and search type.
    expect(run.paidCallsStarted).toBe(2 + serpSearch.mock.calls.length);
    for (const call of serpSearch.mock.calls as unknown[][]) {
      expect(call[2]).toBe(controller.signal);
    }
  });

  it('starts no model or search call after the deadline passes', async () => {
    const controller = new AbortController();
    const run = createPaidRun({
      deadlineAt: Date.now() + 60_000,
      signal: controller.signal,
    });
    const { service, serpSearch, invoke } = fallbackSetup(() =>
      controller.abort(),
    );

    await expect(
      service.discoverCompetitors('acme.test', 'hospitality', [], run),
    ).rejects.toThrow();

    expect(invoke).not.toHaveBeenCalled();
    expect(serpSearch).not.toHaveBeenCalled();
    expect(run.paidCallsStarted).toBe(1);
  });
});

describe('agent discovery fallback with the real model queue', () => {
  const realFetch = global.fetch;
  const QUEUE_MODELS = [
    'gemini-2.5-flash',
    'qwen/qwen3-32b',
    'gemini-2.0-flash',
    'deepseek-r1-distill-llama-70b',
    'llama3-8b-8192',
  ];

  afterEach(() => {
    global.fetch = realFetch;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('drops queued query generation when the deadline passes while it waits', async () => {
    jest.useFakeTimers();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const provider = jest.fn(() =>
      Promise.reject(new Error('provider must not be called')),
    );
    global.fetch = provider as unknown as typeof fetch;
    const manager = new ModelManagerService(
      new ConfigService({
        GEMINI_API_KEY: 'test-key',
        GROQ_API_KEY: 'test-key',
      }) as unknown as ConfigService<Env, true>,
    );
    const serpSearch = jest.fn(() => Promise.resolve([]));
    const service = new IntelligentAgentService(manager, {
      analysis: {
        detectBusinessType: jest.fn(),
        categorizeOffering: jest.fn(),
        extractPricesForBusinessType: () => [],
        extractFeatures: (_text: string, featureRun?: PaidCallClaim) => {
          featureRun?.claimPaidCall();
          return Promise.resolve(['lodge']);
        },
      },
      navigation: {
        findRelevantPages: () => Promise.resolve([]),
        checkRobotsRules: () => Promise.resolve(true),
      },
      web: {
        fetchContent: () => Promise.resolve('<html>Acme lodge</html>'),
        extractText: (content) => content,
        extractMetaTags: () => ({}),
        extractStructuredData: () => [],
      },
      search: { serpSearch },
    });
    // Other work holds every model queue for 5 s; the run's deadline is 1 s away.
    const blockers = QUEUE_MODELS.map((model) =>
      manager.withBatchProcessing(
        () => new Promise((resolve) => setTimeout(resolve, 5_000)),
        'blocker',
        model,
      ),
    );
    let run: PaidRun | undefined;
    const pending = runWithPaidDeadline(Date.now() + 1_000, (deadline) => {
      run = createPaidRun(deadline);
      return service.discoverCompetitors('acme.test', 'hospitality', [], run);
    });
    const rejected = expect(pending).rejects.toThrow(
      'Paid work deadline exceeded',
    );

    await jest.advanceTimersByTimeAsync(1_000);
    await rejected;
    await jest.advanceTimersByTimeAsync(10_000);
    await Promise.all(blockers);
    manager.onModuleDestroy();

    expect(provider).not.toHaveBeenCalled();
    expect(serpSearch).not.toHaveBeenCalled();
    // Only feature extraction was dispatched; the dropped query generation is not counted.
    expect(run?.paidCallsStarted).toBe(1);
  });
});

describe('agent discovery fallback search fan-out', () => {
  it('trims, dedupes and caps model queries, and caps ValueSERP requests', async () => {
    const returned = [
      ...Array.from({ length: 16 }, (_, i) => `lodge query ${i % 8}`),
      '  Lodge Query 0 ',
      'LODGE QUERY 1',
      '   ',
      'lodge   query 2',
    ];
    expect(returned).toHaveLength(20);
    const modelManager = {
      invokeQueued: jest.fn(
        (_prompt: string, _signal: AbortSignal, claim: () => void) => {
          claim();
          return Promise.resolve({ content: JSON.stringify(returned) });
        },
      ),
    } as unknown as ModelManagerService;
    const serpSearch = jest.fn(() => Promise.resolve([]));
    const service = new IntelligentAgentService(modelManager, {
      analysis: {
        detectBusinessType: jest.fn(),
        categorizeOffering: jest.fn(),
        extractPricesForBusinessType: () => [],
        extractFeatures: (_text: string, featureRun?: PaidCallClaim) => {
          featureRun?.claimPaidCall();
          return Promise.resolve([]);
        },
      },
      navigation: {
        findRelevantPages: () => Promise.resolve([]),
        checkRobotsRules: () => Promise.resolve(true),
      },
      web: {
        fetchContent: () => Promise.resolve('<html>Acme lodge</html>'),
        extractText: (content) => content,
        extractMetaTags: () => ({}),
        extractStructuredData: () => [],
      },
      search: { serpSearch },
    });
    const run = createPaidRun({
      deadlineAt: Date.now() + 60_000,
      signal: new AbortController().signal,
    });

    await service.discoverCompetitors('acme.test', 'hospitality', [], run);

    const calls = serpSearch.mock.calls as unknown as [string, string][];
    expect(calls).toHaveLength(MAX_FALLBACK_SERP_REQUESTS);
    const queries = [...new Set(calls.map(([query]) => query))];
    expect(queries).toEqual([
      'lodge query 0',
      'lodge query 1',
      'lodge query 2',
      'lodge query 3',
    ]);
    expect(queries.length).toBeLessThanOrEqual(MAX_FALLBACK_SEARCH_QUERIES);
    // A lodge gets a map search, and no shopping searches.
    expect(calls.some(([, type]) => type === 'maps')).toBe(true);
    expect(calls.some(([, type]) => type === 'shopping')).toBe(false);
    // Feature extraction, query generation and the capped searches.
    expect(run.paidCallsStarted).toBe(2 + MAX_FALLBACK_SERP_REQUESTS);
  });

  it('planSearches gives every search type a request before filling the cap', () => {
    const plan = planSearches(
      ['a', 'b', 'c', 'd'],
      ['shopping', 'organic', 'maps'],
    );
    expect(plan).toHaveLength(MAX_FALLBACK_SERP_REQUESTS);
    expect(plan.slice(0, 3)).toEqual([
      { query: 'a', type: 'shopping' },
      { query: 'a', type: 'organic' },
      { query: 'a', type: 'maps' },
    ]);
    expect(plan.slice(3).map(({ query }) => query)).toEqual(['b', 'c', 'd']);
    expect(planSearches([], ['organic'])).toEqual([]);
  });

  it('searchTypesFor leads with a map search for location-based businesses', () => {
    expect(searchTypesFor('hospitality')).toEqual(['maps', 'organic']);
    expect(searchTypesFor('tour_operator')).toEqual(['maps', 'organic']);
    expect(searchTypesFor('retail')).toEqual(['maps', 'shopping', 'organic']);
    expect(searchTypesFor('local services')).toEqual(['local', 'organic']);
    expect(searchTypesFor('ecommerce')).toEqual(['shopping', 'organic', 'maps']);
  });

  it('normalizeSearchQueries drops blanks and case-insensitive duplicates', () => {
    expect(
      normalizeSearchQueries([' A b ', 'a  B', '', 'c', 'C', 'd', 'e', 'f']),
    ).toEqual(['A b', 'c', 'd', 'e']);
  });
});
