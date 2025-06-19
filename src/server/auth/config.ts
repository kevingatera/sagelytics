import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { type DefaultSession, type NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { z } from 'zod';

import { db } from '~/server/db';
import { accounts, sessions, users, verificationTokens } from '~/server/db/schema';
import { env } from '~/env';
import { eq } from 'drizzle-orm';

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
    } & DefaultSession['user'];
  }

  interface User {
    // ...other properties
    // role: UserRole;
    onboardingCompleted?: boolean;
    password?: string;
  }
}

// Credentials schema for validation
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

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
      async authorize(credentials) {
        try {
          console.log('[AUTH] Attempting credentials authorization for:', credentials?.email);
          const parsedCredentials = credentialsSchema.parse(credentials);
          
          const user = await db.query.users.findFirst({
            where: eq(users.email, parsedCredentials.email),
          });

          if (!user?.password) {
            console.log('[AUTH] User not found or no password for:', parsedCredentials.email);
            return null;
          }

          const isPasswordValid = await compare(
            parsedCredentials.password,
            user.password
          );
          
          if (!isPasswordValid) {
            console.log('[AUTH] Invalid password for:', parsedCredentials.email);
            return null;
          }

          console.log('[AUTH] Successful authorization for user:', {
            id: user.id,
            email: user.email,
            onboardingCompleted: user.onboardingCompleted
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            onboardingCompleted: user.onboardingCompleted ?? false,
          };
        } catch (error) {
          console.error('[AUTH] Authorization error:', error);
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
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('[AUTH] SignIn callback:', { 
        userId: user.id, 
        userEmail: user.email, 
        provider: account?.provider,
        type: account?.type 
      });
      
      // For credentials provider, ensure user exists in database
      if (account?.provider === 'credentials') {
        console.log('[AUTH] Credentials sign-in, user should already exist');
        // The user should already exist since we found them in authorize()
        return true;
      }
      
      // For OAuth providers, let the adapter handle it
      return true;
    },
    jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.onboardingCompleted = user.onboardingCompleted ?? false;
      }
      return token;
    },
    session({ session, token }) {
      console.log('[AUTH] Session callback - token present:', !!token);
      if (session.user && token) {
        console.log('[AUTH] Using token for session:', { id: token.id, email: token.email });
        session.user.id = token.id as string;
        session.user.onboardingCompleted = token.onboardingCompleted as boolean;
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
} satisfies NextAuthConfig;
