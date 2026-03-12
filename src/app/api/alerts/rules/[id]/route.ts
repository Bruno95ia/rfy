/**
 * PATCH /api/alerts/rules/[id] (body: { org_id, severity?, threshold?, enabled?, cooldown_minutes?, channel_ids? })
 * DELETE /api/alerts/rules/[id]?org_id=...
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
  if (body.severity !== undefined) {
    const s = body.severity as string;
    if (!['low', 'medium', 'high', 'critical'].includes(s)) {
      return NextResponse.json({ error: 'severity inválida' }, { status: 400 });
    }
    updates.severity = s;
  }
  if (body.threshold !== undefined) updates.threshold = body.threshold == null ? null : Number(body.threshold);
  if (body.enabled !== undefined) updates.enabled = Boolean(body.enabled);
  if (body.cooldown_minutes !== undefined) updates.cooldown_minutes = Number(body.cooldown_minutes);
  if (body.channel_ids !== undefined) updates.channel_ids = Array.isArray(body.channel_ids) ? body.channel_ids : [];

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('alert_rules')
    .update(updates)
    .eq('id', id)
    .eq('org_id', auth.orgId)
    .select('id, org_id, rule_key, severity, threshold, enabled, cooldown_minutes, channel_ids, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Regra não encontrada' }, { status: 404 });
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
    .from('alert_rules')
    .delete()
    .eq('id', id)
    .eq('org_id', auth.orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
