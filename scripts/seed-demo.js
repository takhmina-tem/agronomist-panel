#!/usr/bin/env node
/**
 * scripts/seed-demo.js  —  DEMO / staging bootstrap
 *
 * Runs migrations, loads core reference data, then adds example fields
 * and operations for development and product demonstrations.
 *
 * WARNING: Do NOT run against a production instance with real agronomist
 * data.  The demo blocks are skipped when fields/operations already exist,
 * but the intent is a clean database.
 *
 * Usage:
 *   npm run db:seed:demo
 *   DATABASE_URL=<url> npm run db:seed:demo
 *   DATABASE_URL=<url> ADMIN_PASSWORD=<pwd> npm run db:seed:demo
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
  // 1. Migrations
  await runMigrations();

  const client = new Client(clientConfig);
  await client.connect();

  try {
    // 2. Core reference data (varieties + fertilizers)
    const coreSql = fs.readFileSync(
      path.join(__dirname, '..', 'db', 'seed-core.sql'),
      'utf-8'
    );
    await client.query(coreSql);
    console.log('✓ Reference data loaded (varieties, fertilizers).');

    // 3. Admin user
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

    // 4. Demo fields + operations
    const demoSql = fs.readFileSync(
      path.join(__dirname, '..', 'db', 'seed-demo.sql'),
      'utf-8'
    );
    await client.query(demoSql);
    console.log('✓ Demo fields and operations loaded.');

    console.log('\nDemo seed complete.');
    console.log('3 demo fields and 18 operations are available for presentation.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Demo seed error:', err.message);
  process.exit(1);
});
