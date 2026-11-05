/**
 * Usage reported at a provider boundary, one event per dispatched request.
 *
 * `costUsd` has three meanings: `undefined` means the caller prices the request from configuration
 * (flat per-request rates), `null` means the cost is unknown, and a number is a known cost.
 */
export type ProviderUsageEvent = {
  provider: 'perplexity' | 'valueserp' | 'openai' | 'openrouter';
  operation: 'discover' | 'research' | 'search' | 'filter' | 'escalation' | 'other';
  model?: string;
  costUsd?: number | null;
};

export type ProviderUsageSink = (event: ProviderUsageEvent) => void;

export type ProviderCallOptions = {
  /** Cancels the request when a discovery budget or stage deadline passes. */
  signal?: AbortSignal;
  timeoutMs?: number;
  onUsage?: ProviderUsageSink;
};

/** Combines the caller's signal with a per-request timeout. */
export function requestSignal(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

/**
 * Returns a reporter that emits at most one usage event for a dispatched request. Call it with the
 * cost once the response is in, or with nothing if the request fails before a response arrives.
 */
export function usageReporter(
  options: ProviderCallOptions | undefined,
  event: Omit<ProviderUsageEvent, 'costUsd'>,
): (costUsd?: number | null) => void {
  let reported = false;
  return (costUsd) => {
    if (reported) {
      return;
    }
    reported = true;
    options?.onUsage?.({ ...event, costUsd: costUsd ?? null });
  };
}
