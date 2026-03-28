import { createAdminClient } from '@/lib/supabase/admin';

const DEFAULT_ORG_NAME = 'Minha organização';

/**
 * Nome da organização para UI (fonte única: tabela `orgs` via cliente admin).
 */
export async function getOrgDisplayName(orgId: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('orgs').select('name').eq('id', orgId).maybeSingle();
  if (error && process.env.NODE_ENV === 'development') {
    console.warn('[getOrgDisplayName]', error.message);
  }
  const name = (data as { name?: string } | null)?.name?.trim();
  return name || DEFAULT_ORG_NAME;
}
