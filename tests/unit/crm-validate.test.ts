import { describe, it, expect } from 'vitest';
import {
  normalizeValue,
  normalizeStatus,
  validateOpportunities,
  validateActivities,
  validateWebhookPayload,
} from '@/lib/crm/validate';

describe('normalizeValue', () => {
  it('aceita valores numéricos válidos', () => {
    expect(normalizeValue(1000)).toBe(1000);
    expect(normalizeValue('2000')).toBe(2000);
  });

  it('retorna null para valores negativos, não finitos ou muito altos', () => {
    expect(normalizeValue(-1)).toBeNull();
    expect(normalizeValue(Number.POSITIVE_INFINITY)).toBeNull();
    expect(normalizeValue(1e15)).toBeNull();
  });
});

describe('normalizeStatus', () => {
  it('mapeia variantes em pt-BR para open/won/lost', () => {
    expect(normalizeStatus('ganha').status).toBe('won');
    expect(normalizeStatus('perdida').status).toBe('lost');
    expect(normalizeStatus('aberta').status).toBe('open');
  });

  it('retorna open como padrão quando vazio ou desconhecido', () => {
    expect(normalizeStatus('').status).toBe('open');
    const res = normalizeStatus('em andamento');
    expect(res.status).toBe('open');
    expect(res.unknownValue).toBe('em andamento');
  });
});

describe('validateOpportunities', () => {
  it('retorna erro quando crm_hash está ausente', () => {
    const result = validateOpportunities([{ value: 1000 }]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('crm_hash obrigatório'))).toBe(true);
  });

  it('propaga warnings de status desconhecido e value inválido', () => {
    const result = validateOpportunities([
      { crm_hash: '1', status: 'em andamento', value: -10 },
    ]);
    expect(result.valid).toBe(true);
    expect(
      result.warnings.some((w) => w.includes('status desconhecido'))
    ).toBe(true);
    expect(result.warnings.some((w) => w.includes('value inválido'))).toBe(true);
  });
});

describe('validateActivities', () => {
  it('gera warning quando atividade não tem vínculo com oportunidade', () => {
    const result = validateActivities([
      { title: 'Ligação', type: 'call' },
    ]);
    expect(result.valid).toBe(true);
    expect(
      result.warnings.some((w) =>
        w.includes('atividade sem linked_opportunity_hash nem opportunity_id_crm')
      )
    ).toBe(true);
  });
});

describe('validateWebhookPayload', () => {
  it('retorna erro quando org_id é inválido', () => {
    const result = validateWebhookPayload({
      org_id: undefined,
      opportunities: [],
      activities: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('org_id obrigatório');
  });

  it('combina warnings de oportunidades e atividades', () => {
    const result = validateWebhookPayload({
      org_id: 'org-1',
      opportunities: [{ crm_hash: '1', status: 'desconhecido' }],
      activities: [{ title: 'Ligação' }],
    });
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

