import { describe, expect, it, vi } from 'vitest';

vi.mock('ioredis', () => ({ Redis: class {} }));

import {
  authLimits,
  createMemoryStore,
  createRateLimiter,
  createRedisStore,
  getClientIp,
  type CounterStore,
} from './rate-limit';

function fakeClock(start = Date.UTC(2026, 0, 1, 12, 0, 0)) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

/** Minimal stand-in for the Redis EVAL used by the store: INCR plus PEXPIRE on first hit. */
function fakeRedis(clock: { now: () => number }) {
  const kv = new Map<string, { count: number; expiresAt: number }>();
  return {
    kv,
    eval: vi.fn(async (_script: string, _keys: number, key: string, ttl: string) => {
      const entry = kv.get(key);
      if (!entry || entry.expiresAt <= clock.now()) {
        kv.set(key, { count: 1, expiresAt: clock.now() + Number(ttl) });
        return 1;
      }
      entry.count += 1;
      return entry.count;
    }),
  };
}

const HOUR = 3_600_000;

describe('createRateLimiter', () => {
  it('allows up to the limit in a window, then refuses with Retry-After until the window resets', async () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ primary: null, fallback: createMemoryStore(clock.now), now: clock.now });
    const rules = authLimits.register('203.0.113.7', 'a@example.test');

    for (let i = 0; i < 3; i++) expect((await limiter.check(rules)).allowed).toBe(true);
    const denied = await limiter.check(rules);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSeconds).toBe(3600);

    clock.advance(HOUR);
    expect((await limiter.check(rules)).allowed).toBe(true);
  });

  it('applies the per-IP limit across different emails', async () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ primary: null, fallback: createMemoryStore(clock.now), now: clock.now });

    for (let i = 0; i < 5; i++) {
      expect((await limiter.check(authLimits.register('203.0.113.7', `u${i}@example.test`))).allowed).toBe(true);
    }
    expect((await limiter.check(authLimits.register('203.0.113.7', 'u9@example.test'))).allowed).toBe(false);
    expect((await limiter.check(authLimits.register('198.51.100.1', 'u9@example.test'))).allowed).toBe(true);
  });

  it('limits email links to one per minute and five per day per email', async () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ primary: null, fallback: createMemoryStore(clock.now), now: clock.now });
    const check = () => limiter.check(authLimits.emailLink('forgot', 'unknown', 'a@example.test'));

    expect((await check()).allowed).toBe(true);
    expect((await check()).allowed).toBe(false);
    // Every attempt counts toward the day, including the refused one above.
    for (let i = 0; i < 3; i++) {
      clock.advance(61_000);
      expect((await check()).allowed).toBe(true);
    }
    clock.advance(61_000);
    expect((await check()).allowed).toBe(false);
  });

  it('limits sign-in to 10 per IP and email and 50 per IP in 15 minutes', async () => {
    const clock = fakeClock(Date.UTC(2026, 0, 1, 12, 0, 1));
    const limiter = createRateLimiter({ primary: null, fallback: createMemoryStore(clock.now), now: clock.now });
    const ip = '203.0.113.7';

    for (let i = 0; i < 10; i++) expect((await limiter.check(authLimits.signIn(ip, 'a@example.test'))).allowed).toBe(true);
    expect((await limiter.check(authLimits.signIn(ip, 'a@example.test'))).allowed).toBe(false);

    for (let i = 0; i < 39; i++) expect((await limiter.check(authLimits.signIn(ip, `b${i}@example.test`))).allowed).toBe(true);
    // 11 + 39 = 50 attempts from this IP so far; the next one is over.
    expect((await limiter.check(authLimits.signIn(ip, 'c@example.test'))).allowed).toBe(false);
  });

  it('counts in Redis when it is available', async () => {
    const clock = fakeClock();
    const redis = fakeRedis(clock);
    const fallbackIncrement = vi.fn(async () => 1);
    const fallback: CounterStore = { increment: fallbackIncrement };
    const limiter = createRateLimiter({ primary: createRedisStore(redis), fallback, now: clock.now });
    const rules = authLimits.register('unknown', 'a@example.test');

    for (let i = 0; i < 3; i++) expect((await limiter.check(rules)).allowed).toBe(true);
    expect((await limiter.check(rules)).allowed).toBe(false);
    expect(redis.eval).toHaveBeenCalledTimes(4);
    expect(fallbackIncrement).not.toHaveBeenCalled();
  });

  it('falls back to memory when Redis fails, and logs that only once', async () => {
    const clock = fakeClock();
    const log = vi.fn();
    const brokenIncrement = vi.fn(async () => Promise.reject(new Error('ECONNREFUSED')));
    const broken: CounterStore = { increment: brokenIncrement };
    const limiter = createRateLimiter({ primary: broken, fallback: createMemoryStore(clock.now), now: clock.now, log });
    const rules = authLimits.register('unknown', 'a@example.test');

    for (let i = 0; i < 3; i++) expect((await limiter.check(rules)).allowed).toBe(true);
    expect((await limiter.check(rules)).allowed).toBe(false);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]?.[0]).toContain('ECONNREFUSED');
    // Redis is not retried on every request while it is down.
    expect(brokenIncrement).toHaveBeenCalledTimes(1);
  });
});

describe('getClientIp', () => {
  const headers = new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' });

  it('ignores X-Forwarded-For unless a proxy is trusted', () => {
    expect(getClientIp(headers, {})).toBe('unknown');
  });

  it('uses the first hop when TRUST_PROXY or AUTH_TRUST_HOST is set', () => {
    expect(getClientIp(headers, { TRUST_PROXY: 'true' })).toBe('203.0.113.7');
    expect(getClientIp(headers, { AUTH_TRUST_HOST: 'true' })).toBe('203.0.113.7');
  });

  it('returns unknown when a trusted proxy sent no address', () => {
    expect(getClientIp(new Headers(), { TRUST_PROXY: 'true' })).toBe('unknown');
  });
});
