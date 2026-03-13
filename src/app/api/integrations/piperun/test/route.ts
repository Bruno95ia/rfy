/**
 * POST /api/integrations/piperun/test
 * Valida credenciais PipeRun da organização (sem alterar dados).
 */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiUserOrgAccess } from '@/lib/auth';
import { decrypt } from '@/lib/crypto';
import { testConnection } from '@/lib/crm/providers/piperun';

export async function POST(request: Request) {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;
  const { orgId } = auth;

  const admin = createAdminClient();
  const { data: integration } = await admin
    .from('crm_integrations')
    .select('api_key_encrypted, api_url')
    .eq('org_id', orgId)
    .eq('provider', 'piperun')
    .maybeSingle();

  if (!integration?.api_key_encrypted) {
    return NextResponse.json(
      { error: 'Integração PipeRun não configurada. Use connect primeiro.' },
      { status: 404 }
    );
  }

  const apiKey = decrypt(integration.api_key_encrypted);
  const apiUrl = (integration.api_url as string)?.trim() || 'https://api.piperun.com';
  const result = await testConnection({ apiUrl, apiKey });

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
