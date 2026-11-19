import { z } from 'zod';
import { randomUUID } from 'crypto';
import { db } from '~/server/db';
import { users, verificationTokens } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '~/env';
import { readSmtpConfig } from '~/lib/email/config';
import { sendEmail } from '~/lib/email/mailer';
import { buildPasswordResetEmail } from '~/lib/email/templates';

const resetSchema = z.object({
  email: z.string().email(),
});

const RESET_TOKEN_TTL_MS = 3600 * 1000;

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

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    // Known and unknown emails get the same success response (prevent email enumeration).
    if (user) {
      const token = randomUUID();
      const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      await db
        .delete(verificationTokens)
        .where(eq(verificationTokens.identifier, email));

      await db.insert(verificationTokens).values({
        identifier: email,
        token,
        expires,
      });

      const resetUrl = new URL('/reset-password', env.NEXTAUTH_URL);
      resetUrl.searchParams.set('token', token);

      try {
        await sendEmail(
          { to: email, ...buildPasswordResetEmail(resetUrl.toString()) },
          smtp
        );
      } catch (error) {
        // Drop the token so an unsent link cannot be used later.
        await db
          .delete(verificationTokens)
          .where(eq(verificationTokens.token, token));

        console.error(
          'Password reset email failed to send:',
          error instanceof Error ? error.message : String(error)
        );
      }
    }

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
