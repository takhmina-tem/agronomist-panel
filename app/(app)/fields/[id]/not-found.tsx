import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, Shell } from '@/components/ui';

export default function FieldNotFound() {
  return (
    <Shell>
      <div className="space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft size={16} /> Назад к списку полей
        </Link>
        <Card>
          <div className="py-8 text-center">
            <div className="text-4xl font-bold text-slate-200">404</div>
            <div className="mt-2 text-lg font-semibold text-slate-700">Поле не найдено</div>
            <p className="mt-1 text-sm text-slate-500">Поле с таким ID не существует или было удалено.</p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Перейти к списку полей
            </Link>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
