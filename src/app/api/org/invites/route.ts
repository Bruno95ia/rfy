import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrgIdForUser, getOrgMemberRole, userHasOrgAccess } from '@/lib/auth';
import { appendAuditLog } from '@/lib/billing';
import { sendInviteEmail } from '@/lib/email/send';

const INVITE_EXPIRES_DAYS = 7;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

async function resolveOrgAndRequireManage(
  userId: string,
  orgIdParam: string | null
): Promise<{ ok: true; orgId: string } | { ok: false; res: NextResponse }> {
  const admin = createAdminClient();
  const orgId = orgIdParam?.trim() || (await getOrgIdForUser(userId));
  if (!orgId) {
    return { ok: false, res: NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 }) };
  }
  const hasAccess = await userHasOrgAccess(userId, orgId);
  if (!hasAccess) {
    return { ok: false, res: NextResponse.json({ error: 'Sem permissão' }, { status: 403 }) };
  }
  const role = await getOrgMemberRole(userId, orgId);
  if (!role || (role !== 'owner' && role !== 'admin')) {
    return { ok: false, res: NextResponse.json({ error: 'Apenas owner ou admin podem convidar' }, { status: 403 }) };
  }
  return { ok: true, orgId };
}

/** GET: lista convites pendentes da organização */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const orgId = req.nextUrl.searchParams.get('org_id');
  const check = await resolveOrgAndRequireManage(user.id, orgId);
  if (!check.ok) return check.res;

  const admin = createAdminClient();
  const { data: invites, error } = await admin
    .from('org_invites')
    .select('id, email, role, expires_at, status, created_at')
    .eq('org_id', check.orgId)
    .in('status', ['pending'])
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const now = new Date().toISOString();
  const valid = (invites ?? []).filter((i) => i.expires_at > now);
  return NextResponse.json({ invites: valid });
}

const createInviteSchema = z.object({
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'manager', 'viewer']).optional().default('viewer'),
  org_id: z.string().uuid().optional(),
});

/** POST: cria convite e envia email */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }
  const parsed = createInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload inválido', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { email, role, org_id } = parsed.data;

  const check = await resolveOrgAndRequireManage(user.id, org_id ?? null);
  if (!check.ok) return check.res;

  const admin = createAdminClient();

  const existing = await admin
    .from('org_invites')
    .select('id')
    .eq('org_id', check.orgId)
    .eq('email', email.toLowerCase().trim())
    .eq('status', 'pending')
    .maybeSingle();
  if (existing.data) {
    return NextResponse.json(
      { error: 'Já existe um convite pendente para este e-mail' },
      { status: 409 }
    );
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRES_DAYS);

  const { data: invite, error: insertError } = await admin
    .from('org_invites')
    .insert({
      org_id: check.orgId,
      email: email.toLowerCase().trim(),
      role,
      token,
      expires_at: expiresAt.toISOString(),
      invited_by_user_id: user.id,
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertError || !invite) {
    return NextResponse.json(
      { error: insertError?.message ?? 'Falha ao criar convite' },
      { status: 500 }
    );
  }

  const { data: org } = await admin.from('orgs').select('name').eq('id', check.orgId).single();
  const orgName = org?.name ?? 'Organização';
  const inviterName = user.email ?? user.user_metadata?.name ?? 'Alguém';
  const acceptUrl = `${APP_URL}/invite/accept?token=${token}`;

  const sendResult = await sendInviteEmail(email, orgName, inviterName, acceptUrl);
  if (!sendResult.ok) {
    // Convite foi criado; logamos falha de envio mas não falhamos a requisição
    console.warn('[invites] Failed to send email:', sendResult.error);
  }

  await appendAuditLog(admin, {
    orgId: check.orgId,
    actorUserId: user.id,
    action: 'invite.created',
    entityType: 'org_invite',
    entityId: invite.id,
    metadata: { email: email.toLowerCase(), role },
  });

  return NextResponse.json({
    id: invite.id,
    email: email.toLowerCase(),
    role,
    expires_at: expiresAt.toISOString(),
    email_sent: sendResult.ok,
  });
}
