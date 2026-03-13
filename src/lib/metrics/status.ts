import type { AdminDbClientType } from '@/lib/supabase/admin';

export type MetricsStatus = {
  org_id: string;
  version: number;
  last_updated_at: string;
};

export function nextMetricsVersion(currentVersion: number | null | undefined): number {
  if (typeof currentVersion !== 'number' || Number.isNaN(currentVersion) || currentVersion < 1) {
    return 1;
  }
  return Math.trunc(currentVersion) + 1;
}

export async function touchMetricsStatus(
  admin: AdminDbClientType,
  orgId: string,
  nowIso?: string
): Promise<MetricsStatus> {
  const now = nowIso ?? new Date().toISOString();

  const { data: current } = await admin
    .from('metrics_status')
    .select('version')
    .eq('org_id', orgId)
    .maybeSingle();

  const nextVersion = nextMetricsVersion(
    current && typeof current.version === 'number' ? current.version : null
  );

  await admin
    .from('metrics_status')
    .upsert(
      {
        org_id: orgId,
        version: nextVersion,
        last_updated_at: now,
        updated_at: now,
      },
      { onConflict: 'org_id', ignoreDuplicates: false }
    );

  return {
    org_id: orgId,
    version: nextVersion,
    last_updated_at: now,
  };
}

export async function getMetricsStatus(
  admin: AdminDbClientType,
  orgId: string
): Promise<MetricsStatus> {
  const { data: status } = await admin
    .from('metrics_status')
    .select('org_id, version, last_updated_at')
    .eq('org_id', orgId)
    .maybeSingle();

  if (status?.org_id && status.last_updated_at && typeof status.version === 'number') {
    return {
      org_id: status.org_id,
      version: status.version,
      last_updated_at: status.last_updated_at,
    };
  }

  const { data: report } = await admin
    .from('reports')
    .select('generated_at')
    .eq('org_id', orgId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    org_id: orgId,
    version: 0,
    last_updated_at: report?.generated_at ?? new Date(0).toISOString(),
  };
}
