import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { hash } from 'bcryptjs';
import { eq, inArray } from 'drizzle-orm';
import type GoogleProvider from 'next-auth/providers/google';
import type postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { accounts, users } from '~/server/db/schema';
import { db } from '~/server/db';
import type { authConfig as AuthConfig } from './config';

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

  async function createUser(row: { emailVerified: Date | null; password: string | null; googleSub: string }) {
    const id = `google-signin-${run}-${ids.length}`;
    ids.push(id);
    const email = ids.length === 1 ? ownerEmail : `user-${run}-${ids.length}@example.test`;
    await db.insert(users).values({ id, email, emailVerified: row.emailVerified, password: row.password });
    await db.insert(accounts).values({
      userId: id,
      type: 'oidc',
      provider: 'google',
      providerAccountId: row.googleSub,
    });
    return { id, email };
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

  async function googleCallback(claims: Record<string, unknown>) {
    return core.Auth(new Request(`${ORIGIN}/api/auth/callback/google?code=fake-code`), config(claims));
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
    await db.delete(accounts).where(inArray(accounts.userId, ids));
    await db.delete(users).where(inArray(users.id, ids));
    ids.length = 0;
  }

  afterAll(async () => {
    await cleanUp();
    await testDb.conn?.end();
  });

  it("verifies a legacy row through the owner's Google sign-in and ends the old password", async () => {
    const googleSub = `sub-legacy-${run}`;
    // Created by someone else before verification existed, then linked to the owner's Google.
    const row = await createUser({ emailVerified: null, password: await hash(PASSWORD, 4), googleSub });

    const response = await googleCallback({ sub: googleSub, email: ownerEmail.toUpperCase(), email_verified: true });
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

    const attacker = await passwordSignIn(ownerEmail, PASSWORD);
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

  it('signs in a verified account whose Google email matches, keeping its password', async () => {
    const googleSub = `sub-verified-${run}`;
    const passwordHash = await hash(PASSWORD, 4);
    const verifiedAt = new Date('2026-01-01T00:00:00Z');
    const row = await createUser({ emailVerified: verifiedAt, password: passwordHash, googleSub });

    const response = await googleCallback({ sub: googleSub, email: ownerEmail, email_verified: true });
    expect(response.headers.get('location')).toBe(ORIGIN);
    const token = sessionCookie(response);
    expect((await decodeSession(token!))?.sub).toBe(row.id);

    const after = await loadUser(row.id);
    expect(after.password).toBe(passwordHash);
    expect(after.sessionVersion).toBe(0);
    expect(after.emailVerified?.toISOString()).toBe(verifiedAt.toISOString());

    const password = await passwordSignIn(ownerEmail, PASSWORD);
    expect(sessionCookie(password)).not.toBeNull();
  });
});
