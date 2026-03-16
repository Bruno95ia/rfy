import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiUserOrgAccess } from '@/lib/auth';

/** GET: metas trimestrais da org (para dashboard/widget) */
export async function GET() {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('quarterly_goals')
    .select('id, year, quarter, target_revenue, target_win_rate, target_cycle_days, notes')
    .eq('org_id', auth.orgId)
    .order('year', { ascending: false })
    .order('quarter', { ascending: false })
    .limit(8);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
