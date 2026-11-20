import { ProviderError } from './provider-errors';
import { retryOnRateLimit } from './provider-retry';

function rateLimit(retryAfterMs?: number): ProviderError {
  return new ProviderError('Perplexity rate limited (429)', 'perplexity', 'rate_limit', 429, undefined, retryAfterMs);
}

describe('retryOnRateLimit', () => {
  const sleeps: number[] = [];
  const sleep = async (ms: number) => {
    sleeps.push(ms);
  };

  beforeEach(() => {
    sleeps.length = 0;
  });

  it('retries a 429 with backoff and returns the eventual success', async () => {
    const attempt = jest
      .fn()
      .mockRejectedValueOnce(rateLimit())
      .mockRejectedValueOnce(rateLimit())
      .mockResolvedValueOnce('ok');

    const result = await retryOnRateLimit(attempt, {
      deadlineAt: Date.now() + 60_000,
      random: () => 0,
      sleep,
    });

    expect(result).toBe('ok');
    expect(attempt).toHaveBeenCalledTimes(3);
    expect(sleeps).toEqual([500, 1000]);
  });

  it('gives up after two retries', async () => {
    const attempt = jest.fn().mockRejectedValue(rateLimit());

    await expect(
      retryOnRateLimit(attempt, { deadlineAt: Date.now() + 60_000, random: () => 0, sleep }),
    ).rejects.toMatchObject({ kind: 'rate_limit' });
    expect(attempt).toHaveBeenCalledTimes(3);
  });

  it('honours Retry-After when it is longer than the backoff', async () => {
    const attempt = jest.fn().mockRejectedValueOnce(rateLimit(4000)).mockResolvedValueOnce('ok');

    await retryOnRateLimit(attempt, {
      deadlineAt: Date.now() + 60_000,
      random: () => 0,
      sleep,
    });

    expect(sleeps).toEqual([4000]);
  });

  it('does not retry when the wait plus a minimum attempt would pass the deadline', async () => {
    const now = 1_000_000;
    const attempt = jest.fn().mockRejectedValue(rateLimit(10_000));

    await expect(
      retryOnRateLimit(attempt, {
        deadlineAt: now + 11_000,
        now: () => now,
        random: () => 0,
        sleep,
      }),
    ).rejects.toMatchObject({ kind: 'rate_limit' });
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(sleeps).toEqual([]);
  });

  it('never retries account, network or upstream errors', async () => {
    const account = new ProviderError('OpenAI primary out of quota (429)', 'openai', 'account', 429, 'insufficient_quota');
    const network = new ProviderError('Perplexity network error', 'perplexity', 'network');
    const upstream = new ProviderError('Perplexity upstream error (500)', 'perplexity', 'upstream', 500);

    for (const error of [account, network, upstream]) {
      const attempt = jest.fn().mockRejectedValue(error);
      await expect(
        retryOnRateLimit(attempt, { deadlineAt: Date.now() + 60_000, sleep }),
      ).rejects.toBe(error);
      expect(attempt).toHaveBeenCalledTimes(1);
    }
    expect(sleeps).toEqual([]);
  });

  it('passes the remaining budget to each attempt', async () => {
    let now = 0;
    const attempt = jest.fn().mockResolvedValue('ok');

    await retryOnRateLimit(attempt, { deadlineAt: 5000, now: () => now, sleep });
    now = 1000;
    await retryOnRateLimit(attempt, { deadlineAt: 5000, now: () => now, sleep });

    expect(attempt.mock.calls.map((call) => call[0])).toEqual([5000, 4000]);
  });
});
