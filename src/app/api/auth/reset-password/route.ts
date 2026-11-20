import { z } from 'zod';
import { hash } from 'bcryptjs';
import { db } from '~/server/db';
import { findTokenEmail, resetPasswordWithToken } from '~/server/auth/tokens';
import { authLimits, checkHashingAttempt, getClientIp, getRateLimiter } from '~/server/rate-limit';

const resetPasswordSchema = z.object({
  token: z.string().min(1).max(200),
  password: z.string().min(8).max(200),
});

function tooMany(retryAfterSeconds: number) {
  return Response.json(
    { message: 'Too many password reset attempts. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  );
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const { token, password } = resetPasswordSchema.parse(body);

    const limiter = getRateLimiter();
    const ip = getClientIp(req.headers);
    const ipLimit = await limiter.check(authLimits.resetIp(ip));
    if (!ipLimit.allowed) return tooMany(ipLimit.retryAfterSeconds);

    // Cheap hash lookup first: a made-up or used token never reaches bcrypt.
    const email = await findTokenEmail(db, 'reset', token);
    if (!email) {
      return Response.json({ message: 'Invalid or expired token' }, { status: 400 });
    }

    const budget = await checkHashingAttempt(limiter, authLimits.resetEmail(email), 'reset', ip);
    if (!budget.allowed) return tooMany(budget.retryAfterSeconds);

    const hashedPassword = await hash(password, 10);

    // Consumes the token, sets the password and bumps the session version in one transaction.
    const reset = await resetPasswordWithToken(db, token, hashedPassword);
    if (!reset) {
      return Response.json(
        { message: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { message: 'Invalid data', issues: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof SyntaxError) {
      return Response.json({ message: 'Invalid data' }, { status: 400 });
    }

    console.error('Password reset error:', error instanceof Error ? error.message : String(error));

    return Response.json(
      { message: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
