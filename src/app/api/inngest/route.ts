import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import {
  processUploadOpportunities,
  processUploadActivities,
  linkActivities,
  computeReport,
  piperunSync,
  alertsEvaluate,
  reportSchedulesSend,
} from '@/inngest/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processUploadOpportunities,
    processUploadActivities,
    linkActivities,
    computeReport,
    piperunSync,
    alertsEvaluate,
    reportSchedulesSend,
  ],
});
