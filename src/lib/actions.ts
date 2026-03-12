/**
 * Mapeamento de fricções para sugestões de ação e prioridade estratégica
 */

export const FRICTION_ACTIONS: Record<
  string,
  {
    action: string;
    icon: string;
    cta: string;
    priority: number; // 1 = mais urgente
    impactLabel: string;
  }
> = {
  'proposta-alto-risco': {
    action: 'Agendar call de follow-up com o cliente para desbloquear a proposta',
    icon: '📞',
    cta: 'Agendar na agenda',
    priority: 1,
    impactLabel: 'Valor em proposta parado',
  },
  'pipeline-abandonado': {
    action: 'Retomar contato: ligar ou enviar email para reengajar o lead',
    icon: '🔄',
    cta: 'Agendar na agenda',
    priority: 2,
    impactLabel: 'Valor em risco de perda',
  },
  'aprovacao-travada': {
    action: 'Acompanhar aprovação interna e acionar stakeholders',
    icon: '✅',
    cta: 'Agendar na agenda',
    priority: 3,
    impactLabel: 'Valor travado em aprovação',
  },
  'aging-inflado': {
    action: 'Reavaliar pipeline: qualificar ou dar baixa em negócios antigos',
    icon: '📋',
    cta: 'Agendar na agenda',
    priority: 4,
    impactLabel: 'Pipeline inflado',
  },
  'concentracao-vendedor': {
    action: 'Distribuir carga: reunião com vendedores sobrepriorizados',
    icon: '⚖️',
    cta: 'Agendar na agenda',
    priority: 5,
    impactLabel: 'Concentração de risco',
  },
};

export function getActionForFriction(id: string) {
  const base = {
    action: 'Revisar e definir próxima ação',
    icon: '📌',
    cta: 'Agendar na agenda',
    priority: 99,
    impactLabel: 'Impacto a avaliar',
  };
  return { ...base, ...FRICTION_ACTIONS[id] };
}

export function computeValueAtRisk(evidence: Array<Record<string, unknown>>): number {
  return evidence.reduce((sum, e) => sum + (Number(e.value) || 0), 0);
}
