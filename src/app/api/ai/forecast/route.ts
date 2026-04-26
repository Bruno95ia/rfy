import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAndOrgAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { buildForecastAiRequestBody } from '@/lib/rfy/forecast-ai-payload';

const AI_BASE = process.env.AI_SERVICE_URL ?? 'http://localhost:8001';
const AI_FETCH_TIMEOUT_MS = 15000;

/**
 * POST /api/ai/forecast — Forecast ajustado por P(win), com multiplicador RFY (maturidade + execução PAIP).
 * Body: { org_id, rfy_score?: number, execution_rate?: number }
 * Se rfy_score/execution_rate omitidos, derivam do último diagnóstico SUPHO e do PAIP ativo.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orgId = body?.org_id;
    const auth = await requireAuthAndOrgAccess(orgId ?? null);
    if (!auth.ok) return auth.response;

    let rfyScore = typeof body?.rfy_score === 'number' ? body.rfy_score : undefined;
    let executionRate = typeof body?.execution_rate === 'number' ? body.execution_rate : undefined;

    if (rfyScore === undefined || executionRate === undefined) {
      const supabase = await createClient();
      const built = await buildForecastAiRequestBody(supabase, auth.orgId);
      if (rfyScore === undefined && built.rfy_score != null) rfyScore = built.rfy_score;
      if (executionRate === undefined && built.execution_rate != null) executionRate = built.execution_rate;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_FETCH_TIMEOUT_MS);
    const res = await fetch(`${AI_BASE}/predict/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        org_id: auth.orgId,
        rfy_score: rfyScore,
        execution_rate: executionRate,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 }
    );
  }
}
