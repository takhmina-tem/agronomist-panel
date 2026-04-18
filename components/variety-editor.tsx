'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, X, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui';
import { upsertVariety } from '@/lib/actions';
import type { Variety } from '@/lib/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const MATURITY_GROUPS = ['ранний', 'среднеранний', 'среднеспелый', 'среднепоздний', 'поздний'];
const PURPOSE_TYPES   = ['столовый', 'чипсы', 'фри'];

// ── Shared styling ────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 ' +
  'placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500';
const selectCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-500';

function Row({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[200px_1fr] items-start gap-3">
      <span className="pt-2 text-sm font-medium text-slate-700">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      <div>{children}</div>
    </div>
  );
}

// ── Empty form state ──────────────────────────────────────────────────────────

type FormState = {
  name: string;
  maturity_group: string;
  purpose_type: string;
  yield_potential_t_ha: string;
};

const emptyForm = (): FormState => ({
  name: '',
  maturity_group: MATURITY_GROUPS[2],
  purpose_type: PURPOSE_TYPES[0],
  yield_potential_t_ha: '',
});

function varietyToForm(v: Variety): FormState {
  return {
    name: v.name,
    maturity_group: v.maturity_group,
    purpose_type: v.purpose_type,
    yield_potential_t_ha: String(v.yield_potential_t_ha),
  };
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function VarietyModal({
  editTarget,
  onClose,
}: {
  editTarget: Variety | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(
    editTarget ? varietyToForm(editTarget) : emptyForm(),
  );
  const [error, setError] = useState('');

  const set = (k: keyof FormState, v: string) => {
    setForm(prev => ({ ...prev, [k]: v }));
    setError('');
  };

  async function handleSave() {
    const yieldVal = parseFloat(form.yield_potential_t_ha);
    if (!form.yield_potential_t_ha || isNaN(yieldVal)) {
      setError('Укажите потенциал урожайности (число)');
      return;
    }

    startTransition(async () => {
      const result = await upsertVariety({
        id: editTarget?.id,
        name: form.name,
        maturity_group: form.maturity_group,
        purpose_type: form.purpose_type,
        yield_potential_t_ha: yieldVal,
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
            {isEdit ? 'Редактировать сорт' : 'Новый сорт'}
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
              placeholder="Коломба"
              autoFocus
            />
          </Row>

          <Row label="Группа спелости" required>
            <select className={selectCls} value={form.maturity_group} onChange={e => set('maturity_group', e.target.value)}>
              {MATURITY_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </Row>

          <Row label="Назначение" required>
            <select className={selectCls} value={form.purpose_type} onChange={e => set('purpose_type', e.target.value)}>
              {PURPOSE_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Row>

          <Row label="Потенциал, т/га" required>
            <input
              type="number"
              min="0"
              max="200"
              step="0.5"
              className={inputCls}
              value={form.yield_potential_t_ha}
              onChange={e => set('yield_potential_t_ha', e.target.value)}
              placeholder="55"
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

export function VarietyEditor({ varieties }: { varieties: Variety[] }) {
  const [modalOpen, setModalOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<Variety | null>(null);

  function openAdd()  { setEditTarget(null);    setModalOpen(true); }
  function openEdit(v: Variety) { setEditTarget(v); setModalOpen(true); }
  function closeModal() { setModalOpen(false); setEditTarget(null); }

  return (
    <>
      {/* Add button — rendered outside the Card so the caller can position it */}
      <div className="flex justify-end">
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={15} /> Добавить сорт
        </button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {['Сорт', 'Группа спелости', 'Назначение', 'Потенциал урожайности', ''].map(h => (
                  <th key={h} className="px-5 py-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {varieties.map(v => (
                <tr key={v.id} className="border-t border-slate-100 text-slate-700 hover:bg-slate-50">
                  <td className="px-5 py-3 font-semibold text-slate-900">{v.name}</td>
                  <td className="px-5 py-3">{v.maturity_group}</td>
                  <td className="px-5 py-3">{v.purpose_type}</td>
                  <td className="px-5 py-3">{v.yield_potential_t_ha} т/га</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => openEdit(v)}
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
        <VarietyModal editTarget={editTarget} onClose={closeModal} />
      )}
    </>
  );
}
