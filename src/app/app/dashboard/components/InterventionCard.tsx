'use client';

import { useState } from 'react';
import { ArrowRight, Eye, Sparkles, Loader2 } from 'lucide-react';
import { AddToCalendarButton } from '../AddToCalendarButton';
import { predictDeal } from '@/lib/aiClient';
import type { Intervencao } from './IntervencoesPrioritarias';
import type { DealRow } from './revenue-engine';
import { cn } from '@/lib/cn';

export type PriorityLevel = 'critical' | 'high' | 'medium';

function getPriority(intervencao: Intervencao): PriorityLevel {
  const days = intervencao.diasParado ?? 0;
  const impactScore =
    intervencao.impact_score ?? intervencao.valor * Math.max(1, days);
  if (days >= 14 || impactScore > 100000) return 'critical';
  if (days >= 7 || impactScore > 50000) return 'high';
  return 'medium';
}

/** P(win) da API quando disponível; senão estimativa por dias parados (fallback). */
function getPWin(intervencao: Intervencao): number {
  if (intervencao.p_win != null && intervencao.p_win >= 0) return intervencao.p_win;
  const days = intervencao.diasParado ?? 0;
  if (days <= 6) return 0.8;
  if (days <= 13) return 0.6;
  if (days <= 20) return 0.4;
  return 0.2;
}

/** Encurta ação para linguagem direta */
function shortenAction(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('agendar') && (lower.includes('call') || lower.includes('follow')))
    return 'Agendar follow-up imediato';
  if (lower.includes('agendar')) return 'Agendar follow-up';
  if (lower.includes('revisar') && lower.includes('próxima ação'))
    return 'Revisar próxima ação';
  if (lower.includes('revisar')) return 'Revisar e desbloquear';
  if (text.length > 40) return text.slice(0, 37) + '…';
  return text;
}

const priorityTopLine: Record<PriorityLevel, string> = {
  critical: 'border-t-2 border-t-rose-400/70',
  high: 'border-t-2 border-t-amber-400/70',
  medium: 'border-t-2 border-t-amber-300/50',
};

const priorityStyles: Record<PriorityLevel, string> = {
  critical: 'border-l-rose-400/80 bg-rose-50/20',
  high: 'border-l-amber-500/80 bg-amber-50/20',
  medium: 'border-l-amber-400/60 bg-amber-50/10',
};

const priorityBadgeStyles: Record<PriorityLevel, string> = {
  critical: 'bg-rose-100/90 text-rose-800',
  high: 'bg-amber-100/90 text-amber-800',
  medium: 'bg-amber-50 text-amber-700',
};

interface InterventionCardProps {
  intervencao: Intervencao;
  formatCurrency: (n: number) => string;
  rank?: number;
  orgId?: string | null;
}

export function InterventionCard({
  intervencao,
  formatCurrency,
  orgId = null,
}: InterventionCardProps) {
  const [dealPrediction, setDealPrediction] = useState<{
    expected_close_days?: number;
    risk_delay?: number;
    fallback?: string | null;
  } | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  const priority = getPriority(intervencao);
  const pWin = getPWin(intervencao);
  const impactScore =
    intervencao.impact_score ??
    intervencao.valor * Math.max(1, intervencao.diasParado ?? 0);
  const shortAction = shortenAction(intervencao.acao);

  const loadDealPrediction = async () => {
    if (!orgId || dealPrediction !== null || predictionLoading) return;
    setPredictionLoading(true);
    try {
      const res = await predictDeal(intervencao.id, orgId);
      if (res.error) return;
      setDealPrediction({
        expected_close_days: res.expected_close_days,
        risk_delay: res.risk_delay,
        fallback: res.fallback ?? null,
      });
    } finally {
      setPredictionLoading(false);
    }
  };

  return (
    <div
      className={cn(
        'group flex flex-col gap-4 rounded-xl border border-slate-200 p-5 transition-all duration-200 hover:border-slate-300 hover:shadow-sm hover:scale-[1.01] border-l-4',
        priorityTopLine[priority],
        priorityStyles[priority]
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 truncate">
            {intervencao.cliente}
          </p>
          <p className="mt-1 text-sm text-slate-600">{shortAction}</p>
          {intervencao.impact_rationale && (
            <p className="mt-0.5 text-xs text-slate-500 italic">
              {intervencao.impact_rationale}
            </p>
          )}
        </div>
        <span
          className={cn(
            'shrink-0 rounded-md px-2.5 py-0.5 text-xs font-medium',
            priorityBadgeStyles[priority]
          )}
        >
          {priority === 'critical' ? 'Critical' : priority === 'high' ? 'High' : 'Medium'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <span className="text-lg font-bold text-slate-900 tabular-nums">
          {formatCurrency(intervencao.valor)}
        </span>
        <span className="text-sm text-slate-500">
          P(win) {(pWin * 100).toFixed(0)}%
        </span>
        <span className="text-sm text-slate-500">
          Impacto {formatCurrency(impactScore)}
        </span>
      </div>

      {orgId && (
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
          {dealPrediction === null && !predictionLoading && (
            <button
              type="button"
              onClick={loadDealPrediction}
              className="inline-flex items-center gap-1.5 font-medium text-indigo-600 hover:text-indigo-700"
            >
              <Sparkles className="h-4 w-4" />
              Ver previsão IA (ciclo e risco)
            </button>
          )}
          {predictionLoading && (
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando previsão…
            </span>
          )}
          {dealPrediction !== null && (
            <div className="flex flex-wrap gap-x-4 gap-y-0 text-slate-600">
              {dealPrediction.expected_close_days != null && (
                <span>Previsão de fechamento: <strong>{dealPrediction.expected_close_days} dias</strong></span>
              )}
              {dealPrediction.risk_delay != null && dealPrediction.risk_delay > 0 && (
                <span>Risco de atraso: <strong>{(dealPrediction.risk_delay * 100).toFixed(0)}%</strong></span>
              )}
              {dealPrediction.fallback && (
                <span className="text-slate-400 text-xs">(estimativa)</span>
              )}
            </div>
          )}
        </div>
      )}

      {intervencao.deal && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/50">
          <AddToCalendarButton
            deal={intervencao.deal as DealRow}
            context={intervencao.etapa}
            ownerEmail={intervencao.deal.owner_email}
          />
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            aria-label="Ver detalhes"
          >
            <Eye className="h-4 w-4" />
            Ver detalhes
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
