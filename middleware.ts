import { type NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { SESSION_COOKIE } from '@/lib/auth-config';

// ── Public paths that don't require authentication ────────────────────────────

const PUBLIC_PREFIXES = [
  '/login',
  '/api/auth',  // login + logout endpoints
  '/api/health',
];

// ── Middleware ────────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let public paths through unconditionally
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? '');
      await jwtVerify(token, secret);
      // Valid session — proceed
      return NextResponse.next();
    } catch {
      // Expired or tampered token — fall through to redirect
    }
  }

  // API routes return 401 JSON instead of a redirect
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  // UI routes → redirect to login, preserving the original URL as ?from=
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('from', pathname);

  const response = NextResponse.redirect(loginUrl);
  // Clear a stale/invalid cookie if present
  if (token) response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every path except:
     *   _next/static  — static assets
     *   _next/image   — image optimisation
     *   favicon.ico
     */
    '/((?!_next/static|_next/image|favicon\\.ico).*)',
  ],
};
