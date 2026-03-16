import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiUserOrgAccess } from '@/lib/auth';

async function checkRitualOrgAccess(
  admin: ReturnType<typeof createAdminClient>,
  ritualId: string,
  orgId: string
): Promise<boolean> {
  const { data: ritual } = await admin.from('supho_rituals').select('template_id').eq('id', ritualId).single();
  if (!ritual) return false;
  const { data: template } = await admin
    .from('supho_ritual_templates')
    .select('org_id')
    .eq('id', ritual.template_id)
    .single();
  return template?.org_id === orgId;
}

/** GET: lista decisões de um ritual */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;

  const { id: ritualId } = await params;
  const admin = createAdminClient();

  const ok = await checkRitualOrgAccess(admin, ritualId, auth.orgId);
  if (!ok) return NextResponse.json({ error: 'Ritual não encontrado' }, { status: 404 });

  const { data, error } = await admin
    .from('supho_ritual_decisions')
    .select('id, decision_text, action_text, owner_id, due_at, status, created_at')
    .eq('ritual_id', ritualId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/** POST: adiciona decisão ao ritual */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;

  const { id: ritualId } = await params;
  const body = await req.json().catch(() => ({}));
  const decisionText = (body?.decision_text as string)?.trim();
  const actionText = (body?.action_text as string)?.trim();
  const ownerId = (body?.owner_id as string)?.trim() || null;
  const dueAt = (body?.due_at as string) || null;
  const status = (body?.status as string) || 'open';

  const admin = createAdminClient();
  const ok = await checkRitualOrgAccess(admin, ritualId, auth.orgId);
  if (!ok) return NextResponse.json({ error: 'Ritual não encontrado' }, { status: 404 });

  const { data, error } = await admin
    .from('supho_ritual_decisions')
    .insert({
      ritual_id: ritualId,
      decision_text: decisionText || null,
      action_text: actionText || null,
      owner_id: ownerId,
      due_at: dueAt || null,
      status: status === 'done' ? 'done' : status === 'cancelled' ? 'cancelled' : 'open',
    })
    .select('id, decision_text, action_text, owner_id, due_at, status, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
