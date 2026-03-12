import { inngest } from '../client';
import { createAdminClient } from '@/lib/supabase/admin';

type LinkConfidence = 'high' | 'medium' | 'low' | 'none';

export const linkActivities = inngest.createFunction(
  {
    id: 'link-activities',
    retries: 2,
  },
  { event: 'activities/link' },
  async ({ event, step }) => {
    const { orgId, uploadId } = event.data;
    const admin = createAdminClient();

    const { data: activities } = await admin
      .from('activities')
      .select('id, company_name, opportunity_title, pipeline_name, created_at_crm')
      .eq('org_id', orgId)
      .eq('upload_id', uploadId);

    if (!activities || activities.length === 0) {
      return { linked: 0 };
    }

    const { data: opportunities } = await admin
      .from('opportunities')
      .select('id, crm_hash, company_name, title, pipeline_name, created_date')
      .eq('org_id', orgId);

    const oppByKey = new Map<
      string,
      Array<{
        id: string;
        crm_hash: string;
        company_name: string | null;
        title: string | null;
        pipeline_name: string | null;
        created_date: string | null;
      }>
    >();

    for (const o of opportunities ?? []) {
      const key = `${(o.company_name ?? '').trim()}|${(o.title ?? '').trim()}|${(o.pipeline_name ?? '').trim()}`;
      if (!oppByKey.has(key)) oppByKey.set(key, []);
      oppByKey.get(key)!.push({
        id: o.id,
        crm_hash: o.crm_hash,
        company_name: o.company_name,
        title: o.title,
        pipeline_name: o.pipeline_name,
        created_date: o.created_date,
      });
    }

    let linked = 0;
    for (const a of activities) {
      const company = (a.company_name ?? '').trim();
      const title = (a.opportunity_title ?? '').trim();
      const pipeline = (a.pipeline_name ?? '').trim();

      const key = `${company}|${title}|${pipeline}`;
      let candidates = oppByKey.get(key) ?? [];

      if (pipeline) {
        candidates = candidates.filter((c) => (c.pipeline_name ?? '').trim() === pipeline);
      }

      let linkedHash: string | null = null;
      let confidence: LinkConfidence = 'none';

      if (candidates.length === 1) {
        linkedHash = candidates[0].crm_hash;
        confidence = 'high';
      } else if (candidates.length > 1) {
        const actCreated = a.created_at_crm;
        const sorted = [...candidates].sort((x, y) => {
          const dx = x.created_date ? new Date(x.created_date).getTime() : 0;
          const dy = y.created_date ? new Date(y.created_date).getTime() : 0;
          const actTime = actCreated ? new Date(actCreated).getTime() : 0;
          return Math.abs(dx - actTime) - Math.abs(dy - actTime);
        });
        linkedHash = sorted[0]!.crm_hash;
        confidence = 'medium';
      }

      if (confidence !== 'none' && linkedHash) {
        await admin
          .from('activities')
          .update({
            linked_opportunity_hash: linkedHash,
            link_confidence: confidence,
          })
          .eq('id', a.id);
        linked++;
      }
    }

    await step.sendEvent('trigger-compute-report', {
      name: 'report/compute',
      data: { orgId, uploadId: null },
    });

    return { linked };
  }
);
