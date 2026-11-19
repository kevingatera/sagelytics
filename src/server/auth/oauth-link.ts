import type { AdapterAccount } from 'next-auth/adapters';

import { normalizeEmail } from './tokens';

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
