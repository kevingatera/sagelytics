import { z } from 'zod';
import { randomUUID } from 'crypto';
import { db } from '~/server/db';
import { users, verificationTokens } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '~/env';

const resetSchema = z.object({
  email: z.string().email(),
});

async function sendPasswordResetEmail(email: string, token: string) {
  console.log(`[Password Reset] Sending email to ${email} with token ${token}`);
  // TODO something like this:
  // await sendgrid.send({
  //   to: email,
  //   from: 'noreply@sagelytics.com',
  //   subject: 'Reset your password',
  //   text: `Reset your password by clicking this link: ${env.NEXTAUTH_URL}/reset-password?token=${token}`,
  //   html: `<p>Reset your password by clicking <a href="${env.NEXTAUTH_URL}/reset-password?token=${token}">this link</a>.</p>`,
  // });

  // For development, we're just logging the token
  return true;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = resetSchema.parse(body);

    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    // Generate token even if user doesn't exist (prevent email enumeration)
    const token = randomUUID();
    const expires = new Date(Date.now() + 3600 * 1000); // 1 hour

    // Only store token if user exists
    if (user) {
      // Delete any existing tokens for this user
      await db
        .delete(verificationTokens)
        .where(eq(verificationTokens.identifier, email));

      // Create a new token
      await db.insert(verificationTokens).values({
        identifier: email,
        token,
        expires,
      });

      // Send reset email
      await sendPasswordResetEmail(email, token);
    }

    // Always return success (even if user doesn't exist)
    return Response.json({ success: true });
  } catch (error) {
    console.error('Password reset request error:', error);

    if (error instanceof z.ZodError) {
      return Response.json(
        { message: 'Invalid email address' },
        { status: 400 }
      );
    }

    return Response.json(
      { message: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
} 