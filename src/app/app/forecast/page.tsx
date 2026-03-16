import { requireAuth, getOrgIdForUser } from '@/lib/auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { ForecastClient } from './ForecastClient';

export default async function ForecastPage() {
  const { user } = await requireAuth();
  const orgId = await getOrgIdForUser(user.id);
  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'App', href: '/app/dashboard' },
          { label: 'Previsão' },
        ]}
        title="Previsão de fechamento"
        subtitle="Projeção de receita e pipeline com base no serviço de IA (cenários e ajustes)"
      />
      <ForecastClient orgId={orgId ?? ''} />
    </div>
  );
}
