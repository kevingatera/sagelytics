import { and, eq, isNull, sql } from 'drizzle-orm';
import type { AdapterAccount } from 'next-auth/adapters';

import type { db } from '~/server/db';
import { accounts, users } from '~/server/db/schema';
import { googleControlsEmail, idTokenEmail } from './google-authority';
import { emailMatches, normalizeEmail } from './tokens';

export { idTokenEmail, type IdTokenEmail } from './google-authority';

type Database = typeof db;

export class OAuthLinkRefused extends Error {
  constructor(reason: string) {
    super(`OAuth account not linked: ${reason}`);
    this.name = 'OAuthLinkRefused';
  }
}

export interface LinkTarget {
  email: string;
  emailVerified: Date | null;
}

/**
 * Wraps the adapter's linkAccount so a Google account is linked only to a user whose stored
 * email is the address Google verified. Without this, anyone holding a session for an account
 * could attach their own Google login to it and keep access after a password reset.
 *
 * The link is proven (linkAccount gets a provenAt) when Google controls the address or the
 * account's email is already verified; see googleSignInRefusal for what that allows.
 */
export function guardLinkAccount(
  linkAccount: (account: AdapterAccount, provenAt: Date | null) => unknown,
  loadUser: (userId: string) => Promise<LinkTarget | null>,
) {
  return async (account: AdapterAccount): Promise<void> => {
    let provenAt: Date | null = null;
    if (account.provider === 'google') {
      const claims = idTokenEmail(account.id_token);
      if (!claims?.email || claims.email_verified !== true) {
        throw new OAuthLinkRefused('Google did not report a verified email');
      }
      const user = await loadUser(account.userId);
      if (!user || normalizeEmail(user.email) !== normalizeEmail(claims.email)) {
        throw new OAuthLinkRefused("Google's verified email does not match the account's email");
      }
      if (googleControlsEmail(claims.email, claims.hd) || user.emailVerified) provenAt = new Date();
    }
    await linkAccount(account, provenAt);
  };
}

/** `error` values for /auth/error when a Google sign-in is refused. */
export type GoogleSignInRefusal = 'GoogleEmailUnverified' | 'GoogleEmailMismatch' | 'GoogleLinkUnproven';

export interface GoogleProfileEmail {
  email?: string | null;
  email_verified?: boolean | null;
  /** Workspace domain, if any. */
  hd?: unknown;
}

/** The account an existing Google link points at. */
export interface LinkedGoogleAccount {
  email: string;
  emailVerified: Date | null;
  /** When the link was made or confirmed while the mailbox was proven; null if never. */
  provenAt: Date | null;
}

/**
 * Why a Google sign-in must be refused, or null to let it through. Google has to report the
 * email as verified and, when this Google account is already linked, the email has to be the
 * linked account's stored email. Links made before the link guard may point at an account whose
 * address Google never vouched for, so signing in through them would prove nothing.
 *
 * For an address Google does not control (see googleControlsEmail), email_verified may describe
 * a previous holder of the mailbox. A sign-in through an existing link then needs a verified
 * account and a proven link; otherwise it is refused with GoogleLinkUnproven.
 */
export function googleSignInRefusal(
  profile: GoogleProfileEmail | undefined,
  linked: LinkedGoogleAccount | null,
): GoogleSignInRefusal | null {
  if (profile?.email_verified !== true || !profile.email) return 'GoogleEmailUnverified';
  if (!linked) return null;
  if (normalizeEmail(linked.email) !== normalizeEmail(profile.email)) return 'GoogleEmailMismatch';
  if (googleControlsEmail(profile.email, profile.hd)) return null;
  if (!linked.emailVerified || !linked.provenAt) return 'GoogleLinkUnproven';
  return null;
}

export function authErrorPath(error: GoogleSignInRefusal): string {
  return `/auth/error?error=${error}`;
}

/**
 * After a Google sign-in the signIn callback accepted. When Google controls the address, the
 * sign-in proves the mailbox: it marks the link proven and verifies an account left unverified
 * by migration 0007. Nothing proves that whoever set that account's password owned the mailbox
 * (someone else may have registered the address), so verifying also clears the password and
 * bumps session_version. The owner can set a password through forgot-password. Accounts that
 * are already verified keep their password. For any other address this changes nothing.
 *
 * Returns the new session_version, or null when the account did not change.
 */
export async function recordGoogleSignIn(
  database: Database,
  userId: string,
  providerAccountId: string,
  profile: GoogleProfileEmail,
): Promise<number | null> {
  if (!profile.email || !googleControlsEmail(profile.email, profile.hd)) return null;
  const googleEmail = profile.email;
  return database.transaction(async (tx) => {
    await tx
      .update(accounts)
      .set({ provenAt: sql`coalesce(${accounts.provenAt}, now())` })
      .where(
        and(
          eq(accounts.userId, userId),
          eq(accounts.provider, 'google'),
          eq(accounts.providerAccountId, providerAccountId),
        ),
      );
    const [row] = await tx
      .update(users)
      .set({
        emailVerified: new Date(),
        password: null,
        sessionVersion: sql`${users.sessionVersion} + 1`,
      })
      .where(and(eq(users.id, userId), isNull(users.emailVerified), emailMatches(googleEmail)))
      .returning({ sessionVersion: users.sessionVersion });
    return row?.sessionVersion ?? null;
  });
}

async function findGoogleLinkedUser(database: Database, providerAccountId: string) {
  const [row] = await database
    .select({ email: users.email, emailVerified: users.emailVerified, provenAt: accounts.provenAt })
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
  const refusal = googleSignInRefusal(profile, linked);
  if (!refusal) return true;
  console.log('[AUTH] Google sign-in refused:', refusal);
  return authErrorPath(refusal);
}
