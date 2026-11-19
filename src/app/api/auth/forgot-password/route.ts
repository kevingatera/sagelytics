import { z } from 'zod';
import { after } from 'next/server';
import { db } from '~/server/db';
import { env } from '~/env';
import { readSmtpConfig, type SmtpSettings } from '~/lib/email/config';
import { sendEmail } from '~/lib/email/mailer';
import { buildPasswordResetEmail } from '~/lib/email/templates';
import {
  RESET_TOKEN_TTL_MS,
  deleteToken,
  emailMatches,
  issueToken,
  normalizeEmail,
} from '~/server/auth/tokens';
import { authLimits, getClientIp, getRateLimiter } from '~/server/rate-limit';

const resetSchema = z.object({
  email: z.string().trim().email().max(255),
});

/**
 * Looks up the account and, if it exists, stores a token and emails the link. Runs
 * after the response is sent, so known and unknown emails take the same time to answer.
 * A failed send deletes the token so an unsent link cannot be used later.
 */
async function sendResetLinkIfKnown(email: string, smtp: SmtpSettings, baseUrl: string) {
  let token: string | null = null;
  try {
    const user = await db.query.users.findFirst({
      columns: { id: true },
      where: emailMatches(email),
    });
    if (!user) return;

    token = await issueToken(db, 'reset', email, RESET_TOKEN_TTL_MS);

    const resetUrl = new URL('/reset-password', baseUrl);
    resetUrl.searchParams.set('token', token);

    await sendEmail(
      { to: email, ...buildPasswordResetEmail(resetUrl.toString()) },
      smtp
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (token) {
      const unsent = token;
      await deleteToken(db, unsent).catch((cleanupError: unknown) =>
        console.error(
          'Failed to remove unsent password reset token:',
          cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
        )
      );
      console.error('Password reset email failed to send:', message);
    } else {
      console.error('Password reset request failed:', message);
    }
  }
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const email = normalizeEmail(resetSchema.parse(body).email);

    const smtp = readSmtpConfig();
    if (!smtp || !env.NEXTAUTH_URL) {
      console.error('Password reset is unavailable: SMTP_HOST, EMAIL_FROM and NEXTAUTH_URL must be set');
      return Response.json(
        { message: 'Password reset email is not configured' },
        { status: 503 }
      );
    }

    // Over the limit: answer exactly as for any other request, but send nothing.
    const limit = await getRateLimiter().check(
      authLimits.emailLink('forgot', getClientIp(req.headers), email),
    );
    if (!limit.allowed) {
      console.warn('Password reset request rate limited');
      return Response.json({ success: true });
    }

    // No account lookup before responding: every valid request does the same work here
    // and gets the same answer, so neither the body nor the timing reveals which emails exist.
    const baseUrl = env.NEXTAUTH_URL;
    after(() => sendResetLinkIfKnown(email, smtp, baseUrl));

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return Response.json(
        { message: 'Invalid email address' },
        { status: 400 }
      );
    }

    console.error('Password reset request error:', error instanceof Error ? error.message : String(error));

    return Response.json(
      { message: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}
