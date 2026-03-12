import { describe, it, expect } from 'vitest';
import {
  computeSnapshot,
  computeFrictions,
  computePillarScores,
  type OpportunityWithActivity,
} from '@/lib/metrics/compute';

function makeOpportunity(
  partial: Partial<OpportunityWithActivity> = {}
): OpportunityWithActivity {
  return {
    id: 'opp-1',
    crm_hash: 'hash-1',
    org_id: 'org-1',
    stage_name: 'Proposta',
    status: 'open',
    value: 100_000,
    created_date: '2024-01-01',
    company_name: 'Empresa X',
    title: 'Oportunidade X',
    owner_name: 'Vendedor',
    owner_email: 'vendedor@example.com',
    last_activity_at: '2024-01-10',
    days_without_activity: 5,
    age_days: 10,
    no_activity_data: false,
    ...partial,
  };
}

describe('computeSnapshot', () => {
  it('agrega pipeline aberto e tickets médios corretamente', () => {
    const opps: OpportunityWithActivity[] = [
      makeOpportunity({ id: '1', crm_hash: 'h1', value: 100_000 }),
      makeOpportunity({ id: '2', crm_hash: 'h2', value: 50_000 }),
      // fechado não entra no snapshot
      makeOpportunity({ id: '3', crm_hash: 'h3', value: 200_000, status: 'won' }),
    ];

    const snapshot = computeSnapshot(opps, {
      dias_proposta_risco: 7,
      dias_pipeline_abandonado: 14,
      dias_aging_inflado: 60,
      dias_aprovacao_travada: 5,
      top_deals_por_friccao: 10,
      top_evidencias_por_friccao: 10,
    });

    expect(snapshot.total_open).toBe(2);
    expect(snapshot.pipeline_value_open).toBe(150_000);
    expect(snapshot.avg_ticket_open).toBe(75_000);
    expect(snapshot.open_by_stage['Proposta']).toBe(2);
    expect(snapshot.open_by_owner['Vendedor'].count).toBe(2);
  });

  it('identifica top deals de proposta em risco e pipeline abandonado', () => {
    const opps: OpportunityWithActivity[] = [
      makeOpportunity({
        crm_hash: 'risk-1',
        stage_name: 'Proposta',
        days_without_activity: 10,
        value: 10_000,
      }),
      makeOpportunity({
        crm_hash: 'risk-2',
        stage_name: 'Proposta',
        days_without_activity: 8,
        value: 20_000,
      }),
      makeOpportunity({
        crm_hash: 'abandoned-1',
        stage_name: 'Qualificação',
        days_without_activity: 20,
      }),
    ];

    const snapshot = computeSnapshot(opps, {
      dias_proposta_risco: 7,
      dias_pipeline_abandonado: 14,
      dias_aging_inflado: 60,
      dias_aprovacao_travada: 5,
      top_deals_por_friccao: 10,
      top_evidencias_por_friccao: 10,
    });

    expect(snapshot.topDealsPropostaRisco).toHaveLength(2);
    expect(snapshot.topDealsAbandoned).toHaveLength(1);
    expect(snapshot.topDealsAbandoned[0]?.crm_hash).toBe('abandoned-1');
  });
});

describe('computeFrictions', () => {
  it('gera fricção de proposta de alto risco e pipeline abandonado', () => {
    const opps: OpportunityWithActivity[] = [
      makeOpportunity({
        crm_hash: 'risk-1',
        stage_name: 'Proposta',
        days_without_activity: 10,
      }),
      makeOpportunity({
        crm_hash: 'abandoned-1',
        stage_name: 'Negociação',
        days_without_activity: 20,
      }),
    ];

    const frictions = computeFrictions(opps, {
      dias_proposta_risco: 7,
      dias_pipeline_abandonado: 14,
      dias_aging_inflado: 60,
      dias_aprovacao_travada: 5,
      top_deals_por_friccao: 10,
      top_evidencias_por_friccao: 10,
    });

    const ids = frictions.map((f) => f.id);
    expect(ids).toContain('proposta-alto-risco');
    expect(ids).toContain('pipeline-abandonado');
  });

  it('gera fricção de aging inflado e concentração por vendedor', () => {
    const opps: OpportunityWithActivity[] = [
      makeOpportunity({
        crm_hash: 'aging-1',
        age_days: 90,
        days_without_activity: 1,
      }),
      makeOpportunity({
        crm_hash: 'aging-2',
        age_days: 100,
        days_without_activity: 2,
      }),
    ];

    const frictions = computeFrictions(opps);
    const ids = frictions.map((f) => f.id);
    expect(ids).toContain('aging-inflado');
    expect(ids).toContain('concentracao-vendedor');
  });
});

describe('computePillarScores', () => {
  it('retorna 100/100 quando não há oportunidades abertas', () => {
    const scores = computePillarScores([]);
    expect(scores.pipeline_hygiene.score).toBe(100);
    expect(scores.post_proposal_stagnation.score).toBe(100);
  });

  it('reduz score com altas taxas de estagnação e aging', () => {
    const opps: OpportunityWithActivity[] = [
      makeOpportunity({
        crm_hash: '1',
        stage_name: 'Proposta',
        days_without_activity: 30,
        age_days: 90,
      }),
      makeOpportunity({
        crm_hash: '2',
        stage_name: 'Proposta',
        days_without_activity: 30,
        age_days: 90,
      }),
    ];

    const scores = computePillarScores(opps);
    expect(scores.pipeline_hygiene.score).toBeLessThan(100);
    expect(scores.post_proposal_stagnation.score).toBeLessThan(100);
  });
}
);

