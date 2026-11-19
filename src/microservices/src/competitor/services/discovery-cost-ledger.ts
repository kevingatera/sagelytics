import type {
  ProviderUsageEvent,
  ProviderUsageSink,
} from '../../llm-tools/provider-usage';

export const COST_BUCKETS = [
  'valueserp',
  'perplexity_discovery',
  'perplexity_research',
  'perplexity_other',
  'openai_filter',
  'openai_escalation',
  'openrouter_filter',
  'openrouter_escalation',
  'other',
] as const;

export type CostBucket = (typeof COST_BUCKETS)[number];

/** Flat per-request rates. `null` means the rate is not configured, so the cost is unknown. */
export type FlatRateCosts = Partial<
  Record<'valueserp' | 'perplexity_discovery' | 'perplexity_research', number | null>
>;

type BucketTotals = { requests: number; knownUsd: number; unknownRequests: number };

export type DiscoveryCostSummary = {
  perplexityResearchCalls: number;
  valueserpRequestCount: number;
  buckets: Record<CostBucket, { calls: number; estimatedUsd: number; unknownCostCalls: number }>;
  totalEstimatedCostUsd: number;
  unknownCostCalls: number;
  /** False when at least one dispatched request has no known cost. Zero is then a lower bound. */
  costComplete: boolean;
};

export function bucketFor(event: ProviderUsageEvent): CostBucket {
  if (event.provider === 'valueserp') {
    return 'valueserp';
  }
  if (event.provider === 'perplexity') {
    if (event.operation === 'discover') {
      return 'perplexity_discovery';
    }
    if (event.operation === 'research') {
      return 'perplexity_research';
    }
    return 'perplexity_other';
  }
  if (event.provider === 'openai') {
    if (event.operation === 'filter') {
      return 'openai_filter';
    }
    if (event.operation === 'escalation') {
      return 'openai_escalation';
    }
  }
  if (event.provider === 'openrouter') {
    if (event.operation === 'filter') {
      return 'openrouter_filter';
    }
    if (event.operation === 'escalation') {
      return 'openrouter_escalation';
    }
  }
  return 'other';
}

const round = (value: number): number => Number(value.toFixed(6));

/**
 * Accumulates spend for one discovery run. Requests are recorded when dispatched, so discarded or
 * failed work still counts. A request whose cost is unknown is counted separately, never as zero.
 */
export class CostLedger {
  private readonly totals = new Map<CostBucket, BucketTotals>();

  constructor(private readonly flatRateUsd: FlatRateCosts) {}

  readonly sink: ProviderUsageSink = (event) => this.record(event);

  record(event: ProviderUsageEvent): void {
    const bucket = bucketFor(event);
    const entry = this.totals.get(bucket) ?? {
      requests: 0,
      knownUsd: 0,
      unknownRequests: 0,
    };
    const usd = event.costUsd === undefined ? this.flatRate(bucket) : event.costUsd;

    entry.requests += 1;
    if (usd === null) {
      entry.unknownRequests += 1;
    } else {
      entry.knownUsd = round(entry.knownUsd + usd);
    }
    this.totals.set(bucket, entry);
  }

  summary(): DiscoveryCostSummary {
    const empty: BucketTotals = { requests: 0, knownUsd: 0, unknownRequests: 0 };
    const totals = (bucket: CostBucket): BucketTotals => this.totals.get(bucket) ?? empty;
    const all = [...this.totals.values()];
    const unknownCostCalls = all.reduce((sum, entry) => sum + entry.unknownRequests, 0);

    const buckets = Object.fromEntries(
      COST_BUCKETS.map((bucket) => {
        const entry = totals(bucket);
        return [
          bucket,
          {
            calls: entry.requests,
            estimatedUsd: round(entry.knownUsd),
            unknownCostCalls: entry.unknownRequests,
          },
        ];
      }),
    ) as DiscoveryCostSummary['buckets'];

    return {
      perplexityResearchCalls: totals('perplexity_research').requests,
      valueserpRequestCount: totals('valueserp').requests,
      buckets,
      totalEstimatedCostUsd: round(all.reduce((sum, entry) => sum + entry.knownUsd, 0)),
      unknownCostCalls,
      costComplete: unknownCostCalls === 0,
    };
  }

  private flatRate(bucket: CostBucket): number | null {
    if (
      bucket === 'valueserp' ||
      bucket === 'perplexity_discovery' ||
      bucket === 'perplexity_research'
    ) {
      return this.flatRateUsd[bucket] ?? null;
    }
    return null;
  }
}
