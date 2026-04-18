import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { LoginForm } from '@/components/login-form';

export const metadata = { title: 'Вход — Панель агронома' };

export default async function LoginPage() {
  // If already authenticated, go straight to the dashboard
  const session = await getSession();
  if (session) redirect('/');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 p-4">
      <div className="w-full max-w-sm">
        {/* Logo / app name */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-bold text-white shadow-lg">
            А
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Панель агронома</h1>
          <p className="mt-1 text-sm text-slate-500">Войдите для продолжения работы</p>
        </div>

        {/* Login form */}
        <div className="rounded-3xl border border-white/70 bg-white/90 p-8 shadow-soft backdrop-blur">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
