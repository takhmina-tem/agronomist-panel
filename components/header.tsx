import { Sprout, BarChart3, FlaskConical, CloudRain, Leaf } from 'lucide-react';
import { Card } from '@/components/ui';

const pills = [
  { icon: Leaf, label: 'Картофельный цикл' },
  { icon: FlaskConical, label: 'NPK и СЗР' },
  { icon: CloudRain, label: 'Полив и стресс' },
  { icon: BarChart3, label: 'Сравнение полей' }
];

export function DashboardHero() {
  return (
    <Card className="overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 text-white">
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white/90">
            <Sprout size={16} /> Панель агронома
          </div>
          <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
            Единый контур для картофельных полей: операции, осмотры, болезни, урожай и хранение.
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-white/80 sm:text-base">
            Интерфейс построен вокруг сценариев из твоего видения: список полей, лента по полю, быстрые формы,
            аналитика и сравнение эффективности по каждому участку.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {pills.map(({ icon: Icon, label }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/15 p-2">
                  <Icon size={18} />
                </div>
                <span className="text-sm font-medium text-white/90">{label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
