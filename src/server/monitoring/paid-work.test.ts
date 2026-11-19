import { describe, expect, it, vi } from 'vitest';

import type * as RateLimitModuleNs from '~/server/rate-limit';
type RateLimitModule = typeof RateLimitModuleNs;

vi.mock('~/server/rate-limit', async (importOriginal) => {
  const actual = await importOriginal<RateLimitModule>();
  return { ...actual, getAppRedis: () => null };
});

import { createMemoryStore, createRateLimiter } from '~/server/rate-limit';
import {
  createLeaseStore,
  createMemoryLeaseStore,
  createRedisLeaseStore,
  PaidWorkLimitError,
  runPaidWork,
  type LeaseStore,
} from './paid-work';

function deps(leases: LeaseStore = createMemoryLeaseStore()) {
  return { leases, limiter: createRateLimiter({ primary: null, fallback: createMemoryStore() }) };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe('runPaidWork', () => {
  it('refuses a second run of the same kind while one is in flight, and allows other kinds', async () => {
    const d = deps();
    const gate = deferred<string>();
    const started = deferred<void>();
    const inFlight = runPaidWork(
      'u1',
      'competitor-add',
      () => {
        started.resolve();
        return gate.promise;
      },
      d,
    );
    await started.promise;

    const work = vi.fn(async () => 'ran');
    await expect(runPaidWork('u1', 'competitor-add', work, d)).rejects.toMatchObject({
      message: expect.stringContaining('already running'),
    });
    expect(work).not.toHaveBeenCalled();
    await expect(runPaidWork('u1', 'product-monitor', work, d)).resolves.toBe('ran');
    await expect(runPaidWork('u2', 'competitor-add', work, d)).resolves.toBe('ran');

    gate.resolve('done');
    await expect(inFlight).resolves.toBe('done');
    await expect(runPaidWork('u1', 'competitor-add', work, d)).resolves.toBe('ran');
  });

  it('releases the lease when the work throws', async () => {
    const d = deps();
    await expect(
      runPaidWork('u1', 'competitor-add', () => Promise.reject(new Error('microservice down')), d),
    ).rejects.toThrow('microservice down');
    await expect(runPaidWork('u1', 'competitor-add', async () => 'ok', d)).resolves.toBe('ok');
  });

  it('enforces the hourly cap, counting failed attempts, without calling the work', async () => {
    vi.stubEnv('COMPETITOR_ADD_MAX_PER_HOUR', '2');
    try {
      const d = deps();
      await runPaidWork('u1', 'competitor-add', async () => 'ok', d);
      await runPaidWork('u1', 'competitor-add', () => Promise.reject(new Error('fail')), d).catch(
        () => undefined,
      );
      const work = vi.fn(async () => 'ran');
      const error = await runPaidWork('u1', 'competitor-add', work, d).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(PaidWorkLimitError);
      expect((error as Error).message).toContain('Hourly limit for competitor analysis reached');
      expect((error as PaidWorkLimitError).retryAfterSeconds).toBeGreaterThan(0);
      expect(work).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('passes a deadline about 45 s ahead', async () => {
    const d = { ...deps(), now: () => 1_000 };
    await runPaidWork(
      'u1',
      'product-monitor',
      async (deadlineAt) => {
        expect(deadlineAt).toBe(46_000);
      },
      d,
    );
  });
});

describe('lease stores', () => {
  it('memory leases expire after their TTL', async () => {
    let now = 0;
    const store = createMemoryLeaseStore(() => now);
    expect(await store.acquire('k', 'a', 1_000)).toBe(true);
    expect(await store.acquire('k', 'b', 1_000)).toBe(false);
    now = 1_001;
    expect(await store.acquire('k', 'b', 1_000)).toBe(true);
    // A stale holder can't release the new lease.
    await store.release('k', 'a');
    expect(await store.acquire('k', 'c', 1_000)).toBe(false);
  });

  it('the Redis store uses SET PX NX and a compare-and-delete release', async () => {
    const set = vi.fn(async () => 'OK' as unknown);
    const evalFn = vi.fn(async () => 1 as unknown);
    const store = createRedisLeaseStore({ set, eval: evalFn });
    expect(await store.acquire('k', 't', 60_000)).toBe(true);
    expect(set).toHaveBeenCalledWith('k', 't', 'PX', 60_000, 'NX');
    set.mockResolvedValueOnce(null);
    expect(await store.acquire('k', 't2', 60_000)).toBe(false);
    await store.release('k', 't');
    expect(evalFn).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('GET', KEYS[1]) == ARGV[1]"),
      1,
      'k',
      't',
    );
  });

  it('falls back to memory when Redis fails and releases from the store that granted the lease', async () => {
    const release = vi.fn(() => Promise.reject(new Error('ECONNREFUSED')));
    const broken: LeaseStore = {
      acquire: () => Promise.reject(new Error('ECONNREFUSED')),
      release,
    };
    const memory = createMemoryLeaseStore();
    const store = createLeaseStore(broken, memory);
    expect(await store.acquire('k', 'a', 1_000)).toBe(true);
    expect(await store.acquire('k', 'b', 1_000)).toBe(false);
    await store.release('k', 'a');
    expect(release).not.toHaveBeenCalled();
    expect(await store.acquire('k', 'b', 1_000)).toBe(true);
  });
});
