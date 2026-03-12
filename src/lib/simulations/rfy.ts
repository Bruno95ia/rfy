/**
 * Simulação "E se…" do RFY Index (v1).
 * Modelo MVP: heurísticas sobre baseline (snapshot + forecast).
 * SUPHO entra como multiplicador estrutural na confiabilidade.
 * Não persiste nada; apenas calcula cenário alternativo.
 */

export type RfySimulationParams = {
  /** Melhoria SUPHO em pontos (0–100). Aplica ganho coerente por pilar na confiabilidade. */
  improve_supho_by?: number;
  /** Redução percentual no tempo médio por etapa (ex.: 10 = 10% mais rápido). */
  reduce_stage_time_by_pct?: number;
  /** Aumento percentual na conversão entre etapas (ex.: 5 = 5% mais conversão). */
  increase_stage_conversion_by_pct?: number;
};

export type RfySimulationBaseline = {
  pipeline_declarado: number;
  receita_confiavel_30d: number;
  receita_inflada: number;
  rfy_index_pct: number | null;
};

export type RfySimulationResult = {
  baseline: RfySimulationBaseline;
  simulated: {
    receita_confiavel_30d: number;
    receita_inflada: number;
    rfy_index_pct: number;
  };
  breakdown: {
    supho_factor: number;
    stage_time_factor: number;
    conversion_factor: number;
    combined_factor: number;
  };
};

/**
 * Aplica fatores de simulação ao baseline.
 *
 * Heurísticas (documentadas):
 * - improve_supho_by: cada 10 pontos de SUPHO ≈ +5% na confiabilidade (cap 1.25).
 * - reduce_stage_time_by_pct: ciclo mais rápido → mais receita no mesmo horizonte; fator = 1 + pct/100.
 * - increase_stage_conversion_by_pct: mais conversão → mais valor que “chega”; fator = 1 + pct/100.
 */
export function computeRfySimulation(
  baseline: RfySimulationBaseline,
  params: RfySimulationParams
): RfySimulationResult {
  const suphoPoints = Math.max(0, Math.min(100, params.improve_supho_by ?? 0));
  const timePct = params.reduce_stage_time_by_pct ?? 0;
  const conversionPct = params.increase_stage_conversion_by_pct ?? 0;

  // SUPHO: multiplicador estrutural. +10 pts ≈ +5% confiabilidade (máx 1.25).
  const supho_factor = Math.min(1.25, 1 + (suphoPoints / 100) * 0.5);

  // Tempo de etapa: 10% mais rápido → 10% mais receita no mesmo janela (linear simplificado).
  const stage_time_factor = 1 + timePct / 100;

  // Conversão: X% mais conversão → X% mais valor que avança (linear simplificado).
  const conversion_factor = 1 + conversionPct / 100;

  const combined_factor = supho_factor * stage_time_factor * conversion_factor;

  const baselineConf = baseline.receita_confiavel_30d;
  const pipeline = baseline.pipeline_declarado;
  const simulatedConf = Math.min(pipeline, baselineConf * combined_factor);
  const simulatedInflada = Math.max(0, pipeline - simulatedConf);
  const rfy_index_pct = pipeline > 0 ? (simulatedConf / pipeline) * 100 : 0;

  return {
    baseline: { ...baseline },
    simulated: {
      receita_confiavel_30d: simulatedConf,
      receita_inflada: simulatedInflada,
      rfy_index_pct,
    },
    breakdown: {
      supho_factor,
      stage_time_factor,
      conversion_factor,
      combined_factor,
    },
  };
}
