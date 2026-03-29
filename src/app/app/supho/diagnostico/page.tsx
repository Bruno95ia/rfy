import { Suspense } from 'react';
import { requireAuth, getOrgIdForUser } from '@/lib/auth';
import { toPlainSerializable } from '@/lib/serialize-props';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { DiagnosticoClient } from './DiagnosticoClient';

export default async function DiagnosticoPage() {
  const { user } = await requireAuth();
  const supabase = await createClient();

  const orgId = await getOrgIdForUser(user.id);
  if (!orgId) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        Carregando organização...
      </div>
    );
  }

  const { data: campaigns } = await supabase
    .from('supho_diagnostic_campaigns')
    .select('id, name, status, created_at, question_ids')
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
      <Suspense
        fallback={
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-12 text-center text-sm text-[var(--color-text-muted)]">
            Carregando diagnóstico…
          </div>
        }
      >
        <DiagnosticoClient
          orgId={orgId}
          initialCampaigns={toPlainSerializable(
            (campaigns ?? []) as Array<{
              id: string;
              name: string;
              status: string;
              created_at: string;
              question_ids?: string[] | null;
            }>
          )}
        />
      </Suspense>
    </div>
  );
}
