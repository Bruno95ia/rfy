import { requireAuth, getOrgIdForUser } from '@/lib/auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { AIClient } from './AIClient';

export default async function AIPage() {
  const { user } = await requireAuth();
  const orgId = await getOrgIdForUser(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'App', href: '/app/dashboard' },
          { label: 'Inteligência IA' },
        ]}
        title="Benchmark, Deal e Intervenções"
        subtitle="Compare com mercado, previsão por deal e sugestões de intervenção"
      />
      <AIClient orgId={orgId ?? ''} />
    </div>
  );
}
