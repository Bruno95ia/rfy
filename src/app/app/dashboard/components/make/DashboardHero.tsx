import { Calendar, Info, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';

interface HeroDecision {
  title: string;
  action: string;
  valueLabel: string;
  priorityLabel: string;
}

interface DashboardHeroProps {
  rfyIndex: number | null;
  /** 'fallback' = estimativa heurística (AI indisponível); 'ai' = forecast do modelo */
  rfySource?: 'ai' | 'fallback' | null;
  variationPct: number | null;
  lastUpdated: string | null;
  suphoScore: number | null;
  suphoLabel: string | null;
  benchmarkSummary: string | null;
  metricsVersion: number | null;
  datePreset: string;
  onDatePresetChange: (value: string) => void;
  nextDecision?: HeroDecision | null;
}

export function DashboardHero({
  rfyIndex,
  rfySource = null,
  variationPct,
  lastUpdated,
  suphoScore,
  suphoLabel,
  benchmarkSummary,
  metricsVersion,
  datePreset,
  onDatePresetChange,
  nextDecision = null,
}: DashboardHeroProps) {
  const hasVariation = typeof variationPct === 'number';
  const isPositiveVariation = (variationPct ?? 0) >= 0;

  return (
    <section
      id="overview"
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5 shadow-[var(--shadow-md)] sm:px-6 sm:py-6"
    >
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[linear-gradient(140deg,var(--color-primary-soft)_0%,var(--color-surface)_42%,var(--color-surface)_100%)] p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary" className="gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                RFY Index principal
              </Badge>
              {metricsVersion != null && <Badge variant="outline">Versão v{metricsVersion}</Badge>}
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <p className="text-6xl font-semibold leading-none tracking-tight text-[var(--color-text)] tabular-nums sm:text-7xl">
                {rfyIndex != null ? rfyIndex : '—'}
              </p>
              <span className="mb-2 text-2xl font-semibold text-[var(--color-text-muted)]">%</span>
              <span
                className={cn(
                  'mb-2 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
                  hasVariation
                    ? isPositiveVariation
                      ? 'border-[var(--color-success-soft)] bg-[var(--color-success-soft)] text-[var(--color-success)]'
                      : 'border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                )}
              >
                {hasVariation ? `${isPositiveVariation ? '+' : ''}${variationPct.toFixed(1)}%` : 'Em implementação'}
              </span>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-text-muted)] sm:text-base">
              Indicador central de Receita Confiável para os próximos 30 dias, calculado sem depender da data declarada de fechamento no CRM.
            </p>

            {rfySource === 'fallback' && (
              <p className="mt-2 rounded-md border border-[var(--color-warning)]/40 bg-[var(--color-warning-soft)] px-3 py-2 text-xs text-[var(--color-warning-foreground)]">
                Usando estimativa heurística — IA temporariamente indisponível.
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <span>
                Atualizado:{' '}
                {lastUpdated
                  ? new Date(lastUpdated).toLocaleString('pt-BR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })
                  : '—'}
              </span>
              <span aria-hidden>•</span>
              <span>{benchmarkSummary ?? 'Benchmark em atualização'}</span>
            </div>
          </div>

          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Próxima decisão
            </p>
            {nextDecision ? (
              <div className="mt-2 space-y-2">
                <p className="text-base font-semibold text-[var(--color-text)]">{nextDecision.title}</p>
                <p className="text-sm text-[var(--color-text-muted)]">{nextDecision.action}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{nextDecision.priorityLabel}</Badge>
                  <span className="text-sm font-semibold text-[var(--color-text)]">{nextDecision.valueLabel}</span>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Nenhuma decisão prioritária no momento.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3 xl:col-span-4">
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Período
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden />
              <select
                value={datePreset}
                onChange={(e) => onDatePresetChange(e.target.value)}
                className="h-9 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-sm text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                aria-label="Filtro de período"
              >
                <option value="all">Todo o período</option>
                <option value="7d">7 dias</option>
                <option value="30d">30 dias</option>
                <option value="90d">90 dias</option>
                <option value="thisMonth">Este mês</option>
                <option value="thisQuarter">Trimestre</option>
                <option value="thisYear">Este ano</option>
              </select>
            </div>
          </div>

          <a
            href="/app/supho/maturidade"
            className="block rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary-soft)]/30"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                SUPHO · Maturidade
              </p>
              <Info className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden />
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--color-text)]">
              {suphoScore != null ? Math.round(suphoScore) : '—'}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {suphoLabel ?? 'Maturidade organizacional (ITSMO). Faça o diagnóstico para ver o índice.'}
            </p>
          </a>

          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Leitura rápida
            </p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              RFY alto indica maior probabilidade de conversão confiável; Receita Inflada sinaliza distorção entre declarado e realizável.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
