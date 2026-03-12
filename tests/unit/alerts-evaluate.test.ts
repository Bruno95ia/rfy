import { describe, it, expect } from 'vitest';
import {
  evaluateRule,
  type MetricsContext,
  type AlertRuleRow,
} from '@/lib/alerts/evaluate';

function makeMetrics(partial: Partial<MetricsContext> = {}): MetricsContext {
  return {
    rfy_index_pct: 70,
    receita_confiavel_30d: 700_000,
    receita_inflada: 300_000,
    pipeline_declarado: 1_000_000,
    max_days_without_activity: 10,
    generated_at: '2024-01-01T00:00:00Z',
    ...partial,
  };
}

function makeRule(partial: Partial<AlertRuleRow> = {}): AlertRuleRow {
  return {
    id: 'rule-1',
    org_id: 'org-1',
    rule_key: 'rfy_index_below',
    severity: 'high',
    threshold: 80,
    enabled: true,
    cooldown_minutes: 60,
    channel_ids: [],
    ...partial,
  };
}

describe('evaluateRule', () => {
  it('não dispara quando RFY Index ausente', () => {
    const rule = makeRule({ rule_key: 'rfy_index_below', threshold: 80 });
    const metrics = makeMetrics({ rfy_index_pct: null });
    const result = evaluateRule(rule, metrics);
    expect(result.triggered).toBe(false);
    expect(result.payload).toEqual({});
  });

  it('dispara quando RFY Index abaixo do limiar', () => {
    const rule = makeRule({ rule_key: 'rfy_index_below', threshold: 80 });
    const metrics = makeMetrics({ rfy_index_pct: 75 });
    const result = evaluateRule(rule, metrics);
    expect(result.triggered).toBe(true);
    expect(result.payload.rfy_index_pct).toBe(75);
    expect(result.payload.threshold).toBe(80);
    expect(String(result.payload.message)).toContain('RFY Index');
  });

  it('dispara quando RFY Index abaixo do limiar usando chave nova', () => {
    const rule = makeRule({ rule_key: 'rfy_abaixo_do_limiar', threshold: 80 });
    const metrics = makeMetrics({ rfy_index_pct: 72 });
    const result = evaluateRule(rule, metrics);
    expect(result.triggered).toBe(true);
    expect(result.tipo).toBe('rfy_abaixo_do_limiar');
  });

  it('dispara quando receita inflada acima do limiar', () => {
    const rule = makeRule({ rule_key: 'receita_inflada_above', threshold: 200_000 });
    const metrics = makeMetrics({ receita_inflada: 250_000 });
    const result = evaluateRule(rule, metrics);
    expect(result.triggered).toBe(true);
    expect(result.payload.receita_inflada).toBe(250_000);
    expect(result.payload.threshold).toBe(200_000);
  });

  it('dispara quando receita inflada acima do limiar usando chave nova', () => {
    const rule = makeRule({ rule_key: 'receita_inflada_acima_do_limiar', threshold: 200_000 });
    const metrics = makeMetrics({ receita_inflada: 250_000 });
    const result = evaluateRule(rule, metrics);
    expect(result.triggered).toBe(true);
    expect(result.tipo).toBe('receita_inflada_acima_do_limiar');
  });

  it('dispara quando estagnação de pipeline atinge limiar', () => {
    const rule = makeRule({ rule_key: 'pipeline_stagnation', threshold: 14 });
    const metrics = makeMetrics({ max_days_without_activity: 20 });
    const result = evaluateRule(rule, metrics);
    expect(result.triggered).toBe(true);
    expect(result.payload.max_days_without_activity).toBe(20);
    expect(result.payload.threshold).toBe(14);
  });

  it('não dispara para chave de regra desconhecida', () => {
    const rule = makeRule({ rule_key: 'desconhecida' });
    const metrics = makeMetrics();
    const result = evaluateRule(rule, metrics);
    expect(result.triggered).toBe(false);
    expect(result.payload).toEqual({});
  });
});

