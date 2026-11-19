import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import type { AdapterAccount, AdapterUser } from 'next-auth/adapters';
import type { JWT } from 'next-auth/jwt';

import { OAuthLinkRefused, googleSignInRefusal, guardLinkAccount, idTokenEmail } from './oauth-link';
import { createSessionDecode } from './session-jwt';

function idToken(claims: Record<string, unknown>) {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${part({ alg: 'RS256' })}.${part(claims)}.signature`;
}

function googleAccount(userId: string, claims: Record<string, unknown>): AdapterAccount {
  return {
    userId,
    type: 'oidc',
    provider: 'google',
    providerAccountId: 'google-sub-1',
    id_token: idToken(claims),
  };
}

describe('idTokenEmail', () => {
  it('reads the email claims', () => {
    expect(idTokenEmail(idToken({ email: 'a@example.test', email_verified: true }))).toEqual({
      email: 'a@example.test',
      email_verified: true,
    });
  });

  it('returns null for anything that is not a JWT', () => {
    expect(idTokenEmail(undefined)).toBeNull();
    expect(idTokenEmail('nope')).toBeNull();
    expect(idTokenEmail('a.!!!.c')).toBeNull();
  });
});

describe('guardLinkAccount', () => {
  const stored = async (id: string) => (id === 'u1' ? 'Owner@Example.test' : null);

  it('links when Google verified the stored email, ignoring case', async () => {
    const link = vi.fn();
    await guardLinkAccount(link, stored)(googleAccount('u1', { email: 'owner@example.TEST', email_verified: true }));
    expect(link).toHaveBeenCalledOnce();
  });

  it('refuses a Google account whose email differs from the stored one', async () => {
    const link = vi.fn();
    await expect(
      guardLinkAccount(link, stored)(googleAccount('u1', { email: 'attacker@gmail.test', email_verified: true })),
    ).rejects.toBeInstanceOf(OAuthLinkRefused);
    expect(link).not.toHaveBeenCalled();
  });

  it('refuses when Google has not verified the email or sent no id_token', async () => {
    const link = vi.fn();
    const guarded = guardLinkAccount(link, stored);
    await expect(guarded(googleAccount('u1', { email: 'owner@example.test' }))).rejects.toBeInstanceOf(OAuthLinkRefused);
    await expect(
      guarded({ userId: 'u1', type: 'oidc', provider: 'google', providerAccountId: 'x' }),
    ).rejects.toBeInstanceOf(OAuthLinkRefused);
    expect(link).not.toHaveBeenCalled();
  });
});

describe('googleSignInRefusal', () => {
  const verified = { email: 'Owner@Example.test', email_verified: true };

  it('allows a verified Google email that matches the linked account, ignoring case', () => {
    expect(googleSignInRefusal(verified, ' owner@example.TEST')).toBeNull();
  });

  it('allows a verified Google email with no linked account (Auth.js decides about new users)', () => {
    expect(googleSignInRefusal(verified, null)).toBeNull();
  });

  it('refuses a linked account whose stored email differs from Google', () => {
    expect(googleSignInRefusal({ email: 'attacker@gmail.test', email_verified: true }, 'owner@example.test')).toBe(
      'GoogleEmailMismatch',
    );
  });

  it('refuses when Google has not verified the email, linked or not', () => {
    expect(googleSignInRefusal({ email: 'owner@example.test', email_verified: false }, 'owner@example.test')).toBe(
      'GoogleEmailUnverified',
    );
    expect(googleSignInRefusal({ email: 'owner@example.test' }, null)).toBe('GoogleEmailUnverified');
    expect(googleSignInRefusal({ email_verified: true }, null)).toBe('GoogleEmailUnverified');
    expect(googleSignInRefusal(undefined, null)).toBe('GoogleEmailUnverified');
  });
});

/**
 * Drives Auth.js's own OAuth login handler (the code that decodes the session cookie and links
 * the provider account) with this app's decoder and guarded linkAccount. It imports an internal
 * module, so an Auth.js upgrade that moves it fails here and the boundary gets rechecked.
 */
type HandleLogin = (
  sessionToken: string | undefined,
  profile: AdapterUser,
  account: AdapterAccount,
  options: unknown,
) => Promise<{ user: AdapterUser; isNewUser?: boolean }>;

async function loadHandleLogin(): Promise<HandleLogin> {
  const req = createRequire(import.meta.url);
  const nextAuthRequire = createRequire(req.resolve('next-auth'));
  const coreRoot = dirname(nextAuthRequire.resolve('@auth/core/jwt'));
  const mod = (await import(pathToFileURL(join(coreRoot, 'lib/actions/callback/handle-login.js')).href)) as {
    handleLoginOrRegister: HandleLogin;
  };
  return mod.handleLoginOrRegister;
}

describe('OAuth callback linking with a session cookie', () => {
  const owner: AdapterUser = { id: 'u1', email: 'owner@example.test', emailVerified: new Date() };

  function setup({ dbVersion, cookie }: { dbVersion: number; cookie: JWT }) {
    const baseLink = vi.fn();
    const created: AdapterUser[] = [];
    const adapter = {
      getUser: vi.fn(async (id: string) => (id === owner.id ? owner : null)),
      getUserByAccount: vi.fn(async () => null),
      getUserByEmail: vi.fn(async (email: string) => (email === owner.email ? owner : null)),
      createUser: vi.fn(async (user: AdapterUser) => {
        const row = { ...user, id: `new-${created.length}` };
        created.push(row);
        return row;
      }),
      linkAccount: guardLinkAccount(
        baseLink,
        async (id) => [owner, ...created].find((user) => user.id === id)?.email ?? null,
      ),
    };
    const decode = createSessionDecode(
      async (id) => (id === owner.id ? dbVersion : null),
      async () => ({ ...cookie }),
    );
    const options = {
      adapter,
      jwt: { decode, secret: 'test' },
      events: {},
      session: { strategy: 'jwt', generateSessionToken: () => 'unused' },
      cookies: { sessionToken: { name: 'authjs.session-token' } },
      provider: { id: 'google', account: (tokens: object) => tokens },
    };
    return { adapter, baseLink, created, options };
  }

  const attackerProfile: AdapterUser = { id: 'p1', email: 'attacker@gmail.test', emailVerified: null };
  const attackerAccount = googleAccount('', { email: 'attacker@gmail.test', email_verified: true });
  vi.spyOn(console, 'log').mockImplementation(() => undefined);

  it('does not link Google to the account of a session a password reset revoked', async () => {
    const handleLogin = await loadHandleLogin();
    // The cookie carries version 0; a reset has since moved the account to version 1.
    const { baseLink, created, options } = setup({
      dbVersion: 1,
      cookie: { id: owner.id, sub: owner.id, sessionVersion: 0 },
    });
    const result = await handleLogin('cookie', attackerProfile, { ...attackerAccount }, options);
    // Treated as signed out: the Google login gets its own new account, not the owner's.
    expect(result.user.id).not.toBe(owner.id);
    expect(created).toHaveLength(1);
    expect(baseLink).toHaveBeenCalledTimes(1);
    expect(baseLink.mock.calls[0]![0]).toMatchObject({ userId: created[0]!.id });
  });

  it('refuses a revoked session even when the Google email matches the account', async () => {
    const handleLogin = await loadHandleLogin();
    // Only the version check stands in the way here: the email guard alone would allow it.
    const { baseLink, options } = setup({
      dbVersion: 1,
      cookie: { id: owner.id, sub: owner.id, sessionVersion: 0 },
    });
    const profile: AdapterUser = { id: 'p3', email: owner.email, emailVerified: null };
    const account = googleAccount('', { email: owner.email, email_verified: true });
    // Signed out with an existing email, Auth.js refuses to link instead of attaching it.
    await expect(handleLogin('cookie', profile, account, options)).rejects.toMatchObject({
      type: 'OAuthAccountNotLinked',
    });
    expect(baseLink).not.toHaveBeenCalled();
  });

  it('does not link a Google account whose verified email differs from the account email', async () => {
    const handleLogin = await loadHandleLogin();
    const { baseLink, options } = setup({
      dbVersion: 0,
      cookie: { id: owner.id, sub: owner.id, sessionVersion: 0 },
    });
    await expect(handleLogin('cookie', attackerProfile, { ...attackerAccount }, options)).rejects.toBeInstanceOf(
      OAuthLinkRefused,
    );
    expect(baseLink).not.toHaveBeenCalled();
  });

  it('links Google to a current session when Google verified the same email', async () => {
    const handleLogin = await loadHandleLogin();
    const { baseLink, options } = setup({
      dbVersion: 0,
      cookie: { id: owner.id, sub: owner.id, sessionVersion: 0 },
    });
    const profile: AdapterUser = { id: 'p2', email: owner.email, emailVerified: null };
    const account = googleAccount('', { email: owner.email, email_verified: true });
    const result = await handleLogin('cookie', profile, account, options);
    expect(result.user.id).toBe(owner.id);
    expect(baseLink.mock.calls[0]![0]).toMatchObject({ userId: owner.id, provider: 'google' });
  });
});
