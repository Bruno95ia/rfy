'use client';

import { Zap } from 'lucide-react';
import { InterventionCard } from './InterventionCard';
import type { DealRow } from './revenue-engine';

export type Intervencao = {
  id: string;
  acao: string;
  cliente: string;
  valor: number;
  diasParado: number;
  etapa: string;
  deal?: DealRow;
  /** Impact Score da API (priorização por impacto financeiro); usado no card quando disponível */
  impact_score?: number;
  /** P(win) da API; usado para explicabilidade quando disponível */
  p_win?: number;
  /** Breve rationale da priorização (API) */
  impact_rationale?: string;
};

interface IntervencoesPrioritariasProps {
  intervencoes: Intervencao[];
  formatCurrency: (n: number) => string;
  /** Org ID para previsão por deal (P(win), expected_close_days) via API */
  orgId?: string | null;
}

export function IntervencoesPrioritarias({
  intervencoes,
  formatCurrency,
  orgId = null,
}: IntervencoesPrioritariasProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.005]">
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
          <Zap className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">
            Intervenções prioritárias
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Onde atuar para aumentar o RFY — ordenado por impacto financeiro (maior primeiro)
          </p>
        </div>
      </div>

      {intervencoes.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
          Nenhuma intervenção prioritária no momento. Revise deals em risco ou faça um novo upload para atualizar.
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {intervencoes.slice(0, 6).map((i) => (
            <InterventionCard
              key={i.id}
              intervencao={i}
              formatCurrency={formatCurrency}
              rank={intervencoes.indexOf(i) + 1}
              orgId={orgId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
