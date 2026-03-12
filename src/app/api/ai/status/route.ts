import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAndOrgAccess } from '@/lib/auth';

const AI_BASE = process.env.AI_SERVICE_URL ?? 'http://localhost:8001';
const AI_FETCH_TIMEOUT_MS = 10000;

export type AIModelVersion = {
  model_name: string;
  version: string;
  trained_at: string | null;
  metrics: Record<string, unknown>;
};

/**
 * GET /api/ai/status — Status do serviço de IA e últimas versões de modelo.
 * Query: org_id (para auth). Retorna { health, models }.
 */
export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get('org_id');
    const auth = await requireAuthAndOrgAccess(orgId);
    if (!auth.ok) return auth.response;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_FETCH_TIMEOUT_MS);

    const [healthRes, modelsRes] = await Promise.all([
      fetch(`${AI_BASE}/health`, { signal: controller.signal }),
      fetch(`${AI_BASE}/models`, { signal: controller.signal }),
    ]);
    clearTimeout(timeoutId);

    const health =
      healthRes.ok ? ((await healthRes.json()) as { status?: string }) : null;
    const models = modelsRes.ok
      ? ((await modelsRes.json()) as AIModelVersion[])
      : [];

    return NextResponse.json({
      health: health?.status ?? (healthRes.ok ? 'ok' : 'error'),
      service: (health as { service?: string })?.service ?? 'ai-service',
      models,
      models_available: Array.isArray(models) && models.length > 0,
    });
  } catch (e) {
    return NextResponse.json(
      {
        health: 'unavailable',
        service: 'ai-service',
        models: [],
        models_available: false,
        error: String(e instanceof Error ? e.message : e),
      },
      { status: 200 }
    );
  }
}
