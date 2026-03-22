import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuthAndOrgAccess } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orgId = req.nextUrl.searchParams.get('org_id');
  const auth = await requireAuthAndOrgAccess(orgId);
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const updateRes = await admin
    .from('alerts')
    .update({ resolved_at: new Date().toISOString() })
    .eq('org_id', auth.orgId)
    .eq('id', id)
    .is('resolved_at', null);

  if (updateRes.error) {
    return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
  }

  const { data } = await admin
    .from('alerts')
    .select('id, resolved_at')
    .eq('org_id', auth.orgId)
    .eq('id', id)
    .maybeSingle();

  if (!data || !(data as { resolved_at?: string | null }).resolved_at) {
    return NextResponse.json({ error: 'Alerta não encontrado ou já resolvido' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
