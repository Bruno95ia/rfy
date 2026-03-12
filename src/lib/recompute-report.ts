import type { SupabaseClient } from '@supabase/supabase-js';
import { inngest } from '@/inngest/client';
import { computeAndPersistReport } from '@/lib/report-compute-persist';
import { evaluateAlertsForOrg } from '@/lib/alerts/evaluate';

export type RecomputeDispatchResult = {
  mode: 'queued' | 'sync_fallback';
};

export async function dispatchReportRecompute(
  admin: SupabaseClient,
  orgId: string
): Promise<RecomputeDispatchResult> {
  try {
    await inngest.send({
      name: 'report/compute',
      data: { orgId },
    });
    return { mode: 'queued' };
  } catch {
    await computeAndPersistReport(admin, orgId, null);
    await evaluateAlertsForOrg(admin, orgId);
    return { mode: 'sync_fallback' };
  }
}
