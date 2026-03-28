'use client';

import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Upload,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  Gauge,
  Target,
  Calendar,
  Award,
  ClipboardList,
  Plug,
  TrendingUp,
  Users,
  Package,
  Library,
  Bot,
  Building2,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Mostrar um rótulo de grupo acima deste item (secção Data). */
  groupBefore?: string;
}

interface NavCategory {
  category: string;
  items: NavItem[];
}

const navItems: NavCategory[] = [
  {
    category: 'Torre de Controle',
    items: [
      { href: '/app/dashboard', label: 'Receita (RFY)', icon: LayoutDashboard },
    ],
  },
  {
    category: 'Performance',
    items: [
      { href: '/app/reports', label: 'Relatórios', icon: BarChart3 },
      { href: '/app/forecast', label: 'Previsão', icon: TrendingUp },
      { href: '/app/ai', label: 'Inteligência IA', icon: Sparkles },
      { href: '/app/copilot-contas', label: 'Copiloto de contas', icon: Bot },
    ],
  },
  {
    category: 'SUPHO',
    items: [
      { href: '/app/supho/diagnostico', label: 'Diagnóstico', icon: ClipboardList },
      { href: '/app/supho/maturidade', label: 'Painel de Maturidade', icon: Gauge },
      { href: '/app/supho/paip', label: 'PAIP', icon: Target },
      { href: '/app/supho/rituais', label: 'Rituais', icon: Calendar },
      { href: '/app/supho/certificacao', label: 'Certificação', icon: Award },
    ],
  },
  {
    category: 'Data',
    items: [
      { href: '/app/uploads', label: 'Uploads', icon: Upload },
      { href: '/app/pessoas', label: 'Pessoas', icon: Users },
      { href: '/app/integracoes', label: 'Integrações', icon: Plug },
      {
        href: '/app/settings',
        label: 'Configurações',
        icon: Settings,
        groupBefore: 'Organização',
      },
      {
        href: '/app/settings/contexto-organizacao',
        label: 'Contexto da organização',
        icon: Building2,
      },
      { href: '/app/settings/context-pack', label: 'Context Pack', icon: Package },
      { href: '/app/settings/conhecimento', label: 'Conhecimento', icon: Library },
    ],
  },
];

/** Itens do menu em lista plana (para resolver rota ativa com prefixos sobrepostos). */
const flatNavItems = navItems.flatMap(({ items }) => items);

function getInitials(email: string) {
  const part = email.split('@')[0] ?? '';
  return part.slice(0, 2).toUpperCase();
}

interface AppShellProps {
  userEmail: string;
  orgName?: string;
  children: React.ReactNode;
  /** Se AI está ativo (para badge na topbar) */
  aiActive?: boolean;
}

export function AppShell({
  userEmail,
  orgName = 'Minha organização',
  children,
  aiActive = false,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname() ?? '';
  /** Prefere a rota mais específica (ex.: /app/settings/conhecimento e não só /app/settings). */
  const activeNavItem = useMemo(() => {
    if (!pathname) return null;
    const matches = flatNavItems.filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    );
    if (matches.length === 0) return null;
    return [...matches].sort((a, b) => b.href.length - a.href.length)[0] ?? null;
  }, [pathname]);

  const isUploadsPage = pathname.startsWith('/app/uploads');

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[var(--color-overlay)] backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-full min-h-0 w-[260px] shrink-0 flex-col transform border-r border-[var(--color-border)] bg-[var(--color-surface)] shadow-[2px_0_24px_-4px_rgba(15,23,42,0.06)] transition-all duration-300 ease-out dark:shadow-[2px_0_24px_-4px_rgba(0,0,0,0.25)] lg:relative lg:h-auto lg:min-h-screen lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4">
          <Link
            href="/app/dashboard"
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
          >
            <Logo variant="primary" size={28} className="shrink-0" />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold tracking-tight text-[var(--color-text)]">
                RFY
              </span>
              <span className="text-[11px] font-medium text-[var(--color-text-muted)]">Torre de Controle</span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden p-3"
          aria-label="Navegação principal"
        >
          {navItems.map(({ category, items }) => (
            <div key={category} className="mb-4">
              <p className="mb-0.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                {category}
              </p>
              {category === 'SUPHO' && (
                <p className="mb-1.5 px-2.5 text-[10px] text-[var(--color-text-muted)]">
                  Maturidade organizacional
                </p>
              )}
              {category === 'Data' && (
                <p className="mb-1.5 px-2.5 text-[10px] text-[var(--color-text-muted)]">
                  Dados e definições da organização
                </p>
              )}
              <div className="space-y-0.5">
                {items.map(({ href, label, icon: Icon, groupBefore }) => {
                    const isActive = activeNavItem?.href === href;
                    return (
                      <Fragment key={href}>
                        {groupBefore && (
                          <p className="mb-0.5 mt-2.5 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                            {groupBefore}
                          </p>
                        )}
                        <Link
                          href={href}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                            isActive
                              ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-[var(--shadow-sm)]'
                              : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]'
                          )}
                        >
                          <Icon
                            className={cn(
                              'h-[18px] w-[18px] shrink-0',
                              isActive && 'text-[var(--color-primary)]'
                            )}
                          />
                          {label}
                        </Link>
                      </Fragment>
                    );
                  }
                )}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-[var(--color-border)] p-3">
          <div className="rounded-xl bg-[var(--color-surface-muted)] px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Organização
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-[var(--color-text)]">
              {orgName}
            </p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-14 shrink-0 flex-wrap items-center gap-x-2 gap-y-2 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] px-4 py-2 shadow-[var(--shadow-sm)] backdrop-blur-[12px] sm:h-14 sm:flex-nowrap sm:gap-3 sm:py-0 lg:px-6 dark:bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)]">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="shrink-0 rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1 sm:hidden">
            <p className="truncate text-center text-sm font-semibold text-[var(--color-text)]">
              {activeNavItem?.label ?? 'Painel'}
            </p>
          </div>

          <div className="hidden min-w-0 flex-1 sm:block">
            <p className="truncate text-sm font-semibold leading-tight text-[var(--color-text)]">
              {activeNavItem?.label ?? 'Painel'}
            </p>
            <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">{orgName}</p>
          </div>

          <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-2 sm:flex-nowrap">
              {!aiActive && (
                <span className="hidden items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-muted)] sm:inline-flex">
                  <Sparkles className="h-3.5 w-3.5 opacity-70" />
                  AI em configuração
                </span>
              )}
              {aiActive && (
                <span
                  className="hidden items-center gap-1.5 rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-primary)] sm:inline-flex"
                  title="AI ativo — insights e forecast disponíveis"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  AI ativo
                </span>
              )}

              <Button
                asChild
                variant={isUploadsPage ? 'outline' : 'default'}
                size="sm"
                className="shrink-0 font-semibold shadow-[var(--shadow-sm)]"
              >
                <Link href="/app/uploads">
                  <Upload className="h-4 w-4" />
                  Upload CSV
                </Link>
              </Button>

              <ThemeToggle />

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-sm transition-all hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-muted)] hover:shadow-[var(--shadow-sm)]"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-xs font-semibold text-[var(--color-primary)]">
                    {getInitials(userEmail)}
                  </div>
                  <span className="hidden max-w-[120px] truncate text-left text-[var(--color-text-muted)] sm:inline">
                    {userEmail}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                </button>
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                      aria-hidden="true"
                    />
                    <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-lg)] ring-1 ring-black/5 dark:ring-white/10">
                      <div className="px-3 py-2">
                        <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                          Conta
                        </p>
                        <p className="mt-1 truncate text-sm font-medium text-[var(--color-text)]">
                          {userEmail}
                        </p>
                        <p className="truncate text-xs text-[var(--color-text-muted)]">
                          {orgName}
                        </p>
                      </div>
                      <div className="my-1 h-px bg-[var(--color-border)]" />
                      <form action="/api/auth/signout" method="post">
                        <button
                          type="submit"
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
                        >
                          <LogOut className="h-4 w-4 shrink-0" />
                          Sair
                        </button>
                      </form>
                    </div>
                  </>
                )}
              </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-x-hidden px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full min-w-0 max-w-[1200px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
