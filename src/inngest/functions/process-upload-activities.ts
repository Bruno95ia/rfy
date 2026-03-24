import { inngest } from '../client';
import { createAdminClient } from '@/lib/supabase/admin';
import { processActivitiesFromStorage } from '@/lib/upload-process';

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
      const { data: uploadRow } = await admin
        .from('uploads')
        .select('filename')
        .eq('id', uploadId)
        .single();

      const originalFilename = uploadRow?.filename ?? 'upload.csv';

      const { inserted } = await processActivitiesFromStorage(
        admin,
        orgId,
        uploadId,
        storagePath,
        originalFilename
      );

      await step.sendEvent('trigger-link', {
        name: 'activities/link',
        data: { orgId, uploadId },
      });

      return { inserted };
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
