import { z } from 'zod';
import { hash } from 'bcryptjs';
import { after } from 'next/server';
import { db } from '~/server/db';
import { users } from '~/server/db/schema';
import { buildAccountExistsEmail, buildVerifyEmail } from '~/lib/email/templates';
import { appUrl, readMailContext, sendAuthEmail, type MailContext } from '~/server/auth/email-links';
import {
  VERIFY_TOKEN_TTL_MS,
  deleteToken,
  emailMatches,
  issueToken,
  normalizeEmail,
} from '~/server/auth/tokens';
import { authLimits, getClientIp, getRateLimiter } from '~/server/rate-limit';

const registerSchema = z.object({
  email: z.string().trim().email().max(255),
  name: z.string().trim().min(1).max(255),
  password: z.string().min(8).max(200),
});

const CHECK_EMAIL_MESSAGE =
  'Check your email for a link to confirm your address, then log in.';

/**
 * Sends the follow-up email after the response. A new account gets a verification link; an
 * existing one gets a note that the address is already registered, so the owner learns about
 * the attempt and nobody else learns that the account exists.
 */
async function sendRegistrationEmail(email: string, created: boolean, mail: MailContext) {
  let token: string | null = null;
  try {
    if (created) {
      token = await issueToken(db, 'verify', email, VERIFY_TOKEN_TTL_MS);
      await sendAuthEmail(
        { to: email, ...buildVerifyEmail(appUrl(mail.baseUrl, '/verify-email', token)) },
        mail,
      );
    } else {
      await sendAuthEmail(
        {
          to: email,
          ...buildAccountExistsEmail(
            appUrl(mail.baseUrl, '/login'),
            appUrl(mail.baseUrl, '/forgot-password'),
          ),
        },
        mail,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (token) {
      const unsent = token;
      await deleteToken(db, unsent).catch((cleanupError: unknown) =>
        console.error(
          'Failed to remove unsent verification token:',
          cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
        ),
      );
    }
    console.error('Registration email failed to send:', message);
  }
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const input = registerSchema.parse(body);
    const email = normalizeEmail(input.email);

    const limit = await getRateLimiter().check(
      authLimits.register(getClientIp(req.headers), email),
    );
    if (!limit.allowed) {
      return Response.json(
        { message: 'Too many registration attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
      );
    }

    // Hash first so new and existing emails do the same expensive work.
    const hashedPassword = await hash(input.password, 10);

    const existing = await db.query.users.findFirst({
      columns: { id: true },
      where: emailMatches(email),
    });

    let created = false;
    if (!existing) {
      const inserted = await db
        .insert(users)
        .values({
          email,
          name: input.name,
          password: hashedPassword,
          onboardingCompleted: false,
          emailVerified: null,
        })
        .onConflictDoNothing({ target: users.email })
        .returning({ id: users.id });
      created = inserted.length > 0;
    }

    const mail = readMailContext();
    if (mail) {
      after(() => sendRegistrationEmail(email, created, mail));
    } else {
      console.error(
        'Registration email is unavailable: SMTP_HOST, EMAIL_FROM and NEXTAUTH_URL must be set',
      );
    }

    // Same body for new and existing emails. emailDelivery depends only on server config.
    return Response.json({
      success: true,
      message: CHECK_EMAIL_MESSAGE,
      emailDelivery: mail ? 'sent' : 'disabled',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { message: 'Invalid registration data', issues: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof SyntaxError) {
      return Response.json({ message: 'Invalid registration data' }, { status: 400 });
    }

    console.error('Registration error:', error instanceof Error ? error.message : String(error));

    return Response.json(
      { message: 'Failed to register user' },
      { status: 500 }
    );
  }
}
