/**
 * Sinais de imaturidade de sistemas: ausência de CRM integrado e/ou ERP declarado.
 * Ajusta o pilar IP (Comercial e Performance) antes de recalcular ITSMO e nível.
 */

export const IP_PENALTY_NO_ACTIVE_CRM = 6;
export const IP_PENALTY_ERP_NOT_INTEGRATED = 4;
export const MAX_IP_PENALTY_SYSTEMS = 10;

export type ErpIntegrationStatus = 'unknown' | 'integrated' | 'not_integrated';

export type SystemsMaturityInput = {
  /** Pelo menos uma linha em crm_integrations com is_active = true */
  hasActiveCrmIntegration: boolean;
  erpIntegrationStatus: ErpIntegrationStatus;
};

export type SystemsMaturityAssessment = {
  ipPenalty: number;
  reasons: string[];
  hasActiveCrmIntegration: boolean;
  erpIntegrationStatus: ErpIntegrationStatus;
};

/**
 * Penalidade sobre IP (0–100): sem CRM ativo e/ou ERP explicitamente "not_integrated".
 * Status ERP "unknown" não aplica penalidade por ERP (evita punir quem ainda não informou).
 */
export function assessSystemsMaturity(input: SystemsMaturityInput): SystemsMaturityAssessment {
  const reasons: string[] = [];
  let penalty = 0;

  if (!input.hasActiveCrmIntegration) {
    penalty += IP_PENALTY_NO_ACTIVE_CRM;
    reasons.push(
      'Não há integração CRM ativa no RFY: menor visibilidade e governança do pipeline — sinal de imaturidade em dados comerciais.'
    );
  }

  if (input.erpIntegrationStatus === 'not_integrated') {
    penalty += IP_PENALTY_ERP_NOT_INTEGRATED;
    reasons.push(
      'ERP declarado como não integrado: risco de desalinhamento entre vendas, pedido e financeiro — reforça imaturidade de sistemas.'
    );
  }

  penalty = Math.min(penalty, MAX_IP_PENALTY_SYSTEMS);

  return {
    ipPenalty: penalty,
    reasons,
    hasActiveCrmIntegration: input.hasActiveCrmIntegration,
    erpIntegrationStatus: input.erpIntegrationStatus,
  };
}

export function applyIpPenalty(ip: number, penalty: number): number {
  const next = ip - penalty;
  const clamped = Math.max(0, Math.min(100, next));
  return Math.round(clamped * 100) / 100;
}
