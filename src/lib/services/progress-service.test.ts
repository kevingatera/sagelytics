import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({ kv: new Map<string, string>() }));

// In-memory stand-in for the Redis commands the progress service uses.
vi.mock('ioredis', () => {
  class FakeRedis {
    on() {
      return this;
    }
    async set(key: string, value: string, ...options: string[]) {
      if (options.includes('NX') && store.kv.has(key)) return null;
      store.kv.set(key, value);
      return 'OK';
    }
    async get(key: string) {
      return store.kv.get(key) ?? null;
    }
    async setex(key: string, _ttl: number, value: string) {
      store.kv.set(key, value);
      return 'OK';
    }
    async publish() {
      return 0;
    }
    async eval(_script: string, _keys: number, key: string, expected: string) {
      if (store.kv.get(key) !== expected) return 0;
      store.kv.delete(key);
      return 1;
    }
    disconnect() {}
  }
  return { Redis: FakeRedis };
});

import { progressService } from './progress-service';

const ALICE = 'user-alice';
const DOMAIN = 'acme.example';

beforeEach(() => {
  store.kv.clear();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('onboarding job claims', () => {
  it('reuses the running job for the same user and domain', async () => {
    const first = await progressService.claimOnboardingJob(ALICE, DOMAIN, 'alice_1');
    await progressService.setProgress('alice_1', 'starting_discovery', 30, 'running');

    const second = await progressService.claimOnboardingJob(ALICE, DOMAIN, 'alice_2');

    expect(first).toEqual({ claimed: true });
    expect(second).toEqual({ claimed: false, sessionId: 'alice_1' });
  });

  it('keeps separate jobs for different domains', async () => {
    await progressService.claimOnboardingJob(ALICE, DOMAIN, 'alice_1');

    const other = await progressService.claimOnboardingJob(ALICE, 'other.example', 'alice_2');

    expect(other).toEqual({ claimed: true });
  });

  it('takes over a claim whose progress has finished', async () => {
    await progressService.claimOnboardingJob(ALICE, DOMAIN, 'alice_1');
    await progressService.setComplete('alice_1');

    const next = await progressService.claimOnboardingJob(ALICE, DOMAIN, 'alice_2');

    expect(next).toEqual({ claimed: true });
    expect(await progressService.isCurrentOnboardingJob(ALICE, DOMAIN, 'alice_2')).toBe(true);
    expect(await progressService.isCurrentOnboardingJob(ALICE, DOMAIN, 'alice_1')).toBe(false);
  });

  it('lets only the owning session release the job', async () => {
    await progressService.claimOnboardingJob(ALICE, DOMAIN, 'alice_1');
    await progressService.setProgress('alice_1', 'starting_discovery', 30, 'running');

    await progressService.releaseOnboardingJob(ALICE, DOMAIN, 'alice_stale');
    expect((await progressService.claimOnboardingJob(ALICE, DOMAIN, 'alice_2'))).toEqual({
      claimed: false,
      sessionId: 'alice_1',
    });

    await progressService.releaseOnboardingJob(ALICE, DOMAIN, 'alice_1');
    expect(await progressService.claimOnboardingJob(ALICE, DOMAIN, 'alice_3')).toEqual({
      claimed: true,
    });
  });
});
