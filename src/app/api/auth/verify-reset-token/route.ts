import { db } from '~/server/db';
import { isTokenValid } from '~/server/auth/tokens';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return Response.json({ valid: false, message: 'No token provided' }, { status: 400 });
  }

  try {
    return Response.json({ valid: await isTokenValid(db, 'reset', token) });
  } catch (error) {
    console.error('Token verification error:', error instanceof Error ? error.message : String(error));
    return Response.json(
      { valid: false, message: 'Failed to verify token' },
      { status: 500 }
    );
  }
}
