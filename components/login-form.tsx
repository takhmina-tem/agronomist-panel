'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { login } from '@/lib/auth-actions';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 ' +
  'placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500';

export function LoginForm() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setIsPending(true);

    try {
      const form = e.currentTarget;
      const loginVal = (form.elements.namedItem('login') as HTMLInputElement).value;
      const passwordVal = (form.elements.namedItem('password') as HTMLInputElement).value;
      const result = await login(loginVal, passwordVal);

      if ('error' in result) {
        setError(result.error);
        return;
      }

      // Read ?from= from the current URL client-side (avoids useSearchParams + Suspense)
      const from = new URLSearchParams(window.location.search).get('from');
      const dest = (from ?? '/') as Parameters<typeof router.push>[0];
      router.push(dest);
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} method="post" className="space-y-5">
      <div>
        <label htmlFor="login" className="mb-1.5 block text-sm font-medium text-slate-700">
          Логин
        </label>
        <input
          id="login"
          name="login"
          type="text"
          autoComplete="username"
          autoFocus
          required
          className={inputCls}
          placeholder="admin"
          disabled={isPending}
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
          Пароль
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            className={`${inputCls} pr-10`}
            placeholder="••••••••"
            disabled={isPending}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {isPending && <Loader2 size={15} className="animate-spin" />}
        {isPending ? 'Вхожу...' : 'Войти'}
      </button>
    </form>
  );
}
