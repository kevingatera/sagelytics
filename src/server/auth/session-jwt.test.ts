import { describe, expect, it, vi } from 'vitest';
import type { JWT } from 'next-auth/jwt';

import { createSessionDecode, resolveSessionToken } from './session-jwt';

const params = { token: 'cookie', secret: 's', salt: 'authjs.session-token' };

function decoderFor(payload: JWT | null, load: (id: string) => Promise<number | null>) {
  return createSessionDecode(load, async () => (payload ? { ...payload } : null));
}

describe('createSessionDecode', () => {
  it('returns a current session with its subject and checks the version once per request', async () => {
    const load = vi.fn(async () => 2);
    const decode = decoderFor({ id: 'u1', sub: 'u1', sessionVersion: 2 }, load);
    const token = await decode(params);
    expect(token).toMatchObject({ id: 'u1', sub: 'u1', svVerified: true });
    // The jwt callback gets the same object and does not query again.
    expect(await resolveSessionToken(token!, load)).toBe(token);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('hides a revoked session from Auth.js, so the OAuth callback sees no signed-in user', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const load = vi.fn(async () => 3);
    const token = await decoderFor({ id: 'u1', sub: 'u1', sessionVersion: 2 }, load)(params);
    expect(token?.sub).toBeUndefined();
    expect(await resolveSessionToken(token!, load)).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('hides the subject when the version lookup fails, but keeps the session for reads', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const load = vi.fn(async () => Promise.reject(new Error('db down')));
    const token = await decoderFor({ id: 'u1', sub: 'u1', sessionVersion: 0 }, load)(params);
    expect(token?.sub).toBeUndefined();
    expect(await resolveSessionToken(token!, load)).toMatchObject({ id: 'u1', sub: 'u1', svVerified: false });
  });

  it('refuses tokens without a user id', async () => {
    const load = vi.fn(async () => 0);
    const token = await decoderFor({ sub: 'u1' }, load)(params);
    expect(token).toEqual({});
    expect(await resolveSessionToken(token!, load)).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it('passes through a cookie that does not decode', async () => {
    expect(await decoderFor(null, async () => 0)(params)).toBeNull();
  });

  it('checks tokens that did not come from the decoder', async () => {
    const load = vi.fn(async () => 1);
    expect(await resolveSessionToken({ id: 'u1', sessionVersion: 1 }, load)).toMatchObject({ svVerified: true });
    expect(load).toHaveBeenCalledTimes(1);
  });
});
