import { requireAuth } from '@/lib/auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConhecimentoClient } from './ConhecimentoClient';

export default async function ConhecimentoPage() {
  await requireAuth();

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: 'App', href: '/app/dashboard' },
          { label: 'Configurações', href: '/app/settings' },
          { label: 'Conhecimento' },
        ]}
        title="Repositório Conhecimento"
        subtitle="Documentos da organização ou por campanha SUPHO. Texto legível entra no diagnóstico; outros formatos são apenas referenciados."
      />
      <ConhecimentoClient />
    </div>
  );
}
