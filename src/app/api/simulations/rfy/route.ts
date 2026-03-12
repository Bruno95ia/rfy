/**
 * POST /api/simulations/rfy
 * Body: { org_id, improve_supho_by?, reduce_stage_time_by_pct?, increase_stage_conversion_by_pct? }
 * Retorna cenário simulado (rfy_index_simulado, receita_confiavel_30d, receita_inflada, breakdown).
 * Não persiste.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuthAndOrgAccess } from '@/lib/auth';
import { computeRfySimulation } from '@/lib/simulations/rfy';

const AI_BASE = process.env.AI_SERVICE_URL ?? 'http://localhost:8001';
const AI_FETCH_TIMEOUT_MS = 20000;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const orgId = body?.org_id as string | undefined;
  const auth = await requireAuthAndOrgAccess(orgId ?? null);
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const { data: report } = await admin
    .from('reports')
    .select('snapshot_json')
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
    const t = setTimeout(() => controller.abort(), AI_FETCH_TIMEOUT_MS);
    const res = await fetch(`${AI_BASE}/predict/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: auth.orgId }),
      signal: controller.signal,
    });
    clearTimeout(t);
    if (res.ok) {
      const data = (await res.json()) as { forecast_adjusted?: number; pipeline_bruto?: number };
      forecastAdjusted = data.forecast_adjusted ?? null;
      pipelineBruto = data.pipeline_bruto ?? null;
    }
  } catch {
    // AI indisponível
  }

  const declarado = pipelineBruto ?? pipelineValueOpen;
  const confiavel = forecastAdjusted ?? declarado * 0.7;
  const inflada = Math.max(0, declarado - confiavel);
  const rfyIndexPct =
    declarado > 0 && forecastAdjusted != null
      ? (forecastAdjusted / declarado) * 100
      : null;

  const baseline = {
    pipeline_declarado: declarado,
    receita_confiavel_30d: confiavel,
    receita_inflada: inflada,
    rfy_index_pct: rfyIndexPct,
  };

  const params = {
    improve_supho_by: body.improve_supho_by != null ? Number(body.improve_supho_by) : undefined,
    reduce_stage_time_by_pct: body.reduce_stage_time_by_pct != null ? Number(body.reduce_stage_time_by_pct) : undefined,
    increase_stage_conversion_by_pct: body.increase_stage_conversion_by_pct != null ? Number(body.increase_stage_conversion_by_pct) : undefined,
  };

  const result = computeRfySimulation(baseline, params);

  return NextResponse.json({
    baseline: result.baseline,
    rfy_index_simulado: result.simulated.rfy_index_pct,
    receita_confiavel_30d: result.simulated.receita_confiavel_30d,
    receita_inflada: result.simulated.receita_inflada,
    breakdown: result.breakdown,
  });
}
