/**
 * Avalia regras de alerta após novo snapshot (acionado após report/compute).
 * Registra alertas no painel (tabela alerts + alert_events), sem envios externos.
 */
import { inngest } from '../client';
import { createAdminClient } from '@/lib/supabase/admin';
import { evaluateAlertsForOrg } from '@/lib/alerts/evaluate';

export const alertsEvaluate = inngest.createFunction(
  {
    id: 'alerts-evaluate',
    retries: 1,
  },
  { event: 'alerts/evaluate' },
  async ({ event }) => {
    const start = Date.now();
    const { orgId } = event.data as { orgId: string };
    const admin = createAdminClient();

    const { events, opened, resolved } = await evaluateAlertsForOrg(admin, orgId);

    if (process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.info('[alerts/evaluate]', {
        orgId,
        durationMs: Date.now() - start,
        eventsCount: events.length,
        opened,
        resolved,
      });
    }
    return { ok: true, eventsCount: events.length, opened, resolved };
  }
);
