import type { JWT } from 'next-auth/jwt';

/** How often a session JWT is re-checked against users.session_version. */
export const SESSION_CHECK_INTERVAL_MS = 60_000;

export type LoadSessionVersion = (userId: string) => Promise<number | null>;

/**
 * Returns the token when its session version still matches the user's, or null to end the
 * session. Hits the database at most once per SESSION_CHECK_INTERVAL_MS per token. Tokens
 * minted before session versions existed count as version 0. A failed lookup keeps the
 * token and retries on the next request, so a database blip does not sign everyone out.
 */
export async function checkSessionVersion(
  token: JWT,
  loadVersion: LoadSessionVersion,
  now = Date.now(),
): Promise<JWT | null> {
  const userId = typeof token.id === 'string' ? token.id : undefined;
  if (!userId) return token;

  const checkedAt = typeof token.svCheckedAt === 'number' ? token.svCheckedAt : 0;
  if (now - checkedAt < SESSION_CHECK_INTERVAL_MS) return token;

  let current: number | null;
  try {
    current = await loadVersion(userId);
  } catch (error) {
    console.error(
      '[AUTH] Session version check failed:',
      error instanceof Error ? error.message : String(error),
    );
    return token;
  }

  const tokenVersion = typeof token.sessionVersion === 'number' ? token.sessionVersion : 0;
  if (current === null || current !== tokenVersion) {
    console.log('[AUTH] Session rejected: account removed or session version changed', { userId });
    return null;
  }

  return { ...token, sessionVersion: tokenVersion, svCheckedAt: now };
}
