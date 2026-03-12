/**
 * Webhook para receber dados de CRM via n8n, Zapier, Make ou integração custom.
 * Payload esperado: { org_id, api_key?, opportunities[], activities? }
 * ou via header X-Webhook-Secret quando configurado.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/crypto';
import { appendAuditLog, recordUsageEvent } from '@/lib/billing';
import { checkRateLimit } from '@/lib/ratelimit';
import {
  normalizeValue,
  normalizeStatus,
  validateOpportunities,
  validateActivities,
} from '@/lib/crm/validate';
import { NextResponse } from 'next/server';
import { inngest } from '@/inngest/client';
import { createHash } from 'node:crypto';

function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return (forwarded?.split(',')[0]?.trim() || realIp || 'unknown').slice(0, 64);
}

type WebhookOpportunity = {
  crm_hash: string;
  pipeline_name?: string | null;
  stage_name?: string | null;
  owner_email?: string | null;
  owner_name?: string | null;
  company_name?: string | null;
  title?: string | null;
  value?: number | null;
  created_date?: string | null;
  closed_date?: string | null;
  status?: 'open' | 'won' | 'lost';
};

type WebhookActivity = {
  crm_activity_id?: string | null;
  type?: string | null;
  title?: string | null;
  owner?: string | null;
  done_at?: string | null;
  start_at?: string | null;
  opportunity_id_crm?: string | null;
  company_name?: string | null;
  opportunity_title?: string | null;
  opportunity_owner_name?: string | null;
  linked_opportunity_hash?: string | null;
};

export async function POST(request: Request) {
  try {
    const identifier = getClientIdentifier(request);
    const { limited } = await checkRateLimit(identifier);
    if (limited) {
      return NextResponse.json({ error: 'Muitas requisições. Tente novamente em alguns minutos.' }, { status: 429 });
    }

    const webhookSecret = request.headers.get('x-webhook-secret');
    const rawApiKeyHeader =
      request.headers.get('x-api-key') ??
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
      null;
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 });
    }

    const { org_id, opportunities = [], activities = [] } = body as {
      org_id?: string;
      opportunities?: WebhookOpportunity[];
      activities?: WebhookActivity[];
    };

    const orgId = org_id ?? body.orgId;
    if (!orgId || typeof orgId !== 'string') {
      return NextResponse.json({ error: 'org_id obrigatório' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: org } = await admin.from('orgs').select('id').eq('id', orgId).single();
    if (!org) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 });
    }

    // Validar webhook secret se configurado (tabela pode não existir antes da migração)
    let requiresSecret = false;
    let secretMatches = false;
    try {
      const { data: integrations } = await admin
        .from('crm_integrations')
        .select('webhook_secret')
        .eq('org_id', orgId)
        .eq('is_active', true);

      requiresSecret = (integrations?.length ?? 0) > 0 && integrations!.some((i) => i.webhook_secret);
      secretMatches = integrations?.some((i) => decrypt(i.webhook_secret) === webhookSecret) ?? false;
    } catch {
      // Tabela crm_integrations pode não existir
    }
    if (requiresSecret && !secretMatches) {
      return NextResponse.json({ error: 'Webhook secret inválido ou ausente' }, { status: 401 });
    }

    // API key opcional (quando criada em org_api_keys)
    try {
      if (rawApiKeyHeader) {
        const keyHash = createHash('sha256')
          .update(rawApiKeyHeader.trim())
          .digest('hex');
        const { data: key } = await admin
          .from('org_api_keys')
          .select('id, revoked_at')
          .eq('org_id', orgId)
          .eq('key_hash', keyHash)
          .maybeSingle();
        if (!key || key.revoked_at) {
          return NextResponse.json({ error: 'API key inválida ou revogada' }, { status: 401 });
        }
        await admin
          .from('org_api_keys')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', key.id);
      }
    } catch {
      // Compatibilidade: tabela org_api_keys pode não existir antes da migração 006
    }

    const opps = Array.isArray(opportunities) ? opportunities : [];
    const acts = Array.isArray(activities) ? activities : [];

    const qualityOpp = validateOpportunities(opps);
    const qualityAct = validateActivities(acts);
    const warnings = [...qualityOpp.warnings, ...qualityAct.warnings];

    if (opps.length === 0 && acts.length === 0) {
      return NextResponse.json({ ok: true, message: 'Nenhum dado para processar' });
    }

    // Inserir oportunidades em lote (value e status normalizados por qualidade)
    if (opps.length > 0) {
      const rows = opps
        .filter((o) => o?.crm_hash)
        .map((o) => {
          const { status } = normalizeStatus(o.status);
          const value = normalizeValue(o.value);
          return {
            org_id: orgId,
            crm_source: 'api',
            crm_hash: String(o.crm_hash).trim(),
            pipeline_name: o.pipeline_name ?? null,
            stage_name: o.stage_name ?? null,
            owner_email: o.owner_email ?? null,
            owner_name: o.owner_name ?? null,
            company_name: o.company_name ?? null,
            title: o.title ?? null,
            value,
            created_date: o.created_date ?? null,
            closed_date: o.closed_date ?? null,
            status,
          };
        });
      if (rows.length > 0) {
        await admin.from('opportunities').upsert(rows, {
          onConflict: 'org_id,crm_hash',
          ignoreDuplicates: false,
        });
      }
    }

    // Atividades: exigem link com opportunity. Por simplicidade, inserir e depois rodar link-activities
    if (acts.length > 0) {
      const actRows = acts
        .filter((a) => a?.linked_opportunity_hash || a?.opportunity_id_crm)
        .map((a) => ({
          org_id: orgId,
          crm_activity_id: a.crm_activity_id ?? null,
          type: a.type ?? null,
          title: a.title ?? null,
          owner: a.owner ?? a.opportunity_owner_name ?? null,
          done_at: a.done_at ?? null,
          start_at: a.start_at ?? null,
          opportunity_id_crm: a.opportunity_id_crm ?? null,
          company_name: a.company_name ?? null,
          opportunity_title: a.opportunity_title ?? null,
          opportunity_owner_name: a.opportunity_owner_name ?? null,
          linked_opportunity_hash: a.linked_opportunity_hash ?? null,
          link_confidence: 'high',
        }));
      if (actRows.length > 0) {
        await admin.from('activities').insert(actRows);
      }
    }

    // Disparar compute do report
    await inngest.send({
      name: 'report/compute',
      data: { orgId },
    });

    try {
      await recordUsageEvent(admin, orgId, 'api_calls', 1, {
        source: 'crm_webhook',
        opportunities: opps.length,
        activities: acts.length,
      });
      await appendAuditLog(admin, {
        orgId,
        action: 'crm.webhook.ingested',
        entityType: 'crm_webhook',
        metadata: {
          opportunities: opps.length,
          activities: acts.length,
          warnings_count: warnings.length,
        },
      });
    } catch {
      // Compatibilidade com bases sem migração 006.
    }

    return NextResponse.json({
      ok: true,
      processed: { opportunities: opps.length, activities: acts.length },
      ...(warnings.length > 0 && { warnings }),
    });
  } catch (err) {
    console.error('CRM webhook error:', err);
    return NextResponse.json(
      { error: 'Erro ao processar webhook' },
      { status: 500 }
    );
  }
}
