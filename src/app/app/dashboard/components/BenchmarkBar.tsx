'use client';

import type { BenchmarkCompanyResponse, BenchmarkMetricDiff } from '@/lib/aiClient';
import { cn } from '@/lib/cn';

const METRIC_LABELS: Record<string, string> = {
  cycle_median: 'Tempo de ciclo',
  win_rate: 'Taxa de ganho',
  proposal_stagnation_rate: 'Estagnação em proposta',
  abandoned_rate: 'Pipeline abandonado',
  pipeline_value_open: 'Valor em pipeline',
};

function formatMetricValue(metric: string, value: number): string {
  if (
    metric === 'win_rate' ||
    metric === 'proposal_stagnation_rate' ||
    metric === 'abandoned_rate'
  ) {
    return `${(value * 100).toFixed(1)}%`;
  }
  if (metric === 'pipeline_value_open') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value);
  }
  return `${value.toFixed(1)} dias`;
}

interface BenchmarkBarProps {
  metric: string;
  diff: BenchmarkMetricDiff;
}

export function BenchmarkBar({ metric, diff }: BenchmarkBarProps) {
  const label = METRIC_LABELS[metric] ?? metric;
  const yourPosition =
    diff.percentile === 'above' ? 75 : diff.percentile === 'below' ? 25 : 50;
  const pctDiff = diff.pct_diff_vs_median;
  const isPositive =
    metric === 'win_rate' || metric === 'pipeline_value_open'
      ? pctDiff > 0
      : metric === 'cycle_median' || metric === 'proposal_stagnation_rate' || metric === 'abandoned_rate'
        ? pctDiff < 0
        : pctDiff > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500 tabular-nums">
          Você: {formatMetricValue(metric, diff.org_value)} · Mediana: {formatMetricValue(metric, diff.cluster_median)}
        </span>
      </div>
      <div className="relative h-3 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-slate-200/60 transition-all duration-500"
          style={{ width: '100%' }}
        />
        <div
          className="absolute top-0 bottom-0 w-2 rounded-full bg-indigo-500 shadow-sm z-10 transition-all duration-300 -ml-1"
          style={{ left: `${yourPosition}%` }}
          title={`Percentil: ${diff.percentile} · ${pctDiff > 0 ? '+' : ''}${pctDiff.toFixed(1)}% vs mediana`}
        />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">P25</span>
        <span className={cn('font-medium tabular-nums', isPositive ? 'text-teal-600' : 'text-amber-600')}>
          {pctDiff > 0 ? '+' : ''}{pctDiff.toFixed(1)}% vs mediana
        </span>
        <span className="text-slate-400">P75</span>
      </div>
    </div>
  );
}

interface BenchmarkSectionProps {
  benchmark: BenchmarkCompanyResponse | null;
  loading?: boolean;
}

export function BenchmarkSection({ benchmark, loading }: BenchmarkSectionProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Você vs segmento</h2>
        <p className="mt-2 text-sm text-slate-500">
          Carregando comparação com empresas do seu segmento...
        </p>
        <div className="mt-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (
    !benchmark ||
    benchmark.status !== 'ok' ||
    !benchmark.diffs
  ) {
    const message =
      benchmark?.status === 'insufficient_peers'
        ? 'Poucos pares no segmento (mín. 5 empresas). Dados agregados não exibidos por privacidade.'
        : benchmark?.status === 'no_data'
          ? 'Sem dados suficientes para benchmark.'
          : benchmark?.message || 'Benchmark indisponível.';

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Você vs segmento</h2>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
      </div>
    );
  }

  const entries = Object.entries(benchmark.diffs);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Você vs segmento</h2>
      <p className="mt-2 text-sm text-slate-500">
        Comparação com empresas do seu segmento (dados agregados e anonimizados)
      </p>
      {benchmark.percentile_cycle != null && (
        <p className="mt-2 text-sm font-medium text-indigo-600">
          Percentil ciclo: <strong>P{benchmark.percentile_cycle}</strong>
        </p>
      )}
      <div className="mt-6 space-y-6">
        {entries.map(([metric, diff]) => (
          <BenchmarkBar key={metric} metric={metric} diff={diff} />
        ))}
      </div>
    </div>
  );
}
