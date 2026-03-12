/**
 * Job Inngest: sincronização incremental PipeRun (pull).
 * Busca oportunidades e atividades na API, faz upsert no banco e dispara report/compute.
 */
import { inngest } from '../client';
import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/crypto';
import { fetchDeals, fetchActivities } from '@/lib/crm/providers/piperun';
import { mapDealToOpportunity, mapActivityToActivity } from '@/lib/crm/providers/piperun';
import type { NormalizedOpportunityRow } from '@/lib/crm/providers/piperun/types';

export const piperunSync = inngest.createFunction(
  {
    id: 'piperun-sync',
    retries: 2,
  },
  { event: 'crm/piperun.sync' },
  async ({ event }) => {
    const start = Date.now();
    const { orgId } = event.data;
    const admin = createAdminClient();

    const { data: integration } = await admin
      .from('crm_integrations')
      .select('api_key_encrypted, api_url')
      .eq('org_id', orgId)
      .eq('provider', 'piperun')
      .eq('is_active', true)
      .maybeSingle();

    if (!integration?.api_key_encrypted) {
      await admin
        .from('crm_integrations')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'error',
          last_sync_error: 'Integração não encontrada ou inativa',
          updated_at: new Date().toISOString(),
        })
        .eq('org_id', orgId)
        .eq('provider', 'piperun');
      return { ok: false, error: 'Integration not found' };
    }

    const apiKey = decrypt(integration.api_key_encrypted);
    const apiUrl = (integration.api_url as string)?.trim() || 'https://api.piperun.com';
    const config = { apiUrl, apiKey };

    let lastError: string | null = null;
    try {
      const [dealsRaw, activitiesRaw] = await Promise.all([
        fetchDeals(config, { limit: 1000 }),
        fetchActivities(config, { limit: 2000 }),
      ]);

      const opportunities: NormalizedOpportunityRow[] = [];
      for (const d of dealsRaw) {
        const row = mapDealToOpportunity(d);
        if (row) opportunities.push(row);
      }

      if (opportunities.length > 0) {
        const rows = opportunities.map((o) => ({
          org_id: orgId,
          crm_source: 'api',
          crm_hash: o.crm_hash,
          pipeline_name: o.pipeline_name,
          stage_name: o.stage_name,
          stage_timing_days: o.stage_timing_days,
          owner_email: o.owner_email,
          owner_name: o.owner_name,
          company_name: o.company_name,
          title: o.title,
          value: o.value,
          created_date: o.created_date,
          closed_date: o.closed_date,
          status: o.status,
          tags: o.tags,
        }));
        await admin.from('opportunities').upsert(rows, {
          onConflict: 'org_id,crm_hash',
          ignoreDuplicates: false,
        });
      }

      const activitiesToUpsert: Array<Record<string, unknown>> = [];
      const activitiesToInsert: Array<Record<string, unknown>> = [];
      for (const a of activitiesRaw) {
        const row = mapActivityToActivity(a);
        if (!row) continue;
        const hasId = row.crm_activity_id != null && row.crm_activity_id !== '';
        const record = {
          org_id: orgId,
          crm_activity_id: row.crm_activity_id,
          type: row.type,
          title: row.title,
          owner: row.owner,
          start_at: row.start_at,
          due_at: row.due_at,
          done_at: row.done_at,
          created_at_crm: row.created_at_crm,
          opportunity_id_crm: row.opportunity_id_crm,
          linked_opportunity_hash: row.linked_opportunity_hash,
          company_name: row.company_name,
          opportunity_title: row.opportunity_title,
          opportunity_owner_name: row.opportunity_owner_name,
          link_confidence: 'high',
        };
        if (hasId) {
          activitiesToUpsert.push(record);
        } else {
          activitiesToInsert.push(record);
        }
      }

      if (activitiesToUpsert.length > 0) {
        await admin.from('activities').upsert(activitiesToUpsert, {
          onConflict: 'org_id,crm_activity_id',
          ignoreDuplicates: false,
        });
      }
      if (activitiesToInsert.length > 0) {
        await admin.from('activities').insert(activitiesToInsert);
      }

      await admin
        .from('crm_integrations')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'ok',
          last_sync_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('org_id', orgId)
        .eq('provider', 'piperun');

      await inngest.send({
        name: 'report/compute',
        data: { orgId },
      });

      if (process.env.NODE_ENV !== 'test') {
        // eslint-disable-next-line no-console
        console.info('[crm/piperun.sync]', { orgId, durationMs: Date.now() - start, opportunities: opportunities.length, activities: activitiesRaw.length });
      }
      return {
        ok: true,
        opportunities: opportunities.length,
        activities: activitiesRaw.length,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      await admin
        .from('crm_integrations')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'error',
          last_sync_error: lastError,
          updated_at: new Date().toISOString(),
        })
        .eq('org_id', orgId)
        .eq('provider', 'piperun');
      throw err;
    }
  }
);
