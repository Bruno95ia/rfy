import { requireAuth } from '@/lib/auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { PessoasClient } from './PessoasClient';

export default async function PessoasPage() {
  await requireAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'App', href: '/app/dashboard' },
          { label: 'Pessoas' },
        ]}
        title="Pessoas da organização"
        subtitle="Contatos e stakeholders vinculados à sua org. Gerencie também em Configurações."
      />
      <PessoasClient />
    </div>
  );
}
