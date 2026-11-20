import { z } from 'zod';
import { after } from 'next/server';
import { db } from '~/server/db';
import { buildVerifyEmail } from '~/lib/email/templates';
import { appUrl, readMailContext, sendAuthEmail, type MailContext } from '~/server/auth/email-links';
import {
  VERIFY_TOKEN_TTL_MS,
  deleteToken,
  emailMatches,
  issueToken,
  normalizeEmail,
} from '~/server/auth/tokens';
import { authLimits, getClientIp, getRateLimiter } from '~/server/rate-limit';

const resendSchema = z.object({
  email: z.string().trim().email().max(255),
});

/** Sends a fresh link only to a password account that is still unverified. */
async function resendIfUnverified(email: string, mail: MailContext) {
  let token: string | null = null;
  try {
    const user = await db.query.users.findFirst({
      columns: { id: true, password: true, emailVerified: true },
      where: emailMatches(email),
    });
    if (!user?.password || user.emailVerified) return;

    token = await issueToken(db, 'verify', email, VERIFY_TOKEN_TTL_MS);
    await sendAuthEmail(
      { to: email, ...buildVerifyEmail(appUrl(mail.baseUrl, '/verify-email', token)) },
      mail,
    );
  } catch (error) {
    if (token) {
      const unsent = token;
      await deleteToken(db, unsent).catch((cleanupError: unknown) =>
        console.error(
          'Failed to remove unsent verification token:',
          cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
        ),
      );
    }
    console.error(
      'Verification email resend failed:',
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const email = normalizeEmail(resendSchema.parse(body).email);

    const mail = readMailContext();
    if (!mail) {
      console.error('Verification email is unavailable: SMTP_HOST, EMAIL_FROM and NEXTAUTH_URL must be set');
      return Response.json({ message: 'Verification email is not configured' }, { status: 503 });
    }

    // Same answer whether the account exists, is verified, or the request is over the limit.
    const limit = await getRateLimiter().check(
      authLimits.emailLink('resend', getClientIp(req.headers), email),
    );
    if (!limit.allowed) {
      console.warn('Verification resend rate limited');
      return Response.json({ success: true });
    }

    after(() => resendIfUnverified(email, mail));
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return Response.json({ message: 'Invalid email address' }, { status: 400 });
    }

    console.error('Verification resend error:', error instanceof Error ? error.message : String(error));
    return Response.json({ message: 'Failed to process request' }, { status: 500 });
  }
}
