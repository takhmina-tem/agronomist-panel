import { Pool, QueryResultRow, types } from 'pg';

// Return NUMERIC/DECIMAL columns as JS numbers, not strings.
// Safe for the 2–6 decimal place precision used in this app.
types.setTypeParser(types.builtins.NUMERIC, parseFloat);

const globalForDb = globalThis as unknown as { pool?: Pool };

// Enable SSL when connecting to a remote managed Postgres (Neon, Supabase,
// Vercel Postgres, Railway, etc.).  Detection is based on whether the
// DATABASE_URL host is local — if it is not localhost / 127.0.0.1 / ::1 we
// assume a managed provider that requires SSL.
//
// rejectUnauthorized: false is needed for providers whose intermediate CA is
// not in Node's default bundle.  It does NOT disable transport encryption.
//
// This approach avoids the NODE_ENV trap: `next build` also runs with
// NODE_ENV=production, so using NODE_ENV would force SSL against the local
// Postgres during the build and break static page generation.
function requiresSsl(connectionString: string | undefined): boolean {
  if (!connectionString) return false;
  try {
    const url = new URL(connectionString);
    const host = url.hostname;
    return host !== 'localhost' && host !== '127.0.0.1' && host !== '::1';
  } catch {
    return false;
  }
}

const sslConfig = requiresSsl(process.env.DATABASE_URL)
  ? { ssl: { rejectUnauthorized: false } }
  : {};

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/agronomist_panel',
    ...sslConfig,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pool = pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  const result = await pool.query<T>(text, params);
  return result.rows;
}
