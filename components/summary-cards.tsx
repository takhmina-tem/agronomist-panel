import { Activity, Droplets, AlertTriangle, Tractor } from 'lucide-react';
import { Card } from '@/components/ui';

export function SummaryCards({ summary }: { summary: any }) {
  const items = [
    { title: 'Поля в работе', value: `${summary.total_fields}`, note: `${summary.total_area} га`, icon: Tractor },
    { title: 'Тревоги по болезням', value: `${summary.disease_alerts}`, note: 'статус 3 и выше', icon: AlertTriangle },
    { title: 'Средняя урожайность', value: `${summary.avg_yield_t_ha ?? '—'} т/га`, note: 'по завершённой уборке', icon: Activity },
    { title: 'Полив за сезон', value: `${summary.irrigation_mm ?? 0} мм`, note: 'по всем полям', icon: Droplets }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map(({ title, value, note, icon: Icon }) => (
        <Card key={title}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">{title}</p>
              <h3 className="mt-2 text-3xl font-bold text-slate-900">{value}</h3>
              <p className="mt-2 text-sm text-slate-500">{note}</p>
            </div>
            <div className="rounded-2xl bg-brand-50 p-3 text-brand-700">
              <Icon size={20} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
