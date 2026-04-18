'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X, ChevronLeft, Plus, Loader2,
  Sprout, Search, FlaskConical, Droplets, ShieldCheck, Flame, Wheat, Warehouse,
  type LucideIcon,
} from 'lucide-react';
import type { Fertilizer, Variety } from '@/lib/types';
import { calcNpk } from '@/lib/npk';

// ── Constants ─────────────────────────────────────────────────────────────────

const PHASES_FULL = [
  'посадка', 'всходы', 'смыкание', 'бутонизация',
  'цветение', 'клубнеобразование', 'десикация', 'уборка',
];

// Early varieties (ранний) dry down naturally and are not desiccated.
function getPhasesForMaturity(maturityGroup: string): string[] {
  if (maturityGroup === 'ранний') {
    return PHASES_FULL.filter(p => p !== 'десикация');
  }
  return PHASES_FULL;
}

type OpType =
  | 'planting' | 'inspection' | 'fertilizer' | 'irrigation'
  | 'crop_protection' | 'desiccation' | 'harvest' | 'storage';

const OP_CONFIG: { value: OpType; label: string; desc: string; Icon: LucideIcon }[] = [
  { value: 'planting',        label: 'Посадка',          desc: 'Семена, норма, глубина, температура почвы', Icon: Sprout      },
  { value: 'inspection',      label: 'Осмотр поля',      desc: 'Болезни, плотность растений, ботва',        Icon: Search      },
  { value: 'fertilizer',      label: 'Удобрение',        desc: 'Продукт, доза, авторасчёт N/P/K',           Icon: FlaskConical },
  { value: 'irrigation',      label: 'Полив',            desc: 'Способ, объём, ЭП воды',                    Icon: Droplets    },
  { value: 'crop_protection', label: 'Защита (СЗР)',     desc: 'Препарат, тип, фаза, погода',               Icon: ShieldCheck },
  { value: 'desiccation',     label: 'Десикация',        desc: 'Препарат, доза, подсыхание ботвы',          Icon: Flame       },
  { value: 'harvest',         label: 'Уборка урожая',    desc: 'Валовый сбор, урожайность, калибровка',     Icon: Wheat       },
  { value: 'storage',         label: 'Хранение',         desc: 'Температура, влажность, потери',            Icon: Warehouse   },
];

// ── Shared styling ────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 ' +
  'placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500';
const selectCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-500';
const readonlyCls =
  'w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-500';

// ── Layout helper ─────────────────────────────────────────────────────────────

function Row({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-start gap-3">
      <span className="pt-2 text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      <div>{children}</div>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <div className="h-px flex-1 bg-slate-100" />
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <div className="h-px flex-1 bg-slate-100" />
    </div>
  );
}

// ── Per-type form components ───────────────────────────────────────────────────

type FormProps = {
  fields: Record<string, string>;
  set: (key: string, value: string) => void;
  fertilizers: Fertilizer[];
  varieties: Variety[];
  areaHa: number;
  phases: string[];
};

function PlantingForm({ fields, set, varieties }: FormProps) {
  return (
    <div className="space-y-3">
      <Row label="Сорт" required>
        <select className={selectCls} value={fields.variety ?? ''} onChange={e => set('variety', e.target.value)}>
          <option value="">Выберите сорт</option>
          {varieties.map(v => (
            <option key={v.id} value={v.name}>{v.name} ({v.maturity_group})</option>
          ))}
        </select>
      </Row>
      <Row label="Семенной класс" required>
        <select className={selectCls} value={fields.seedClass ?? ''} onChange={e => set('seedClass', e.target.value)}>
          <option value="">Выберите класс</option>
          {['элита', 'первая репродукция', 'вторая репродукция'].map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </Row>
      <Row label="Фракция клубней" required>
        <select className={selectCls} value={fields.fraction ?? ''} onChange={e => set('fraction', e.target.value)}>
          <option value="">Выберите фракцию</option>
          {['35-55', '55-70', '70+'].map(v => (
            <option key={v} value={v}>{v} мм</option>
          ))}
        </select>
      </Row>
      <Row label="Норма посадки, т/га" required>
        <input type="number" step="0.1" min="0" className={inputCls} value={fields.rateTHa ?? ''} onChange={e => set('rateTHa', e.target.value)} placeholder="2.8" />
      </Row>
      <Row label="Глубина посадки, см" required>
        <input type="number" step="1" min="0" className={inputCls} value={fields.depthCm ?? ''} onChange={e => set('depthCm', e.target.value)} placeholder="8" />
      </Row>
      <Row label="Ширина ряда, см">
        <input type="number" step="1" min="0" className={inputCls} value={fields.rowSpacingCm ?? ''} onChange={e => set('rowSpacingCm', e.target.value)} placeholder="75" />
      </Row>
      <Row label="Температура почвы, °C">
        <input type="number" step="0.1" className={inputCls} value={fields.soilTemperature ?? ''} onChange={e => set('soilTemperature', e.target.value)} placeholder="9.5" />
      </Row>
      <Row label="Стартовое удобрение">
        <input type="text" className={inputCls} value={fields.starterFertilizer ?? ''} onChange={e => set('starterFertilizer', e.target.value)} placeholder="NPK 16-16-16" />
      </Row>
    </div>
  );
}

const DISEASE_SCORE_OPTIONS = [
  { value: '0', label: '0 — не обнаружено' },
  { value: '1', label: '1 — единично (до 5%)' },
  { value: '2', label: '2 — слабо (5–15%)' },
  { value: '3', label: '3 — умеренно (15–30%)' },
  { value: '4', label: '4 — сильно (30–50%)' },
  { value: '5', label: '5 — критично (>50%)' },
];

function InspectionForm({ fields, set }: FormProps) {
  const diseaseScores = [
    { key: 'lateBlight',  label: 'Фитофтороз' },
    { key: 'alternaria',  label: 'Альтернариоз' },
    { key: 'rhizoctonia', label: 'Ризоктониоз' },
    { key: 'commonScab',  label: 'Парша' },
    { key: 'weeds',       label: 'Сорняки' },
  ];
  const pestScores = [
    { key: 'coloradoBeetle', label: 'Колорадский жук' },
    { key: 'wireworm',       label: 'Проволочник' },
  ];
  const renderScoreRow = (key: string, label: string) => (
    <Row key={key} label={label}>
      <select className={selectCls} value={fields[key] ?? '0'} onChange={e => set(key, e.target.value)}>
        {DISEASE_SCORE_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Row>
  );
  return (
    <div className="space-y-3">
      <Row label="Всхожесть, %" required>
        <input type="number" min="0" max="100" step="1" className={inputCls} value={fields.emergencePct ?? ''} onChange={e => set('emergencePct', e.target.value)} placeholder="91" />
      </Row>
      <Row label="Плотность растений, шт/га">
        <input type="number" min="0" step="100" className={inputCls} value={fields.plantDensity ?? ''} onChange={e => set('plantDensity', e.target.value)} placeholder="44000" />
      </Row>
      <Row label="Стеблей на куст">
        <input type="number" min="0" step="0.1" className={inputCls} value={fields.stemsPerPlant ?? ''} onChange={e => set('stemsPerPlant', e.target.value)} placeholder="4.1" />
      </Row>
      <Row label="Высота ботвы, см">
        <input type="number" min="0" step="1" className={inputCls} value={fields.haulmHeightCm ?? ''} onChange={e => set('haulmHeightCm', e.target.value)} placeholder="18" />
      </Row>
      <Divider label="Болезни (балл 0–5)" />
      {diseaseScores.map(({ key, label }) => renderScoreRow(key, label))}
      <Divider label="Вредители (балл 0–5)" />
      {pestScores.map(({ key, label }) => renderScoreRow(key, label))}
      <Row label="Тип стресса">
        <select className={selectCls} value={fields.stress ?? 'none'} onChange={e => set('stress', e.target.value)}>
          <option value="none">Нет стресса</option>
          <option value="dry">Засуха</option>
          <option value="wet">Переувлажнение</option>
          <option value="heat">Тепловой стресс</option>
        </select>
      </Row>
    </div>
  );
}

function FertilizerForm({ fields, set, fertilizers, phases }: FormProps) {
  const fert = fertilizers.find(f => f.name === fields.product);
  const dose = parseFloat(fields.doseKgHa || '0') || 0;
  const npk  = fert ? calcNpk(fert, dose) : null;

  return (
    <div className="space-y-3">
      <Row label="Продукт" required>
        <select className={selectCls} value={fields.product ?? ''} onChange={e => set('product', e.target.value)}>
          <option value="">Выберите удобрение</option>
          {fertilizers.map(f => (
            <option key={f.id} value={f.name}>{f.name} ({f.fertilizer_type})</option>
          ))}
        </select>
      </Row>
      {fert?.purpose_note && (
        <p className="rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700">{fert.purpose_note}</p>
      )}
      <Row label="Доза, кг/га" required>
        <input type="number" min="0" step="1" className={inputCls} value={fields.doseKgHa ?? ''} onChange={e => set('doseKgHa', e.target.value)} placeholder="180" />
      </Row>
      <Divider label="Авторасчёт N / P₂O₅ / K₂O" />
      <Row label="N, кг/га">
        <input readOnly className={readonlyCls} value={npk !== null ? `${npk.nKgHa} кг/га` : '— выберите продукт и дозу'} />
      </Row>
      <Row label="P₂O₅, кг/га">
        <input readOnly className={readonlyCls} value={npk !== null ? `${npk.pKgHa} кг/га` : '—'} />
      </Row>
      <Row label="K₂O, кг/га">
        <input readOnly className={readonlyCls} value={npk !== null ? `${npk.kKgHa} кг/га` : '—'} />
      </Row>
      <Divider label="Условия внесения" />
      <Row label="Фаза" required>
        <select className={selectCls} value={fields.phase ?? ''} onChange={e => set('phase', e.target.value)}>
          <option value="">Выберите фазу</option>
          {phases.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </Row>
      <Row label="Способ внесения">
        <select className={selectCls} value={fields.applicationMethod ?? ''} onChange={e => set('applicationMethod', e.target.value)}>
          <option value="">Выберите способ</option>
          {['вразброс', 'ленточно', 'под культиватор', 'листовое', 'фертигация'].map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </Row>
    </div>
  );
}

function IrrigationForm({ fields, set }: FormProps) {
  return (
    <div className="space-y-3">
      <Row label="Способ полива" required>
        <select className={selectCls} value={fields.type ?? ''} onChange={e => set('type', e.target.value)}>
          <option value="">Выберите способ</option>
          <option value="sprinkler">Дождевание</option>
          <option value="drip">Капельное</option>
        </select>
      </Row>
      <Row label="Объём, мм" required>
        <input type="number" min="0" step="1" className={inputCls} value={fields.volumeMm ?? ''} onChange={e => set('volumeMm', e.target.value)} placeholder="30" />
      </Row>
      <Row label="ЭП воды, мСм/см">
        <input type="number" min="0" step="0.1" className={inputCls} value={fields.waterEc ?? ''} onChange={e => set('waterEc', e.target.value)} placeholder="0.7" />
      </Row>
      <Row label="Цель полива">
        <input type="text" className={inputCls} value={fields.goal ?? ''} onChange={e => set('goal', e.target.value)} placeholder="поддержание влаги" />
      </Row>
    </div>
  );
}

function CropProtectionForm({ fields, set, phases }: FormProps) {
  return (
    <div className="space-y-3">
      <Row label="Препарат" required>
        <input type="text" className={inputCls} value={fields.product ?? ''} onChange={e => set('product', e.target.value)} placeholder="Ревус" />
      </Row>
      <Row label="Тип СЗР" required>
        <select className={selectCls} value={fields.protectionType ?? ''} onChange={e => set('protectionType', e.target.value)}>
          <option value="">Выберите тип</option>
          <option value="fungicide">Фунгицид</option>
          <option value="herbicide">Гербицид</option>
          <option value="insecticide">Инсектицид</option>
        </select>
      </Row>
      <Row label="Доза" required>
        <input type="text" className={inputCls} value={fields.dose ?? ''} onChange={e => set('dose', e.target.value)} placeholder="0.6 л/га" />
      </Row>
      <Row label="Фаза" required>
        <select className={selectCls} value={fields.phase ?? ''} onChange={e => set('phase', e.target.value)}>
          <option value="">Выберите фазу</option>
          {phases.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </Row>
      <Row label="Погодные условия">
        <input type="text" className={inputCls} value={fields.weather ?? ''} onChange={e => set('weather', e.target.value)} placeholder="ветер 2 м/с, без осадков" />
      </Row>
    </div>
  );
}

function DesiccationForm({ fields, set }: FormProps) {
  return (
    <div className="space-y-3">
      <Row label="Препарат" required>
        <input type="text" className={inputCls} value={fields.product ?? ''} onChange={e => set('product', e.target.value)} placeholder="Реглон" />
      </Row>
      <Row label="Доза" required>
        <input type="text" className={inputCls} value={fields.dose ?? ''} onChange={e => set('dose', e.target.value)} placeholder="2 л/га" />
      </Row>
      <Row label="Подсыхание ботвы, %" required>
        <input type="number" min="0" max="100" step="1" className={inputCls} value={fields.dryingPct ?? ''} onChange={e => set('dryingPct', e.target.value)} placeholder="78" />
      </Row>
      <Row label="Цвет ботвы">
        <input type="text" className={inputCls} value={fields.haulmColor ?? ''} onChange={e => set('haulmColor', e.target.value)} placeholder="желто-зеленый" />
      </Row>
    </div>
  );
}

function HarvestForm({ fields, set, areaHa }: FormProps) {
  function handleGross(val: string) {
    set('grossTons', val);
    const gross = parseFloat(val);
    if (areaHa > 0 && gross > 0) {
      set('yieldTHa', (gross / areaHa).toFixed(1));
    }
  }

  return (
    <div className="space-y-3">
      <Divider label="Период уборки" />
      <Row label="Дата начала уборки">
        <input type="date" className={inputCls} value={fields.harvestStartDate ?? ''} onChange={e => set('harvestStartDate', e.target.value)} />
      </Row>
      <Row label="Дата окончания уборки">
        <input type="date" className={inputCls} value={fields.harvestEndDate ?? ''} onChange={e => set('harvestEndDate', e.target.value)} />
      </Row>
      <Divider label="Результаты уборки" />
      <Row label="Валовый сбор, т" required>
        <input type="number" min="0" step="1" className={inputCls} value={fields.grossTons ?? ''} onChange={e => handleGross(e.target.value)} placeholder="1040" />
      </Row>
      <Row label="Урожайность, т/га" required>
        <input type="number" min="0" step="0.1" className={inputCls} value={fields.yieldTHa ?? ''} onChange={e => set('yieldTHa', e.target.value)} placeholder="42.4" />
      </Row>
      <Divider label="Калибровка клубней, %" />
      <Row label="Калибр 35–55 мм">
        <input type="number" min="0" max="100" step="1" className={inputCls} value={fields.fraction3555 ?? ''} onChange={e => set('fraction3555', e.target.value)} placeholder="38" />
      </Row>
      <Row label="Калибр 55–70 мм">
        <input type="number" min="0" max="100" step="1" className={inputCls} value={fields.fraction5570 ?? ''} onChange={e => set('fraction5570', e.target.value)} placeholder="44" />
      </Row>
      <Row label="Калибр 70+ мм">
        <input type="number" min="0" max="100" step="1" className={inputCls} value={fields.fraction70plus ?? ''} onChange={e => set('fraction70plus', e.target.value)} placeholder="18" />
      </Row>
      <Row label="Отходы, %">
        <input type="number" min="0" max="100" step="0.1" className={inputCls} value={fields.wastePct ?? ''} onChange={e => set('wastePct', e.target.value)} placeholder="4.6" />
      </Row>
      <Divider label="Механические повреждения" />
      <Row label="Мех. повреждения, %">
        <input type="number" min="0" max="100" step="0.1" className={inputCls} value={fields.mechanicalDamagePct ?? ''} onChange={e => set('mechanicalDamagePct', e.target.value)} placeholder="2.3" />
      </Row>
      <Row label="Фото повреждений (URL)">
        <input type="url" className={inputCls} value={fields.damagePhotoUrl ?? ''} onChange={e => set('damagePhotoUrl', e.target.value)} placeholder="https://example.com/damage.jpg" />
      </Row>
    </div>
  );
}

const STORAGE_DISEASES = [
  { value: 'none',          label: 'Нет болезней' },
  { value: 'wet_rot',       label: 'Мокрая гниль' },
  { value: 'dry_rot',       label: 'Сухая гниль (фузариоз)' },
  { value: 'late_blight',   label: 'Фитофтороз' },
  { value: 'silver_scurf',  label: 'Серебристая парша' },
  { value: 'black_scurf',   label: 'Ризоктониоз' },
  { value: 'pink_rot',      label: 'Розовая гниль' },
  { value: 'other',         label: 'Другое (указать в примечаниях)' },
];

function StorageForm({ fields, set }: FormProps) {
  return (
    <div className="space-y-3">
      <Row label="Температура воздуха, °C" required>
        <input type="number" step="0.1" className={inputCls} value={fields.airTemp ?? ''} onChange={e => set('airTemp', e.target.value)} placeholder="3.8" />
      </Row>
      <Row label="Температура массы, °C" required>
        <input type="number" step="0.1" className={inputCls} value={fields.massTemp ?? ''} onChange={e => set('massTemp', e.target.value)} placeholder="4.1" />
      </Row>
      <Row label="Влажность, %" required>
        <input type="number" min="0" max="100" step="1" className={inputCls} value={fields.humidity ?? ''} onChange={e => set('humidity', e.target.value)} placeholder="92" />
      </Row>
      <Row label="Потери, %">
        <input type="number" min="0" step="0.1" className={inputCls} value={fields.lossPct ?? ''} onChange={e => set('lossPct', e.target.value)} placeholder="2.4" />
      </Row>
      <Row label="Болезни при хранении">
        <select className={selectCls} value={fields.storageDisease ?? 'none'} onChange={e => set('storageDisease', e.target.value)}>
          {STORAGE_DISEASES.map(d => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </Row>
    </div>
  );
}

// ── Payload builder ───────────────────────────────────────────────────────────

function buildPayload(
  type: OpType,
  fields: Record<string, string>,
  fertilizers: Fertilizer[],
): Record<string, unknown> {
  const num = (k: string) => parseFloat(fields[k] || '0') || 0;

  switch (type) {
    case 'planting':
      return {
        variety:           fields.variety || '',
        seedClass:         fields.seedClass || '',
        fraction:          fields.fraction || '',
        rateTHa:           num('rateTHa'),
        depthCm:           num('depthCm'),
        rowSpacingCm:      num('rowSpacingCm'),
        soilTemperature:   num('soilTemperature'),
        starterFertilizer: fields.starterFertilizer || '',
      };
    case 'inspection':
      return {
        emergencePct:    num('emergencePct'),
        plantDensity:    num('plantDensity'),
        stemsPerPlant:   num('stemsPerPlant'),
        haulmHeightCm:   num('haulmHeightCm'),
        weeds:           num('weeds'),
        lateBlight:      num('lateBlight'),
        alternaria:      num('alternaria'),
        rhizoctonia:     num('rhizoctonia'),
        commonScab:      num('commonScab'),
        coloradoBeetle:  num('coloradoBeetle'),
        wireworm:        num('wireworm'),
        stress:          fields.stress || 'none',
      };
    case 'fertilizer': {
      const fert = fertilizers.find(f => f.name === fields.product);
      const dose = num('doseKgHa');
      const npk  = fert ? calcNpk(fert, dose) : { nKgHa: 0, pKgHa: 0, kKgHa: 0 };
      return {
        product:           fields.product || '',
        doseKgHa:          dose,
        phase:             fields.phase || '',
        applicationMethod: fields.applicationMethod || '',
        ...npk,
      };
    }
    case 'irrigation':
      return {
        type:     fields.type || '',
        volumeMm: num('volumeMm'),
        waterEc:  num('waterEc'),
        goal:     fields.goal || '',
      };
    case 'crop_protection':
      return {
        product:        fields.product || '',
        protectionType: fields.protectionType || '',
        dose:           fields.dose || '',
        weather:        fields.weather || '',
        phase:          fields.phase || '',
      };
    case 'desiccation':
      return {
        product:    fields.product || '',
        dose:       fields.dose || '',
        dryingPct:  num('dryingPct'),
        haulmColor: fields.haulmColor || '',
      };
    case 'harvest': {
      const base: Record<string, unknown> = {
        grossTons:      num('grossTons'),
        yieldTHa:       num('yieldTHa'),
        fraction3555:   num('fraction3555'),
        fraction5570:   num('fraction5570'),
        fraction70plus: num('fraction70plus'),
        wastePct:       num('wastePct'),
      };
      if (fields.harvestStartDate) base.harvestStartDate = fields.harvestStartDate;
      if (fields.harvestEndDate)   base.harvestEndDate   = fields.harvestEndDate;
      if (fields.mechanicalDamagePct !== '' && fields.mechanicalDamagePct !== undefined)
        base.mechanicalDamagePct = num('mechanicalDamagePct');
      if (fields.damagePhotoUrl?.trim()) base.damagePhotoUrl = fields.damagePhotoUrl.trim();
      return base;
    }
    case 'storage':
      return {
        airTemp:        num('airTemp'),
        massTemp:       num('massTemp'),
        humidity:       num('humidity'),
        lossPct:        num('lossPct'),
        storageDisease: fields.storageDisease || 'none',
      };
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

function validate(
  type: OpType,
  fields: Record<string, string>,
  date: string,
  title: string,
): string | null {
  if (!date)         return 'Укажите дату операции';
  if (!title.trim()) return 'Укажите заголовок операции';

  switch (type) {
    case 'planting':
      if (!fields.variety)   return 'Выберите сорт';
      if (!fields.seedClass) return 'Выберите семенной класс';
      if (!fields.fraction)  return 'Выберите фракцию клубней';
      if (!fields.rateTHa)   return 'Укажите норму посадки';
      if (!fields.depthCm)   return 'Укажите глубину посадки';
      break;
    case 'inspection':
      if (!fields.emergencePct) return 'Укажите полевую всхожесть';
      break;
    case 'fertilizer':
      if (!fields.product)    return 'Выберите удобрение';
      if (!fields.doseKgHa)   return 'Укажите дозу внесения';
      if (!fields.phase)      return 'Укажите фазу развития';
      break;
    case 'irrigation':
      if (!fields.type)     return 'Выберите способ полива';
      if (!fields.volumeMm) return 'Укажите объём полива';
      break;
    case 'crop_protection':
      if (!fields.product)        return 'Укажите препарат';
      if (!fields.protectionType) return 'Выберите тип СЗР';
      if (!fields.dose)           return 'Укажите дозу';
      if (!fields.phase)          return 'Укажите фазу';
      break;
    case 'desiccation':
      if (!fields.product)   return 'Укажите препарат';
      if (!fields.dose)      return 'Укажите дозу';
      if (!fields.dryingPct) return 'Укажите степень подсыхания ботвы';
      break;
    case 'harvest':
      if (!fields.grossTons) return 'Укажите валовый сбор';
      if (!fields.yieldTHa)  return 'Укажите урожайность';
      if (fields.damagePhotoUrl?.trim()) {
        try { new URL(fields.damagePhotoUrl.trim()); }
        catch { return 'Некорректный URL фото повреждений'; }
      }
      break;
    case 'storage':
      if (!fields.airTemp)  return 'Укажите температуру воздуха';
      if (!fields.massTemp) return 'Укажите температуру массы';
      if (!fields.humidity) return 'Укажите влажность';
      break;
  }
  return null;
}

// ── Default title ─────────────────────────────────────────────────────────────

function defaultTitle(type: OpType): string {
  switch (type) {
    case 'planting':        return 'Посадка';
    case 'inspection':      return 'Осмотр поля';
    case 'fertilizer':      return 'Внесение удобрения';
    case 'irrigation':      return 'Полив';
    case 'crop_protection': return 'Обработка СЗР';
    case 'desiccation':     return 'Десикация';
    case 'harvest':         return 'Уборка урожая';
    case 'storage':         return 'Контроль хранения';
  }
}

// ── Main exported component ───────────────────────────────────────────────────

export function NewOperationButton({
  fieldId,
  areaHa,
  maturityGroup = '',
}: {
  fieldId: number;
  areaHa: number;
  maturityGroup?: string;
}) {
  const router = useRouter();
  const [open, setOpen]               = useState(false);
  const [step, setStep]               = useState<0 | 1>(0);
  const [type, setType]               = useState<OpType | null>(null);
  const [fields, setFields]           = useState<Record<string, string>>({});
  const [date, setDate]               = useState('');
  const [title, setTitle]             = useState('');
  const [notes, setNotes]             = useState('');
  const [photoUrl, setPhotoUrl]       = useState('');
  const [status, setStatus]           = useState<'planned' | 'in_progress' | 'completed'>('completed');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [saved, setSaved]             = useState(false);
  const [fertilizers, setFertilizers] = useState<Fertilizer[]>([]);
  const [varieties, setVarieties]     = useState<Variety[]>([]);

  // Load fertilizers once
  useEffect(() => {
    fetch('/api/references/fertilizers')
      .then(r => r.json())
      .then((data: Fertilizer[]) => setFertilizers(data))
      .catch(() => {});
  }, []);

  // Load varieties once
  useEffect(() => {
    fetch('/api/references/varieties')
      .then(r => r.json())
      .then((data: Variety[]) => setVarieties(data))
      .catch(() => {});
  }, []);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function close() {
    setOpen(false);
    setStep(0);
    setType(null);
    setFields({});
    setDate(new Date().toISOString().split('T')[0]);
    setTitle('');
    setNotes('');
    setPhotoUrl('');
    setStatus('completed');
    setError(null);
    setSaved(false);
    setLoading(false);
  }

  function selectType(t: OpType) {
    setType(t);
    setTitle(defaultTitle(t));
    setFields({});
    setError(null);
    setSaved(false);
    setStep(1);
  }

  function setField(key: string, value: string) {
    setFields(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!type) return;
    const err = validate(type, fields, date, title);
    if (err) { setError(err); return; }

    // Validate photo URL if provided
    const trimmedPhoto = photoUrl.trim();
    if (trimmedPhoto) {
      try { new URL(trimmedPhoto); }
      catch { setError('Некорректный URL фото. Введите полный адрес, начиная с https://'); return; }
    }

    const payload = buildPayload(type, fields, fertilizers);

    // Inspection: propagate max risk score (diseases + pests) to field.
    // disease_status column stores the combined max — no DB rename needed.
    let diseaseStatus: number | undefined;
    if (type === 'inspection') {
      const p = payload as {
        lateBlight: number; alternaria: number; rhizoctonia: number; commonScab: number;
        coloradoBeetle: number; wireworm: number;
      };
      diseaseStatus = Math.max(
        p.lateBlight, p.alternaria, p.rhizoctonia, p.commonScab,
        p.coloradoBeetle, p.wireworm,
      );
    }

    const body: Record<string, unknown> = {
      field_id:       fieldId,
      operation_type: type,
      operation_date: date,
      title:          title.trim(),
      notes:          notes.trim() || undefined,
      payload,
      photo_url:      trimmedPhoto || undefined,
      status,
    };
    if (diseaseStatus !== undefined) body.disease_status = diseaseStatus;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(json.error ?? `Ошибка сервера (${res.status})`);
      }

      setSaved(true);
      setTimeout(() => {
        close();
        router.refresh();
      }, 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }

  const opLabel = type ? OP_CONFIG.find(o => o.value === type)?.label : '';

  const phases = getPhasesForMaturity(maturityGroup);
  const formProps: FormProps = { fields, set: setField, fertilizers, varieties, areaHa, phases };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => { setDate(new Date().toISOString().split('T')[0]); setOpen(true); }}
        className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        <Plus size={16} />
        Новая запись
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) close(); }}
        >
          <div className="flex min-h-full items-start justify-center p-4 pt-10">
            <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl">

              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-2">
                  {step === 1 && (
                    <button
                      onClick={() => { setStep(0); setError(null); }}
                      className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Назад"
                    >
                      <ChevronLeft size={18} />
                    </button>
                  )}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                      {step === 0 ? 'Шаг 1 из 2 — Тип операции' : 'Шаг 2 из 2 — Данные'}
                    </p>
                    <h2 className="text-lg font-bold text-slate-900">
                      {step === 0 ? 'Выберите тип записи' : opLabel}
                    </h2>
                  </div>
                </div>
                <button
                  onClick={close}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Закрыть"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                {/* ── Step 0: type picker ── */}
                {step === 0 && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {OP_CONFIG.map(op => (
                      <button
                        key={op.value}
                        onClick={() => selectType(op.value)}
                        className="flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand-400 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                          <op.Icon size={22} />
                        </span>
                        <span className="text-sm font-semibold text-slate-900">{op.label}</span>
                        <span className="text-xs leading-snug text-slate-500">{op.desc}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Step 1: form ── */}
                {step === 1 && (
                  <div className="space-y-4">
                    {/* Common fields */}
                    <div className="space-y-3">
                      <Row label="Дата операции" required>
                        <input
                          type="date"
                          className={inputCls}
                          value={date}
                          onChange={e => setDate(e.target.value)}
                        />
                      </Row>
                      <Row label="Заголовок" required>
                        <input
                          type="text"
                          className={inputCls}
                          value={title}
                          onChange={e => setTitle(e.target.value)}
                          placeholder="Краткое описание операции"
                        />
                      </Row>
                      <Row label="Статус">
                        <select
                          className={selectCls}
                          value={status}
                          onChange={e => setStatus(e.target.value as 'planned' | 'in_progress' | 'completed')}
                        >
                          <option value="completed">Выполнено</option>
                          <option value="in_progress">В процессе</option>
                          <option value="planned">Запланировано</option>
                        </select>
                      </Row>
                    </div>

                    <div className="h-px bg-slate-100" />

                    {/* Type-specific fields */}
                    {type === 'planting'        && <PlantingForm       {...formProps} />}
                    {type === 'inspection'      && <InspectionForm     {...formProps} />}
                    {type === 'fertilizer'      && <FertilizerForm     {...formProps} />}
                    {type === 'irrigation'      && <IrrigationForm     {...formProps} />}
                    {type === 'crop_protection' && <CropProtectionForm {...formProps} />}
                    {type === 'desiccation'     && <DesiccationForm    {...formProps} />}
                    {type === 'harvest'         && <HarvestForm        {...formProps} />}
                    {type === 'storage'         && <StorageForm        {...formProps} />}

                    {/* Notes + Photo */}
                    <div className="space-y-3 border-t border-slate-100 pt-1">
                      <Row label="Примечания">
                        <textarea
                          className={inputCls + ' resize-none'}
                          rows={2}
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          placeholder="Необязательный комментарий агронома"
                        />
                      </Row>
                      <Row label="Фото (URL)">
                        <input
                          type="url"
                          className={inputCls}
                          value={photoUrl}
                          onChange={e => setPhotoUrl(e.target.value)}
                          placeholder="https://example.com/photo.jpg"
                        />
                      </Row>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer (form step only) */}
              {step === 1 && (
                <div className="space-y-3 border-t border-slate-100 px-6 py-4">
                  {error && (
                    <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {error}
                    </div>
                  )}
                  {saved && (
                    <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                      Операция сохранена. Обновляем страницу…
                    </div>
                  )}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={close}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={loading || saved}
                      className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
                    >
                      {loading && <Loader2 size={14} className="animate-spin" />}
                      {saved ? 'Сохранено' : 'Сохранить'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
