import { requireAuth, getOrgIdForUser } from '@/lib/auth';
import { toIsoString, toPlainSerializable } from '@/lib/serialize-props';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  fetchCampaignByCanonicalName,
  fetchCurrentCampaignForMaturity,
  isUploadsContextNewerThanCompute,
  MATURITY_CANONICAL_CAMPAIGN_NAME,
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

  let preferredCampaign: Awaited<ReturnType<typeof fetchCampaignByCanonicalName>> = null;
  try {
    preferredCampaign = await fetchCampaignByCanonicalName(
      supabase,
      orgId,
      MATURITY_CANONICAL_CAMPAIGN_NAME
    );
  } catch (e) {
    console.error('[supho/maturidade] fetchCampaignByCanonicalName', e);
  }

  const { data: latestResult } = preferredCampaign
    ? await supabase
        .from('supho_diagnostic_results')
        .select(
          'id, campaign_id, computed_at, ic, ih, ip, itsmo, nivel, gap_c_h, gap_c_p, ise, ipt, icl, sample_size, result_json'
        )
        .eq('org_id', orgId)
        .eq('campaign_id', preferredCampaign.id)
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : await supabase
        .from('supho_diagnostic_results')
        .select(
          'id, campaign_id, computed_at, ic, ih, ip, itsmo, nivel, gap_c_h, gap_c_p, ise, ipt, icl, sample_size, result_json'
        )
        .eq('org_id', orgId)
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

  type CampaignRow = { id: string; name: string; uploads_context_updated_at: string | null };
  let campaignRowForResult: CampaignRow | null = null;

  if (latestResult?.campaign_id) {
    const { data: campaignData } = await supabase
      .from('supho_diagnostic_campaigns')
      .select('id, name, uploads_context_updated_at')
      .eq('org_id', orgId)
      .eq('id', latestResult.campaign_id)
      .maybeSingle();
    if (campaignData && typeof campaignData === 'object' && campaignData !== null && 'id' in campaignData) {
      const cd = campaignData as Record<string, unknown>;
      campaignRowForResult = {
        id: String(cd.id),
        name: typeof cd.name === 'string' ? cd.name : '',
        uploads_context_updated_at:
          cd.uploads_context_updated_at == null
            ? null
            : typeof cd.uploads_context_updated_at === 'string'
              ? cd.uploads_context_updated_at
              : String(cd.uploads_context_updated_at),
      };
    }
  }

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

  const sourcesRaw = rj?.sourcesUsedInCompute;
  const sourcesUsedInCompute =
    result &&
    sourcesRaw &&
    typeof sourcesRaw === 'object' &&
    sourcesRaw !== null &&
    typeof (sourcesRaw as { notePt?: unknown }).notePt === 'string'
      ? {
          notePt: String((sourcesRaw as { notePt: string }).notePt),
          campaignQuestionFilterActive: (sourcesRaw as { campaignQuestionFilterActive?: unknown })
            .campaignQuestionFilterActive === true,
          surveyQuestionRowsUsed:
            typeof (sourcesRaw as { surveyQuestionRowsUsed?: unknown }).surveyQuestionRowsUsed === 'number'
              ? (sourcesRaw as { surveyQuestionRowsUsed: number }).surveyQuestionRowsUsed
              : undefined,
          surveyQuestionRowsBeforeFilter:
            typeof (sourcesRaw as { surveyQuestionRowsBeforeFilter?: unknown }).surveyQuestionRowsBeforeFilter ===
            'number'
              ? (sourcesRaw as { surveyQuestionRowsBeforeFilter: number }).surveyQuestionRowsBeforeFilter
              : undefined,
        }
      : null;

  const enrichment = result
    ? {
        systemsMaturity,
        orgContextPresent: Boolean(rj?.orgContextPresent),
        orgContextSummary:
          typeof rj?.orgContextSummary === 'string' ? rj.orgContextSummary : null,
        uploadsSynthesisUsed: rj?.uploadsSynthesisUsed === true,
        sourcesUsedInCompute,
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
        systemsAdjusted:
          rj?.systemsAdjusted && typeof rj.systemsAdjusted === 'object' && rj.systemsAdjusted !== null
            ? {
                ip: Number((rj.systemsAdjusted as { ip?: unknown }).ip),
                itsmo: Number((rj.systemsAdjusted as { itsmo?: unknown }).itsmo),
                nivel: Number((rj.systemsAdjusted as { nivel?: unknown }).nivel),
                gapCH: Number((rj.systemsAdjusted as { gapCH?: unknown }).gapCH),
                gapCP: Number((rj.systemsAdjusted as { gapCP?: unknown }).gapCP),
              }
            : null,
      }
    : null;

  const computedAtIso = result ? toIsoString(latestResult?.computed_at) : '';

  let newerCampaignWithoutResult: { campaignId: string; campaignName: string } | null = null;
  if (latestResult?.campaign_id) {
    const recentByUpdated = await fetchCurrentCampaignForMaturity(supabase, orgId);
    if (recentByUpdated && recentByUpdated.id !== latestResult.campaign_id) {
      const { data: anyResultForRecent } = await supabase
        .from('supho_diagnostic_results')
        .select('id')
        .eq('org_id', orgId)
        .eq('campaign_id', recentByUpdated.id)
        .limit(1)
        .maybeSingle();
      if (!anyResultForRecent) {
        newerCampaignWithoutResult = {
          campaignId: recentByUpdated.id,
          campaignName: recentByUpdated.name,
        };
      }
    }
  }

  const emptyStateCampaign = !latestResult
    ? preferredCampaign ?? (await fetchCurrentCampaignForMaturity(supabase, orgId))
    : null;

  const campaignContext =
    result && latestResult
      ? {
          campaignId: campaignRowForResult?.id ?? latestResult.campaign_id,
          campaignName: campaignRowForResult?.name?.trim() ? campaignRowForResult.name : 'Campanha',
          uploadsContextUpdatedAt: campaignRowForResult?.uploads_context_updated_at ?? null,
          uploadsStale: isUploadsContextNewerThanCompute(
            campaignRowForResult?.uploads_context_updated_at ?? null,
            computedAtIso
          ),
          hasUploadsContext: Boolean(campaignRowForResult?.uploads_context_updated_at),
          newerCampaignWithoutResult,
        }
      : emptyStateCampaign
        ? {
            campaignId: emptyStateCampaign.id,
            campaignName: emptyStateCampaign.name,
            uploadsContextUpdatedAt: emptyStateCampaign.uploads_context_updated_at,
            uploadsStale: false,
            hasUploadsContext: Boolean(emptyStateCampaign.uploads_context_updated_at),
            newerCampaignWithoutResult: null,
          }
        : null;

  const pageSubtitle = latestResult
    ? preferredCampaign
      ? `Diagnóstico da campanha «${campaignRowForResult?.name ?? preferredCampaign.name}» (prioridade no painel). Índices e texto contextual referem-se a esse cálculo.`
      : `Último diagnóstico calculado na organização${
          campaignRowForResult?.name ? ` (campanha ${campaignRowForResult.name})` : ''
        }. Índices e texto contextual referem-se a esse cálculo.`
    : preferredCampaign
      ? `A campanha «${preferredCampaign.name}» tem respostas, mas ainda sem diagnóstico calculado. Abra Diagnóstico e use «Calcular diagnóstico» para ver ITSMO e radar.`
      : 'Crie uma campanha em Diagnóstico para medir maturidade. Sem resultados calculados, o painel sugere a campanha mais recentemente atualizada para começar.';

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
