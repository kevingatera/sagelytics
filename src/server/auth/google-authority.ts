import { and, eq, inArray, isNull } from 'drizzle-orm';

import type { db } from '~/server/db';
import { accounts } from '~/server/db/schema';

type Database = typeof db;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type Executor = Database | Transaction;

const GOOGLE_MAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

/**
 * True when Google controls the address, so its email_verified claim says who holds the mailbox
 * now: a Gmail address, or a Workspace account whose `hd` claim is the address's domain. For any
 * other address, email_verified only says the address was verified once, possibly by a previous
 * holder of a reassigned mailbox.
 * See https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
 */
export function googleControlsEmail(email: string | null | undefined, hd: unknown): boolean {
  if (typeof email !== 'string') return false;
  const at = email.lastIndexOf('@');
  if (at < 0) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain) return false;
  if (GOOGLE_MAIL_DOMAINS.has(domain)) return true;
  return typeof hd === 'string' && hd.trim().toLowerCase() === domain;
}

export interface IdTokenEmail {
  email?: string;
  email_verified?: boolean;
  hd?: string;
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
    const { email, email_verified, hd } = claims as Record<string, unknown>;
    return {
      email: typeof email === 'string' ? email : undefined,
      email_verified: email_verified === true,
      hd: typeof hd === 'string' ? hd : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * For mailbox recovery (password reset, email confirmation), inside its transaction. Deletes the
 * user's Google links that are not proven and whose address Google does not control, so a
 * previous holder of the mailbox can no longer sign in through one. The link's address is the
 * stored email (a sign-in through a link must match it); a Workspace link counts as controlled
 * when the id_token stored with it has an `hd` claim for that domain. Returns how many were
 * deleted.
 */
export async function dropUnprovenGoogleLinks(executor: Executor, userId: string, email: string): Promise<number> {
  const links = await executor
    .select({ providerAccountId: accounts.providerAccountId, idToken: accounts.id_token })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, 'google'), isNull(accounts.provenAt)));
  const stale = links
    .filter((link) => !googleControlsEmail(email, idTokenEmail(link.idToken)?.hd))
    .map((link) => link.providerAccountId);
  if (stale.length === 0) return 0;
  const deleted = await executor
    .delete(accounts)
    .where(
      and(
        eq(accounts.userId, userId),
        eq(accounts.provider, 'google'),
        isNull(accounts.provenAt),
        inArray(accounts.providerAccountId, stale),
      ),
    )
    .returning({ providerAccountId: accounts.providerAccountId });
  return deleted.length;
}
