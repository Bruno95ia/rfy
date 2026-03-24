import { requireAuth } from '@/lib/auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { ContextPackContent } from '@/lib/context-pack/context-pack-content';
import { ContextPackTracker } from './ContextPackTracker';

export default async function ContextPackPage() {
  await requireAuth();

  return (
    <>
      <ContextPackTracker />
      <PageHeader
        breadcrumbs={[
          { label: 'App', href: '/app/dashboard' },
          { label: 'Configurações', href: '/app/settings' },
          { label: 'Context Pack' },
        ]}
        title="Context Pack RFY"
        subtitle="Política comercial, ICP, diagnóstico Core, roadmap e métricas — alinhado ao documento interno v1."
      />
      <ContextPackContent />
    </>
  );
}
