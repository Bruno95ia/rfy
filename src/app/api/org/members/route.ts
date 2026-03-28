import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrgMemberRole, requireApiUserOrgAccess } from '@/lib/auth';
import { appendAuditLog } from '@/lib/billing';

const deleteBodySchema = z.object({
  user_id: z.string().uuid('user_id inválido'),
});

const patchBodySchema = z.object({
  user_id: z.string().uuid('user_id inválido'),
  role: z.enum(['owner', 'admin', 'manager', 'viewer']),
});

/** GET: lista membros da organização (user_id, role, email). */
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

  const list = rows ?? [];
  const ids = list.map((r) => r.user_id);
  let emailById = new Map<string, string>();
  if (ids.length > 0) {
    const { data: users } = await admin.from('app_users').select('id, email').in('id', ids);
    emailById = new Map((users ?? []).map((u) => [u.id as string, u.email as string]));
  }

  const members = list.map((r) => ({
    user_id: r.user_id,
    role: (r.role as string) ?? 'viewer',
    email: emailById.get(r.user_id) ?? null,
  }));
  return NextResponse.json({ members, current_user_id: user.id });
}

/** PATCH: altera o papel de um membro (owner/admin/gestor com limites por nível). */
export async function PATCH(req: NextRequest) {
  const auth = await requireApiUserOrgAccess(req.nextUrl.searchParams.get('org_id'));
  if (!auth.ok) return auth.response;
  const { user, orgId } = auth;

  const actorRole = await getOrgMemberRole(user.id, orgId);
  if (!actorRole || !['owner', 'admin', 'manager'].includes(actorRole)) {
    return NextResponse.json({ error: 'Sem permissão para alterar papéis' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }
  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload inválido', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { user_id: targetUserId, role: newRole } = parsed.data;

  const admin = createAdminClient();
  const targetRole = await getOrgMemberRole(targetUserId, orgId);
  if (!targetRole) {
    return NextResponse.json({ error: 'Membro não encontrado nesta organização' }, { status: 404 });
  }

  if (actorRole === 'manager') {
    if (targetRole === 'owner' || targetRole === 'admin') {
      return NextResponse.json(
        { error: 'Gestores não podem alterar proprietários ou administradores' },
        { status: 403 }
      );
    }
    if (newRole === 'owner' || newRole === 'admin') {
      return NextResponse.json(
        { error: 'Gestores só podem definir os papéis utilizador (viewer) ou gestor (manager)' },
        { status: 403 }
      );
    }
  }

  if (actorRole === 'admin') {
    if (targetRole === 'owner' || newRole === 'owner') {
      return NextResponse.json(
        { error: 'Apenas o proprietário pode transferir ou alterar a propriedade' },
        { status: 403 }
      );
    }
  }

  if (newRole === 'owner' && actorRole !== 'owner') {
    return NextResponse.json({ error: 'Apenas o proprietário pode nomear outro proprietário' }, { status: 403 });
  }

  if (targetRole === 'owner' && newRole !== 'owner') {
    const { data: owners } = await admin
      .from('org_members')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('role', 'owner');
    if ((owners?.length ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'Tem de existir pelo menos um proprietário na organização' },
        { status: 400 }
      );
    }
  }

  const { error: upErr } = await admin
    .from('org_members')
    .update({ role: newRole })
    .eq('org_id', orgId)
    .eq('user_id', targetUserId);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  await appendAuditLog(admin, {
    orgId,
    actorUserId: user.id,
    action: 'member.role_updated',
    entityType: 'org_member',
    entityId: targetUserId,
    metadata: { from: targetRole, to: newRole },
  });

  return NextResponse.json({ ok: true, user_id: targetUserId, role: newRole });
}

/** DELETE: remove membro da organização (owner/admin; gestor só viewer/manager; não pode remover a si mesmo se for o único owner) */
export async function DELETE(req: NextRequest) {
  const auth = await requireApiUserOrgAccess(req.nextUrl.searchParams.get('org_id'));
  if (!auth.ok) return auth.response;
  const { user, orgId } = auth;
  const role = await getOrgMemberRole(user.id, orgId);
  if (!role || !['owner', 'admin', 'manager'].includes(role)) {
    return NextResponse.json({ error: 'Sem permissão para remover membros' }, { status: 403 });
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

  const admin = createAdminClient();
  const targetRole = await getOrgMemberRole(targetUserId, orgId);
  if (!targetRole) {
    return NextResponse.json({ error: 'Membro não encontrado nesta organização' }, { status: 404 });
  }

  if (role === 'manager') {
    if (targetRole === 'owner' || targetRole === 'admin') {
      return NextResponse.json(
        { error: 'Gestores não podem remover proprietários ou administradores' },
        { status: 403 }
      );
    }
  }

  if (targetUserId === user.id) {
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
