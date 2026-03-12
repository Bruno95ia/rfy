/**
 * GET /api/billing/status?org_id=...
 * Retorna status da assinatura da organização (para banner/restrição na app).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuthAndOrgAccess } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get('org_id');
  const auth = await requireAuthAndOrgAccess(orgId);
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from('org_subscriptions')
    .select('status, plan_id, period_end, cancel_at_period_end')
    .eq('org_id', auth.orgId)
    .maybeSingle();

  return NextResponse.json({
    status: sub?.status ?? 'active',
    plan_id: sub?.plan_id ?? 'starter',
    period_end: sub?.period_end ?? null,
    cancel_at_period_end: sub?.cancel_at_period_end ?? false,
  });
}
