#!/usr/bin/env node
/**
 * scripts/seed-core.js  —  PRODUCTION bootstrap
 *
 * Inserts only what is needed for the application to function:
 *   • varieties
 *   • fertilizers
 *   • admin user (created only if none exists)
 *
 * Does NOT create demo fields or operations.
 * Safe to run multiple times: all inserts are idempotent.
 *
 * Usage:
 *   npm run db:seed:core
 *   DATABASE_URL=<url> npm run db:seed:core
 *   DATABASE_URL=<url> ADMIN_PASSWORD=<pwd> npm run db:seed:core
 */

const fs     = require('fs');
const path   = require('path');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
const { runMigrations } = require('./migrate');

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres@localhost:5432/agronomist_panel';

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

const ADMIN_LOGIN    = 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin13579!pass';
const BCRYPT_ROUNDS  = 12;

async function main() {
  await runMigrations();

  const client = new Client(clientConfig);
  await client.connect();

  try {
    // 1. Reference data (varieties + fertilizers)
    const coreSql = fs.readFileSync(
      path.join(__dirname, '..', 'db', 'seed-core.sql'),
      'utf-8'
    );
    await client.query(coreSql);
    console.log('✓ Reference data loaded (varieties, fertilizers).');

    // 2. Admin user
    const { rows } = await client.query(
      'SELECT id FROM users WHERE login = $1',
      [ADMIN_LOGIN]
    );
    if (rows.length > 0) {
      console.log(`✓ Admin user "${ADMIN_LOGIN}" already exists — skipped.`);
    } else {
      process.stdout.write(`  Creating admin "${ADMIN_LOGIN}" (bcrypt cost=${BCRYPT_ROUNDS})... `);
      const hash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);
      await client.query(
        `INSERT INTO users (login, password_hash, is_active)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (login) DO NOTHING`,
        [ADMIN_LOGIN, hash]
      );
      console.log('done.');
    }

    console.log('\nCore seed complete. The app is ready for production use.');
    console.log('No demo fields or operations were created.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Core seed error:', err.message);
  process.exit(1);
});
