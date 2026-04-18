'use server';

import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { createSession, destroySession } from '@/lib/auth';

// ── Login ─────────────────────────────────────────────────────────────────────

/**
 * Verify credentials and create a session.
 *
 * Security rules:
 * - Normalise login to lowercase before comparison.
 * - Always run bcrypt.compare even when user is not found (timing-attack defence).
 * - Return the same generic error regardless of which check failed.
 *   Never leak "user exists" / "wrong password" distinction.
 */
export async function login(
  loginInput: string,
  passwordInput: string,
): Promise<{ error: string } | { success: true }> {
  const loginVal = String(loginInput ?? '').trim().toLowerCase();
  const password = String(passwordInput ?? '');

  console.log('[auth]', JSON.stringify({ loginVal, passwordLen: password.length, passwordHex: Buffer.from(password).toString('hex').slice(0, 40) }));

  if (!loginVal || !password) {
    return { error: 'Неверный логин или пароль' };
  }

  // Fetch user — single query, intentionally no "user not found" distinction.
  const rows = await query<{
    id: number;
    login: string;
    password_hash: string;
    is_active: boolean;
  }>(
    `SELECT id, login, password_hash, is_active
     FROM users WHERE login = $1 LIMIT 1`,
    [loginVal],
  );

  const user = rows[0] ?? null;

  // If no user found, compare against a dummy hash so timing is constant.
  const hash = user?.password_hash
    ?? '$2b$12$invalidhashvalue000000000000000000000000000000000000';

  const valid = await bcrypt.compare(password, hash);

  if (!valid || !user || !user.is_active) {
    return { error: 'Неверный логин или пароль' };
  }

  await createSession(user.id, user.login);
  return { success: true };
}

// ── Logout ────────────────────────────────────────────────────────────────────

/** Clear the session cookie. Caller is responsible for redirecting to /login. */
export async function logout(): Promise<void> {
  destroySession();
}
