import { createHash, randomBytes } from 'node:crypto';
import { compare as bcryptCompare } from 'bcryptjs';
import { and, eq, gt, like, sql } from 'drizzle-orm';

import type { db } from '~/server/db';
import { users, verificationTokens } from '~/server/db/schema';
import { dropUnprovenGoogleLinks } from './google-authority';

type Database = typeof db;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type Executor = Database | Transaction;

/**
 * Single-use email tokens share sg_verification_token. The identifier is `<purpose>:<email>`
 * and the token column holds the SHA-256 of the emailed value, so a database leak exposes no
 * usable links. Lookups go through the hash, so response timing says nothing about the raw token.
 */
export type TokenPurpose = 'verify' | 'reset';

export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** 32 random bytes, base64url: 43 characters. */
export const RAW_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

export function tokenIdentifier(purpose: TokenPurpose, email: string): string {
  return `${purpose}:${normalizeEmail(email)}`;
}

/** Case-insensitive match, so accounts stored before normalization still resolve. */
export function emailMatches(email: string) {
  return sql`lower(${users.email}) = ${normalizeEmail(email)}`;
}

/** Replaces any outstanding token of this purpose for the email and returns the raw value to send. */
export async function issueToken(
  executor: Executor,
  purpose: TokenPurpose,
  email: string,
  ttlMs: number,
  now = Date.now(),
): Promise<string> {
  const rawToken = randomBytes(32).toString('base64url');
  const identifier = tokenIdentifier(purpose, email);
  await executor.delete(verificationTokens).where(eq(verificationTokens.identifier, identifier));
  await executor.insert(verificationTokens).values({
    identifier,
    token: hashToken(rawToken),
    expires: new Date(now + ttlMs),
  });
  return rawToken;
}

export async function deleteToken(executor: Executor, rawToken: string): Promise<void> {
  await executor.delete(verificationTokens).where(eq(verificationTokens.token, hashToken(rawToken)));
}

/**
 * Deletes the token if it is unexpired and of this purpose, and returns its email. The
 * DELETE ... RETURNING is atomic: of two concurrent calls with the same token, one gets the
 * row and the other gets nothing.
 */
export async function consumeToken(
  executor: Executor,
  purpose: TokenPurpose,
  rawToken: string,
): Promise<string | null> {
  if (!RAW_TOKEN_PATTERN.test(rawToken)) return null;
  const prefix = `${purpose}:`;
  const [row] = await executor
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.token, hashToken(rawToken)),
        like(verificationTokens.identifier, `${prefix}%`),
        gt(verificationTokens.expires, sql`now()`),
      ),
    )
    .returning({ identifier: verificationTokens.identifier });
  return row ? row.identifier.slice(prefix.length) : null;
}

/** The email of an unexpired token of this purpose, or null. Does not consume it. */
export async function findTokenEmail(
  executor: Executor,
  purpose: TokenPurpose,
  rawToken: string,
): Promise<string | null> {
  if (!RAW_TOKEN_PATTERN.test(rawToken)) return null;
  const prefix = `${purpose}:`;
  const [row] = await executor
    .select({ identifier: verificationTokens.identifier })
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.token, hashToken(rawToken)),
        like(verificationTokens.identifier, `${prefix}%`),
        gt(verificationTokens.expires, sql`now()`),
      ),
    )
    .limit(1);
  return row ? row.identifier.slice(prefix.length) : null;
}

/** True when an unexpired token of this purpose exists. Does not consume it. */
export async function isTokenValid(
  executor: Executor,
  purpose: TokenPurpose,
  rawToken: string,
): Promise<boolean> {
  return (await findTokenEmail(executor, purpose, rawToken)) !== null;
}

export type ConfirmEmailResult =
  | 'verified'
  | 'invalid_token'
  | 'wrong_password'
  | 'rate_limited'
  | 'stale';

export interface ConfirmEmailOptions {
  compare?: (password: string, hash: string) => Promise<boolean>;
  /** Called with the token's email before the password check; false stops with 'rate_limited'. */
  allowAttempt?: (email: string) => Promise<boolean>;
}

class StaleConfirmation extends Error {}

/**
 * Confirms an email address only for someone who holds the emailed link and knows the
 * account's password. Without the password check, an attacker could register someone else's
 * address with a password of their choosing and wait for the owner to click "Confirm".
 *
 * The token is looked up by hash first (no bcrypt for a bad link), then the password is
 * checked, then one transaction consumes the token and sets email_verified only if the
 * password hash is still the one that was checked. A wrong password leaves the token usable,
 * so the owner can try again or reset the password instead. The same transaction drops the
 * account's unproven Google links (see dropUnprovenGoogleLinks).
 */
export async function confirmEmailWithPassword(
  database: Database,
  rawToken: string,
  password: string,
  { compare = bcryptCompare, allowAttempt }: ConfirmEmailOptions = {},
): Promise<ConfirmEmailResult> {
  const email = await findTokenEmail(database, 'verify', rawToken);
  if (!email) return 'invalid_token';

  const [user] = await database
    .select({ id: users.id, email: users.email, password: users.password })
    .from(users)
    .where(emailMatches(email))
    .limit(1);
  if (!user?.password) return 'invalid_token';

  if (allowAttempt && !(await allowAttempt(email))) return 'rate_limited';
  if (!(await compare(password, user.password))) return 'wrong_password';

  const checkedHash = user.password;
  try {
    return await database.transaction(async (tx) => {
      if (!(await consumeToken(tx, 'verify', rawToken))) return 'invalid_token' as const;
      const updated = await tx
        .update(users)
        .set({ emailVerified: sql`coalesce(${users.emailVerified}, now())` })
        .where(and(eq(users.id, user.id), eq(users.password, checkedHash)))
        .returning({ id: users.id });
      // The password changed after the check: roll back so the token is not used up.
      if (updated.length === 0) throw new StaleConfirmation();
      await dropUnprovenGoogleLinks(tx, user.id, user.email);
      return 'verified' as const;
    });
  } catch (error) {
    if (error instanceof StaleConfirmation) return 'stale';
    throw error;
  }
}

/**
 * Consumes a reset token and, in the same transaction, sets the password hash, bumps
 * sessionVersion so existing sessions stop working, and marks the email verified (the
 * reset link proved the mailbox). This is also how an owner takes back an address someone
 * else registered: the other person's password is replaced. It also drops the account's
 * unproven Google links (see dropUnprovenGoogleLinks), so a previous holder of the mailbox loses
 * that way in. Returns false when the token is invalid, used or expired.
 */
export async function resetPasswordWithToken(
  database: Database,
  rawToken: string,
  passwordHash: string,
): Promise<boolean> {
  return database.transaction(async (tx) => {
    const email = await consumeToken(tx, 'reset', rawToken);
    if (!email) return false;
    const updated = await tx
      .update(users)
      .set({
        password: passwordHash,
        sessionVersion: sql`${users.sessionVersion} + 1`,
        emailVerified: sql`coalesce(${users.emailVerified}, now())`,
      })
      .where(emailMatches(email))
      .returning({ id: users.id, email: users.email });
    for (const user of updated) await dropUnprovenGoogleLinks(tx, user.id, user.email);
    // The mailbox is proven, so any outstanding confirmation link is no longer needed.
    await tx
      .delete(verificationTokens)
      .where(eq(verificationTokens.identifier, tokenIdentifier('verify', email)));
    return updated.length > 0;
  });
}
