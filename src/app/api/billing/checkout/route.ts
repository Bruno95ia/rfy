/**
 * POST /api/billing/checkout — Cria sessão de checkout Stripe.
 * Quando STRIPE_SECRET_KEY e preços (STRIPE_PRICE_<plan_id>) estão configurados,
 * cria uma Checkout Session e retorna a URL. Caso contrário retorna 501.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthAndOrgAccess } from '@/lib/auth';
import Stripe from 'stripe';

const bodySchema = z.object({
  org_id: z.string().uuid(),
  plan_id: z.string().min(1),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
});

function getStripeSecretKey(): string | null {
  return process.env.STRIPE_SECRET_KEY?.trim() || null;
}

function getPriceIdForPlan(planId: string): string | null {
  const key = `STRIPE_PRICE_${planId.toUpperCase().replace(/-/g, '_')}`;
  return (process.env[key] as string)?.trim() || null;
}

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

  const secretKey = getStripeSecretKey();
  const priceId = getPriceIdForPlan(parsed.data.plan_id);

  if (!secretKey || !priceId) {
    return NextResponse.json(
      {
        error: 'Checkout em configuração. Defina STRIPE_SECRET_KEY e STRIPE_PRICE_<plan_id>.',
        code: 'BILLING_NOT_CONFIGURED',
      },
      { status: 501 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const successUrl = parsed.data.success_url ?? `${baseUrl}/app/settings?billing=success`;
  const cancelUrl = parsed.data.cancel_url ?? `${baseUrl}/app/settings?billing=cancel`;

  try {
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: auth.orgId,
      metadata: { org_id: auth.orgId, plan_id: parsed.data.plan_id },
      subscription_data: {
        metadata: { org_id: auth.orgId, plan_id: parsed.data.plan_id },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: 'Stripe não retornou URL de checkout' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url, session_id: session.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[billing/checkout]', message);
    return NextResponse.json(
      { error: 'Erro ao criar sessão de checkout', details: message },
      { status: 500 }
    );
  }
}
