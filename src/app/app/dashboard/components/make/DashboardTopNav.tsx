import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';

interface DashboardTopNavLink {
  href: string;
  label: string;
}

interface DashboardTopNavProps {
  links: DashboardTopNavLink[];
}

export function DashboardTopNav({ links }: DashboardTopNavProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={[
        'sticky top-3 z-20 rounded-[var(--radius-lg)] px-4 py-3 transition-all duration-200',
        isScrolled
          ? 'border border-[var(--color-border)] bg-[var(--color-surface)]/95 shadow-[var(--shadow-md)] backdrop-blur'
          : 'border border-transparent bg-transparent',
      ].join(' ')}
      aria-label="Navegação rápida do dashboard"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary-soft)]">
            <TrendingUp className="h-4 w-4 text-[var(--color-primary)]" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">RFY</p>
            <p className="text-xs text-[var(--color-text-muted)]">Receita Confiável</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-label={`Ir para ${link.label}`}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
