/**
 * POST /api/integrations/piperun/test
 * Valida credenciais PipeRun da organização (sem alterar dados).
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrgIdForUser, userHasOrgAccess } from '@/lib/auth';
import { decrypt } from '@/lib/crypto';
import { testConnection } from '@/lib/crm/providers/piperun';

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
