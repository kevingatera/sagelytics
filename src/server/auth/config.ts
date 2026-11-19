import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { CredentialsSignin, type DefaultSession, type NextAuthConfig } from 'next-auth';
import { type Adapter, type AdapterUser } from 'next-auth/adapters';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { eq } from 'drizzle-orm';

import { db } from '~/server/db';
import { accounts, sessions, users, verificationTokens } from '~/server/db/schema';
import { env } from '~/env';
import { getRateLimiter } from '~/server/rate-limit';
import { authorizeCredentials } from './credentials';
import { checkGoogleSignIn, guardLinkAccount, recordGoogleSignIn, type LinkTarget } from './oauth-link';
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
// Google reports the address as verified, and, for a Google account that is already linked,
// unless that address is the account's stored email. A Google account with no link is refused
// unless Google controls the address (see googleControlsEmail), so new accounts exist only for
// such addresses. They are created unverified; recordGoogleSignIn verifies them in the jwt
// callback after checking that Google controls the address.
// Each Google link records whether it was made while the mailbox was proven (see oauth-link.ts).
const baseAdapter = DrizzleAdapter(db, {
  usersTable: users,
  accountsTable: accounts,
  sessionsTable: sessions,
  verificationTokensTable: verificationTokens,
});

type Database = typeof db;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

const adapter: Adapter = {
  ...baseAdapter,
  // Auth.js calls getUser only to find the signed-in user in the OAuth callback, so it can link
  // the new provider account to them. The app has no "connect Google" flow, and a link made from
  // a session could race a password reset that revoked it, so the callback always runs as signed
  // out: a Google account is linked only to a user created in the same callback.
  getUser: async () => null,
  getUserByEmail: async (email) => {
    const [row] = await db.select().from(users).where(emailMatches(email)).limit(1);
    return row ? toAdapterUser(row) : null;
  },
  // Auth.js creates an OAuth user and then links the account in two calls. A row written here
  // and left without its link (a failed link write, a crash) would block the next sign-in for
  // the same Google account with OAuthAccountNotLinked. So this only reserves the id, and
  // linkAccount inserts the row and the link in one transaction.
  createUser: async ({ name, email, image }) => {
    const normalized = normalizeEmail(email);
    // Auth.js has just looked the address up through getUserByEmail; this also covers a legacy
    // row whose stored case differs, which the unique constraint on email would not catch.
    if (await emailTaken(db, normalized)) throw new Error('An account already exists for this email');
    prunePendingUsers();
    const row: typeof users.$inferSelect = {
      id: crypto.randomUUID(),
      name: name ?? null,
      email: normalized,
      emailVerified: null,
      image: image ?? null,
      onboardingCompleted: false,
      password: null,
      sessionVersion: 0,
    };
    pendingUsers.set(row.id, { row, reservedAt: Date.now() });
    return toAdapterUser(row);
  },
  // Locks the user row so the link and a password reset or email confirmation (which update the
  // same row before dropping unproven links) cannot interleave. For a user createUser reserved,
  // the row is inserted in the same transaction, so a refused or failed link leaves nothing.
  linkAccount: async (account) => {
    const pending = pendingUsers.get(account.userId);
    pendingUsers.delete(account.userId);
    await db.transaction(async (tx) => {
      if (pending) {
        if (await emailTaken(tx, pending.row.email)) throw new Error('An account already exists for this email');
        await tx.insert(users).values(pending.row);
      }
      await guardLinkAccount(
        async (link, provenAt) => {
          await tx.insert(accounts).values({
            userId: link.userId,
            type: link.type,
            provider: link.provider,
            providerAccountId: link.providerAccountId,
            refresh_token: link.refresh_token,
            access_token: link.access_token,
            expires_at: link.expires_at,
            token_type: link.token_type,
            scope: link.scope,
            id_token: link.id_token,
            session_state: typeof link.session_state === 'string' ? link.session_state : null,
            provenAt,
          });
        },
        (userId) => lockLinkTarget(tx, userId),
      )(account);
    });
  },
};

// Users createUser reserved, keyed by id, until linkAccount writes them. Auth.js calls the two
// back to back in one request, so entries live for milliseconds; the prune only bounds what an
// unexpected throw between them could leave behind.
const pendingUsers = new Map<string, { row: typeof users.$inferSelect; reservedAt: number }>();
const PENDING_USER_TTL_MS = 5 * 60_000;

function prunePendingUsers() {
  const cutoff = Date.now() - PENDING_USER_TTL_MS;
  for (const [id, entry] of pendingUsers) {
    if (entry.reservedAt < cutoff) pendingUsers.delete(id);
  }
}

async function emailTaken(executor: Database | Transaction, email: string) {
  const [existing] = await executor.select({ id: users.id }).from(users).where(emailMatches(email)).limit(1);
  return Boolean(existing);
}

function toAdapterUser(row: typeof users.$inferSelect): AdapterUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified,
    image: row.image,
    onboardingCompleted: row.onboardingCompleted ?? false,
    sessionVersion: row.sessionVersion,
  };
}

async function lockLinkTarget(tx: Transaction, userId: string): Promise<LinkTarget | null> {
  const [row] = await tx
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .for('update');
  return row ?? null;
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

      if (account?.provider === 'google') {
        return checkGoogleSignIn(db, account.providerAccountId, profile);
      }

      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id;
        token.onboardingCompleted = user.onboardingCompleted ?? false;
        token.sessionVersion = user.sessionVersion ?? 0;
        token.svVerified = true;
        // The signIn callback has already checked Google's email against the account. When
        // Google controls the address, verifying a legacy account clears its password and bumps
        // session_version; this session gets the new version so it survives the bump.
        if (account?.provider === 'google' && user.id && profile) {
          const version = await recordGoogleSignIn(db, user.id, account.providerAccountId, profile);
          if (version !== null) token.sessionVersion = version;
        }
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
