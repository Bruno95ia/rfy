import { requireAuth } from '@/lib/auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { ContextoOrganizacaoClient } from './ContextoOrganizacaoClient';

export default async function ContextoOrganizacaoPage() {
  await requireAuth();

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'App', href: '/app/dashboard' },
          { label: 'Configurações', href: '/app/settings' },
          { label: 'Contexto da organização' },
        ]}
        title="Contexto da organização"
        subtitle="Textos que o RFY utiliza no diagnóstico SUPHO, juntamente com integrações CRM/ERP. Sem CRM ativo ou com ERP declarado como não integrado, o pilar de performance (IP) pode ser ajustado."
      />
      <ContextoOrganizacaoClient />
    </>
  );
}
