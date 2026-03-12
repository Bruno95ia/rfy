/**
 * POST /api/integrations/piperun/sync
 * Dispara job de sincronização PipeRun (Inngest crm/piperun.sync).
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrgIdForUser, userHasOrgAccess } from '@/lib/auth';
import { inngest } from '@/inngest/client';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  let orgId = (await supabase.from('org_members').select('org_id').limit(1)).data?.[0]?.org_id;
  if (!orgId) orgId = await getOrgIdForUser(user.id);
  if (!orgId) {
    return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 });
  }
  if (!(await userHasOrgAccess(user.id, orgId))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: integration } = await admin
    .from('crm_integrations')
    .select('id')
    .eq('org_id', orgId)
    .eq('provider', 'piperun')
    .eq('is_active', true)
    .maybeSingle();

  if (!integration) {
    return NextResponse.json(
      { error: 'Integração PipeRun não encontrada ou inativa.' },
      { status: 404 }
    );
  }

  try {
    await inngest.send({
      name: 'crm/piperun.sync',
      data: { orgId },
    });
  } catch (err) {
    console.error('Inngest send error:', err);
    return NextResponse.json(
      { error: 'Falha ao enfileirar sincronização' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, message: 'Sincronização enfileirada' });
}
