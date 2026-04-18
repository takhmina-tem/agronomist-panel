#!/usr/bin/env node
/**
 * scripts/create-admin-user.mjs
 *
 * Creates the default admin user with a bcrypt-hashed password.
 * Safe to run multiple times: if the user already exists, nothing changes.
 *
 * Usage:
 *   npm run db:create-admin
 *   node scripts/create-admin-user.mjs
 *
 * Override the password via env (useful in CI / Docker):
 *   ADMIN_PASSWORD=MyNewPass node scripts/create-admin-user.mjs
 *
 * To reset the password for an existing admin, use the generic script instead:
 *   node scripts/create-user.mjs admin <new-password>
 */

import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Pool } = pg;

// ── Config ────────────────────────────────────────────────────────────────────

const ADMIN_LOGIN    = 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin13579!pass';
const BCRYPT_ROUNDS  = 12;

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgres://postgres:postgres@localhost:5432/agronomist_panel';

function requiresSsl(url) {
  try {
    const host = new URL(url).hostname;
    return host !== 'localhost' && host !== '127.0.0.1' && host !== '::1';
  } catch {
    return false;
  }
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ...(requiresSsl(DATABASE_URL) && { ssl: { rejectUnauthorized: false } }),
});

// ── Main ──────────────────────────────────────────────────────────────────────

try {
  // Check whether admin already exists
  const { rows } = await pool.query(
    'SELECT id, is_active FROM users WHERE login = $1',
    [ADMIN_LOGIN]
  );

  if (rows.length > 0) {
    const status = rows[0].is_active ? 'активен' : 'деактивирован';
    console.log(`ℹ️  Пользователь "${ADMIN_LOGIN}" уже существует (${status}).`);
    console.log('   Пароль не изменён. Для смены пароля используйте:');
    console.log(`   node scripts/create-user.mjs ${ADMIN_LOGIN} <новый-пароль>`);
    process.exit(0);
  }

  // User does not exist — create it
  process.stdout.write(
    `Хеширую пароль (bcrypt, cost=${BCRYPT_ROUNDS})... `
  );
  const hash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);
  console.log('готово.');

  await pool.query(
    `INSERT INTO users (login, password_hash, is_active)
     VALUES ($1, $2, TRUE)`,
    [ADMIN_LOGIN, hash]
  );

  console.log(`\n✅  Пользователь "${ADMIN_LOGIN}" создан.`);
  console.log(`    Логин:  ${ADMIN_LOGIN}`);
  console.log(`    Пароль: ${ADMIN_PASSWORD}`);
  console.log(`    Войти:  http://localhost:3000/login`);
  console.log('\n⚠️  Смените пароль после первого входа:');
  console.log(`   node scripts/create-user.mjs ${ADMIN_LOGIN} <новый-пароль>`);
} catch (err) {
  console.error('❌ Ошибка:', err.message);
  process.exit(1);
} finally {
  await pool.end();
}
