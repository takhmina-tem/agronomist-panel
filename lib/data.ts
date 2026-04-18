import { notFound } from 'next/navigation';
import { query } from '@/lib/db';
import type {
  ComparisonRow,
  CreateFieldInput,
  FieldAnalyticsData,
  Fertilizer,
  FieldCard,
  FieldDetails,
  HarvestCalibration,
  TimelineEntry,
  Variety,
} from '@/lib/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function num(v: unknown): number {
  return Number(v) || 0;
}

// ── Screen 1: Field list ──────────────────────────────────────────────────────

export async function getFields(): Promise<FieldCard[]> {
  const rows = await query<{
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
    last_mm: number | null;
  }>(`
    SELECT
      f.id,
      f.name,
      f.area_ha,
      v.name                              AS variety_name,
      f.current_phase,
      f.disease_status,
      latest_op.operation_type            AS last_operation_type,
      latest_op.operation_date::text      AS last_operation_date,
      insp.plant_density,
      insp.stems_per_plant,
      irr.last_mm
    FROM fields f
    JOIN varieties v ON v.id = f.variety_id

    -- Latest operation of any type per field
    LEFT JOIN LATERAL (
      SELECT operation_type, operation_date
      FROM   operations
      WHERE  field_id = f.id
      ORDER  BY operation_date DESC, id DESC
      LIMIT  1
    ) latest_op ON true

    -- Latest inspection: plant density + stems
    LEFT JOIN LATERAL (
      SELECT
        (payload->>'plantDensity')::numeric  AS plant_density,
        (payload->>'stemsPerPlant')::numeric AS stems_per_plant
      FROM   operations
      WHERE  field_id = f.id
        AND  operation_type = 'inspection'
      ORDER  BY operation_date DESC, id DESC
      LIMIT  1
    ) insp ON true

    -- Latest irrigation: volume for moisture_risk derivation
    LEFT JOIN LATERAL (
      SELECT (payload->>'volumeMm')::numeric AS last_mm
      FROM   operations
      WHERE  field_id = f.id
        AND  operation_type = 'irrigation'
      ORDER  BY operation_date DESC, id DESC
      LIMIT  1
    ) irr ON true

    ORDER BY f.name
  `);

  return rows.map((row) => {
    const lastMm = row.last_mm ?? 0;
    return {
      id: row.id,
      name: row.name,
      area_ha: row.area_ha,
      variety_name: row.variety_name,
      current_phase: row.current_phase,
      disease_status: row.disease_status,
      last_operation_type: row.last_operation_type,
      last_operation_date: row.last_operation_date,
      plant_density: row.plant_density,
      stems_per_plant: row.stems_per_plant,
      // moisture_risk is a business rule, not a DB concern
      moisture_risk: lastMm < 18 ? 'high' : lastMm < 28 ? 'medium' : 'low',
    } satisfies FieldCard;
  });
}

// ── Screen 2: Field detail + timeline ────────────────────────────────────────

export async function getFieldById(id: number): Promise<FieldDetails> {
  // 1. Field row + variety
  const fieldRows = await query<{
    id: number;
    name: string;
    area_ha: number;
    current_phase: string;
    disease_status: number;
    variety_name: string;
    maturity_group: string;
    purpose_type: string;
  }>(`
    SELECT
      f.id, f.name, f.area_ha, f.current_phase, f.disease_status,
      v.name AS variety_name, v.maturity_group, v.purpose_type
    FROM  fields f
    JOIN  varieties v ON v.id = f.variety_id
    WHERE f.id = $1
  `, [id]);

  if (!fieldRows[0]) notFound();
  const f = fieldRows[0];

  // 2. All operations — used for timeline + metrics derivation in TypeScript
  const ops = await query<TimelineEntry>(`
    SELECT
      id,
      field_id,
      operation_type,
      operation_date::text AS operation_date,
      title,
      notes,
      payload,
      photo_url,
      status
    FROM  operations
    WHERE field_id = $1
    ORDER BY operation_date DESC, id DESC
  `, [id]);

  // 3. Derive season metrics from operations (business logic in TypeScript)
  const fertOps = ops.filter((o) => o.operation_type === 'fertilizer');
  const irrOps  = ops.filter((o) => o.operation_type === 'irrigation');
  const harvOp  = ops.find((o) => o.operation_type === 'harvest') ?? null;
  const storOp  = ops.find((o) => o.operation_type === 'storage')  ?? null;

  return {
    field: {
      id: f.id,
      name: f.name,
      area_ha: f.area_ha,
      variety_name: f.variety_name,
      maturity_group: f.maturity_group,
      purpose_type: f.purpose_type,
      current_phase: f.current_phase,
      disease_status: f.disease_status,
    },
    metrics: {
      total_n:          fertOps.reduce((s, o) => s + num(o.payload.nKgHa), 0),
      total_p:          fertOps.reduce((s, o) => s + num(o.payload.pKgHa), 0),
      total_k:          fertOps.reduce((s, o) => s + num(o.payload.kKgHa), 0),
      irrigation_mm:    irrOps.reduce((s, o) => s + num(o.payload.volumeMm), 0),
      yield_t_ha:       harvOp ? num(harvOp.payload.yieldTHa) : null,
      storage_loss_pct: storOp ? num(storOp.payload.lossPct)  : null,
    },
    timeline: ops,
  };
}

// ── Screen 13: Field comparison ───────────────────────────────────────────────

export async function getComparison(): Promise<ComparisonRow[]> {
  const rows = await query<{
    id: number;
    name: string;
    area_ha: number;
    variety_name: string;
    current_phase: string;
    disease_status: number;
    yield_t_ha: number | null;
    fraction3555: number | null;
    fraction5570: number | null;
    fraction70plus: number | null;
    k_kg_ha: number;
    irrigation_mm: number;
    desiccation_done: boolean;
  }>(`
    SELECT
      f.id,
      f.name,
      f.area_ha,
      v.name  AS variety_name,
      f.current_phase,
      f.disease_status,

      -- Latest harvest: yield + calibration fractions
      harv.yield_t_ha,
      harv.fraction3555,
      harv.fraction5570,
      harv.fraction70plus,

      -- Season totals
      COALESCE(fert.k_kg_ha, 0)      AS k_kg_ha,
      COALESCE(irr.irrigation_mm, 0) AS irrigation_mm,

      -- Desiccation performed this season
      COALESCE(des.cnt, 0) > 0       AS desiccation_done

    FROM fields f
    JOIN varieties v ON v.id = f.variety_id

    LEFT JOIN LATERAL (
      SELECT
        (payload->>'yieldTHa')::numeric    AS yield_t_ha,
        (payload->>'fraction3555')::numeric AS fraction3555,
        (payload->>'fraction5570')::numeric AS fraction5570,
        (payload->>'fraction70plus')::numeric AS fraction70plus
      FROM  operations
      WHERE field_id = f.id AND operation_type = 'harvest'
      ORDER BY operation_date DESC, id DESC
      LIMIT 1
    ) harv ON true

    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM((payload->>'kKgHa')::numeric), 0) AS k_kg_ha
      FROM  operations
      WHERE field_id = f.id AND operation_type = 'fertilizer'
    ) fert ON true

    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM((payload->>'volumeMm')::numeric), 0) AS irrigation_mm
      FROM  operations
      WHERE field_id = f.id AND operation_type = 'irrigation'
    ) irr ON true

    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS cnt
      FROM  operations
      WHERE field_id = f.id AND operation_type = 'desiccation'
    ) des ON true

    ORDER BY f.name
  `);

  return rows.map((row) => {
    const calibration: HarvestCalibration | null =
      row.yield_t_ha !== null
        ? {
            pct3555:   row.fraction3555,
            pct5570:   row.fraction5570,
            pct70plus: row.fraction70plus,
          }
        : null;

    return {
      id:               row.id,
      name:             row.name,
      variety_name:     row.variety_name,
      area_ha:          row.area_ha,
      current_phase:    row.current_phase,
      yield_t_ha:       row.yield_t_ha,
      k_kg_ha:          row.k_kg_ha,
      irrigation_mm:    row.irrigation_mm,
      disease_status:   row.disease_status,
      desiccation_done: row.desiccation_done,
      calibration,
    } satisfies ComparisonRow;
  });
}

// ── Dashboard analytics ───────────────────────────────────────────────────────

export async function getDashboardSummary() {
  // KPI cards
  const [kpi] = await query<{
    total_fields: number;
    total_area: number;
    disease_alerts: number;
  }>(`
    SELECT
      COUNT(*)::int                                       AS total_fields,
      ROUND(SUM(area_ha)::numeric, 1)                    AS total_area,
      COUNT(*) FILTER (WHERE disease_status >= 3)::int   AS disease_alerts
    FROM fields
  `);

  const [harvestKpi] = await query<{ avg_yield_t_ha: number | null }>(`
    SELECT ROUND(AVG((payload->>'yieldTHa')::numeric), 1) AS avg_yield_t_ha
    FROM   operations
    WHERE  operation_type = 'harvest'
  `);

  const [irrKpi] = await query<{ irrigation_mm: number }>(`
    SELECT ROUND(COALESCE(SUM((payload->>'volumeMm')::numeric), 0)) AS irrigation_mm
    FROM   operations
    WHERE  operation_type = 'irrigation'
  `);

  const summary = {
    total_fields:    kpi.total_fields,
    total_area:      kpi.total_area,
    disease_alerts:  kpi.disease_alerts,
    avg_yield_t_ha:  harvestKpi.avg_yield_t_ha,
    irrigation_mm:   num(irrKpi.irrigation_mm),
  };

  // Disease trend — average lateBlight score per inspection date
  const diseaseTrend = await query<{ date: string; late_blight: number }>(`
    SELECT
      operation_date::text                                   AS date,
      ROUND(AVG((payload->>'lateBlight')::numeric), 1)       AS late_blight
    FROM   operations
    WHERE  operation_type = 'inspection'
    GROUP  BY operation_date
    ORDER  BY operation_date
  `);

  // Yield vs potassium per field (for bar chart)
  const yieldVsPotassium = await query<{
    name: string;
    potassium: number;
    yield: number | null;
  }>(`
    SELECT
      f.name,
      COALESCE(fert.k_kg_ha, 0)  AS potassium,
      harv.yield_t_ha            AS yield
    FROM fields f

    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM((payload->>'kKgHa')::numeric), 0) AS k_kg_ha
      FROM   operations
      WHERE  field_id = f.id AND operation_type = 'fertilizer'
    ) fert ON true

    LEFT JOIN LATERAL (
      SELECT (payload->>'yieldTHa')::numeric AS yield_t_ha
      FROM   operations
      WHERE  field_id = f.id AND operation_type = 'harvest'
      ORDER  BY operation_date DESC, id DESC
      LIMIT  1
    ) harv ON true

    ORDER BY f.name
  `);

  return { summary, diseaseTrend, yieldVsPotassium };
}

// ── Reference / dictionary ────────────────────────────────────────────────────

export async function getVarieties(): Promise<Variety[]> {
  return query<Variety>(
    'SELECT id, name, maturity_group, purpose_type, yield_potential_t_ha FROM varieties ORDER BY name'
  );
}

export async function getFertilizers(): Promise<Fertilizer[]> {
  return query<Fertilizer>(
    'SELECT id, name, fertilizer_type, n_pct, p_pct, k_pct, purpose_note FROM fertilizers ORDER BY name'
  );
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Insert a new operation and optionally update the field's current_phase
 * or disease_status. Returns the persisted operation row.
 *
 * Called by POST /api/operations. The route must `await` this function.
 */
export async function addOperation(body: {
  field_id: number;
  operation_type: string;
  operation_date: string;
  title: string;
  notes?: string;
  payload?: Record<string, unknown>;
  photo_url?: string;
  status?: string;
  current_phase?: string;
  disease_status?: number;
}): Promise<TimelineEntry> {
  const [op] = await query<TimelineEntry>(`
    INSERT INTO operations (field_id, operation_type, operation_date, title, notes, payload, photo_url, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING
      id, field_id, operation_type,
      operation_date::text AS operation_date,
      title, notes, payload, photo_url, status
  `, [
    body.field_id,
    body.operation_type,
    body.operation_date,
    body.title,
    body.notes ?? null,
    body.payload ?? {},
    body.photo_url ?? null,
    body.status ?? 'completed',
  ]);

  // Conditionally update field metadata after the operation
  if (body.current_phase !== undefined || typeof body.disease_status === 'number') {
    const setClauses: string[] = ['updated_at = now()'];
    const params: unknown[]    = [];

    if (body.current_phase !== undefined) {
      params.push(body.current_phase);
      setClauses.push(`current_phase = $${params.length}`);
    }
    if (typeof body.disease_status === 'number') {
      params.push(body.disease_status);
      setClauses.push(`disease_status = $${params.length}`);
    }
    params.push(body.field_id);
    await query(
      `UPDATE fields SET ${setClauses.join(', ')} WHERE id = $${params.length}`,
      params
    );
  }

  return op;
}

/**
 * Create a new field. Returns the new field id.
 * Required by the "add field" flow (UI not yet implemented).
 */
export async function createField(input: CreateFieldInput): Promise<{ id: number }> {
  const [row] = await query<{ id: number }>(`
    INSERT INTO fields (name, area_ha, variety_id, current_phase)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `, [
    input.name,
    input.area_ha,
    input.variety_id,
    input.current_phase ?? 'посадка',
  ]);
  return row;
}

// ── Per-field analytics ────────────────────────────────────────────────────────

/**
 * Derive all per-field analytics series from the operations table.
 * Returns structured data ready for chart components; all values come from
 * real PostgreSQL rows — no synthetic data.
 *
 * Ordered ASC so charts render left-to-right chronologically.
 */
export async function getFieldAnalytics(fieldId: number): Promise<FieldAnalyticsData> {
  const rows = await query<{
    operation_type: string;
    operation_date: string;
    payload: Record<string, unknown>;
  }>(`
    SELECT operation_type, operation_date::text AS operation_date, payload
    FROM   operations
    WHERE  field_id = $1
    ORDER  BY operation_date ASC, id ASC
  `, [fieldId]);

  const n = (v: unknown) => Number(v) || 0;
  const s = (v: unknown) => String(v ?? '');

  const npkEvents = rows
    .filter(r => r.operation_type === 'fertilizer')
    .map(r => ({
      date:    r.operation_date,
      product: s(r.payload.product),
      n:       n(r.payload.nKgHa),
      p:       n(r.payload.pKgHa),
      k:       n(r.payload.kKgHa),
      dose:    n(r.payload.doseKgHa),
      phase:   s(r.payload.phase),
    }));

  const irrigationEvents = rows
    .filter(r => r.operation_type === 'irrigation')
    .map(r => ({
      date:      r.operation_date,
      volumeMm:  n(r.payload.volumeMm),
      typeLabel: r.payload.type === 'drip' ? 'Капельное' : 'Дождевание',
      goal:      s(r.payload.goal),
    }));

  const diseasePoints = rows
    .filter(r => r.operation_type === 'inspection')
    .map(r => ({
      date:           r.operation_date,
      lateBlight:     n(r.payload.lateBlight),
      alternaria:     n(r.payload.alternaria),
      rhizoctonia:    n(r.payload.rhizoctonia),
      commonScab:     n(r.payload.commonScab),
      weeds:          n(r.payload.weeds),
      // Pest fields added later — old JSONB records return undefined → n() → 0
      coloradoBeetle: n(r.payload.coloradoBeetle),
      wireworm:       n(r.payload.wireworm),
    }));

  const protectionEvents = rows
    .filter(r => r.operation_type === 'crop_protection')
    .map(r => ({
      date:           r.operation_date,
      product:        s(r.payload.product),
      protectionType: s(r.payload.protectionType),
      dose:           s(r.payload.dose),
      phase:          s(r.payload.phase),
      weather:        s(r.payload.weather),
    }));

  const hr = rows.find(r => r.operation_type === 'harvest');
  const harvest = hr
    ? {
        date:                hr.operation_date,
        yieldTHa:            n(hr.payload.yieldTHa),
        grossTons:           n(hr.payload.grossTons),
        wastePct:            n(hr.payload.wastePct),
        fraction3555:        n(hr.payload.fraction3555),
        fraction5570:        n(hr.payload.fraction5570),
        fraction70plus:      n(hr.payload.fraction70plus),
        // Optional fields added later — old records return undefined → safe defaults
        mechanicalDamagePct: hr.payload.mechanicalDamagePct != null
          ? n(hr.payload.mechanicalDamagePct)
          : null,
        damagePhotoUrl:      typeof hr.payload.damagePhotoUrl === 'string'
          ? hr.payload.damagePhotoUrl
          : null,
      }
    : null;

  const round1 = (x: number) => Math.round(x * 10) / 10;
  const totals = {
    totalN:            round1(npkEvents.reduce((acc, e) => acc + e.n, 0)),
    totalP:            round1(npkEvents.reduce((acc, e) => acc + e.p, 0)),
    totalK:            round1(npkEvents.reduce((acc, e) => acc + e.k, 0)),
    totalIrrigationMm: irrigationEvents.reduce((acc, e) => acc + e.volumeMm, 0),
  };

  const seasonSummary = {
    totalN:            totals.totalN,
    totalK:            totals.totalK,
    totalIrrigationMm: totals.totalIrrigationMm,
    protectionCount:   protectionEvents.length,
    inspectionCount:   diseasePoints.length,
    yieldTHa:          harvest ? harvest.yieldTHa : null,
  };

  return { npkEvents, irrigationEvents, diseasePoints, protectionEvents, harvest, totals, seasonSummary };
}
