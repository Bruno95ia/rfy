/**
 * Funções de cálculo para Revenue Engine
 * Usa APENAS dados do snapshot/frictions existentes – sem alterar backend
 */

export type DealRow = {
  company_name?: string | null;
  title?: string | null;
  value?: number | null;
  days_without_activity?: number;
  age_days?: number;
  risk_score?: number;
  owner_email?: string | null;
  owner_name?: string | null;
  created_date?: string | null;
  stage_name?: string | null;
};

function getProbabilityByDays(days: number): number {
  if (days <= 6) return 0.8;
  if (days <= 13) return 0.6;
  if (days <= 20) return 0.4;
  return 0.2;
}

/** Merge e deduplica deals por crm_hash */
export function mergeDealsByHash(
  proposta: DealRow[],
  abandoned: DealRow[],
  frictionEvidence: DealRow[]
): DealRow[] {
  const seen = new Set<string>();
  const out: DealRow[] = [];
  const hash = (d: DealRow) =>
    (d as { crm_hash?: string }).crm_hash ?? `${d.company_name}-${d.title}-${d.value}`;
  for (const d of [...proposta, ...abandoned, ...frictionEvidence]) {
    const h = hash(d);
    if (seen.has(h)) continue;
    seen.add(h);
    out.push(d);
  }
  return out;
}

/** Pipeline ajustado por probabilidade heurística */
export function computePipelineAjustado(
  pipelineBruto: number,
  riskyDeals: DealRow[],
  defaultProbForUnknown = 0.9
): number {
  const totalRiskyValue = riskyDeals.reduce((s, d) => s + (d.value ?? 0), 0);
  const adjustedRisky = riskyDeals.reduce((s, d) => {
    const days = d.days_without_activity ?? d.age_days ?? 0;
    const prob = getProbabilityByDays(days);
    return s + (d.value ?? 0) * prob;
  }, 0);
  const restValue = Math.max(0, pipelineBruto - totalRiskyValue);
  return restValue * defaultProbForUnknown + adjustedRisky;
}

/** Receita antecipável = valor de deals com atraso (>7 dias) * 30% */
export function computeReceitaAntecipavel(
  deals: DealRow[],
  diasIdealProposta = 7,
  fatorAntecipacao = 0.3
): number {
  return deals
    .filter((d) => (d.days_without_activity ?? d.age_days ?? 0) >= diasIdealProposta)
    .reduce((s, d) => s + (d.value ?? 0) * fatorAntecipacao, 0);
}

/** Impact Score = valor * dias_sem_atividade */
export function computeImpactScore(d: DealRow): number {
  const days = d.days_without_activity ?? d.age_days ?? 0;
  return (d.value ?? 0) * days;
}

/** Top deals por Impact Score */
export function topDealsByImpactScore(deals: DealRow[], limit = 5): DealRow[] {
  return [...deals]
    .sort((a, b) => computeImpactScore(b) - computeImpactScore(a))
    .slice(0, limit);
}

/** Valor em risco por etapa (proposta conhecida; outros agregados) */
export function valueAtRiskByStage(
  propostaRisco: DealRow[],
  abandoned: DealRow[],
  propostaStageLabel = 'Proposta'
): Record<string, number> {
  const byStage: Record<string, number> = {};
  for (const d of propostaRisco) {
    byStage[propostaStageLabel] = (byStage[propostaStageLabel] ?? 0) + (d.value ?? 0);
  }
  const propostaHashes = new Set(
    propostaRisco.map((d) => (d as { crm_hash?: string }).crm_hash).filter(Boolean)
  );
  for (const d of abandoned) {
    const h = (d as { crm_hash?: string }).crm_hash;
    if (h && propostaHashes.has(h)) continue; // já contado em proposta
    const stage = (d as { stage_name?: string }).stage_name ?? 'Outros';
    byStage[stage] = (byStage[stage] ?? 0) + (d.value ?? 0);
  }
  return byStage;
}

/** Valor em risco por vendedor */
export function valueAtRiskByOwner(
  deals: DealRow[]
): Record<string, { value: number; count: number; impactScore: number }> {
  const byOwner: Record<string, { value: number; count: number; impactScore: number }> = {};
  for (const d of deals) {
    const owner = (d.owner_name ?? d.owner_email ?? 'Sem dono').toString().trim();
    if (!byOwner[owner]) byOwner[owner] = { value: 0, count: 0, impactScore: 0 };
    byOwner[owner].value += d.value ?? 0;
    byOwner[owner].count += 1;
    byOwner[owner].impactScore += computeImpactScore(d);
  }
  return byOwner;
}

/** Distribuição por faixa de estagnação */
export function distributionByStagnation(deals: DealRow[]): Array<{ name: string; count: number; value: number }> {
  const buckets = [
    { name: '0-6 dias', min: 0, max: 6 },
    { name: '7-13 dias', min: 7, max: 13 },
    { name: '14-20 dias', min: 14, max: 20 },
    { name: '21+ dias', min: 21, max: 999 },
  ];
  return buckets.map((b) => {
    const filtered = deals.filter((d) => {
      const days = d.days_without_activity ?? d.age_days ?? 0;
      return days >= b.min && days <= b.max;
    });
    return {
      name: b.name,
      count: filtered.length,
      value: filtered.reduce((s, d) => s + (d.value ?? 0), 0),
    };
  });
}

/** Top 10 deals % do total */
export function topDealsConcentration(deals: DealRow[], total: number): number {
  const sorted = [...deals].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const top10Value = sorted.slice(0, 10).reduce((s, d) => s + (d.value ?? 0), 0);
  return total > 0 ? (top10Value / total) * 100 : 0;
}
