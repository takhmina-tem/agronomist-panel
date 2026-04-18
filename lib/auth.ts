/**
 * lib/auth.ts
 *
 * JWT-based session helpers.
 *
 * Session is stored in a signed httpOnly cookie ("agro_session").
 * Signing uses HS256 via jose; the key comes from AUTH_SECRET env var.
 *
 * Use in Server Components, Server Actions, and Route Handlers only.
 * Middleware has its own inline verification (cannot import next/headers).
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth-config';

export { SESSION_COOKIE, SESSION_MAX_AGE };

// ── Types ─────────────────────────────────────────────────────────────────────

export type SessionPayload = {
  userId: number;
  login: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSecret(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  if (!raw) throw new Error('AUTH_SECRET environment variable is not set');
  return new TextEncoder().encode(raw);
}

// ── Session management ────────────────────────────────────────────────────────

/** Sign a new JWT and write it to the httpOnly session cookie. */
export async function createSession(userId: number, login: string): Promise<void> {
  const token = await new SignJWT({ userId, login } satisfies SessionPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

/**
 * Read and verify the session cookie.
 * Returns null on missing cookie, invalid signature, or expired token.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** Delete the session cookie (logout). */
export function destroySession(): void {
  cookies().delete(SESSION_COOKIE);
}
