import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrgMemberRole, requireApiUserOrgAccess } from '@/lib/auth';
import { appendAuditLog } from '@/lib/billing';

const deleteBodySchema = z.object({
  user_id: z.string().uuid('user_id inválido'),
});

/** GET: lista membros da organização (user_id, role). Email não exposto por padrão. */
export async function GET(req: NextRequest) {
  const auth = await requireApiUserOrgAccess(req.nextUrl.searchParams.get('org_id'));
  if (!auth.ok) return auth.response;
  const { user, orgId } = auth;

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from('org_members')
    .select('user_id, role')
    .eq('org_id', orgId)
    .order('role', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const members = (rows ?? []).map((r) => ({
    user_id: r.user_id,
    role: r.role ?? 'viewer',
  }));
  return NextResponse.json({ members, current_user_id: user.id });
}

/** DELETE: remove membro da organização (apenas owner/admin; não pode remover a si mesmo se for o único owner) */
export async function DELETE(req: NextRequest) {
  const auth = await requireApiUserOrgAccess(req.nextUrl.searchParams.get('org_id'));
  if (!auth.ok) return auth.response;
  const { user, orgId } = auth;
  const role = await getOrgMemberRole(user.id, orgId);
  if (!role || (role !== 'owner' && role !== 'admin')) {
    return NextResponse.json({ error: 'Apenas owner ou admin podem remover membros' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }
  const parsed = deleteBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload inválido', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const targetUserId = parsed.data.user_id;

  if (targetUserId === user.id) {
    const admin = createAdminClient();
    const { data: owners } = await admin
      .from('org_members')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('role', 'owner');
    const ownerCount = owners?.length ?? 0;
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: 'Não é possível sair: transfira a propriedade ou adicione outro owner antes' },
        { status: 400 }
      );
    }
  }

  const admin = createAdminClient();
  const targetRole = await getOrgMemberRole(targetUserId, orgId);
  if (!targetRole) {
    return NextResponse.json({ error: 'Membro não encontrado nesta organização' }, { status: 404 });
  }
  if (targetRole === 'owner' && role !== 'owner') {
    return NextResponse.json({ error: 'Apenas um owner pode remover outro owner' }, { status: 403 });
  }

  const { error: deleteError } = await admin
    .from('org_members')
    .delete()
    .eq('org_id', orgId)
    .eq('user_id', targetUserId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  await appendAuditLog(admin, {
    orgId,
    actorUserId: user.id,
    action: 'member.removed',
    entityType: 'org_member',
    entityId: targetUserId,
    metadata: { removed_role: targetRole },
  });

  return NextResponse.json({ ok: true });
}
