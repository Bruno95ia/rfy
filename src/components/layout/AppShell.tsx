'use client';

import { useState } from 'react';
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
      { href: '/app/copilot-contas', label: 'Copiloto de contas', icon: Sparkles },
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
      { href: '/app/settings', label: 'Configurações', icon: Settings },
    ],
  },
];

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
  const pathname = usePathname();
  const activeItem =
    navItems
      .flatMap(({ items }) => items)
      .find((item) => pathname === item.href || pathname.startsWith(item.href + '/')) ?? null;

  return (
    <div className="flex min-h-screen bg-slate-50/40">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[260px] transform border-r border-slate-200/80 bg-white shadow-[2px_0_24px_-4px_rgba(15,23,42,0.06)] transition-all duration-300 ease-out lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
          <Link
            href="/app/dashboard"
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
          >
            <Logo variant="primary" size={28} className="shrink-0" />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold tracking-tight text-slate-900">
                RFY
              </span>
              <span className="text-[11px] font-medium text-slate-500">Torre de Controle</span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col overflow-y-auto p-3" aria-label="Navegação principal">
          {navItems.map(({ category, items }) => (
            <div key={category} className="mb-4">
              <p className="mb-0.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {category}
              </p>
              {category === 'SUPHO' && (
                <p className="mb-1.5 px-2.5 text-[10px] text-slate-400">
                  Maturidade organizacional
                </p>
              )}
              <div className="space-y-0.5">
                {items.map(({ href, label, icon: Icon }) => {
                  const isActive =
                    pathname === href || pathname.startsWith(href + '/');
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      )}
                    >
                      <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-indigo-600')} />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <div className="rounded-xl bg-slate-50/90 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Organização
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-slate-800">
              {orgName}
            </p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-slate-200/80 bg-white/90 px-4 shadow-sm backdrop-blur-md lg:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex flex-1 items-center gap-4">
            <div className="hidden min-w-0 flex-1 sm:block">
              <p className="truncate text-sm font-semibold text-slate-900">
                {activeItem?.label ?? 'Painel'}
              </p>
              <p className="truncate text-xs text-slate-500">
                {orgName}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {!aiActive && (
                <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline-flex">
                  <Sparkles className="h-3.5 w-3.5 text-slate-400" />
                  AI em configuração
                </span>
              )}
              {aiActive && (
                <span
                  className="hidden items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 sm:inline-flex"
                  title="AI ativo — insights e forecast disponíveis"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  AI ativo
                </span>
              )}

              <Link href="/app/uploads">
                <Button size="sm" className="shrink-0 font-medium shadow-sm">
                  <Upload className="h-4 w-4" />
                  Upload CSV
                </Button>
              </Link>

              <ThemeToggle />

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-semibold text-indigo-700">
                    {getInitials(userEmail)}
                  </div>
                  <span className="hidden max-w-[120px] truncate text-left text-slate-600 sm:inline">
                    {userEmail}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                </button>
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                      aria-hidden="true"
                    />
                    <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg ring-1 ring-slate-900/5">
                      <div className="px-3 py-2">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                          Conta
                        </p>
                        <p className="mt-1 truncate text-sm font-medium text-slate-900">
                          {userEmail}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {orgName}
                        </p>
                      </div>
                      <div className="my-1 h-px bg-slate-200" />
                      <form action="/api/auth/signout" method="post">
                        <button
                          type="submit"
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
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
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
