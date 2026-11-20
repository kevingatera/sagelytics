import { compare as bcryptCompare, hash as bcryptHash } from 'bcryptjs';
import { and, eq, sql } from 'drizzle-orm';

import type { db } from '~/server/db';
import { users } from '~/server/db/schema';

type Database = typeof db;

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; reason: 'no_password' | 'wrong_password' | 'stale' };

export interface PasswordHashing {
  compare: (password: string, hash: string) => Promise<boolean>;
  hash: (password: string) => Promise<string>;
}

const defaultHashing: PasswordHashing = {
  compare: bcryptCompare,
  hash: (password) => bcryptHash(password, 10),
};

/**
 * Changes a password after checking the current one. The write is a compare-and-swap on the
 * password hash and session_version that were read and checked: if a reset or another change
 * commits in between, nothing is written and the result is 'stale'. A successful change bumps
 * session_version, which ends every existing session. The caller's session must carry the
 * current session_version.
 */
export async function changePassword(
  database: Database,
  input: { userId: string; sessionVersion: number; currentPassword: string; newPassword: string },
  hashing: PasswordHashing = defaultHashing,
): Promise<ChangePasswordResult> {
  const { userId, currentPassword, newPassword } = input;
  const [user] = await database
    .select({ password: users.password, sessionVersion: users.sessionVersion })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user?.password) return { ok: false, reason: 'no_password' };
  // The session making the change must be current: a reset since sign-in ended it.
  if (user.sessionVersion !== input.sessionVersion) return { ok: false, reason: 'stale' };

  if (!(await hashing.compare(currentPassword, user.password))) {
    return { ok: false, reason: 'wrong_password' };
  }

  const newHash = await hashing.hash(newPassword);
  const updated = await database
    .update(users)
    .set({ password: newHash, sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(
      and(
        eq(users.id, userId),
        eq(users.password, user.password),
        eq(users.sessionVersion, user.sessionVersion),
      ),
    )
    .returning({ id: users.id });
  return updated.length > 0 ? { ok: true } : { ok: false, reason: 'stale' };
}
