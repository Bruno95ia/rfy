import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  breadcrumbs = [],
  title,
  subtitle,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('space-y-5', className)}>
      {breadcrumbs.length > 0 && (
        <nav
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] shadow-[var(--shadow-sm)]"
          aria-label="Breadcrumb"
        >
          {breadcrumbs.map((item, i) => (
            <span key={item.label + String(i)} className="flex items-center gap-1.5">
              {i > 0 && (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]/70" />
              )}
              {item.href ? (
                <Link
                  href={item.href}
                  className="transition-colors hover:text-[var(--color-text)]"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="font-medium text-[var(--color-text)]">{item.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[clamp(1.5rem,4vw,1.875rem)] font-bold tracking-[-0.02em] text-[var(--color-text)]">
            {title}
          </h1>
          {subtitle && (
            <div className="mt-2 max-w-[42rem] text-sm leading-[1.65] text-[var(--color-text-muted)]">
              {subtitle}
            </div>
          )}
        </div>
        {actions && (
          <div className="mt-1 flex shrink-0 flex-wrap items-center gap-2 sm:mt-0">{actions}</div>
        )}
      </div>
    </header>
  );
}
