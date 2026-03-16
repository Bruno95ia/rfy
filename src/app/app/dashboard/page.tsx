import { requireAuth, getOrgIdForUser, getOrgMemberRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { DashboardClient, type DashboardClientProps } from './DashboardClient';
import { PageHeader } from '@/components/layout/PageHeader';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const { user } = await requireAuth();
  const supabase = await createClient();

  const orgId = await getOrgIdForUser(user.id);
  if (!orgId) {
    return (
      <div className="flex items-center justify-center py-24 text-[var(--color-text-muted)]">
        Carregando organização...
      </div>
    );
  }

  const { data: report } = await supabase
    .from('reports')
    .select('id, snapshot_json, frictions_json, pillar_scores_json, generated_at')
    .eq('org_id', orgId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  const { data: latestSupho } = await supabase
    .from('supho_diagnostic_results')
    .select('computed_at, ic, ih, ip, itsmo, nivel, gap_c_h, gap_c_p, ise, ipt, icl, sample_size')
    .eq('org_id', orgId)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const suphoResult = latestSupho
    ? {
        computedAt: latestSupho.computed_at as string,
        ic: Number(latestSupho.ic),
        ih: Number(latestSupho.ih),
        ip: Number(latestSupho.ip),
        itsmo: Number(latestSupho.itsmo),
        nivel: Number(latestSupho.nivel) as 1 | 2 | 3 | 4 | 5,
        gapCH: Number(latestSupho.gap_c_h),
        gapCP: Number(latestSupho.gap_c_p),
        ise: latestSupho.ise != null ? Number(latestSupho.ise) : 0,
        ipt: latestSupho.ipt != null ? Number(latestSupho.ipt) : 0,
        icl: latestSupho.icl != null ? Number(latestSupho.icl) : 0,
        sampleSize: latestSupho.sample_size ?? 0,
      }
    : null;

  let unitEconomics: Record<string, unknown> | null = null;
  let icpCached: { icp_summary: string; icp_study_json: Record<string, unknown>; generated_at: string } | null = null;
  try {
    const { data: ue } = await supabase
      .from('org_unit_economics')
      .select('*')
      .eq('org_id', orgId)
      .maybeSingle();
    unitEconomics = (ue as Record<string, unknown>) ?? null;

    const { data: icp } = await supabase
      .from('org_icp_studies')
      .select('icp_summary, icp_study_json, generated_at')
      .eq('org_id', orgId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (icp) {
      icpCached = {
        icp_summary: icp.icp_summary ?? '',
        icp_study_json: (icp.icp_study_json as Record<string, unknown>) ?? {},
        generated_at: icp.generated_at ?? new Date().toISOString(),
      };
    }
  } catch {
    // Tabelas podem não existir antes da migração 005
  }

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  const role = await getOrgMemberRole(user.id, orgId);
  const isExecutive = role === 'owner' || role === 'admin';
  const subtitle = isExecutive
    ? `${greeting}. Visão de governança: Receita Confiável, distorção (Receita Inflada) e as 3 decisões prioritárias para reduzir risco.`
    : `${greeting}. Visão executiva para RFY Index, Receita Confiável, Receita Inflada, alertas e decisões prioritárias.`;

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[{ label: 'App', href: '/app/dashboard' }, { label: 'Dashboard RFY' }]}
        title="Control Deck RFY"
        subtitle={subtitle}
        actions={
          report ? (
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`/api/reports/executivo?org_id=${encodeURIComponent(orgId)}&format=pdf`}
                download="relatorio-executivo.html"
              >
                <Button size="sm">
                  PDF
                </Button>
              </a>
              <a
                href={`/api/reports/executive.csv?org_id=${encodeURIComponent(orgId)}`}
                download="relatorio-executivo.csv"
              >
                <Button variant="outline" size="sm">
                  CSV
                </Button>
              </a>
              <a
                href={`/api/reports/executive.xlsx?org_id=${encodeURIComponent(orgId)}`}
                download="relatorio-executivo.xlsx"
              >
                <Button variant="outline" size="sm">
                  Excel
                </Button>
              </a>
              <Link href="/app/reports">
                <Button variant="outline" size="sm">
                  Abrir central de relatórios
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/app/uploads">
                <Button size="sm">
                  Fazer primeiro upload
                </Button>
              </Link>
              <Link href="/app/settings">
                <Button variant="outline" size="sm">
                  Configurar integração
                </Button>
              </Link>
            </div>
          )
        }
      />
      <DashboardClient
        orgId={orgId}
        userRole={role ?? 'viewer'}
        report={report as DashboardClientProps['report']}
        snapshot={report?.snapshot_json as Record<string, unknown> | null}
        frictions={report?.frictions_json as Array<Record<string, unknown>> | null}
        pillarScores={report?.pillar_scores_json as Record<string, unknown> | null}
        generatedAt={report?.generated_at ?? null}
        suphoResult={suphoResult}
        unitEconomics={unitEconomics}
        icpCached={icpCached}
      />
    </div>
  );
}
