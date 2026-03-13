import { requireAuth, getOrgIdForUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { CopilotContasClient } from './CopilotContasClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CopilotContasPage() {
  const { user } = await requireAuth();
  const supabase = await createClient();

  const orgId = await getOrgIdForUser(user.id);

  let companies: string[] = [];
  if (orgId) {
    const { data: opps } = await supabase
      .from('opportunities')
      .select('company_name')
      .eq('org_id', orgId)
      .eq('status', 'open')
      .not('company_name', 'is', null);
    const rows = (opps ?? []) as { company_name?: string | null }[];
    const names = rows
      .map((o) => (o.company_name ?? '').trim())
      .filter((s): s is string => Boolean(s));
    companies = [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: 'App', href: '/app/dashboard' },
          { label: 'Copiloto de contas' },
        ]}
        title="Copiloto de Receita — Visão do vendedor"
        subtitle="Próximos passos, mensagens e oportunidades de expansão por conta. Escolha uma conta e gere recomendações acionáveis."
      />
      <CopilotContasClient orgId={orgId ?? ''} companies={companies} />
    </div>
  );
}
