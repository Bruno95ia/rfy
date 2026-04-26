import type { ImpactResult } from '@/types/rfy-impact';
import type { SuphoPillar } from '@/types/rfy-impact';

const PILLAR_LABEL: Record<SuphoPillar, string> = {
  culture: 'maturidade cultural',
  commercial: 'maturidade comercial',
  leadership: 'liderança e execução',
};

/**
 * Insight executivo — perda mensal estimada (gap inflado / 3 como proxy de horizonte ~30d).
 */
export function buildImpactNarrative(
  impact: ImpactResult,
  options?: { currency?: string; locale?: string }
): string {
  const currency = options?.currency ?? 'BRL';
  const locale = options?.locale ?? 'pt-BR';
  const parts = impact.narrativeKey.split(':');
  const pillar = (parts[0] as SuphoPillar) || 'commercial';
  const score = parts[1] ? parseFloat(parts[1]) : 0;

  const fmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });

  const monthlyGap = impact.revenueInflated / 3;
  const label = PILLAR_LABEL[pillar] ?? PILLAR_LABEL.commercial;
  const scoreLabel = Number.isFinite(score) ? score.toFixed(1) : '—';

  if (impact.revenueDeclared < 1) {
    return `Score RFY (Rc/Pd): ${(impact.rfyScore * 100).toFixed(1)}% — pilar mais fraco: ${label} (${scoreLabel}). Inclua pipeline aberto para quantificar o impacto em R$.`;
  }

  return `Você está deixando de realizar cerca de ${fmt.format(monthlyGap)}/mês por baixa ${label} (nota: ${scoreLabel}).`;
}

/** Recuperação em ~90 dias (proxy: 3× o efeito mensal estimado da recuperação). */
export function buildImpactSecondaryLine(impact: ImpactResult, locale = 'pt-BR'): string {
  const fmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
  const recover90 = impact.revenueRecoverable * 3;
  return `Recuperável (modelo): ${fmt.format(impact.revenueRecoverable)} · Se executar o plano atual, pode recuperar cerca de ${fmt.format(recover90)} em 90 dias · Inflada: ${fmt.format(impact.revenueInflated)} · Fricção total: ${(impact.totalFriction * 100).toFixed(1)}%.`;
}
