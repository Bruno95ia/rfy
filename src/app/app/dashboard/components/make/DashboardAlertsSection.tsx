import { AlertTriangle, Bell, Info, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { cn } from '@/lib/cn';

interface AlertItem {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  metricLabel: string;
}

interface DashboardAlertsSectionProps {
  alerts: AlertItem[];
  onResolve: (id: string) => void;
  className?: string;
}

const severityStyle = {
  critical: {
    icon: AlertTriangle,
    badge: 'danger' as const,
    label: 'Crítico',
    panel: 'border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)]/35',
  },
  warning: {
    icon: Bell,
    badge: 'warning' as const,
    label: 'Atenção',
    panel: 'border-[var(--color-warning-soft)] bg-[var(--color-warning-soft)]/35',
  },
  info: {
    icon: Info,
    badge: 'default' as const,
    label: 'Informação',
    panel: 'border-[var(--color-border)] bg-[var(--color-surface-muted)]',
  },
};

export function DashboardAlertsSection({ alerts, onResolve, className }: DashboardAlertsSectionProps) {
  return (
    <section
      id="alerts"
      className={cn(
        'space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] sm:p-5',
        className
      )}
    >
      <SectionHeader
        title="Alertas"
        subtitle="Situações que exigem ação para proteger Receita Confiável."
      />

      {alerts.length === 0 && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-success-soft)] bg-[var(--color-success-soft)]/35 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-surface)]">
              <ShieldCheck className="h-5 w-5 text-[var(--color-success)]" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">Nenhum alerta aberto</p>
              <p className="text-sm text-[var(--color-text-muted)]">Todos os indicadores estão dentro da faixa esperada.</p>
            </div>
          </div>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const style = severityStyle[alert.severity];
            const Icon = style.icon;
            return (
              <article
                key={alert.id}
                className={cn('space-y-3 rounded-[var(--radius-md)] border p-4', style.panel)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-surface)]">
                      <Icon className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden />
                    </div>
                    <p className="truncate text-sm font-semibold text-[var(--color-text)]">{alert.title}</p>
                  </div>
                  <Badge variant={style.badge}>{style.label}</Badge>
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">{alert.description}</p>
                <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3">
                  <span className="text-xs text-[var(--color-text-muted)]">{alert.metricLabel}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onResolve(alert.id)}
                    aria-label={`Resolver alerta ${alert.title}`}
                  >
                    Resolver
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
