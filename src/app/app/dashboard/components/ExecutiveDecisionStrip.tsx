'use client';

import { Target, AlertTriangle, Zap, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ExecutiveDecisionStripProps {
  forecast: string;
  receitaRisco: string;
  /** Primeira intervenção: cliente + valor para destaque de impacto */
  firstIntervention?: { cliente: string; valor: string; acao?: string } | null;
  /** Uma linha: posição vs benchmark (ex.: "Acima da mediana em win rate; ciclo 5% acima") */
  benchmarkOneLiner?: string | null;
  className?: string;
}

/**
 * Faixa de resumo executivo: orientada à decisão.
 * Responde em uma linha: Forecast | Em risco | Próxima ação | Benchmark.
 */
export function ExecutiveDecisionStrip({
  forecast,
  receitaRisco,
  firstIntervention,
  benchmarkOneLiner,
  className,
}: ExecutiveDecisionStripProps) {
  return (
    <section
      aria-label="Linha de decisão executiva — Receita Confiável, Receita Inflada, Próxima ação, Benchmark"
      className={cn(
        'rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/40 p-4 shadow-sm',
        className
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        Prioridade 1 · Decisão de Receita
      </p>
      <div className="mt-3 space-y-2.5">
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
            <span className="text-xs font-medium text-slate-500">Receita Confiável</span>
          </div>
          <p className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">{forecast}</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            <span className="text-xs font-medium text-amber-700">Receita Inflada</span>
          </div>
          <p className="mt-1 text-lg font-semibold text-amber-800 tabular-nums">{receitaRisco}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
            <span className="text-xs font-medium text-slate-500">Ação prioritária</span>
          </div>
          {firstIntervention ? (
            <>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                {firstIntervention.cliente} · {firstIntervention.valor}
              </p>
              {firstIntervention.acao && (
                <p className="truncate text-xs text-slate-500">
                  {firstIntervention.acao.length > 48
                    ? `${firstIntervention.acao.slice(0, 48)}...`
                    : firstIntervention.acao}
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-500">Sem intervenção prioritária</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <span className="text-xs font-medium text-slate-500">Comparativo</span>
          </div>
          <p className="mt-1 text-sm text-slate-700">
            {benchmarkOneLiner ?? 'Benchmark em atualização'}
          </p>
        </div>
      </div>
    </section>
  );
}
