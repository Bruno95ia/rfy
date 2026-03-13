/**
 * Calcula e persiste relatório (reports + org_unit_economics).
 * Usado pelo job Inngest e pelo fallback síncrono quando Inngest não está disponível.
 */
import type { AdminDbClientType } from '@/lib/supabase/admin';
import {
  computeSnapshot,
  computeFrictions,
  computePillarScores,
  computeImpactPlaceholder,
  type OpportunityWithActivity,
  type OrgConfigThresholds,
} from '@/lib/metrics/compute';
import { computeUnitEconomics } from '@/lib/metrics/unit-economics';
import { touchMetricsStatus } from '@/lib/metrics/status';

export async function computeAndPersistReport(
  admin: AdminDbClientType,
  orgId: string,
  uploadId?: string | null
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: orgConfig } = await admin
    .from('org_config')
    .select(
      'dias_proposta_risco, dias_pipeline_abandonado, dias_aging_inflado, dias_aprovacao_travada, top_deals_por_friccao, top_evidencias_por_friccao'
    )
    .eq('org_id', orgId)
    .maybeSingle();

  const thresholds: OrgConfigThresholds = {
    dias_proposta_risco: orgConfig?.dias_proposta_risco ?? 7,
    dias_pipeline_abandonado: orgConfig?.dias_pipeline_abandonado ?? 14,
    dias_aging_inflado: orgConfig?.dias_aging_inflado ?? 60,
    dias_aprovacao_travada: orgConfig?.dias_aprovacao_travada ?? 5,
    top_deals_por_friccao: orgConfig?.top_deals_por_friccao ?? 20,
    top_evidencias_por_friccao: orgConfig?.top_evidencias_por_friccao ?? 10,
  };

  const { data: opportunities } = await admin
    .from('opportunities')
    .select(
      'id, crm_hash, org_id, stage_name, status, value, created_date, company_name, title, owner_name, owner_email'
    )
    .eq('org_id', orgId)
    .eq('status', 'open');

  const { data: activities } = await admin
    .from('activities')
    .select(
      'opportunity_id_crm, company_name, opportunity_title, pipeline_name, done_at, start_at, created_at_crm, linked_opportunity_hash, link_confidence'
    )
    .eq('org_id', orgId)
    .in('link_confidence', ['high', 'medium']);

  const activitiesByHash = new Map<string, typeof activities>();
  for (const a of activities ?? []) {
    const hash = a.linked_opportunity_hash;
    if (!hash) continue;
    if (!activitiesByHash.has(hash)) activitiesByHash.set(hash, []);
    activitiesByHash.get(hash)!.push(a);
  }

  const enriched: OpportunityWithActivity[] = (opportunities ?? []).map((opp) => {
    const acts = activitiesByHash.get(opp.crm_hash) ?? [];
    let last_activity_at: string | null = null;
    for (const act of acts) {
      const t = act.done_at ?? act.start_at ?? act.created_at_crm ?? null;
      if (t && (!last_activity_at || t > last_activity_at)) {
        last_activity_at = t;
      }
    }
    const no_activity_data = !last_activity_at && acts.length === 0;
    const refDate =
      last_activity_at ?? opp.created_date ?? today.toISOString().split('T')[0]!;
    const ref = new Date(refDate);
    ref.setHours(0, 0, 0, 0);
    const days_without_activity = Math.floor(
      (today.getTime() - ref.getTime()) / (24 * 60 * 60 * 1000)
    );
    const age_days = opp.created_date
      ? Math.floor(
          (today.getTime() - new Date(opp.created_date).getTime()) /
            (24 * 60 * 60 * 1000)
        )
      : 0;
    return {
      id: opp.id,
      crm_hash: opp.crm_hash,
      org_id: opp.org_id,
      stage_name: opp.stage_name,
      status: opp.status,
      value: opp.value,
      created_date: opp.created_date,
      company_name: opp.company_name,
      title: opp.title,
      owner_name: opp.owner_name,
      owner_email: opp.owner_email ?? null,
      last_activity_at:
        last_activity_at ?? (no_activity_data ? null : opp.created_date),
      days_without_activity,
      age_days,
      no_activity_data,
    };
  });

  const snapshot = computeSnapshot(enriched, thresholds);
  const frictions = computeFrictions(enriched, thresholds);
  const pillar_scores = computePillarScores(enriched, thresholds);
  const impact_json = computeImpactPlaceholder();

  const latestOppUpload = await admin
    .from('uploads')
    .select('id')
    .eq('org_id', orgId)
    .eq('kind', 'opportunities')
    .eq('status', 'done')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  await admin.from('reports').insert({
    org_id: orgId,
    upload_id: uploadId ?? latestOppUpload.data?.id ?? null,
    snapshot_json: snapshot as unknown as Record<string, unknown>,
    frictions_json: frictions as unknown as Record<string, unknown>[],
    pillar_scores_json: pillar_scores as unknown as Record<string, unknown>,
    impact_json: impact_json as unknown as Record<string, unknown>,
  });

  await touchMetricsStatus(admin, orgId);

  const { data: allOpps } = await admin
    .from('opportunities')
    .select('status, value, company_name')
    .eq('org_id', orgId)
    .in('status', ['open', 'won', 'lost']);
  const { data: config } = await admin
    .from('org_config')
    .select('cac_manual, marketing_spend_monthly')
    .eq('org_id', orgId)
    .maybeSingle();
  type OppRow = { value: number | null; company_name: string | null };
  const all = (allOpps ?? []) as Array<{ status: string; value: number | null; company_name: string | null }>;
  const won = all.filter((o) => o.status === 'won') as OppRow[];
  const lost = all.filter((o) => o.status === 'lost') as OppRow[];
  const open = all.filter((o) => o.status === 'open') as { value: number | null }[];
  const ue = computeUnitEconomics({
    won,
    lost,
    open,
    cacManual: config?.cac_manual,
    marketingSpendMonthly: config?.marketing_spend_monthly,
  });
  await admin.from('org_unit_economics').upsert(
    {
      org_id: orgId,
      ...ue,
      computed_at: new Date().toISOString(),
    },
    { onConflict: 'org_id' }
  );
}
