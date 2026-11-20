import {
  classifyHttpFailure,
  failureCostUsd,
  parseRetryAfterMs,
  ProviderError,
  toNetworkError,
} from './provider-errors';

describe('provider error classification', () => {
  it.each([
    [401, 'unauthorized', 'account'],
    [402, 'payment_required', 'account'],
  ])('treats HTTP %s as an account error (%s)', (status, reason, kind) => {
    const error = classifyHttpFailure('perplexity', status, 'nope');
    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toMatchObject({ kind, reason, status, provider: 'perplexity' });
  });

  it('treats a 429 that reports insufficient_quota as an account error, not a rate limit', () => {
    const error = classifyHttpFailure(
      'openai',
      429,
      '{"error":{"code":"insufficient_quota"}}',
      '1',
    );
    expect(error).toMatchObject({
      kind: 'account',
      reason: 'insufficient_quota',
      retryAfterMs: undefined,
    });
  });

  it('keeps a plain 429 as a rate limit and carries Retry-After', () => {
    const error = classifyHttpFailure('perplexity', 429, 'request_rate_limit_exceeded', '2');
    expect(error).toMatchObject({ kind: 'rate_limit', retryAfterMs: 2000 });
  });

  it('classifies 5xx and other statuses as upstream failures', () => {
    expect(classifyHttpFailure('openrouter', 503, 'down')).toMatchObject({ kind: 'upstream' });
    expect(classifyHttpFailure('openrouter', 400, 'bad')).toMatchObject({ kind: 'upstream' });
  });

  it('truncates the body snippet in the message', () => {
    const error = classifyHttpFailure('openai', 500, 'x'.repeat(1000));
    expect(error.message.length).toBeLessThan(300);
  });

  it('wraps a fetch rejection before any response as a network error', () => {
    const error = toNetworkError('valueserp', new Error('ECONNRESET'));
    expect(error).toMatchObject({ kind: 'network', provider: 'valueserp' });
  });

  it('keeps abort and timeout errors out of the network class', () => {
    const timeout = new DOMException('timed out', 'TimeoutError');
    expect(toNetworkError('valueserp', timeout)).toBe(timeout);
    const controller = new AbortController();
    controller.abort(new Error('budget spent'));
    const aborted = new Error('aborted');
    expect(toNetworkError('valueserp', aborted, controller.signal)).toBe(aborted);
  });

  it('prices failures: account and network are $0, everything else is unknown', () => {
    expect(failureCostUsd(classifyHttpFailure('openai', 401, ''))).toBe(0);
    expect(failureCostUsd(classifyHttpFailure('openai', 402, ''))).toBe(0);
    expect(failureCostUsd(classifyHttpFailure('openai', 429, 'insufficient_quota'))).toBe(0);
    expect(failureCostUsd(toNetworkError('openai', new Error('reset')))).toBe(0);
    expect(failureCostUsd(classifyHttpFailure('openai', 429, 'slow down'))).toBeNull();
    expect(failureCostUsd(classifyHttpFailure('openai', 500, ''))).toBeNull();
    expect(failureCostUsd(new DOMException('timed out', 'TimeoutError'))).toBeNull();
  });

  it('parses Retry-After in seconds and as an HTTP date', () => {
    const now = Date.parse('2026-11-18T10:00:00Z');
    expect(parseRetryAfterMs('3', now)).toBe(3000);
    expect(parseRetryAfterMs('Wed, 18 Nov 2026 10:00:05 GMT', now)).toBe(5000);
    expect(parseRetryAfterMs(null, now)).toBeUndefined();
    expect(parseRetryAfterMs('soon', now)).toBeUndefined();
  });
});
