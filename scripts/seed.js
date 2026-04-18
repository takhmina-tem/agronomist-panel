#!/usr/bin/env node
/**
 * scripts/seed.js
 *
 * Seeds the database with development data.
 * Runs migrations first to ensure the schema is up to date before inserting.
 *
 * Usage:
 *   npm run db:seed
 *
 * What this does:
 *   1. Runs all pending SQL migrations (idempotent).
 *   2. Inserts varieties, fertilizers, fields, and operations from db/seed.sql.
 *   3. Creates the default admin user if it does not already exist.
 *      Password is hashed with bcrypt (cost 12) — never stored as plaintext.
 */

const fs      = require('fs');
const path    = require('path');
const bcrypt  = require('bcryptjs');
const { Client } = require('pg');
const { runMigrations } = require('./migrate');

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres@localhost:5432/agronomist_panel';

// Enable SSL for remote managed Postgres (Neon, Supabase, Railway, etc.)
// Same logic as lib/db.ts: detect by hostname, not by NODE_ENV.
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

// ── Default admin credentials ─────────────────────────────────────────────────
// Change ADMIN_PASSWORD via the ADMIN_PASSWORD env var before running
// if you want a different password in this environment.
const ADMIN_LOGIN    = 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin13579!pass';
const BCRYPT_ROUNDS  = 12;

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Run all pending migrations first
  await runMigrations();

  const client = new Client(clientConfig);
  await client.connect();

  try {
    // 2. Seed domain data (varieties, fertilizers, fields, operations)
    const seedSql = fs.readFileSync(
      path.join(__dirname, '..', 'db', 'seed.sql'),
      'utf-8'
    );
    await client.query(seedSql);
    console.log('Domain data seeded (varieties, fertilizers, fields, operations).');

    // 3. Create admin user if not already present
    //    ON CONFLICT DO NOTHING ensures idempotency — re-running never duplicates.
    const { rows: existing } = await client.query(
      'SELECT id FROM users WHERE login = $1',
      [ADMIN_LOGIN]
    );

    if (existing.length > 0) {
      console.log(`Admin user "${ADMIN_LOGIN}" already exists — skipped.`);
    } else {
      process.stdout.write(`Creating admin user "${ADMIN_LOGIN}" (bcrypt cost=${BCRYPT_ROUNDS})... `);
      const hash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);
      await client.query(
        `INSERT INTO users (login, password_hash, is_active)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (login) DO NOTHING`,
        [ADMIN_LOGIN, hash]
      );
      console.log('done.');
    }

    console.log('\nSeed complete.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Seed error:', err.message);
  process.exit(1);
});
