/**
 * POST /api/integrations/piperun/connect
 * Grava token e base URL da integração PipeRun para a organização (storage seguro).
 */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiUserOrgAccess } from '@/lib/auth';
import { encrypt } from '@/lib/crypto';
import { appendAuditLog } from '@/lib/billing';

export async function POST(request: Request) {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;
  const { user, orgId } = auth;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 });
  }

  const apiKey = typeof body.api_key === 'string' ? body.api_key.trim() : '';
  const apiUrl = typeof body.api_url === 'string' ? body.api_url.trim() : null;
  if (!apiKey) {
    return NextResponse.json({ error: 'api_key é obrigatório' }, { status: 400 });
  }

  const baseUrl = apiUrl || 'https://api.piperun.com';

  const admin = createAdminClient();
  await admin.from('crm_integrations').upsert(
    {
      org_id: orgId,
      provider: 'piperun',
      api_key_encrypted: encrypt(apiKey),
      api_url: baseUrl,
      is_active: true,
      last_sync_at: null,
      last_sync_status: null,
      last_sync_error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id,provider', ignoreDuplicates: false }
  );

  try {
    await appendAuditLog(admin, {
      orgId,
      actorUserId: user.id,
      action: 'crm.integration.connected',
      entityType: 'crm_integrations',
      metadata: { provider: 'piperun' },
    });
  } catch {
    // compatibilidade
  }

  return NextResponse.json({ ok: true });
}
