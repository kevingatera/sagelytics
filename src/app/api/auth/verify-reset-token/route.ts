import { db } from '~/server/db';
import { verificationTokens } from '~/server/db/schema';
import { and, eq, gt } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return Response.json({ valid: false, message: 'No token provided' }, { status: 400 });
  }

  try {
    // Find the token and check if it's valid (not expired)
    const foundToken = await db.query.verificationTokens.findFirst({
      where: and(
        eq(verificationTokens.token, token),
        gt(verificationTokens.expires, new Date())
      ),
    });

    return Response.json({ valid: !!foundToken });
  } catch (error) {
    console.error('Token verification error:', error);
    return Response.json(
      { valid: false, message: 'Failed to verify token' },
      { status: 500 }
    );
  }
} 