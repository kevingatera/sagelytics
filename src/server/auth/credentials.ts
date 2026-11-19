import { compare as bcryptCompare } from 'bcryptjs';
import { CredentialsSignin } from 'next-auth';
import { z } from 'zod';

import { authLimits, getClientIp, type RateLimiter } from '~/server/rate-limit';
import { normalizeEmail } from './tokens';

/** Correct password, but the email address has not been confirmed yet. */
export class EmailNotVerifiedError extends CredentialsSignin {
  code = 'email_unverified';
}

/** Too many sign-in attempts for this IP or IP and email pair. */
export class TooManyAttemptsError extends CredentialsSignin {
  code = 'rate_limited';
}

const credentialsSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(200),
});

// bcrypt hash of a random value, compared when the account does not exist so that a
// missing account costs the same time as a wrong password.
const DUMMY_HASH = '$2b$10$q2M/WS9Oxjb6lXw6vUpqWOKjc0iZLOOukfJ0TItxbPmeQKGFhH92S';

export interface CredentialUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  password: string | null;
  emailVerified: Date | null;
  onboardingCompleted: boolean | null;
  sessionVersion: number;
}

export interface AuthorizeDeps {
  findUserByEmail: (email: string) => Promise<CredentialUser | undefined>;
  limiter: Pick<RateLimiter, 'check'>;
  compare?: (password: string, hash: string) => Promise<boolean>;
}

export async function authorizeCredentials(
  credentials: Partial<Record<string, unknown>> | undefined,
  request: Request | undefined,
  deps: AuthorizeDeps,
) {
  const parsed = credentialsSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const email = normalizeEmail(parsed.data.email);
  const ip = request ? getClientIp(request.headers) : 'unknown';
  const limit = await deps.limiter.check(authLimits.signIn(ip, email));
  if (!limit.allowed) {
    console.warn('[AUTH] Sign-in rate limited');
    throw new TooManyAttemptsError();
  }

  const compare = deps.compare ?? bcryptCompare;
  const user = await deps.findUserByEmail(email);
  const passwordValid = await compare(parsed.data.password, user?.password ?? DUMMY_HASH);
  if (!user?.password || !passwordValid) {
    console.log('[AUTH] Credentials sign-in refused: unknown account or wrong password');
    return null;
  }

  // Only someone who knows the password learns that the account is unverified.
  if (!user.emailVerified) {
    console.log('[AUTH] Credentials sign-in refused: email not verified for user', user.id);
    throw new EmailNotVerifiedError();
  }

  console.log('[AUTH] Successful authorization for user:', {
    id: user.id,
    onboardingCompleted: user.onboardingCompleted,
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    onboardingCompleted: user.onboardingCompleted ?? false,
    sessionVersion: user.sessionVersion,
  };
}
