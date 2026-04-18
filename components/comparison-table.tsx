import { Badge, Card } from '@/components/ui';
import type { ComparisonRow } from '@/lib/types';

export function ComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {['Поле', 'Сорт', 'Фаза', 'Урожайность', 'Калибровка', 'K кг/га', 'Полив', 'Болезни/вред.', 'Десикация'].map((head) => (
                <th key={head} className="px-5 py-4 font-medium">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 text-slate-700">
                <td className="px-5 py-4 font-semibold text-slate-900">{row.name}</td>
                <td className="px-5 py-4">{row.variety_name}</td>
                <td className="px-5 py-4">{row.current_phase}</td>
                <td className="px-5 py-4">{row.yield_t_ha ?? '—'} т/га</td>
                <td className="px-5 py-4">
                  {row.calibration ? (
                    <div className="space-y-0.5 text-xs">
                      <div><span className="font-semibold text-amber-600">{row.calibration.pct3555 ?? '—'}%</span> <span className="text-slate-400">35–55</span></div>
                      <div><span className="font-semibold text-emerald-600">{row.calibration.pct5570 ?? '—'}%</span> <span className="text-slate-400">55–70</span></div>
                      <div><span className="font-semibold text-blue-600">{row.calibration.pct70plus ?? '—'}%</span> <span className="text-slate-400">70+</span></div>
                    </div>
                  ) : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-5 py-4">{row.k_kg_ha}</td>
                <td className="px-5 py-4">{row.irrigation_mm} мм</td>
                <td className="px-5 py-4"><Badge tone={row.disease_status >= 3 ? 'danger' : row.disease_status >= 2 ? 'warning' : 'success'}>{row.disease_status}/5</Badge></td>
                <td className="px-5 py-4">{row.desiccation_done ? 'Да' : 'Нет'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
