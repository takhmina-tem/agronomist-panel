import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { UserBar } from '@/components/user-bar';

/**
 * Protected layout — wraps every page inside the (app) route group.
 *
 * Responsibilities:
 *   1. Verify session server-side. Redirect to /login if absent or expired.
 *      (Middleware is the first line of defence; this is defence-in-depth.)
 *   2. Render the persistent top navigation bar with user identity + logout.
 *   3. Add top padding so page content clears the fixed header.
 *
 * Pages in this group:  /, /fields/[id], /dictionaries/*, /weather
 * Pages NOT in this group: /login  (public, root layout only)
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <>
      <UserBar login={session.login} />
      {/* pt-14 clears the fixed 56px header */}
      <div className="pt-14">{children}</div>
    </>
  );
}
