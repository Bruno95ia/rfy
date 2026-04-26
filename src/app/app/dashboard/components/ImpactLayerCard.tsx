'use client';

import type { SuphoPillar } from '@/types/rfy-impact';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type ImpactSummaryProps = {
  rfyScore: number;
  revenueDeclared: number;
  revenueReliable: number;
  revenueInflated: number;
  revenueAtRisk: number;
  revenueRecoverable: number;
  totalFriction: number;
  topImpactDrivers: Array<{ pillar: SuphoPillar; label: string; loss: number }>;
  forecastCurrent: number;
  forecastOptimized: number;
  narrative: string;
  narrativeSecondary: string;
  formatCurrency: (n: number) => string;
};

const PILLAR_SHORT: Record<SuphoPillar, string> = {
  culture: 'Cultura',
  commercial: 'Comercial',
  leadership: 'Liderança',
};

export function ImpactLayerCard({
  rfyScore,
  revenueDeclared,
  revenueReliable,
  revenueInflated,
  revenueAtRisk,
  revenueRecoverable,
  totalFriction,
  topImpactDrivers,
  forecastCurrent,
  forecastOptimized,
  narrative,
  narrativeSecondary,
  formatCurrency,
}: ImpactSummaryProps) {
  return (
    <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-[var(--color-text)]">
          Revenue Impact Engine
        </CardTitle>
        <p className="text-sm text-[var(--color-text-muted)]">
          SUPHO → fricção → receita confiável / inflada → PAIP → forecast otimizado (analítico).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-[var(--color-text)]">{narrative}</p>
        <p className="text-xs text-[var(--color-text-muted)]">{narrativeSecondary}</p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              Score RFY (0–1)
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--color-text)]">
              {rfyScore.toFixed(3)}
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              Receita confiável (Rc)
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-teal-700">
              {formatCurrency(revenueReliable)}
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              Receita inflada (Ri)
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-amber-700">
              {formatCurrency(revenueInflated)}
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              Recuperável
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--color-success)]">
              {formatCurrency(revenueRecoverable)}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              Declarada (Pd)
            </p>
            <p className="mt-1 text-base font-semibold tabular-nums text-[var(--color-text)]">
              {formatCurrency(revenueDeclared)}
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              Risco estrutural (Pd × F)
            </p>
            <p className="mt-1 text-base font-semibold tabular-nums text-[var(--color-text)]">
              {formatCurrency(revenueAtRisk)}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Fricção total: {(totalFriction * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Top 3 drivers de fricção
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[var(--color-text)]">
            {topImpactDrivers.map((d) => (
              <li key={d.pillar}>
                {d.label}: {(d.loss * 100).toFixed(0)}% ({PILLAR_SHORT[d.pillar]})
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-primary)]/40 bg-[var(--color-primary-soft)]/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Forecast: atual (IA) vs otimizado (modelo RFY)
          </p>
          <div className="mt-2 flex flex-wrap items-baseline gap-4 text-sm">
            <span className="text-[var(--color-text-muted)]">
              Atual (pipeline × modelo):{' '}
              <span className="font-semibold text-[var(--color-text)]">{formatCurrency(forecastCurrent)}</span>
            </span>
            <span aria-hidden className="text-[var(--color-text-muted)]">
              →
            </span>
            <span className="text-[var(--color-text-muted)]">
              Otimizado (B×(1−F)×G×H×(1+0,3×exec)):{' '}
              <span className="font-semibold text-[var(--color-primary)]">{formatCurrency(forecastOptimized)}</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
