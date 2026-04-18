import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

/**
 * GET /api/health
 *
 * Smoke-tests the PostgreSQL connection and returns:
 * - 200 { status: 'ok', db: 'connected', pg_version, tables: [...] }
 * - 503 { status: 'error', db: 'unreachable', error: '...' }
 *
 * Used to verify the database is running and migrations have been applied.
 */
export async function GET() {
  try {
    const client = await pool.connect();

    try {
      // Verify connectivity + PostgreSQL version
      const versionResult = await client.query<{ pg_version: string }>(
        'SELECT version() AS pg_version'
      );

      // Verify migrations have run (schema_migrations table exists and has rows)
      const migrationsResult = await client.query<{ version: string; applied_at: string }>(
        'SELECT version, applied_at FROM schema_migrations ORDER BY version'
      );

      // List domain tables that should exist after migrations
      const tablesResult = await client.query<{ tablename: string }>(
        `SELECT tablename FROM pg_tables
         WHERE schemaname = 'public'
           AND tablename IN ('varieties','fertilizers','fields','operations','schema_migrations')
         ORDER BY tablename`
      );

      return NextResponse.json({
        status: 'ok',
        db: 'connected',
        pg_version: versionResult.rows[0].pg_version,
        migrations_applied: migrationsResult.rows,
        tables_found: tablesResult.rows.map((r) => r.tablename),
      });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { status: 'error', db: 'unreachable', error: message },
      { status: 503 }
    );
  }
}
