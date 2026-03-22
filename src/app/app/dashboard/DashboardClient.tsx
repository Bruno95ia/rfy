'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { trackScreen } from '@/lib/analytics/track';
import Link from 'next/link';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  DollarSign,
  LineChart,
  TrendingDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { ITSMO_LEVEL_BANDS } from '@/lib/supho/constants';
import { getActionForFriction, computeValueAtRisk } from '@/lib/actions';
import { predictForecast, getBenchmark, getInterventions } from '@/lib/aiClient';
import {
  ExecutivePanel,
  AIIntelligencePanel,
  RevenuePositioning,
  PremiumDataTable,
  ForecastComparison,
  IntervencoesPrioritarias,
  BottleneckPanel,
  SellerIntelligenceTable,
  UnitEconomicsICPCard,
  AIStatusCard,
  SuphoOverviewCard,
  type SuphoDashboardResult,
  type Intervencao,
  mergeDealsByHash,
  computePipelineAjustado,
  computeReceitaAntecipavel,
  valueAtRiskByStage,
  valueAtRiskByOwner,
  type DealRow,
} from './components';
import { DashboardTopNav } from './components/make/DashboardTopNav';
import { DashboardHero } from './components/make/DashboardHero';
import { DashboardKpiGrid } from './components/make/DashboardKpiGrid';
import { DashboardDecisionsSection } from './components/make/DashboardDecisionsSection';
import { DashboardAlertsSection } from './components/make/DashboardAlertsSection';
import { DashboardAdvancedSection } from './components/make/DashboardAdvancedSection';

type DatePreset =
  | 'all'
  | '7d'
  | '30d'
  | '90d'
  | 'thisMonth'
  | 'thisQuarter'
  | 'thisYear';

function getDateRange(preset: DatePreset): { start: Date; end: Date } | null {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (preset === 'all') return null;
  if (preset === '7d') start.setDate(start.getDate() - 7);
  else if (preset === '30d') start.setDate(start.getDate() - 30);
  else if (preset === '90d') start.setDate(start.getDate() - 90);
  else if (preset === 'thisMonth') start.setDate(1);
  else if (preset === 'thisQuarter') {
    const q = Math.floor(now.getMonth() / 3) + 1;
    start.setMonth((q - 1) * 3, 1);
  } else if (preset === 'thisYear') {
    start.setMonth(0, 1);
  }
  return { start, end };
}

function dealInRange(d: DealRow, range: { start: Date; end: Date } | null): boolean {
  if (!range) return true;
  const created = d.created_date;
  if (!created) return false;
  const time = new Date(created).getTime();
  if (Number.isNaN(time)) return false;
  return time >= range.start.getTime() && time <= range.end.getTime();
}

export type DashboardUserRole = 'owner' | 'admin' | 'manager' | 'viewer';

export interface DashboardClientProps {
  orgId: string;
  userRole?: DashboardUserRole;
  report: { id: string } | null;
  snapshot: Record<string, unknown> | null;
  frictions: Array<Record<string, unknown>> | null;
  pillarScores: Record<string, unknown> | null;
  generatedAt: string | null;
  suphoResult?: SuphoDashboardResult | null;
  unitEconomics?: Record<string, unknown> | null;
  icpCached?: {
    icp_summary: string;
    icp_study_json: Record<string, unknown>;
    generated_at: string;
  } | null;
}

type OpenAlertRow = {
  id: string;
  tipo: string;
  severidade: string;
  titulo: string;
  mensagem: string;
  valor_atual: number | null;
  limiar: number | null;
  created_at: string;
};

function mapSeverity(severity: string): 'critical' | 'warning' | 'info' {
  if (severity === 'high') return 'critical';
  if (severity === 'medium') return 'warning';
  return 'info';
}

const ADVANCED_NAV_DEFAULT: Array<[string, string]> = [
  ['#posicionamento', 'Posicionamento'],
  ['#intervencoes', 'Intervenções'],
  ['#receita-declarada-vs-confiavel', 'Receita declarada vs confiável'],
  ['#deal-intelligence', 'Deal intelligence'],
  ['#supho', 'SUPHO'],
];

const ADVANCED_NAV_EXECUTIVE: Array<[string, string]> = [
  ['#posicionamento', 'Posicionamento'],
  ['#receita-declarada-vs-confiavel', 'Receita declarada vs confiável'],
  ['#supho', 'SUPHO'],
  ['#painel-executivo', 'Painel executivo'],
  ['#intervencoes', 'Intervenções'],
  ['#unit-economics-icp', 'Unit Economics / ICP'],
  ['#inteligencia-ia', 'Inteligência IA'],
  ['#deal-intelligence', 'Deal intelligence'],
  ['#bottleneck-vendedores', 'Gargalo e vendedores'],
  ['#status-ia', 'Status da IA'],
];

export function DashboardClient({
  orgId,
  userRole = 'viewer',
  snapshot,
  frictions,
  pillarScores,
  generatedAt,
  suphoResult = null,
  unitEconomics = null,
  icpCached = null,
}: DashboardClientProps) {
  const isExecutive = userRole === 'owner' || userRole === 'admin';
  const advancedNavLinks = isExecutive ? ADVANCED_NAV_EXECUTIVE : ADVANCED_NAV_DEFAULT;
  const [reportGeneratedAt, setReportGeneratedAt] = useState<string | null>(generatedAt);
  const [metricsVersion, setMetricsVersion] = useState<number | null>(null);
  const [openAlerts, setOpenAlerts] = useState<OpenAlertRow[]>([]);
  const [aiForecast, setAiForecast] = useState<number | null>(null);
  const [aiPipelineBruto, setAiPipelineBruto] = useState<number | null>(null);
  const [aiDiferencaPct, setAiDiferencaPct] = useState<number | null>(null);
  const [nDealsAnalisados, setNDealsAnalisados] = useState<number | null>(null);
  const [forecastConfidence, setForecastConfidence] = useState<'high' | 'low' | null>(null);
  const [dataQualityWarning, setDataQualityWarning] = useState<string | null>(null);
  const [benchmark, setBenchmark] = useState<Awaited<ReturnType<typeof getBenchmark>> | null>(null);
  const [aiInterventions, setAiInterventions] = useState<Awaited<ReturnType<typeof getInterventions>> | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [rfySource, setRfySource] = useState<'ai' | 'fallback' | null>(null);
  const [latestIcpSummary, setLatestIcpSummary] = useState<string | null>(null);
  const [showAdvancedSections, setShowAdvancedSections] = useState(false);
  const lastStatusVersionRef = useRef<number | null>(null);

  useEffect(() => {
    trackScreen('dashboard');
  }, []);

  const loadOpenAlerts = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/alerts/open?org_id=${encodeURIComponent(orgId)}&limit=10`, {
        credentials: 'include',
      });
      if (!res.ok) return;
      const payload = (await res.json()) as { alerts?: OpenAlertRow[] };
      setOpenAlerts(Array.isArray(payload.alerts) ? payload.alerts : []);
    } catch {
      // ignore poll errors
    }
  }, [orgId]);

  const refreshSummaryMetrics = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/metrics/summary?org_id=${encodeURIComponent(orgId)}`, {
        credentials: 'include',
      });
      if (!res.ok) return;
      const payload = (await res.json()) as {
        generated_at?: string | null;
        receita_confiavel_30d?: number;
        pipeline_declarado?: number;
        rfy_source?: 'ai' | 'fallback';
      };
      if (typeof payload.receita_confiavel_30d === 'number') {
        setAiForecast(payload.receita_confiavel_30d);
      }
      if (typeof payload.pipeline_declarado === 'number') {
        setAiPipelineBruto(payload.pipeline_declarado);
      }
      if (typeof payload.generated_at === 'string' || payload.generated_at === null) {
        setReportGeneratedAt(payload.generated_at ?? null);
      }
      if (payload.rfy_source === 'ai' || payload.rfy_source === 'fallback') {
        setRfySource(payload.rfy_source);
      }
    } catch {
      // ignore poll errors
    }
  }, [orgId]);

  const refreshInterventions = useCallback(async () => {
    if (!orgId) return;
    try {
      const interventions = await getInterventions(orgId);
      if (Array.isArray(interventions)) {
        setAiInterventions(interventions);
      }
    } catch {
      // ignore poll errors
    }
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    let mounted = true;

    const loadAi = async () => {
      setAiLoading(true);
      setAiUnavailable(false);
      setAiErrorMessage(null);

      try {
        const [forecastRes, benchmarkRes, interventionsRes] = await Promise.all([
          predictForecast(orgId),
          getBenchmark(orgId),
          getInterventions(orgId).catch(() => [] as Awaited<ReturnType<typeof getInterventions>>),
        ]);
        if (!mounted) return;

        if (forecastRes.forecast_adjusted != null) setAiForecast(forecastRes.forecast_adjusted);
        if (forecastRes.pipeline_bruto != null) setAiPipelineBruto(forecastRes.pipeline_bruto);
        if (forecastRes.diferença_percentual != null) setAiDiferencaPct(forecastRes.diferença_percentual);
        if (forecastRes.n_deals != null) setNDealsAnalisados(forecastRes.n_deals);
        setForecastConfidence(forecastRes.forecast_confidence ?? null);
        setDataQualityWarning(forecastRes.data_quality_warning ?? null);
        setBenchmark(benchmarkRes);
        setAiInterventions(Array.isArray(interventionsRes) ? interventionsRes : []);
      } catch (err) {
        if (!mounted) return;
        setAiUnavailable(true);
        setAiErrorMessage(err instanceof Error ? err.message : String(err));
        setBenchmark(null);
        setAiForecast(null);
        setAiPipelineBruto(null);
        setAiDiferencaPct(null);
        setNDealsAnalisados(null);
        setForecastConfidence(null);
        setDataQualityWarning(null);
        setAiInterventions(null);
      } finally {
        if (mounted) setAiLoading(false);
      }
    };

    void Promise.resolve().then(loadAi);
    return () => {
      mounted = false;
    };
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    const loadByStatus = async (force: boolean) => {
      if (!force && typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }

      try {
        const statusRes = await fetch(`/api/metrics/status?org_id=${encodeURIComponent(orgId)}`, {
          credentials: 'include',
        });
        if (!statusRes.ok) return;
        const status = (await statusRes.json()) as { version?: number };
        const version = typeof status.version === 'number' ? status.version : 0;
        if (cancelled) return;

        setMetricsVersion(version);

        const shouldRefresh =
          force ||
          lastStatusVersionRef.current === null ||
          version !== lastStatusVersionRef.current;

        if (!shouldRefresh) return;
        lastStatusVersionRef.current = version;

        await Promise.all([
          refreshSummaryMetrics(),
          refreshInterventions(),
          loadOpenAlerts(),
        ]);
      } catch {
        // ignore poll errors
      }
    };

    void loadByStatus(true);
    const onVisible = () => void loadByStatus(false);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisible);
    }
    const interval = setInterval(() => void loadByStatus(false), 15000);

    return () => {
      cancelled = true;
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisible);
      }
      clearInterval(interval);
    };
  }, [orgId, loadOpenAlerts, refreshInterventions, refreshSummaryMetrics]);

  const dateRange = useMemo(() => getDateRange(datePreset), [datePreset]);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(n);

  const totalOpen = (snapshot?.total_open as number) ?? 0;
  const pipelineValueOpen = (snapshot?.pipeline_value_open as number) ?? 0;
  const openByStage = useMemo(
    () => (snapshot?.open_by_stage as Record<string, number>) ?? {},
    [snapshot?.open_by_stage]
  );

  const rawTopDealsPropostaRisco = useMemo(
    () => (snapshot?.topDealsPropostaRisco as DealRow[]) ?? [],
    [snapshot?.topDealsPropostaRisco]
  );
  const rawTopDealsAbandoned = useMemo(
    () => (snapshot?.topDealsAbandoned as DealRow[]) ?? [],
    [snapshot?.topDealsAbandoned]
  );

  const topDealsPropostaRisco = useMemo(() => {
    if (!dateRange) return rawTopDealsPropostaRisco;
    return rawTopDealsPropostaRisco.filter((deal) => dealInRange(deal, dateRange));
  }, [rawTopDealsPropostaRisco, dateRange]);

  const topDealsAbandoned = useMemo(() => {
    if (!dateRange) return rawTopDealsAbandoned;
    return rawTopDealsAbandoned.filter((deal) => dealInRange(deal, dateRange));
  }, [rawTopDealsAbandoned, dateRange]);

  const prioritizedFrictions = useMemo(() => {
    if (!frictions?.length) return [];
    return [...frictions]
      .map((friction) => {
        const id = (friction as { id?: string }).id ?? '';
        const action = getActionForFriction(id);
        const evidence = (friction as { evidence?: Array<Record<string, unknown>> }).evidence ?? [];
        const valueAtRisk = computeValueAtRisk(evidence);
        return {
          ...friction,
          id,
          action,
          valueAtRisk,
          evidence,
        };
      })
      .sort((a, b) => {
        if (b.valueAtRisk !== a.valueAtRisk) return b.valueAtRisk - a.valueAtRisk;
        return a.action.priority - b.action.priority;
      });
  }, [frictions]);

  const filteredPrioritizedFrictions = useMemo(() => {
    if (!dateRange) return prioritizedFrictions;
    return prioritizedFrictions.map((friction) => {
      const evidence = (friction as { evidence?: DealRow[] }).evidence ?? [];
      const filtered = evidence.filter((item) => dealInRange(item as DealRow, dateRange));
      const valueAtRisk = filtered.reduce((sum, item) => sum + (Number((item as DealRow).value) || 0), 0);
      return { ...friction, evidence: filtered, valueAtRisk };
    });
  }, [prioritizedFrictions, dateRange]);

  const frictionEvidenceFlattened = useMemo(() => {
    const flattened: DealRow[] = [];
    for (const friction of filteredPrioritizedFrictions) {
      const evidence = (friction as { evidence?: DealRow[] }).evidence ?? [];
      for (const item of evidence) {
        if (typeof (item as DealRow).value === 'number') {
          flattened.push(item as DealRow);
        }
      }
    }
    return flattened;
  }, [filteredPrioritizedFrictions]);

  const mergedRiskyDeals = useMemo(
    () => mergeDealsByHash(topDealsPropostaRisco, topDealsAbandoned, frictionEvidenceFlattened),
    [topDealsPropostaRisco, topDealsAbandoned, frictionEvidenceFlattened]
  );

  const pipelineAjustado = useMemo(
    () => computePipelineAjustado(pipelineValueOpen, mergedRiskyDeals),
    [pipelineValueOpen, mergedRiskyDeals]
  );

  const receitaAntecipavel = useMemo(
    () => computeReceitaAntecipavel(mergedRiskyDeals),
    [mergedRiskyDeals]
  );

  const valueAtRiskByStageMap = useMemo(
    () => valueAtRiskByStage(topDealsPropostaRisco, topDealsAbandoned),
    [topDealsPropostaRisco, topDealsAbandoned]
  );

  const sellerRiskData = useMemo(
    () => valueAtRiskByOwner(mergedRiskyDeals),
    [mergedRiskyDeals]
  );

  const bottleneckStages = useMemo(() => {
    const entries = Object.entries(openByStage);
    if (entries.length === 0) return [];
    const totalCount = entries.reduce((sum, [, count]) => sum + count, 0);
    return entries.map(([etapa, count]) => {
      const isProposta = etapa.toLowerCase().includes('proposta');
      const valorRisco = isProposta
        ? (valueAtRiskByStageMap.Proposta ?? 0)
        : (valueAtRiskByStageMap[etapa] ?? valueAtRiskByStageMap.Outros ?? 0);
      return {
        etapa,
        tempoMedioDias: null as number | null,
        pctPipeline: totalCount > 0 ? (count / totalCount) * 100 : 0,
        valorEstimado: totalOpen > 0 ? (count / totalCount) * pipelineValueOpen : 0,
        valorEmRisco: valorRisco,
      };
    });
  }, [openByStage, totalOpen, pipelineValueOpen, valueAtRiskByStageMap]);

  const bottleneck = useMemo(() => {
    if (bottleneckStages.length === 0) return null;
    return bottleneckStages.reduce((acc, stage) => {
      const stageScore = stage.valorEmRisco * (1 + stage.pctPipeline / 100);
      const accScore = acc.valorEmRisco * (1 + acc.pctPipeline / 100);
      return stageScore > accScore ? stage : acc;
    }, bottleneckStages[0]!);
  }, [bottleneckStages]);

  const sellerRows = useMemo(() => {
    const entries = Object.entries(sellerRiskData)
      .map(([vendedor, data]) => ({ vendedor, ...data, rank: 0 }))
      .sort((a, b) => b.impactScore - a.impactScore);

    const maxImpact = Math.max(...entries.map((entry) => entry.impactScore), 1);

    return entries.map((entry, idx) => ({
      vendedor: entry.vendedor,
      dealsCriticos: entry.count,
      valorEmRisco: entry.value,
      tempoMedioDias: null as number | null,
      scoreHigiene: (entry.impactScore / maxImpact) * 100,
      rank: idx + 1,
    }));
  }, [sellerRiskData]);

  const intervencoes = useMemo((): Intervencao[] => {
    if (aiInterventions && aiInterventions.length > 0) {
      return aiInterventions.map((item) => ({
        id: item.deal_id,
        acao: item.recommended_action,
        cliente: item.company,
        valor: item.value ?? item.impact_score,
        diasParado: item.days_without_activity ?? 0,
        etapa: item.stage_name ?? '—',
        deal: undefined,
        impact_score: item.impact_score,
        p_win: item.p_win,
        impact_rationale: item.impact_rationale,
      }));
    }

    const output: Intervencao[] = [];
    const seen = new Set<string>();

    for (const friction of filteredPrioritizedFrictions) {
      const action = (friction as { action?: { action: string } }).action;
      const evidence = (friction as { evidence?: DealRow[] }).evidence ?? [];
      const actionText = action?.action ?? 'Revisar e definir próxima ação';

      for (const evidenceItem of evidence) {
        const deal = evidenceItem as DealRow & { crm_hash?: string };
        const company = deal.company_name ?? 'Cliente';
        const hash = deal.crm_hash ?? `${company}-${deal.title}-${deal.value}`;
        if (seen.has(hash)) continue;
        seen.add(hash);

        output.push({
          id: hash,
          acao: actionText,
          cliente: company,
          valor: deal.value ?? 0,
          diasParado: deal.days_without_activity ?? deal.age_days ?? 0,
          etapa: (deal as { stage_name?: string }).stage_name ?? (friction as { name?: string }).name ?? '—',
          deal,
        });
      }
    }

    return output.sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [filteredPrioritizedFrictions, aiInterventions]);

  const benchmarkOneLiner = useMemo((): string | null => {
    if (!benchmark || benchmark.status !== 'ok') return null;
    const parts: string[] = [];
    if (benchmark.winrate_vs_cluster) parts.push(benchmark.winrate_vs_cluster);
    if (benchmark.cycle_vs_cluster) parts.push(benchmark.cycle_vs_cluster);
    if (parts.length) return parts.join('; ');
    return null;
  }, [benchmark]);

  const resolveAlert = useCallback(
    async (alertId: string) => {
      if (!orgId) return;
      try {
        const res = await fetch(
          `/api/alerts/${encodeURIComponent(alertId)}/resolve?org_id=${encodeURIComponent(orgId)}`,
          {
            method: 'PUT',
            credentials: 'include',
          }
        );
        if (res.ok) {
          await loadOpenAlerts();
        }
      } catch {
        // ignore resolve errors
      }
    },
    [orgId, loadOpenAlerts]
  );

  const pipelineBruto = aiPipelineBruto ?? pipelineValueOpen;
  const receitaConfiavelValor = aiForecast ?? pipelineAjustado;
  const rfyIndexPct =
    pipelineBruto > 0 && receitaConfiavelValor != null
      ? (receitaConfiavelValor / pipelineBruto) * 100
      : null;
  const receitaInfladaValor = Math.max(0, pipelineBruto - (receitaConfiavelValor ?? 0));

  const hygiene = (pillarScores?.pipeline_hygiene as { score?: number })?.score ?? 0;
  const proposal = (pillarScores?.post_proposal_stagnation as { score?: number })?.score ?? 0;
  const revenueHealthScore = Math.round(Math.min(100, Math.max(0, (hygiene + proposal) / 2)));

  const suphoLevelLabel = suphoResult
    ? ITSMO_LEVEL_BANDS.find((band) => band.nivel === suphoResult.nivel)?.label ?? '—'
    : null;

  const suphoPriority = suphoResult
    ? [
        { key: 'IC', value: suphoResult.ic },
        { key: 'IH', value: suphoResult.ih },
        { key: 'IP', value: suphoResult.ip },
      ].sort((a, b) => a.value - b.value)[0]?.key ?? null
    : null;

  const topDecisions = intervencoes.slice(0, 3);

  const decisionsView = topDecisions.map((item) => ({
    id: item.id,
    title: `${item.cliente} · ${item.etapa}`,
    impact: item.acao,
    priority: (item.diasParado >= 14
      ? 'high'
      : item.diasParado >= 7
        ? 'medium'
        : 'low') as 'high' | 'medium' | 'low',
    category: item.etapa,
    valueLabel: formatCurrency(item.valor),
  }));

  const nextDecision =
    decisionsView.length > 0
      ? {
          title: decisionsView[0].title,
          action: decisionsView[0].impact,
          valueLabel: decisionsView[0].valueLabel,
          priorityLabel:
            decisionsView[0].priority === 'high'
              ? 'Alta prioridade'
              : decisionsView[0].priority === 'medium'
                ? 'Prioridade média'
                : 'Prioridade baixa',
        }
      : null;

  const alertsView = openAlerts.map((alert) => ({
    id: alert.id,
    title: alert.titulo,
    description: alert.mensagem,
    severity: mapSeverity(alert.severidade),
    metricLabel:
      typeof alert.valor_atual === 'number'
        ? `Valor atual: ${formatCurrency(alert.valor_atual)}`
        : 'Sem valor adicional',
  }));

  if (!snapshot) {
    const steps = [
      {
        n: 1,
        title: 'Ingerir dados',
        body: 'Envie CSVs (Oportunidades e Atividades) em Uploads ou configure o webhook em Configurações.',
        href: '/app/uploads',
        hrefLabel: 'Abrir Uploads',
      },
      {
        n: 2,
        title: 'Aguardar processamento',
        body: 'O relatório é gerado automaticamente (fila Inngest). Atualize o dashboard em alguns instantes.',
        href: '/app/dashboard',
        hrefLabel: 'Atualizar depois',
      },
      {
        n: 3,
        title: 'Explorar o Control Deck',
        body: 'Com dados, você verá RFY Index, fricções e decisões prioritárias nesta página.',
        href: '/app/dashboard',
        hrefLabel: 'Voltar ao dashboard',
      },
      {
        n: 4,
        title: 'Opcional: SUPHO',
        body: 'Diagnóstico de maturidade comercial e painel ITSMO em SUPHO → Diagnóstico.',
        href: '/app/supho/diagnostico',
        hrefLabel: 'Ir ao SUPHO',
      },
    ];
    return (
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8 lg:px-8 lg:py-10">
          <div>
            <div className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-primary-soft)]">
              <BarChart3 className="h-8 w-8 text-[var(--color-primary)]" aria-hidden />
            </div>
            <h2 className="mt-6 text-[1.375rem] font-bold tracking-[-0.02em] text-[var(--color-text)]">
              Seu workspace está pronto. Falta apenas ingestão de dados.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--color-text-muted)]">
              Conecte seu CRM ou envie CSV para gerar RFY Index, Receita Confiável, Receita Inflada e decisões prioritárias.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <Link
                href="/app/uploads"
                className="inline-flex h-9 items-center rounded-[10px] bg-[var(--color-primary)] px-3 text-sm font-semibold text-[var(--color-primary-foreground)] shadow-[var(--shadow-sm)] transition-transform hover:bg-[var(--color-primary-hover)] hover:-translate-y-px"
              >
                Fazer primeiro upload
              </Link>
              <Link
                href="/app/integracoes"
                className="inline-flex h-9 items-center rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
              >
                Integrações
              </Link>
              <Link
                href="/app/settings"
                className="inline-flex h-9 items-center rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
              >
                Configurações
              </Link>
            </div>
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
            <h3 className="border-b border-[var(--color-border)] px-5 py-4 text-[15px] font-semibold text-[var(--color-text)]">
              Primeiro valor em 4 passos
            </h3>
            <div className="flex flex-col gap-2.5 p-3">
              {steps.map((step) => (
                <div
                  key={step.n}
                  className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
                    Passo {step.n}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">{step.title}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-text-muted)]">{step.body}</p>
                  <Link
                    href={step.href}
                    className="mt-2 inline-block text-xs font-semibold text-[var(--color-primary)] hover:underline"
                  >
                    {step.hrefLabel} →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {aiUnavailable && (
        <Card className="border-[var(--color-warning-soft)] bg-[var(--color-warning-soft)]">
          <CardContent className="flex items-start gap-2 px-4 py-3 text-sm text-[var(--color-warning-foreground)]">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              {aiErrorMessage &&
              /could not translate host|OperationalError|nodename nor servname|connection refused/i.test(aiErrorMessage)
                ? 'Não foi possível conectar ao banco de dados. Verifique o projeto Supabase e as credenciais.'
                : 'IA temporariamente indisponível. Os valores usam estimativa heurística.'}
            </span>
          </CardContent>
        </Card>
      )}

      {isExecutive && !suphoResult && (
        <Card className="border-[var(--color-border)] bg-[var(--color-surface-muted)]/60">
          <CardContent className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">Próximo passo: maturidade comercial (SUPHO)</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Ainda sem diagnóstico SUPHO nesta org. Inicie uma campanha para ver o painel ITSMO e o PAIP.
              </p>
            </div>
            <Link
              href="/app/supho/diagnostico"
              className="shrink-0 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 py-1.5 text-center text-xs font-medium text-[var(--color-primary-foreground)]"
            >
              Abrir diagnóstico SUPHO
            </Link>
          </CardContent>
        </Card>
      )}

      <DashboardTopNav
        links={[
          { href: '#overview', label: 'Visão geral' },
          { href: '#decisions', label: 'Decisões' },
          { href: '#alerts', label: 'Alertas' },
          { href: '#advanced', label: 'Avançado' },
        ]}
      />

      <DashboardHero
        rfyIndex={rfyIndexPct != null ? Math.round(rfyIndexPct) : null}
        rfySource={rfySource}
        variationPct={aiDiferencaPct}
        lastUpdated={reportGeneratedAt}
        suphoScore={suphoResult?.itsmo ?? null}
        suphoLabel={
          suphoResult
            ? `${suphoResult.nivel} · ${suphoLevelLabel} · foco em ${suphoPriority ?? '—'}`
            : null
        }
        benchmarkSummary={benchmarkOneLiner}
        metricsVersion={metricsVersion}
        datePreset={datePreset}
        onDatePresetChange={(value) => setDatePreset(value as DatePreset)}
        nextDecision={nextDecision}
      />

      <DashboardKpiGrid
        items={[
          {
            title: 'Receita Confiável (30 dias)',
            value: formatCurrency(receitaConfiavelValor ?? 0),
            subtitle: 'Projeção com maior probabilidade de realização',
            icon: DollarSign,
            badgeText: 'Confiável',
            badgeVariant: 'success',
            tone: 'success',
            spanClass: 'xl:col-span-4',
          },
          {
            title: 'Receita Inflada',
            value: formatCurrency(receitaInfladaValor),
            subtitle: 'Diferença entre declarado e confiável',
            icon: TrendingDown,
            badgeText: 'Distorção monitorada',
            badgeVariant: 'warning',
            tone: 'warning',
            spanClass: 'xl:col-span-4',
          },
          {
            title: 'Evolução RFY',
            value: aiDiferencaPct != null ? `${aiDiferencaPct.toFixed(1)}%` : 'Em implementação',
            subtitle: 'Tendência dos últimos 90 dias',
            icon: LineChart,
            tone: 'primary',
            spanClass: 'xl:col-span-2',
          },
          {
            title: 'Alertas ativos',
            value: String(openAlerts.length),
            subtitle: openAlerts[0]?.titulo ?? 'Nenhum alerta aberto',
            icon: Bell,
            tone: openAlerts.length > 0 ? 'warning' : 'neutral',
            spanClass: 'xl:col-span-2',
          },
        ]}
      />

      <section className="grid gap-5 xl:grid-cols-12">
        <DashboardDecisionsSection decisions={decisionsView} className="xl:col-span-8" />
        <DashboardAlertsSection
          alerts={alertsView}
          className="xl:col-span-4"
          onResolve={(id) => {
            void resolveAlert(id);
          }}
        />
      </section>

      {forecastConfidence === 'low' && dataQualityWarning && (
        <Card className="border-[var(--color-warning-soft)] bg-[var(--color-warning-soft)]">
          <CardContent className="flex items-start gap-2 px-4 py-3 text-sm text-[var(--color-warning-foreground)]">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            <span>{dataQualityWarning}</span>
          </CardContent>
        </Card>
      )}

      <DashboardAdvancedSection
        expanded={showAdvancedSections}
        onToggle={() => setShowAdvancedSections((prev) => !prev)}
        description={isExecutive ? 'Ver análises detalhadas: posicionamento, SUPHO, painel executivo e intervenções.' : undefined}
      >
        <nav
          aria-label="Navegação das análises avançadas"
          className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2"
        >
          {advancedNavLinks.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
            >
              {label}
            </a>
          ))}
        </nav>

        <section id="posicionamento" className="scroll-mt-5">
          <RevenuePositioning
            benchmark={benchmark}
            loading={aiLoading}
            fallbackIcpSummary={latestIcpSummary ?? icpCached?.icp_summary ?? null}
            fallbackMetrics={
              unitEconomics
                ? {
                    win_rate: (unitEconomics.win_rate as number | null) ?? null,
                    avg_deal_value: (unitEconomics.avg_deal_value as number | null) ?? null,
                    formatCurrency,
                  }
                : null
            }
          />
        </section>

        <section id="intervencoes" className="scroll-mt-5">
          <IntervencoesPrioritarias
            intervencoes={intervencoes}
            formatCurrency={formatCurrency}
            orgId={orgId}
          />
        </section>

        <section id="receita-declarada-vs-confiavel" className="scroll-mt-5">
          <ForecastComparison
            pipelineBruto={pipelineBruto}
            forecastAjustado={receitaConfiavelValor}
            formatCurrency={formatCurrency}
            aiPowered={aiForecast != null}
            diferençaPercentual={aiDiferencaPct ?? undefined}
          />
        </section>

        <section id="deal-intelligence" className="scroll-mt-5 space-y-4">
          <SectionHeader
            title="Inteligência de oportunidades"
            subtitle="Priorize estas oportunidades para reduzir Receita Inflada."
          />
          <PremiumDataTable
            deals={mergedRiskyDeals}
            formatCurrency={formatCurrency}
            emptyMessage="Nenhuma oportunidade em risco identificada"
            maxRows={15}
          />
        </section>

        <section id="supho" className="scroll-mt-5">
          <SuphoOverviewCard result={suphoResult ?? null} />
        </section>

        <section id="painel-executivo" className="scroll-mt-5 space-y-4">
          <SectionHeader
            title="Painel executivo detalhado"
            subtitle="Contexto operacional de forecast, risco e recuperação de receita."
          />
          <ExecutivePanel
            revenueHealthScore={revenueHealthScore}
            forecastValue={formatCurrency(receitaConfiavelValor ?? 0)}
            forecastSubtext={
              forecastConfidence === 'low' && dataQualityWarning
                ? dataQualityWarning
                : aiForecast != null && nDealsAnalisados != null
                  ? `Baseado em ${nDealsAnalisados} oportunidades analisadas pelo modelo`
                  : aiForecast != null
                    ? 'Previsão com base em dados'
                    : 'Probabilidade por tempo sem atividade'
            }
            forecastDelta={
              aiDiferencaPct != null
                ? {
                    value: `${Math.abs(aiDiferencaPct).toFixed(1)}%`,
                    positive: aiDiferencaPct < 0,
                  }
                : undefined
            }
            receitaRisco={formatCurrency(receitaInfladaValor)}
            receitaAntecipavel={formatCurrency(receitaAntecipavel)}
            icons={{ target: BarChart3, alert: AlertTriangle, wallet: DollarSign }}
          />
        </section>

        <section id="bottleneck-vendedores" className="scroll-mt-5 grid gap-6 xl:grid-cols-2">
          <BottleneckPanel stages={bottleneckStages} formatCurrency={formatCurrency} />
          <SellerIntelligenceTable
            title="Inteligência por vendedor"
            rows={sellerRows}
            formatCurrency={formatCurrency}
          />
        </section>

        <section id="unit-economics-icp" className="scroll-mt-5">
          <UnitEconomicsICPCard
            orgId={orgId}
            onICPGenerated={(summary) => setLatestIcpSummary(summary)}
            unitEconomics={
              unitEconomics
                ? {
                    ltv_computed: unitEconomics.ltv_computed as number | null,
                    churn_rate: unitEconomics.churn_rate as number | null,
                    win_rate: unitEconomics.win_rate as number | null,
                    avg_deal_value: unitEconomics.avg_deal_value as number | null,
                    deals_won_count: (unitEconomics.deals_won_count as number) ?? 0,
                    deals_lost_count: (unitEconomics.deals_lost_count as number) ?? 0,
                    deals_open_count: (unitEconomics.deals_open_count as number) ?? 0,
                    cac_manual: unitEconomics.cac_manual as number | null,
                    ltv_cac_ratio: unitEconomics.ltv_cac_ratio as number | null,
                  }
                : null
            }
            icpCached={icpCached}
            formatCurrency={formatCurrency}
          />
        </section>

        <section id="status-ia" className="scroll-mt-5">
          <AIStatusCard
            orgId={orgId}
            onTrainComplete={() => setAiErrorMessage(null)}
            onTrainError={(message) => setAiErrorMessage(message)}
          />
        </section>

        <section id="inteligencia-ia" className="scroll-mt-5">
          <AIIntelligencePanel
            bottleneck={bottleneck?.etapa}
            bottleneckExplanation={
              bottleneck
                ? 'Etapa com maior concentração de valor e tempo parado. Priorize desbloqueio.'
                : undefined
            }
            bottleneckImpactValue={
              bottleneck?.valorEmRisco ? formatCurrency(bottleneck.valorEmRisco) : undefined
            }
            optimizationSimulation={
              bottleneck?.etapa?.toLowerCase().includes('proposta')
                ? {
                    condition: 'Se reduzir tempo médio em Proposta em 5 dias',
                    winRateGain: '+7% na taxa de ganho',
                    estimatedGain: `+${formatCurrency(Math.round(receitaAntecipavel * 0.15))} estimados no trimestre`,
                  }
                : undefined
            }
            confidence={aiForecast != null ? 82 : undefined}
            loading={aiLoading}
          />
        </section>
      </DashboardAdvancedSection>

      <footer className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-center text-xs text-[var(--color-text-muted)]">
        RFY © 2026 · Dashboard executivo alinhado ao modelo Figma Make · SUPHO como diagnóstico secundário.
      </footer>
    </div>
  );
}
