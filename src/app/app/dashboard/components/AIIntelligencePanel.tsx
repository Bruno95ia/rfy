'use client';

import { Brain, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/cn';

function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div
      className={cn('h-4 rounded bg-slate-100 animate-pulse', className)}
      aria-hidden
    />
  );
}

interface AIIntelligencePanelProps {
  /** Principal gargalo identificado */
  bottleneck?: string | null;
  /** Explicação curta do gargalo */
  bottleneckExplanation?: string;
  /** Impacto financeiro estimado do gargalo */
  bottleneckImpactValue?: string;
  /** Simulação: se reduzir X, ganho estimado */
  optimizationSimulation?: {
    condition: string;
    winRateGain: string;
    estimatedGain: string;
  };
  /** Confiança do modelo 0-100 */
  confidence?: number | null;
  /** Versão do modelo (discreto) */
  modelVersion?: string | null;
  loading?: boolean;
}

export function AIIntelligencePanel({
  bottleneck,
  bottleneckExplanation,
  bottleneckImpactValue,
  optimizationSimulation,
  confidence = 82,
  modelVersion,
  loading,
}: AIIntelligencePanelProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
            <Brain className="h-5 w-5 text-indigo-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            Painel de Inteligência IA
          </h2>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <SkeletonLine className="w-3/4" />
            <SkeletonLine className="w-full" />
            <SkeletonLine className="w-1/2" />
          </div>
          <div className="space-y-3">
            <SkeletonLine className="w-2/3" />
            <SkeletonLine className="w-full" />
            <SkeletonLine className="w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  const hasData =
    bottleneck ||
    bottleneckImpactValue ||
    optimizationSimulation ||
    (confidence != null && confidence > 0);

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
            <Brain className="h-5 w-5 text-indigo-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            Painel de Inteligência IA
          </h2>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Análise baseada em aprendizado histórico. Carregue dados e ative o AI
          Service para insights prescritivos.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.005] overflow-hidden">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
            <Brain className="h-5 w-5 text-indigo-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            Painel de Inteligência IA
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {confidence != null && confidence > 0 && (
            <span
              className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600"
              title="Confiança do modelo de predição"
            >
              {confidence >= 70
                ? `Alta confiança (${confidence}%) — use a previsão para planejamento`
                : confidence >= 40
                  ? `Confiança moderada (${confidence}%) — valide com dados recentes`
                  : `Baixa confiança (${confidence}%) — priorize mais dados ou retreino`}
            </span>
          )}
          {modelVersion && (
            <span
              className="text-[10px] text-slate-400"
              title="Versão do modelo"
            >
              v{modelVersion}
            </span>
          )}
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Análise baseada em aprendizado histórico
      </p>

      <div className="mt-6 grid gap-8 sm:grid-cols-2">
        {/* Coluna esquerda */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Principal gargalo
          </p>
          {bottleneck ? (
            <>
              <p className="font-medium text-slate-900">{bottleneck}</p>
              {bottleneckExplanation && (
                <p className="text-sm text-slate-600">
                  {bottleneckExplanation}
                </p>
              )}
              {bottleneckImpactValue && (
                <p className="text-sm font-semibold text-amber-600 tabular-nums">
                  Impacto estimado: {bottleneckImpactValue}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500">Sem gargalo identificado</p>
          )}
        </div>

        {/* Coluna direita: Se otimizado */}
        <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Se otimizado
          </p>
          {optimizationSimulation ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-700">
                {optimizationSimulation.condition}:
              </p>
              <ul className="space-y-1 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-teal-500 shrink-0" />
                  {optimizationSimulation.winRateGain}
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-teal-500 shrink-0" />
                  {optimizationSimulation.estimatedGain}
                </li>
              </ul>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Simule cenários reduzindo tempo em estágios críticos
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
