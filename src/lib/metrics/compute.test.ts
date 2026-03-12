import { describe, it, expect } from 'vitest';
import {
  computeSnapshot,
  computeFrictions,
  computePillarScores,
  computeImpactPlaceholder,
  type OpportunityWithActivity,
} from './compute';

function makeOpp(overrides: Partial<OpportunityWithActivity> = {}): OpportunityWithActivity {
  return {
    id: '1',
    crm_hash: 'abc',
    org_id: 'org1',
    stage_name: 'Proposta',
    status: 'open',
    value: 10000,
    created_date: '2025-01-01',
    company_name: 'Emp X',
    title: 'Deal 1',
    owner_name: 'João',
    owner_email: 'joao@x.com',
    last_activity_at: null,
    days_without_activity: 10,
    age_days: 30,
    no_activity_data: false,
    ...overrides,
  };
}

describe('computeSnapshot', () => {
  it('retorna zeros para array vazio', () => {
    const snap = computeSnapshot([]);
    expect(snap.total_open).toBe(0);
    expect(snap.pipeline_value_open).toBe(0);
    expect(snap.avg_ticket_open).toBe(0);
  });
  it('agrega oportunidades open', () => {
    const opps = [
      makeOpp({ value: 10000, stage_name: 'Proposta' }),
      makeOpp({ id: '2', crm_hash: 'b', value: 20000, stage_name: 'Negociação' }),
    ];
    const snap = computeSnapshot(opps);
    expect(snap.total_open).toBe(2);
    expect(snap.pipeline_value_open).toBe(30000);
    expect(snap.avg_ticket_open).toBe(15000);
  });
  it('usa thresholds customizados', () => {
    const opp = makeOpp({ stage_name: 'Proposta', days_without_activity: 8 });
    const snapDefault = computeSnapshot([opp]);
    const snapCustom = computeSnapshot([opp], { dias_proposta_risco: 10 });
    expect(snapDefault.topDealsPropostaRisco).toHaveLength(1);
    expect(snapCustom.topDealsPropostaRisco).toHaveLength(0);
  });
});

describe('computeFrictions', () => {
  it('não detecta proposta alto risco com poucos dias', () => {
    const opp = makeOpp({ days_without_activity: 3, stage_name: 'Proposta' });
    const f = computeFrictions([opp]);
    expect(f.some((x) => x.id === 'proposta-alto-risco')).toBe(false);
  });
  it('detecta proposta alto risco', () => {
    const opp = makeOpp({ stage_name: 'Proposta', days_without_activity: 8 });
    const f = computeFrictions([opp]);
    expect(f.some((x) => x.id === 'proposta-alto-risco')).toBe(true);
  });
  it('detecta pipeline abandonado', () => {
    const opp = makeOpp({ stage_name: 'Lead', days_without_activity: 20 });
    const f = computeFrictions([opp]);
    expect(f.some((x) => x.id === 'pipeline-abandonado')).toBe(true);
  });
});

describe('computePillarScores', () => {
  it('retorna 100 para array vazio', () => {
    const scores = computePillarScores([]);
    expect(scores.pipeline_hygiene.score).toBe(100);
    expect(scores.post_proposal_stagnation.score).toBe(100);
  });
  it('calcula scores para oportunidades', () => {
    const opps = [
      makeOpp({ days_without_activity: 5, stage_name: 'Proposta' }),
      makeOpp({ id: '2', crm_hash: 'b', days_without_activity: 20, stage_name: 'Lead' }),
    ];
    const scores = computePillarScores(opps);
    expect(scores.pipeline_hygiene.score).toBeLessThanOrEqual(100);
    expect(scores.post_proposal_stagnation.score).toBeLessThanOrEqual(100);
  });
});

describe('computeImpactPlaceholder', () => {
  it('retorna nulls', () => {
    const impact = computeImpactPlaceholder();
    expect(impact.revenue_annual).toBeNull();
    expect(impact.cycle_reduction_pct).toBeNull();
    expect(impact.revenue_anticipated).toBeNull();
  });
});
