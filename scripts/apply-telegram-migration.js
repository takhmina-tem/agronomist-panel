// scripts/apply-telegram-migration.js
// Applies only the telegram_recipients table migration.
// Safe: CREATE TABLE IF NOT EXISTS — idempotent, never modifies existing data.

'use strict';

const { Pool } = require('pg');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('ERROR: DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false }, // required for Neon
  max: 1,
});

const SQL = `
CREATE TABLE IF NOT EXISTS telegram_recipients (
  id         serial      PRIMARY KEY,
  chat_id    text        UNIQUE NOT NULL,
  label      text,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
`;

(async () => {
  try {
    await pool.query(SQL);
    console.log('OK: telegram_recipients table is ready.');
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
