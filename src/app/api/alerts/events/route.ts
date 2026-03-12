/**
 * GET /api/alerts/events?org_id=...&limit=20&offset=0
 * Retorna eventos de alerta paginados (in-app).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuthAndOrgAccess } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get('org_id');
  const auth = await requireAuthAndOrgAccess(orgId);
  if (!auth.ok) return auth.response;

  const limit = Math.min(
    Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10)),
    100
  );
  const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get('offset') ?? '0', 10));

  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from('alert_events')
    .select('id, org_id, rule_id, severity, payload_json, status, created_at', { count: 'exact' })
    .eq('org_id', auth.orgId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    events: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  });
}
