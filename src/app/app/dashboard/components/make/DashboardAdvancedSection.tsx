import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DashboardAdvancedSectionProps {
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  /** Descrição opcional (ex.: para perfil executivo). */
  description?: string;
}

export function DashboardAdvancedSection({
  expanded,
  onToggle,
  children,
  description,
}: DashboardAdvancedSectionProps) {
  return (
    <section
      id="advanced"
      className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--color-text)]">Análises avançadas</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {description ?? 'Bloco detalhado para contexto analítico e governança operacional.'}
          </p>
        </div>
        <Button
          type="button"
          onClick={onToggle}
          variant="outline"
          className="gap-1.5"
          aria-expanded={expanded}
          aria-label={expanded ? 'Recolher análises avançadas' : 'Expandir análises avançadas'}
        >
          {expanded ? 'Recolher' : 'Expandir'}
          {expanded ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
        </Button>
      </div>

      {!expanded && (
        <div className="grid gap-3 sm:grid-cols-3" aria-hidden>
          <div className="h-16 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-muted)]" />
          <div className="h-16 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-muted)]" />
          <div className="h-16 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-muted)]" />
        </div>
      )}

      {expanded && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Painel avançado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 pt-0">{children}</CardContent>
        </Card>
      )}
    </section>
  );
}
