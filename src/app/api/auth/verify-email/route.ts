import { z } from 'zod';
import { db } from '~/server/db';
import { confirmEmailWithPassword } from '~/server/auth/tokens';
import { authLimits, checkHashingAttempt, getClientIp, getRateLimiter } from '~/server/rate-limit';

const verifySchema = z.object({
  token: z.string().min(1).max(200),
  password: z.string().min(1).max(200),
});

const INVALID_LINK = 'This verification link is invalid, expired or already used.';

function tooMany(retryAfterSeconds: number) {
  return Response.json(
    { message: 'Too many attempts. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  );
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const { token, password } = verifySchema.parse(body);

    const limiter = getRateLimiter();
    const ip = getClientIp(req.headers);
    const ipLimit = await limiter.check(authLimits.verifyIp(ip));
    if (!ipLimit.allowed) return tooMany(ipLimit.retryAfterSeconds);

    let retryAfterSeconds = 0;
    const result = await confirmEmailWithPassword(db, token, password, {
      allowAttempt: async (email) => {
        const limit = await checkHashingAttempt(limiter, authLimits.verifyEmail(email), 'verify', ip);
        retryAfterSeconds = limit.retryAfterSeconds;
        return limit.allowed;
      },
    });

    switch (result) {
      case 'verified':
        return Response.json({ success: true });
      case 'rate_limited':
        return tooMany(retryAfterSeconds);
      case 'wrong_password':
        return Response.json(
          {
            code: 'wrong_password',
            message:
              "That password doesn't match this account. If you didn't choose it, reset your password instead; that also confirms your email.",
          },
          { status: 400 },
        );
      case 'stale':
        return Response.json(
          { code: 'stale', message: 'The password for this account just changed. Enter the new password.' },
          { status: 409 },
        );
      default:
        return Response.json({ code: 'invalid_token', message: INVALID_LINK }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return Response.json({ message: 'Invalid verification request' }, { status: 400 });
    }

    console.error('Email verification error:', error instanceof Error ? error.message : String(error));
    return Response.json({ message: 'Failed to verify email' }, { status: 500 });
  }
}
