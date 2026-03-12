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
  /** Card 15–20% maior (Forecast) */
  emphasized?: boolean;
  className?: string;
}

const variantStyles = {
  default:
    'border-slate-200 bg-white transition-colors hover:border-slate-300',
  warning:
    'border-amber-100 bg-amber-50/40 transition-colors hover:border-amber-200',
  success:
    'border-teal-100 bg-teal-50/40 transition-colors hover:border-teal-200',
  muted:
    'border-slate-100 bg-slate-50/40 transition-colors hover:border-slate-200',
};

const iconStyles = {
  default: 'bg-indigo-50 text-indigo-600',
  warning: 'bg-amber-50 text-amber-600',
  success: 'bg-teal-50 text-teal-600',
  muted: 'bg-slate-50 text-slate-600',
};

function ExecutiveCardInner({
  label,
  value,
  icon: Icon,
  variant = 'default',
  subtitle,
  delta,
  emphasized,
}: Omit<ExecutiveCardProps, 'className'>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm',
        emphasized ? 'sm:p-7' : 'p-6',
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-lg',
            emphasized ? 'h-10 w-10' : 'h-9 w-9',
            iconStyles[variant]
          )}
        >
          <Icon className={emphasized ? 'h-5 w-5' : 'h-4 w-4'} aria-hidden />
        </div>
      </div>
      <p
        className={cn(
          'mt-3 font-bold tracking-tight text-slate-900 tabular-nums',
          emphasized ? 'text-3xl' : 'text-2xl'
        )}
      >
        {value}
      </p>
      {delta && (
        <div
          className={cn(
            'mt-1.5 inline-flex items-center text-xs font-medium tabular-nums',
            delta.positive ? 'text-teal-600' : 'text-amber-600'
          )}
        >
          {delta.positive ? '▲' : '▼'} {delta.value} vs última leitura
        </div>
      )}
      {subtitle && (
        <p
          className={cn(
            'mt-2 text-slate-500 max-w-[220px]',
            emphasized ? 'text-sm' : 'text-xs'
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

export interface ExecutivePanelProps {
  revenueHealthScore: number;
  forecastValue: string;
  forecastSubtext?: string;
  forecastDelta?: { value: string; positive: boolean };
  receitaRisco: string;
  receitaAntecipavel: string;
  icons: {
    target: LucideIcon;
    alert: LucideIcon;
    wallet: LucideIcon;
  };
}

/** Revenue Health Score: nunca 0%, sempre escala 0–100 */
function formatRevenueHealthScore(score: number): string {
  const val = Math.min(100, Math.max(0, Math.round(score)));
  if (val < 40) {
    return `Saúde operacional baixa (${val}/100)`;
  }
  return `${val}%`;
}

export function ExecutivePanel({
  revenueHealthScore,
  forecastValue,
  forecastSubtext,
  forecastDelta,
  receitaRisco,
  receitaAntecipavel,
  icons: { target, alert, wallet },
}: ExecutivePanelProps) {
  const healthDisplay = formatRevenueHealthScore(revenueHealthScore);

  return (
    <section>
      <h2 className="sr-only">Painel executivo — Receita Confiável (30d), Receita Inflada, Receita Recuperável, Saúde do pipeline</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ExecutiveCardInner
          label="Receita Confiável (30 dias)"
          value={forecastValue}
          icon={target}
          variant="muted"
          subtitle={forecastSubtext}
          delta={forecastDelta}
          emphasized
        />
        <ExecutiveCardInner
          label="Receita Inflada"
          value={receitaRisco}
          icon={alert}
          variant="warning"
          subtitle="Valor em risco / distorção — pode não materializar"
        />
        <ExecutiveCardInner
          label="Receita Recuperável"
          value={receitaAntecipavel}
          icon={wallet}
          variant="success"
          subtitle="~30% de deals com atraso"
        />
        <ExecutiveCardInner
          label="Saúde do pipeline"
          value={healthDisplay}
          icon={target}
          variant="default"
          subtitle="Melhore higiene e pós-proposta para aumentar o RFY"
        />
      </div>
    </section>
  );
}
