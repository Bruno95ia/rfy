/**
 * GET /api/metrics/summary?org_id=...
 * Retorna RFY Index, Receita Confiável (30d), Receita Inflada e generated_at do último snapshot.
 * Usado pelo dashboard para atualização reativa (polling).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuthAndOrgAccess } from '@/lib/auth';
import { computeRfySummary } from '@/lib/metrics/rfy-summary';
import { METRICS_DEFINITION_VERSION } from '@/lib/metrics/definitions';
import { isMissingMetricsDefinitionColumnError } from '@/lib/metrics/schema-fallback';
import { buildForecastAiRequestBody } from '@/lib/rfy/forecast-ai-payload';

const AI_BASE = process.env.AI_SERVICE_URL ?? 'http://localhost:8001';
const AI_FETCH_TIMEOUT_MS = 25000;

export type MetricsSummaryResponse = {
  generated_at: string | null;
  /** Semver das regras de métricas do último relatório; null se ainda não há relatório */
  metrics_definition_version: string | null;
  rfy_index_pct: number | null;
  receita_confiavel_30d: number;
  receita_inflada: number;
  pipeline_declarado: number;
  /** 'ai' = forecast do modelo; 'fallback' = estimativa heurística */
  rfy_source: 'ai' | 'fallback';
};

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get('org_id');
  const auth = await requireAuthAndOrgAccess(orgId);
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  let reportRes = await admin
    .from('reports')
    .select('generated_at, snapshot_json, metrics_definition_version')
    .eq('org_id', auth.orgId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (reportRes.error && isMissingMetricsDefinitionColumnError(reportRes.error.message)) {
    // eslint-disable-next-line no-console
    console.warn('[metrics/summary] fallback sem metrics_definition_version (aplique migration 020)');
    reportRes = await admin
      .from('reports')
      .select('generated_at, snapshot_json')
      .eq('org_id', auth.orgId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
  } else if (reportRes.error) {
    // eslint-disable-next-line no-console
    console.warn('[metrics/summary] reports query', reportRes.error.message);
  }

  const report = reportRes.data;

  const snapshot = (report?.snapshot_json as Record<string, unknown>) ?? {};
  const pipelineValueOpen = Number(snapshot?.pipeline_value_open) || 0;

  let forecastAdjusted: number | null = null;
  let pipelineBruto: number | null = null;
  try {
    const aiBody = await buildForecastAiRequestBody(admin, auth.orgId);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_FETCH_TIMEOUT_MS);
    const res = await fetch(`${AI_BASE}/predict/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aiBody),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = (await res.json()) as { forecast_adjusted?: number; pipeline_bruto?: number };
      forecastAdjusted = data.forecast_adjusted ?? null;
      pipelineBruto = data.pipeline_bruto ?? null;
    } else {
      // eslint-disable-next-line no-console
      console.warn('[metrics/summary] AI forecast retornou status não OK', {
        status: res.status,
        orgId: auth.orgId,
      });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[metrics/summary] AI forecast indisponível, usando fallback', {
      orgId: auth.orgId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const summary = computeRfySummary({
    pipelineValueOpen,
    forecastAdjusted,
    pipelineBruto,
  });

  const reportRow = report as Record<string, unknown> | null;
  const hasVersionColumn = reportRow != null && 'metrics_definition_version' in reportRow;
  const rawVer = reportRow?.metrics_definition_version;
  const metricsDefinitionVersionResolved =
    report == null
      ? null
      : typeof rawVer === 'string' && rawVer.length > 0
        ? rawVer
        : hasVersionColumn
          ? METRICS_DEFINITION_VERSION
          : null;

  const body: MetricsSummaryResponse = {
    generated_at: report?.generated_at ?? null,
    metrics_definition_version: metricsDefinitionVersionResolved,
    rfy_index_pct: summary.rfyIndexPct,
    receita_confiavel_30d: summary.receitaConfiavel30d,
    receita_inflada: summary.receitaInflada,
    pipeline_declarado: summary.pipelineDeclarado,
    rfy_source: summary.source,
  };

  return NextResponse.json(body);
}
