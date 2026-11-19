import { describe, expect, it, vi } from 'vitest';

vi.mock('ioredis', () => ({ Redis: class {} }));

import {
  KNOWN_IP_CEILING_PER_MINUTE,
  UNKNOWN_IP_BUDGET_PER_MINUTE,
  authLimits,
  checkHashingAttempt,
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
  const chain = new Headers({ 'x-forwarded-for': '198.51.100.9, 203.0.113.7, 10.0.0.1' });

  it('returns unknown when no trusted source is configured', () => {
    expect(getClientIp(chain, {})).toBe('unknown');
    // The old AUTH_TRUST_HOST switch no longer makes X-Forwarded-For trusted.
    expect(getClientIp(chain, { AUTH_TRUST_HOST: 'true', TRUST_PROXY: 'true' })).toBe('unknown');
  });

  it('reads only CLIENT_IP_HEADER when it is set', () => {
    const headers = new Headers({ 'cf-connecting-ip': '203.0.113.50', 'x-forwarded-for': '198.51.100.9' });
    expect(getClientIp(headers, { CLIENT_IP_HEADER: 'cf-connecting-ip', TRUSTED_PROXY_HOPS: '1' })).toBe(
      '203.0.113.50',
    );
    expect(getClientIp(new Headers({ 'x-forwarded-for': '198.51.100.9' }), { CLIENT_IP_HEADER: 'cf-connecting-ip' })).toBe(
      'unknown',
    );
  });

  it('counts TRUSTED_PROXY_HOPS from the right of X-Forwarded-For, ignoring client-written hops', () => {
    expect(getClientIp(chain, { TRUSTED_PROXY_HOPS: '1' })).toBe('10.0.0.1');
    expect(getClientIp(chain, { TRUSTED_PROXY_HOPS: '2' })).toBe('203.0.113.7');
    // A client that prepends a fake first hop does not change the answer.
    const spoofed = new Headers({ 'x-forwarded-for': '1.2.3.4, 198.51.100.9, 203.0.113.7, 10.0.0.1' });
    expect(getClientIp(spoofed, { TRUSTED_PROXY_HOPS: '2' })).toBe('203.0.113.7');
  });

  it('returns unknown when the chain is shorter than the hop count or not an IP', () => {
    expect(getClientIp(new Headers({ 'x-forwarded-for': '203.0.113.7' }), { TRUSTED_PROXY_HOPS: '2' })).toBe('unknown');
    expect(getClientIp(new Headers({ 'x-forwarded-for': 'not-an-ip' }), { TRUSTED_PROXY_HOPS: '1' })).toBe('unknown');
    expect(getClientIp(new Headers({ 'cf-connecting-ip': 'x'.repeat(500) }), { CLIENT_IP_HEADER: 'cf-connecting-ip' })).toBe(
      'unknown',
    );
    expect(getClientIp(chain, { TRUSTED_PROXY_HOPS: '0' })).toBe('unknown');
  });

  it('accepts IPv6 addresses', () => {
    expect(getClientIp(new Headers({ 'x-forwarded-for': '2001:db8::1' }), { TRUSTED_PROXY_HOPS: '1' })).toBe('2001:db8::1');
  });
});

describe('checkHashingAttempt', () => {
  function limiterAt() {
    const clock = fakeClock();
    return { clock, limiter: createRateLimiter({ primary: null, fallback: createMemoryStore(clock.now), now: clock.now }) };
  }

  it('applies the shared budget to unknown-IP requests', async () => {
    const { clock, limiter } = limiterAt();
    const budget = UNKNOWN_IP_BUDGET_PER_MINUTE.reset;
    for (let i = 0; i < budget; i++) {
      expect((await checkHashingAttempt(limiter, authLimits.resetIp('unknown'), 'reset', 'unknown')).allowed).toBe(true);
    }
    expect((await checkHashingAttempt(limiter, authLimits.resetIp('unknown'), 'reset', 'unknown')).allowed).toBe(false);
    clock.advance(60_000);
    expect((await checkHashingAttempt(limiter, [], 'reset', 'unknown')).allowed).toBe(true);
  });

  it('does not let an unknown-IP burst block a known-IP sign-in', async () => {
    const { limiter } = limiterAt();
    // Spray wrong passwords at random emails without a usable IP until the budget is gone.
    for (let i = 0; i < UNKNOWN_IP_BUDGET_PER_MINUTE.signin + 50; i++) {
      await checkHashingAttempt(limiter, authLimits.signIn('unknown', `victim${i}@example.test`), 'signin', 'unknown');
    }
    expect(
      (await checkHashingAttempt(limiter, authLimits.signIn('unknown', 'late@example.test'), 'signin', 'unknown')).allowed,
    ).toBe(false);
    expect(
      (await checkHashingAttempt(limiter, authLimits.signIn('203.0.113.7', 'owner@example.test'), 'signin', '203.0.113.7'))
        .allowed,
    ).toBe(true);
  });

  it('caps known-IP requests at a ceiling ten times the unknown-IP budget', async () => {
    const { limiter } = limiterAt();
    const ceiling = KNOWN_IP_CEILING_PER_MINUTE.register;
    expect(ceiling).toBe(UNKNOWN_IP_BUDGET_PER_MINUTE.register * 10);
    for (let i = 0; i < ceiling; i++) {
      expect((await checkHashingAttempt(limiter, [], 'register', `10.0.${Math.floor(i / 250)}.${i % 250}`)).allowed).toBe(true);
    }
    expect((await checkHashingAttempt(limiter, [], 'register', '10.9.9.9')).allowed).toBe(false);
    // The unknown-IP budget is a separate bucket.
    expect((await checkHashingAttempt(limiter, [], 'register', 'unknown')).allowed).toBe(true);
  });

  it('does not spend the shared budget on a client that is over its own limit', async () => {
    const { limiter } = limiterAt();
    const attempt = (email: string) =>
      checkHashingAttempt(limiter, authLimits.register('unknown', email), 'register', 'unknown');
    for (let i = 0; i < 3; i++) expect((await attempt('a@example.test')).allowed).toBe(true);
    for (let i = 0; i < 50; i++) expect((await attempt('a@example.test')).allowed).toBe(false);
    // Only 3 budget units were used, so other clients still get through.
    expect((await attempt('b@example.test')).allowed).toBe(true);
  });

  it('keeps budgets separate per endpoint', async () => {
    const { limiter } = limiterAt();
    for (let i = 0; i < UNKNOWN_IP_BUDGET_PER_MINUTE.reset; i++) await checkHashingAttempt(limiter, [], 'reset', 'unknown');
    expect((await checkHashingAttempt(limiter, [], 'reset', 'unknown')).allowed).toBe(false);
    expect((await checkHashingAttempt(limiter, [], 'signin', 'unknown')).allowed).toBe(true);
  });
});
