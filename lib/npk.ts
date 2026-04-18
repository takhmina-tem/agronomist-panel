/**
 * lib/npk.ts
 *
 * Pure NPK calculation utilities.
 * No framework imports — safe to unit-test in Node without any mocking.
 *
 * Formula:
 *   nutrient_kg_ha = composition_pct * dose_kg_ha / 100
 *
 * Results are rounded to 2 decimal places to avoid floating-point noise
 * (e.g. 0.1 * 0.1 = 0.010000000000000002).
 */

export type FertilizerComposition = {
  n_pct: number;
  p_pct: number;
  k_pct: number;
};

export type NpkResult = {
  nKgHa: number;
  pKgHa: number;
  kKgHa: number;
};

/**
 * Calculate N, P₂O₅ and K₂O application rates (kg/ha) from a fertilizer's
 * elemental composition and the physical dose applied to the field.
 *
 * @param composition  - nutrient percentages from the fertilizer dictionary
 * @param doseKgHa     - physical dose applied, kg/ha
 * @returns            - derived nutrient amounts, kg/ha (rounded to 2 dp)
 */
export function calcNpk(
  composition: FertilizerComposition,
  doseKgHa: number,
): NpkResult {
  const round2 = (v: number) => Math.round(v * 100) / 100;
  return {
    nKgHa: round2((composition.n_pct * doseKgHa) / 100),
    pKgHa: round2((composition.p_pct * doseKgHa) / 100),
    kKgHa: round2((composition.k_pct * doseKgHa) / 100),
  };
}

/**
 * Format a single NPK result as a compact display string,
 * e.g. "N 28 / P 0 / K 58 кг/га".
 * Useful for tooltips and analytics labels.
 */
export function formatNpk(npk: NpkResult): string {
  const r = (v: number) => Math.round(v);
  return `N ${r(npk.nKgHa)} / P ${r(npk.pKgHa)} / K ${r(npk.kKgHa)} кг/га`;
}
