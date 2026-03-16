import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlatformAdminApi } from '@/lib/auth';

const updateUserSchema = z.object({
  user_id: z.string().uuid('user_id inválido'),
  action: z.enum(['activate', 'deactivate', 'make_admin', 'remove_admin']),
});

/** GET /api/admin/users - lista usuários cadastrados na plataforma (somente admin de plataforma). */
export async function GET() {
  const auth = await requirePlatformAdminApi();
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('app_users')
    .select('id, email, created_at, is_active, is_platform_admin')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [] });
}

/** POST /api/admin/users - atualiza status (ativo/inativo) ou papel admin de um usuário. */
export async function POST(req: NextRequest) {
  const auth = await requirePlatformAdminApi();
  if (!auth.ok) return auth.response;
  const { user: actingUser } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload inválido', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { user_id, action } = parsed.data;

  // Evita que o admin remova o próprio acesso ou se desative.
  if (user_id === actingUser.id && (action === 'deactivate' || action === 'remove_admin')) {
    return NextResponse.json(
      { error: 'Você não pode desativar sua própria conta ou remover seu próprio acesso de admin.' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  if (action === 'activate' || action === 'deactivate') {
    const isActive = action === 'activate';
    const updateRes = await admin
      .from('app_users')
      .update({ is_active: isActive })
      .eq('id', user_id)
      .select('id')
      .maybeSingle();

    if (updateRes.error) {
      return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
    }
    if (!updateRes.data) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Se desativar, derruba sessões atuais do usuário.
    if (!isActive) {
      const delRes = await new Promise<{ data: null; error: { message: string } | null }>(
        (resolve) => {
          admin.from('app_sessions').delete().eq('user_id', user_id).then(resolve);
        }
      );
      if (delRes.error) {
        return NextResponse.json(
          { error: 'Falha ao encerrar sessões do usuário: ' + delRes.error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true });
  }

  if (action === 'make_admin' || action === 'remove_admin') {
    const isAdmin = action === 'make_admin';
    const updateRes = await admin
      .from('app_users')
      .update({ is_platform_admin: isAdmin })
      .eq('id', user_id)
      .select('id')
      .maybeSingle();

    if (updateRes.error) {
      return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
    }
    if (!updateRes.data) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}

