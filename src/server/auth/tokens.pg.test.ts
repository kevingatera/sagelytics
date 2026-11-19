import { eq, like } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import * as schema from '~/server/db/schema';
import { checkSessionVersion } from './session-version';
import {
  confirmEmailWithPassword,
  findTokenEmail,
  hashToken,
  issueToken,
  resetPasswordWithToken,
  tokenIdentifier,
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

  // Plain-text "hashes" keep these fast; the real route passes bcrypt.
  const compare = async (password: string, hash: string) => hash === `h:${password}`;

  async function setPassword(hash: string) {
    await database.update(schema.users).set({ password: hash }).where(eq(schema.users.id, userId));
  }

  it('confirms the email only with the account password, once', async () => {
    await setPassword('h:owner');
    const raw = await issueToken(database, 'verify', email, 60_000);
    expect(await confirmEmailWithPassword(database, raw, 'owner', { compare })).toBe('verified');
    expect((await loadUser()).emailVerified).toBeInstanceOf(Date);
    expect(await confirmEmailWithPassword(database, raw, 'owner', { compare })).toBe('invalid_token');
  });

  it('refuses to confirm a password someone else chose, and keeps the link usable', async () => {
    // An attacker registered the owner's address with their own password.
    await setPassword('h:attacker');
    const raw = await issueToken(database, 'verify', email, 60_000);
    // The owner clicks the link but does not know that password.
    expect(await confirmEmailWithPassword(database, raw, 'owner-guess', { compare })).toBe('wrong_password');
    expect((await loadUser()).emailVerified).toBeNull();
    expect(await findTokenEmail(database, 'verify', raw)).toBe(email);
  });

  it('lets the owner take the address back with a reset, which verifies and drops the link', async () => {
    await setPassword('h:attacker');
    const verify = await issueToken(database, 'verify', email, 60_000);
    const reset = await issueToken(database, 'reset', email, 60_000);
    expect(await resetPasswordWithToken(database, reset, 'h:owner')).toBe(true);

    const user = await loadUser();
    expect(user.password).toBe('h:owner');
    expect(user.emailVerified).toBeInstanceOf(Date);
    expect(await findTokenEmail(database, 'verify', verify)).toBeNull();
    // The attacker's password no longer confirms anything.
    expect(await confirmEmailWithPassword(database, verify, 'attacker', { compare })).toBe('invalid_token');
  });

  it('does not verify when the password changes between the check and the write', async () => {
    await setPassword('h:attacker');
    const raw = await issueToken(database, 'verify', email, 60_000);
    const racing = async (password: string, hash: string) => {
      const ok = await compare(password, hash);
      await setPassword('h:owner');
      return ok;
    };
    expect(await confirmEmailWithPassword(database, raw, 'attacker', { compare: racing })).toBe('stale');
    expect((await loadUser()).emailVerified).toBeNull();
    // The rollback leaves the link for the owner, who now confirms with their own password.
    expect(await confirmEmailWithPassword(database, raw, 'owner', { compare })).toBe('verified');
  });

  it('stops before the password check when the attempt is not allowed', async () => {
    await setPassword('h:owner');
    const raw = await issueToken(database, 'verify', email, 60_000);
    const checked: string[] = [];
    const result = await confirmEmailWithPassword(database, raw, 'owner', {
      compare: async (...args) => {
        checked.push(args[0]);
        return compare(...args);
      },
      allowAttempt: async (forEmail) => forEmail !== email,
    });
    expect(result).toBe('rate_limited');
    expect(checked).toEqual([]);
  });

  it('refuses an expired verification token', async () => {
    await setPassword('h:owner');
    const raw = await issueToken(database, 'verify', email, -1_000);
    expect(await confirmEmailWithPassword(database, raw, 'owner', { compare })).toBe('invalid_token');
    expect((await loadUser()).emailVerified).toBeNull();
  });

  it('lets exactly one of several concurrent confirmations succeed', async () => {
    await setPassword('h:owner');
    const raw = await issueToken(database, 'verify', email, 60_000);
    const results = await Promise.all(
      Array.from({ length: 5 }, () => confirmEmailWithPassword(database, raw, 'owner', { compare })),
    );
    expect(results.filter((result) => result === 'verified')).toHaveLength(1);
  });

  it('does not accept a reset token as a verification token, or the reverse', async () => {
    await setPassword('h:owner');
    const reset = await issueToken(database, 'reset', email, 60_000);
    expect(await confirmEmailWithPassword(database, reset, 'owner', { compare })).toBe('invalid_token');
    const verify = await issueToken(database, 'verify', email, 60_000);
    expect(await resetPasswordWithToken(database, verify, 'new-hash')).toBe(false);
    expect((await loadUser()).password).toBe('h:owner');
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
