import type { JWT } from 'next-auth/jwt';

export type LoadSessionVersion = (userId: string) => Promise<number | null>;

/**
 * Checks a session JWT against users.session_version on every call (an indexed primary-key
 * lookup), so a password reset or change ends other sessions on their next request. Returns
 * null to end the session when the version differs or the user is gone. Tokens minted before
 * session versions existed count as version 0.
 *
 * A failed lookup keeps the token with `svVerified: false`, so a database blip does not sign
 * everyone out of read-only pages. Callers that change data must refuse an unverified session
 * (see protectedProcedure in src/server/api/trpc.ts).
 */
export async function checkSessionVersion(
  token: JWT,
  loadVersion: LoadSessionVersion,
): Promise<JWT | null> {
  const userId = typeof token.id === 'string' ? token.id : undefined;
  if (!userId) return token;

  let current: number | null;
  try {
    current = await loadVersion(userId);
  } catch (error) {
    console.error(
      '[AUTH] Session version check failed:',
      error instanceof Error ? error.message : String(error),
    );
    return { ...token, svVerified: false };
  }

  const tokenVersion = typeof token.sessionVersion === 'number' ? token.sessionVersion : 0;
  if (current === null || current !== tokenVersion) {
    console.log('[AUTH] Session rejected: account removed or session version changed', { userId });
    return null;
  }

  return { ...token, sessionVersion: tokenVersion, svVerified: true };
}
