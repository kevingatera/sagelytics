import { ProviderError } from './provider-errors';

export const MIN_ATTEMPT_MS = 2000;

export type RetryOptions = {
  /** Absolute time (epoch ms) after which no new attempt may start. */
  deadlineAt: number;
  signal?: AbortSignal;
  maxRetries?: number;
  baseDelayMs?: number;
  random?: () => number;
  now?: () => number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  onRetry?: (error: ProviderError, retry: number, delayMs: number) => void;
};

/**
 * Retries only transient rate limits (kind `rate_limit`). Account, network and upstream errors are
 * rethrown immediately. A retry starts only if the backoff plus a minimum attempt fits before the deadline.
 */
export async function retryOnRateLimit<T>(
  attempt: (remainingMs: number) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const maxRetries = options.maxRetries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const random = options.random ?? Math.random;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;

  for (let retry = 0; ; retry++) {
    try {
      return await attempt(options.deadlineAt - now());
    } catch (error) {
      if (!(error instanceof ProviderError) || error.kind !== 'rate_limit' || retry >= maxRetries) {
        throw error;
      }

      const jitterMs = Math.round(random() * baseDelayMs);
      const delayMs = Math.max(baseDelayMs * 2 ** retry + jitterMs, error.retryAfterMs ?? 0);
      if (options.deadlineAt - now() < delayMs + MIN_ATTEMPT_MS) {
        throw error;
      }

      options.onRetry?.(error, retry + 1, delayMs);
      await sleep(delayMs, options.signal);
    }
  }
}

function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
