import { type Config } from 'drizzle-kit';

// Migrations need only the database, so this skips the app's env validation (src/env.js).
// drizzle-kit loads .env itself.
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required to run drizzle-kit');

export default {
  schema: './src/server/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: { url },
  tablesFilter: ['sg_*'],
} satisfies Config;
