import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/cn';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  delta?: { value: number; label?: string };
  variant?: 'default' | 'warning';
  className?: string;
}

export function StatCard({ label, value, icon: Icon, delta, variant = 'default', className }: StatCardProps) {
  const isPositive = delta && delta.value > 0;
  const isNegative = delta && delta.value < 0;
  const isWarning = variant === 'warning';

  return (
    <Card
      className={cn(
        'overflow-hidden border border-[var(--color-border)] shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--color-border-strong)]',
        isWarning &&
          'border-[var(--color-warning-soft)] bg-[var(--color-warning-soft)]',
        className
      )}
    >
      <CardHeader className="pb-1 pt-5">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg',
              isWarning ? 'bg-[var(--color-warning-soft)]' : 'bg-[var(--color-primary-soft)]'
            )}>
              <Icon className={cn(
                'h-4 w-4',
                isWarning ? 'text-[var(--color-warning-foreground)]' : 'text-[var(--color-primary)]'
              )} aria-hidden />
            </div>
          )}
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{label}</span>
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <p className="text-2xl font-semibold tracking-tight text-[var(--color-text)] tabular-nums">
          {value}
        </p>
        {delta !== undefined && (
          <p
            className={cn(
              'mt-2 text-xs font-medium',
              isPositive && 'text-[var(--color-success)]',
              isNegative && 'text-[var(--color-danger)]',
              !isPositive && !isNegative && 'text-[var(--color-text-muted)]'
            )}
          >
            {isPositive && '+'}
            {delta.value}% {delta.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
