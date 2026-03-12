import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/cn';

interface DashboardKpiItem {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  badgeText?: string;
  badgeVariant?: BadgeProps['variant'];
  tone?: 'primary' | 'success' | 'warning' | 'neutral';
  spanClass?: string;
}

interface DashboardKpiGridProps {
  items: DashboardKpiItem[];
}

export function DashboardKpiGrid({ items }: DashboardKpiGridProps) {
  const toneStyles = {
    primary:
      'border-[var(--color-primary-soft)] bg-[var(--color-primary-soft)]/50',
    success:
      'border-[var(--color-success-soft)] bg-[var(--color-success-soft)]/40',
    warning:
      'border-[var(--color-warning-soft)] bg-[var(--color-warning-soft)]/45',
    neutral: 'border-[var(--color-border)] bg-[var(--color-surface)]',
  } as const;

  const toneIconStyles = {
    primary:
      'bg-[var(--color-primary-soft)] text-[var(--color-primary)]',
    success:
      'bg-[var(--color-success-soft)] text-[var(--color-success)]',
    warning:
      'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
    neutral: 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]',
  } as const;

  return (
    <section
      className="grid grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12"
      aria-label="Indicadores principais"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const tone = item.tone ?? 'neutral';
        return (
          <Card
            key={item.title}
            className={cn(
              'md:col-span-3 xl:col-span-3',
              toneStyles[tone],
              item.spanClass
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  {item.title}
                </p>
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)]',
                    toneIconStyles[tone]
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <p className="text-2xl font-semibold tabular-nums text-[var(--color-text)]">{item.value}</p>
              <p className="text-sm text-[var(--color-text-muted)]">{item.subtitle}</p>
              {item.badgeText && (
                <Badge variant={item.badgeVariant ?? 'default'}>{item.badgeText}</Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
