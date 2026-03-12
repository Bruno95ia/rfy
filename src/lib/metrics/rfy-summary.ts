export const RFY_FALLBACK_CONFIAVEL_FACTOR = 0.7 as const;

export type RfySummaryInput = {
  /** Valor total de oportunidades abertas no snapshot (pipeline_value_open) */
  pipelineValueOpen: number;
  /** Forecast ajustado de receita confiável em 30 dias, vindo do serviço de AI */
  forecastAdjusted?: number | null;
  /** Pipeline bruto considerado pelo modelo de AI, quando disponível */
  pipelineBruto?: number | null;
};

export type RfySummary = {
  /** RFY Index em percentual (0–100) ou null quando não há forecast confiável */
  rfyIndexPct: number | null;
  /** Receita Confiável (30 dias) em R$ */
  receitaConfiavel30d: number;
  /** Receita Inflada (30 dias) em R$ */
  receitaInflada: number;
  /** Receita Declarada (30 dias) em R$ */
  pipelineDeclarado: number;
  /** Origem do cálculo: 'ai' = forecast do modelo; 'fallback' = estimativa heurística (70% pipeline) */
  source: 'ai' | 'fallback';
};

function toNumberOrNull(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function computeRfySummary(input: RfySummaryInput): RfySummary {
  const pipelineValueOpen = Math.max(0, toNumberOrNull(input.pipelineValueOpen) ?? 0);
  const forecastAdjusted = toNumberOrNull(input.forecastAdjusted ?? null);
  const pipelineBruto = toNumberOrNull(input.pipelineBruto ?? null);

  const pipelineDeclarado = Math.max(0, pipelineBruto ?? pipelineValueOpen);

  const hasForecast = forecastAdjusted != null && forecastAdjusted >= 0;
  const receitaConfiavel30d = hasForecast
    ? forecastAdjusted!
    : pipelineDeclarado * RFY_FALLBACK_CONFIAVEL_FACTOR;

  const receitaInflada = Math.max(0, pipelineDeclarado - receitaConfiavel30d);

  const rfyIndexPct =
    pipelineDeclarado > 0 && hasForecast
      ? (forecastAdjusted! / pipelineDeclarado) * 100
      : null;

  const source: 'ai' | 'fallback' = hasForecast ? 'ai' : 'fallback';

  return {
    rfyIndexPct,
    receitaConfiavel30d,
    receitaInflada,
    pipelineDeclarado,
    source,
  };
}

