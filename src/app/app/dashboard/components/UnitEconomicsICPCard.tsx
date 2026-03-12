'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Users,
  DollarSign,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Target,
  BarChart3,
  Upload,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getICPAnalysis, type ICPAnalysisResponse } from '@/lib/aiClient';

export type UnitEconomicsData = {
  ltv_computed: number | null;
  churn_rate: number | null;
  win_rate: number | null;
  avg_deal_value: number | null;
  deals_won_count: number;
  deals_lost_count: number;
  deals_open_count: number;
  cac_manual: number | null;
  ltv_cac_ratio: number | null;
};

type ICPStudyCached = {
  icp_summary: string;
  icp_study_json: Record<string, unknown>;
  generated_at: string;
};

interface UnitEconomicsICPCardProps {
  orgId: string;
  unitEconomics: UnitEconomicsData | null;
  icpCached: ICPStudyCached | null;
  formatCurrency: (n: number) => string;
  onICPGenerated?: (summary: string) => void;
}

/** Extrai texto legível — nunca exibe JSON bruto. */
function parseICPSummary(raw: string | unknown): string {
  if (typeof raw !== 'string') return 'Resumo indisponível.';
  const trimmed = raw.trim();
  if (!trimmed) return 'Resumo indisponível.';

  // Se parece JSON (resposta bruta da IA), tenta extrair icp_summary
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as {
        icp_summary?: string;
        icp_study?: { empresas_analisadas?: Array<{ recomendacao?: string; segmento_inferido?: string; padrao?: string }> };
      };
      const summary = typeof parsed?.icp_summary === 'string' && parsed.icp_summary.trim();
      if (summary) return summary;
      // Fallback: monta resumo a partir dos segmentos
      const segmentos = parsed?.icp_study?.empresas_analisadas ?? [];
      if (segmentos.length > 0) {
        const primeiro = segmentos[0];
        const seg = primeiro?.segmento_inferido ?? primeiro?.padrao;
        const rec = primeiro?.recomendacao;
        const partes = [seg, rec].filter(Boolean);
        if (partes.length > 0) return partes.join('. ');
      }
    } catch {
      // JSON inválido — não exibir conteúdo bruto
    }
    return 'Não foi possível formatar o resumo. Gere novamente o estudo com IA.';
  }

  return trimmed;
}

export function UnitEconomicsICPCard({
  orgId,
  unitEconomics,
  icpCached,
  formatCurrency,
  onICPGenerated,
}: UnitEconomicsICPCardProps) {
  const [icpStudy, setIcpStudy] = useState<ICPAnalysisResponse | null>(
    icpCached
      ? ({
          icp_summary: icpCached.icp_summary,
          icp_study: (icpCached.icp_study_json as ICPAnalysisResponse['icp_study']) ?? {},
          generated_at: icpCached.generated_at,
        } as ICPAnalysisResponse)
      : null
  );
  const [icpLoading, setIcpLoading] = useState(false);
  const [icpError, setIcpError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(() => {
    if (!icpCached?.icp_study_json) return false;
    const arr = (icpCached.icp_study_json as { empresas_analisadas?: unknown[] })?.empresas_analisadas;
    return Array.isArray(arr) && arr.length > 0 && arr.length <= 8;
  });

  const handleGenerateICP = async () => {
    setIcpLoading(true);
    setIcpError(null);
    try {
      const res = await getICPAnalysis(orgId);
      setIcpStudy(res);
      if (res?.icp_summary && onICPGenerated) onICPGenerated(res.icp_summary);
      setExpanded(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao gerar estudo';
      let friendly = msg;
      try {
        const parsed = JSON.parse(msg) as { error?: string };
        if (parsed?.error) friendly = parsed.error;
      } catch {
        // não é JSON
      }
      setIcpError(friendly);
    } finally {
      setIcpLoading(false);
    }
  };

  const ue = unitEconomics;
  const hasData = ue && (ue.deals_won_count > 0 || ue.deals_lost_count > 0);
  const empresasAnalisadas = (icpStudy?.icp_study as { empresas_analisadas?: Array<Record<string, unknown>> })?.empresas_analisadas ?? [];
  const icpSummaryText = icpStudy ? parseICPSummary(icpStudy.icp_summary) : null;
  const hasICP = Boolean(icpSummaryText || empresasAnalisadas.length > 0);

  const icpIndicators = empresasAnalisadas.length > 0
    ? (() => {
        const valores = empresasAnalisadas.map((s) => s.valor_medio as number).filter((v): v is number => typeof v === 'number');
        const winRates = empresasAnalisadas.map((s) => s.win_rate_segmento as number).filter((v): v is number => typeof v === 'number');
        return {
          ticketMedio: valores.length > 0 ? valores.reduce((a, b) => a + b, 0) / valores.length : null,
          winRate: winRates.length > 0 ? winRates.reduce((a, b) => a + b, 0) / winRates.length : null,
        };
      })()
    : null;

  /** Quebra o resumo em frases para exibição em lista (mais escaneável) */
  const icpSummaryBullets = icpSummaryText
    ? icpSummaryText
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
            <BarChart3 className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">
              Economia unitária e ICP
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              LTV, CAC, Churn e perfil ideal de cliente
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleGenerateICP}
          disabled={icpLoading}
          className="shrink-0 rounded-xl bg-indigo-600 font-medium hover:bg-indigo-700"
        >
          {icpLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analisando…
            </>
          ) : hasICP ? (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Atualizar estudo com IA
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar estudo com IA
            </>
          )}
        </Button>
      </div>

      {/* Erro — sempre no topo quando houver */}
      {icpError && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/50 px-5 py-4">
          <p className="font-medium text-amber-800">Não foi possível gerar o estudo</p>
          <p className="mt-1 text-sm text-amber-700">{icpError}</p>
          {(icpError.includes('GOOGLE_AI_API_KEY') || icpError.includes('chave')) && (
            <p className="mt-2 text-xs text-amber-600">
              Adicione GOOGLE_AI_API_KEY em .env.local e reinicie o servidor.
            </p>
          )}
        </div>
      )}

      {/* 1) Quando tem Unit Economics completo */}
      {hasData && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'LTV', value: ue!.ltv_computed != null ? formatCurrency(ue!.ltv_computed) : '—', sub: 'Ticket médio ganho', icon: DollarSign },
              { label: 'Churn', value: ue!.churn_rate != null ? `${(ue!.churn_rate * 100).toFixed(1)}%` : '—', sub: 'Taxa de perda', icon: TrendingUp },
              { label: 'CAC', value: ue!.cac_manual != null ? formatCurrency(ue!.cac_manual) : '—', sub: 'Configure em Ajustes', icon: Target },
              { label: 'LTV/CAC', value: ue!.ltv_cac_ratio != null ? `${ue!.ltv_cac_ratio.toFixed(1)}x` : '—', sub: 'Índice saudável > 3', icon: Target },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-slate-100 bg-slate-50/50 p-5 transition-all duration-200 hover:border-slate-200 hover:shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{m.label}</p>
                <p className="mt-2 text-xl font-bold text-slate-900 tabular-nums">{m.value}</p>
                <p className="mt-1 text-xs text-slate-500">{m.sub}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-6 rounded-xl border border-slate-100 bg-white px-5 py-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-teal-500" />
              <span className="text-sm text-slate-600">
                Win rate: <strong className="text-slate-900">{ue?.win_rate != null ? (ue.win_rate * 100).toFixed(0) : 0}%</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600">
                <strong className="text-slate-900">{ue?.deals_won_count ?? 0}</strong> ganhos · <strong className="text-slate-900">{ue?.deals_lost_count ?? 0}</strong> perdidos
              </span>
            </div>
          </div>
        </>
      )}

      {/* 2) Quando tem ICP (resumo e/ou segmentos) — layout escaneável */}
      {hasICP && (icpSummaryText || empresasAnalisadas.length > 0) && (
        <div className={hasData ? 'mt-10' : 'mt-8'}>
          {/* KPIs em destaque quando tem ICP */}
          {(icpIndicators?.ticketMedio != null || icpIndicators?.winRate != null || ue?.avg_deal_value != null || ue?.win_rate != null) && (
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(icpIndicators?.ticketMedio ?? ue?.avg_deal_value) != null && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ticket médio</p>
                  <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
                    {formatCurrency(icpIndicators?.ticketMedio ?? ue?.avg_deal_value ?? 0)}
                  </p>
                </div>
              )}
              {(icpIndicators?.winRate ?? ue?.win_rate) != null && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Taxa de ganho</p>
                  <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
                    {((icpIndicators?.winRate ?? ue?.win_rate ?? 0) * 100).toFixed(0)}%
                  </p>
                </div>
              )}
              {empresasAnalisadas.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Segmentos</p>
                  <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{empresasAnalisadas.length}</p>
                </div>
              )}
            </div>
          )}

          {/* Resumo executivo — escaneável (bullets ou parágrafo) */}
          {icpSummaryText && (
            <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white px-6 py-5">
              <div className="flex items-center gap-2 text-indigo-700">
                <Eye className="h-5 w-5 shrink-0" />
                <h3 className="text-sm font-semibold uppercase tracking-wider">Perfil de cliente (ICP) — Resumo executivo</h3>
              </div>
              {icpSummaryBullets.length > 1 ? (
                <ul className="mt-4 space-y-2 text-slate-700">
                  {icpSummaryBullets.map((bullet, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                      <span className="leading-relaxed">{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-base leading-relaxed text-slate-700">{icpSummaryText}</p>
              )}
            </div>
          )}

          {/* Segmentos — expandível, aberto por padrão se poucos */}
          {empresasAnalisadas.length > 0 && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Análise por segmento ({empresasAnalisadas.length})
              </button>
              {expanded && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {empresasAnalisadas.map((seg, i) => {
                    const valorMedio = seg.valor_medio as number | undefined;
                    const winRate = seg.win_rate_segmento as number | undefined;
                    const segmento = String(seg.segmento_inferido ?? seg.padrao ?? `Segmento ${i + 1}`).slice(0, 60);
                    const recomendacao = seg.recomendacao ? String(seg.recomendacao).slice(0, 200) : null;
                    return (
                      <div
                        key={i}
                        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-slate-900">{segmento}</h4>
                          <span className="shrink-0 rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">Segmento</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3">
                          {valorMedio != null && (
                            <span className="text-sm text-slate-600">Ticket: <strong className="text-slate-900">{formatCurrency(valorMedio)}</strong></span>
                          )}
                          {winRate != null && (
                            <span className="text-sm text-slate-600">Win rate: <strong className="text-slate-900">{(winRate * 100).toFixed(0)}%</strong></span>
                          )}
                        </div>
                        {recomendacao && (
                          <p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-relaxed text-slate-600">
                            {recomendacao}{recomendacao.length >= 200 ? '…' : ''}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3) Estado vazio — sem dados e sem ICP: dois caminhos claros */}
      {!hasData && !hasICP && (
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/30 p-6">
            <div className="flex items-center gap-2 text-indigo-700">
              <Sparkles className="h-5 w-5" />
              <h3 className="font-semibold">Gerar estudo com IA</h3>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              A IA analisa suas oportunidades e devolve:
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
              <li className="flex gap-2">
                <span className="text-indigo-500">•</span> Perfil de cliente ideal (segmentos, ticket, win rate)
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-500">•</span> Resumo executivo em linguagem clara
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-500">•</span> Indicadores preliminares sem precisar de relatório completo
              </li>
            </ul>
            <Button
              size="sm"
              onClick={handleGenerateICP}
              disabled={icpLoading}
              className="mt-5 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700"
            >
              {icpLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Gerar estudo com IA
            </Button>
          </div>

          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6">
            <div className="flex items-center gap-2 text-slate-600">
              <Upload className="h-5 w-5" />
              <h3 className="font-semibold">Upload de oportunidades</h3>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Envie planilhas de oportunidades (e atividades) para calcular LTV, CAC, Churn e relatório completo de ICP.
            </p>
            <Link
              href="/app/uploads"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              Ir para Uploads
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* 4) Tem ICP mas não tem unit economics: não repetir caixa vazia; só link para mais dados */}
      {hasICP && !hasData && (
        <div className="mt-6 rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3 text-center">
          <p className="text-sm text-slate-600">
            Quer LTV, CAC e Churn? Faça{' '}
            <Link href="/app/uploads" className="font-medium text-indigo-600 hover:text-indigo-700">
              upload de oportunidades
            </Link>
            {' '}e gere o relatório no painel.
          </p>
        </div>
      )}
    </div>
  );
}
