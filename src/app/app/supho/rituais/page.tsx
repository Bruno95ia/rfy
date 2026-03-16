import { requireAuth } from '@/lib/auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { RituaisClient } from './RituaisClient';

export default async function RituaisPage() {
  await requireAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'App', href: '/app/dashboard' },
          { label: 'SUPHO', href: '/app/supho/maturidade' },
          { label: 'Rituais' },
        ]}
        title="Rituais e cadência"
        subtitle="Check-in semanal, performance quinzenal, feedback mensal e governança trimestral. Registre ocorrências e decisões para o Índice de Ritmo."
      />
      <RituaisClient />
    </div>
  );
}
