import type { Session } from 'next-auth';

export type WriteSessionResult =
  | { ok: true; session: Session & { user: Session['user'] } }
  | { ok: false; response: Response };

/**
 * Decides whether a session may change data. Signed out: 401. Session version not confirmed
 * this request (database error during the per-request check): 503, so a session that a
 * password reset ended cannot write during a database blip.
 */
export function checkWriteSession(session: Session | null): WriteSessionResult {
  if (!session?.user?.id) {
    return { ok: false, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (session.sessionVerified === false) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Could not confirm your session. Please try again.' },
        { status: 503, headers: { 'Retry-After': '5' } },
      ),
    };
  }
  return { ok: true, session };
}
