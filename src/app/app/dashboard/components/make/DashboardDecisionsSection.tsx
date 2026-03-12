import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { cn } from '@/lib/cn';

interface DecisionItem {
  id: string;
  title: string;
  impact: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  valueLabel: string;
}

interface DashboardDecisionsSectionProps {
  decisions: DecisionItem[];
  className?: string;
}

const priorityVariant = {
  high: 'danger',
  medium: 'warning',
  low: 'default',
} as const;

const priorityLabel = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
} as const;

const priorityTone = {
  high: 'border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)]/35',
  medium: 'border-[var(--color-warning-soft)] bg-[var(--color-warning-soft)]/35',
  low: 'border-[var(--color-border)] bg-[var(--color-surface-muted)]',
} as const;

export function DashboardDecisionsSection({ decisions, className }: DashboardDecisionsSectionProps) {
  return (
    <section
      id="decisions"
      className={cn(
        'space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] sm:p-5',
        className
      )}
    >
      <SectionHeader
        title="Top 3 decisões"
        subtitle="Ações com maior impacto para aumentar Receita Confiável e reduzir Distorção."
        action={
          <Button asChild size="sm" variant="outline">
            <a href="#intervencoes" aria-label="Ir para intervenções prioritárias">
              Ver intervenções
            </a>
          </Button>
        }
      />

      {decisions.length === 0 && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-6 py-10 text-sm text-[var(--color-text-muted)]">
          Nenhuma decisão priorizada no momento.
        </div>
      )}

      {decisions.length > 0 && (
        <ol className="space-y-3" aria-label="Lista de decisões prioritárias">
          {decisions.map((decision, index) => (
            <li
              key={decision.id}
              className={cn(
                'rounded-[var(--radius-md)] border p-4',
                priorityTone[decision.priority]
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-text)]">
                      {index + 1}
                    </span>
                    <p className="text-sm font-semibold text-[var(--color-text)] sm:text-base">
                      {decision.title}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">{decision.impact}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={priorityVariant[decision.priority]}>
                    {priorityLabel[decision.priority]}
                  </Badge>
                  <Badge variant="outline">{decision.valueLabel}</Badge>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3">
                <span className="text-xs text-[var(--color-text-muted)]">{decision.category}</span>
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <a href="#intervencoes" aria-label={`Executar ação para ${decision.title}`}>
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    Executar
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </a>
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
