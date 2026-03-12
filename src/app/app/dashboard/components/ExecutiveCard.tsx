'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ExecutiveCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  variant?: 'default' | 'warning' | 'success' | 'muted';
  subtitle?: string;
  delta?: { value: string; positive: boolean };
  className?: string;
}

const variantStyles = {
  default:
    'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all duration-200',
  warning:
    'border-amber-100 bg-white hover:border-amber-200 hover:shadow-md transition-all duration-200',
  success:
    'border-teal-100 bg-white hover:border-teal-200 hover:shadow-md transition-all duration-200',
  muted:
    'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md transition-all duration-200',
};

const iconStyles = {
  default: 'bg-indigo-50 text-indigo-600',
  warning: 'bg-amber-50 text-amber-600',
  success: 'bg-teal-50 text-teal-600',
  muted: 'bg-slate-50 text-slate-600',
};

export function ExecutiveCard({
  label,
  value,
  icon: Icon,
  variant = 'default',
  subtitle,
  delta,
  className,
}: ExecutiveCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border bg-white p-6 shadow-sm transition-all duration-200',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            iconStyles[variant]
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
        {value}
      </p>
      {delta && (
        <div
          className={cn(
            'mt-1.5 inline-flex items-center text-xs font-medium tabular-nums',
            delta.positive ? 'text-teal-600' : 'text-amber-600'
          )}
        >
          {delta.positive ? '↑' : '↓'} {delta.value} vs período anterior
        </div>
      )}
      {subtitle && (
        <p className="mt-2 text-xs text-slate-500 max-w-[200px]">{subtitle}</p>
      )}
    </div>
  );
}
