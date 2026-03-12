import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthAndOrgAccess } from '@/lib/auth';

const AI_BASE = process.env.AI_SERVICE_URL ?? 'http://localhost:8001';
const AI_FETCH_TIMEOUT_MS = 300000; // 5 min — treino pode demorar

const postBodySchema = z.object({
  org_id: z.string().uuid('org_id inválido'),
});

/**
 * POST /api/ai/train — Dispara treinamento do modelo no AI Service.
 * O secret é enviado apenas pelo servidor (AI_TRAIN_SECRET). Body: { org_id } (para auth).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = postBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload inválido', details: parsed.error.issues },
        { status: 400 }
      );
    }
    const { org_id: orgId } = parsed.data;
    const auth = await requireAuthAndOrgAccess(orgId);
    if (!auth.ok) return auth.response;

    const secret = process.env.AI_TRAIN_SECRET;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (secret) {
      headers['X-Train-API-Key'] = secret;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_FETCH_TIMEOUT_MS);
    const res = await fetch(`${AI_BASE}/train`, {
      method: 'POST',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        data?.detail ? { error: data.detail } : data,
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e), ok: false },
      { status: 500 }
    );
  }
}
