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
  const { data: report } = await admin
    .from('reports')
    .select('generated_at, snapshot_json, metrics_definition_version')
    .eq('org_id', auth.orgId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const snapshot = (report?.snapshot_json as Record<string, unknown>) ?? {};
  const pipelineValueOpen = Number(snapshot?.pipeline_value_open) || 0;

  let forecastAdjusted: number | null = null;
  let pipelineBruto: number | null = null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_FETCH_TIMEOUT_MS);
    const res = await fetch(`${AI_BASE}/predict/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: auth.orgId }),
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

  const rawVersion = report?.metrics_definition_version;
  const metricsDefinitionVersionResolved =
    report == null
      ? null
      : typeof rawVersion === 'string' && rawVersion.length > 0
        ? rawVersion
        : METRICS_DEFINITION_VERSION;

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
