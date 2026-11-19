import type { ModelManagerService } from '../../shared/services/model-manager.service';
import {
  createAnalysisBudget,
  runWithPaidDeadline,
  type AnalysisBudget,
} from '../../shared/services/paid-work-deadline';
import { IntelligentAgentService } from './intelligent-agent.service';

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
