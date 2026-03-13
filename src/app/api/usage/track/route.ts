/**
 * POST /api/usage/track — Registra evento de uso (ex.: visualização de tela) para funil e retenção.
 * Body: { screen: string }. Requer autenticação e org.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrgIdForUser, requireApiAuth, userHasOrgAccess } from '@/lib/auth';
import { appendAuditLog } from '@/lib/billing';

const bodySchema = z.object({
  screen: z.string().min(1).max(128),
});

export async function POST(req: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido', details: [] }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload inválido', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const orgId = await getOrgIdForUser(user.id);
  if (!orgId) return NextResponse.json({ ok: true });
  if (!(await userHasOrgAccess(user.id, orgId))) return NextResponse.json({ ok: true });

  const admin = createAdminClient();
  await appendAuditLog(admin, {
    orgId,
    actorUserId: user.id,
    action: 'usage.screen_view',
    entityType: 'usage',
    metadata: { screen: parsed.data.screen },
  });
  return NextResponse.json({ ok: true });
}
