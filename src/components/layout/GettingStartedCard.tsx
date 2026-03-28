import Link from 'next/link';
import { Upload, ClipboardList, Settings, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';

const steps = [
  {
    href: '/app/uploads',
    label: 'Carregar pipeline',
    description: 'CSV de oportunidades para RFY e relatórios.',
    icon: Upload,
  },
  {
    href: '/app/supho/diagnostico',
    label: 'Diagnóstico SUPHO',
    description: 'Maturidade e pilares num só lugar.',
    icon: ClipboardList,
  },
  {
    href: '/app/settings',
    label: 'Configurar organização',
    description: 'Integração CRM, alertas e parâmetros.',
    icon: Settings,
  },
] as const;

export function GettingStartedCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)]',
        className
      )}
    >
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Primeiros passos
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[var(--color-text)]">
          Por onde começar
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Três passos para ativar a Torre de Controle e o SUPHO com dados reais.
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map(({ href, label, description, icon: Icon }) => (
          <li key={href} className="min-w-0">
            <Link
              href={href}
              className="group flex h-full min-h-[11rem] flex-col rounded-xl border border-transparent bg-[var(--color-surface-muted)]/80 p-4 transition-all hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-muted)]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="mt-3 font-medium leading-snug text-[var(--color-text)]">{label}</span>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
                {description}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)]">
                Abrir
                <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
