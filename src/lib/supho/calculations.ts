/**
 * Cálculos SUPHO — IC, IH, IP, ITSMO, nível, gaps, subíndices
 * Escala Likert 1–5 → normalização 0–100: (média - 1) / 4 * 100
 */

import { ITSMO_WEIGHTS, ITSMO_LEVEL_BANDS, LIKERT_MIN, LIKERT_RANGE } from './constants';
import type { SuphoBlock, SuphoDiagnosticResult, SuphoNivel, SuphoQuestionAverage } from '@/types/supho';

/** Converte média Likert (1–5) para índice 0–100 */
export function likertTo100(mean: number): number {
  const clamped = Math.max(LIKERT_MIN, Math.min(5, mean));
  return Math.round(((clamped - LIKERT_MIN) / LIKERT_RANGE) * 100 * 100) / 100;
}

/** Média ponderada por peso interno (1/2/3). items: array de { average, internalWeight } */
function weightedMeanByBlock(
  items: Array<{ average: number; internalWeight: number }>
): number {
  if (items.length === 0) return 0;
  let sum = 0;
  let weightSum = 0;
  for (const item of items) {
    const w = item.internalWeight || 1;
    sum += item.average * w;
    weightSum += w;
  }
  return weightSum > 0 ? sum / weightSum : 0;
}

/** Agrupa médias por bloco e calcula índice 0–100 para o bloco */
export function computeBlockIndex(
  questionAverages: SuphoQuestionAverage[],
  block: SuphoBlock
): number {
  const filtered = questionAverages.filter((q) => q.block === block);
  const mean = weightedMeanByBlock(
    filtered.map((q) => ({ average: q.average, internalWeight: q.internalWeight }))
  );
  return likertTo100(mean);
}

/** IC, IH, IP a partir das médias por pergunta */
export function computeIndices(
  questionAverages: SuphoQuestionAverage[]
): { ic: number; ih: number; ip: number } {
  return {
    ic: computeBlockIndex(questionAverages, 'A'),
    ih: computeBlockIndex(questionAverages, 'B'),
    ip: computeBlockIndex(questionAverages, 'C'),
  };
}

/** ITSMO = IC×0,40 + IH×0,35 + IP×0,25 */
export function computeITSMO(ic: number, ih: number, ip: number): number {
  return Math.round(
    (ic * ITSMO_WEIGHTS.cultura +
      ih * ITSMO_WEIGHTS.humano +
      ip * ITSMO_WEIGHTS.performance) *
      100
  ) / 100;
}

/** Define nível 1–5 a partir do ITSMO (0–100) */
export function computeNivel(itsmo: number): SuphoNivel {
  const band = ITSMO_LEVEL_BANDS.find(
    (b) => itsmo >= b.min && itsmo <= b.max
  );
  return band ? band.nivel : 1;
}

/** Gaps em pontos (0–100): ΔC-H = |IC - IH|, ΔC-P = |IC - IP| */
export function computeGaps(ic: number, ih: number, ip: number): { gapCH: number; gapCP: number } {
  return {
    gapCH: Math.round(Math.abs(ic - ih) * 100) / 100,
    gapCP: Math.round(Math.abs(ic - ip) * 100) / 100,
  };
}

/**
 * Subíndices: média dos itens indicados (escala 1–5, não 0–100).
 * ISE = média(A11, A12, B6), IPT = média(A2, A5, B8), ICL = média(A3, A6, B5)
 * questionAverages deve conter itemCode quando aplicável.
 */
export function computeSubindices(
  questionAverages: SuphoQuestionAverage[],
  mapping: {
    ise: readonly string[];
    ipt: readonly string[];
    icl: readonly string[];
  }
): { ise: number; ipt: number; icl: number } {
  const byCode = new Map(questionAverages.map((q) => [q.itemCode ?? q.questionId, q.average]));

  const avg = (codes: readonly string[]) => {
    const values = codes.map((c) => byCode.get(c)).filter((v): v is number => typeof v === 'number');
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  };

  return {
    ise: Math.round(avg(mapping.ise) * 100) / 100,
    ipt: Math.round(avg(mapping.ipt) * 100) / 100,
    icl: Math.round(avg(mapping.icl) * 100) / 100,
  };
}

/** Mapeamento padrão de códigos de item para subíndices */
export const DEFAULT_SUBINDEX_ITEMS = {
  ise: ['A11', 'A12', 'B6'],
  ipt: ['A2', 'A5', 'B8'],
  icl: ['A3', 'A6', 'B5'],
} as const;

/** Calcula o resultado completo do diagnóstico */
export function computeDiagnosticResult(
  questionAverages: SuphoQuestionAverage[],
  subindexMapping: {
    ise: readonly string[];
    ipt: readonly string[];
    icl: readonly string[];
  } = DEFAULT_SUBINDEX_ITEMS
): SuphoDiagnosticResult {
  const { ic, ih, ip } = computeIndices(questionAverages);
  const itsmo = computeITSMO(ic, ih, ip);
  const nivel = computeNivel(itsmo);
  const { gapCH, gapCP } = computeGaps(ic, ih, ip);
  const { ise, ipt, icl } = computeSubindices(questionAverages, subindexMapping);

  return {
    ic,
    ih,
    ip,
    itsmo,
    nivel,
    gapCH,
    gapCP,
    ise,
    ipt,
    icl,
    sampleSize: questionAverages.length > 0 ? Math.max(...questionAverages.map((q) => q.count)) : 0,
    questionAverages,
  };
}

/** Filtra itens críticos (média &lt; 3,5) para ranking */
export function getCriticalItems(
  questionAverages: SuphoQuestionAverage[],
  threshold = 3.5
): SuphoQuestionAverage[] {
  return questionAverages
    .filter((q) => q.average < threshold)
    .sort((a, b) => a.average - b.average);
}
