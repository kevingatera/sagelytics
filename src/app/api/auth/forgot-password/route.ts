import { z } from 'zod';
import { randomUUID } from 'crypto';
import { after } from 'next/server';
import { db } from '~/server/db';
import { users, verificationTokens } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '~/env';
import { readSmtpConfig, type SmtpSettings } from '~/lib/email/config';
import { sendEmail } from '~/lib/email/mailer';
import { buildPasswordResetEmail } from '~/lib/email/templates';

const resetSchema = z.object({
  email: z.string().email(),
});

const RESET_TOKEN_TTL_MS = 3600 * 1000;

/**
 * Looks up the account and, if it exists, stores a token and emails the link. Runs
 * after the response is sent, so known and unknown emails take the same time to answer.
 * A failed send deletes the token so an unsent link cannot be used later.
 */
async function sendResetLinkIfKnown(email: string, smtp: SmtpSettings, baseUrl: string) {
  let token: string | null = null;
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (!user) return;

    token = randomUUID();
    const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.identifier, email));

    await db.insert(verificationTokens).values({
      identifier: email,
      token,
      expires,
    });

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
      await db
        .delete(verificationTokens)
        .where(eq(verificationTokens.token, unsent))
        .catch((cleanupError: unknown) =>
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
    const body = await req.json();
    const { email } = resetSchema.parse(body);

    const smtp = readSmtpConfig();
    if (!smtp || !env.NEXTAUTH_URL) {
      console.error('Password reset is unavailable: SMTP_HOST, EMAIL_FROM and NEXTAUTH_URL must be set');
      return Response.json(
        { message: 'Password reset email is not configured' },
        { status: 503 }
      );
    }

    // No account lookup before responding: every valid request does the same work here
    // and gets the same answer, so neither the body nor the timing reveals which emails exist.
    const baseUrl = env.NEXTAUTH_URL;
    after(() => sendResetLinkIfKnown(email, smtp, baseUrl));

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { message: 'Invalid email address' },
        { status: 400 }
      );
    }

    console.error('Password reset request error:', error);

    return Response.json(
      { message: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}
