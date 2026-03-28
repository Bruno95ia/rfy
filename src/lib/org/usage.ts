import { createAdminClient } from '@/lib/supabase/admin';

const THIRTY_D_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Uploads processados (status done) nos últimos 30 dias — alinhado à lógica de usage em /api/settings.
 */
export async function getProcessedUploads30d(orgId: string): Promise<number> {
  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - THIRTY_D_MS).toISOString();
    const { count } = await admin
      .from('uploads')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'done')
      .gte('created_at', since);
    return count ?? 0;
  } catch {
    return 0;
  }
}
