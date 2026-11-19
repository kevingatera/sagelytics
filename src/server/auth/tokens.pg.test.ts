import { eq, like } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import * as schema from '~/server/db/schema';
import { checkSessionVersion } from './session-version';
import {
  hashToken,
  issueToken,
  resetPasswordWithToken,
  tokenIdentifier,
  verifyEmailWithToken,
} from './tokens';

/**
 * Runs against a real Postgres with the current schema (`pnpm db:push --force`). Skipped
 * unless AUTH_TEST_DATABASE_URL is set, so `pnpm test` never needs a database.
 */
const url = process.env.AUTH_TEST_DATABASE_URL;

describe.skipIf(!url)('auth tokens against Postgres', () => {
  const conn = postgres(url ?? 'postgres://unused', { max: 8, onnotice: () => undefined });
  const database = drizzle(conn, { schema });
  const run = crypto.randomUUID().slice(0, 8);
  const userId = `auth-test-${run}`;
  const email = `auth-test-${run}@example.test`;

  async function loadUser() {
    const [user] = await database.select().from(schema.users).where(eq(schema.users.id, userId));
    if (!user) throw new Error('test user missing');
    return user;
  }

  async function loadSessionVersion(id: string) {
    const [row] = await database
      .select({ v: schema.users.sessionVersion })
      .from(schema.users)
      .where(eq(schema.users.id, id));
    return row ? row.v : null;
  }

  beforeAll(async () => {
    // Stored with mixed case, as accounts created before normalization may be.
    await database.insert(schema.users).values({
      id: userId,
      email: email.toUpperCase(),
      password: 'old-hash',
      emailVerified: null,
    });
  });

  beforeEach(async () => {
    await database
      .delete(schema.verificationTokens)
      .where(like(schema.verificationTokens.identifier, `%${email}`));
    await database
      .update(schema.users)
      .set({ emailVerified: null, password: 'old-hash', sessionVersion: 0 })
      .where(eq(schema.users.id, userId));
  });

  afterAll(async () => {
    await database
      .delete(schema.verificationTokens)
      .where(like(schema.verificationTokens.identifier, `%${email}`));
    await database.delete(schema.users).where(eq(schema.users.id, userId));
    await conn.end();
  });

  it('stores only a hash of a high-entropy token', async () => {
    const raw = await issueToken(database, 'verify', email, 60_000);
    expect(raw).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const rows = await database
      .select()
      .from(schema.verificationTokens)
      .where(eq(schema.verificationTokens.identifier, tokenIdentifier('verify', email)));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.token).toBe(hashToken(raw));
    expect(rows[0]?.token).not.toBe(raw);
  });

  it('verifies the email once; the same link then fails', async () => {
    const raw = await issueToken(database, 'verify', email, 60_000);
    expect(await verifyEmailWithToken(database, raw)).toBe(true);
    expect((await loadUser()).emailVerified).toBeInstanceOf(Date);
    expect(await verifyEmailWithToken(database, raw)).toBe(false);
  });

  it('refuses an expired verification token', async () => {
    const raw = await issueToken(database, 'verify', email, -1_000);
    expect(await verifyEmailWithToken(database, raw)).toBe(false);
    expect((await loadUser()).emailVerified).toBeNull();
  });

  it('lets exactly one of several concurrent verifications succeed', async () => {
    const raw = await issueToken(database, 'verify', email, 60_000);
    const results = await Promise.all(Array.from({ length: 5 }, () => verifyEmailWithToken(database, raw)));
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('does not accept a reset token as a verification token, or the reverse', async () => {
    const reset = await issueToken(database, 'reset', email, 60_000);
    expect(await verifyEmailWithToken(database, reset)).toBe(false);
    const verify = await issueToken(database, 'verify', email, 60_000);
    expect(await resetPasswordWithToken(database, verify, 'new-hash')).toBe(false);
    expect((await loadUser()).password).toBe('old-hash');
  });

  it('resets the password once under concurrency and bumps the session version', async () => {
    const raw = await issueToken(database, 'reset', email, 60_000);
    const results = await Promise.all([
      resetPasswordWithToken(database, raw, 'new-hash-a'),
      resetPasswordWithToken(database, raw, 'new-hash-b'),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);

    const user = await loadUser();
    expect(['new-hash-a', 'new-hash-b']).toContain(user.password);
    expect(user.sessionVersion).toBe(1);
    expect(user.emailVerified).toBeInstanceOf(Date);
  });

  it('refuses an expired reset token and leaves the password alone', async () => {
    const raw = await issueToken(database, 'reset', email, -1_000);
    expect(await resetPasswordWithToken(database, raw, 'new-hash')).toBe(false);
    expect((await loadUser()).password).toBe('old-hash');
  });

  it('makes the jwt check reject a session from before the reset', async () => {
    const oldToken = { id: userId, sessionVersion: 0 };
    expect(await checkSessionVersion(oldToken, loadSessionVersion)).not.toBeNull();

    const raw = await issueToken(database, 'reset', email, 60_000);
    expect(await resetPasswordWithToken(database, raw, 'new-hash')).toBe(true);

    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    expect(await checkSessionVersion(oldToken, loadSessionVersion)).toBeNull();
    expect(
      await checkSessionVersion({ id: userId, sessionVersion: 1 }, loadSessionVersion),
    ).not.toBeNull();
  });
});
