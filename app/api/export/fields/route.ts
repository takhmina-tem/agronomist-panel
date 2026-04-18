import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { query } from '@/lib/db';

// ── Label maps ────────────────────────────────────────────────────────────────

const OP_LABELS: Record<string, string> = {
  planting:        'Посадка',
  inspection:      'Осмотр поля',
  fertilizer:      'Удобрение',
  irrigation:      'Полив',
  crop_protection: 'Защита (СЗР)',
  desiccation:     'Десикация',
  harvest:         'Уборка урожая',
  storage:         'Хранение',
};

const IRRIGATION_TYPE: Record<string, string> = {
  sprinkler: 'Дождевание',
  drip:      'Капельное',
};

const PROTECTION_TYPE: Record<string, string> = {
  fungicide:  'Фунгицид',
  herbicide:  'Гербицид',
  insecticide: 'Инсектицид',
};

// ── Types ─────────────────────────────────────────────────────────────────────

type FieldRow = {
  id: number;
  name: string;
  area_ha: number;
  variety_name: string;
  maturity_group: string;
  purpose_type: string;
  current_phase: string;
  disease_status: number;
};

type OpRow = {
  id: number;
  operation_type: string;
  operation_date: string;
  title: string | null;
  notes: string | null;
  payload: Record<string, unknown>;
};

// ── Styling helpers ───────────────────────────────────────────────────────────

const BRAND  = '2F804C'; // brand-600
const HEADER = 'E1F5E7'; // brand-100
const LIGHT  = 'F3FAF5'; // brand-50
const WHITE  = 'FFFFFF';
const BORDER_COLOR = 'C4EACE';

function headerFill(color = BRAND): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + color } };
}

function border(): Partial<ExcelJS.Borders> {
  const s: ExcelJS.Border = { style: 'thin', color: { argb: 'FF' + BORDER_COLOR } };
  return { top: s, left: s, bottom: s, right: s };
}

function applyHeaderRow(row: ExcelJS.Row, bgArgb = BRAND, textArgb = WHITE) {
  row.eachCell((cell) => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bgArgb } };
    cell.font   = { bold: true, color: { argb: 'FF' + textArgb }, size: 10 };
    cell.border = border();
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  row.height = 22;
}

function applyDataRow(row: ExcelJS.Row, shade = false) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: shade ? 'FF' + LIGHT : 'FF' + WHITE } };
    cell.border = border();
    cell.font   = { size: 10 };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  row.height = 18;
}

// ── Section title ─────────────────────────────────────────────────────────────

function addSectionTitle(ws: ExcelJS.Worksheet, title: string, colCount: number) {
  ws.addRow([]);
  const row = ws.addRow([title]);
  ws.mergeCells(row.number, 1, row.number, colCount);
  row.getCell(1).fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + HEADER } };
  row.getCell(1).font   = { bold: true, size: 11, color: { argb: 'FF1F432D' } };
  row.getCell(1).border = border();
  row.getCell(1).alignment = { vertical: 'middle', indent: 1 };
  row.height = 24;
}

// ── GET /api/export/fields ────────────────────────────────────────────────────

export async function GET() {
  // 1. Load all fields
  const fields = await query<FieldRow>(`
    SELECT f.id, f.name, f.area_ha,
           v.name AS variety_name, v.maturity_group, v.purpose_type,
           f.current_phase, f.disease_status
    FROM   fields f
    JOIN   varieties v ON v.id = f.variety_id
    ORDER  BY f.name
  `);

  // 2. Load all operations for all fields at once
  const ops = await query<OpRow>(`
    SELECT id, field_id, operation_type,
           operation_date::text AS operation_date,
           title, notes, payload
    FROM   operations
    ORDER  BY field_id, operation_date, id
  `) as (OpRow & { field_id: number })[];

  // Group ops by field_id
  const opsByField = new Map<number, (OpRow & { field_id: number })[]>();
  for (const op of ops) {
    if (!opsByField.has(op.field_id)) opsByField.set(op.field_id, []);
    opsByField.get(op.field_id)!.push(op);
  }

  // 3. Build workbook
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'Панель агронома';
  wb.created  = new Date();
  wb.modified = new Date();

  // ── Summary sheet ──────────────────────────────────────────────────────────
  const summary = wb.addWorksheet('Сводка по полям', {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { tabColor: { argb: 'FF' + BRAND } },
  });

  summary.columns = [
    { header: 'Поле',              key: 'name',           width: 20 },
    { header: 'Площадь, га',       key: 'area',           width: 14 },
    { header: 'Сорт',              key: 'variety',        width: 18 },
    { header: 'Группа спелости',   key: 'maturity',       width: 18 },
    { header: 'Назначение',        key: 'purpose',        width: 16 },
    { header: 'Фаза',              key: 'phase',          width: 20 },
    { header: 'Болезни (0-5)',      key: 'disease',        width: 16 },
    { header: 'Операций',          key: 'ops_count',      width: 12 },
    { header: 'Урожай, т/га',      key: 'yield',          width: 14 },
    { header: 'N, кг/га',          key: 'n',              width: 10 },
    { header: 'P, кг/га',          key: 'p',              width: 10 },
    { header: 'K, кг/га',          key: 'k',              width: 10 },
    { header: 'Полив, мм',         key: 'irrigation',     width: 12 },
  ];

  applyHeaderRow(summary.getRow(1));

  for (let i = 0; i < fields.length; i++) {
    const f   = fields[i];
    const fOps = opsByField.get(f.id) ?? [];
    const fertOps = fOps.filter(o => o.operation_type === 'fertilizer');
    const irrOps  = fOps.filter(o => o.operation_type === 'irrigation');
    const harvOp  = fOps.find(o  => o.operation_type === 'harvest');

    const row = summary.addRow({
      name:       f.name,
      area:       f.area_ha,
      variety:    f.variety_name,
      maturity:   f.maturity_group,
      purpose:    f.purpose_type,
      phase:      f.current_phase,
      disease:    f.disease_status,
      ops_count:  fOps.length,
      yield:      harvOp ? Number(harvOp.payload.yieldTHa) || '' : '',
      n:          fertOps.reduce((s, o) => s + (Number(o.payload.nKgHa) || 0), 0) || '',
      p:          fertOps.reduce((s, o) => s + (Number(o.payload.pKgHa) || 0), 0) || '',
      k:          fertOps.reduce((s, o) => s + (Number(o.payload.kKgHa) || 0), 0) || '',
      irrigation: irrOps.reduce((s, o) => s + (Number(o.payload.volumeMm) || 0), 0) || '',
    });
    applyDataRow(row, i % 2 === 1);
  }

  summary.autoFilter = { from: 'A1', to: 'M1' };

  // ── Per-field sheets ───────────────────────────────────────────────────────
  for (const f of fields) {
    const fOps = opsByField.get(f.id) ?? [];
    // Truncate sheet name to 31 chars (Excel limit)
    const sheetName = f.name.slice(0, 31);
    const ws = wb.addWorksheet(sheetName, {
      views: [{ state: 'normal' }],
    });
    ws.columns = [{ width: 24 }, { width: 28 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 22 }, { width: 22 }];

    // ── Field info header ──
    {
      const titleRow = ws.addRow([`Поле: ${f.name}`]);
      ws.mergeCells(titleRow.number, 1, titleRow.number, 8);
      titleRow.getCell(1).fill  = headerFill(BRAND);
      titleRow.getCell(1).font  = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      titleRow.getCell(1).alignment = { vertical: 'middle', indent: 1 };
      titleRow.height = 30;

      const infoRows: [string, string | number][] = [
        ['Площадь',         `${f.area_ha} га`],
        ['Сорт',            f.variety_name],
        ['Группа спелости', f.maturity_group],
        ['Назначение',      f.purpose_type],
        ['Текущая фаза',    f.current_phase],
        ['Статус болезней', `${f.disease_status} / 5`],
      ];

      for (const [label, value] of infoRows) {
        const row = ws.addRow([label, value]);
        row.getCell(1).fill   = headerFill(HEADER);
        row.getCell(1).font   = { bold: true, size: 10, color: { argb: 'FF1F432D' } };
        row.getCell(1).border = border();
        row.getCell(1).alignment = { vertical: 'middle', indent: 1 };
        row.getCell(2).fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + WHITE } };
        row.getCell(2).font   = { size: 10 };
        row.getCell(2).border = border();
        row.getCell(2).alignment = { vertical: 'middle' };
        row.height = 18;
      }
    }

    // Helper: add ops table for a given type
    function addOpsSection(type: string, columns: { header: string; key: string }[]) {
      const typeOps = fOps.filter(o => o.operation_type === type);
      if (typeOps.length === 0) return;

      addSectionTitle(ws, OP_LABELS[type] ?? type, columns.length);

      const headers = ['Дата', 'Название', ...columns.map(c => c.header), 'Примечания'];
      const hRow = ws.addRow(headers);
      applyHeaderRow(hRow, '28653F');

      typeOps.forEach((op, idx) => {
        const values = [
          op.operation_date,
          op.title ?? OP_LABELS[type] ?? type,
          ...columns.map(c => {
            const v = op.payload[c.key];
            return v !== undefined && v !== null ? v : '';
          }),
          op.notes ?? '',
        ];
        const row = ws.addRow(values);
        applyDataRow(row, idx % 2 === 1);
      });
    }

    // ── Посадка ──
    addOpsSection('planting', [
      { header: 'Глубина, см',       key: 'depthCm' },
      { header: 'Норма, т/га',       key: 'rateTHa' },
      { header: 'Фракция',           key: 'fraction' },
      { header: 'Класс семян',       key: 'seedClass' },
      { header: 'Ширина ряда, см',   key: 'rowSpacingCm' },
      { header: 'Т почвы, °C',       key: 'soilTemperature' },
    ]);

    // ── Осмотры ──
    addOpsSection('inspection', [
      { header: 'Всходы, %',         key: 'emergencePct' },
      { header: 'Густота, шт/га',    key: 'plantDensity' },
      { header: 'Стеблей/куст',      key: 'stemsPerPlant' },
      { header: 'Высота ботвы, см',  key: 'haulmHeightCm' },
      { header: 'Фитофтора (0-5)',   key: 'lateBlight' },
      { header: 'Альтернария (0-5)', key: 'alternaria' },
      { header: 'Стресс',            key: 'stress' },
    ]);

    // ── Удобрения ──
    {
      const fertOps = fOps.filter(o => o.operation_type === 'fertilizer');
      if (fertOps.length > 0) {
        addSectionTitle(ws, 'Удобрения', 10);
        const hRow = ws.addRow(['Дата', 'Название', 'Препарат', 'Доза, кг/га', 'N кг/га', 'P кг/га', 'K кг/га', 'Фаза', 'Способ внесения', 'Примечания']);
        applyHeaderRow(hRow, '28653F');
        fertOps.forEach((op, idx) => {
          const p = op.payload;
          const row = ws.addRow([
            op.operation_date,
            op.title ?? 'Удобрение',
            p.product ?? '',
            p.doseKgHa ?? '',
            p.nKgHa ?? '',
            p.pKgHa ?? '',
            p.kKgHa ?? '',
            p.phase ?? '',
            p.applicationMethod ?? '',
            op.notes ?? '',
          ]);
          applyDataRow(row, idx % 2 === 1);
        });
      }
    }

    // ── Поливы ──
    {
      const irrOps = fOps.filter(o => o.operation_type === 'irrigation');
      if (irrOps.length > 0) {
        addSectionTitle(ws, 'Поливы', 6);
        const hRow = ws.addRow(['Дата', 'Название', 'Объём, мм', 'Тип полива', 'EC воды', 'Цель', 'Примечания']);
        applyHeaderRow(hRow, '28653F');
        irrOps.forEach((op, idx) => {
          const p = op.payload;
          const row = ws.addRow([
            op.operation_date,
            op.title ?? 'Полив',
            p.volumeMm ?? '',
            IRRIGATION_TYPE[String(p.type)] ?? String(p.type ?? ''),
            p.waterEc ?? '',
            p.goal ?? '',
            op.notes ?? '',
          ]);
          applyDataRow(row, idx % 2 === 1);
        });
      }
    }

    // ── Защита СЗР ──
    {
      const protOps = fOps.filter(o => o.operation_type === 'crop_protection');
      if (protOps.length > 0) {
        addSectionTitle(ws, 'Защита (СЗР)', 7);
        const hRow = ws.addRow(['Дата', 'Название', 'Препарат', 'Тип обработки', 'Доза', 'Фаза', 'Погода', 'Примечания']);
        applyHeaderRow(hRow, '28653F');
        protOps.forEach((op, idx) => {
          const p = op.payload;
          const row = ws.addRow([
            op.operation_date,
            op.title ?? 'Обработка СЗР',
            p.product ?? '',
            PROTECTION_TYPE[String(p.protectionType)] ?? String(p.protectionType ?? ''),
            p.dose ?? '',
            p.phase ?? '',
            p.weather ?? '',
            op.notes ?? '',
          ]);
          applyDataRow(row, idx % 2 === 1);
        });
      }
    }

    // ── Десикация ──
    addOpsSection('desiccation', [
      { header: 'Препарат',         key: 'product' },
      { header: 'Доза',             key: 'dose' },
      { header: 'Подсыхание ботвы, %', key: 'dryingPct' },
      { header: 'Цвет ботвы',       key: 'haulmColor' },
    ]);

    // ── Уборка ──
    {
      const harvOps = fOps.filter(o => o.operation_type === 'harvest');
      if (harvOps.length > 0) {
        addSectionTitle(ws, 'Уборка урожая', 8);
        const hRow = ws.addRow(['Дата', 'Название', 'Урожай, т/га', 'Валовый сбор, т', 'Потери, %', 'Фр. 35-55 мм, %', 'Фр. 55-70 мм, %', 'Фр. >70 мм, %', 'Примечания']);
        applyHeaderRow(hRow, '28653F');
        harvOps.forEach((op, idx) => {
          const p = op.payload;
          const row = ws.addRow([
            op.operation_date,
            op.title ?? 'Уборка урожая',
            p.yieldTHa ?? '',
            p.grossTons ?? '',
            p.wastePct ?? '',
            p.fraction3555 ?? '',
            p.fraction5570 ?? '',
            p.fraction70plus ?? '',
            op.notes ?? '',
          ]);
          applyDataRow(row, idx % 2 === 1);
        });
      }
    }

    // ── Хранение ──
    addOpsSection('storage', [
      { header: 'Т воздуха, °C',  key: 'airTemp' },
      { header: 'Т массы, °C',    key: 'massTemp' },
      { header: 'Влажность, %',   key: 'humidity' },
      { header: 'Потери, %',      key: 'lossPct' },
    ]);
  }

  // 4. Serialize
  const buffer = await wb.xlsx.writeBuffer();

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(buffer, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="fields-${date}.xlsx"`,
    },
  });
}
