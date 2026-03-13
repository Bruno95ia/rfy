import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
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
  let query = admin.from('form_invites').delete();
  if (formSlug) {
    query = query.eq('form_slug', formSlug);
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, form_slug: formSlug ?? null });
}

