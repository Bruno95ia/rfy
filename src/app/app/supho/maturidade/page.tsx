import { requireAuth, getOrgIdForUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MaturidadePanelClient } from './MaturidadePanelClient';
import { HistoricoDiagnosticoClient } from './HistoricoDiagnosticoClient';

export default async function MaturidadePage() {
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

  const { data: latestResult } = await supabase
    .from('supho_diagnostic_results')
    .select('id, campaign_id, computed_at, ic, ih, ip, itsmo, nivel, gap_c_h, gap_c_p, ise, ipt, icl, sample_size')
    .eq('org_id', orgId)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const result = latestResult
    ? {
        id: latestResult.id,
        campaignId: latestResult.campaign_id,
        computedAt: latestResult.computed_at,
        ic: Number(latestResult.ic),
        ih: Number(latestResult.ih),
        ip: Number(latestResult.ip),
        itsmo: Number(latestResult.itsmo),
        nivel: Number(latestResult.nivel) as 1 | 2 | 3 | 4 | 5,
        gapCH: Number(latestResult.gap_c_h),
        gapCP: Number(latestResult.gap_c_p),
        ise: latestResult.ise != null ? Number(latestResult.ise) : 0,
        ipt: latestResult.ipt != null ? Number(latestResult.ipt) : 0,
        icl: latestResult.icl != null ? Number(latestResult.icl) : 0,
        sampleSize: latestResult.sample_size ?? 0,
      }
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'App', href: '/app/dashboard' },
          { label: 'SUPHO', href: '/app/supho/maturidade' },
          { label: 'Painel de Maturidade' },
        ]}
        title="Painel de Maturidade SUPHO"
        subtitle="Visão integrada do último diagnóstico: radar dos pilares, nível de maturidade (ITSMO), gaps e leitura executiva."
      />
      <MaturidadePanelClient result={result} />
      <HistoricoDiagnosticoClient />
    </div>
  );
}
