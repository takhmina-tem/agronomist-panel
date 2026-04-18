/**
 * lib/auth-config.ts
 *
 * Auth constants that must be importable in EVERY runtime:
 *   - Edge (middleware)
 *   - Node.js (Server Components, Server Actions, Route Handlers)
 *   - Client (if ever needed for cookie name in fetch headers)
 *
 * NO imports from next/headers, next/server, bcryptjs, jose, or any
 * package that is not Edge-compatible. Keep this file dependency-free.
 */

/** Name of the httpOnly session cookie. */
export const SESSION_COOKIE = 'agro_session';

/** Session lifetime in seconds (8 hours). */
export const SESSION_MAX_AGE = 8 * 60 * 60;
