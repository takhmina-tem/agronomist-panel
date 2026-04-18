import Link from 'next/link';
import { ArrowUpRight, Droplet, ShieldAlert, Sprout } from 'lucide-react';
import { Badge, Card } from '@/components/ui';
import type { FieldCard as FieldCardType } from '@/lib/types';

function diseaseTone(score: number) {
  if (score >= 4) return 'danger';
  if (score >= 2) return 'warning';
  return 'success';
}

const OPERATION_LABELS: Record<string, string> = {
  planting:         'Посадка',
  inspection:       'Осмотр поля',
  fertilizer:       'Удобрение',
  fertilization:    'Удобрение',
  irrigation:       'Полив',
  crop_protection:  'Защита (СЗР)',
  desiccation:      'Десикация',
  harvest:          'Уборка урожая',
  storage:          'Хранение',
};

const MOISTURE_LABELS: Record<string, string> = {
  high:   'высокий',
  medium: 'средний',
  low:    'низкий',
};

export function FieldCard({ field }: { field: FieldCardType }) {
  return (
    <Link href={`/fields/${field.id}`}>
      <Card className="h-full transition duration-200 hover:-translate-y-1 hover:shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Поле</div>
            <h3 className="mt-2 text-xl font-bold text-slate-900">{field.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{field.area_ha} га • {field.variety_name}</p>
          </div>
          <ArrowUpRight className="text-slate-400" size={18} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Badge>{field.current_phase}</Badge>
          <Badge tone={diseaseTone(field.disease_status) as any}>Болезни/вред. {field.disease_status}/5</Badge>
          <Badge tone={field.moisture_risk === 'high' ? 'danger' : field.moisture_risk === 'medium' ? 'warning' : 'success'}>
            Влага: {MOISTURE_LABELS[field.moisture_risk] ?? field.moisture_risk}
          </Badge>
        </div>

        <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <div className="flex items-center gap-2"><Sprout size={16} className="text-brand-700" /> Последняя операция: {field.last_operation_type ? (OPERATION_LABELS[field.last_operation_type] ?? field.last_operation_type) : '—'}</div>
          <div className="flex items-center gap-2"><ShieldAlert size={16} className="text-brand-700" /> Стеблей/куст: {field.stems_per_plant ?? '—'}</div>
          <div className="flex items-center gap-2"><Droplet size={16} className="text-brand-700" /> Плотность растений: {field.plant_density ?? '—'}</div>
        </div>
      </Card>
    </Link>
  );
}
