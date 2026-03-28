import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrgIdForUser, getOrgMemberRole, userHasOrgAccess } from '@/lib/auth';
import { appendAuditLog } from '@/lib/billing';

/** DELETE: revoga convite pendente */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: invite, error: fetchError } = await admin
    .from('org_invites')
    .select('id, org_id, email, status')
    .eq('id', id)
    .maybeSingle();

  if (fetchError || !invite) {
    return NextResponse.json({ error: 'Convite não encontrado' }, { status: 404 });
  }
  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'Convite já foi usado ou revogado' }, { status: 400 });
  }

  const hasAccess = await userHasOrgAccess(user.id, invite.org_id);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }
  const role = await getOrgMemberRole(user.id, invite.org_id);
  if (!role || !['owner', 'admin', 'manager'].includes(role)) {
    return NextResponse.json({ error: 'Sem permissão para revogar convites' }, { status: 403 });
  }

  const now = new Date().toISOString();
  await admin
    .from('org_invites')
    .update({ status: 'revoked', updated_at: now })
    .eq('id', id);

  await appendAuditLog(admin, {
    orgId: invite.org_id,
    actorUserId: user.id,
    action: 'invite.revoked',
    entityType: 'org_invite',
    entityId: invite.id,
    metadata: { email: invite.email },
  });

  return NextResponse.json({ ok: true });
}
