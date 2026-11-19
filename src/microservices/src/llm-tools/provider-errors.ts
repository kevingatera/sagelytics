export type ProviderName = 'perplexity' | 'valueserp' | 'openai' | 'openrouter';

/**
 * - account: the key is rejected or the account has no credit (401, 402, 429 insufficient_quota).
 *   Never retried within a run, and the provider is skipped for the rest of that run.
 * - rate_limit: a transient 429. Retried with backoff while the deadline allows.
 * - network: the request never got a response. No provider billed it.
 * - upstream: 5xx or another HTTP failure. Cost is unknown.
 */
export type ProviderErrorKind = 'account' | 'rate_limit' | 'network' | 'upstream';

export type AccountReason =
  | 'unauthorized'
  | 'payment_required'
  | 'insufficient_quota'
  | 'not_configured';

const PROVIDER_LABEL: Record<ProviderName, string> = {
  perplexity: 'Perplexity',
  valueserp: 'ValueSERP',
  openai: 'OpenAI primary',
  openrouter: 'OpenRouter',
};

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly provider: ProviderName,
    readonly kind: ProviderErrorKind,
    readonly status?: number,
    readonly reason?: AccountReason,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

const MAX_BODY_CHARS = 220;

export function parseRetryAfterMs(header: string | null, now: number = Date.now()): number | undefined {
  if (!header) {
    return undefined;
  }
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000);
  }
  const at = Date.parse(header);
  return Number.isFinite(at) ? Math.max(0, at - now) : undefined;
}

export function retryAfterHeader(response: Pick<Response, 'headers'>): string | null {
  return response.headers?.get('retry-after') ?? null;
}

export function classifyHttpFailure(
  provider: ProviderName,
  status: number,
  body: string,
  retryAfter: string | null = null,
): ProviderError {
  const label = PROVIDER_LABEL[provider];
  const snippet = body.slice(0, MAX_BODY_CHARS);

  if (status === 401) {
    return new ProviderError(`${label} unauthorized (401): ${snippet}`, provider, 'account', status, 'unauthorized');
  }
  if (status === 402) {
    return new ProviderError(
      `${label} payment required (402): ${snippet}`,
      provider,
      'account',
      status,
      'payment_required',
    );
  }
  if (status === 429 && /insufficient_quota/i.test(body)) {
    return new ProviderError(
      `${label} out of quota (429): ${snippet}`,
      provider,
      'account',
      status,
      'insufficient_quota',
    );
  }
  if (status === 429) {
    return new ProviderError(
      `${label} rate limited (429): ${snippet}`,
      provider,
      'rate_limit',
      status,
      undefined,
      parseRetryAfterMs(retryAfter),
    );
  }
  if (status >= 500) {
    return new ProviderError(`${label} upstream error (${status}): ${snippet}`, provider, 'upstream', status);
  }
  return new ProviderError(`${label} request failed (${status}): ${snippet}`, provider, 'upstream', status);
}

/** Wraps a fetch rejection. Aborts and timeouts keep their own identity; anything else is a network failure. */
export function toNetworkError(provider: ProviderName, error: unknown, signal?: AbortSignal): unknown {
  if (signal?.aborted || isAbortLike(error) || error instanceof ProviderError) {
    return error;
  }
  const detail = error instanceof Error ? error.message : String(error);
  return new ProviderError(
    `${PROVIDER_LABEL[provider]} network error before response: ${detail}`,
    provider,
    'network',
  );
}

const ABORT_NAMES = new Set(['AbortError', 'TimeoutError', 'DeadlineExceededError']);

export function isAbortLike(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('name' in error)) {
    return false;
  }
  return typeof error.name === 'string' && ABORT_NAMES.has(error.name);
}

/**
 * What a failed request is known to have cost. Account errors and pre-response network failures
 * are $0 because the provider did not bill them. Any other failure is unknown (null), never zero.
 */
export function failureCostUsd(error: unknown): number | null {
  if (error instanceof ProviderError && (error.kind === 'account' || error.kind === 'network')) {
    return 0;
  }
  return null;
}

export function isAccountError(error: unknown): error is ProviderError {
  return error instanceof ProviderError && error.kind === 'account';
}
