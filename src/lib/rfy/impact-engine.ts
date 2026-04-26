import type {
  ImpactResult,
  PipelineDataForImpact,
  ExecutionDataForImpact,
  SUPHOResult,
  SuphoPillar,
} from '@/types/rfy-impact';

const DEFAULT_B = 0.85;
const DEFAULT_G = 0.7;
const DEFAULT_H = 0.7;
const DEFAULT_EXECUTION = 0.65;

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** Penalidades por degraus (especificação RFY) */
export function conversionLossFromCommercial(commercialScore: number): number {
  if (commercialScore < 40) return 0.3;
  if (commercialScore < 60) return 0.2;
  if (commercialScore < 75) return 0.1;
  return 0;
}

export function executionLossFromLeadership(leadershipScore: number): number {
  if (leadershipScore < 40) return 0.2;
  if (leadershipScore < 60) return 0.12;
  if (leadershipScore < 75) return 0.05;
  return 0;
}

export function inconsistencyLossFromCulture(cultureScore: number): number {
  if (cultureScore < 40) return 0.12;
  if (cultureScore < 60) return 0.08;
  if (cultureScore < 75) return 0.03;
  return 0;
}

function compoundFriction(c: number, e: number, i: number): number {
  const survival = (1 - c) * (1 - e) * (1 - i);
  return 1 - survival;
}

function betaFromGovernance(G: number): number {
  if (G < 0.5) return 0.25;
  if (G < 0.75) return 0.4;
  return 0.6;
}

function resolveExecutionRate(ex: ExecutionDataForImpact): number {
  if (ex.executionRate != null && Number.isFinite(ex.executionRate)) {
    return clamp01(ex.executionRate);
  }
  const d = ex.deliveredImpact;
  const p = ex.plannedImpact;
  if (d != null && p != null && p > 0 && Number.isFinite(d) && Number.isFinite(p)) {
    return clamp01(d / p);
  }
  return DEFAULT_EXECUTION;
}

const DRIVER_LABEL: Record<SuphoPillar, string> = {
  culture: 'Consistência cultural',
  commercial: 'Conversão comercial',
  leadership: 'Execução e liderança',
};

function topDrivers(c: number, e: number, i: number): Array<{ pillar: SuphoPillar; label: string; loss: number }> {
  const arr: Array<{ pillar: SuphoPillar; label: string; loss: number }> = [
    { pillar: 'commercial', label: DRIVER_LABEL.commercial, loss: c },
    { pillar: 'leadership', label: DRIVER_LABEL.leadership, loss: e },
    { pillar: 'culture', label: DRIVER_LABEL.culture, loss: i },
  ];
  return [...arr].sort((a, b) => b.loss - a.loss).slice(0, 3);
}

/**
 * Impact Engine completo: SUPHO + pipeline + governança/higiene/execução PAIP.
 *
 * Rc = Pd × B × (1−F) × G × H, com F = 1 − (1−c)(1−e)(1−i).
 * Ri = max(0, Pd − Rc). rfyScore = Rc / Pd.
 * Rrec = Ri × β(G) × executionRate.
 * Forecast otimizado (analítico) = Pd × B × (1−F) × G × H × (1 + 0,3 × executionRate).
 */
export function computeImpact(
  suphoScores: SUPHOResult,
  pipelineData: PipelineDataForImpact,
  executionData: ExecutionDataForImpact = {}
): ImpactResult {
  const Pd = Math.max(0, pipelineData.pipelineOpenValue);
  const B = executionData.baselineReliability ?? DEFAULT_B;
  const G = clamp01(executionData.governanceScore ?? DEFAULT_G);
  const H = clamp01(executionData.hygieneScore ?? DEFAULT_H);

  const c = conversionLossFromCommercial(suphoScores.commercialScore);
  const e = executionLossFromLeadership(suphoScores.leadershipScore);
  const i = inconsistencyLossFromCulture(suphoScores.cultureScore);

  const F = compoundFriction(c, e, i);
  const survival = (1 - c) * (1 - e) * (1 - i);

  const revenueDeclared = Pd;
  const revenueReliable = Pd * B * survival * G * H;
  const revenueInflated = Math.max(0, Pd - revenueReliable);
  const revenueAtRisk = Pd * F;
  const rfyScore = Pd > 0 ? revenueReliable / Pd : 0;

  const executionRate = resolveExecutionRate(executionData);
  const beta = betaFromGovernance(G);
  const revenueRecoverable = revenueInflated * beta * executionRate;

  const forecastOptimized = Pd * B * survival * G * H * (1 + 0.3 * executionRate);

  const scores: Array<[SuphoPillar, number]> = [
    ['commercial', suphoScores.commercialScore],
    ['leadership', suphoScores.leadershipScore],
    ['culture', suphoScores.cultureScore],
  ];
  const weakestPillar = [...scores].sort((a, b) => a[1] - b[1])[0]!;
  const narrativeKey = `${weakestPillar[0]}:${Math.round(weakestPillar[1] * 10) / 10}`;

  return {
    rfyScore: clamp01(rfyScore),
    revenueDeclared,
    revenueReliable,
    revenueInflated,
    revenueAtRisk,
    revenueRecoverable,
    totalFriction: F,
    conversionLoss: c,
    executionLoss: e,
    inconsistencyLoss: i,
    forecastOptimized,
    topImpactDrivers: topDrivers(c, e, i),
    narrativeKey,
  };
}

/** Mapeia diagnóstico SUPHO: IC=cultura, IP=comercial, IH=liderança */
export function suphoDiagnosticToResult(ic: number, ih: number, ip: number): SUPHOResult {
  return {
    cultureScore: ic,
    commercialScore: ip,
    leadershipScore: ih,
  };
}
