'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, Loader2, Plus } from 'lucide-react';
import type { Variety } from '@/lib/types';

const PHASES = [
  'посадка', 'всходы', 'смыкание', 'бутонизация',
  'цветение', 'клубнеобразование', 'десикация', 'уборка',
];

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 ' +
  'placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500';
const selectCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-500';

export function NewFieldModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [name, setName] = useState('');
  const [areaHa, setAreaHa] = useState('');
  const [varietyId, setVarietyId] = useState('');
  const [phase, setPhase] = useState('посадка');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/references/varieties')
      .then(r => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) {
          setVarieties(data as Variety[]);
          if (data.length > 0) setVarietyId(String((data[0] as Variety).id));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open]);

  function resetForm() {
    setName('');
    setAreaHa('');
    setVarietyId(varieties.length > 0 ? String(varieties[0].id) : '');
    setPhase('посадка');
    setError('');
  }

  function handleClose() {
    setOpen(false);
    resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const area = parseFloat(areaHa);
    if (!name.trim()) { setError('Укажите название поля'); return; }
    if (!areaHa || isNaN(area) || area <= 0) { setError('Укажите площадь поля (га)'); return; }
    if (!varietyId) { setError('Выберите сорт'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          area_ha: area,
          variety_id: parseInt(varietyId, 10),
          current_phase: phase,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Не удалось создать поле');
        return;
      }

      handleClose();
      router.refresh();
    } catch {
      setError('Ошибка сети. Проверьте соединение.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <Plus size={16} />
        Добавить поле
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">Новое поле</h2>
              <button
                onClick={handleClose}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Название поля <span className="text-red-500">*</span>
                </label>
                <input
                  ref={nameRef}
                  type="text"
                  className={inputCls}
                  placeholder="Например: Поле №1 — Северный"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Площадь, га <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className={inputCls}
                  placeholder="12.5"
                  value={areaHa}
                  onChange={e => setAreaHa(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Сорт <span className="text-red-500">*</span>
                </label>
                {varieties.length === 0 ? (
                  <p className="text-xs text-slate-400">Загрузка сортов…</p>
                ) : (
                  <select
                    className={selectCls}
                    value={varietyId}
                    onChange={e => setVarietyId(e.target.value)}
                  >
                    {varieties.map(v => (
                      <option key={v.id} value={String(v.id)}>
                        {v.name}
                        {v.maturity_group ? ` (${v.maturity_group})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Текущая фаза
                </label>
                <select
                  className={selectCls}
                  value={phase}
                  onChange={e => setPhase(e.target.value)}
                >
                  {PHASES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  Создать поле
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
