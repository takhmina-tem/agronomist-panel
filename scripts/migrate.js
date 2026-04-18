#!/usr/bin/env node
/**
 * scripts/migrate.js
 *
 * Runs pending SQL migrations from db/migrations/ in filename order.
 * Tracks applied versions in the schema_migrations table.
 *
 * Usage:
 *   npm run db:migrate
 *   node scripts/migrate.js
 *
 * Each migration file must be named NNN_description.sql (e.g. 001_initial_schema.sql).
 * Migrations are idempotent: re-running is safe — applied versions are skipped.
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres@localhost:5432/agronomist_panel';

const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');

// Enable SSL for remote managed Postgres — same logic as lib/db.ts.
function requiresSsl(url) {
  try {
    const host = new URL(url).hostname;
    return host !== 'localhost' && host !== '127.0.0.1' && host !== '::1';
  } catch {
    return false;
  }
}

const clientConfig = {
  connectionString: DATABASE_URL,
  ...(requiresSsl(DATABASE_URL) && { ssl: { rejectUnauthorized: false } }),
};

async function runMigrations() {
  const client = new Client(clientConfig);

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    // Ensure tracking table exists before anything else
    await client.query(`
      create table if not exists schema_migrations (
        version    text        primary key,
        applied_at timestamptz not null default now()
      )
    `);

    // Read and sort migration files
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found in', MIGRATIONS_DIR);
      return;
    }

    // Fetch already-applied versions
    const { rows: applied } = await client.query(
      'select version from schema_migrations'
    );
    const appliedSet = new Set(applied.map((r) => r.version));

    let appliedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      const version = file.replace(/\.sql$/, '');

      if (appliedSet.has(version)) {
        console.log(`  skip  ${file}`);
        skippedCount++;
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');

      // Run migration inside a transaction
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query(
          'insert into schema_migrations (version) values ($1)',
          [version]
        );
        await client.query('commit');
        console.log(`  apply ${file}`);
        appliedCount++;
      } catch (err) {
        await client.query('rollback');
        throw new Error(`Migration ${file} failed: ${err.message}`);
      }
    }

    console.log(
      `\nDone. Applied: ${appliedCount}, skipped: ${skippedCount}.`
    );
  } finally {
    await client.end();
  }
}

// Export for use by seed.js and other scripts
module.exports = { runMigrations };

// Run directly when invoked as: node scripts/migrate.js or npm run db:migrate
if (require.main === module) {
  runMigrations().catch((err) => {
    console.error('\nMigration error:', err.message);
    process.exit(1);
  });
}
