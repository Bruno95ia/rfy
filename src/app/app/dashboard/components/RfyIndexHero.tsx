'use client';

import { TrendingUp, Wallet, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface RfyIndexHeroProps {
  /** RFY Index em % (0–100). Receita Confiável / Receita declarada. */
  rfyIndexPct: number | null;
  /** Receita Confiável (30 dias) em R$ formatado */
  receitaConfiável: string;
  /** Receita declarada/esperada em R$ formatado (pipeline em janela 30d ou total) */
  receitaDeclarada: string;
  /** Receita Inflada em R$ formatado (declarada − confiável) */
  receitaInflada: string;
  /** loading state (ex.: IA ainda calculando) */
  loading?: boolean;
  className?: string;
}

/**
 * Hero executivo do dashboard: RFY Index em destaque + Receita Confiável + Receita Inflada + Evolução 90d.
 * Alinhado ao posicionamento "Sistema de Governança de Receita baseado no RFY Index".
 */
export function RfyIndexHero({
  rfyIndexPct,
  receitaConfiável,
  receitaDeclarada,
  receitaInflada,
  loading = false,
  className,
}: RfyIndexHeroProps) {
  const hasRfyIndex = rfyIndexPct != null && !Number.isNaN(rfyIndexPct);
  const safePct =
    hasRfyIndex && rfyIndexPct != null
      ? Math.max(0, Math.min(100, rfyIndexPct))
      : 0;
  const progressStyle = {
    background: `conic-gradient(#4f46e5 ${safePct * 3.6}deg, #e2e8f0 0deg)`,
  };

  return (
    <section
      aria-label="Control Tower de Receita — RFY Index"
      className={cn('h-full', className)}
    >
      <div className="relative h-full overflow-hidden rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_85%_-20%,rgba(99,102,241,0.14),transparent_42%),linear-gradient(160deg,#ffffff_0%,#f8faff_100%)] p-6 shadow-sm sm:p-7">
        <div className="grid h-full gap-6 xl:grid-cols-[220px_1fr] xl:items-center">
          <div className="mx-auto w-fit xl:mx-0">
            <div className="relative h-40 w-40 rounded-full p-2" style={progressStyle}>
              <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600">
                  RFY
                </span>
                {loading ? (
                  <span className="mt-1 text-3xl font-bold text-slate-400">...</span>
                ) : hasRfyIndex ? (
                  <span className="mt-1 text-4xl font-bold tracking-tight text-slate-900 tabular-nums">
                    {Math.round(rfyIndexPct)}%
                  </span>
                ) : (
                  <span className="mt-1 text-3xl font-bold tracking-tight text-slate-400">—%</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600">
                Receita confiável em 30 dias
              </p>
              <p className="mt-1 text-lg leading-relaxed text-slate-700">
                Índice calculado com comportamento real do pipeline, sem depender da data de fechamento declarada no CRM.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                <div className="flex items-center gap-2 text-emerald-700">
                  <Wallet className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                    Receita Confiável
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold text-emerald-900 tabular-nums">
                  {loading ? '—' : receitaConfiável}
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                    Receita Inflada
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold text-amber-900 tabular-nums">
                  {loading ? '—' : receitaInflada}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Referência declarada
              </p>
              <p className="mt-1 text-sm font-medium text-slate-800">
                {receitaDeclarada}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500">
                <TrendingUp className="h-3.5 w-3.5" />
                Evolução 90 dias em implementação
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
