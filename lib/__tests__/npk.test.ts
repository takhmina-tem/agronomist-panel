import { describe, it, expect } from 'vitest';
import { calcNpk, formatNpk } from '../npk';

// Fertilizer compositions from the seed dictionary:
//   NPK 16-16-16     n=16  p=16  k=16
//   Калимагнезия     n=0   p=0   k=32
//   Монокалийфосфат  n=0   p=52  k=34

describe('calcNpk', () => {
  it('calculates equal-nutrient NPK at 100 kg/ha', () => {
    expect(calcNpk({ n_pct: 16, p_pct: 16, k_pct: 16 }, 100)).toEqual({
      nKgHa: 16,
      pKgHa: 16,
      kKgHa: 16,
    });
  });

  it('calculates potassium-only fertiliser (Калимагнезия) at 180 kg/ha — matches seed data', () => {
    // Field 1 seed: doseKgHa=180, kKgHa=57.6
    expect(calcNpk({ n_pct: 0, p_pct: 0, k_pct: 32 }, 180)).toEqual({
      nKgHa: 0,
      pKgHa: 0,
      kKgHa: 57.6,
    });
  });

  it('calculates leaf fertiliser (Монокалийфосфат) at 12 kg/ha — matches seed data', () => {
    // Field 2 seed: doseKgHa=12, pKgHa=6.24, kKgHa=4.08
    expect(calcNpk({ n_pct: 0, p_pct: 52, k_pct: 34 }, 12)).toEqual({
      nKgHa: 0,
      pKgHa: 6.24,
      kKgHa: 4.08,
    });
  });

  it('calculates potassium-only fertiliser (Калимагнезия) at 210 kg/ha — matches field 3 seed', () => {
    // Field 3 seed: doseKgHa=210, kKgHa=67.2
    expect(calcNpk({ n_pct: 0, p_pct: 0, k_pct: 32 }, 210)).toEqual({
      nKgHa: 0,
      pKgHa: 0,
      kKgHa: 67.2,
    });
  });

  it('returns zeros when dose is 0', () => {
    expect(calcNpk({ n_pct: 16, p_pct: 16, k_pct: 16 }, 0)).toEqual({
      nKgHa: 0,
      pKgHa: 0,
      kKgHa: 0,
    });
  });

  it('returns zeros when all composition percentages are 0', () => {
    expect(calcNpk({ n_pct: 0, p_pct: 0, k_pct: 0 }, 200)).toEqual({
      nKgHa: 0,
      pKgHa: 0,
      kKgHa: 0,
    });
  });

  it('rounds to 2 decimal places — avoids floating-point noise', () => {
    // 33.33 * 10 / 100 = 3.333... → should round to 3.33
    const result = calcNpk({ n_pct: 33.33, p_pct: 0, k_pct: 0 }, 10);
    expect(result.nKgHa).toBe(3.33);
  });

  it('handles fractional doses correctly', () => {
    // 16% × 2.5 kg/ha = 0.4 kg/ha
    expect(calcNpk({ n_pct: 16, p_pct: 0, k_pct: 0 }, 2.5)).toEqual({
      nKgHa: 0.4,
      pKgHa: 0,
      kKgHa: 0,
    });
  });

  it('handles large doses without overflow', () => {
    const result = calcNpk({ n_pct: 46, p_pct: 0, k_pct: 0 }, 500);
    expect(result.nKgHa).toBe(230);
  });
});

describe('formatNpk', () => {
  it('formats a full NPK result as a compact Russian string', () => {
    const result = formatNpk({ nKgHa: 28.8, pKgHa: 0, kKgHa: 57.6 });
    expect(result).toBe('N 29 / P 0 / K 58 кг/га');
  });

  it('rounds display values to nearest integer', () => {
    const result = formatNpk({ nKgHa: 16.4, pKgHa: 16.6, kKgHa: 16.5 });
    expect(result).toBe('N 16 / P 17 / K 17 кг/га');
  });

  it('formats all-zero result', () => {
    const result = formatNpk({ nKgHa: 0, pKgHa: 0, kKgHa: 0 });
    expect(result).toBe('N 0 / P 0 / K 0 кг/га');
  });
});
