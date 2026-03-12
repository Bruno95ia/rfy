import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export type OrgRole = 'owner' | 'admin' | 'manager' | 'viewer';
const ROLE_WEIGHT: Record<OrgRole, number> = {
  owner: 4,
  admin: 3,
  manager: 2,
  viewer: 1,
};

function isMissingRoleColumnError(message?: string): boolean {
  const raw = (message ?? '').toLowerCase();
  return (
    raw.includes("could not find the 'role' column") ||
    (raw.includes('org_members') && raw.includes('role') && raw.includes('does not exist'))
  );
}

/**
 * Obtém o usuário autenticado ou redireciona para /login
 */
export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return { user, supabase };
}

/**
 * Provisiona org "Default" e org_members no primeiro login do usuário
 */
export async function provisionOrgOnFirstLogin(userId: string) {
  const admin = createAdminClient();

  const { data: members, error: membersError } = await admin
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .limit(1);

  if (membersError) {
    throw new Error('Falha ao consultar membros: ' + membersError.message);
  }

  if (members && members.length > 0) {
    return members[0].org_id;
  }

  const { data: org, error: orgError } = await admin
    .from('orgs')
    .insert({ name: 'Default' })
    .select('id')
    .single();

  if (orgError || !org) {
    throw new Error('Falha ao criar org: ' + (orgError?.message ?? 'unknown'));
  }

  const memberUpsert = await admin.from('org_members').upsert(
    {
      org_id: org.id,
      user_id: userId,
    },
    {
      onConflict: 'org_id,user_id',
      ignoreDuplicates: false,
    }
  );

  if (memberUpsert.error) {
    throw new Error('Falha ao adicionar membro: ' + memberUpsert.error.message);
  }

  const roleUpdate = await admin
    .from('org_members')
    .update({ role: 'owner' })
    .eq('org_id', org.id)
    .eq('user_id', userId);

  if (!roleUpdate.error || isMissingRoleColumnError(roleUpdate.error.message)) {
    return org.id;
  }

  throw new Error('Falha ao definir role do membro: ' + roleUpdate.error.message);
}

/**
 * Obtém org_id do usuário (fallback via admin quando RLS bloqueia)
 */
export async function getOrgIdForUser(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: members } = await admin
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .limit(1);
  return members?.[0]?.org_id ?? null;
}

/**
 * Para API routes: valida auth e acesso à org.
 * Retorna { ok: true, orgId } ou { ok: false, response } para retornar ao cliente.
 */
export async function requireAuthAndOrgAccess(orgId: string | null): Promise<
  | { ok: true; orgId: string }
  | { ok: false; response: Response }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) };
  }
  if (!orgId || typeof orgId !== 'string') {
    return { ok: false, response: NextResponse.json({ error: 'org_id obrigatório' }, { status: 400 }) };
  }
  const { data: members } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .limit(1);
  let hasAccess = (members?.length ?? 0) > 0;
  if (!hasAccess) {
    hasAccess = await userHasOrgAccess(user.id, orgId);
  }
  if (!hasAccess) {
    return { ok: false, response: NextResponse.json({ error: 'Sem permissão' }, { status: 403 }) };
  }
  return { ok: true, orgId };
}

/**
 * Verifica se o usuário pertence à org (fallback via admin quando RLS bloqueia)
 */
export async function userHasOrgAccess(
  userId: string,
  orgId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export async function getOrgMemberRole(
  userId: string,
  orgId: string
): Promise<OrgRole | null> {
  const admin = createAdminClient();
  try {
    const { data, error } = await admin
      .from('org_members')
      .select('role')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .maybeSingle();
    if (error) return isMissingRoleColumnError(error.message) ? 'owner' : null;
    const role = data?.role as OrgRole | undefined;
    if (!role || !(role in ROLE_WEIGHT)) return null;
    return role;
  } catch {
    return null;
  }
}

export async function userHasMinimumOrgRole(
  userId: string,
  orgId: string,
  minRole: OrgRole
): Promise<boolean> {
  const role = await getOrgMemberRole(userId, orgId);
  if (!role) return false;
  return ROLE_WEIGHT[role] >= ROLE_WEIGHT[minRole];
}
