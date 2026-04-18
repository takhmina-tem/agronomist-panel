import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Shell, SectionTitle } from '@/components/ui';
import { FertilizerEditor } from '@/components/fertilizer-editor';
import { getFertilizers } from '@/lib/data';

export default async function FertilizersPage() {
  const fertilizers = await getFertilizers();

  return (
    <Shell>
      <div className="space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft size={16} /> Назад
        </Link>

        <SectionTitle
          eyebrow="Справочник"
          title="Удобрения"
          description="Все удобрения из базы данных: тип, содержание N/P/K, примечание по применению."
        />

        <FertilizerEditor fertilizers={fertilizers} />
      </div>
    </Shell>
  );
}
