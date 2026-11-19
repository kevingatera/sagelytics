import NextAuth from 'next-auth';
import { cache } from 'react';

import { authConfig } from './config';

const { auth: uncachedAuth, handlers, signIn, signOut } = NextAuth(authConfig);

const auth = cache(uncachedAuth);

/**
 * The session for a request that changes data. Returns null when signed out, and also when
 * this request could not confirm the session version (database error), so a session that a
 * password reset ended cannot write during a database blip. Read-only routes can use auth().
 */
async function authForWrite() {
  const session = await auth();
  if (!session?.user || session.sessionVerified === false) return null;
  return session;
}

export { auth, authForWrite, handlers, signIn, signOut };
