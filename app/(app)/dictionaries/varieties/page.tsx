import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Shell, SectionTitle } from '@/components/ui';
import { VarietyEditor } from '@/components/variety-editor';
import { getVarieties } from '@/lib/data';

export default async function VarietiesPage() {
  const varieties = await getVarieties();

  return (
    <Shell>
      <div className="space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft size={16} /> Назад
        </Link>

        <SectionTitle
          eyebrow="Справочник"
          title="Сорта картофеля"
          description="Все сорта из базы данных: группа спелости, назначение, потенциал урожайности."
        />

        <VarietyEditor varieties={varieties} />
      </div>
    </Shell>
  );
}
