'use client';

import { ResponsiveContainer, AreaChart, Area, CartesianGrid, Tooltip, XAxis, YAxis, BarChart, Bar, Legend, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { Card } from '@/components/ui';
import type { NpkEvent, WaterBalancePoint, DiseasePoint, ProtectionEvent, SeasonOpsSummary } from '@/lib/types';

export function DiseaseTrendChart({ data }: { data: { date: string; late_blight: number }[] }) {
  return (
    <Card>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Динамика фитофтороза</h3>
        <p className="text-sm text-slate-500">Средний балл по осмотрам для быстрой оценки риска.</p>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ bottom: 28 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 13, dy: 14 }} />
            <YAxis domain={[0, 5]} />
            <Tooltip formatter={(v: number) => [`${v}`, 'Фитофтороз']} />
            <Legend formatter={() => 'Фитофтороз'} />
            <Area type="monotone" dataKey="late_blight" name="Фитофтороз" stroke="#2f804c" fill="#97d8ac" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function YieldPotassiumChart({ data }: { data: { name: string; potassium: number; yield: number | null }[] }) {
  return (
    <Card>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Калий vs урожайность</h3>
        <p className="text-sm text-slate-500">Помогает видеть связь между питанием и фактическим результатом.</p>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ bottom: 28 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 13, dy: 14 }} />
            <YAxis />
            <Tooltip formatter={(v: number, name: string) => [v, name === 'potassium' ? 'Калий, кг/га' : 'Урожайность, т/га']} />
            <Legend formatter={(v: string) => v === 'potassium' ? 'Калий, кг/га' : 'Урожайность, т/га'} />
            <Bar dataKey="potassium" name="potassium" fill="#63bd81" radius={[8, 8, 0, 0]} />
            <Bar dataKey="yield" name="yield" fill="#245134" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ── Per-field analytics charts ─────────────────────────────────────────────────

export function FieldNpkChart({ data }: { data: NpkEvent[] }) {
  if (data.length === 0) return null;
  return (
    <Card>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">NPK за сезон</h3>
        <p className="text-sm text-slate-500">Азот, фосфор и калий по каждому внесению удобрений, кг/га.</p>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ bottom: 28 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 13, dy: 14 }} />
            <YAxis />
            <Tooltip formatter={(value: number, name: string) => [`${value} кг/га`, name]} />
            <Legend />
            <Bar dataKey="n" name="N" stackId="npk" fill="#3b82f6" />
            <Bar dataKey="p" name="P₂O₅" stackId="npk" fill="#8b5cf6" />
            <Bar dataKey="k" name="K₂O" stackId="npk" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function FieldIrrigationChart({ data }: { data: WaterBalancePoint[] }) {
  if (data.length === 0) return null;

  // Show precipitation bars only when at least one day has actual rain data
  const hasPrecip = data.some(d => d.precipMm > 0);

  return (
    <Card>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Полив и осадки</h3>
        <p className="text-sm text-slate-500">
          {hasPrecip
            ? 'Объём полива (мм) + суточные осадки из архива Open-Meteo. Осадки — данные на уровне фермы.'
            : 'Объём каждого полива, мм. Данные об осадках за этот период отсутствуют.'}
        </p>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ bottom: 28 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 13, dy: 14 }} />
            <YAxis unit=" мм" />
            <Tooltip formatter={(value: number, name: string) => [`${value} мм`, name]} />
            <Legend />
            <Bar dataKey="irrigationMm" name="Полив" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
            {hasPrecip && (
              <Bar dataKey="precipMm" name="Осадки" fill="#bae6fd" radius={[4, 4, 0, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function FieldDiseaseChart({ data }: { data: DiseasePoint[] }) {
  if (data.length === 0) return null;

  // Show pest series only when at least one inspection recorded them (> 0).
  // Old records without coloradoBeetle/wireworm have 0 — no empty series shown.
  const hasPests = data.some(d => d.coloradoBeetle > 0 || d.wireworm > 0);

  return (
    <Card>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Динамика болезней и вредителей</h3>
        <p className="text-sm text-slate-500">
          Баллы по осмотрам (0–5): болезни, сорняки
          {hasPests ? ' и вредители.' : '.'}
        </p>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ bottom: 28 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 13, dy: 14 }} />
            <YAxis domain={[0, 5]} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="lateBlight"  name="Фитофтороз"   stroke="#ef4444" fill="#fecaca" fillOpacity={0.4} />
            <Area type="monotone" dataKey="alternaria"  name="Альтернариоз" stroke="#f97316" fill="#fed7aa" fillOpacity={0.4} />
            <Area type="monotone" dataKey="rhizoctonia" name="Ризоктониоз"  stroke="#8b5cf6" fill="#ddd6fe" fillOpacity={0.4} />
            <Area type="monotone" dataKey="commonScab"  name="Парша"        stroke="#a16207" fill="#fef9c3" fillOpacity={0.4} />
            <Area type="monotone" dataKey="weeds"       name="Сорняки"      stroke="#84cc16" fill="#d9f99d" fillOpacity={0.4} />
            {hasPests && (
              <Area type="monotone" dataKey="coloradoBeetle" name="Колорад. жук"  stroke="#dc2626" fill="#fca5a5" fillOpacity={0.5} />
            )}
            {hasPests && (
              <Area type="monotone" dataKey="wireworm"       name="Проволочник"   stroke="#92400e" fill="#fde68a" fillOpacity={0.5} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/**
 * Radar / spider chart showing season-level operation totals alongside yield.
 * Each axis is normalised to a 0–100 scale against practical maximums so that
 * all series fit on the same radar without distortion.
 *
 * Practical ceilings (adjustable):
 *   N  кг/га       → 300
 *   K  кг/га       → 350
 *   Полив  мм      → 500
 *   Обработок      → 10
 *   Осмотров       → 15
 *   Урожайность т/га → 60
 */
export function FieldYieldOpsChart({ data }: { data: SeasonOpsSummary }) {
  const MAX = { n: 300, k: 350, irrigation: 500, protection: 10, inspection: 15, yield: 60 };
  const pct = (val: number | null, max: number) =>
    val == null ? 0 : Math.min(100, Math.round((val / max) * 100));

  const radarData = [
    { subject: 'N, кг/га',        value: pct(data.totalN,            MAX.n),          raw: `${data.totalN} кг/га`     },
    { subject: 'K₂O, кг/га',      value: pct(data.totalK,            MAX.k),          raw: `${data.totalK} кг/га`     },
    { subject: 'Полив, мм',        value: pct(data.totalIrrigationMm, MAX.irrigation), raw: `${data.totalIrrigationMm} мм` },
    { subject: 'Обработок СЗР',   value: pct(data.protectionCount,   MAX.protection), raw: `${data.protectionCount} шт.` },
    { subject: 'Осмотров',         value: pct(data.inspectionCount,   MAX.inspection), raw: `${data.inspectionCount} шт.`  },
    { subject: 'Урожайность',      value: pct(data.yieldTHa,         MAX.yield),      raw: data.yieldTHa != null ? `${data.yieldTHa} т/га` : 'нет данных' },
  ];

  return (
    <Card>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Урожайность vs операции</h3>
        <p className="text-sm text-slate-500">
          Радарная диаграмма сезонных итогов: питание, полив, защита, осмотры и урожайность.
          Каждая ось нормирована к практическому максимуму (100%).
        </p>
      </div>

      {/* Radar chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 8, right: 40, bottom: 8, left: 40 }}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#475569' }} />
            <Radar
              name="Сезон"
              dataKey="value"
              stroke="#2f804c"
              fill="#2f804c"
              fillOpacity={0.25}
              dot={{ r: 3, fill: '#2f804c' }}
            />
            <Tooltip
              formatter={(_value: number, _name: string, props: { payload?: { raw?: string } }) =>
                [props.payload?.raw ?? '', '']
              }
            />
            <Legend formatter={() => 'Показатели сезона'} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Absolute values table */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {radarData.map(d => (
          <div key={d.subject} className="rounded-xl bg-slate-50 px-3 py-2.5">
            <div className="text-xs text-slate-500">{d.subject}</div>
            <div className="mt-0.5 text-sm font-semibold text-slate-800">{d.raw}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function FieldProtectionTable({ data }: { data: ProtectionEvent[] }) {
  if (data.length === 0) return null;
  const typeLabel: Record<string, string> = {
    fungicide: 'Фунгицид', herbicide: 'Гербицид', insecticide: 'Инсектицид',
  };
  const typeCls: Record<string, string> = {
    fungicide: 'bg-blue-50 text-blue-700', herbicide: 'bg-amber-50 text-amber-700', insecticide: 'bg-red-50 text-red-700',
  };
  return (
    <Card>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Окна защиты (СЗР)</h3>
        <p className="text-sm text-slate-500">Все обработки фунгицидами, гербицидами и инсектицидами за сезон.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-100 text-slate-500">
            <tr>
              {['Дата', 'Препарат', 'Тип', 'Доза', 'Фаза', 'Погода'].map(h => (
                <th key={h} className="pb-2 pr-4 text-left text-xs font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((e, i) => (
              <tr key={i} className="border-t border-slate-50">
                <td className="py-2 pr-4 text-slate-500 text-xs">{e.date}</td>
                <td className="py-2 pr-4 font-medium text-slate-800">{e.product}</td>
                <td className="py-2 pr-4">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${typeCls[e.protectionType] ?? 'bg-slate-100 text-slate-700'}`}>
                    {typeLabel[e.protectionType] ?? e.protectionType}
                  </span>
                </td>
                <td className="py-2 pr-4 text-slate-600">{e.dose}</td>
                <td className="py-2 pr-4 text-slate-600">{e.phase}</td>
                <td className="py-2 text-slate-500 text-xs">{e.weather || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
