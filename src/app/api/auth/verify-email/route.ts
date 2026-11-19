import { z } from 'zod';
import { db } from '~/server/db';
import { verifyEmailWithToken } from '~/server/auth/tokens';

const verifySchema = z.object({
  token: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const { token } = verifySchema.parse(body);

    if (!(await verifyEmailWithToken(db, token))) {
      return Response.json(
        { message: 'This verification link is invalid, expired or already used.' },
        { status: 400 },
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return Response.json({ message: 'Invalid verification request' }, { status: 400 });
    }

    console.error('Email verification error:', error instanceof Error ? error.message : String(error));
    return Response.json({ message: 'Failed to verify email' }, { status: 500 });
  }
}
