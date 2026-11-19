import { and, eq, isNull, sql } from 'drizzle-orm';
import type { AdapterAccount } from 'next-auth/adapters';

import type { db } from '~/server/db';
import { accounts, users } from '~/server/db/schema';
import { emailMatches, normalizeEmail } from './tokens';

type Database = typeof db;

export interface IdTokenEmail {
  email?: string;
  email_verified?: boolean;
}

/**
 * Email claims from the id_token Auth.js got from the provider's token endpoint. Auth.js has
 * already validated the token's signature, issuer, audience and nonce before linking, so this
 * only reads the payload.
 */
export function idTokenEmail(idToken: unknown): IdTokenEmail | null {
  if (typeof idToken !== 'string') return null;
  const payload = idToken.split('.')[1];
  if (!payload) return null;
  try {
    const claims: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!claims || typeof claims !== 'object') return null;
    const { email, email_verified } = claims as Record<string, unknown>;
    return {
      email: typeof email === 'string' ? email : undefined,
      email_verified: email_verified === true,
    };
  } catch {
    return null;
  }
}

export class OAuthLinkRefused extends Error {
  constructor(reason: string) {
    super(`OAuth account not linked: ${reason}`);
    this.name = 'OAuthLinkRefused';
  }
}

/**
 * Wraps the adapter's linkAccount so a Google account is linked only to a user whose stored
 * email is the address Google verified. Without this, anyone holding a session for an account
 * could attach their own Google login to it and keep access after a password reset.
 */
export function guardLinkAccount(
  linkAccount: (account: AdapterAccount) => unknown,
  loadUserEmail: (userId: string) => Promise<string | null>,
) {
  return async (account: AdapterAccount): Promise<void> => {
    if (account.provider === 'google') {
      const claims = idTokenEmail(account.id_token);
      if (!claims?.email || claims.email_verified !== true) {
        throw new OAuthLinkRefused('Google did not report a verified email');
      }
      const stored = await loadUserEmail(account.userId);
      if (!stored || normalizeEmail(stored) !== normalizeEmail(claims.email)) {
        throw new OAuthLinkRefused("Google's verified email does not match the account's email");
      }
    }
    await linkAccount(account);
  };
}

/** `error` values for /auth/error when a Google sign-in is refused. */
export type GoogleSignInRefusal = 'GoogleEmailUnverified' | 'GoogleEmailMismatch';

export interface GoogleProfileEmail {
  email?: string | null;
  email_verified?: boolean | null;
}

/**
 * Why a Google sign-in must be refused, or null to let it through. Google has to report the
 * email as verified and, when this Google account is already linked, the email has to be the
 * linked account's stored email. Links made before the link guard may point at an account whose
 * address Google never vouched for, so signing in through them would prove nothing.
 */
export function googleSignInRefusal(
  profile: GoogleProfileEmail | undefined,
  linkedEmail: string | null,
): GoogleSignInRefusal | null {
  if (profile?.email_verified !== true || !profile.email) return 'GoogleEmailUnverified';
  if (linkedEmail !== null && normalizeEmail(linkedEmail) !== normalizeEmail(profile.email)) {
    return 'GoogleEmailMismatch';
  }
  return null;
}

export function authErrorPath(error: GoogleSignInRefusal): string {
  return `/auth/error?error=${error}`;
}

/**
 * A Google sign-in with Google's verified email proves the mailbox, so it verifies an account
 * left unverified by migration 0007. Nothing proves that whoever set that account's password
 * owned the mailbox (someone else may have registered the address), so the same statement
 * clears the password and bumps session_version. The owner can set a password through
 * forgot-password. Accounts that are already verified keep their password.
 *
 * Returns the new session_version, or null when nothing changed.
 */
export async function verifyEmailFromGoogle(
  database: Database,
  userId: string,
  googleEmail: string,
): Promise<number | null> {
  const [row] = await database
    .update(users)
    .set({
      emailVerified: new Date(),
      password: null,
      sessionVersion: sql`${users.sessionVersion} + 1`,
    })
    .where(and(eq(users.id, userId), isNull(users.emailVerified), emailMatches(googleEmail)))
    .returning({ sessionVersion: users.sessionVersion });
  return row?.sessionVersion ?? null;
}

async function findGoogleLinkedUser(database: Database, providerAccountId: string) {
  const [row] = await database
    .select({ id: users.id, email: users.email })
    .from(accounts)
    .innerJoin(users, eq(accounts.userId, users.id))
    .where(and(eq(accounts.provider, 'google'), eq(accounts.providerAccountId, providerAccountId)))
    .limit(1);
  return row ?? null;
}

/**
 * For the signIn callback: true to continue, or the error page to redirect to. Auth.js stops
 * there, before it links an account or mints a session.
 */
export async function checkGoogleSignIn(
  database: Database,
  providerAccountId: string,
  profile: GoogleProfileEmail | undefined,
): Promise<true | string> {
  const linked = await findGoogleLinkedUser(database, providerAccountId);
  const refusal = googleSignInRefusal(profile, linked?.email ?? null);
  if (!refusal) return true;
  console.log('[AUTH] Google sign-in refused:', refusal);
  return authErrorPath(refusal);
}
