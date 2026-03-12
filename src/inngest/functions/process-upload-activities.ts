import { inngest } from '../client';
import { createAdminClient } from '@/lib/supabase/admin';
import { parsePiperunCsv } from '@/lib/piperun/csv';
import { normalizeActivityRow } from '@/lib/piperun/normalize';
import { getObjectBody } from '@/lib/storage';

export const processUploadActivities = inngest.createFunction(
  {
    id: 'process-upload-activities',
    retries: 2,
  },
  { event: 'upload/activities.process' },
  async ({ event, step }) => {
    const { uploadId, orgId, storagePath } = event.data;
    const admin = createAdminClient();

    await admin
      .from('uploads')
      .update({ status: 'processing' })
      .eq('id', uploadId);

    try {
      const body = await getObjectBody(storagePath);
      const rows = parsePiperunCsv(body);
      if (rows.length < 2) {
        throw new Error('CSV vazio ou sem dados');
      }

      const headers = rows[0];
      const records = rows.slice(1);

      const toInsert: Array<{
        org_id: string;
        upload_id: string;
        crm_activity_id: string | null;
        type: string | null;
        title: string | null;
        owner: string | null;
        start_at: string | null;
        due_at: string | null;
        done_at: string | null;
        created_at_crm: string | null;
        status: string | null;
        opportunity_id_crm: string | null;
        pipeline_name: string | null;
        stage_name: string | null;
        company_name: string | null;
        opportunity_title: string | null;
        opportunity_owner_name: string | null;
      }> = [];

      for (const record of records) {
        const row: Record<string, string> = {};
        headers.forEach((h, i) => {
          row[h] = record[i] ?? '';
        });
        const norm = normalizeActivityRow(row, headers);
        if (norm) {
          toInsert.push({
            org_id: orgId,
            upload_id: uploadId,
            crm_activity_id: norm.crm_activity_id,
            type: norm.type,
            title: norm.title,
            owner: norm.owner,
            start_at: norm.start_at,
            due_at: norm.due_at,
            done_at: norm.done_at,
            created_at_crm: norm.created_at_crm,
            status: norm.status,
            opportunity_id_crm: norm.opportunity_id_crm,
            pipeline_name: norm.pipeline_name,
            stage_name: norm.stage_name,
            company_name: norm.company_name,
            opportunity_title: norm.opportunity_title,
            opportunity_owner_name: norm.opportunity_owner_name,
          });
        }
      }

      if (toInsert.length > 0) {
        await admin.from('activities').delete().eq('upload_id', uploadId);
        await admin.from('activities').insert(toInsert);
      }

      await admin
        .from('uploads')
        .update({
          status: 'done',
          processed_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', uploadId);

      await step.sendEvent('trigger-link', {
        name: 'activities/link',
        data: { orgId, uploadId },
      });

      return { inserted: toInsert.length };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await admin
        .from('uploads')
        .update({
          status: 'failed',
          error_message: msg,
          processed_at: new Date().toISOString(),
        })
        .eq('id', uploadId);
      throw err;
    }
  }
);
