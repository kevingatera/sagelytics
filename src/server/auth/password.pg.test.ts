import { eq, like } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import * as schema from '~/server/db/schema';
import { changePassword, type PasswordHashing } from './password';
import { issueToken, resetPasswordWithToken } from './tokens';

/**
 * Runs against a real Postgres with the current schema. Skipped unless AUTH_TEST_DATABASE_URL
 * is set, so `pnpm test` never needs a database.
 */
const url = process.env.AUTH_TEST_DATABASE_URL;

describe.skipIf(!url)('settings password change against Postgres', () => {
  const conn = postgres(url ?? 'postgres://unused', { max: 8, onnotice: () => undefined });
  const database = drizzle(conn, { schema });
  const run = crypto.randomUUID().slice(0, 8);
  const userId = `pw-test-${run}`;
  const email = `pw-test-${run}@example.test`;

  // Plain-text "hashes" keep the test fast; the compare-and-swap does not care what they are.
  const plain: PasswordHashing = {
    compare: async (password, hash) => hash === `h:${password}`,
    hash: async (password) => `h:${password}`,
  };

  async function loadUser() {
    const [user] = await database.select().from(schema.users).where(eq(schema.users.id, userId));
    if (!user) throw new Error('test user missing');
    return user;
  }

  beforeAll(async () => {
    await database.insert(schema.users).values({ id: userId, email, password: 'h:old', emailVerified: new Date() });
  });

  beforeEach(async () => {
    await database
      .delete(schema.verificationTokens)
      .where(like(schema.verificationTokens.identifier, `%${email}`));
    await database
      .update(schema.users)
      .set({ password: 'h:old', sessionVersion: 0 })
      .where(eq(schema.users.id, userId));
  });

  afterAll(async () => {
    await database
      .delete(schema.verificationTokens)
      .where(like(schema.verificationTokens.identifier, `%${email}`));
    await database.delete(schema.users).where(eq(schema.users.id, userId));
    await conn.end();
  });

  const input = { userId, sessionVersion: 0, currentPassword: 'old', newPassword: 'mine' };

  it('changes the password and bumps the session version', async () => {
    expect(await changePassword(database, input, plain)).toEqual({ ok: true });
    const user = await loadUser();
    expect(user.password).toBe('h:mine');
    expect(user.sessionVersion).toBe(1);
  });

  it('refuses a wrong current password without writing', async () => {
    expect(await changePassword(database, { ...input, currentPassword: 'nope' }, plain)).toEqual({
      ok: false,
      reason: 'wrong_password',
    });
    expect((await loadUser()).password).toBe('h:old');
  });

  it('does not overwrite a reset that commits between the check and the write', async () => {
    const resetToken = await issueToken(database, 'reset', email, 60_000);
    const racing: PasswordHashing = {
      // The reset commits after the old password was read and checked.
      compare: async (password, hash) => {
        const ok = await plain.compare(password, hash);
        expect(await resetPasswordWithToken(database, resetToken, 'h:from-reset')).toBe(true);
        return ok;
      },
      hash: plain.hash,
    };

    expect(await changePassword(database, input, racing)).toEqual({ ok: false, reason: 'stale' });
    const user = await loadUser();
    expect(user.password).toBe('h:from-reset');
    expect(user.sessionVersion).toBe(1);
  });

  it('refuses a change from a session that a reset already ended', async () => {
    const resetToken = await issueToken(database, 'reset', email, 60_000);
    expect(await resetPasswordWithToken(database, resetToken, 'h:old')).toBe(true);
    // Same password as before, but the session still carries version 0.
    expect(await changePassword(database, input, plain)).toEqual({ ok: false, reason: 'stale' });
    expect((await loadUser()).sessionVersion).toBe(1);
  });

  it('lets only one of two concurrent changes win', async () => {
    const results = await Promise.all([
      changePassword(database, { ...input, newPassword: 'a' }, plain),
      changePassword(database, { ...input, newPassword: 'b' }, plain),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    const user = await loadUser();
    expect(['h:a', 'h:b']).toContain(user.password);
    expect(user.sessionVersion).toBe(1);
  });
});
