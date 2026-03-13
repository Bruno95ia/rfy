/**
 * POST /api/integrations/piperun/sync
 * Dispara job de sincronização PipeRun (Inngest crm/piperun.sync).
 */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiUserOrgAccess } from '@/lib/auth';
import { inngest } from '@/inngest/client';

export async function POST(request: Request) {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;
  const { orgId } = auth;

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
