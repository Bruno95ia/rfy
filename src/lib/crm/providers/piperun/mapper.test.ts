/**
 * Testes unitários para mapeamento API PipeRun → formato normalizado RFY.
 */
import { describe, it, expect } from 'vitest';
import { mapDealToOpportunity, mapActivityToActivity } from './mapper';
import type { PipeRunDealRaw, PipeRunActivityRaw } from './types';

describe('mapDealToOpportunity', () => {
  it('retorna null sem hash nem id', () => {
    expect(mapDealToOpportunity({})).toBeNull();
    expect(mapDealToOpportunity({ stage_name: 'Proposta' })).toBeNull();
  });

  it('usa hash como crm_hash', () => {
    const r = mapDealToOpportunity({ hash: 'abc', value: 1000 });
    expect(r).not.toBeNull();
    expect(r!.crm_hash).toBe('abc');
    expect(r!.value).toBe(1000);
  });

  it('usa id como crm_hash quando hash ausente', () => {
    const r = mapDealToOpportunity({ id: 'deal-1', valor: 2000 });
    expect(r).not.toBeNull();
    expect(r!.crm_hash).toBe('deal-1');
    expect(r!.value).toBe(2000);
  });

  it('mapeia status ganha/perdida/aberta', () => {
    expect(mapDealToOpportunity({ hash: 'a', status: 'ganha' })!.status).toBe('won');
    expect(mapDealToOpportunity({ hash: 'b', status: 'perdida' })!.status).toBe('lost');
    expect(mapDealToOpportunity({ hash: 'c', status: 'aberta' })!.status).toBe('open');
  });

  it('mapeia pipeline e etapa (etapa/funil alternativos)', () => {
    const r = mapDealToOpportunity({
      hash: 'h',
      stage_name: 'Proposta',
      pipeline_name: 'Vendas',
    });
    expect(r!.stage_name).toBe('Proposta');
    expect(r!.pipeline_name).toBe('Vendas');
    const r2 = mapDealToOpportunity({
      hash: 'h2',
      etapa: 'Negociação',
      funil: 'Enterprise',
    });
    expect(r2!.stage_name).toBe('Negociação');
    expect(r2!.pipeline_name).toBe('Enterprise');
  });

  it('normaliza value inválido para null', () => {
    const r = mapDealToOpportunity({ hash: 'h', value: -10 });
    expect(r!.value).toBeNull();
  });
});

describe('mapActivityToActivity', () => {
  it('retorna null sem id e sem title', () => {
    expect(mapActivityToActivity({})).toBeNull();
  });

  it('aceita apenas id', () => {
    const r = mapActivityToActivity({ id: 'act1' } as PipeRunActivityRaw);
    expect(r).not.toBeNull();
    expect(r!.crm_activity_id).toBe('act1');
  });

  it('mapeia linked_opportunity_hash e opportunity_id', () => {
    const r = mapActivityToActivity({
      id: 'a',
      linked_opportunity_hash: 'opp-hash',
      opportunity_id: '123',
    } as PipeRunActivityRaw);
    expect(r!.linked_opportunity_hash).toBe('opp-hash');
  });
});
