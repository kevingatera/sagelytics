import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { hash } from 'bcryptjs';
import { eq, inArray } from 'drizzle-orm';
import type GoogleProvider from 'next-auth/providers/google';
import type postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { accounts, users, verificationTokens } from '~/server/db/schema';
import { db } from '~/server/db';
import type { authConfig as AuthConfig } from './config';
import { OAuthLinkRefused } from './oauth-link';
import { confirmEmailWithPassword, emailMatches, issueToken, resetPasswordWithToken, tokenIdentifier } from './tokens';

/**
 * Runs Google and password sign-ins through Auth.js's own request handler with this app's
 * authConfig against a real Postgres. Google's discovery and token endpoints are faked with
 * customFetch; everything after the token response (signIn and jwt callbacks, adapter, cookie
 * encoding) is the real code. Skipped unless AUTH_TEST_DATABASE_URL is set.
 */
const { url, testDb } = vi.hoisted(() => ({
  url: process.env.AUTH_TEST_DATABASE_URL,
  testDb: {} as { conn?: postgres.Sql },
}));

/** A module from the @auth/core copy that next-auth uses. */
function authCoreUrl(file: string) {
  const nextAuthRequire = createRequire(createRequire(import.meta.url).resolve('next-auth'));
  return pathToFileURL(join(dirname(nextAuthRequire.resolve('@auth/core/jwt')), file)).href;
}

// next-auth's entry imports next/server, which does not load outside Next.js.
vi.mock('next-auth', async () => {
  const errors = (await import(/* @vite-ignore */ authCoreUrl('errors.js'))) as { CredentialsSignin: unknown };
  return { CredentialsSignin: errors.CredentialsSignin };
});
vi.mock('~/env', () => ({
  env: { AUTH_SECRET: 'google-signin-test-secret', AUTH_GOOGLE_CLIENT_ID: 'test-client', AUTH_GOOGLE_CLIENT_SECRET: 'x' },
}));
vi.mock('~/server/db', async () => {
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const { default: connect } = await import('postgres');
  const schema = await import('~/server/db/schema');
  testDb.conn = connect(url ?? 'postgres://unused', { max: 4, onnotice: () => undefined });
  return { db: drizzle(testDb.conn, { schema }) };
});

interface AuthCore {
  Auth: (request: Request, config: object) => Promise<Response>;
  customFetch: symbol;
  skipCSRFCheck: symbol;
}

const ORIGIN = 'http://localhost:3000';
const ISSUER = 'https://accounts.google.com';
const SESSION_COOKIE = 'authjs.session-token';
const PASSWORD = 'attacker-password';

function fakeIdToken(claims: Record<string, unknown>) {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = { iss: ISSUER, aud: 'test-client', iat: now, exp: now + 600, ...claims };
  return `${part({ alg: 'RS256', typ: 'JWT' })}.${part(body)}.signature`;
}

/** Google as Auth.js sees it after the user approves: discovery, then a token response. */
function fakeGoogle(claims: Record<string, unknown>) {
  return async (input: RequestInfo | URL) => {
    const target = String(input instanceof Request ? input.url : input);
    if (target.endsWith('/.well-known/openid-configuration')) {
      return Response.json({
        issuer: ISSUER,
        authorization_endpoint: `${ISSUER}/o/oauth2/v2/auth`,
        token_endpoint: 'https://oauth2.googleapis.com/token',
        userinfo_endpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
        jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs',
        id_token_signing_alg_values_supported: ['RS256'],
      });
    }
    if (target === 'https://oauth2.googleapis.com/token') {
      return Response.json({
        access_token: 'access',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid email profile',
        id_token: fakeIdToken(claims),
      });
    }
    throw new Error(`unexpected fetch ${target}`);
  };
}

describe.skipIf(!url)('Google sign-in against Postgres', () => {
  const run = crypto.randomUUID().slice(0, 8);
  const ownerEmail = `owner-${run}@example.test`;
  const ids: string[] = [];
  let core: AuthCore;
  let authConfig: typeof AuthConfig;
  let Google: typeof GoogleProvider;

  async function createUser(row: {
    emailVerified: Date | null;
    password: string | null;
    googleSub?: string;
    email?: string;
    provenAt?: Date;
    idToken?: string;
  }) {
    const id = `google-signin-${run}-${ids.length}`;
    ids.push(id);
    const email = row.email ?? (ids.length === 1 ? ownerEmail : `user-${run}-${ids.length}@example.test`);
    await db.insert(users).values({ id, email, emailVerified: row.emailVerified, password: row.password });
    if (row.googleSub) {
      await db.insert(accounts).values({
        userId: id,
        type: 'oidc',
        provider: 'google',
        providerAccountId: row.googleSub,
        provenAt: row.provenAt,
        id_token: row.idToken,
      });
    }
    return { id, email };
  }

  async function loadLinks(userId: string) {
    return db.select().from(accounts).where(eq(accounts.userId, userId));
  }

  async function loadUser(id: string) {
    const [row] = await db.select().from(users).where(eq(users.id, id));
    if (!row) throw new Error('user missing');
    return row;
  }

  function config(claims: Record<string, unknown>) {
    return {
      ...authConfig,
      basePath: '/api/auth',
      trustHost: true,
      providers: [
        Google({ clientId: 'test-client', clientSecret: 'x', checks: ['none'], [core.customFetch]: fakeGoogle(claims) }),
        authConfig.providers[1],
      ],
      logger: { error: () => undefined, warn: () => undefined, debug: () => undefined },
    };
  }

  async function googleCallback(claims: Record<string, unknown>, sessionToken?: string) {
    const headers = sessionToken ? { cookie: `${SESSION_COOKIE}=${sessionToken}` } : undefined;
    return core.Auth(new Request(`${ORIGIN}/api/auth/callback/google?code=fake-code`, { headers }), config(claims));
  }

  async function passwordSignIn(email: string, password: string) {
    return core.Auth(
      new Request(`${ORIGIN}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email, password }).toString(),
      }),
      { ...config({}), skipCSRFCheck: core.skipCSRFCheck },
    );
  }

  function sessionCookie(response: Response) {
    const cookie = response.headers.getSetCookie().find((value) => value.startsWith(`${SESSION_COOKIE}=`));
    // A cleared cookie has an empty value, which is no session either.
    const value = cookie?.split(';')[0]?.slice(SESSION_COOKIE.length + 1) ?? '';
    return value.length > 0 ? value : null;
  }

  /** The cookie as the app reads it on the next request, session_version check included. */
  async function decodeSession(token: string) {
    return authConfig.jwt.decode({ token, secret: authConfig.secret!, salt: SESSION_COOKIE });
  }

  beforeAll(async () => {
    core = (await import(/* @vite-ignore */ authCoreUrl('index.js'))) as AuthCore;
    ({ authConfig } = await import('./config'));
    ({ default: Google } = await import('next-auth/providers/google'));
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    await cleanUp();
  });

  async function cleanUp() {
    if (ids.length === 0) return;
    const emails = (await db.select({ email: users.email }).from(users).where(inArray(users.id, ids))).flatMap(
      (row) => [tokenIdentifier('verify', row.email), tokenIdentifier('reset', row.email)],
    );
    if (emails.length > 0) await db.delete(verificationTokens).where(inArray(verificationTokens.identifier, emails));
    await db.delete(accounts).where(inArray(accounts.userId, ids));
    await db.delete(users).where(inArray(users.id, ids));
    ids.length = 0;
  }

  afterAll(async () => {
    await cleanUp();
    await testDb.conn?.end();
  });

  it("verifies a legacy Gmail row through the owner's Google sign-in and ends the old password", async () => {
    const googleSub = `sub-legacy-${run}`;
    const gmail = `owner-${run}@gmail.com`;
    // Created by someone else before verification existed, then linked to the owner's Google.
    const row = await createUser({ emailVerified: null, password: await hash(PASSWORD, 4), googleSub, email: gmail });

    const response = await googleCallback({ sub: googleSub, email: gmail.toUpperCase(), email_verified: true });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).not.toContain('/auth/error');
    const token = sessionCookie(response);
    expect(token).not.toBeNull();

    const after = await loadUser(row.id);
    expect(after.emailVerified).not.toBeNull();
    expect(after.password).toBeNull();
    expect(after.sessionVersion).toBe(1);
    // The owner's new session carries the bumped version, so it stays signed in.
    expect((await decodeSession(token!))?.sub).toBe(row.id);
    // Google controls the address, so this sign-in also proves the link.
    expect((await loadLinks(row.id))[0]?.provenAt).toBeInstanceOf(Date);

    const attacker = await passwordSignIn(gmail, PASSWORD);
    expect(attacker.headers.get('location')).toContain('error=CredentialsSignin');
    expect(sessionCookie(attacker)).toBeNull();
  });

  it('refuses a legacy link whose Google email differs from the stored email, with no session', async () => {
    const googleSub = `sub-mismatch-${run}`;
    const passwordHash = await hash(PASSWORD, 4);
    const row = await createUser({ emailVerified: null, password: passwordHash, googleSub });
    // Even a verified row is refused: the link itself is not trusted.
    const verifiedRow = await createUser({ emailVerified: new Date(), password: null, googleSub: `${googleSub}-2` });

    for (const [target, sub] of [[row, googleSub], [verifiedRow, `${googleSub}-2`]] as const) {
      const response = await googleCallback({ sub, email: `someone-else-${run}@gmail.test`, email_verified: true });
      expect(response.headers.get('location')).toBe(`${ORIGIN}/auth/error?error=GoogleEmailMismatch`);
      expect(sessionCookie(response)).toBeNull();
      const after = await loadUser(target.id);
      expect(after.sessionVersion).toBe(0);
    }
    const after = await loadUser(row.id);
    expect(after.emailVerified).toBeNull();
    expect(after.password).toBe(passwordHash);
    const links = await db.select().from(accounts).where(inArray(accounts.userId, ids));
    expect(links).toHaveLength(2);
  });

  it('refuses a linked account when Google does not report the email as verified', async () => {
    const googleSub = `sub-unverified-${run}`;
    const row = await createUser({ emailVerified: null, password: null, googleSub });
    const response = await googleCallback({ sub: googleSub, email: ownerEmail, email_verified: false });
    expect(response.headers.get('location')).toBe(`${ORIGIN}/auth/error?error=GoogleEmailUnverified`);
    expect(sessionCookie(response)).toBeNull();
    expect((await loadUser(row.id)).emailVerified).toBeNull();
  });

  it('refuses an address Google does not control through a legacy link to an unverified row, changing nothing', async () => {
    const googleSub = `sub-stale-${run}`;
    const passwordHash = await hash(PASSWORD, 4);
    // The owner's row, linked before the link guard to a former mailbox holder's Google account.
    const row = await createUser({ emailVerified: null, password: passwordHash, googleSub });

    const response = await googleCallback({ sub: googleSub, email: ownerEmail, email_verified: true });
    expect(response.headers.get('location')).toBe(`${ORIGIN}/auth/error?error=GoogleLinkUnproven`);
    expect(sessionCookie(response)).toBeNull();

    const after = await loadUser(row.id);
    expect(after.emailVerified).toBeNull();
    expect(after.password).toBe(passwordHash);
    expect(after.sessionVersion).toBe(0);
    expect(await loadLinks(row.id)).toHaveLength(1);
  });

  it('refuses an unproven legacy link to a verified row for an address Google does not control', async () => {
    const googleSub = `sub-verified-${run}`;
    const passwordHash = await hash(PASSWORD, 4);
    const verifiedAt = new Date('2026-01-01T00:00:00Z');
    const row = await createUser({ emailVerified: verifiedAt, password: passwordHash, googleSub });

    const response = await googleCallback({ sub: googleSub, email: ownerEmail, email_verified: true });
    expect(response.headers.get('location')).toBe(`${ORIGIN}/auth/error?error=GoogleLinkUnproven`);
    expect(sessionCookie(response)).toBeNull();

    const after = await loadUser(row.id);
    expect(after.password).toBe(passwordHash);
    expect(after.sessionVersion).toBe(0);
    expect(after.emailVerified?.toISOString()).toBe(verifiedAt.toISOString());
  });

  it("drops the former holder's unproven link when the owner resets the password", async () => {
    const googleSub = `sub-reset-${run}`;
    const row = await createUser({ emailVerified: null, password: await hash(PASSWORD, 4), googleSub });

    const reset = await issueToken(db, 'reset', ownerEmail, 60_000);
    expect(await resetPasswordWithToken(db, reset, await hash('owner-password', 4))).toBe(true);
    expect(await loadLinks(row.id)).toHaveLength(0);

    // An unlinked Google account for an address Google doesn't control is refused before
    // Auth.js looks for the existing row.
    const response = await googleCallback({ sub: googleSub, email: ownerEmail, email_verified: true });
    expect(response.headers.get('location')).toBe(`${ORIGIN}/auth/error?error=GoogleEmailUnmanaged`);
    expect(sessionCookie(response)).toBeNull();
    expect(await loadLinks(row.id)).toHaveLength(0);
    const after = await loadUser(row.id);
    expect(after.sessionVersion).toBe(1);
    expect(after.password).not.toBeNull();

    // The owner's new password works.
    expect(sessionCookie(await passwordSignIn(ownerEmail, 'owner-password'))).not.toBeNull();
  });

  it('drops unproven links when the owner confirms the email, and keeps proven and Gmail links', async () => {
    // Plain-text "hashes" keep this fast; the route passes bcrypt.
    const compare = async (password: string, stored: string) => stored === `h:${password}`;
    const row = await createUser({ emailVerified: null, password: 'h:owner', googleSub: `sub-confirm-${run}` });
    await db.insert(accounts).values({
      userId: row.id,
      type: 'oidc',
      provider: 'google',
      providerAccountId: `sub-confirm-proven-${run}`,
      provenAt: new Date(),
    });
    const verify = await issueToken(db, 'verify', ownerEmail, 60_000);
    expect(await confirmEmailWithPassword(db, verify, 'owner', { compare })).toBe('verified');
    expect((await loadLinks(row.id)).map((link) => link.providerAccountId)).toEqual([`sub-confirm-proven-${run}`]);

    const gmail = `gmail-${run}@gmail.com`;
    const gmailRow = await createUser({ emailVerified: null, password: 'h:x', googleSub: `sub-gmail-${run}`, email: gmail });
    const reset = await issueToken(db, 'reset', gmail, 60_000);
    expect(await resetPasswordWithToken(db, reset, 'h:y')).toBe(true);
    expect(await loadLinks(gmailRow.id)).toHaveLength(1);
  });

  it('treats a Workspace account whose hd is the email domain like Gmail', async () => {
    const domain = `ws-${run}.test`;
    const email = `owner@${domain}`;
    const googleSub = `sub-hd-${run}`;
    const row = await createUser({ emailVerified: null, password: await hash(PASSWORD, 4), googleSub, email });

    const response = await googleCallback({ sub: googleSub, email, email_verified: true, hd: domain.toUpperCase() });
    expect(response.headers.get('location')).toBe(ORIGIN);
    const token = sessionCookie(response);
    expect((await decodeSession(token!))?.sub).toBe(row.id);
    const after = await loadUser(row.id);
    expect(after.emailVerified).not.toBeNull();
    expect(after.password).toBeNull();
    expect(after.sessionVersion).toBe(1);
  });

  it('treats an hd that is not the email domain as an address Google does not control', async () => {
    const googleSub = `sub-hd-other-${run}`;
    const passwordHash = await hash(PASSWORD, 4);
    const row = await createUser({ emailVerified: null, password: passwordHash, googleSub });

    const response = await googleCallback({ sub: googleSub, email: ownerEmail, email_verified: true, hd: `other-${run}.test` });
    expect(response.headers.get('location')).toBe(`${ORIGIN}/auth/error?error=GoogleLinkUnproven`);
    expect(sessionCookie(response)).toBeNull();
    const after = await loadUser(row.id);
    expect(after.emailVerified).toBeNull();
    expect(after.password).toBe(passwordHash);
    expect(after.sessionVersion).toBe(0);
  });

  it('keeps a proven Google link to a verified row working, with the password', async () => {
    const passwordHash = await hash(PASSWORD, 4);
    const googleSub = `sub-proven-${run}`;
    const row = await createUser({
      emailVerified: new Date('2026-01-01T00:00:00Z'),
      password: passwordHash,
      googleSub,
      provenAt: new Date(),
    });
    const claims = { sub: googleSub, email: ownerEmail, email_verified: true };

    const response = await googleCallback(claims);
    expect(response.headers.get('location')).toBe(ORIGIN);
    expect((await decodeSession(sessionCookie(response)!))?.sub).toBe(row.id);
    const after = await loadUser(row.id);
    expect(after.password).toBe(passwordHash);
    expect(after.sessionVersion).toBe(0);

    // A reset keeps a proven link.
    const reset = await issueToken(db, 'reset', ownerEmail, 60_000);
    expect(await resetPasswordWithToken(db, reset, passwordHash)).toBe(true);
    expect(await loadLinks(row.id)).toHaveLength(1);
  });

  describe('new Google accounts (F1)', () => {
    async function rowsFor(email: string) {
      return db.select().from(users).where(emailMatches(email));
    }

    it('refuses a Google sign-up for an address Google does not control, creating nothing', async () => {
      const email = `newcomer-${run}@example.test`;
      const response = await googleCallback({ sub: `sub-new-${run}`, email, email_verified: true });
      expect(response.headers.get('location')).toBe(`${ORIGIN}/auth/error?error=GoogleEmailUnmanaged`);
      expect(sessionCookie(response)).toBeNull();
      expect(await rowsFor(email)).toHaveLength(0);

      // An hd for another domain does not help.
      const other = await googleCallback({ sub: `sub-new-${run}`, email, email_verified: true, hd: `other-${run}.test` });
      expect(other.headers.get('location')).toBe(`${ORIGIN}/auth/error?error=GoogleEmailUnmanaged`);
      expect(await rowsFor(email)).toHaveLength(0);
    });

    it("leaves a former mailbox holder no way in after the owner registers and resets", async () => {
      const formerSub = `sub-former-${run}`;
      const claims = { sub: formerSub, email: ownerEmail, email_verified: true };
      // The former holder tries first: refused, so nothing exists that could outlive a reset.
      expect((await googleCallback(claims)).headers.get('location')).toContain('error=GoogleEmailUnmanaged');

      const owner = await createUser({ emailVerified: null, password: await hash('owner-first', 4) });
      const reset = await issueToken(db, 'reset', ownerEmail, 60_000);
      expect(await resetPasswordWithToken(db, reset, await hash('owner-password', 4))).toBe(true);

      const response = await googleCallback(claims);
      expect(response.headers.get('location')).toBe(`${ORIGIN}/auth/error?error=GoogleEmailUnmanaged`);
      expect(sessionCookie(response)).toBeNull();
      expect(await loadLinks(owner.id)).toHaveLength(0);
      expect(await rowsFor(ownerEmail)).toHaveLength(1);
      expect(sessionCookie(await passwordSignIn(ownerEmail, 'owner-password'))).not.toBeNull();
    });

    it('creates a verified row with a proven link for a Gmail or matching-hd sign-up', async () => {
      const gmail = `new-${run}@gmail.com`;
      const domain = `new-ws-${run}.test`;
      for (const claims of [
        { sub: `sub-new-gmail-${run}`, email: gmail, email_verified: true },
        { sub: `sub-new-hd-${run}`, email: `new@${domain}`, email_verified: true, hd: domain },
      ]) {
        const response = await googleCallback(claims);
        expect(response.headers.get('location')).toBe(ORIGIN);
        const [row] = await rowsFor(claims.email);
        if (!row) throw new Error('no row created');
        ids.push(row.id);
        expect(row.emailVerified).toBeInstanceOf(Date);
        expect(row.password).toBeNull();
        const [link] = await loadLinks(row.id);
        expect(link?.providerAccountId).toBe(claims.sub);
        expect(link?.provenAt).toBeInstanceOf(Date);
        expect((await decodeSession(sessionCookie(response)!))?.sub).toBe(row.id);

        // Signing in again goes through the link and changes nothing.
        const again = await googleCallback(claims);
        expect((await decodeSession(sessionCookie(again)!))?.sub).toBe(row.id);
        expect((await loadUser(row.id)).sessionVersion).toBe(row.sessionVersion);
      }
    });
  });

  describe('linking while signed in (F2)', () => {
    async function passwordSession(email: string, password: string) {
      const token = sessionCookie(await passwordSignIn(email, password));
      if (!token) throw new Error('password sign-in failed');
      return token;
    }

    it('never links Google to the signed-in account, even for a current session', async () => {
      const gmail = `linker-${run}@gmail.com`;
      const row = await createUser({ emailVerified: new Date(), password: await hash(PASSWORD, 4), email: gmail });
      const session = await passwordSession(gmail, PASSWORD);
      expect((await decodeSession(session))?.sub).toBe(row.id);

      const response = await googleCallback({ sub: `sub-link-${run}`, email: gmail, email_verified: true }, session);
      expect(response.headers.get('location')).toContain('error=OAuthAccountNotLinked');
      expect(await loadLinks(row.id)).toHaveLength(0);
    });

    it('adds no link when a reset commits while the callback is running', async () => {
      const gmail = `racer-${run}@gmail.com`;
      const row = await createUser({ emailVerified: new Date(), password: await hash(PASSWORD, 4), email: gmail });
      const session = await passwordSession(gmail, PASSWORD);
      const reset = await issueToken(db, 'reset', gmail, 60_000);

      // The session is current when Auth.js decodes the cookie in the callback; the reset
      // commits right after, before Auth.js decides whether to link.
      const base = config({ sub: `sub-race-${run}`, email: gmail, email_verified: true });
      let resetDone = false;
      let decodedSub: unknown;
      const racing = {
        ...base,
        jwt: {
          ...base.jwt,
          decode: async (params: Parameters<typeof base.jwt.decode>[0]) => {
            const decoded = await base.jwt.decode(params);
            if (!resetDone) {
              resetDone = true;
              decodedSub = decoded?.sub;
              expect(await resetPasswordWithToken(db, reset, await hash('owner-password', 4))).toBe(true);
            }
            return decoded;
          },
        },
      };
      const response = await core.Auth(
        new Request(`${ORIGIN}/api/auth/callback/google?code=fake-code`, {
          headers: { cookie: `${SESSION_COOKIE}=${session}` },
        }),
        racing,
      );
      expect(decodedSub).toBe(row.id);
      expect(response.headers.get('location')).toContain('error=OAuthAccountNotLinked');
      expect(await loadLinks(row.id)).toHaveLength(0);
      expect((await decodeSession(session))?.sub).toBeUndefined();
      expect((await loadUser(row.id)).sessionVersion).toBe(1);
    });

    it('serialises a link insert with a recovery that holds the user row', async () => {
      const gmail = `locked-${run}@gmail.com`;
      const row = await createUser({ emailVerified: null, password: null, email: gmail });
      const googleSub = `sub-locked-${run}`;
      const account = {
        userId: row.id,
        type: 'oidc' as const,
        provider: 'google',
        providerAccountId: googleSub,
        id_token: fakeIdToken({ sub: googleSub, email: gmail, email_verified: true }),
      };

      let settled = false;
      let linking: Promise<unknown> | undefined;
      await testDb.conn!.begin(async (sql) => {
        // What a reset or confirmation does first: update the row, which locks it.
        await sql`update sg_user set session_version = session_version + 1 where id = ${row.id}`;
        linking = Promise.resolve(authConfig.adapter.linkAccount!(account)).then(
          () => (settled = true),
          (error: unknown) => {
            settled = true;
            throw error;
          },
        );
        linking.catch(() => undefined);
        await new Promise((resolve) => setTimeout(resolve, 300));
        expect(settled).toBe(false);
        // The recovery moves the account to another address before it commits.
        await sql`update sg_user set email = ${`moved-${run}@gmail.com`} where id = ${row.id}`;
      });
      await expect(linking).rejects.toBeInstanceOf(OAuthLinkRefused);
      expect(await loadLinks(row.id)).toHaveLength(0);
    });
  });

  describe('mixed-case legacy addresses (S1)', () => {
    it('finds the legacy row after a dropped link instead of creating a second one', async () => {
      const domain = `legacy-${run}.test`;
      const stored = `Owner.Mixed@${domain.toUpperCase()}`;
      const email = stored.toLowerCase();
      const googleSub = `sub-mixed-${run}`;
      // A Workspace link whose stored id_token has no hd, so recovery drops it.
      const row = await createUser({ emailVerified: null, password: await hash(PASSWORD, 4), googleSub, email: stored });
      const reset = await issueToken(db, 'reset', email, 60_000);
      expect(await resetPasswordWithToken(db, reset, await hash('owner-password', 4))).toBe(true);
      expect(await loadLinks(row.id)).toHaveLength(0);

      const response = await googleCallback({ sub: googleSub, email, email_verified: true, hd: domain });
      expect(response.headers.get('location')).toContain('error=OAuthAccountNotLinked');
      expect(sessionCookie(response)).toBeNull();
      const rows = await db.select().from(users).where(emailMatches(email));
      expect(rows.map((r) => r.id)).toEqual([row.id]);
      expect(sessionCookie(await passwordSignIn(email, 'owner-password'))).not.toBeNull();
    });

    it('refuses to create a row for an address a legacy row holds in another case', async () => {
      const stored = `Legacy.${run}@Gmail.com`;
      await createUser({ emailVerified: new Date(), password: null, email: stored });
      await expect(
        authConfig.adapter.createUser!({ id: 'ignored', email: stored.toLowerCase(), emailVerified: null }),
      ).rejects.toThrow();
      const rows = await db.select().from(users).where(emailMatches(stored));
      expect(rows).toHaveLength(1);
      expect((await authConfig.adapter.getUserByEmail!(stored.toLowerCase()))?.email).toBe(stored);
    });
  });
});
