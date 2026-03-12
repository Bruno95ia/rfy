'use client';

import type {
  BenchmarkCompanyResponse,
  BenchmarkMetricDiff,
} from '@/lib/aiClient';
import { cn } from '@/lib/cn';
import { TrendingUp, TrendingDown, Minus, BarChart3, Target } from 'lucide-react';

/** Extrai texto legível — nunca exibe JSON bruto. */
function parseFallbackSummary(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { icp_summary?: string; icp_study?: { empresas_analisadas?: unknown[] } };
      const summary = typeof parsed?.icp_summary === 'string' && parsed.icp_summary.trim();
      if (summary) return summary;
    } catch {
      // JSON inválido — não exibir
    }
    return null;
  }
  return trimmed;
}

const METRIC_LABELS: Record<string, string> = {
  cycle_median: 'Ciclo de vendas',
  win_rate: 'Taxa de ganho',
  proposal_stagnation_rate: 'Estagnação em proposta',
  abandoned_rate: 'Pipeline abandonado',
  pipeline_value_open: 'Valor em pipeline',
};

const METRIC_HINTS: Record<string, string> = {
  cycle_median: 'Menor é melhor',
  win_rate: 'Maior é melhor',
  proposal_stagnation_rate: 'Menor é melhor',
  abandoned_rate: 'Menor é melhor',
  pipeline_value_open: 'Maior é melhor',
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
  return `${value.toFixed(0)} dias`;
}

interface MarketComparisonRowProps {
  metric: string;
  diff: BenchmarkMetricDiff;
}

function MarketComparisonRow({ metric, diff }: MarketComparisonRowProps) {
  const label = METRIC_LABELS[metric] ?? metric;
  const hint = METRIC_HINTS[metric];
  const pctDiff = diff.pct_diff_vs_median;

  const isBetter =
    metric === 'win_rate' || metric === 'pipeline_value_open'
      ? pctDiff > 0
      : metric === 'cycle_median' ||
          metric === 'proposal_stagnation_rate' ||
          metric === 'abandoned_rate'
        ? pctDiff < 0
        : pctDiff > 0;

  const positionLabel =
    diff.percentile === 'above'
      ? 'Acima da mediana do mercado'
      : diff.percentile === 'below'
        ? 'Abaixo da mediana do mercado'
        : 'Na mediana do mercado';

  const Icon = pctDiff === 0 ? Minus : isBetter ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-5 transition-all hover:bg-slate-50/50">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-900">{label}</p>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
        <div
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium',
            pctDiff === 0
              ? 'bg-slate-100 text-slate-600'
              : isBetter
                ? 'bg-teal-50 text-teal-700'
                : 'bg-amber-50 text-amber-700'
          )}
        >
          <Icon className="h-4 w-4" />
          {pctDiff > 0 ? '+' : ''}
          {pctDiff.toFixed(1)}%
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Você
          </p>
          <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">
            {formatMetricValue(metric, diff.org_value)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Mercado (mediana)
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-600 tabular-nums">
            {formatMetricValue(metric, diff.cluster_median)}
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Faixa P25–P75
          </p>
          <p className="mt-1 text-sm text-slate-600 tabular-nums">
            {formatMetricValue(metric, diff.cluster_p25)} – {formatMetricValue(metric, diff.cluster_p75)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="relative h-2.5 flex-1 rounded-full bg-slate-200 overflow-hidden">
          {/* Faixa mercado P25–P75 */}
          <div
            className="absolute inset-y-0 rounded-full bg-slate-300/80"
            style={{ left: '25%', width: '50%' }}
          />
          {/* Marcador: você — posição baseada em percentil */}
          <div
            className="absolute top-0 bottom-0 w-2.5 rounded-full bg-indigo-500 shadow-sm z-10 -ml-px"
            style={{
              left: `${diff.percentile === 'above' ? 72 : diff.percentile === 'below' ? 23 : 48}%`,
            }}
            title={positionLabel}
          />
        </div>
        <span className="text-xs font-medium text-slate-500 shrink-0">
          P{diff.percentile === 'above' ? '75' : diff.percentile === 'below' ? '25' : '50'}
        </span>
      </div>

      <p className="mt-2 text-xs text-slate-600">{positionLabel}</p>
    </div>
  );
}

interface RevenuePositioningProps {
  benchmark: BenchmarkCompanyResponse | null;
  loading?: boolean;
  fallbackIcpSummary?: string | null;
  fallbackMetrics?: {
    win_rate?: number | null;
    avg_deal_value?: number | null;
    formatCurrency?: (n: number) => string;
  } | null;
}

export function RevenuePositioning({
  benchmark,
  loading,
  fallbackIcpSummary,
  fallbackMetrics,
}: RevenuePositioningProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
            <BarChart3 className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Posicionamento no Mercado
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Carregando comparativo...
            </p>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-slate-100"
              style={{ animationDelay: `${i * 80}ms` }}
            />
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
    const parsedSummary = parseFallbackSummary(fallbackIcpSummary);
    const hasFallback = parsedSummary || fallbackMetrics;
    const message =
      benchmark?.status === 'insufficient_peers'
        ? 'Poucos pares no segmento (mín. 5 empresas). Dados não exibidos por privacidade.'
        : benchmark?.status === 'no_data'
          ? 'Sem dados suficientes para benchmark.'
          : benchmark?.message || null;

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
            <Target className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Posicionamento no Mercado
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Comparativo com empresas do seu segmento
            </p>
          </div>
        </div>

        {hasFallback ? (
          <div className="mt-6 space-y-4">
            {message && (
              <p className="text-sm text-slate-500">{message}</p>
            )}
            {fallbackMetrics && (fallbackMetrics.win_rate != null || fallbackMetrics.avg_deal_value != null) && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {fallbackMetrics.win_rate != null && (
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Taxa de ganho
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
                        {(fallbackMetrics.win_rate * 100).toFixed(0)}%
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Você · Referência B2B: 20–40%
                      </p>
                    </div>
                  )}
                  {fallbackMetrics.avg_deal_value != null && fallbackMetrics.formatCurrency && (
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Ticket médio
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
                        {fallbackMetrics.formatCurrency(fallbackMetrics.avg_deal_value)}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Você · Compare com empresas similares
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  Ative o serviço de IA e complete o setup para ver comparativo completo vs mercado.
                </p>
              </div>
            )}
            {parsedSummary && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600/80">
                  Insight do seu perfil (ICP)
                </p>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">
                  {parsedSummary}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            {message || 'Complete o setup e gere relatórios para ver como você se posiciona no mercado.'}
          </p>
        )}
      </div>
    );
  }

  const entries = Object.entries(benchmark.diffs);
  const nOrgs = entries[0] ? (Object.values(benchmark.diffs!)[0] as BenchmarkMetricDiff)?.n_orgs : 0;

  const interpretationLine = (() => {
    const below = entries.find(([, d]) => d.percentile === 'below');
    const above = entries.find(([, d]) => d.percentile === 'above');
    const labelWin = METRIC_LABELS.win_rate ?? 'Taxa de ganho';
    const labelCycle = METRIC_LABELS.cycle_median ?? 'Ciclo';
    if (below && below[0] === 'win_rate') return `Abaixo da mediana em ${labelWin} — oportunidade de ganho.`;
    if (above && above[0] === 'cycle_median') return `Ciclo acima da mediana — oportunidade de redução.`;
    if (below) return `Abaixo da mediana em ${METRIC_LABELS[below[0]] ?? below[0]} — oportunidade de melhoria.`;
    if (above) return `Acima da mediana em ${METRIC_LABELS[above[0]] ?? above[0]} — revise práticas.`;
    return null;
  })();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
            <BarChart3 className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Posicionamento no Mercado
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Seu desempenho vs {nOrgs} empresas do seu segmento
            </p>
            {interpretationLine && (
              <p className="mt-1.5 text-sm font-medium text-indigo-700">
                {interpretationLine}
              </p>
            )}
          </div>
        </div>
        {benchmark.percentile_cycle != null && (
          <div className="rounded-lg bg-indigo-50 px-3 py-1.5">
            <p className="text-xs font-medium text-indigo-600">Ciclo vs mercado</p>
            <p className="text-lg font-bold text-indigo-700 tabular-nums">
              P{benchmark.percentile_cycle}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-4">
        {entries.map(([metric, diff]) => (
          <MarketComparisonRow key={metric} metric={metric} diff={diff} />
        ))}
      </div>
    </div>
  );
}
