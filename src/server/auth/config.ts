import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { CredentialsSignin, type DefaultSession, type NextAuthConfig } from 'next-auth';
import { type Adapter } from 'next-auth/adapters';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { and, eq, isNull } from 'drizzle-orm';

import { db } from '~/server/db';
import { accounts, sessions, users, verificationTokens } from '~/server/db/schema';
import { env } from '~/env';
import { getRateLimiter } from '~/server/rate-limit';
import { authorizeCredentials } from './credentials';
import { guardLinkAccount } from './oauth-link';
import { createSessionDecode, resolveSessionToken } from './session-jwt';
import { emailMatches, normalizeEmail } from './tokens';

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
      onboardingCompleted: boolean;
      sessionVersion: number;
    } & DefaultSession['user'];
    /**
     * False when this request could not confirm the session version against the database.
     * Reads may go ahead; anything that changes data must refuse the session.
     */
    sessionVerified: boolean;
  }

  interface User {
    // ...other properties
    // role: UserRole;
    onboardingCompleted?: boolean;
    password?: string;
    sessionVersion?: number;
  }
}

// The adapter is only used for OAuth (Google) users. Google sign-in is refused below unless
// Google reports the address as verified, so accounts it creates start out verified. Linking
// Google to an existing account requires Google's verified email to match the stored one.
const baseAdapter = DrizzleAdapter(db, {
  usersTable: users,
  accountsTable: accounts,
  sessionsTable: sessions,
  verificationTokensTable: verificationTokens,
});

const adapter: Adapter = {
  ...baseAdapter,
  createUser: (data) =>
    baseAdapter.createUser!({
      ...data,
      email: normalizeEmail(data.email),
      emailVerified: data.emailVerified ?? new Date(),
    }),
  linkAccount: guardLinkAccount((account) => baseAdapter.linkAccount!(account), loadUserEmail),
};

async function loadUserEmail(userId: string) {
  const [row] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  return row?.email ?? null;
}

async function findCredentialUser(email: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      password: users.password,
      emailVerified: users.emailVerified,
      onboardingCompleted: users.onboardingCompleted,
      sessionVersion: users.sessionVersion,
    })
    .from(users)
    .where(emailMatches(email))
    .limit(1);
  return user;
}

async function loadSessionVersion(userId: string) {
  const [row] = await db
    .select({ sessionVersion: users.sessionVersion })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row ? row.sessionVersion : null;
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: env.AUTH_GOOGLE_CLIENT_ID,
      clientSecret: env.AUTH_GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials, request) {
        try {
          return await authorizeCredentials(credentials, request, {
            findUserByEmail: findCredentialUser,
            limiter: getRateLimiter(),
          });
        } catch (error) {
          if (error instanceof CredentialsSignin) throw error;
          console.error('[AUTH] Authorization error:', error instanceof Error ? error.message : String(error));
          return null;
        }
      }
    }),
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
  // Persist OAuth users (and optionally sessions) to the database so that related
  // entities such as onboarding records can reference a valid user ID.
  adapter,
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('[AUTH] SignIn callback:', {
        userId: user.id,
        provider: account?.provider,
        type: account?.type
      });

      if (account?.provider === 'google' && profile?.email_verified !== true) {
        console.log('[AUTH] Google sign-in refused: Google has not verified the email address');
        return false;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.onboardingCompleted = user.onboardingCompleted ?? false;
        token.sessionVersion = user.sessionVersion ?? 0;
        token.svVerified = true;
        return token;
      }
      return resolveSessionToken(token, loadSessionVersion);
    },
    session({ session, token }) {
      console.log('[AUTH] Session callback - token present:', !!token);
      if (session.user && token) {
        console.log('[AUTH] Using token for session:', { id: token.id, email: token.email });
        session.user.id = token.id as string;
        session.user.onboardingCompleted = token.onboardingCompleted as boolean;
        session.user.sessionVersion = typeof token.sessionVersion === 'number' ? token.sessionVersion : 0;
        session.sessionVerified = token.svVerified !== false;
      }
      console.log('[AUTH] Final session user:', { id: session.user?.id, email: session.user?.email });
      return session;
    },
  },
  events: {
    // Accounts from before 0007 start unverified. A Google sign-in proves the address Google
    // verified, so it confirms the stored email when the two match.
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'google' || profile?.email_verified !== true) return;
      if (!user.id || !profile.email) return;
      await db
        .update(users)
        .set({ emailVerified: new Date() })
        .where(and(eq(users.id, user.id), isNull(users.emailVerified), emailMatches(profile.email)));
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  // Checks session_version when Auth.js reads the cookie, including in the OAuth callback that
  // links accounts, which never runs the jwt callback. See session-jwt.ts.
  jwt: {
    decode: createSessionDecode(loadSessionVersion),
  },
  secret: env.AUTH_SECRET,
} satisfies NextAuthConfig;
