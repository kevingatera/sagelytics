import NextAuth from 'next-auth';
import { cache } from 'react';

import { authConfig } from './config';
import { checkWriteSession, type WriteSessionResult } from './write-session';

const { auth: uncachedAuth, handlers, signIn, signOut } = NextAuth(authConfig);

const auth = cache(uncachedAuth);

/**
 * For API routes that change data. Returns `{ ok: true, session }`, or `{ ok: false, response }`
 * with a 401 when signed out or a 503 when this request could not confirm the session version.
 * Read-only routes can keep using auth().
 *
 *   const write = await requireWriteSession();
 *   if (!write.ok) return write.response;
 */
async function requireWriteSession(): Promise<WriteSessionResult> {
  return checkWriteSession(await auth());
}

export { auth, handlers, requireWriteSession, signIn, signOut };
export type { WriteSessionResult };
