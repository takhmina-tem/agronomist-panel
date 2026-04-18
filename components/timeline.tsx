import {
  Sprout,
  ScanSearch,
  FlaskConical,
  Droplets,
  ShieldAlert,
  Leaf,
  Truck,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import type { TimelineEntry } from '@/lib/types';
import type {
  PlantingPayload,
  InspectionPayload,
  FertilizerPayload,
  IrrigationPayload,
  CropProtectionPayload,
  DesiccationPayload,
  HarvestPayload,
  StoragePayload,
} from '@/lib/operation-types';

// ── Date formatting ────────────────────────────────────────────────────────────

const RU_MONTHS: Record<number, string> = {
  1: 'янв.', 2: 'февр.', 3: 'мар.', 4: 'апр.', 5: 'мая', 6: 'июня',
  7: 'июля', 8: 'авг.', 9: 'сент.', 10: 'окт.', 11: 'нояб.', 12: 'дек.',
};
const RU_MONTHS_FULL: Record<number, string> = {
  1: 'Январь', 2: 'Февраль', 3: 'Март', 4: 'Апрель', 5: 'Май', 6: 'Июнь',
  7: 'Июль', 8: 'Август', 9: 'Сентябрь', 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь',
};

/** "2026-09-14" → "14 сент. 2026" */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${RU_MONTHS[m]} ${y}`;
}

/** "2026-09-14" → "Сентябрь 2026" */
function monthKey(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  return `${RU_MONTHS_FULL[m]} ${y}`;
}

// ── Per-type visual config ────────────────────────────────────────────────────

type TypeConfig = {
  label: string;
  Icon: LucideIcon;
  dotCls: string;      // bg-* for the dot
  iconCls: string;     // text-* for the icon inside dot
  accentCls: string;   // left border color strip
  badgeCls: string;    // badge bg + text
};

const TYPE_CONFIG: Record<string, TypeConfig> = {
  planting: {
    label: 'Посадка',
    Icon: Sprout,
    dotCls:   'bg-emerald-500',
    iconCls:  'text-white',
    accentCls:'border-l-emerald-400',
    badgeCls: 'bg-emerald-50 text-emerald-800',
  },
  inspection: {
    label: 'Осмотр поля',
    Icon: ScanSearch,
    dotCls:   'bg-amber-500',
    iconCls:  'text-white',
    accentCls:'border-l-amber-400',
    badgeCls: 'bg-amber-50 text-amber-800',
  },
  fertilizer: {
    label: 'Удобрение',
    Icon: FlaskConical,
    dotCls:   'bg-blue-500',
    iconCls:  'text-white',
    accentCls:'border-l-blue-400',
    badgeCls: 'bg-blue-50 text-blue-800',
  },
  irrigation: {
    label: 'Полив',
    Icon: Droplets,
    dotCls:   'bg-sky-500',
    iconCls:  'text-white',
    accentCls:'border-l-sky-400',
    badgeCls: 'bg-sky-50 text-sky-800',
  },
  crop_protection: {
    label: 'Защита (СЗР)',
    Icon: ShieldAlert,
    dotCls:   'bg-red-500',
    iconCls:  'text-white',
    accentCls:'border-l-red-400',
    badgeCls: 'bg-red-50 text-red-800',
  },
  desiccation: {
    label: 'Десикация',
    Icon: Leaf,
    dotCls:   'bg-orange-500',
    iconCls:  'text-white',
    accentCls:'border-l-orange-400',
    badgeCls: 'bg-orange-50 text-orange-800',
  },
  harvest: {
    label: 'Уборка урожая',
    Icon: Truck,
    dotCls:   'bg-green-600',
    iconCls:  'text-white',
    accentCls:'border-l-green-500',
    badgeCls: 'bg-green-50 text-green-800',
  },
  storage: {
    label: 'Хранение',
    Icon: Warehouse,
    dotCls:   'bg-purple-500',
    iconCls:  'text-white',
    accentCls:'border-l-purple-400',
    badgeCls: 'bg-purple-50 text-purple-800',
  },
};

const FALLBACK_CONFIG: TypeConfig = {
  label: 'Операция',
  Icon: Warehouse,
  dotCls:   'bg-slate-400',
  iconCls:  'text-white',
  accentCls:'border-l-slate-300',
  badgeCls: 'bg-slate-100 text-slate-700',
};

// ── Shared small components ───────────────────────────────────────────────────

/** Prominent key-metric chip shown in the left column for fast scanning. */
function StatChip({ value, unit }: { value: string | number; unit?: string }) {
  return (
    <span className="inline-flex items-baseline gap-0.5 rounded-lg bg-slate-100 px-2 py-0.5 text-sm leading-5">
      <span className="font-semibold text-slate-800">{value}</span>
      {unit && <span className="text-xs text-slate-500">{unit}</span>}
    </span>
  );
}

/** Secondary label:value row inside the detail panel. */
function Def({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex gap-2 leading-5">
      <span className="w-[120px] shrink-0 text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}

function DetailDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

// ── Headline stats (left-column chips) ────────────────────────────────────────

function PlantingStats({ p }: { p: PlantingPayload }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {p.rateTHa      > 0 && <StatChip value={p.rateTHa}        unit="т/га" />}
      {p.depthCm      > 0 && <StatChip value={`${p.depthCm} см`} />}
      {p.soilTemperature !== undefined && p.soilTemperature !== 0 &&
        <StatChip value={`${p.soilTemperature}°C`} unit="почва" />}
    </div>
  );
}

function InspectionStats({ p }: { p: InspectionPayload }) {
  const maxDisease = Math.max(
    p.weeds ?? 0, p.lateBlight ?? 0, p.alternaria ?? 0, p.rhizoctonia ?? 0, p.commonScab ?? 0,
  );
  const maxPest = Math.max(p.coloradoBeetle ?? 0, p.wireworm ?? 0);
  const maxAll  = Math.max(maxDisease, maxPest);
  const riskCls =
    maxAll >= 4 ? 'bg-red-100 text-red-800' :
    maxAll >= 3 ? 'bg-orange-100 text-orange-800' :
    maxAll >= 1 ? 'bg-amber-100 text-amber-800' :
    'bg-emerald-100 text-emerald-800';
  const riskLabel =
    maxAll >= 1 ? `Болезни/вред. ${maxAll}/5` : 'Проблем нет';

  return (
    <div className="flex flex-wrap gap-1.5">
      {p.emergencePct > 0 &&
        <StatChip value={`${p.emergencePct}%`} unit="всхожесть" />}
      {p.plantDensity > 0 &&
        <StatChip value={p.plantDensity.toLocaleString('ru-RU')} unit="шт/га" />}
      {p.haulmHeightCm > 0 &&
        <StatChip value={`${p.haulmHeightCm} см`} unit="ботва" />}
      <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-semibold leading-5 ${riskCls}`}>
        {riskLabel}
      </span>
    </div>
  );
}

function FertilizerStats({ p }: { p: FertilizerPayload }) {
  const hasNpk = p.nKgHa > 0 || p.pKgHa > 0 || p.kKgHa > 0;
  return (
    <div className="flex flex-wrap gap-1.5">
      {p.product && <StatChip value={p.product} />}
      {p.doseKgHa > 0 && <StatChip value={p.doseKgHa} unit="кг/га" />}
      {hasNpk && (
        <span className="inline-flex items-baseline gap-1 rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-semibold leading-5 text-blue-800">
          N{Math.round(p.nKgHa)}&nbsp;·&nbsp;P{Math.round(p.pKgHa)}&nbsp;·&nbsp;K{Math.round(p.kKgHa)}
        </span>
      )}
    </div>
  );
}

function IrrigationStats({ p }: { p: IrrigationPayload }) {
  const typeLabel: Record<string, string> = { sprinkler: 'Дождевание', drip: 'Капельное' };
  return (
    <div className="flex flex-wrap gap-1.5">
      {p.volumeMm > 0  && <StatChip value={p.volumeMm} unit="мм" />}
      {p.type          && <StatChip value={typeLabel[p.type] ?? p.type} />}
      {p.waterEc  > 0  && <StatChip value={`ЭП ${p.waterEc}`} unit="мСм/см" />}
    </div>
  );
}

function ProtectionStats({ p }: { p: CropProtectionPayload }) {
  const typeLabel: Record<string, string> = {
    fungicide: 'Фунгицид', herbicide: 'Гербицид', insecticide: 'Инсектицид',
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {p.product        && <StatChip value={p.product} />}
      {p.dose           && <StatChip value={p.dose} />}
      {p.protectionType && (
        <span className="inline-flex rounded-lg bg-red-50 px-2 py-0.5 text-xs font-semibold leading-5 text-red-700">
          {typeLabel[p.protectionType] ?? p.protectionType}
        </span>
      )}
    </div>
  );
}

function DesiccationStats({ p }: { p: DesiccationPayload }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {p.product   && <StatChip value={p.product} />}
      {p.dose      && <StatChip value={p.dose} />}
      {p.dryingPct > 0 && <StatChip value={`${p.dryingPct}%`} unit="ботвы" />}
    </div>
  );
}

function HarvestStats({ p }: { p: HarvestPayload }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {p.yieldTHa  > 0 && <StatChip value={p.yieldTHa}  unit="т/га" />}
      {p.grossTons > 0 && <StatChip value={p.grossTons} unit="т" />}
      {p.wastePct  > 0 && (
        <span className="inline-flex rounded-lg bg-orange-50 px-2 py-0.5 text-xs font-semibold leading-5 text-orange-700">
          отходы {p.wastePct}%
        </span>
      )}
      {p.mechanicalDamagePct != null && p.mechanicalDamagePct > 0 && (
        <span className="inline-flex rounded-lg bg-red-50 px-2 py-0.5 text-xs font-semibold leading-5 text-red-700">
          мех. повр. {p.mechanicalDamagePct}%
        </span>
      )}
    </div>
  );
}

function StorageStats({ p }: { p: StoragePayload }) {
  const STORAGE_DISEASE_LABELS: Record<string, string> = {
    wet_rot: 'Мокрая гниль', dry_rot: 'Сухая гниль', late_blight: 'Фитофтороз',
    silver_scurf: 'Серебристая парша', black_scurf: 'Ризоктониоз',
    pink_rot: 'Розовая гниль', other: 'Болезнь',
  };
  const hasDisease = p.storageDisease && p.storageDisease !== 'none';
  return (
    <div className="flex flex-wrap gap-1.5">
      {p.airTemp  !== undefined && p.airTemp  !== 0 && <StatChip value={`${p.airTemp}°C`}  unit="воздух" />}
      {p.massTemp !== undefined && p.massTemp !== 0 && <StatChip value={`${p.massTemp}°C`} unit="масса" />}
      {p.humidity > 0 && <StatChip value={`${p.humidity}%`} unit="влажн." />}
      {hasDisease && (
        <span className="inline-flex rounded-lg bg-red-50 px-2 py-0.5 text-xs font-semibold leading-5 text-red-700">
          {STORAGE_DISEASE_LABELS[p.storageDisease] ?? p.storageDisease}
        </span>
      )}
    </div>
  );
}

// ── Per-type detail panels (secondary data in right column) ───────────────────

function PlantingDetail({ p }: { p: PlantingPayload }) {
  const fractionLabel: Record<string, string> = {
    '35-55': '35–55 мм', '55-70': '55–70 мм', '70+': '70+ мм',
  };
  return (
    <div className="space-y-1 text-sm">
      {p.variety && <Def label="Сорт"           value={p.variety} />}
      <Def label="Семенной класс" value={p.seedClass} />
      <Def label="Фракция"        value={fractionLabel[p.fraction] ?? p.fraction} />
      <Def label="Ширина ряда"    value={p.rowSpacingCm ? `${p.rowSpacingCm} см` : null} />
      <Def label="Стартовое уд."  value={p.starterFertilizer || null} />
    </div>
  );
}

/** Visual score bar: 5 filled/empty dots. */
function ScoreBar({ score, label }: { score: number; label: string }) {
  const dotCls = (i: number) => {
    const filled = i < score;
    const colorFilled =
      score >= 4 ? 'bg-red-500' :
      score >= 3 ? 'bg-orange-400' :
      score >= 2 ? 'bg-amber-400' : 'bg-emerald-500';
    return filled
      ? `h-2 w-2 rounded-full ${colorFilled}`
      : 'h-2 w-2 rounded-full bg-slate-200';
  };
  const textCls =
    score >= 4 ? 'text-red-700 font-semibold' :
    score >= 3 ? 'text-orange-600 font-semibold' :
    score >= 2 ? 'text-amber-600' : 'text-slate-500';

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-[88px] shrink-0 text-slate-600">{label}</span>
      <span className="flex items-center gap-0.5">
        {[0, 1, 2, 3, 4].map(i => <span key={i} className={dotCls(i)} />)}
      </span>
      <span className={textCls}>{score}/5</span>
    </div>
  );
}

function InspectionDetail({ p }: { p: InspectionPayload }) {
  const stressLabel: Record<string, string> = {
    dry: 'засуха', wet: 'переувлажнение', heat: 'тепловой',
  };
  const diseaseScores: { key: keyof InspectionPayload; label: string }[] = [
    { key: 'lateBlight',  label: 'Фитофтороз' },
    { key: 'alternaria',  label: 'Альтернариоз' },
    { key: 'rhizoctonia', label: 'Ризоктониоз' },
    { key: 'commonScab',  label: 'Парша' },
    { key: 'weeds',       label: 'Сорняки' },
  ];
  const pestScores: { key: keyof InspectionPayload; label: string }[] = [
    { key: 'coloradoBeetle', label: 'Колорад. жук' },
    { key: 'wireworm',       label: 'Проволочник' },
  ];
  const anyDisease = diseaseScores.some(s => (p[s.key] as number) > 0);
  const anyPest    = pestScores.some(s => (p[s.key] as number) > 0);

  return (
    <div className="space-y-1 text-sm">
      <Def label="Стеблей/куст" value={p.stemsPerPlant ? `${p.stemsPerPlant} шт` : null} />
      {anyDisease && (
        <>
          <DetailDivider label="Болезни" />
          <div className="space-y-1.5 py-0.5">
            {diseaseScores
              .filter(s => (p[s.key] as number) > 0)
              .map(s => (
                <ScoreBar key={s.key} score={p[s.key] as number} label={s.label} />
              ))}
          </div>
        </>
      )}
      {anyPest && (
        <>
          <DetailDivider label="Вредители" />
          <div className="space-y-1.5 py-0.5">
            {pestScores
              .filter(s => (p[s.key] as number) > 0)
              .map(s => (
                <ScoreBar key={s.key} score={p[s.key] as number} label={s.label} />
              ))}
          </div>
        </>
      )}
      <Def label="Стресс" value={
        p.stress && p.stress !== 'none' ? stressLabel[p.stress] ?? p.stress : null
      } />
    </div>
  );
}

function FertilizerDetail({ p }: { p: FertilizerPayload }) {
  const hasNPK = p.nKgHa > 0 || p.pKgHa > 0 || p.kKgHa > 0;
  return (
    <div className="space-y-1 text-sm">
      <Def label="Фаза"   value={p.phase} />
      <Def label="Способ" value={p.applicationMethod || null} />
      {hasNPK && (
        <>
          <DetailDivider label="N / P₂O₅ / K₂O" />
          {/* inline triple row */}
          <div className="flex gap-3 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold">
            <span className="text-blue-700">N {p.nKgHa}</span>
            <span className="text-slate-400">·</span>
            <span className="text-violet-700">P {p.pKgHa}</span>
            <span className="text-slate-400">·</span>
            <span className="text-emerald-700">K {p.kKgHa}</span>
            <span className="ml-auto font-normal text-slate-500">кг/га</span>
          </div>
        </>
      )}
    </div>
  );
}

function IrrigationDetail({ p }: { p: IrrigationPayload }) {
  return (
    <div className="space-y-1 text-sm">
      <Def label="Цель" value={p.goal || null} />
    </div>
  );
}

function ProtectionDetail({ p }: { p: CropProtectionPayload }) {
  return (
    <div className="space-y-1 text-sm">
      <Def label="Фаза"   value={p.phase || null} />
      <Def label="Погода" value={p.weather || null} />
    </div>
  );
}

function DesiccationDetail({ p }: { p: DesiccationPayload }) {
  return (
    <div className="space-y-1 text-sm">
      <Def label="Цвет ботвы" value={p.haulmColor || null} />
    </div>
  );
}

/** Stacked bar showing calibration fractions visually. */
function CalibrationBar({ f3555, f5570, f70plus }: { f3555: number; f5570: number; f70plus: number }) {
  const total = f3555 + f5570 + f70plus;
  if (total <= 0) return null;
  const w1 = Math.round((f3555   / total) * 100);
  const w2 = Math.round((f5570   / total) * 100);
  const w3 = 100 - w1 - w2;

  return (
    <div className="space-y-1.5">
      <div className="flex h-5 overflow-hidden rounded-full">
        {w1 > 0 && <div className="bg-amber-400"   style={{ width: `${w1}%` }} />}
        {w2 > 0 && <div className="bg-emerald-500" style={{ width: `${w2}%` }} />}
        {w3 > 0 && <div className="bg-blue-400"    style={{ width: `${w3}%` }} />}
      </div>
      <div className="flex justify-between text-[11px] text-slate-500">
        <span><span className="font-semibold text-amber-600">{f3555}%</span> 35–55 мм</span>
        <span><span className="font-semibold text-emerald-600">{f5570}%</span> 55–70 мм</span>
        <span><span className="font-semibold text-blue-600">{f70plus}%</span> 70+ мм</span>
      </div>
    </div>
  );
}

function HarvestDetail({ p }: { p: HarvestPayload }) {
  const hasCalibration = p.fraction3555 > 0 || p.fraction5570 > 0 || p.fraction70plus > 0;
  const hasDates = p.harvestStartDate || p.harvestEndDate;
  const hasDamage = p.mechanicalDamagePct != null || p.damagePhotoUrl;
  return (
    <div className="space-y-1 text-sm">
      {hasDates && (
        <>
          <DetailDivider label="Период уборки" />
          <Def label="Начало"    value={p.harvestStartDate ? formatDate(p.harvestStartDate) : null} />
          <Def label="Окончание" value={p.harvestEndDate   ? formatDate(p.harvestEndDate)   : null} />
        </>
      )}
      {hasCalibration && (
        <>
          <DetailDivider label="Калибровка клубней" />
          <CalibrationBar
            f3555={p.fraction3555 ?? 0}
            f5570={p.fraction5570 ?? 0}
            f70plus={p.fraction70plus ?? 0}
          />
        </>
      )}
      {hasDamage && (
        <>
          <DetailDivider label="Механические повреждения" />
          <Def label="Мех. повреждения"
               value={p.mechanicalDamagePct != null ? `${p.mechanicalDamagePct}%` : null} />
          <Def label="Фото"
               value={p.damagePhotoUrl
                 ? <a href={p.damagePhotoUrl} target="_blank" rel="noopener noreferrer"
                      className="text-brand-600 underline underline-offset-2">Открыть фото</a>
                 : null} />
        </>
      )}
    </div>
  );
}

const STORAGE_DISEASE_LABELS_DETAIL: Record<string, string> = {
  wet_rot: 'Мокрая гниль', dry_rot: 'Сухая гниль (фузариоз)', late_blight: 'Фитофтороз',
  silver_scurf: 'Серебристая парша', black_scurf: 'Ризоктониоз',
  pink_rot: 'Розовая гниль', other: 'Болезнь (см. примечания)',
};

function StorageDetail({ p }: { p: StoragePayload }) {
  const diseaseLabel = p.storageDisease && p.storageDisease !== 'none'
    ? (STORAGE_DISEASE_LABELS_DETAIL[p.storageDisease] ?? p.storageDisease)
    : null;
  return (
    <div className="space-y-1 text-sm">
      <Def label="Потери"  value={p.lossPct > 0 ? `${p.lossPct}%` : null} />
      <Def label="Болезни" value={diseaseLabel} />
    </div>
  );
}

// ── Stats + detail dispatchers ─────────────────────────────────────────────────

function HeadlineStats({ type, payload }: { type: string; payload: Record<string, unknown> }) {
  const p = payload as Record<string, never>;
  switch (type) {
    case 'planting':        return <PlantingStats    p={p as unknown as PlantingPayload} />;
    case 'inspection':      return <InspectionStats  p={p as unknown as InspectionPayload} />;
    case 'fertilizer':      return <FertilizerStats  p={p as unknown as FertilizerPayload} />;
    case 'irrigation':      return <IrrigationStats  p={p as unknown as IrrigationPayload} />;
    case 'crop_protection': return <ProtectionStats  p={p as unknown as CropProtectionPayload} />;
    case 'desiccation':     return <DesiccationStats p={p as unknown as DesiccationPayload} />;
    case 'harvest':         return <HarvestStats     p={p as unknown as HarvestPayload} />;
    case 'storage':         return <StorageStats     p={p as unknown as StoragePayload} />;
    default:                return null;
  }
}

function DetailPanel({ type, payload }: { type: string; payload: Record<string, unknown> }) {
  const p = payload as Record<string, never>;
  let content: React.ReactNode;
  switch (type) {
    case 'planting':        content = <PlantingDetail    p={p as unknown as PlantingPayload} />;    break;
    case 'inspection':      content = <InspectionDetail  p={p as unknown as InspectionPayload} />;  break;
    case 'fertilizer':      content = <FertilizerDetail  p={p as unknown as FertilizerPayload} />;  break;
    case 'irrigation':      content = <IrrigationDetail  p={p as unknown as IrrigationPayload} />;  break;
    case 'crop_protection': content = <ProtectionDetail  p={p as unknown as CropProtectionPayload} />; break;
    case 'desiccation':     content = <DesiccationDetail p={p as unknown as DesiccationPayload} />; break;
    case 'harvest':         content = <HarvestDetail     p={p as unknown as HarvestPayload} />;     break;
    case 'storage':         content = <StorageDetail     p={p as unknown as StoragePayload} />;     break;
    default:
      content = (
        <pre className="whitespace-pre-wrap break-words text-xs text-slate-500">
          {JSON.stringify(payload, null, 2)}
        </pre>
      );
  }
  // Only render the panel if there's anything to show
  if (!content) return null;
  return (
    <div className="w-full shrink-0 rounded-2xl bg-slate-50 p-3 md:w-[272px]">
      {content}
    </div>
  );
}

// ── Month separator ───────────────────────────────────────────────────────────

function MonthSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

// ── Main Timeline component ───────────────────────────────────────────────────

export function Timeline({ items }: { items: TimelineEntry[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-400">
        Записей пока нет. Нажмите «Новая запись», чтобы добавить первую операцию.
      </div>
    );
  }

  const nodes: React.ReactNode[] = [];
  let lastMonth = '';

  for (const item of items) {
    const cfg = TYPE_CONFIG[item.operation_type] ?? FALLBACK_CONFIG;
    const month = monthKey(item.operation_date);

    // Month group separator when month changes
    if (month !== lastMonth) {
      nodes.push(<MonthSeparator key={`month-${month}`} label={month} />);
      lastMonth = month;
    }

    // Check if detail panel has non-trivial content to render
    const hasPayload = Object.keys(item.payload).length > 0;

    nodes.push(
      <div key={item.id} className="relative flex gap-0">
        {/* ── Timeline spine (dot + vertical line) ── */}
        <div className="relative flex w-10 shrink-0 flex-col items-center">
          {/* vertical connector */}
          <div className="absolute bottom-0 top-0 w-px bg-slate-200" />
          {/* colored icon dot */}
          <div className={`relative z-10 mt-5 flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-white ${cfg.dotCls}`}>
            <cfg.Icon size={14} className={cfg.iconCls} />
          </div>
        </div>

        {/* ── Card ── */}
        <div className={`mb-3 ml-2 flex-1 overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-soft backdrop-blur border-l-4 ${cfg.accentCls}`}>
          {/* Header row: type badge + date + status */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.badgeCls}`}>
              <cfg.Icon size={11} />
              {cfg.label}
            </span>
            <span className="text-xs text-slate-400">{formatDate(item.operation_date)}</span>
            {item.status !== 'completed' && (
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                item.status === 'planned'     ? 'bg-slate-100 text-slate-600' :
                item.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                ''
              }`}>
                {item.status === 'planned'     ? 'Запланировано' :
                 item.status === 'in_progress' ? 'В процессе'   :
                 ''}
              </span>
            )}

            {/* Photo thumbnail — only if photo_url is set */}
            {item.photo_url && (
              <a
                href={item.photo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto overflow-hidden rounded-lg border border-slate-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.photo_url}
                  alt="Фото операции"
                  className="h-8 w-12 object-cover"
                />
              </a>
            )}
          </div>

          {/* Body */}
          <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-start md:justify-between">
            {/* Left: title + headline stats + notes */}
            <div className="min-w-0 flex-1 space-y-2">
              <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>

              {/* Headline stat chips for fast scanning */}
              {hasPayload && (
                <HeadlineStats type={item.operation_type} payload={item.payload} />
              )}

              {item.notes && (
                <p className="text-xs leading-5 text-slate-500">{item.notes}</p>
              )}
            </div>

            {/* Right: secondary detail panel */}
            {hasPayload && (
              <DetailPanel type={item.operation_type} payload={item.payload} />
            )}
          </div>
        </div>
      </div>,
    );
  }

  return <div className="space-y-0">{nodes}</div>;
}
