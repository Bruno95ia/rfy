import { requireAuth, getOrgIdForUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { DiagnosticoClient } from './DiagnosticoClient';

export default async function DiagnosticoPage() {
  const { user } = await requireAuth();
  const supabase = await createClient();

  let orgId = (await supabase.from('org_members').select('org_id').limit(1)).data?.[0]?.org_id;
  if (!orgId) orgId = await getOrgIdForUser(user.id);
  if (!orgId) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        Carregando organização...
      </div>
    );
  }

  const { data: campaigns } = await supabase
    .from('supho_diagnostic_campaigns')
    .select('id, name, status, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'App', href: '/app/dashboard' },
          { label: 'SUPHO', href: '/app/supho/maturidade' },
          { label: 'Diagnóstico' },
        ]}
        title="Diagnóstico SUPHO"
        subtitle="Campanhas de pesquisa por pilares (Cultura, Humano, Performance), respondentes e cálculo dos índices IC, IH, IP e ITSMO."
      />
      <DiagnosticoClient
        orgId={orgId}
        initialCampaigns={campaigns ?? []}
      />
    </div>
  );
}
