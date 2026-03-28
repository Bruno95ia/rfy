import { requireAuth, getOrgIdForUser } from '@/lib/auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { PessoasClient } from './PessoasClient';

export default async function PessoasPage() {
  const { user } = await requireAuth();
  const orgId = await getOrgIdForUser(user.id);

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
      <PessoasClient initialOrgId={orgId ?? ''} />
    </div>
  );
}
