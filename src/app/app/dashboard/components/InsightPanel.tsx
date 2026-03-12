'use client';

import { Brain, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/cn';

interface InsightPanelProps {
  /** Principal gargalo identificado */
  bottleneck?: string | null;
  /** Percentil vs cluster (1-100) */
  percentile?: number | null;
  /** Principais fatores que impactam win rate */
  winRateFactors?: string[];
  /** Confidence do modelo (0-100) */
  confidence?: number | null;
  loading?: boolean;
}

function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div
      className={cn('h-4 rounded bg-slate-100 animate-pulse', className)}
      aria-hidden
    />
  );
}


export function InsightPanel({
  bottleneck,
  percentile,
  winRateFactors = [],
  confidence = 82,
  loading,
}: InsightPanelProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
            <Brain className="h-5 w-5 text-indigo-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Insights da IA</h2>
        </div>
        <div className="mt-6 space-y-4">
          <SkeletonLine className="w-3/4" />
          <SkeletonLine className="w-1/2" />
          <SkeletonLine className="w-2/3" />
        </div>
      </div>
    );
  }

  const hasData = bottleneck || (percentile != null) || winRateFactors.length > 0;

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
            <Brain className="h-5 w-5 text-indigo-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Insights da IA</h2>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Carregue dados e ative o serviço de IA para insights prescritivos.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
            <Brain className="h-5 w-5 text-indigo-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Insights da IA</h2>
        </div>
        {confidence != null && (
          <span
            className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700"
            title="Confiança do modelo"
          >
            {confidence}% confiança
          </span>
        )}
      </div>

      <div className="mt-6 space-y-5">
        {bottleneck && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Principal gargalo
            </p>
            <p className="mt-1 font-medium text-slate-900">{bottleneck}</p>
          </div>
        )}

        {percentile != null && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Percentil vs segmento
            </p>
            <p className="mt-1 flex items-center gap-2 text-slate-900">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              <span className="font-medium">
                P{percentile} — ciclo {percentile > 50 ? 'maior' : 'menor'} que mediana
              </span>
            </p>
          </div>
        )}

        {winRateFactors.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Fatores que impactam taxa de ganho
            </p>
            <ul className="mt-2 space-y-1">
              {winRateFactors.slice(0, 3).map((f, i) => (
                <li key={i} className="text-sm text-slate-700">
                  • {f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
