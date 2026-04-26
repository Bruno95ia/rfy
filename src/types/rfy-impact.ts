/**
 * Revenue Impact Engine — SUPHO (estrutura) → RFY (impacto) → PAIP (execução) → forecast.
 * Liderança = índice humano (IH) no diagnóstico SUPHO.
 */

export type SuphoPillar = 'culture' | 'commercial' | 'leadership';

/** Resultado SUPHO alinhado ao modelo de fricção (scores 0–100) */
export interface SUPHOResult {
  cultureScore: number;
  commercialScore: number;
  leadershipScore: number;
}

export type FrictionLevel = 'low' | 'medium' | 'high' | 'critical';

/** Motor de impacto — saída financeira + auditoria de fricção */
export interface ImpactResult {
  /** Rc / Pd (0–1) */
  rfyScore: number;
  revenueDeclared: number;
  revenueReliable: number;
  revenueInflated: number;
  /** Exposição estrutural Pd × fricção composta (antes de B×G×H) */
  revenueAtRisk: number;
  revenueRecoverable: number;
  /** F = 1 − (1−c)(1−e)(1−i) */
  totalFriction: number;
  /** Penalidades discretas 0–1 */
  conversionLoss: number;
  executionLoss: number;
  inconsistencyLoss: number;
  /** Pd × B × (1−F) × G × H × (1 + 0,3 × executionRate) */
  forecastOptimized: number;
  topImpactDrivers: Array<{ pillar: SuphoPillar; label: string; loss: number }>;
  /** Legado / debug */
  narrativeKey: string;
}

export interface PipelineDataForImpact {
  /** Pd — valor total do pipeline aberto */
  pipelineOpenValue: number;
}

export interface ExecutionDataForImpact {
  /** B — baseline de confiabilidade do modelo (default 0,85) */
  baselineReliability?: number;
  /** G — governança (0–1) */
  governanceScore?: number;
  /** H — higiene do pipeline (0–1) */
  hygieneScore?: number;
  /** Soma impacto entregue (ex.: Σ ganhos PAIP concluídos) */
  deliveredImpact?: number;
  /** Soma impacto planejado */
  plannedImpact?: number;
  /** Se já calculado (ex.: ações PAIP done/total) */
  executionRate?: number;
}

export interface PAIPActionModel {
  action: string;
  pillar: SuphoPillar;
  owner?: string | null;
  deadline?: string | null;
  expectedImpactRFY: number;
  expectedRevenueGain: number;
  status: string;
}
