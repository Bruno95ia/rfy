import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAndOrgAccess } from '@/lib/auth';

const AI_BASE = process.env.AI_SERVICE_URL ?? 'http://localhost:8001';
const AI_FETCH_TIMEOUT_MS = 30000;

function isNetworkError(e: unknown): boolean {
  if (e instanceof TypeError && e.message?.includes('fetch')) return true;
  const msg = e instanceof Error ? e.message : String(e);
  return /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|Failed to fetch|network/i.test(msg);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orgId = body?.org_id;
    const auth = await requireAuthAndOrgAccess(orgId);
    if (!auth.ok) return auth.response;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`${AI_BASE}/predict/forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: auth.orgId }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return NextResponse.json(
        { error: 'Resposta inválida do serviço de IA', code: 'AI_INVALID_RESPONSE' },
        { status: 502 }
      );
    }
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (e) {
    if (isNetworkError(e)) {
      return NextResponse.json(
        { error: 'Serviço de IA indisponível', code: 'AI_UNREACHABLE' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 }
    );
  }
}
