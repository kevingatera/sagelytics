import { Redis, type RedisOptions } from 'ioredis';

/**
 * Fixed-window rate limiting. Counters live in Redis when REDIS_URL or REDIS_HOST is set,
 * and in an in-process Map otherwise or while Redis is failing.
 */

export interface RateLimitRule {
  /** Counter name, for example `register:ip:203.0.113.7`. */
  key: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until every exceeded window resets; 0 when allowed. */
  retryAfterSeconds: number;
}

export interface CounterStore {
  /** Adds one to the counter and returns the new count. The counter expires after ttlMs. */
  increment(key: string, ttlMs: number): Promise<number>;
}

type Clock = () => number;

export function createMemoryStore(now: Clock = Date.now): CounterStore {
  const counters = new Map<string, { count: number; expiresAt: number }>();

  function sweep(at: number) {
    for (const [key, entry] of counters) {
      if (entry.expiresAt <= at) counters.delete(key);
    }
  }

  return {
    async increment(key, ttlMs) {
      const at = now();
      if (counters.size > 10_000) sweep(at);
      const entry = counters.get(key);
      if (!entry || entry.expiresAt <= at) {
        counters.set(key, { count: 1, expiresAt: at + ttlMs });
        return 1;
      }
      entry.count += 1;
      return entry.count;
    },
  };
}

const INCREMENT_SCRIPT =
  "local c = redis.call('INCR', KEYS[1]) if c == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end return c";

/** The one Redis command the store needs, so tests can pass a plain stub. */
export interface RedisEval {
  eval(script: string, numKeys: number, ...args: string[]): Promise<unknown>;
}

export function createRedisStore(redis: RedisEval): CounterStore {
  return {
    async increment(key, ttlMs) {
      const result = await redis.eval(INCREMENT_SCRIPT, 1, key, String(ttlMs));
      return Number(result);
    },
  };
}

const REDIS_TIMEOUT_MS = 500;
const REDIS_RETRY_AFTER_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Redis did not answer within ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export interface RateLimiterOptions {
  primary: CounterStore | null;
  fallback: CounterStore;
  now?: Clock;
  log?: (message: string) => void;
}

export function createRateLimiter({ primary, fallback, now = Date.now, log = console.warn }: RateLimiterOptions) {
  let primaryDownUntil = 0;
  let warned = false;

  async function increment(key: string, ttlMs: number): Promise<number> {
    if (primary && now() >= primaryDownUntil) {
      try {
        return await withTimeout(primary.increment(key, ttlMs), REDIS_TIMEOUT_MS);
      } catch (error) {
        primaryDownUntil = now() + REDIS_RETRY_AFTER_MS;
        if (!warned) {
          warned = true;
          log(
            `[rate-limit] Redis unavailable, using in-process counters: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    }
    return fallback.increment(key, ttlMs);
  }

  /** Counts one attempt against every rule. Denied when any rule is over its limit. */
  async function check(rules: RateLimitRule[]): Promise<RateLimitResult> {
    const at = now();
    let retryAfterMs = 0;
    for (const rule of rules) {
      const windowStart = Math.floor(at / rule.windowMs) * rule.windowMs;
      const windowEnd = windowStart + rule.windowMs;
      const count = await increment(`rl:${rule.key}:${windowStart}`, windowEnd - at);
      if (count > rule.limit) retryAfterMs = Math.max(retryAfterMs, windowEnd - at);
    }
    return {
      allowed: retryAfterMs === 0,
      retryAfterSeconds: retryAfterMs === 0 ? 0 : Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  return { check };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;

// Same settings as the progress service's client, so both reach the same Redis.
function createAppRedis(): Redis | null {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl && !process.env.REDIS_HOST) return null;

  const redisDb = parseInt(process.env.REDIS_DB ?? '0');
  const options: RedisOptions = {
    db: Number.isNaN(redisDb) ? 0 : redisDb,
    enableReadyCheck: false,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  };
  const client = redisUrl
    ? new Redis(redisUrl, options)
    : new Redis({
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT ?? '6379') || 6379,
        ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
        ...(process.env.REDIS_USERNAME ? { username: process.env.REDIS_USERNAME } : {}),
        ...options,
      });
  // Failures surface on each command and switch the limiter to memory; keep the event quiet.
  client.on('error', () => undefined);
  return client;
}

let sharedLimiter: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!sharedLimiter) {
    const redis = createAppRedis();
    if (!redis) console.warn('[rate-limit] REDIS_URL is not set, using in-process counters');
    sharedLimiter = createRateLimiter({
      primary: redis
        ? createRedisStore({ eval: (script, numKeys, ...args) => redis.eval(script, numKeys, ...args) })
        : null,
      fallback: createMemoryStore(),
    });
  }
  return sharedLimiter;
}

type EnvSource = Record<string, string | undefined>;

function isTrue(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

/**
 * Client IP for rate limiting. The first X-Forwarded-For hop is used only when a proxy is
 * trusted (TRUST_PROXY or AUTH_TRUST_HOST); otherwise the header is client-controlled and
 * the result is 'unknown'.
 */
export function getClientIp(headers: Headers, source: EnvSource = process.env): string {
  if (!isTrue(source.TRUST_PROXY) && !isTrue(source.AUTH_TRUST_HOST)) return 'unknown';
  const first = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (first) return first.slice(0, 64);
  const realIp = headers.get('x-real-ip')?.trim();
  return realIp ? realIp.slice(0, 64) : 'unknown';
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Per-IP rules are skipped when the IP is unknown: one shared 'unknown' bucket would let a
 * single client lock everyone out. Per-email rules always apply.
 */
function ipRule(ip: string, rule: RateLimitRule): RateLimitRule[] {
  return ip === 'unknown' ? [] : [rule];
}

export const authLimits = {
  register: (ip: string, email: string): RateLimitRule[] => [
    ...ipRule(ip, { key: `register:ip:${ip}`, limit: 5, windowMs: HOUR }),
    { key: `register:email:${email}`, limit: 3, windowMs: HOUR },
  ],
  /** Shared by forgot-password and resend-verification, each under its own prefix. */
  emailLink: (kind: 'forgot' | 'resend', ip: string, email: string): RateLimitRule[] => [
    ...ipRule(ip, { key: `${kind}:ip:${ip}`, limit: 5, windowMs: HOUR }),
    { key: `${kind}:email-min:${email}`, limit: 1, windowMs: MINUTE },
    { key: `${kind}:email-day:${email}`, limit: 5, windowMs: DAY },
  ],
  signIn: (ip: string, email: string): RateLimitRule[] => [
    { key: `signin:ip-email:${ip}:${email}`, limit: 10, windowMs: 15 * MINUTE },
    ...ipRule(ip, { key: `signin:ip:${ip}`, limit: 50, windowMs: 15 * MINUTE }),
  ],
};
