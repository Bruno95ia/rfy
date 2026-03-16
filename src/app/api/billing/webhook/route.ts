/**
 * POST /api/billing/webhook — Webhook Stripe para assinaturas.
 * Verifica assinatura com STRIPE_WEBHOOK_SECRET e atualiza org_subscriptions.
 */
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ received: true });
  }

  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[billing/webhook] signature verification failed:', message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const admin = createAdminClient();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orgId = (session.client_reference_id || session.metadata?.org_id) as string | null;
    const planId = (session.metadata?.plan_id as string) || 'pro';
    const subscriptionId = session.subscription as string | null;

    if (!orgId || !subscriptionId) {
      console.warn('[billing/webhook] checkout.session.completed missing org_id or subscription');
      return NextResponse.json({ received: true });
    }

    const now = new Date().toISOString();
    await admin.from('org_subscriptions').upsert(
      {
        org_id: orgId,
        plan_id: planId,
        status: 'active',
        period_start: now,
        period_end: null,
        updated_at: now,
      },
      { onConflict: 'org_id', ignoreDuplicates: false }
    );
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    const orgId = sub.metadata?.org_id as string | null;
    const planId = sub.metadata?.plan_id as string | null;

    if (!orgId) {
      return NextResponse.json({ received: true });
    }

    const status = sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'past_due' : 'canceled';
    const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
    const now = new Date().toISOString();

    await admin
      .from('org_subscriptions')
      .update({
        plan_id: planId || 'starter',
        status,
        period_end: periodEnd,
        updated_at: now,
      })
      .eq('org_id', orgId);
  }

  return NextResponse.json({ received: true });
}
