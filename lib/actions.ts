'use server';

import { revalidatePath } from 'next/cache';
import { query } from '@/lib/db';

// ── Varieties ─────────────────────────────────────────────────────────────────

export type VarietyInput = {
  id?: number;
  name: string;
  maturity_group: string;
  purpose_type: string;
  yield_potential_t_ha: number;
};

export async function upsertVariety(input: VarietyInput): Promise<{ error?: string }> {
  const { id, name, maturity_group, purpose_type, yield_potential_t_ha } = input;

  if (!name.trim())          return { error: 'Укажите название сорта' };
  if (!maturity_group.trim()) return { error: 'Укажите группу спелости' };
  if (!purpose_type.trim())   return { error: 'Укажите назначение' };
  if (yield_potential_t_ha < 0 || yield_potential_t_ha > 200)
    return { error: 'Потенциал урожайности: 0–200 т/га' };

  try {
    if (id) {
      await query(
        `UPDATE varieties
         SET name=$1, maturity_group=$2, purpose_type=$3, yield_potential_t_ha=$4
         WHERE id=$5`,
        [name.trim(), maturity_group, purpose_type, yield_potential_t_ha, id],
      );
    } else {
      await query(
        `INSERT INTO varieties (name, maturity_group, purpose_type, yield_potential_t_ha)
         VALUES ($1, $2, $3, $4)`,
        [name.trim(), maturity_group, purpose_type, yield_potential_t_ha],
      );
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('unique') || msg.includes('duplicate'))
      return { error: 'Сорт с таким названием уже существует' };
    return { error: 'Ошибка базы данных: ' + msg };
  }

  revalidatePath('/dictionaries/varieties');
  return {};
}

// ── Fertilizers ───────────────────────────────────────────────────────────────

export type FertilizerInput = {
  id?: number;
  name: string;
  fertilizer_type: string;
  n_pct: number;
  p_pct: number;
  k_pct: number;
  purpose_note: string;
};

export async function upsertFertilizer(input: FertilizerInput): Promise<{ error?: string }> {
  const { id, name, fertilizer_type, n_pct, p_pct, k_pct, purpose_note } = input;

  if (!name.trim())           return { error: 'Укажите название удобрения' };
  if (!fertilizer_type.trim()) return { error: 'Укажите тип удобрения' };
  for (const [label, val] of [['N%', n_pct], ['P%', p_pct], ['K%', k_pct]] as [string, number][]) {
    if (val < 0 || val > 100) return { error: `${label}: значение должно быть от 0 до 100` };
  }

  try {
    if (id) {
      await query(
        `UPDATE fertilizers
         SET name=$1, fertilizer_type=$2, n_pct=$3, p_pct=$4, k_pct=$5, purpose_note=$6
         WHERE id=$7`,
        [name.trim(), fertilizer_type.trim(), n_pct, p_pct, k_pct, purpose_note.trim() || null, id],
      );
    } else {
      await query(
        `INSERT INTO fertilizers (name, fertilizer_type, n_pct, p_pct, k_pct, purpose_note)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [name.trim(), fertilizer_type.trim(), n_pct, p_pct, k_pct, purpose_note.trim() || null],
      );
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('unique') || msg.includes('duplicate'))
      return { error: 'Удобрение с таким названием уже существует' };
    return { error: 'Ошибка базы данных: ' + msg };
  }

  revalidatePath('/dictionaries/fertilizers');
  return {};
}
