'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, X, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui';
import { upsertFertilizer } from '@/lib/actions';
import type { Fertilizer } from '@/lib/types';

// ── Shared styling ────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 ' +
  'placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500';

function Row({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[200px_1fr] items-start gap-3">
      <div className="pt-2">
        <span className="text-sm font-medium text-slate-700">
          {label}{required && <span className="ml-0.5 text-red-500">*</span>}
        </span>
        {hint && <div className="text-xs text-slate-400">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

// ── Form state ────────────────────────────────────────────────────────────────

type FormState = {
  name: string;
  fertilizer_type: string;
  n_pct: string;
  p_pct: string;
  k_pct: string;
  purpose_note: string;
};

const emptyForm = (): FormState => ({
  name: '',
  fertilizer_type: '',
  n_pct: '0',
  p_pct: '0',
  k_pct: '0',
  purpose_note: '',
});

function fertilizerToForm(f: Fertilizer): FormState {
  return {
    name: f.name,
    fertilizer_type: f.fertilizer_type,
    n_pct: String(f.n_pct),
    p_pct: String(f.p_pct),
    k_pct: String(f.k_pct),
    purpose_note: f.purpose_note ?? '',
  };
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function FertilizerModal({
  editTarget,
  onClose,
}: {
  editTarget: Fertilizer | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(
    editTarget ? fertilizerToForm(editTarget) : emptyForm(),
  );
  const [error, setError] = useState('');

  const set = (k: keyof FormState, v: string) => {
    setForm(prev => ({ ...prev, [k]: v }));
    setError('');
  };

  function parseNum(key: keyof FormState, label: string): number | null {
    const v = parseFloat(form[key]);
    if (isNaN(v) || v < 0 || v > 100) {
      setError(`${label}: введите число от 0 до 100`);
      return null;
    }
    return v;
  }

  async function handleSave() {
    const n = parseNum('n_pct', 'N%');   if (n === null) return;
    const p = parseNum('p_pct', 'P%');   if (p === null) return;
    const k = parseNum('k_pct', 'K%');   if (k === null) return;

    startTransition(async () => {
      const result = await upsertFertilizer({
        id: editTarget?.id,
        name: form.name,
        fertilizer_type: form.fertilizer_type,
        n_pct: n,
        p_pct: p,
        k_pct: k,
        purpose_note: form.purpose_note,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      router.refresh();
      onClose();
    });
  }

  const isEdit = editTarget !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-lg rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEdit ? 'Редактировать удобрение' : 'Новое удобрение'}
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          <Row label="Название" required>
            <input
              type="text"
              className={inputCls}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Аммофос"
              autoFocus
            />
          </Row>

          <Row label="Тип удобрения" required hint="напр. NPK, азотное, фосфорное">
            <input
              type="text"
              className={inputCls}
              value={form.fertilizer_type}
              onChange={e => set('fertilizer_type', e.target.value)}
              placeholder="NPK"
            />
          </Row>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-blue-700">N%</label>
              <input
                type="number" min="0" max="100" step="0.1"
                className={inputCls}
                value={form.n_pct}
                onChange={e => set('n_pct', e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-violet-700">P₂O₅%</label>
              <input
                type="number" min="0" max="100" step="0.1"
                className={inputCls}
                value={form.p_pct}
                onChange={e => set('p_pct', e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-emerald-700">K₂O%</label>
              <input
                type="number" min="0" max="100" step="0.1"
                className={inputCls}
                value={form.k_pct}
                onChange={e => set('k_pct', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <Row label="Примечание">
            <input
              type="text"
              className={inputCls}
              value={form.purpose_note}
              onChange={e => set('purpose_note', e.target.value)}
              placeholder="Фосфорно-калийное, вносить осенью"
            />
          </Row>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function FertilizerEditor({ fertilizers }: { fertilizers: Fertilizer[] }) {
  const [modalOpen, setModalOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<Fertilizer | null>(null);

  function openAdd()  { setEditTarget(null);    setModalOpen(true); }
  function openEdit(f: Fertilizer) { setEditTarget(f); setModalOpen(true); }
  function closeModal() { setModalOpen(false); setEditTarget(null); }

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={15} /> Добавить удобрение
        </button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {['Название', 'Тип', 'N%', 'P₂O₅%', 'K₂O%', 'Примечание', ''].map(h => (
                  <th key={h} className="px-5 py-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fertilizers.map(f => (
                <tr key={f.id} className="border-t border-slate-100 text-slate-700 hover:bg-slate-50">
                  <td className="px-5 py-3 font-semibold text-slate-900">{f.name}</td>
                  <td className="px-5 py-3">{f.fertilizer_type}</td>
                  <td className="px-5 py-3"><span className="font-semibold text-blue-700">{f.n_pct}</span></td>
                  <td className="px-5 py-3"><span className="font-semibold text-violet-700">{f.p_pct}</span></td>
                  <td className="px-5 py-3"><span className="font-semibold text-emerald-700">{f.k_pct}</span></td>
                  <td className="px-5 py-3 text-slate-500">{f.purpose_note ?? '—'}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => openEdit(f)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    >
                      <Pencil size={12} /> Изменить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {modalOpen && (
        <FertilizerModal editTarget={editTarget} onClose={closeModal} />
      )}
    </>
  );
}
