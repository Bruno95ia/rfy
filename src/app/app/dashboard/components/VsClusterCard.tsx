'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { BenchmarkCompanyResponse, BenchmarkMetricDiff } from '@/lib/aiClient';

const METRIC_LABELS: Record<string, string> = {
  cycle_median: 'Ciclo médio (dias)',
  win_rate: 'Taxa de ganho',
  proposal_stagnation_rate: 'Estagnação em proposta',
  abandoned_rate: 'Pipeline abandonado',
  pipeline_value_open: 'Valor em pipeline',
};

function formatMetricValue(metric: string, value: number): string {
  if (metric === 'win_rate' || metric === 'proposal_stagnation_rate' || metric === 'abandoned_rate') {
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

interface VsClusterCardProps {
  benchmark: BenchmarkCompanyResponse | null;
  loading?: boolean;
}

export function VsClusterCard({ benchmark, loading }: VsClusterCardProps) {
  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="p-6 pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            Vs seu segmento
          </CardTitle>
          <p className="mt-2 text-sm text-slate-500">Carregando comparação com empresas do seu segmento...</p>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
        </CardContent>
      </Card>
    );
  }

  if (!benchmark || benchmark.status !== 'ok' || !benchmark.diffs) {
    const message =
      benchmark?.status === 'insufficient_peers'
        ? 'Poucos pares no segmento (mín. 5 empresas). Dados agregados não exibidos por privacidade.'
        : benchmark?.status === 'no_data'
          ? 'Sem dados suficientes para benchmark.'
          : benchmark?.message || 'Benchmark indisponível.';
    return (
      <Card className="overflow-hidden">
        <CardHeader className="p-6 pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            Vs seu segmento
          </CardTitle>
          <p className="mt-2 text-sm text-slate-500">{message}</p>
        </CardHeader>
      </Card>
    );
  }

  const diffs = benchmark.diffs;
  const entries = Object.entries(diffs);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-6 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
          Vs seu segmento
        </CardTitle>
        <p className="mt-2 text-sm text-slate-500">
          Comparação com empresas do seu segmento e porte (dados agregados e anonimizados)
        </p>
        {benchmark.percentile_cycle != null && (
          <p className="mt-2 text-sm font-medium text-indigo-600">
            Percentil ciclo vs segmento: <strong>{benchmark.percentile_cycle}</strong> (1-100, maior = ciclo mais longo)
          </p>
        )}
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="space-y-4">
          {entries.map(([metric, diff]) => (
            <MetricRow key={metric} metric={metric} diff={diff} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricRow({ metric, diff }: { metric: string; diff: BenchmarkMetricDiff }) {
  const label = METRIC_LABELS[metric] ?? metric;
  const pct = diff.pct_diff_vs_median;

  // Positivo = melhor que mediana do cluster
  // Ciclo menor, win rate maior, estagnação/abandonado menor = bom
  const isPositive =
    metric === 'win_rate'
      ? pct > 0
      : metric === 'cycle_median' || metric === 'proposal_stagnation_rate' || metric === 'abandoned_rate'
        ? pct < 0 // menor é melhor
        : metric === 'pipeline_value_open'
          ? pct > 0
          : pct > 0;

  const Icon = pct === 0 ? Minus : isPositive ? TrendingUp : TrendingDown;
  const colorClass = pct === 0 ? 'text-slate-500' : isPositive ? 'text-teal-600' : 'text-amber-600';

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1 font-semibold text-slate-900 tabular-nums">
          {formatMetricValue(metric, diff.org_value)} vs {formatMetricValue(metric, diff.cluster_median)} (mediana)
        </p>
      </div>
      <div className={`flex items-center gap-1.5 ${colorClass}`}>
        <Icon className="h-4 w-4" />
        <span className="font-semibold tabular-nums">
          {pct > 0 ? '+' : ''}
          {pct.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
