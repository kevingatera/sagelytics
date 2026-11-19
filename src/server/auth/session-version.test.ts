import { describe, expect, it, vi } from 'vitest';

import { SESSION_CHECK_INTERVAL_MS, checkSessionVersion } from './session-version';

const NOW = Date.UTC(2026, 0, 1);

describe('checkSessionVersion', () => {
  it('keeps a token whose version matches and records the check time', async () => {
    const load = vi.fn(async () => 2);
    const token = await checkSessionVersion({ id: 'u1', sessionVersion: 2, svCheckedAt: 0 }, load, NOW);
    expect(token).toMatchObject({ id: 'u1', sessionVersion: 2, svCheckedAt: NOW });
    expect(load).toHaveBeenCalledWith('u1');
  });

  it('rejects a token minted before the version was bumped', async () => {
    const token = await checkSessionVersion(
      { id: 'u1', sessionVersion: 0, svCheckedAt: 0 },
      async () => 1,
      NOW,
    );
    expect(token).toBeNull();
  });

  it('rejects a token for a deleted user', async () => {
    expect(await checkSessionVersion({ id: 'u1', sessionVersion: 0 }, async () => null, NOW)).toBeNull();
  });

  it('skips the database within the check interval', async () => {
    const load = vi.fn(async () => 5);
    const token = { id: 'u1', sessionVersion: 0, svCheckedAt: NOW - SESSION_CHECK_INTERVAL_MS + 1 };
    expect(await checkSessionVersion(token, load, NOW)).toBe(token);
    expect(load).not.toHaveBeenCalled();
  });

  it('treats tokens from before session versions existed as version 0', async () => {
    expect(await checkSessionVersion({ id: 'u1' }, async () => 0, NOW)).toMatchObject({ sessionVersion: 0 });
    expect(await checkSessionVersion({ id: 'u1' }, async () => 1, NOW)).toBeNull();
  });

  it('keeps the token when the lookup fails, and retries next time', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const token = { id: 'u1', sessionVersion: 0, svCheckedAt: 0 };
    expect(await checkSessionVersion(token, async () => Promise.reject(new Error('db down')), NOW)).toBe(token);
  });
});
