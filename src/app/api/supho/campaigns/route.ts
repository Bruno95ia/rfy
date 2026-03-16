import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiUserOrgAccess } from '@/lib/auth';

/** GET: lista campanhas da org do usuário */
export async function GET() {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('supho_diagnostic_campaigns')
    .select('id, name, status, started_at, closed_at, created_at, question_ids')
    .eq('org_id', auth.orgId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/** POST: cria campanha de diagnóstico */
export async function POST(req: NextRequest) {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const name = (body?.name as string)?.trim() || 'Nova campanha';
  const status = body?.status ?? 'draft';

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('supho_diagnostic_campaigns')
    .insert({ org_id: auth.orgId, name, status })
    .select('id, name, status, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
