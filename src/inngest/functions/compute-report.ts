import { inngest } from '../client';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeAndPersistReport } from '@/lib/report-compute-persist';

export const computeReport = inngest.createFunction(
  {
    id: 'compute-report',
    retries: 2,
  },
  { event: 'report/compute' },
  async ({ event, step }) => {
    const { orgId, uploadId } = event.data;
    const start = Date.now();
    const admin = createAdminClient();
    await computeAndPersistReport(admin, orgId, uploadId ?? null);
    const durationMs = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.info('[report/compute]', { orgId, durationMs });
    }
    await step.sendEvent('alerts-evaluate-after-report', {
      name: 'alerts/evaluate',
      data: { orgId },
    });
    return { ok: true };
  }
);
