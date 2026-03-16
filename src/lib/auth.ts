import { getCurrentUser } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { appendFile } from 'node:fs/promises';

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

/** Usuário no formato esperado pelas rotas (id + email). */
export type AuthUser = { id: string; email: string };

type ApiAuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; response: NextResponse };

type ApiOrgAccessResult =
  | { ok: true; user: AuthUser; orgId: string }
  | { ok: false; response: NextResponse };

type ApiCampaignAccessResult =
  | {
      ok: true;
      user: AuthUser;
      orgId: string;
      campaign: { id: string; org_id: string };
    }
  | { ok: false; response: NextResponse };

/**
 * Obtém o usuário autenticado ou redireciona para /login.
 * Não usa mais Supabase; sessão via cookie (app_sessions).
 */
export async function requireAuth(): Promise<{ user: AuthUser }> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return { user };
}

/**
 * Para API routes: obtém o usuário autenticado ou retorna 401 em formato JSON.
 */
export async function requireApiAuth(): Promise<ApiAuthResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }),
    };
  }
  return { ok: true, user };
}

/**
 * Provisiona org "Default" e org_members no primeiro login do usuário.
 */
export async function provisionOrgOnFirstLogin(userId: string) {
  const admin = createAdminClient();

  const { data: members, error: membersError } = (await admin
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .limit(1)) as { data: { org_id: string }[] | null; error: { message: string } | null };

  if (membersError) {
    throw new Error('Falha ao consultar membros: ' + membersError.message);
  }

  if (members && members.length > 0) {
    return members[0].org_id;
  }

  const orgResult = (await admin
    .from('orgs')
    .insert({ name: 'Default' })
    .select('id')
    .single()) as { data: { id: string } | null; error: { message: string } | null };

  const org = orgResult.data;
  const orgError = orgResult.error;

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

  const roleUpdate = (await admin
    .from('org_members')
    .update({ role: 'owner' })
    .eq('org_id', org.id)
    .eq('user_id', userId)) as { error?: { message: string } };
  const roleErr = roleUpdate.error;
  if (!roleErr || isMissingRoleColumnError(roleErr.message)) {
    return org.id;
  }

  throw new Error('Falha ao definir role do membro: ' + roleErr.message);
}

/**
 * Obtém org_id do usuário.
 */
export async function getOrgIdForUser(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = (await admin
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .limit(1)) as { data: { org_id: string }[] | null };
  return data?.[0]?.org_id ?? null;
}

/**
 * Para API routes: resolve org do usuário e valida acesso.
 * Se orgId não for informado, usa a primeira organização do usuário.
 */
export async function requireApiUserOrgAccess(
  orgIdParam: string | null
): Promise<ApiOrgAccessResult> {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth;

  const orgId = orgIdParam?.trim() || (await getOrgIdForUser(auth.user.id));
  if (!orgId) {
    // #region agent log
    fetch('http://localhost:7298/ingest/81cfdc9b-8f3a-42d7-bcbf-e3113764efc8', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '497d65',
      },
      body: JSON.stringify({
        sessionId: '497d65',
        runId: 'pre-fix',
        hypothesisId: 'H1',
        location: 'src/lib/auth.ts:152-158',
        message: 'Org não encontrada em requireApiUserOrgAccess',
        data: { userId: auth.user.id, orgIdParam },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    appendFile(
      '/home/ubuntu/rfy/.cursor/debug-497d65.log',
      JSON.stringify({
        sessionId: '497d65',
        runId: 'pre-fix',
        hypothesisId: 'H1',
        location: 'src/lib/auth.ts:152-158',
        message: 'Org não encontrada em requireApiUserOrgAccess',
        data: { userId: auth.user.id, orgIdParam },
        timestamp: Date.now(),
      }) + '\n'
    ).catch(() => {});
    // #endregion
    return {
      ok: false,
      response: NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 }),
    };
  }

  if (!(await userHasOrgAccess(auth.user.id, orgId))) {
    // #region agent log
    fetch('http://localhost:7298/ingest/81cfdc9b-8f3a-42d7-bcbf-e3113764efc8', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '497d65',
      },
      body: JSON.stringify({
        sessionId: '497d65',
        runId: 'pre-fix',
        hypothesisId: 'H2',
        location: 'src/lib/auth.ts:160-165',
        message: 'Sem acesso à org em requireApiUserOrgAccess',
        data: { userId: auth.user.id, orgId },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    appendFile(
      '/home/ubuntu/rfy/.cursor/debug-497d65.log',
      JSON.stringify({
        sessionId: '497d65',
        runId: 'pre-fix',
        hypothesisId: 'H2',
        location: 'src/lib/auth.ts:160-165',
        message: 'Sem acesso à org em requireApiUserOrgAccess',
        data: { userId: auth.user.id, orgId },
        timestamp: Date.now(),
      }) + '\n'
    ).catch(() => {});
    // #endregion
    return {
      ok: false,
      response: NextResponse.json({ error: 'Sem permissão' }, { status: 403 }),
    };
  }

  return { ok: true, user: auth.user, orgId };
}

/**
 * Para API routes: resolve campanha SUPHO e valida se o usuário tem acesso à org da campanha.
 */
export async function requireApiCampaignAccess(
  campaignId: string
): Promise<ApiCampaignAccessResult> {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth;

  const admin = createAdminClient();
  const { data: campaign, error } = (await admin
    .from('supho_diagnostic_campaigns')
    .select('id, org_id')
    .eq('id', campaignId)
    .maybeSingle()) as {
    data: { id: string; org_id: string } | null;
    error: { message: string } | null;
  };

  if (error) {
    return {
      ok: false,
      response: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  if (!campaign) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 }),
    };
  }

  if (!(await userHasOrgAccess(auth.user.id, campaign.org_id))) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Sem acesso a esta campanha' }, { status: 403 }),
    };
  }

  return {
    ok: true,
    user: auth.user,
    orgId: campaign.org_id,
    campaign,
  };
}

/**
 * Para API routes: valida auth e acesso à org.
 * Retorna { ok: true, orgId } ou { ok: false, response } para retornar ao cliente.
 */
export async function requireAuthAndOrgAccess(orgId: string | null): Promise<
  | { ok: true; orgId: string }
  | { ok: false; response: Response }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) };
  }
  if (!orgId || typeof orgId !== 'string') {
    return { ok: false, response: NextResponse.json({ error: 'org_id obrigatório' }, { status: 400 }) };
  }
  const admin = createAdminClient();
  const { data: members } = (await admin
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .limit(1)) as { data: unknown[] | null };
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
 * Verifica se o usuário pertence à org.
 */
export async function userHasOrgAccess(
  userId: string,
  orgId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = (await admin
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .limit(1)) as { data: unknown[] | null };
  return (data?.length ?? 0) > 0;
}

export async function getOrgMemberRole(
  userId: string,
  orgId: string
): Promise<OrgRole | null> {
  const admin = createAdminClient();
  try {
    const result = (await admin
      .from('org_members')
      .select('role')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .maybeSingle()) as { error?: { message: string }; data?: { role?: string } };
    const { error, data } = result;
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

/**
 * Verifica se o usuário é admin de plataforma (gestão global de usuários).
 */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('app_users')
    .select('id, is_platform_admin, is_active')
    .eq('id', userId)
    .maybeSingle();
  if (!data) return false;
  // Só considera admin se o usuário estiver ativo
  return Boolean((data as { is_platform_admin?: boolean; is_active?: boolean }).is_platform_admin) &&
    (data as { is_platform_admin?: boolean; is_active?: boolean }).is_active !== false;
}

/**
 * Para API routes: exige usuário autenticado e admin de plataforma.
 */
export async function requirePlatformAdminApi(): Promise<
  | { ok: true; user: AuthUser }
  | { ok: false; response: NextResponse }
> {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth;

  const canAdmin = await isPlatformAdmin(auth.user.id);
  if (!canAdmin) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Apenas administradores da plataforma podem acessar este recurso' },
        { status: 403 }
      ),
    };
  }

  return { ok: true, user: auth.user };
}
