import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, type DeleteResult } from '@/lib/supabase/admin';
import { requireApiAuth, getOrgIdForUser, userHasMinimumOrgRole } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const user = auth.user;
  const orgId = await getOrgIdForUser(user.id);
  if (!orgId) {
    return NextResponse.json({ error: 'Organização não encontrada para o usuário' }, { status: 404 });
  }

  const isAdmin = await userHasMinimumOrgRole(user.id, orgId, 'admin');
  if (!isAdmin) {
    return NextResponse.json({ error: 'Apenas owner/admin podem resetar convites' }, { status: 403 });
  }

  let formSlug: string | null = null;
  try {
    const body = await req.json().catch(() => null);
    if (body && typeof body.form_slug === 'string' && body.form_slug.trim()) {
      formSlug = body.form_slug.trim();
    }
  } catch {
    // body opcional; ignoramos erro
  }

  const admin = createAdminClient();
  const base = admin.from('form_invites').delete();
  const query = formSlug ? base.eq('form_slug', formSlug) : base;
  const { error } = (await query) as DeleteResult;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, form_slug: formSlug ?? null });
}

