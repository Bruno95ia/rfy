import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAndOrgAccess } from '@/lib/auth';

const AI_BASE = process.env.AI_SERVICE_URL ?? 'http://localhost:8001';
const AI_FETCH_TIMEOUT_MS = 15000;

/**
 * POST /api/ai/deal — Previsão por deal (P(win), risk_delay, expected_close_days).
 * Body: { org_id, deal_id }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orgId = body?.org_id;
    const dealId = body?.deal_id;
    const auth = await requireAuthAndOrgAccess(orgId);
    if (!auth.ok) return auth.response;
    if (!dealId || typeof dealId !== 'string') {
      return NextResponse.json(
        { error: 'deal_id é obrigatório' },
        { status: 400 }
      );
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_FETCH_TIMEOUT_MS);
    const res = await fetch(`${AI_BASE}/predict/deal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: auth.orgId, deal_id: String(dealId) }),
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
