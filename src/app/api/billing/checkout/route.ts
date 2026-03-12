/**
 * POST /api/billing/checkout — Cria sessão de checkout (Stripe/Pagar.me).
 * Placeholder: retorna 501 até integração real.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthAndOrgAccess } from '@/lib/auth';

const bodySchema = z.object({
  org_id: z.string().uuid(),
  plan_id: z.string().min(1),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload inválido', details: parsed.error.issues },
      { status: 400 }
    );
  }
  const auth = await requireAuthAndOrgAccess(parsed.data.org_id);
  if (!auth.ok) return auth.response;

  return NextResponse.json(
    {
      error: 'Checkout em configuração. Em breve: Stripe ou Pagar.me.',
      code: 'BILLING_NOT_CONFIGURED',
    },
    { status: 501 }
  );
}
