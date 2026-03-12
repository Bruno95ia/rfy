'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { ITSMO_LEVEL_BANDS, SUPHO_PILARES } from '@/lib/supho/constants';
import {
  getExecutiveTextGapCH,
  getExecutiveTextGapCP,
  getExecutiveTextIC,
  getExecutiveTextIH,
  getExecutiveTextIP,
  getExecutiveTextISE,
  getExecutiveTextIPT,
  getExecutiveTextICL,
  getExecutiveTextITSMO,
  getExecutiveTextPerfil,
  getPerfilPredominante,
} from '@/lib/supho/executive-text';
import { Gauge, ArrowRight, Target, Users, TrendingUp, GitCompare, BarChart3, Sparkles } from 'lucide-react';

export type SuphoDashboardResult = {
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

function scoreColor(pct: number): string {
  if (pct >= 75) return 'text-[var(--color-success)]';
  if (pct >= 60) return 'text-[var(--color-primary)]';
  if (pct >= 40) return 'text-[var(--color-warning)]';
  return 'text-[var(--color-danger)]';
}

function scoreBarColor(pct: number): string {
  if (pct >= 75) return 'bg-[var(--color-success)]';
  if (pct >= 60) return 'bg-[var(--color-primary)]';
  if (pct >= 40) return 'bg-[var(--color-warning)]';
  return 'bg-[var(--color-danger)]';
}

function gapStatus(gap: number): { label: string; variant: 'default' | 'warning' | 'danger'; color: string } {
  if (gap <= 5) return { label: 'Alinhado', variant: 'default', color: 'text-[var(--color-success)]' };
  if (gap <= 10) return { label: 'Leve', variant: 'warning', color: 'text-[var(--color-warning)]' };
  return { label: 'Desconexão', variant: 'danger', color: 'text-[var(--color-danger)]' };
}

function subIndexColor(v: number): string {
  if (v >= 4) return 'text-[var(--color-success)]';
  if (v >= 3) return 'text-[var(--color-warning)]';
  return 'text-[var(--color-danger)]';
}

function pickFocus(ic: number, ih: number, ip: number) {
  const items = [
    { key: 'IC' as const, label: `${SUPHO_PILARES.A.nomeCurto} (IC)`, value: ic, icon: Target },
    { key: 'IH' as const, label: `${SUPHO_PILARES.B.nomeCurto} (IH)`, value: ih, icon: Users },
    { key: 'IP' as const, label: `${SUPHO_PILARES.C.nomeCurto} (IP)`, value: ip, icon: TrendingUp },
  ].sort((a, b) => a.value - b.value);
  return items[0]!;
}

const SUPHO_VALUE_PROP =
  'Diagnóstico de maturidade organizacional em três pilares (Cultura, Humano e Liderança, Comercial e Performance). O ITSMO e os gaps explicam a base que sustenta a receita e orientam o PAIP.';

export function SuphoOverviewCard({ result }: { result: SuphoDashboardResult | null }) {
  if (!result) {
    return (
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-base text-[var(--color-text)]">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary-soft)]">
              <Gauge className="h-4 w-4 text-[var(--color-primary)]" />
            </span>
            SUPHO — Maturidade organizacional
          </CardTitle>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            Diagnóstico que sustenta a evolução do RFY
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
            {SUPHO_VALUE_PROP} Execute uma campanha de pesquisa (blocos A/B/C), feche as respostas e calcule o resultado para ver o ITSMO, nível, pilares e gaps aqui e no Painel de Maturidade.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/app/supho/diagnostico">
              <Button size="sm" className="rounded-lg gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Iniciar diagnóstico
              </Button>
            </Link>
            <Link href="/app/supho/maturidade">
              <Button size="sm" variant="outline" className="rounded-lg">
                Ver Painel de Maturidade
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const levelLabel = ITSMO_LEVEL_BANDS.find((b) => b.nivel === result.nivel)?.label ?? 'Reativo';
  const perfil = getPerfilPredominante(result.ic, result.ih, result.ip);
  const focus = pickFocus(result.ic, result.ih, result.ip);
  const computedAtLabel = new Date(result.computedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const gapCHStatus = gapStatus(result.gapCH);
  const gapCPStatus = gapStatus(result.gapCP);

  return (
    <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <CardHeader className="pb-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          Diagnóstico organizacional — sustenta a evolução do RFY
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base text-[var(--color-text)]">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary-soft)]">
              <Gauge className="h-4 w-4 text-[var(--color-primary)]" />
            </span>
            SUPHO — Maturidade organizacional
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <span>Atualizado em {computedAtLabel}</span>
            {result.sampleSize > 0 && (
              <Badge variant="outline" className="font-normal text-[var(--color-text-muted)]">
                n = {result.sampleSize}
              </Badge>
            )}
            <Link
              href="/app/supho/maturidade"
              className="inline-flex items-center gap-1 font-medium text-[var(--color-primary)] hover:underline"
            >
              Painel completo <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Faixa de KPIs principais */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">ITSMO</p>
            <p className={cn('mt-1 text-2xl font-bold tabular-nums', scoreColor(result.itsmo))}>
              {result.itsmo.toFixed(1)}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Índice integrado 0–100</p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Nível</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--color-text)]">{result.nivel}</p>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{levelLabel}</p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Gap C–H</p>
            <p className={cn('mt-1 text-2xl font-bold tabular-nums', gapCHStatus.color)}>
              {result.gapCH.toFixed(1)}
            </p>
            <Badge variant={gapCHStatus.variant} className="mt-1 text-[10px]">
              {gapCHStatus.label}
            </Badge>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Gap C–P</p>
            <p className={cn('mt-1 text-2xl font-bold tabular-nums', gapCPStatus.color)}>
              {result.gapCP.toFixed(1)}
            </p>
            <Badge variant={gapCPStatus.variant} className="mt-1 text-[10px]">
              {gapCPStatus.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Índices IC / IH / IP — valor + barra + interpretação */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Índices de maturidade (0–100)
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { key: 'IC', pilar: SUPHO_PILARES.A, value: result.ic, icon: Target, text: getExecutiveTextIC(result.ic) },
              { key: 'IH', pilar: SUPHO_PILARES.B, value: result.ih, icon: Users, text: getExecutiveTextIH(result.ih) },
              { key: 'IP', pilar: SUPHO_PILARES.C, value: result.ip, icon: TrendingUp, text: getExecutiveTextIP(result.ip) },
            ].map(({ key, pilar, value, icon: Icon, text }) => (
              <div
                key={key}
                className={cn(
                  'rounded-xl border p-4 transition-colors',
                  focus.key === key
                    ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary-soft)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)]" title={pilar.descricao}>
                    <Icon className="h-3.5 w-3.5" />
                    {pilar.nomeCurto} ({key})
                  </span>
                  {focus.key === key && (
                    <Badge variant="default" className="text-[10px]">Foco recomendado</Badge>
                  )}
                </div>
                <p className={cn('mt-2 text-2xl font-bold tabular-nums', scoreColor(value))}>
                  {value.toFixed(1)}
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
                  <div
                    className={cn('h-full rounded-full', scoreBarColor(value))}
                    style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                  />
                </div>
                <p className="mt-2 text-xs leading-snug text-[var(--color-text-muted)] line-clamp-2">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Gaps com interpretação */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Gaps (Cultura ↔ Humano / Performance)
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-muted)]">
                <GitCompare className="h-5 w-5 text-[var(--color-text-muted)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[var(--color-text)]">Cultura – Humano</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--color-text)]">{result.gapCH.toFixed(1)}</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">{getExecutiveTextGapCH(result.gapCH)}</p>
              </div>
              <Badge variant={gapCHStatus.variant}>{gapCHStatus.label}</Badge>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-muted)]">
                <GitCompare className="h-5 w-5 text-[var(--color-text-muted)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[var(--color-text)]">Cultura – Performance</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--color-text)]">{result.gapCP.toFixed(1)}</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">{getExecutiveTextGapCP(result.gapCP)}</p>
              </div>
              <Badge variant={gapCPStatus.variant}>{gapCPStatus.label}</Badge>
            </div>
          </div>
        </div>

        {/* Subíndices com interpretação */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Subíndices (escala 1–5)
          </p>
          <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-4 w-4 text-[var(--color-text-muted)]" />
                <div>
                  <p className="text-[11px] font-medium text-[var(--color-text-muted)]">ISE (Segurança emocional)</p>
                  <p className={cn('text-lg font-bold tabular-nums', subIndexColor(result.ise))}>
                    {result.ise.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-[var(--color-text-muted)]" />
                <div>
                  <p className="text-[11px] font-medium text-[var(--color-text-muted)]">IPT (Orgulho / vínculo)</p>
                  <p className={cn('text-lg font-bold tabular-nums', subIndexColor(result.ipt))}>
                    {result.ipt.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Target className="h-4 w-4 text-[var(--color-text-muted)]" />
                <div>
                  <p className="text-[11px] font-medium text-[var(--color-text-muted)]">ICL (Liderança)</p>
                  <p className={cn('text-lg font-bold tabular-nums', subIndexColor(result.icl))}>
                    {result.icl.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-1.5 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)]">
              <p><strong className="text-[var(--color-text)]">ISE:</strong> {getExecutiveTextISE(result.ise)}</p>
              <p><strong className="text-[var(--color-text)]">IPT:</strong> {getExecutiveTextIPT(result.ipt)}</p>
              <p><strong className="text-[var(--color-text)]">ICL:</strong> {getExecutiveTextICL(result.icl)}</p>
            </div>
          </div>
        </div>

        {/* Leitura executiva + perfil */}
        <div className="grid gap-4 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)]/30 p-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
              Leitura executiva — ITSMO
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text)]">
              {getExecutiveTextITSMO(result.nivel)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
              Perfil predominante
            </p>
            <p className="mt-2 font-medium text-[var(--color-text)]">{perfil.replace(/_/g, ' ')}</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{getExecutiveTextPerfil(perfil)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-border)] pt-4">
          <div className="text-xs text-[var(--color-text-muted)] max-w-xl">
            <p className="font-medium text-[var(--color-text)]">O que é SUPHO</p>
            <p className="mt-0.5">
              {SUPHO_VALUE_PROP} Pilares: {SUPHO_PILARES.A.nome} (IC) · {SUPHO_PILARES.B.nome} (IH) · {SUPHO_PILARES.C.nome} (IP). Base: Kit Diagnóstico e Playbooks por pilar.
            </p>
          </div>
          <Link href="/app/supho/maturidade">
            <Button variant="outline" size="sm" className="rounded-lg shrink-0">
              Ver painel completo
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
