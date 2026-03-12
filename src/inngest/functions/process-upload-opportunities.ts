import { inngest } from '../client';
import { createAdminClient } from '@/lib/supabase/admin';
import { parsePiperunCsv } from '@/lib/piperun/csv';
import { normalizeOpportunityRow } from '@/lib/piperun/normalize';
import { getObjectBody } from '@/lib/storage';

export const processUploadOpportunities = inngest.createFunction(
  {
    id: 'process-upload-opportunities',
    retries: 2,
  },
  { event: 'upload/opportunities.process' },
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
        crm_source: string;
        crm_hash: string;
        pipeline_name: string | null;
        stage_name: string | null;
        stage_timing_days: number | null;
        owner_email: string | null;
        owner_name: string | null;
        company_name: string | null;
        title: string | null;
        value: number | null;
        created_date: string | null;
        closed_date: string | null;
        status: 'open' | 'won' | 'lost';
        tags: string | null;
      }> = [];

      for (const record of records) {
        const row: Record<string, string> = {};
        headers.forEach((h, i) => {
          row[h] = record[i] ?? '';
        });
        const norm = normalizeOpportunityRow(row, headers);
        if (norm) {
          toInsert.push({
            org_id: orgId,
            upload_id: uploadId,
            crm_source: 'piperun',
            crm_hash: norm.crm_hash,
            pipeline_name: norm.pipeline_name,
            stage_name: norm.stage_name,
            stage_timing_days: norm.stage_timing_days,
            owner_email: norm.owner_email,
            owner_name: norm.owner_name,
            company_name: norm.company_name,
            title: norm.title,
            value: norm.value,
            created_date: norm.created_date,
            closed_date: norm.closed_date,
            status: norm.status,
            tags: norm.tags,
          });
        }
      }

      if (toInsert.length > 0) {
        await admin.from('opportunities').delete().eq('upload_id', uploadId);
        await admin.from('opportunities').insert(toInsert);
      }

      await admin
        .from('uploads')
        .update({
          status: 'done',
          processed_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', uploadId);

      await step.sendEvent('trigger-compute-report', {
        name: 'report/compute',
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
