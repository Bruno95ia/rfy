/**
 * PATCH /api/alerts/channels/[id] (body: { org_id, target?, config_json?, is_active? })
 * DELETE /api/alerts/channels/[id]?org_id=...
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuthAndOrgAccess } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const orgId = body?.org_id as string | undefined;
  const auth = await requireAuthAndOrgAccess(orgId ?? null);
  if (!auth.ok) return auth.response;

  const updates: Record<string, unknown> = {};
  if (body.target !== undefined) updates.target = String(body.target).trim();
  if (body.config_json !== undefined) updates.config_json = typeof body.config_json === 'object' ? body.config_json : {};
  if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('alert_channels')
    .update(updates)
    .eq('id', id)
    .eq('org_id', auth.orgId)
    .select('id, org_id, channel_type, target, config_json, is_active, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Canal não encontrado' }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orgId = req.nextUrl.searchParams.get('org_id');
  const auth = await requireAuthAndOrgAccess(orgId);
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const { error } = await supabase
    .from('alert_channels')
    .delete()
    .eq('id', id)
    .eq('org_id', auth.orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
