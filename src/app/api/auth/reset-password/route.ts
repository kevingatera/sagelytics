import { z } from 'zod';
import { hash } from 'bcryptjs';
import { db } from '~/server/db';
import { users, verificationTokens } from '~/server/db/schema';
import { and, eq, gt } from 'drizzle-orm';

const resetPasswordSchema = z.object({
  token: z.string().uuid(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, password } = resetPasswordSchema.parse(body);

    // Find the token and check if it's valid
    const foundToken = await db.query.verificationTokens.findFirst({
      where: and(
        eq(verificationTokens.token, token),
        gt(verificationTokens.expires, new Date())
      ),
    });

    if (!foundToken) {
      return Response.json(
        { message: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await db.query.users.findFirst({
      where: eq(users.email, foundToken.identifier),
    });

    if (!user) {
      return Response.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Hash the new password
    const hashedPassword = await hash(password, 10);

    // Update the user's password
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, user.id));

    // Delete the token
    await db.delete(verificationTokens)
      .where(eq(verificationTokens.token, token));

    return Response.json({ success: true });
  } catch (error) {
    console.error('Password reset error:', error);

    if (error instanceof z.ZodError) {
      return Response.json(
        { message: 'Invalid data', issues: error.issues },
        { status: 400 }
      );
    }

    return Response.json(
      { message: 'Failed to reset password' },
      { status: 500 }
    );
  }
} 