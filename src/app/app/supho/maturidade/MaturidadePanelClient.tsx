'use client';

import { useEffect } from 'react';
import { trackScreen } from '@/lib/analytics/track';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ITSMO_LEVEL_BANDS, SUPHO_PILARES } from '@/lib/supho/constants';
import {
  getExecutiveTextITSMO,
  getExecutiveTextIC,
  getExecutiveTextIH,
  getExecutiveTextIP,
  getExecutiveTextGapCH,
  getExecutiveTextGapCP,
  getExecutiveTextISE,
  getExecutiveTextIPT,
  getExecutiveTextICL,
  getPerfilPredominante,
  getExecutiveTextPerfil,
  getSystemsMaturityNarrative,
  getOrgContextNarrative,
} from '@/lib/supho/executive-text';
import type { ErpIntegrationStatus, SystemsMaturityAssessment } from '@/lib/supho/systems-maturity';
import { Gauge, FileText, ClipboardList, ArrowRight, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/** Um único conjunto de números para radar, cartões e perfil (evita discrepâncias visuais por arredondamento). */
function displayIndex(n: unknown): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 10) / 10;
}

type Result = {
  id: string;
  campaignId: string;
  computedAt: string;
  ic: number;
  ih: number;
  ip: number;
  itsmo: number;
  nivel: 1 | 2 | 3 | 4 | 5;
  gapCH: number;
  gapCP: number;
  ise: number;
  ipt: number;
  icl: number;
  sampleSize: number;
};

export type MaturidadeEnrichment = {
  systemsMaturity: {
    ipPenaltyApplied: number;
    reasons: string[];
    hasActiveCrmIntegration: boolean;
    erpIntegrationStatus: string;
  } | null;
  orgContextPresent: boolean;
  orgContextSummary: string | null;
  /** Síntese de ficheiros (Gemini ou fallback) incluída no bundle do último cálculo */
  uploadsSynthesisUsed?: boolean;
  indicesFromSurvey: {
    ic: number;
    ih: number;
    ip: number;
    itsmo: number;
    nivel: number;
    gapCH: number;
    gapCP: number;
  } | null;
} | null;

export type MaturidadeCampaignContext = {
  campaignId: string;
  campaignName: string;
  uploadsContextUpdatedAt: string | null;
  uploadsStale: boolean;
  hasUploadsContext: boolean;
  /** Campanha mais recente por atividade sem diagnóstico calculado (painel mostra último cálculo de outra campanha) */
  newerCampaignWithoutResult?: { campaignId: string; campaignName: string } | null;
};

interface MaturidadePanelClientProps {
  result: Result | null;
  enrichment?: MaturidadeEnrichment;
  campaignContext?: MaturidadeCampaignContext | null;
}

function toSystemsAssessment(
  s: NonNullable<NonNullable<MaturidadeEnrichment>['systemsMaturity']>
): SystemsMaturityAssessment {
  const erp = s.erpIntegrationStatus;
  const erpIntegrationStatus: ErpIntegrationStatus =
    erp === 'integrated' || erp === 'not_integrated' || erp === 'unknown' ? erp : 'unknown';
  return {
    ipPenalty: s.ipPenaltyApplied,
    reasons: s.reasons,
    hasActiveCrmIntegration: s.hasActiveCrmIntegration,
    erpIntegrationStatus,
  };
}

export function MaturidadePanelClient({
  result,
  enrichment = null,
  campaignContext = null,
}: MaturidadePanelClientProps) {
  useEffect(() => {
    trackScreen('supho_maturidade');
  }, []);

  if (!result) {
    const diagnosticoHref = campaignContext
      ? `/app/supho/diagnostico?campaign=${encodeURIComponent(campaignContext.campaignId)}`
      : '/app/supho/diagnostico';

    if (campaignContext) {
      return (
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-sm)] sm:p-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)]">
              <Gauge className="h-10 w-10 text-[var(--color-primary)]" />
            </div>
            <h2 className="mt-6 text-xl font-semibold text-[var(--color-text)]">
              Campanha atual sem diagnóstico calculado
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--color-text-muted)]">
              A campanha <span className="font-medium text-[var(--color-text)]">{campaignContext.campaignName}</span>{' '}
              é a mais recente na organização. Calcule o diagnóstico nessa campanha para ver o ITSMO, o radar e o
              contexto (incluindo síntese de uploads em Diagnóstico → Utilizar uploads, quando houver documentos).
            </p>
            {campaignContext.hasUploadsContext && (
              <p className="mt-3 max-w-md text-xs text-[var(--color-text-muted)]">
                Já existe síntese de ficheiros para esta campanha; ao calcular, o resultado incorporará esse texto no
                bundle de contexto.
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href={diagnosticoHref}>
                <Button size="sm" className="gap-1.5">
                  <ClipboardList className="h-4 w-4" />
                  Abrir diagnóstico desta campanha
                </Button>
              </Link>
              <Link href="/app/supho/paip">
                <Button size="sm" variant="outline" className="gap-1.5">
                  Ver PAIP <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-sm)] sm:p-12">
        <CardContent className="flex flex-col items-center justify-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)]">
            <Gauge className="h-10 w-10 text-[var(--color-primary)]" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-[var(--color-text)]">
            Nenhuma campanha ainda
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--color-text-muted)]">
            Crie uma campanha de diagnóstico (pesquisas por bloco A/B/C), reúna respostas e calcule o ITSMO para ver o
            painel com radar, gaps e textos executivos.
          </p>
          <p className="mt-4 text-xs text-[var(--color-text-muted)]">
            Pilares: Cultura (IC) · Humano e Liderança (IH) · Comercial e Performance (IP). Fluxo: Diagnóstico →
            Maturidade → PAIP → Rituais → Certificação.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/app/supho/diagnostico">
              <Button size="sm" className="gap-1.5">
                <ClipboardList className="h-4 w-4" />
                Iniciar diagnóstico
              </Button>
            </Link>
            <Link href="/app/supho/paip">
              <Button size="sm" variant="outline" className="gap-1.5">
                Ver PAIP <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const ic = displayIndex(result.ic);
  const ih = displayIndex(result.ih);
  const ip = displayIndex(result.ip);
  const itsmo = displayIndex(result.itsmo);
  const gapCH = displayIndex(result.gapCH);
  const gapCP = displayIndex(result.gapCP);
  const ise = Number.isFinite(result.ise) ? Math.round(result.ise * 100) / 100 : 0;
  const ipt = Number.isFinite(result.ipt) ? Math.round(result.ipt * 100) / 100 : 0;
  const icl = Number.isFinite(result.icl) ? Math.round(result.icl * 100) / 100 : 0;

  const levelLabel = ITSMO_LEVEL_BANDS.find((b) => b.nivel === result.nivel)?.label ?? 'Reativo';
  const radarData = [
    { subject: `${SUPHO_PILARES.A.nomeCurto} (IC)`, value: ic, fullMark: 100 },
    { subject: `${SUPHO_PILARES.B.nomeCurto} (IH)`, value: ih, fullMark: 100 },
    { subject: `${SUPHO_PILARES.C.nomeCurto} (IP)`, value: ip, fullMark: 100 },
  ];
  const perfil = getPerfilPredominante(ic, ih, ip);
  const perfilText = getExecutiveTextPerfil(perfil);

  const campaignLabel = campaignContext?.campaignName ?? null;

  return (
    <div className="space-y-6">
      {campaignContext?.newerCampaignWithoutResult && (
        <div
          className="flex gap-3 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/35 dark:text-sky-100"
          role="status"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
          <div>
            <p className="font-medium">Campanha mais recente ainda sem diagnóstico</p>
            <p className="mt-1 text-sky-900/90 dark:text-sky-100/90">
              O painel mostra o último cálculo da organização (ver campanha abaixo). A campanha{' '}
              <span className="font-medium">{campaignContext.newerCampaignWithoutResult.campaignName}</span> foi
              atualizada mais recentemente e ainda não tem resultado calculado.
            </p>
            <Link
              href={`/app/supho/diagnostico?campaign=${encodeURIComponent(campaignContext.newerCampaignWithoutResult.campaignId)}`}
              className="mt-2 inline-block text-sm font-medium text-sky-800 underline hover:no-underline dark:text-sky-300"
            >
              Abrir diagnóstico dessa campanha
            </Link>
          </div>
        </div>
      )}
      {campaignContext?.uploadsStale && (
        <div
          className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <div>
            <p className="font-medium">Síntese de uploads mais recente que o último cálculo</p>
            <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
              Gere novamente a síntese em Diagnóstico (se necessário) e execute <strong>Calcular diagnóstico</strong>{' '}
              para incorporar documentos e contexto atualizados ao painel.
            </p>
            <Link
              href={`/app/supho/diagnostico?campaign=${encodeURIComponent(campaignContext.campaignId)}`}
              className="mt-2 inline-block text-sm font-medium text-amber-800 underline hover:no-underline dark:text-amber-300"
            >
              Ir ao diagnóstico desta campanha
            </Link>
          </div>
        </div>
      )}

      {/* Nível e ITSMO */}
      <div className="flex flex-wrap items-center gap-4">
        <Badge variant="default" className="px-3 py-1 text-sm">
          Nível {result.nivel} – {levelLabel}
        </Badge>
        <span className="text-2xl font-bold tabular-nums text-[var(--color-text)]">
          ITSMO {itsmo.toFixed(1)}
        </span>
        <span className="text-sm text-[var(--color-text-muted)]">
          Atualizado em {new Date(result.computedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
          {result.sampleSize > 0 && ` · n = ${result.sampleSize}`}
        </span>
      </div>
      {campaignLabel && (
        <p className="text-sm text-[var(--color-text-muted)]">
          Campanha: <span className="font-medium text-[var(--color-text)]">{campaignLabel}</span>
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Radar */}
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-[var(--color-text)]">
              <Gauge className="h-4 w-4 text-[var(--color-primary)]" />
              Radar IC / IH / IP
            </CardTitle>
            <p className="px-6 pb-0 text-xs text-[var(--color-text-muted)]">
              Escala 0–100 (mesmos valores dos indicadores abaixo). IC, IH e IP refletem o último cálculo guardado
              (IP inclui ajuste de sistemas quando aplicável).
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tickCount={5} tick={{ fontSize: 10 }} />
                  <Radar name="Índices (0–100)" dataKey="value" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.4} />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(1)} pts`, '']}
                    labelFormatter={(label) => String(label)}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Resumo executivo ITSMO */}
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-[var(--color-text)]">
              <FileText className="h-4 w-4 text-[var(--color-primary)]" />
              Leitura executiva – ITSMO
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-[var(--color-text-muted)]">
              ITSMO = 0,40×IC + 0,35×IH + 0,25×IP (metodologia SUPHO). O valor acima é o guardado no diagnóstico; os
              pilares são arredondados para exibição — pequenas diferenças face à conta manual com os números à vista
              são normais.
            </p>
            <p className="text-sm leading-relaxed text-[var(--color-text)]">
              {getExecutiveTextITSMO(result.nivel)}
            </p>
            <p className="text-sm font-medium text-[var(--color-text-muted)]">
              Perfil: {perfil.replace(/_/g, ' ')}
            </p>
            <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
              {perfilText}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-[var(--color-text)]">
            <FileText className="h-4 w-4 text-[var(--color-primary)]" />
            Diagnóstico contextual (sistemas e documentos)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {enrichment?.systemsMaturity ? (
            <div>
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                Maturidade de sistemas (CRM / ERP)
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text)]">
                {getSystemsMaturityNarrative(toSystemsAssessment(enrichment.systemsMaturity))}
              </p>
              {enrichment.systemsMaturity.ipPenaltyApplied > 0 && enrichment.indicesFromSurvey && (
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                  Índices apenas do questionário (antes do ajuste de sistemas): ITSMO{' '}
                  {enrichment.indicesFromSurvey.itsmo.toFixed(1)} · IP {enrichment.indicesFromSurvey.ip.toFixed(1)}.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">
              Este resultado foi calculado antes da camada de CRM/ERP ou o registro não inclui metadados. Recalcule o
              diagnóstico na campanha SUPHO para incorporar integrações e o ajuste de IP.
            </p>
          )}
          {enrichment?.uploadsSynthesisUsed && (
            <p className="text-xs text-[var(--color-text-muted)]">
              A síntese dos ficheiros de Conhecimento (Google Gemini quando configurado no servidor) entrou no contexto
              deste cálculo.
            </p>
          )}
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
              Documentos de contexto da organização
            </p>
            <p className="mt-2 max-h-[320px] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text)]">
              {getOrgContextNarrative(enrichment?.orgContextSummary ?? null)}
            </p>
            <Link
              href="/app/settings/contexto-organizacao"
              className="mt-2 inline-block text-sm text-[var(--color-primary)] hover:underline"
            >
              Editar contexto em Configurações
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Indicadores e textos executivos */}
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <CardTitle className="text-base text-[var(--color-text)]">Indicadores e interpretação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">IC – {SUPHO_PILARES.A.nomeCurto}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--color-text)]">{ic.toFixed(1)}</p>
              <p className="text-[11px] text-[var(--color-text-muted)]">Pontos na escala 0–100</p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{getExecutiveTextIC(ic)}</p>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">IH – {SUPHO_PILARES.B.nomeCurto}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--color-text)]">{ih.toFixed(1)}</p>
              <p className="text-[11px] text-[var(--color-text-muted)]">Pontos na escala 0–100</p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{getExecutiveTextIH(ih)}</p>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">IP – {SUPHO_PILARES.C.nomeCurto}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--color-text)]">{ip.toFixed(1)}</p>
              <p className="text-[11px] text-[var(--color-text-muted)]">Pontos na escala 0–100</p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{getExecutiveTextIP(ip)}</p>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">Gap Cultura–Humano</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--color-text)]">{gapCH.toFixed(1)}</p>
              <p className="text-[11px] text-[var(--color-text-muted)]">Diferença |IC − IH| em pontos (0–100)</p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{getExecutiveTextGapCH(gapCH)}</p>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">Gap Cultura–Performance</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--color-text)]">{gapCP.toFixed(1)}</p>
              <p className="text-[11px] text-[var(--color-text-muted)]">Diferença |IC − IP| em pontos (0–100)</p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{getExecutiveTextGapCP(gapCP)}</p>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 sm:col-span-2 lg:col-span-3">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">Subíndices (escala Likert 1–5)</p>
              <p className="mt-2 text-sm text-[var(--color-text)]">
                <span className="font-medium">ISE</span> {ise.toFixed(2)} — {getExecutiveTextISE(ise)}
              </p>
              <p className="mt-3 text-sm text-[var(--color-text)]">
                <span className="font-medium">IPT</span> {ipt.toFixed(2)} — {getExecutiveTextIPT(ipt)}
              </p>
              <p className="mt-3 text-sm text-[var(--color-text)]">
                <span className="font-medium">ICL</span> {icl.toFixed(2)} — {getExecutiveTextICL(icl)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-[var(--color-text-muted)]">
        ITSMO integra os três pilares (Cultura, Humano e Liderança, Comercial e Performance) em um índice acionável. Metodologia: Kit Diagnóstico e Playbooks SUPHO.
      </p>
    </div>
  );
}
