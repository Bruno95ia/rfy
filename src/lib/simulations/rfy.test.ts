import { describe, it, expect } from 'vitest';
import { computeRfySimulation } from './rfy';

describe('computeRfySimulation', () => {
  const baseline = {
    pipeline_declarado: 1_000_000,
    receita_confiavel_30d: 700_000,
    receita_inflada: 300_000,
    rfy_index_pct: 70,
  };

  it('retorna baseline quando sem parâmetros', () => {
    const result = computeRfySimulation(baseline, {});
    expect(result.simulated.receita_confiavel_30d).toBe(700_000);
    expect(result.simulated.receita_inflada).toBe(300_000);
    expect(result.simulated.rfy_index_pct).toBe(70);
    expect(result.breakdown.combined_factor).toBe(1);
  });

  it('aumenta receita confiável com improve_supho_by', () => {
    const result = computeRfySimulation(baseline, { improve_supho_by: 20 });
    expect(result.breakdown.supho_factor).toBeGreaterThan(1);
    expect(result.simulated.receita_confiavel_30d).toBeGreaterThan(700_000);
    expect(result.simulated.rfy_index_pct).toBeGreaterThan(70);
  });

  it('aumenta com reduce_stage_time_by_pct', () => {
    const result = computeRfySimulation(baseline, { reduce_stage_time_by_pct: 10 });
    expect(result.breakdown.stage_time_factor).toBe(1.1);
    expect(result.simulated.receita_confiavel_30d).toBe(700_000 * 1.1);
  });

  it('aumenta com increase_stage_conversion_by_pct', () => {
    const result = computeRfySimulation(baseline, { increase_stage_conversion_by_pct: 5 });
    expect(result.breakdown.conversion_factor).toBe(1.05);
    expect(result.simulated.receita_confiavel_30d).toBe(700_000 * 1.05);
  });

  it('não excede pipeline declarado', () => {
    const result = computeRfySimulation(baseline, {
      improve_supho_by: 100,
      reduce_stage_time_by_pct: 50,
      increase_stage_conversion_by_pct: 50,
    });
    expect(result.simulated.receita_confiavel_30d).toBeLessThanOrEqual(1_000_000);
  });
});
