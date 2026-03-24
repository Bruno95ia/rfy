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
import { Gauge, FileText, ClipboardList, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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

interface MaturidadePanelClientProps {
  result: Result | null;
  enrichment?: MaturidadeEnrichment;
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

export function MaturidadePanelClient({ result, enrichment = null }: MaturidadePanelClientProps) {
  useEffect(() => {
    trackScreen('supho_maturidade');
  }, []);

  if (!result) {
    return (
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-sm)] sm:p-12">
        <CardContent className="flex flex-col items-center justify-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)]">
            <Gauge className="h-10 w-10 text-[var(--color-primary)]" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-[var(--color-text)]">
            Nenhum diagnóstico ainda
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--color-text-muted)]">
            Execute uma campanha de diagnóstico (pesquisas por bloco A/B/C) para calcular o ITSMO e exibir o Painel de Maturidade com radar, gaps e textos executivos.
          </p>
          <p className="mt-4 text-xs text-[var(--color-text-muted)]">
            Pilares: Cultura (IC) · Humano e Liderança (IH) · Comercial e Performance (IP). Fluxo: Diagnóstico → Maturidade → PAIP → Rituais → Certificação.
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

  const levelLabel = ITSMO_LEVEL_BANDS.find((b) => b.nivel === result.nivel)?.label ?? 'Reativo';
  const radarData = [
    { subject: `${SUPHO_PILARES.A.nomeCurto} (IC)`, value: result.ic, fullMark: 100 },
    { subject: `${SUPHO_PILARES.B.nomeCurto} (IH)`, value: result.ih, fullMark: 100 },
    { subject: `${SUPHO_PILARES.C.nomeCurto} (IP)`, value: result.ip, fullMark: 100 },
  ];
  const perfil = getPerfilPredominante(result.ic, result.ih, result.ip);
  const perfilText = getExecutiveTextPerfil(perfil);

  return (
    <div className="space-y-6">
      {/* Nível e ITSMO */}
      <div className="flex flex-wrap items-center gap-4">
        <Badge variant="default" className="px-3 py-1 text-sm">
          Nível {result.nivel} – {levelLabel}
        </Badge>
        <span className="text-2xl font-bold tabular-nums text-[var(--color-text)]">
          ITSMO {result.itsmo.toFixed(1)}
        </span>
        <span className="text-sm text-[var(--color-text-muted)]">
          Atualizado em {new Date(result.computedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
          {result.sampleSize > 0 && ` · n = ${result.sampleSize}`}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Radar */}
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-[var(--color-text)]">
              <Gauge className="h-4 w-4 text-[var(--color-primary)]" />
              Radar IC / IH / IP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar name="Índices" dataKey="value" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.4} />
                  <Tooltip formatter={(value: number) => [value.toFixed(1), '']} />
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
              <p className="mt-1 text-lg font-semibold text-[var(--color-text)]">{result.ic.toFixed(1)}</p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{getExecutiveTextIC(result.ic)}</p>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">IH – {SUPHO_PILARES.B.nomeCurto}</p>
              <p className="mt-1 text-lg font-semibold text-[var(--color-text)]">{result.ih.toFixed(1)}</p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{getExecutiveTextIH(result.ih)}</p>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">IP – {SUPHO_PILARES.C.nomeCurto}</p>
              <p className="mt-1 text-lg font-semibold text-[var(--color-text)]">{result.ip.toFixed(1)}</p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{getExecutiveTextIP(result.ip)}</p>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">Gap Cultura–Humano</p>
              <p className="mt-1 text-lg font-semibold text-[var(--color-text)]">{result.gapCH.toFixed(1)}</p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{getExecutiveTextGapCH(result.gapCH)}</p>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">Gap Cultura–Performance</p>
              <p className="mt-1 text-lg font-semibold text-[var(--color-text)]">{result.gapCP.toFixed(1)}</p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{getExecutiveTextGapCP(result.gapCP)}</p>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 sm:col-span-2 lg:col-span-1">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">Subíndices (escala 1–5)</p>
              <p className="mt-1 text-sm text-[var(--color-text)]">
                ISE {result.ise.toFixed(2)} · IPT {result.ipt.toFixed(2)} · ICL {result.icl.toFixed(2)}
              </p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                {getExecutiveTextISE(result.ise)}
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
