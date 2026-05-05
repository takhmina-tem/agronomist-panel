import Link from 'next/link';
import { Settings } from 'lucide-react';
import { LogoutButton } from '@/components/logout-button';

/**
 * Top navigation bar shown on all protected pages.
 * Server Component — receives session data from the (app) layout.
 */
export function UserBar({ login }: { login: string }) {
  const initial = login[0]?.toUpperCase() ?? '?';

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-14 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Left — app identity */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-sm font-semibold text-slate-900 hover:text-brand-700"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white shadow-sm">
            А
          </span>
          <span className="hidden sm:block">Панель агронома</span>
        </Link>

        {/* Right — user indicator + logout */}
        <div className="flex items-center gap-3">
          {/* User avatar chip */}
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
              {initial}
            </span>
            <span className="max-w-[100px] truncate text-xs font-medium text-slate-700" title={login}>
              {login}
            </span>
          </div>

          <Link
            href="/settings/telegram"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            title="Настройки Telegram"
          >
            <Settings size={16} />
          </Link>

          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
