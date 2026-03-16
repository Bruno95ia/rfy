import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiUserOrgAccess } from '@/lib/auth';

/** GET: lista runs de certificação da org */
export async function GET() {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('supho_certification_runs')
    .select('id, run_at, level, valid_until, maintenance_plan_json, created_at')
    .eq('org_id', auth.orgId)
    .order('run_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/** POST: cria run de certificação */
export async function POST(req: NextRequest) {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const level = (body?.level as string) || 'bronze';
  const validUntil = (body?.valid_until as string) || null;
  const maintenancePlan = (body?.maintenance_plan_json as Record<string, unknown>) || {};

  if (!['bronze', 'prata', 'ouro'].includes(level)) {
    return NextResponse.json({ error: 'level deve ser bronze, prata ou ouro' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('supho_certification_runs')
    .insert({
      org_id: auth.orgId,
      level,
      valid_until: validUntil || null,
      maintenance_plan_json: maintenancePlan,
    })
    .select('id, run_at, level, valid_until, maintenance_plan_json, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
