import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/crypto';
import { appendAuditLog, recordUsageEvent } from '@/lib/billing';
import { checkRateLimit } from '@/lib/ratelimit';
import {
  parsePiperunWebhookPayload,
  persistPiperunWebhookData,
} from '@/lib/crm/providers/piperun/webhook';
import { dispatchReportRecompute } from '@/lib/recompute-report';
import { touchMetricsStatus } from '@/lib/metrics/status';

function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return (forwarded?.split(',')[0]?.trim() || realIp || 'unknown').slice(0, 64);
}

async function updatePiperunSyncStatus(
  orgId: string,
  status: 'ok' | 'error',
  errorMessage?: string | null
): Promise<void> {
  const admin = createAdminClient();
  try {
    await admin
      .from('crm_integrations')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: status,
        last_sync_error: status === 'error' ? (errorMessage ?? 'erro desconhecido') : null,
        updated_at: new Date().toISOString(),
      })
      .eq('org_id', orgId)
      .eq('provider', 'piperun');
  } catch {
    // Compatibilidade com bases antigas.
  }
}

export async function POST(request: Request) {
  let orgIdForError: string | null = null;

  try {
    const identifier = getClientIdentifier(request);
    const { limited } = await checkRateLimit(identifier);
    if (limited) {
      return NextResponse.json(
        { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = parsePiperunWebhookPayload(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: 'Payload inválido', details: parsed.errors }, { status: 400 });
    }

    const payload = parsed.data;
    orgIdForError = payload.org_id;

    const admin = createAdminClient();
    const { data: org } = await admin.from('orgs').select('id').eq('id', payload.org_id).single();
    if (!org) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 });
    }

    const webhookSecret = request.headers.get('x-webhook-secret');
    try {
      const { data: integration } = await admin
        .from('crm_integrations')
        .select('id, webhook_secret, is_active')
        .eq('org_id', payload.org_id)
        .eq('provider', 'piperun')
        .eq('is_active', true)
        .maybeSingle();

      const requiresSecret = Boolean(integration?.webhook_secret);
      if (requiresSecret) {
        const expected = decrypt(integration?.webhook_secret ?? '');
        if (!webhookSecret || webhookSecret !== expected) {
          return NextResponse.json(
            { error: 'Webhook secret inválido ou ausente' },
            { status: 401 }
          );
        }
      }
    } catch {
      // Compatibilidade com bases sem crm_integrations.
    }

    const persisted = await persistPiperunWebhookData(admin, payload);
    const metricsStatus = await touchMetricsStatus(admin, payload.org_id);
    const recompute = await dispatchReportRecompute(admin, payload.org_id);

    await updatePiperunSyncStatus(payload.org_id, 'ok', null);

    try {
      await recordUsageEvent(admin, payload.org_id, 'api_calls', 1, {
        source: 'piperun_webhook',
        opportunities: persisted.opportunities_processed,
        activities: persisted.activities_processed,
      });
      await appendAuditLog(admin, {
        orgId: payload.org_id,
        action: 'crm.piperun.webhook.ingested',
        entityType: 'crm_webhook',
        metadata: {
          processed: {
            opportunities: persisted.opportunities_processed,
            activities: persisted.activities_processed,
          },
          duplicates: {
            opportunities: persisted.opportunities_duplicates,
            activities: persisted.activities_duplicates,
          },
          warnings_count: payload.warnings.length,
          recompute_mode: recompute.mode,
        },
      });
    } catch {
      // Compatibilidade com bases sem migrações SaaS.
    }

    return NextResponse.json({
      ok: true,
      org_id: payload.org_id,
      processed: {
        opportunities: persisted.opportunities_processed,
        activities: persisted.activities_processed,
      },
      duplicates: {
        opportunities: persisted.opportunities_duplicates,
        activities: persisted.activities_duplicates,
      },
      recompute: recompute.mode,
      metrics_status: metricsStatus,
      last_sync_status: 'ok',
      warnings: payload.warnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao processar webhook';
    if (orgIdForError) {
      await updatePiperunSyncStatus(orgIdForError, 'error', message);
    }
    return NextResponse.json({ error: 'Erro ao processar webhook PipeRun' }, { status: 500 });
  }
}
