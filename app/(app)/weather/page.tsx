import Link from 'next/link';
import {
  ArrowLeft, Sun, Cloud, CloudRain, CloudSnow, Zap,
  Thermometer, Droplets, Wind, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { Badge, Card, Shell, SectionTitle } from '@/components/ui';
import {
  getFarmCoordinates,
  fetchWeatherForecast,
  calculateSeasonGtk,
  getSprayAdvisory,
  type CurrentWeather,
  type DailyForecast,
  type GtkResult,
  type WmoIconName,
} from '@/lib/weather';
import { fetchFieldClimatePrecipitation } from '@/lib/fieldclimate';

export const dynamic = 'force-dynamic';

// ── Icon resolver ─────────────────────────────────────────────────────────────

function WmoIcon({ name, size = 20, className }: { name: WmoIconName; size?: number; className?: string }) {
  switch (name) {
    case 'Sun':        return <Sun        size={size} className={className} />;
    case 'CloudRain':  return <CloudRain  size={size} className={className} />;
    case 'CloudSnow':  return <CloudSnow  size={size} className={className} />;
    case 'Zap':        return <Zap        size={size} className={className} />;
    default:           return <Cloud      size={size} className={className} />;
  }
}

// ── Day-of-week helper ────────────────────────────────────────────────────────

const RU_DOW = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const RU_MONTHS_SHORT: Record<number, string> = {
  1:'янв',2:'фев',3:'мар',4:'апр',5:'май',6:'июн',
  7:'июл',8:'авг',9:'сен',10:'окт',11:'ноя',12:'дек',
};

function formatForecastDate(iso: string, isFirst: boolean): string {
  if (isFirst) return 'Сегодня';
  const d = new Date(iso + 'T12:00:00');
  return `${RU_DOW[d.getDay()]} ${d.getDate()} ${RU_MONTHS_SHORT[d.getMonth() + 1]}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CurrentCard({
  c,
  precipOverride,
  precipSource,
}: {
  c: CurrentWeather;
  precipOverride?: number;
  precipSource?: string;
}) {
  const precipValue = precipOverride ?? c.precipitation;
  const precipLabel = precipSource
    ? `мм осадки (${precipSource})`
    : 'мм осадки';
  return (
    <Card className="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 text-white">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-6">
          <WmoIcon name={c.description.startsWith('Ясно') ? 'Sun' : c.description.includes('Дождь') || c.description.includes('Ливень') || c.description.includes('Морось') ? 'CloudRain' : c.description.includes('Снег') ? 'CloudSnow' : c.description.includes('Гроза') ? 'Zap' : 'Cloud'} size={56} className="text-white/80" />
          <div>
            <div className="text-5xl font-bold">{c.temperature}°C</div>
            <div className="mt-1 text-lg text-white/80">{c.description}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 lg:grid-cols-1 lg:gap-3">
          <div className="flex items-center gap-2 text-white/80">
            <Droplets size={16} />
            <span className="text-sm">{c.humidity}% влажность</span>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <Wind size={16} />
            <span className="text-sm">{c.windspeed} м/с ветер</span>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <CloudRain size={16} />
            <span className="text-sm">{precipValue} {precipLabel}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ForecastStrip({ days }: { days: DailyForecast[] }) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day, i) => (
        <Card key={day.date} className={`flex flex-col items-center gap-2 p-3 text-center ${i === 0 ? 'ring-2 ring-brand-400' : ''}`}>
          <div className="text-xs font-semibold text-slate-500">{formatForecastDate(day.date, i === 0)}</div>
          <WmoIcon name={
            day.description.includes('Дождь') || day.description.includes('Ливень') || day.description.includes('Морось') ? 'CloudRain' :
            day.description.includes('Снег') ? 'CloudSnow' :
            day.description.includes('Гроза') ? 'Zap' :
            day.description.startsWith('Ясно') ? 'Sun' : 'Cloud'
          } size={24} className="text-brand-600" />
          <div className="text-sm">
            <span className="font-semibold text-slate-900">{Math.round(day.tempMax)}°</span>
            <span className="text-slate-400"> / {Math.round(day.tempMin)}°</span>
          </div>
          {day.precipSum > 0 && (
            <div className="flex items-center gap-1 text-xs text-sky-600">
              <Droplets size={11} />
              {day.precipSum} мм
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function GtkCard({ gtk }: { gtk: GtkResult }) {
  const toneCls =
    gtk.gtk === null                  ? 'bg-slate-50 text-slate-600' :
    gtk.gtk < 0.5                     ? 'bg-red-50 text-red-700' :
    gtk.gtk < 1.0                     ? 'bg-amber-50 text-amber-700' :
    gtk.gtk < 1.5                     ? 'bg-emerald-50 text-emerald-700' :
    gtk.gtk < 2.0                     ? 'bg-blue-50 text-blue-700' :
                                         'bg-violet-50 text-violet-700';

  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">ГТК — Гидротермический коэффициент</h3>
        <p className="mt-1 text-sm text-slate-500">
          По формуле Селянинова: ГТК = Σ(осадки) / (0,1 × Σ(T<sub>ср</sub> при T &gt; 10°C)) за вегетационный период.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Big value */}
        <div className={`flex min-w-[160px] flex-col items-center justify-center rounded-2xl p-6 ${toneCls}`}>
          <div className="text-4xl font-bold">{gtk.gtk ?? '—'}</div>
          <div className="mt-1 text-sm font-medium">{gtk.interpretation}</div>
        </div>

        {/* Details */}
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <div className="text-xs text-slate-500">Осадки за период</div>
            <div className="mt-1 text-lg font-bold text-slate-900">{gtk.precipSum} мм</div>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <div className="text-xs text-slate-500">Σ температур (&gt;10°C)</div>
            <div className="mt-1 text-lg font-bold text-slate-900">{gtk.tempSum}°C</div>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <div className="text-xs text-slate-500">Тёплых дней учтено</div>
            <div className="mt-1 text-lg font-bold text-slate-900">{gtk.daysUsed}</div>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <div className="text-xs text-slate-500">Период</div>
            <div className="mt-1 text-sm font-medium text-slate-700">{gtk.periodStart} — {gtk.periodEnd}</div>
          </div>
        </div>

        {/* Scale legend */}
        <div className="min-w-[180px] space-y-1 text-xs">
          {[
            { range: '< 0,5',       label: 'Засуха',               cls: 'bg-red-100 text-red-700' },
            { range: '0,5 – 1,0',   label: 'Сухо',                 cls: 'bg-amber-100 text-amber-700' },
            { range: '1,0 – 1,5',   label: 'Норма',                cls: 'bg-emerald-100 text-emerald-700' },
            { range: '1,5 – 2,0',   label: 'Влажно',               cls: 'bg-blue-100 text-blue-700' },
            { range: '> 2,0',       label: 'Избыточное увлажнение', cls: 'bg-violet-100 text-violet-700' },
          ].map(s => (
            <div key={s.range} className="flex items-center gap-2">
              <span className={`inline-flex w-20 justify-center rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${s.cls}`}>{s.range}</span>
              <span className="text-slate-600">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function SprayCard({ c }: { c: CurrentWeather }) {
  const advisory = getSprayAdvisory(c);
  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Готовность к обработке СЗР</h3>
        <p className="text-sm text-slate-500">Оценка текущих условий для применения пестицидов и фунгицидов.</p>
      </div>
      <div className={`flex items-start gap-3 rounded-2xl p-4 ${advisory.safe ? 'bg-emerald-50' : 'bg-amber-50'}`}>
        {advisory.safe
          ? <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />
          : <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
        }
        <div>
          <div className={`font-semibold ${advisory.safe ? 'text-emerald-800' : 'text-amber-800'}`}>
            {advisory.summary}
          </div>
          {advisory.reasons.length > 0 && (
            <ul className="mt-2 space-y-1">
              {advisory.reasons.map((r, i) => (
                <li key={i} className="text-sm text-amber-700">• {r}</li>
              ))}
            </ul>
          )}
          {advisory.safe && (
            <p className="mt-1 text-sm text-emerald-700">
              Ветер {c.windspeed} м/с · {c.humidity}% влажность · {c.temperature}°C · без осадков
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function WeatherPage() {
  const coords = getFarmCoordinates();

  let forecast: Awaited<ReturnType<typeof fetchWeatherForecast>> | null = null;
  let gtk:      GtkResult | null = null;
  let fetchError: string | null  = null;

  // Fetch FieldClimate precipitation in parallel with Open-Meteo.
  // Covers today in UTC; we include yesterday to handle UTC vs local timezone edge cases.
  const todayUtc = new Date().toISOString().split('T')[0];
  const yesterdayUtc = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
  const fcPrecipPromise = fetchFieldClimatePrecipitation(yesterdayUtc, todayUtc);

  try {
    [forecast, gtk] = await Promise.all([
      fetchWeatherForecast(coords.lat, coords.lon),
      calculateSeasonGtk(coords.lat, coords.lon),
    ]);
  } catch (e) {
    fetchError = e instanceof Error ? e.message : 'Не удалось загрузить данные';
  }

  // fetchFieldClimatePrecipitation never throws — returns [] on any error
  const fcPrecip = await fcPrecipPromise;
  const fcMap    = new Map(fcPrecip.map(p => [p.date, p.precipMm]));
  const hasFc    = fcPrecip.length > 0;

  // Override precipitation in daily forecast where FieldClimate has measured data.
  // SprayCard always uses the original Open-Meteo current reading (checks c.precipitation > 0).
  const fcTodayPrecip  = hasFc ? (fcMap.get(todayUtc) ?? fcMap.get(yesterdayUtc) ?? null) : null;
  const displayDaily   = forecast?.daily.map(day => {
    const fc = fcMap.get(day.date);
    return fc !== undefined ? { ...day, precipSum: fc } : day;
  }) ?? [];

  const precipSource     = hasFc ? 'FieldClimate' : undefined;
  const weatherDataLabel = hasFc
    ? `${coords.lat}°N, ${coords.lon}°E · Open-Meteo · осадки: FieldClimate · обновление раз в час`
    : `${coords.lat}°N, ${coords.lon}°E · Open-Meteo · обновление раз в час`;

  return (
    <Shell>
      <div className="space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft size={16} /> Назад
        </Link>

        <SectionTitle
          eyebrow="Погода"
          title="Аксу"
          description={weatherDataLabel}
        />

        {fetchError && (
          <Card>
            <div className="flex items-center gap-3 text-red-700">
              <AlertTriangle size={18} />
              <div>
                <div className="font-semibold">Не удалось загрузить погоду</div>
                <div className="text-sm text-red-600">{fetchError}</div>
              </div>
            </div>
          </Card>
        )}

        {forecast && (
          <>
            {/* precipOverride: FieldClimate today total; SprayCard stays on Open-Meteo */}
            <CurrentCard
              c={forecast.current}
              precipOverride={fcTodayPrecip ?? undefined}
              precipSource={fcTodayPrecip !== null ? precipSource : undefined}
            />

            <section className="space-y-4">
              <SectionTitle title="Прогноз на 7 дней" />
              <ForecastStrip days={displayDaily.length > 0 ? displayDaily : forecast.daily} />
            </section>

            <SprayCard c={forecast.current} />
          </>
        )}

        {gtk && (
          <section className="space-y-4">
            <GtkCard gtk={gtk} />
          </section>
        )}

      </div>
    </Shell>
  );
}
