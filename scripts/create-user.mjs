#!/usr/bin/env node
/**
 * scripts/create-user.mjs
 *
 * Creates (or updates) a user in the database with a bcrypt-hashed password.
 * Passwords are NEVER stored in plaintext.
 *
 * Usage (two equivalent forms):
 *   node scripts/create-user.mjs <login> <password>
 *   LOGIN=admin PASSWORD=secret123 node scripts/create-user.mjs
 *
 * The script is idempotent: running it again with the same login updates the
 * password hash (useful for password resets).
 *
 * Example:
 *   node scripts/create-user.mjs admin MyStr0ngPassword!
 */

import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Pool } = pg;

// ── Read credentials from args or env ────────────────────────────────────────

const login    = (process.argv[2] ?? process.env.LOGIN ?? '').trim().toLowerCase();
const password = (process.argv[3] ?? process.env.PASSWORD ?? '').trim();

if (!login || !password) {
  console.error('');
  console.error('  Usage: node scripts/create-user.mjs <login> <password>');
  console.error('  Example: node scripts/create-user.mjs admin MyStr0ngPass!');
  console.error('');
  process.exit(1);
}

if (password.length < 8) {
  console.error('❌ Пароль должен быть не менее 8 символов.');
  process.exit(1);
}

// ── Hash password ─────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
process.stdout.write(`Хеширую пароль (bcrypt, cost=${BCRYPT_ROUNDS})... `);
const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
console.log('готово.');

// ── Write to DB ───────────────────────────────────────────────────────────────

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5432/agronomist_panel',
});

try {
  const { rowCount } = await pool.query(
    `INSERT INTO users (login, password_hash, is_active)
     VALUES ($1, $2, TRUE)
     ON CONFLICT (login) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           is_active     = TRUE,
           updated_at    = NOW()`,
    [login, hash],
  );

  if (rowCount && rowCount > 0) {
    console.log(`✅  Пользователь "${login}" успешно создан / обновлён.`);
    console.log(`    Теперь можно войти на /login с этими credentials.`);
  }
} catch (err) {
  console.error('❌ Ошибка базы данных:', err.message);
  process.exit(1);
} finally {
  await pool.end();
}
