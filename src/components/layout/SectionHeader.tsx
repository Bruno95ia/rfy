import { cn } from '@/lib/cn';

interface SectionHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-[var(--color-text)] sm:text-xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
