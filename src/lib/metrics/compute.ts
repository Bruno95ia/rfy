/**
 * Cálculo de métricas, frictions e pillar scores
 */

/** Limiares configuráveis por organização (org_config) */
export type OrgConfigThresholds = {
  dias_proposta_risco: number;
  dias_pipeline_abandonado: number;
  dias_aging_inflado: number;
  dias_aprovacao_travada: number;
  top_deals_por_friccao: number;
  top_evidencias_por_friccao: number;
};

const DEFAULT_THRESHOLDS: OrgConfigThresholds = {
  dias_proposta_risco: 7,
  dias_pipeline_abandonado: 14,
  dias_aging_inflado: 60,
  dias_aprovacao_travada: 5,
  top_deals_por_friccao: 20,
  top_evidencias_por_friccao: 10,
};

export type OpportunityWithActivity = {
  id: string;
  crm_hash: string;
  org_id: string;
  stage_name: string | null;
  status: string | null;
  value: number | null;
  created_date: string | null;
  company_name: string | null;
  title: string | null;
  owner_name: string | null;
  owner_email: string | null;
  last_activity_at: string | null;
  days_without_activity: number;
  age_days: number;
  no_activity_data: boolean;
};

export type Snapshot = {
  total_open: number;
  pipeline_value_open: number;
  avg_ticket_open: number;
  /** Máximo de dias sem atividade no pipeline (para regra pipeline_stagnation) */
  max_days_without_activity: number;
  open_by_stage: Record<string, number>;
  open_by_owner: Record<string, { count: number; value: number }>;
  topDealsPropostaRisco: Array<{
    crm_hash: string;
    company_name: string | null;
    title: string | null;
    value: number | null;
    days_without_activity: number;
    risk_score: number;
    owner_email: string | null;
    owner_name: string | null;
    created_date: string | null;
    age_days?: number | null;
  }>;
  topDealsAbandoned: Array<{
    crm_hash: string;
    company_name: string | null;
    title: string | null;
    value: number | null;
    days_without_activity: number;
    owner_email: string | null;
    owner_name: string | null;
    created_date: string | null;
    age_days?: number | null;
  }>;
};

export type Friction = {
  id: string;
  name: string;
  description: string;
  count: number;
  evidence: Array<Record<string, unknown>>;
};

export type PillarScore = {
  score: number;
  components?: Record<string, number>;
};

export type PillarScores = {
  pipeline_hygiene: PillarScore;
  post_proposal_stagnation: PillarScore;
};

export type ImpactJson = {
  revenue_annual: number | null;
  cycle_reduction_pct: number | null;
  revenue_anticipated: number | null;
};

function clamp(n: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, n));
}

export function computeSnapshot(
  opportunities: OpportunityWithActivity[],
  thresholds: Partial<OrgConfigThresholds> = {}
): Snapshot {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const open = opportunities.filter((o) => o.status === 'open');
  const total_open = open.length;
  const pipeline_value_open = open.reduce((s, o) => s + (o.value ?? 0), 0);
  const avg_ticket_open = total_open > 0 ? pipeline_value_open / total_open : 0;

  const open_by_stage: Record<string, number> = {};
  const open_by_owner: Record<string, { count: number; value: number }> = {};
  const max_days_without_activity =
    open.length > 0
      ? Math.max(...open.map((o) => o.days_without_activity ?? 0))
      : 0;

  for (const o of open) {
    const stage = o.stage_name ?? 'Sem etapa';
    open_by_stage[stage] = (open_by_stage[stage] ?? 0) + 1;
    const owner = (o.owner_name || o.owner_email || 'Sem dono').trim();
    if (!open_by_owner[owner]) open_by_owner[owner] = { count: 0, value: 0 };
    open_by_owner[owner].count += 1;
    open_by_owner[owner].value += o.value ?? 0;
  }

  const propostaRisco = open
    .filter(
      (o) =>
        (o.stage_name ?? '').toLowerCase().includes('proposta') &&
        o.days_without_activity >= t.dias_proposta_risco
    )
    .map((o) => ({
      crm_hash: o.crm_hash,
      company_name: o.company_name,
      title: o.title,
      value: o.value,
      days_without_activity: o.days_without_activity,
      risk_score: (o.value ?? 0) * o.days_without_activity,
      owner_email: o.owner_email ?? null,
      owner_name: o.owner_name ?? null,
      created_date: o.created_date ?? null,
      age_days: o.age_days ?? null,
    }))
    .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))
    .slice(0, t.top_deals_por_friccao);

  const abandoned = open
    .filter((o) => o.days_without_activity >= t.dias_pipeline_abandonado)
    .map((o) => ({
      crm_hash: o.crm_hash,
      company_name: o.company_name,
      title: o.title,
      value: o.value,
      days_without_activity: o.days_without_activity,
      owner_email: o.owner_email ?? null,
      owner_name: o.owner_name ?? null,
      created_date: o.created_date ?? null,
      age_days: o.age_days ?? null,
    }))
    .sort((a, b) => (b.days_without_activity ?? 0) - (a.days_without_activity ?? 0))
    .slice(0, t.top_deals_por_friccao);

  return {
    total_open,
    pipeline_value_open,
    avg_ticket_open,
    max_days_without_activity,
    open_by_stage,
    open_by_owner,
    topDealsPropostaRisco: propostaRisco,
    topDealsAbandoned: abandoned,
  };
}

export function computeFrictions(
  opportunities: OpportunityWithActivity[],
  thresholds: Partial<OrgConfigThresholds> = {}
): Friction[] {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const open = opportunities.filter((o) => o.status === 'open');
  const frictions: Friction[] = [];

  const propostaRisco = open.filter(
    (o) =>
      (o.stage_name ?? '').toLowerCase().includes('proposta') &&
      o.days_without_activity >= t.dias_proposta_risco
  );
  if (propostaRisco.length > 0) {
    frictions.push({
      id: 'proposta-alto-risco',
      name: 'Proposta alto risco',
      description: `Em Proposta, open, days_without_activity >= ${t.dias_proposta_risco}`,
      count: propostaRisco.length,
      evidence: propostaRisco.slice(0, t.top_evidencias_por_friccao).map((o) => ({
        crm_hash: o.crm_hash,
        company_name: o.company_name,
        title: o.title,
        value: o.value,
        days_without_activity: o.days_without_activity,
        owner_email: o.owner_email ?? null,
        owner_name: o.owner_name ?? null,
        created_date: o.created_date ?? null,
      })),
    });
  }

  const abandoned = open.filter((o) => o.days_without_activity >= t.dias_pipeline_abandonado);
  if (abandoned.length > 0) {
    frictions.push({
      id: 'pipeline-abandonado',
      name: 'Pipeline abandonado',
      description: `Open, days_without_activity >= ${t.dias_pipeline_abandonado}`,
      count: abandoned.length,
      evidence: abandoned.slice(0, t.top_evidencias_por_friccao).map((o) => ({
        crm_hash: o.crm_hash,
        company_name: o.company_name,
        title: o.title,
        value: o.value,
        days_without_activity: o.days_without_activity,
        owner_email: o.owner_email ?? null,
        owner_name: o.owner_name ?? null,
        created_date: o.created_date ?? null,
      })),
    });
  }

  const agingInflado = open.filter((o) => o.age_days >= t.dias_aging_inflado);
  if (agingInflado.length > 0) {
    frictions.push({
      id: 'aging-inflado',
      name: 'Aging inflado',
      description: `Open, age_days >= ${t.dias_aging_inflado}`,
      count: agingInflado.length,
      evidence: agingInflado.slice(0, t.top_evidencias_por_friccao).map((o) => ({
        crm_hash: o.crm_hash,
        company_name: o.company_name,
        age_days: o.age_days,
        value: o.value,
        created_date: o.created_date ?? null,
      })),
    });
  }

  const byOwner = open.reduce(
    (acc, o) => {
      const k = o.owner_name ?? 'Sem dono';
      acc[k] = (acc[k] ?? 0) + (o.value ?? 0) * o.days_without_activity;
      return acc;
    },
    {} as Record<string, number>
  );
  const concentracaoVendedor = Object.entries(byOwner)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  if (concentracaoVendedor.length > 0) {
    frictions.push({
      id: 'concentracao-vendedor',
      name: 'Concentração por vendedor',
      description: 'Ranking por soma(value*days_without_activity)',
      count: concentracaoVendedor.length,
      evidence: concentracaoVendedor.map(([owner, score]) => ({ owner, score })),
    });
  }

  const aprovacaoTravada = open.filter(
    (o) =>
      (o.stage_name ?? '').toLowerCase().includes('aprovação') &&
      o.days_without_activity >= t.dias_aprovacao_travada
  );
  if (aprovacaoTravada.length > 0) {
    frictions.push({
      id: 'aprovacao-travada',
      name: 'Aprovação travada',
      description: `stage='Aprovação (aceite)', open, days_without_activity>=${t.dias_aprovacao_travada}`,
      count: aprovacaoTravada.length,
      evidence: aprovacaoTravada.slice(0, t.top_evidencias_por_friccao).map((o) => ({
        crm_hash: o.crm_hash,
        company_name: o.company_name,
        days_without_activity: o.days_without_activity,
        created_date: o.created_date ?? null,
      })),
    });
  }

  return frictions.slice(0, 5);
}

export function computePillarScores(
  opportunities: OpportunityWithActivity[],
  thresholds: Partial<OrgConfigThresholds> = {}
): PillarScores {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const open = opportunities.filter((o) => o.status === 'open');
  const total = open.length;

  if (total === 0) {
    return {
      pipeline_hygiene: { score: 100 },
      post_proposal_stagnation: { score: 100 },
    };
  }

  const dias14 = t.dias_pipeline_abandonado;
  const dias21 = Math.max(dias14 + 7, 21);
  const p_abandoned_14 = open.filter((o) => o.days_without_activity >= dias14).length / total;
  const p_abandoned_21 = open.filter((o) => o.days_without_activity >= dias21).length / total;
  const p_aging_60 = open.filter((o) => o.age_days >= t.dias_aging_inflado).length / total;
  const p_no_activity_data =
    open.filter((o) => o.no_activity_data).length / total;

  const HygieneScore = clamp(
    100 - 40 * p_abandoned_21 - 25 * p_abandoned_14 - 20 * p_aging_60 - 15 * p_no_activity_data,
    0,
    100
  );

  const base_prop = open.filter((o) =>
    (o.stage_name ?? '').toLowerCase().includes('proposta')
  ).length;

  let ProposalScore = 100;
  if (base_prop > 0) {
    const propOpen = open.filter((o) =>
      (o.stage_name ?? '').toLowerCase().includes('proposta')
    );
    const p_prop_7 = propOpen.filter((o) => o.days_without_activity >= t.dias_proposta_risco).length / base_prop;
    const p_prop_11 = propOpen.filter((o) => o.days_without_activity >= t.dias_proposta_risco + 4).length / base_prop;
    ProposalScore = clamp(100 - 60 * p_prop_11 - 40 * p_prop_7, 0, 100);
  }

  return {
    pipeline_hygiene: {
      score: Math.round(HygieneScore * 100) / 100,
      components: {
        p_abandoned_14,
        p_abandoned_21,
        p_aging_60,
        p_no_activity_data,
      },
    },
    post_proposal_stagnation: {
      score: Math.round(ProposalScore * 100) / 100,
    },
  };
}

export function computeImpactPlaceholder(): ImpactJson {
  return {
    revenue_annual: null,
    cycle_reduction_pct: null,
    revenue_anticipated: null,
  };
}
