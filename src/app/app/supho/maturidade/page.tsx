import { requireAuth, getOrgIdForUser } from '@/lib/auth';
import { toIsoString, toPlainSerializable } from '@/lib/serialize-props';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  fetchCurrentCampaignForMaturity,
  isUploadsContextNewerThanCompute,
} from '@/lib/supho/maturidade-campaign';
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

  const currentCampaign = await fetchCurrentCampaignForMaturity(supabase, orgId);

  const { data: latestResult } = currentCampaign
    ? await supabase
        .from('supho_diagnostic_results')
        .select(
          'id, campaign_id, computed_at, ic, ih, ip, itsmo, nivel, gap_c_h, gap_c_p, ise, ipt, icl, sample_size, result_json'
        )
        .eq('org_id', orgId)
        .eq('campaign_id', currentCampaign.id)
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const result = latestResult
    ? {
        id: latestResult.id,
        campaignId: latestResult.campaign_id,
        computedAt: toIsoString(latestResult.computed_at),
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
        sampleSize: Number(latestResult.sample_size ?? 0),
      }
    : null;

  const rj = latestResult?.result_json as Record<string, unknown> | null | undefined;
  const systemsRaw = rj?.systemsMaturity;
  const systemsMaturity =
    systemsRaw &&
    typeof systemsRaw === 'object' &&
    systemsRaw !== null &&
    'ipPenaltyApplied' in systemsRaw &&
    Array.isArray((systemsRaw as { reasons?: unknown }).reasons)
      ? {
          ipPenaltyApplied: Number((systemsRaw as { ipPenaltyApplied?: unknown }).ipPenaltyApplied ?? 0),
          reasons: (systemsRaw as unknown as { reasons: string[] }).reasons,
          hasActiveCrmIntegration: Boolean(
            (systemsRaw as { hasActiveCrmIntegration?: unknown }).hasActiveCrmIntegration
          ),
          erpIntegrationStatus: String(
            (systemsRaw as { erpIntegrationStatus?: unknown }).erpIntegrationStatus ?? 'unknown'
          ),
        }
      : null;

  const enrichment = result
    ? {
        systemsMaturity,
        orgContextPresent: Boolean(rj?.orgContextPresent),
        orgContextSummary:
          typeof rj?.orgContextSummary === 'string' ? rj.orgContextSummary : null,
        uploadsSynthesisUsed: rj?.uploadsSynthesisUsed === true,
        indicesFromSurvey:
          rj?.indicesFromSurvey && typeof rj.indicesFromSurvey === 'object' && rj.indicesFromSurvey !== null
            ? {
                ic: Number((rj.indicesFromSurvey as { ic?: unknown }).ic),
                ih: Number((rj.indicesFromSurvey as { ih?: unknown }).ih),
                ip: Number((rj.indicesFromSurvey as { ip?: unknown }).ip),
                itsmo: Number((rj.indicesFromSurvey as { itsmo?: unknown }).itsmo),
                nivel: Number((rj.indicesFromSurvey as { nivel?: unknown }).nivel),
                gapCH: Number((rj.indicesFromSurvey as { gapCH?: unknown }).gapCH),
                gapCP: Number((rj.indicesFromSurvey as { gapCP?: unknown }).gapCP),
              }
            : null,
      }
    : null;

  const computedAtIso = result ? toIsoString(latestResult?.computed_at) : '';
  const campaignContext = currentCampaign
    ? {
        campaignId: currentCampaign.id,
        campaignName: currentCampaign.name,
        uploadsContextUpdatedAt: currentCampaign.uploads_context_updated_at,
        uploadsStale:
          Boolean(result) &&
          isUploadsContextNewerThanCompute(currentCampaign.uploads_context_updated_at, computedAtIso),
        hasUploadsContext: Boolean(currentCampaign.uploads_context_updated_at),
      }
    : null;

  const pageSubtitle = currentCampaign
    ? `Painel alinhado à campanha atual ${currentCampaign.name}. Os índices e o texto contextual referem-se ao último cálculo desta campanha (respostas, documentos de contexto e síntese de uploads quando aplicável).`
    : 'Crie uma campanha em Diagnóstico para medir maturidade. Quando houver campanha, o painel segue a mais recentemente atualizada (inclui alterações em uploads e síntese).';

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'App', href: '/app/dashboard' },
          { label: 'SUPHO', href: '/app/supho/maturidade' },
          { label: 'Painel de Maturidade' },
        ]}
        title="Painel de Maturidade SUPHO"
        subtitle={pageSubtitle}
      />
      <MaturidadePanelClient
        result={toPlainSerializable(result)}
        enrichment={toPlainSerializable(enrichment)}
        campaignContext={toPlainSerializable(campaignContext)}
      />
      <HistoricoDiagnosticoClient />
    </div>
  );
}
