/**
 * lib/operation-types.ts
 *
 * TypeScript payload types for every operation type.
 * These are the "detail models" for the 8 operation kinds.
 * They are enforced at the application layer; the database stores them
 * as structured JSONB in operations.payload.
 *
 * Schema decision: JSONB retained over typed detail tables.
 * Reason: the schema is already live with 18 seeded operations; typed detail
 * tables would require dropping operations, 8 new tables, and an 8-way JOIN
 * for every timeline query. The TypeScript types here give the same field-level
 * guarantees at the application layer. See docs/db-schema.md for full rationale.
 */

export const OPERATION_TYPES = [
  'planting',
  'inspection',
  'fertilizer',
  'irrigation',
  'crop_protection',
  'desiccation',
  'harvest',
  'storage',
] as const;

export type OperationType = (typeof OPERATION_TYPES)[number];

// ── Screen 4: Посадка ─────────────────────────────────────────────────────────

export interface PlantingPayload {
  /** Сорт картофеля — название из справочника varieties */
  variety: string;
  /** Семенной класс: элита | первая репродукция | вторая репродукция */
  seedClass: string;
  /** Фракция клубней */
  fraction: '35-55' | '55-70' | '70+';
  /** Норма посадки, т/га */
  rateTHa: number;
  /** Глубина посадки, см */
  depthCm: number;
  /** Ширина междурядья, см */
  rowSpacingCm: number;
  /** Температура почвы на глубине посадки, °C */
  soilTemperature: number;
  /** Стартовое удобрение — название из справочника fertilizers */
  starterFertilizer: string;
}

// ── Screen 5: Осмотр поля ─────────────────────────────────────────────────────

export interface InspectionPayload {
  /** Полевая всхожесть, % */
  emergencePct: number;
  /** Плотность растений, шт/га */
  plantDensity: number;
  /** Стеблей на куст, шт */
  stemsPerPlant: number;
  /** Высота ботвы, см */
  haulmHeightCm: number;
  /** Засорённость сорняками, балл 0–5 */
  weeds: number;
  /** Фитофтороз (Phytophthora infestans), балл 0–5 */
  lateBlight: number;
  /** Альтернариоз (Alternaria), балл 0–5 */
  alternaria: number;
  /** Ризоктониоз (Rhizoctonia solani), балл 0–5 */
  rhizoctonia: number;
  /** Парша обыкновенная (Common scab), балл 0–5 */
  commonScab: number;
  /** Колорадский жук (Leptinotarsa decemlineata), балл 0–5 */
  coloradoBeetle: number;
  /** Проволочник (Agriotes spp.), балл 0–5 */
  wireworm: number;
  /** Тип стресса */
  stress: 'none' | 'dry' | 'wet' | 'heat';
}

// ── Screen 6: Удобрения ───────────────────────────────────────────────────────

export interface FertilizerPayload {
  /** Название препарата — из справочника fertilizers */
  product: string;
  /** Доза внесения, кг/га */
  doseKgHa: number;
  /** Фаза развития культуры при внесении */
  phase: string;
  /** Способ внесения */
  applicationMethod: string;
  /** Азот (N) кг/га — авторасчёт по справочнику */
  nKgHa: number;
  /** Фосфор (P₂O₅) кг/га — авторасчёт по справочнику */
  pKgHa: number;
  /** Калий (K₂O) кг/га — авторасчёт по справочнику */
  kKgHa: number;
}

// ── Screen 7: Полив ───────────────────────────────────────────────────────────

export interface IrrigationPayload {
  /** Способ полива */
  type: 'sprinkler' | 'drip';
  /** Объём полива, мм */
  volumeMm: number;
  /** Электропроводность воды, мСм/см */
  waterEc: number;
  /** Цель полива — произвольный текст */
  goal: string;
}

// ── Screen 8: Защита (СЗР) ────────────────────────────────────────────────────

export interface CropProtectionPayload {
  /** Торговое название препарата */
  product: string;
  /** Тип СЗР */
  protectionType: 'fungicide' | 'herbicide' | 'insecticide';
  /** Доза, строка с единицами (напр. "0.6 л/га") */
  dose: string;
  /** Погодные условия при обработке */
  weather: string;
  /** Фаза развития при обработке */
  phase: string;
}

// ── Screen 9: Десикация ───────────────────────────────────────────────────────

export interface DesiccationPayload {
  /** Название препарата */
  product: string;
  /** Доза, строка с единицами */
  dose: string;
  /** Степень подсушивания ботвы, % */
  dryingPct: number;
  /** Цвет ботвы после обработки */
  haulmColor: string;
}

// ── Screen 10: Уборка урожая ──────────────────────────────────────────────────

export interface HarvestPayload {
  /** Валовый сбор, тонн */
  grossTons: number;
  /** Урожайность, т/га */
  yieldTHa: number;
  /** Калибр 35–55 мм, % */
  fraction3555: number;
  /** Калибр 55–70 мм, % */
  fraction5570: number;
  /** Калибр 70+ мм, % */
  fraction70plus: number;
  /** Отходы, % */
  wastePct: number;
  /** Дата начала уборки (опционально, если уборка длится несколько дней) */
  harvestStartDate?: string;
  /** Дата окончания уборки (опционально) */
  harvestEndDate?: string;
  /** Механические повреждения клубней, % (опционально) */
  mechanicalDamagePct?: number;
  /** URL фото механических повреждений (опционально; отдельно от общего photo_url операции) */
  damagePhotoUrl?: string;
}

// ── Screen 11: Хранение ───────────────────────────────────────────────────────

export interface StoragePayload {
  /** Температура воздуха в камере, °C */
  airTemp: number;
  /** Температура массы клубней, °C */
  massTemp: number;
  /** Относительная влажность, % */
  humidity: number;
  /** Потери за период, % */
  lossPct: number;
  /** Болезни при хранении (описание или 'none') */
  storageDisease: string;
}

// ── Discriminated union ───────────────────────────────────────────────────────

export type OperationPayloadMap = {
  planting: PlantingPayload;
  inspection: InspectionPayload;
  fertilizer: FertilizerPayload;
  irrigation: IrrigationPayload;
  crop_protection: CropProtectionPayload;
  desiccation: DesiccationPayload;
  harvest: HarvestPayload;
  storage: StoragePayload;
};

export type PayloadOf<T extends OperationType> = OperationPayloadMap[T];
