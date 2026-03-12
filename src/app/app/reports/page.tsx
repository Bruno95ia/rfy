import { requireAuth, getOrgIdForUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getActionForFriction } from '@/lib/actions';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Gauge,
  Sparkles,
  Zap,
} from 'lucide-react';

type FrictionRow = {
  id: string;
  name: string;
  description: string;
  count: number;
  impactValue: number;
  impactShare: number;
  severity: { label: string; variant: 'default' | 'warning' | 'danger' };
  action: string;
  evidence: Array<Record<string, unknown>>;
};

function getSeverity(impactShare: number, count: number): FrictionRow['severity'] {
  if (impactShare >= 0.35 || count >= 10) {
    return { label: 'Crítico', variant: 'danger' };
  }
  if (impactShare >= 0.18 || count >= 5) {
    return { label: 'Alto', variant: 'warning' };
  }
  return { label: 'Moderado', variant: 'default' };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function ReportsPage() {
  const { user } = await requireAuth();
  const supabase = await createClient();

  let orgId = (await supabase.from('org_members').select('org_id').limit(1)).data?.[0]?.org_id;
  if (!orgId) {
    orgId = await getOrgIdForUser(user.id);
  }
  if (!orgId) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        Carregando organização...
      </div>
    );
  }

  const { data: report } = await supabase
    .from('reports')
    .select('id, snapshot_json, frictions_json, pillar_scores_json, impact_json, generated_at')
    .eq('org_id', orgId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  const snapshot = (report?.snapshot_json as Record<string, unknown>) ?? {};
  const frictions = (report?.frictions_json as Array<Record<string, unknown>>) ?? [];
  const pillarScores = (report?.pillar_scores_json as Record<string, { score?: number }>) ?? {};
  const impact = (report?.impact_json as Record<string, number | null>) ?? {};

  const totalOpen = (snapshot.total_open as number) ?? 0;
  const pipelineValue = (snapshot.pipeline_value_open as number) ?? 0;
  const hygiene = pillarScores.pipeline_hygiene?.score ?? 0;
  const proposal = pillarScores.post_proposal_stagnation?.score ?? 0;
  const revenueAnnual = impact.revenue_annual;
  const cycleReduction = impact.cycle_reduction_pct;
  const revenueAnticipated = impact.revenue_anticipated;

  const rawFrictionRows = frictions
    .map((f) => {
      const evidence = (f.evidence as Array<Record<string, unknown>> | undefined) ?? [];
      const impactValue = evidence.reduce((sum, item) => sum + Number(item.value ?? 0), 0);
      return {
        id: (f.id as string) ?? 'friction',
        name: (f.name as string) ?? 'Distorção de pipeline',
        description: (f.description as string) ?? '-',
        count: Number((f.count as number) ?? 0),
        impactValue,
        evidence,
      };
    })
    .sort((a, b) => {
      if (b.impactValue !== a.impactValue) return b.impactValue - a.impactValue;
      return b.count - a.count;
    });

  const totalFrictionImpact = rawFrictionRows.reduce((sum, row) => sum + row.impactValue, 0);
  const frictionRows: FrictionRow[] = rawFrictionRows.map((row) => {
    const impactShare = totalFrictionImpact > 0 ? row.impactValue / totalFrictionImpact : 0;
    return {
      ...row,
      impactShare,
      severity: getSeverity(impactShare, row.count),
      action: getActionForFriction(row.id).action,
    };
  });

  const topFriction = frictionRows[0] ?? null;
  const frictionRiskOverPipelinePct =
    pipelineValue > 0 ? (totalFrictionImpact / pipelineValue) * 100 : 0;

  const focusEvidenceFriction =
    frictionRows.find((row) =>
      row.evidence.some((item) => item.company_name || item.title || item.crm_hash)
    ) ?? null;

  const focusEvidenceDeals =
    focusEvidenceFriction?.evidence
      .map((item) => ({
        company: String(item.company_name ?? item.owner ?? 'Conta sem nome'),
        title: String(item.title ?? item.crm_hash ?? '-'),
        value: Number(item.value ?? 0),
        days: Number(item.days_without_activity ?? item.age_days ?? 0),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6) ?? [];

  const actionPlan = frictionRows.slice(0, 3);

  if (!report) {
    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: 'App', href: '/app/dashboard' },
            { label: 'Reports' },
          ]}
          title="Relatórios"
          subtitle="Visão executiva de fricções, pilares e impacto"
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-24">
            <BarChart3 className="h-16 w-16 text-slate-500" />
            <p className="mt-6 text-lg font-semibold text-slate-900">
              Nenhum relatório gerado ainda
            </p>
            <p className="mt-2 max-w-md text-center text-sm text-slate-500">
              Faça upload de oportunidades e atividades em{' '}
              <Link
                href="/app/uploads"
                className="font-medium text-indigo-600 transition hover:text-indigo-700 hover:underline"
              >
                Uploads
              </Link>{' '}
              para gerar o relatório.
            </p>
            <Link href="/app/uploads">
              <Button className="mt-6">Ir para Uploads</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'App', href: '/app/dashboard' },
          { label: 'Reports' },
        ]}
        title="Relatórios"
        subtitle={
          report.generated_at
            ? `Gerado em ${new Date(report.generated_at).toLocaleString('pt-BR', {
                dateStyle: 'long',
                timeStyle: 'short',
              })}`
            : 'Visão executiva de fricções, pilares e impacto'
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/app/dashboard">
              <Button variant="outline" size="sm">
                Voltar ao dashboard
              </Button>
            </Link>
            <Link href="/app/uploads">
              <Button size="sm">Atualizar dados</Button>
            </Link>
          </div>
        }
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Navegação rápida
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ['#resumo-executivo', 'Resumo executivo'],
            ['#ranking-friccoes', 'Ranking de fricções'],
            ['#evidencias', 'Evidências'],
            ['#desempenho', 'Pilares e impacto'],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            >
              {label}
            </a>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Pipeline aberto
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {formatCurrency(pipelineValue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Oportunidades abertas
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{totalOpen}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Impacto em risco
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {formatCurrency(totalFrictionImpact)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Risco sobre pipeline
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {frictionRiskOverPipelinePct.toFixed(1)}%
            </p>
            <p className="mt-1 text-xs text-slate-500">impacto em risco / pipeline aberto</p>
          </CardContent>
        </Card>
      </section>

      <section id="resumo-executivo" className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="p-6">
            <CardTitle className="text-lg font-semibold">Leitura executiva</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6 pt-0">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-sm font-medium text-slate-900">
                Relatório atualizado em{' '}
                {report.generated_at
                  ? new Date(report.generated_at).toLocaleString('pt-BR', {
                      dateStyle: 'long',
                      timeStyle: 'short',
                    })
                  : '-'}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {totalOpen} oportunidades abertas com {formatCurrency(pipelineValue)} em pipeline.
              </p>
            </div>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  Saúde de pipeline em <strong>{hygiene.toFixed(1)}%</strong> e estagnação
                  pós-proposta em <strong>{proposal.toFixed(1)}%</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  {frictions.length} fricções monitoradas com{' '}
                  <strong>{formatCurrency(totalFrictionImpact)}</strong> potencialmente em risco.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                <span>
                  Cobertura de risco no pipeline: <strong>{frictionRiskOverPipelinePct.toFixed(1)}%</strong>.
                </span>
              </li>
            </ul>
            {topFriction && (
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-sm text-indigo-700">
                Principal foco: <strong>{topFriction.name}</strong> | {topFriction.count} itens |{' '}
                {formatCurrency(topFriction.impactValue)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-6">
            <CardTitle className="text-lg font-semibold">Plano da semana</CardTitle>
            <p className="text-sm text-slate-500">
              Ordem de execução recomendada com base no impacto financeiro.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 p-6 pt-0">
            {actionPlan.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Nenhuma distorção prioritária no momento.
              </div>
            ) : (
              actionPlan.map((row, index) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {index + 1}. {row.name}
                    </p>
                    <Badge variant={row.severity.variant}>{row.severity.label}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{row.action}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Impacto estimado: {formatCurrency(row.impactValue)} | {row.count} itens
                  </p>
                </div>
              ))
            )}
            <Link href="/app/dashboard#acoes-prioritarias">
              <Button variant="outline" className="w-full">
                Ir para ações no dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <section id="ranking-friccoes">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-slate-900">Ranking de fricções</h2>
          <p className="mt-1 text-sm text-slate-500">
            Priorização por impacto em risco, severidade e volume de itens afetados.
          </p>
        </div>
        {frictionRows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-slate-500 p-6">
              Nenhuma distorção identificada
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Distorção</TableHead>
                    <TableHead>Severidade</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Impacto</TableHead>
                    <TableHead>Ação sugerida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {frictionRows.map((row, index) => (
                    <TableRow key={`${row.id}-${index}`}>
                      <TableCell className="font-semibold text-slate-500">{index + 1}</TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-900">{row.name}</p>
                        <p className="text-xs text-slate-500">{row.description}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.severity.variant}>{row.severity.label}</Badge>
                      </TableCell>
                      <TableCell>{row.count}</TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-900">{formatCurrency(row.impactValue)}</p>
                        <p className="text-xs text-slate-500">
                          {(row.impactShare * 100).toFixed(1)}% do risco total
                        </p>
                      </TableCell>
                      <TableCell className="max-w-sm text-sm text-slate-600">{row.action}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>

      <section id="evidencias">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-slate-900">Evidências de risco</h2>
          <p className="mt-1 text-sm text-slate-500">
            Principais deals ligados à distorção com maior necessidade de intervenção.
          </p>
        </div>
        {focusEvidenceDeals.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-slate-500">
              Sem evidências de deals no relatório atual.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {focusEvidenceDeals.map((deal, index) => (
              <Card key={`${deal.title}-${index}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{deal.company}</p>
                      <p className="mt-1 text-xs text-slate-500">{deal.title}</p>
                    </div>
                    <Badge variant="warning">{deal.days} dias</Badge>
                  </div>
                  <p className="mt-4 text-lg font-semibold text-slate-900">
                    {deal.value > 0 ? formatCurrency(deal.value) : '-'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Distorção: {focusEvidenceFriction?.name ?? '-'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section id="desempenho" className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="p-6">
            <CardTitle className="text-lg font-semibold">Pilares de desempenho</CardTitle>
            <p className="text-sm text-slate-500">
              Indicadores de saúde operacional do funil e velocidade de decisão.
            </p>
          </CardHeader>
          <CardContent className="space-y-5 p-6 pt-0">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-700">Pipeline hygiene</p>
                <Badge variant={hygiene >= 75 ? 'success' : hygiene >= 55 ? 'warning' : 'danger'}>
                  {hygiene.toFixed(1)}%
                </Badge>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400"
                  style={{ width: `${Math.min(100, Math.max(0, hygiene))}%` }}
                />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-700">Pós-proposta</p>
                <Badge variant={proposal >= 75 ? 'success' : proposal >= 55 ? 'warning' : 'danger'}>
                  {proposal.toFixed(1)}%
                </Badge>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-400"
                  style={{ width: `${Math.min(100, Math.max(0, proposal))}%` }}
                />
              </div>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-indigo-700">
              <p className="font-medium">Leitura rápida</p>
              <p className="mt-1">
                {hygiene >= 75 && proposal >= 75
                  ? 'Funil com boa higiene e baixa estagnação. Mantenha cadência comercial.'
                  : 'Há risco de acumulação em etapas críticas. Priorize os itens do ranking para reduzir ciclo.'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-6">
            <CardTitle className="text-lg font-semibold">Impacto financeiro</CardTitle>
            <p className="text-sm text-slate-500">
              Simulação de impacto com base no relatório mais recente.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 p-6 pt-0">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Receita anual (base)</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {revenueAnnual != null ? formatCurrency(revenueAnnual) : '-'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Redução de ciclo (%)</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {cycleReduction != null ? `${cycleReduction.toFixed(1)}%` : '-'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Receita antecipada</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {revenueAnticipated != null ? formatCurrency(revenueAnticipated) : '-'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600">
              <p className="flex items-center gap-2 font-medium text-slate-700">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                Próximo passo recomendado
              </p>
              <p className="mt-1">
                Execute o plano da semana e acompanhe o painel de IA para validar ganho de velocidade.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/app/settings">
                  <Button variant="outline" size="sm">
                    Ajustar regras
                  </Button>
                </Link>
                <Link href="/app/dashboard">
                  <Button size="sm">
                    Voltar ao painel
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <Zap className="h-4 w-4" />
              Valores variam conforme novos uploads e recálculo de fricções.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
