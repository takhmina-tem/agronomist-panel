// ── Field list ────────────────────────────────────────────────────────────────

export type FieldCard = {
  id: number;
  name: string;
  area_ha: number;
  variety_name: string;
  current_phase: string;
  disease_status: number;
  last_operation_type: string | null;
  last_operation_date: string | null;
  plant_density: number | null;
  stems_per_plant: number | null;
  moisture_risk: 'low' | 'medium' | 'high';
};

// ── Field timeline ────────────────────────────────────────────────────────────

export type OperationStatus = 'planned' | 'in_progress' | 'completed';

export type TimelineEntry = {
  id: number;
  field_id: number;
  operation_type: string;
  /** ISO date string — yyyy-MM-dd */
  operation_date: string;
  title: string;
  notes: string | null;
  /** Typed at the application layer via OperationPayloadMap; stored as JSONB */
  payload: Record<string, unknown>;
  photo_url: string | null;
  status: OperationStatus;
};

// ── Field detail ──────────────────────────────────────────────────────────────

export type FieldDetails = {
  field: {
    id: number;
    name: string;
    area_ha: number;
    variety_name: string;
    maturity_group: string;
    purpose_type: string;
    current_phase: string;
    disease_status: number;
  };
  metrics: {
    total_n: number;
    total_p: number;
    total_k: number;
    irrigation_mm: number;
    yield_t_ha: number | null;
    storage_loss_pct: number | null;
  };
  timeline: TimelineEntry[];
};

// ── Field comparison ──────────────────────────────────────────────────────────

export type HarvestCalibration = {
  /** Доля клубней 35–55 мм, % */
  pct3555: number | null;
  /** Доля клубней 55–70 мм, % */
  pct5570: number | null;
  /** Доля клубней 70+ мм, % */
  pct70plus: number | null;
};

export type ComparisonRow = {
  id: number;
  name: string;
  variety_name: string;
  area_ha: number;
  current_phase: string;
  yield_t_ha: number | null;
  k_kg_ha: number;
  irrigation_mm: number;
  disease_status: number;
  desiccation_done: boolean;
  /** Harvest calibration fractions. Null when no harvest recorded yet. */
  calibration: HarvestCalibration | null;
};

// ── Reference / dictionary entities ──────────────────────────────────────────

export type Variety = {
  id: number;
  name: string;
  maturity_group: string;
  /** столовый | чипсы | фри */
  purpose_type: string;
  yield_potential_t_ha: number;
};

export type Fertilizer = {
  id: number;
  name: string;
  fertilizer_type: string;
  n_pct: number;
  p_pct: number;
  k_pct: number;
  purpose_note: string | null;
};

// ── Field creation input ──────────────────────────────────────────────────────

export type CreateFieldInput = {
  name: string;
  area_ha: number;
  variety_id: number;
  current_phase?: string;
};

// ── Per-field analytics ────────────────────────────────────────────────────────

export type NpkEvent = {
  date: string;        // ISO yyyy-MM-dd
  product: string;
  n: number;           // N кг/га
  p: number;           // P₂O₅ кг/га
  k: number;           // K₂O кг/га
  dose: number;        // general dose кг/га
  phase: string;
};

export type IrrigationEvent = {
  date: string;
  volumeMm: number;
  typeLabel: string;   // 'Дождевание' | 'Капельное'
  goal: string;
};

/**
 * Combined irrigation + precipitation data point for the water-balance chart.
 * Built in app/fields/[id]/page.tsx by merging irrigationEvents (from DB) with
 * daily precipitation from the Open-Meteo archive.
 */
export type WaterBalancePoint = {
  date: string;
  irrigationMm: number;    // 0 when no manual irrigation on this date
  precipMm: number;        // 0 when no precipitation data or rain < threshold
  irrigationLabel: string; // 'Дождевание' | 'Капельное' | ''
  goal: string;
};

export type DiseasePoint = {
  date: string;
  lateBlight: number;
  alternaria: number;
  rhizoctonia: number;
  commonScab: number;
  weeds: number;
  /** Колорадский жук. 0 for old records that predate this field. */
  coloradoBeetle: number;
  /** Проволочник. 0 for old records that predate this field. */
  wireworm: number;
};

export type ProtectionEvent = {
  date: string;
  product: string;
  protectionType: string;  // fungicide | herbicide | insecticide
  dose: string;
  phase: string;
  weather: string;
};

export type HarvestSummary = {
  date: string;
  yieldTHa: number;
  grossTons: number;
  wastePct: number;
  fraction3555: number;
  fraction5570: number;
  fraction70plus: number;
  /** Null for records created before this field was added. */
  mechanicalDamagePct: number | null;
  /** Null for records without a damage photo URL. */
  damagePhotoUrl: string | null;
} | null;

/**
 * Season-level aggregated totals used for the "Yield vs Operations" chart.
 * All counts and totals come from real operation rows in PostgreSQL.
 */
export type SeasonOpsSummary = {
  /** Total N applied over the season, кг/га */
  totalN: number;
  /** Total K₂O applied over the season, кг/га */
  totalK: number;
  /** Total irrigation volume, мм */
  totalIrrigationMm: number;
  /** Number of crop-protection treatments */
  protectionCount: number;
  /** Number of field inspections */
  inspectionCount: number;
  /** Actual yield, т/га — null if harvest not recorded yet */
  yieldTHa: number | null;
};

export type FieldAnalyticsData = {
  npkEvents: NpkEvent[];
  irrigationEvents: IrrigationEvent[];
  diseasePoints: DiseasePoint[];
  protectionEvents: ProtectionEvent[];
  harvest: HarvestSummary;
  totals: {
    totalN: number;
    totalP: number;
    totalK: number;
    totalIrrigationMm: number;
  };
  seasonSummary: SeasonOpsSummary;
};
