import { CostLedger } from './discovery-cost-ledger';

// Finding 7: unknown cost is never recorded as zero, and every dispatched request counts.
describe('CostLedger', () => {
  it('reports an unpriced ValueSERP request as unknown, not zero', () => {
    const ledger = new CostLedger({ valueserp: null });
    ledger.record({ provider: 'valueserp', operation: 'search' });
    ledger.record({ provider: 'valueserp', operation: 'search' });

    const summary = ledger.summary();
    expect(summary.valueserpRequestCount).toBe(2);
    expect(summary.buckets.valueserp).toEqual({
      calls: 2,
      estimatedUsd: 0,
      unknownCostCalls: 2,
    });
    expect(summary.costComplete).toBe(false);
  });

  it('prices flat-rate requests from configuration at dispatch', () => {
    const ledger = new CostLedger({ valueserp: 0.003, perplexity_research: 0.01 });
    ledger.record({ provider: 'valueserp', operation: 'search' });
    ledger.record({ provider: 'perplexity', operation: 'research' });

    const summary = ledger.summary();
    expect(summary.totalEstimatedCostUsd).toBe(0.013);
    expect(summary.perplexityResearchCalls).toBe(1);
    expect(summary.costComplete).toBe(true);
  });

  it('keeps provider-priced requests without usage separate from a known zero', () => {
    const ledger = new CostLedger({});
    ledger.record({ provider: 'openai', operation: 'filter', costUsd: 0 });
    ledger.record({ provider: 'openai', operation: 'filter', costUsd: null });

    const summary = ledger.summary();
    expect(summary.buckets.openai_filter).toEqual({
      calls: 2,
      estimatedUsd: 0,
      unknownCostCalls: 1,
    });
    expect(summary.unknownCostCalls).toBe(1);
    expect(summary.costComplete).toBe(false);
  });

  it('separates nested research, discovery and fallback attempts', () => {
    const ledger = new CostLedger({
      perplexity_discovery: 0.01,
      perplexity_research: 0.01,
    });
    ledger.record({ provider: 'perplexity', operation: 'research', model: 'sonar' });
    ledger.record({ provider: 'perplexity', operation: 'discover', model: 'sonar' });
    ledger.record({ provider: 'perplexity', operation: 'discover', model: 'sonar-pro' });

    const summary = ledger.summary();
    expect(summary.buckets.perplexity_research.calls).toBe(1);
    expect(summary.buckets.perplexity_discovery.calls).toBe(2);
    expect(summary.totalEstimatedCostUsd).toBe(0.03);
  });
});
