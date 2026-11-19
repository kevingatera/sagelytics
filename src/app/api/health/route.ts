import postgres from 'postgres';

import { env } from '~/env';

export const dynamic = 'force-dynamic';

const sql = postgres(env.DATABASE_URL, {
  max: 1,
  connect_timeout: 2,
  idle_timeout: 10,
  connection: { statement_timeout: 2000 },
});

export async function GET() {
  try {
    await sql`SELECT 1`;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
