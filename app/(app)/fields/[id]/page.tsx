import Link from 'next/link';
import { ArrowLeft, BarChart3, Database, Droplets, PackageCheck } from 'lucide-react';
import { Timeline } from '@/components/timeline';
import { NewOperationButton } from '@/components/new-operation-modal';
import { FieldNpkChart, FieldIrrigationChart, FieldDiseaseChart, FieldProtectionTable, FieldYieldOpsChart } from '@/components/charts';
import { Badge, Card, SectionTitle, Shell } from '@/components/ui';
import { getFieldAnalytics, getFieldById } from '@/lib/data';
import { getFarmCoordinates, fetchSeasonPrecipitation } from '@/lib/weather';
import { fetchFieldClimatePrecipitation, isFieldClimateConfigured } from '@/lib/fieldclimate';
import type { IrrigationEvent, WaterBalancePoint } from '@/lib/types';

// ── Water-balance helpers ─────────────────────────────────────────────────────

/**
 * Merge manual irrigation events (from DB) with daily archive precipitation
 * (from Open-Meteo) into a single series for the water-balance chart.
 *
 * Rules:
 * - Every irrigation date is always included.
 * - Precipitation days with precipMm > 0 are included even without irrigation.
 * - Precipitation days with precipMm = 0 are omitted to reduce noise.
 * - When both occur on the same date, the values are combined in one point.
 * - Result is sorted chronologically.
 */
function buildWaterBalance(
  irrigation: IrrigationEvent[],
  precipitation: { date: string; precipMm: number }[],
): WaterBalancePoint[] {
  const map = new Map<string, WaterBalancePoint>();

  for (const e of irrigation) {
    map.set(e.date, {
      date:            e.date,
      irrigationMm:    e.volumeMm,
      precipMm:        0,
      irrigationLabel: e.typeLabel,
      goal:            e.goal,
    });
  }

  for (const p of precipitation) {
    if (p.precipMm <= 0) continue;
    const existing = map.get(p.date);
    if (existing) {
      existing.precipMm = p.precipMm;
    } else {
      map.set(p.date, {
        date:            p.date,
        irrigationMm:    0,
        precipMm:        p.precipMm,
        irrigationLabel: '',
        goal:            '',
      });
    }
  }

  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function FieldPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);

  // Season date range for precipitation fetch:
  // April 1 of the current year → today − 3 days (archive API lag).
  // If the season hasn't started yet (before April 1), precipitation is empty.
  const now         = new Date();
  const toISO       = (d: Date) => d.toISOString().split('T')[0];
  const seasonStart = `${now.getFullYear()}-04-01`;
  const archiveEnd  = new Date(now);
  archiveEnd.setDate(now.getDate() - 3);
  const seasonEnd   = toISO(archiveEnd);

  // Farm-level coordinates used as fallback (no per-field lat/lon in schema yet)
  const coords = getFarmCoordinates();
  const canFetch = seasonStart <= seasonEnd;

  const [data, analytics, precipitation] = await Promise.all([
    getFieldById(id),
    getFieldAnalytics(id),
    canFetch
      ? (isFieldClimateConfigured()
          ? fetchFieldClimatePrecipitation(seasonStart, seasonEnd)
          : fetchSeasonPrecipitation(coords.lat, coords.lon, seasonStart, seasonEnd))
      : Promise.resolve([]),
  ]);

  const metrics = [
    { title: 'Азот за сезон', value: `${data.metrics.total_n} кг/га`, icon: Database },
    { title: 'Фосфор за сезон', value: `${data.metrics.total_p} кг/га`, icon: PackageCheck },
    { title: 'Калий за сезон', value: `${data.metrics.total_k} кг/га`, icon: BarChart3 },
    { title: 'Полив', value: `${data.metrics.irrigation_mm} мм`, icon: Droplets }
  ];

  // Merge irrigation ops with historical precipitation for the water-balance chart
  const waterBalance = buildWaterBalance(analytics.irrigationEvents, precipitation);

  const hasAnalytics =
    analytics.npkEvents.length > 0 ||
    waterBalance.length > 0 ||
    analytics.diseasePoints.length > 0 ||
    analytics.protectionEvents.length > 0 ||
    analytics.harvest !== null;

  return (
    <Shell>
      <div className="space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft size={16} /> Назад к списку полей
        </Link>

        <Card className="bg-gradient-to-br from-white to-brand-50">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Экран поля</div>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">{data.field.name}</h1>
              <p className="mt-2 text-sm text-slate-600">
                {data.field.area_ha} га • {data.field.variety_name} • {data.field.maturity_group} • {data.field.purpose_type}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>{data.field.current_phase}</Badge>
              <Badge tone={data.field.disease_status >= 3 ? 'danger' : data.field.disease_status >= 2 ? 'warning' : 'success'}>
                Болезни/вред. {data.field.disease_status}/5
              </Badge>
              <Badge tone="default">Урожайность {data.metrics.yield_t_ha ?? '—'} т/га</Badge>
              {data.metrics.storage_loss_pct !== null && data.metrics.storage_loss_pct !== undefined
                ? <Badge tone="warning">Потери в хранении {data.metrics.storage_loss_pct}%</Badge>
                : <Badge tone="default">Хранение: нет данных</Badge>
              }
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map(({ title, value, icon: Icon }) => (
            <Card key={title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-slate-500">{title}</div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
                </div>
                <div className="rounded-2xl bg-brand-50 p-3 text-brand-700"><Icon size={18} /></div>
              </div>
            </Card>
          ))}
        </div>

        {/* Per-field analytics section */}
        {hasAnalytics && (
          <section className="space-y-4">
            <SectionTitle
              title="Аналитика по полю"
              description="Графики строятся из реальных операций: NPK, полив, динамика болезней, окна защиты."
            />
            <div className="grid gap-4 xl:grid-cols-2">
              <FieldNpkChart data={analytics.npkEvents} />
              <FieldIrrigationChart data={waterBalance} />
            </div>
            <FieldDiseaseChart data={analytics.diseasePoints} />
            <FieldYieldOpsChart data={analytics.seasonSummary} />
            <FieldProtectionTable data={analytics.protectionEvents} />
            {analytics.harvest && (
              <Card>
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-slate-900">Итоги уборки</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <div className="text-sm text-slate-500">Урожайность</div>
                    <div className="mt-1 text-2xl font-bold text-slate-900">{analytics.harvest.yieldTHa} т/га</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Валовый сбор</div>
                    <div className="mt-1 text-2xl font-bold text-slate-900">{analytics.harvest.grossTons} т</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Отходы</div>
                    <div className="mt-1 text-2xl font-bold text-slate-900">{analytics.harvest.wastePct}%</div>
                  </div>
                  {analytics.harvest.mechanicalDamagePct !== null && (
                    <div>
                      <div className="text-sm text-slate-500">Мех. повреждения</div>
                      <div className="mt-1 text-2xl font-bold text-red-700">{analytics.harvest.mechanicalDamagePct}%</div>
                    </div>
                  )}
                </div>
                {analytics.harvest.damagePhotoUrl && (
                  <div className="mt-3 text-sm">
                    <a href={analytics.harvest.damagePhotoUrl} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1.5 text-brand-600 underline underline-offset-2 hover:text-brand-800">
                      Фото механических повреждений
                    </a>
                  </div>
                )}
                {(analytics.harvest.fraction3555 > 0 || analytics.harvest.fraction5570 > 0 || analytics.harvest.fraction70plus > 0) && (
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Калибровка клубней</div>
                    <div className="flex h-5 overflow-hidden rounded-full">
                      {analytics.harvest.fraction3555   > 0 && <div className="bg-amber-400"   style={{ width: `${analytics.harvest.fraction3555}%` }} />}
                      {analytics.harvest.fraction5570   > 0 && <div className="bg-emerald-500" style={{ width: `${analytics.harvest.fraction5570}%` }} />}
                      {analytics.harvest.fraction70plus > 0 && <div className="bg-blue-400"    style={{ width: `${analytics.harvest.fraction70plus}%` }} />}
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span><span className="font-semibold text-amber-600">{analytics.harvest.fraction3555}%</span> 35–55 мм</span>
                      <span><span className="font-semibold text-emerald-600">{analytics.harvest.fraction5570}%</span> 55–70 мм</span>
                      <span><span className="font-semibold text-blue-600">{analytics.harvest.fraction70plus}%</span> 70+ мм</span>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </section>
        )}

        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Лента операций</h2>
              <p className="mt-2 text-sm text-slate-500">Все записи по полю в хронологическом порядке.</p>
            </div>
            <NewOperationButton fieldId={data.field.id} areaHa={data.field.area_ha} maturityGroup={data.field.maturity_group} />
          </div>
          <Timeline items={data.timeline} />
        </div>
      </div>
    </Shell>
  );
}
