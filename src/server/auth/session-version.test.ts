import { describe, expect, it, vi } from 'vitest';

import { checkSessionVersion } from './session-version';

describe('checkSessionVersion', () => {
  it('keeps a token whose version matches and marks it verified', async () => {
    const load = vi.fn(async () => 2);
    const token = await checkSessionVersion({ id: 'u1', sessionVersion: 2 }, load);
    expect(token).toMatchObject({ id: 'u1', sessionVersion: 2, svVerified: true });
    expect(load).toHaveBeenCalledWith('u1');
  });

  it('rejects a token minted before the version was bumped', async () => {
    expect(await checkSessionVersion({ id: 'u1', sessionVersion: 0 }, async () => 1)).toBeNull();
  });

  it('rejects a token for a deleted user', async () => {
    expect(await checkSessionVersion({ id: 'u1', sessionVersion: 0 }, async () => null)).toBeNull();
  });

  it('checks the database on every call, with no grace interval', async () => {
    const load = vi.fn(async () => 0);
    const first = await checkSessionVersion({ id: 'u1', sessionVersion: 0 }, load);
    expect(first).not.toBeNull();
    load.mockResolvedValue(1);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    // Immediately after a reset commits, the very next request is refused.
    expect(await checkSessionVersion(first!, load)).toBeNull();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('treats tokens from before session versions existed as version 0', async () => {
    expect(await checkSessionVersion({ id: 'u1' }, async () => 0)).toMatchObject({ sessionVersion: 0 });
    expect(await checkSessionVersion({ id: 'u1' }, async () => 1)).toBeNull();
  });

  it('keeps the token but marks it unverified when the lookup fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const token = await checkSessionVersion(
      { id: 'u1', sessionVersion: 0, svVerified: true },
      async () => Promise.reject(new Error('db down')),
    );
    expect(token).toMatchObject({ id: 'u1', svVerified: false });
  });
});
