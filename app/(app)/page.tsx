import Link from 'next/link';
import { BookOpen, CloudSun, Download, FlaskConical } from 'lucide-react';
import { DashboardHero } from '@/components/header';
import { SummaryCards } from '@/components/summary-cards';
import { ComparisonTable } from '@/components/comparison-table';
import { DiseaseTrendChart, YieldPotassiumChart } from '@/components/charts';
import { FieldCard } from '@/components/field-card';
import { SectionTitle, Shell } from '@/components/ui';
import { NewFieldModal } from '@/components/new-field-modal';
import { getComparison, getDashboardSummary, getFields } from '@/lib/data';

export default async function HomePage() {
  const [fields, dashboard, comparison] = await Promise.all([
    getFields(),
    getDashboardSummary(),
    getComparison()
  ]);

  return (
    <Shell>
      <div className="space-y-6">
        <DashboardHero />
        <SummaryCards summary={dashboard.summary} />

        <section className="space-y-4">
          <SectionTitle
            eyebrow="Экран 1"
            title="Список полей"
            description="Карточки дают быстрый обзор: площадь, сорт, текущая фаза, последняя операция, статус болезней и риск по влаге."
            action={
              <div className="flex items-center gap-2">
                <NewFieldModal />
                <a
                  href="/api/export/fields"
                  download
                  className="inline-flex items-center gap-2 rounded-xl border border-brand-300 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-100"
                >
                  <Download size={15} />
                  Скачать Excel
                </a>
              </div>
            }
          />
          {fields.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-8 py-12 text-center">
              <p className="text-base font-semibold text-slate-700">Поля ещё не добавлены</p>
              <p className="mt-1 mb-5 text-sm text-slate-500">
                Создайте первое поле, чтобы начать вести записи.
              </p>
              <div className="flex justify-center">
                <NewFieldModal />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {fields.map((field) => (
                <FieldCard key={field.id} field={field} />
              ))}
            </div>
          )}
        </section>

        {(dashboard.diseaseTrend.length > 0 || dashboard.yieldVsPotassium.length > 0) && (
          <section className="grid gap-4 xl:grid-cols-2">
            <DiseaseTrendChart data={dashboard.diseaseTrend} />
            <YieldPotassiumChart data={dashboard.yieldVsPotassium} />
          </section>
        )}

        <section className="space-y-4">
          <SectionTitle
            eyebrow="Экран 13"
            title="Сравнение полей"
            description="Сводка по урожайности, калийному питанию, поливу, болезням, десикации и калибровке клубней."
          />
          <ComparisonTable rows={comparison} />
        </section>

        <section className="space-y-4 pb-8">
          <SectionTitle
            title="Справочники"
            description="Сорта и удобрения, используемые в системе."
          />
          <div className="flex flex-wrap gap-3">
            <Link
              href={'/dictionaries/varieties' as any}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
            >
              <BookOpen size={16} /> Сорта картофеля
            </Link>
            <Link
              href={'/dictionaries/fertilizers' as any}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
            >
              <FlaskConical size={16} /> Удобрения
            </Link>
            <Link
              href={'/weather' as any}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
            >
              <CloudSun size={16} /> Погода и ГТК
            </Link>
          </div>
        </section>
      </div>
    </Shell>
  );
}
