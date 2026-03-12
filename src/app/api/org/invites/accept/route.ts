import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { appendAuditLog } from '@/lib/billing';

const bodySchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
});

/** POST: aceita convite (usuário autenticado; email do convite deve coincidir com o do usuário) */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Faça login para aceitar o convite' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Token inválido', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { token } = parsed.data;

  const admin = createAdminClient();
  const { data: invite, error: fetchError } = await admin
    .from('org_invites')
    .select('id, org_id, email, role, expires_at, status')
    .eq('token', token)
    .maybeSingle();

  if (fetchError || !invite) {
    return NextResponse.json({ error: 'Convite não encontrado' }, { status: 404 });
  }
  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'Convite já foi usado ou revogado' }, { status: 400 });
  }
  const now = new Date().toISOString();
  if (invite.expires_at < now) {
    await admin
      .from('org_invites')
      .update({ status: 'expired', updated_at: now })
      .eq('id', invite.id);
    return NextResponse.json({ error: 'Convite expirado' }, { status: 400 });
  }
  const inviteEmail = invite.email?.toLowerCase().trim();
  const userEmail = user.email?.toLowerCase().trim();
  if (inviteEmail !== userEmail) {
    return NextResponse.json(
      { error: 'Este convite foi enviado para outro e-mail. Use a conta correta.' },
      { status: 403 }
    );
  }

  const { error: insertMemberError } = await admin.from('org_members').upsert(
    {
      org_id: invite.org_id,
      user_id: user.id,
      role: invite.role,
    },
    { onConflict: 'org_id,user_id', ignoreDuplicates: false }
  );

  if (insertMemberError) {
    return NextResponse.json(
      { error: 'Falha ao entrar na organização' },
      { status: 500 }
    );
  }

  await admin
    .from('org_invites')
    .update({ status: 'accepted', updated_at: now })
    .eq('id', invite.id);

  await appendAuditLog(admin, {
    orgId: invite.org_id,
    actorUserId: user.id,
    action: 'invite.accepted',
    entityType: 'org_invite',
    entityId: invite.id,
    metadata: { email: inviteEmail, role: invite.role },
  });

  return NextResponse.json({
    ok: true,
    org_id: invite.org_id,
    role: invite.role,
  });
}
