'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Loader2, Send, CheckCircle2, XCircle } from 'lucide-react';
import { Card, Shell, SectionTitle } from '@/components/ui';

type Recipient = {
  id: number;
  chat_id: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
};

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 ' +
  'placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500';

export default function TelegramSettingsPage() {
  const router = useRouter();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [chatId,     setChatId]     = useState('');
  const [label,      setLabel]      = useState('');
  const [adding,     setAdding]     = useState(false);
  const [addError,   setAddError]   = useState('');
  const [toggling,   setToggling]   = useState<number | null>(null);

  const fetchRecipients = useCallback(async () => {
    try {
      const res  = await fetch('/api/settings/telegram/recipients');
      const data = await res.json() as Recipient[];
      setRecipients(Array.isArray(data) ? data : []);
    } catch {
      setRecipients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecipients(); }, [fetchRecipients]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    const id = chatId.trim();
    if (!id) { setAddError('Укажите chat_id'); return; }

    setAdding(true);
    try {
      const res = await fetch('/api/settings/telegram/recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: id, label: label.trim() || undefined }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setAddError(data.error ?? 'Не удалось добавить');
        return;
      }

      setChatId('');
      setLabel('');
      await fetchRecipients();
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(id: number) {
    setToggling(id);
    try {
      await fetch(`/api/settings/telegram/recipients/${id}`, { method: 'PATCH' });
      await fetchRecipients();
    } finally {
      setToggling(null);
    }
  }

  const active   = recipients.filter(r => r.is_active);
  const inactive = recipients.filter(r => !r.is_active);

  return (
    <Shell>
      <div className="space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} /> Назад
        </Link>

        <SectionTitle
          eyebrow="Настройки"
          title="Telegram — ежедневная сводка"
          description="Список получателей. Сводка отправляется ежедневно в 09:00 по Алматы за предыдущий день."
        />

        {/* Add form */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-slate-900">Добавить получателя</h3>
          <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                chat_id <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className={inputCls}
                placeholder="-1001234567890 или 123456789"
                value={chatId}
                onChange={e => setChatId(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-600">Метка (необязательно)</label>
              <input
                type="text"
                className={inputCls}
                placeholder="Например: Агрономы Аксу"
                value={label}
                onChange={e => setLabel(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60 sm:mb-0"
            >
              {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Добавить
            </button>
          </form>
          {addError && (
            <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{addError}</p>
          )}
          <p className="mt-3 text-xs text-slate-400">
            Как получить chat_id: отправь боту любое сообщение, затем открой{' '}
            <code className="rounded bg-slate-100 px-1">
              https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates
            </code>
          </p>
        </Card>

        {/* Active recipients */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-slate-900">
            Активные получатели{' '}
            <span className="ml-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
              {active.length}
            </span>
          </h3>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 size={14} className="animate-spin" /> Загрузка…
            </div>
          ) : active.length === 0 ? (
            <p className="text-sm text-slate-400">Нет активных получателей. Добавьте первого выше.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {active.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      <span className="font-mono text-sm font-medium text-slate-800">{r.chat_id}</span>
                    </div>
                    {r.label && <div className="ml-5 text-xs text-slate-500">{r.label}</div>}
                  </div>
                  <button
                    onClick={() => handleToggle(r.id)}
                    disabled={toggling === r.id}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    {toggling === r.id ? <Loader2 size={12} className="animate-spin" /> : 'Отключить'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Inactive recipients */}
        {inactive.length > 0 && (
          <Card>
            <h3 className="mb-4 text-base font-semibold text-slate-500">
              Отключённые{' '}
              <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                {inactive.length}
              </span>
            </h3>
            <div className="divide-y divide-slate-100">
              {inactive.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-4 py-3 opacity-50">
                  <div>
                    <div className="flex items-center gap-2">
                      <XCircle size={14} className="text-slate-400" />
                      <span className="font-mono text-sm text-slate-600">{r.chat_id}</span>
                    </div>
                    {r.label && <div className="ml-5 text-xs text-slate-400">{r.label}</div>}
                  </div>
                  <button
                    onClick={() => handleToggle(r.id)}
                    disabled={toggling === r.id}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    {toggling === r.id ? <Loader2 size={12} className="animate-spin" /> : 'Включить'}
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Info */}
        <Card>
          <div className="flex items-start gap-3">
            <Send size={16} className="mt-0.5 shrink-0 text-brand-600" />
            <div className="space-y-1 text-sm text-slate-600">
              <p><strong>Расписание:</strong> ежедневно в 09:00 Asia/Almaty (04:00 UTC)</p>
              <p><strong>Содержание:</strong> операции за предыдущий день — поля, типы операций, гектары</p>
              <p><strong>Ручной тест:</strong></p>
              <pre className="mt-1 overflow-x-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
{`curl -H "Authorization: Bearer $CRON_SECRET" \\
  "https://<домен>/api/cron/daily-telegram-summary?date=YYYY-MM-DD"`}
              </pre>
            </div>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
