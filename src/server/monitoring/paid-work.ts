import { randomUUID } from 'node:crypto';
import { getAppRedis, getRateLimiter, type RateLimiter } from '~/server/rate-limit';

export type PaidWork = 'competitor-add' | 'product-monitor';

const HOUR_MS = 3_600_000;
export const PAID_WORK_DEADLINE_MS = 45_000;
// The lease outlives the deadline a little, so a slow release never frees it early.
const LEASE_MS = PAID_WORK_DEADLINE_MS + 15_000;
const REDIS_TIMEOUT_MS = 500;

const caps = {
  'competitor-add': { env: 'COMPETITOR_ADD_MAX_PER_HOUR', fallback: 5 },
  'product-monitor': { env: 'PRODUCT_MONITOR_MAX_PER_HOUR', fallback: 3 },
} as const;

const limitMessages: Record<PaidWork, string> = {
  'competitor-add': 'Hourly limit for competitor analysis reached. Failed attempts count too.',
  'product-monitor': 'Hourly limit for price checks reached. Failed attempts count too.',
};

export class PaidWorkLimitError extends Error {
  constructor(
    message: string,
    readonly retryAfterSeconds: number,
  ) {
    super(message);
  }
}

/** One lease per user and kind, so a user can't run the same paid operation twice at once. */
export interface LeaseStore {
  acquire(key: string, token: string, ttlMs: number): Promise<boolean>;
  release(key: string, token: string): Promise<void>;
}

const RELEASE_SCRIPT =
  "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end";

export interface RedisLeaseClient {
  set(key: string, value: string, px: 'PX', ttl: number, nx: 'NX'): Promise<unknown>;
  eval(script: string, numKeys: number, ...args: string[]): Promise<unknown>;
}

export function createRedisLeaseStore(redis: RedisLeaseClient): LeaseStore {
  return {
    async acquire(key, token, ttlMs) {
      return (await redis.set(key, token, 'PX', ttlMs, 'NX')) === 'OK';
    },
    async release(key, token) {
      await redis.eval(RELEASE_SCRIPT, 1, key, token);
    },
  };
}

export function createMemoryLeaseStore(now: () => number = Date.now): LeaseStore {
  const leases = new Map<string, { token: string; expiresAt: number }>();
  return {
    async acquire(key, token, ttlMs) {
      const held = leases.get(key);
      if (held && held.expiresAt > now()) return false;
      leases.set(key, { token, expiresAt: now() + ttlMs });
      return true;
    },
    async release(key, token) {
      if (leases.get(key)?.token === token) leases.delete(key);
    },
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Redis did not answer within ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Uses Redis when it answers and the in-process map otherwise. The store that granted a lease
 * also releases it. Holds no database connection while the paid work runs.
 */
export function createLeaseStore(primary: LeaseStore | null, fallback: LeaseStore): LeaseStore {
  const grantedBy = new Map<string, LeaseStore>();
  return {
    async acquire(key, token, ttlMs) {
      if (primary) {
        try {
          const ok = await withTimeout(primary.acquire(key, token, ttlMs), REDIS_TIMEOUT_MS);
          if (ok) grantedBy.set(token, primary);
          return ok;
        } catch {
          // Redis is down: fall through to the per-process lease.
        }
      }
      const ok = await fallback.acquire(key, token, ttlMs);
      if (ok) grantedBy.set(token, fallback);
      return ok;
    },
    async release(key, token) {
      const store = grantedBy.get(token);
      grantedBy.delete(token);
      await store?.release(key, token).catch(() => undefined);
    },
  };
}

let sharedLeases: LeaseStore | null = null;

function getLeaseStore(): LeaseStore {
  if (!sharedLeases) {
    const redis = getAppRedis();
    sharedLeases = createLeaseStore(
      redis
        ? createRedisLeaseStore({
            set: (key, value, px, ttl, nx) => redis.set(key, value, px, ttl, nx),
            eval: (script, numKeys, ...args) => redis.eval(script, numKeys, ...args),
          })
        : null,
      createMemoryLeaseStore(),
    );
  }
  return sharedLeases;
}

function hourlyLimit(kind: PaidWork): number {
  const { env, fallback } = caps[kind];
  const configured = Number(process.env[env] ?? fallback);
  return Number.isSafeInteger(configured) && configured > 0 ? configured : fallback;
}

/**
 * Runs a paid microservice call for a user: one at a time per user and kind, and at most the
 * hourly cap per user and kind. An attempt counts as soon as it starts, even if it then fails.
 */
export async function runPaidWork<T>(
  userId: string,
  kind: PaidWork,
  work: (deadlineAt: number) => Promise<T>,
  deps: { leases?: LeaseStore; limiter?: Pick<RateLimiter, 'check'>; now?: () => number } = {},
): Promise<T> {
  const leases = deps.leases ?? getLeaseStore();
  const limiter = deps.limiter ?? getRateLimiter();
  const now = deps.now ?? Date.now;
  const leaseKey = `paid-work:lock:${kind}:${userId}`;
  const token = randomUUID();

  if (!(await leases.acquire(leaseKey, token, LEASE_MS))) {
    throw new PaidWorkLimitError('This operation is already running. Try again shortly.', 5);
  }
  try {
    const result = await limiter.check([
      { key: `paid-work:${kind}:${userId}`, limit: hourlyLimit(kind), windowMs: HOUR_MS },
    ]);
    if (!result.allowed) {
      throw new PaidWorkLimitError(limitMessages[kind], result.retryAfterSeconds);
    }
    return await work(now() + PAID_WORK_DEADLINE_MS);
  } finally {
    await leases.release(leaseKey, token);
  }
}
