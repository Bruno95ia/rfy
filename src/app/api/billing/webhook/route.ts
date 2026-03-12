/**
 * POST /api/billing/webhook — Webhook do provedor de pagamento (Stripe/Pagar.me).
 * Placeholder: responde 200 sem alterar estado até integração real.
 */
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ received: true });
}
