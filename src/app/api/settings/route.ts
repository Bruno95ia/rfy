import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  requireApiUserOrgAccess,
  getOrgMemberRole,
  type OrgRole,
} from '@/lib/auth';
import { encrypt } from '@/lib/crypto';
import { appendAuditLog } from '@/lib/billing';
import { computeNextRunAt } from '@/lib/reports/next-run';
import { appendFile } from 'node:fs/promises';

type RoleGate = 'manage' | 'member';

function hasRole(role: OrgRole, min: RoleGate): boolean {
  if (min === 'member') return true;
  return role === 'owner' || role === 'admin';
}

function maskTarget(target: string): string {
  if (!target) return '';
  if (target.includes('@')) {
    const [name, domain] = target.split('@');
    const start = name.slice(0, 2);
    return `${start}***@${domain}`;
  }
  if (target.startsWith('http')) {
    try {
      const url = new URL(target);
      return `${url.protocol}//${url.host}/***`;
    } catch {
      return `${target.slice(0, 12)}***`;
    }
  }
  return `${target.slice(0, 4)}***`;
}

export async function GET() {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;
  const { user, orgId } = auth;

  const admin = createAdminClient();
  const role = (await getOrgMemberRole(user.id, orgId)) ?? 'viewer';

  // #region agent log
  fetch('http://localhost:7298/ingest/81cfdc9b-8f3a-42d7-bcbf-e3113764efc8', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '497d65',
    },
    body: JSON.stringify({
      sessionId: '497d65',
      runId: 'pre-fix',
      hypothesisId: 'H3',
      location: 'src/app/api/settings/route.ts:82-90',
      message: 'GET /api/settings role resolvida',
      data: { userId: user.id, orgId, role },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  appendFile(
    '/home/ubuntu/rfy/.cursor/debug-497d65.log',
    JSON.stringify({
      sessionId: '497d65',
      runId: 'pre-fix',
      hypothesisId: 'H3',
      location: 'src/app/api/settings/route.ts:82-90',
      message: 'GET /api/settings role resolvida',
      data: { userId: user.id, orgId, role },
      timestamp: Date.now(),
    }) + '\n'
  ).catch(() => {});
  // #endregion
  const { data: org } = await admin
    .from('orgs')
    .select('name')
    .eq('id', orgId)
    .single();

  let config = null;
  let integrations: unknown[] = [];
  let usage = {
    uploads_30d: 0,
    processed_uploads_30d: 0,
    active_deals: 0,
    users: 0,
  };
  let saas = {
    role,
    plans: [] as Array<{
      id: string;
      name: string;
      price_monthly: number;
      seats_limit: number;
      uploads_limit_30d: number;
      active_deals_limit: number;
      features_json: Record<string, unknown>;
    }>,
    subscription: null as Record<string, unknown> | null,
    limits: {
      seats_limit: 8,
      uploads_limit_30d: 120,
      active_deals_limit: 500,
    },
    onboarding: [] as Array<{ step_key: string; completed_at: string | null }>,
    api_keys: [] as Array<{
      id: string;
      name: string;
      key_prefix: string;
      scopes: string[];
      created_at: string;
      last_used_at: string | null;
      revoked_at: string | null;
    }>,
    outbound_webhooks: [] as Array<{
      id: string;
      name: string;
      target: string;
      events: string[];
      is_active: boolean;
      last_status: string | null;
      last_sent_at: string | null;
    }>,
    alert_channels: [] as Array<{
      id: string;
      channel_type: string;
      target: string;
      is_active: boolean;
    }>,
    alert_rules: [] as Array<{
      id: string;
      rule_key: string;
      severity: string;
      threshold: number | null;
      enabled: boolean;
    }>,
    report_schedules: [] as Array<{
      id: string;
      name: string;
      frequency: string;
      is_active: boolean;
      recipients: string;
      next_run_at: string | null;
      format: string;
      timezone: string;
      hour_utc: number;
      minute_utc: number;
      day_of_week: number | null;
      day_of_month: number | null;
    }>,
    forecast_scenarios: [] as Array<{
      id: string;
      name: string;
      is_default: boolean;
      assumptions_json: Record<string, unknown>;
    }>,
    quarterly_goals: [] as Array<{
      id: string;
      year: number;
      quarter: number;
      target_revenue: number | null;
      target_win_rate: number | null;
      target_cycle_days: number | null;
    }>,
    latest_data_quality: null as
      | {
          score: number;
          source_kind: string;
          created_at: string;
          issues_json: unknown[];
        }
      | null,
    retention_cohorts: [] as Array<{
      cohort_month: string;
      segment: string;
      customers_start: number;
      customers_retained: number;
      retention_rate: number | null;
    }>,
  };

  try {
    const { data: cfg } = await admin
      .from('org_config')
      .select('*')
      .eq('org_id', orgId)
      .maybeSingle();
    config = cfg;

    const { data: int } = await admin
      .from('crm_integrations')
      .select(
        'id, provider, webhook_enabled, last_sync_at, last_sync_status, is_active, created_at'
      )
      .eq('org_id', orgId)
      .eq('is_active', true);
    integrations = int ?? [];

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [uploads30, uploadsDone30, dealsOpen, usersCount] = await Promise.all([
      admin
        .from('uploads')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('created_at', since),
      admin
        .from('uploads')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'done')
        .gte('created_at', since),
      admin
        .from('opportunities')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'open'),
      admin
        .from('org_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('org_id', orgId),
    ]);
    usage = {
      uploads_30d: uploads30.count ?? 0,
      processed_uploads_30d: uploadsDone30.count ?? 0,
      active_deals: dealsOpen.count ?? 0,
      users: usersCount.count ?? 0,
    };
  } catch {
    // Compatibilidade com bases anteriores às migrações iniciais.
  }

  try {
    const [
      plansRes,
      subscriptionRes,
      limitsRes,
      onboardingRes,
      apiKeysRes,
      webhooksRes,
      channelsRes,
      rulesRes,
      schedulesRes,
      scenariosRes,
      goalsRes,
      qualityRes,
      retentionRes,
    ] = await Promise.all([
      admin
        .from('plans')
        .select(
          'id, name, price_monthly, seats_limit, uploads_limit_30d, active_deals_limit, features_json'
        )
        .eq('is_active', true)
        .order('price_monthly', { ascending: true }),
      admin
        .from('org_subscriptions')
        .select(
          'id, plan_id, status, period_start, period_end, trial_ends_at, cancel_at_period_end'
        )
        .eq('org_id', orgId)
        .maybeSingle(),
      admin
        .from('usage_limits')
        .select('seats_limit, uploads_limit_30d, active_deals_limit')
        .eq('org_id', orgId)
        .maybeSingle(),
      admin
        .from('org_onboarding_steps')
        .select('step_key, completed_at')
        .eq('org_id', orgId),
      admin
        .from('org_api_keys')
        .select('id, name, key_prefix, scopes, created_at, last_used_at, revoked_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false }),
      admin
        .from('outbound_webhooks')
        .select('id, name, target_url, events, is_active, last_status, last_sent_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false }),
      admin
        .from('alert_channels')
        .select('id, channel_type, target, is_active')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false }),
      admin
        .from('alert_rules')
        .select('id, rule_key, severity, threshold, enabled')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false }),
      admin
        .from('report_schedules')
        .select('id, name, frequency, is_active, recipients, next_run_at, format, timezone, hour_utc, minute_utc, day_of_week, day_of_month')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false }),
      admin
        .from('forecast_scenarios')
        .select('id, name, is_default, assumptions_json')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false }),
      admin
        .from('quarterly_goals')
        .select(
          'id, year, quarter, target_revenue, target_win_rate, target_cycle_days'
        )
        .eq('org_id', orgId)
        .order('year', { ascending: false })
        .order('quarter', { ascending: false }),
      admin
        .from('data_quality_runs')
        .select('score, source_kind, created_at, issues_json')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from('retention_cohorts')
        .select(
          'cohort_month, segment, customers_start, customers_retained, retention_rate'
        )
        .eq('org_id', orgId)
        .order('cohort_month', { ascending: false })
        .limit(6),
    ]);

    const plans = plansRes.data ?? [];
    const sub = subscriptionRes.data;
    const limits = limitsRes.data;
    const activePlan = plans.find((p) => p.id === sub?.plan_id) ?? plans[0];

    saas = {
      ...saas,
      plans: plans as typeof saas.plans,
      subscription: sub ?? null,
      limits: {
        seats_limit: limits?.seats_limit ?? activePlan?.seats_limit ?? saas.limits.seats_limit,
        uploads_limit_30d:
          limits?.uploads_limit_30d ??
          activePlan?.uploads_limit_30d ??
          saas.limits.uploads_limit_30d,
        active_deals_limit:
          limits?.active_deals_limit ??
          activePlan?.active_deals_limit ??
          saas.limits.active_deals_limit,
      },
      onboarding: (onboardingRes.data ?? []) as typeof saas.onboarding,
      api_keys: (apiKeysRes.data ?? []) as typeof saas.api_keys,
      outbound_webhooks: (webhooksRes.data ?? []).map((w) => ({
        id: w.id,
        name: w.name,
        target: maskTarget(w.target_url),
        events: (w.events ?? []) as string[],
        is_active: w.is_active ?? true,
        last_status: w.last_status,
        last_sent_at: w.last_sent_at,
      })),
      alert_channels: (channelsRes.data ?? []).map((c) => ({
        id: c.id,
        channel_type: c.channel_type,
        target: maskTarget(c.target),
        is_active: c.is_active ?? true,
      })),
      alert_rules: (rulesRes.data ?? []) as typeof saas.alert_rules,
      report_schedules: (schedulesRes.data ?? []) as typeof saas.report_schedules,
      forecast_scenarios: (scenariosRes.data ?? []) as typeof saas.forecast_scenarios,
      quarterly_goals: (goalsRes.data ?? []) as typeof saas.quarterly_goals,
      latest_data_quality: qualityRes.data
        ? {
            score: Number(qualityRes.data.score ?? 0),
            source_kind: qualityRes.data.source_kind,
            created_at: qualityRes.data.created_at,
            issues_json: (qualityRes.data.issues_json as unknown[]) ?? [],
          }
        : null,
      retention_cohorts: (retentionRes.data ?? []).map((c) => ({
        cohort_month: c.cohort_month,
        segment: c.segment ?? '',
        customers_start: c.customers_start ?? 0,
        customers_retained: c.customers_retained ?? 0,
        retention_rate:
          c.retention_rate != null ? Number(c.retention_rate) : null,
      })),
    };
  } catch {
    // Compatibilidade com bases que ainda não aplicaram migração 006.
  }

  // Sinaliza se o usuário atual é admin de plataforma (gestão global de usuários)
  let isPlatformAdmin = false;
  try {
    const { data } = await admin
      .from('app_users')
      .select('id, is_platform_admin, is_active')
      .eq('id', user.id)
      .maybeSingle();
    if (data && data.is_active !== false && data.is_platform_admin === true) {
      isPlatformAdmin = true;
    }
  } catch {
    // ignore, fallback permanece false
  }

  return NextResponse.json({
    org: { id: orgId, name: org?.name ?? 'Minha organização' },
    role,
    config: config ?? null,
    integrations: integrations ?? [],
    usage,
    saas,
    is_platform_admin: isPlatformAdmin,
    webhookBaseUrl: process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/crm/piperun/webhook`
      : null,
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;
  const { user, orgId } = auth;

  const role = (await getOrgMemberRole(user.id, orgId)) ?? 'viewer';

  // #region agent log
  fetch('http://localhost:7298/ingest/81cfdc9b-8f3a-42d7-bcbf-e3113764efc8', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '497d65',
    },
    body: JSON.stringify({
      sessionId: '497d65',
      runId: 'pre-fix',
      hypothesisId: 'H4',
      location: 'src/app/api/settings/route.ts:421-429',
      message: 'POST /api/settings role resolvida',
      data: { userId: user.id, orgId, role },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  appendFile(
    '/home/ubuntu/rfy/.cursor/debug-497d65.log',
    JSON.stringify({
      sessionId: '497d65',
      runId: 'pre-fix',
      hypothesisId: 'H4',
      location: 'src/app/api/settings/route.ts:421-429',
      message: 'POST /api/settings role resolvida',
      data: { userId: user.id, orgId, role },
      timestamp: Date.now(),
    }) + '\n'
  ).catch(() => {});
  // #endregion
  const bodySchema = z.object({
    section: z.string().min(1, 'section é obrigatória'),
    data: z.record(z.string(), z.unknown()).optional().default({}),
  });
  const bodyResult = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!bodyResult.success) {
    return NextResponse.json(
      { error: 'Payload inválido', details: bodyResult.error.issues },
      { status: 400 }
    );
  }
  const { section, data } = bodyResult.data;
  const admin = createAdminClient();

  const requiresManageSections = new Set([
    'org',
    'config',
    'crm',
    'plan',
    'api_key_create',
    'api_key_revoke',
    'webhook_create',
    'webhook_toggle',
    'alert_channel_create',
    'alert_rule_create',
    'report_schedule_create',
    'report_schedule_update',
    'report_schedule_delete',
    'forecast_scenario_save',
    'quarterly_goal_upsert',
    'retention_cohort_upsert',
    'data_quality_record',
    'usage_limit_override',
  ]);

  if (
    requiresManageSections.has(section) &&
    !hasRole(role, 'manage')
  ) {
    return NextResponse.json(
      { error: 'Apenas owner/admin pode executar esta ação.' },
      { status: 403 }
    );
  }

  if (section === 'org') {
    const { name } = data as { name?: string };
    if (name && typeof name === 'string') {
      await admin.from('orgs').update({ name: name.trim() }).eq('id', orgId);
      await appendAuditLog(admin, {
        orgId,
        actorUserId: user.id,
        action: 'org.updated',
        entityType: 'orgs',
        entityId: orgId,
        metadata: { name: name.trim() },
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (section === 'config') {
    try {
      const allowed = [
        'org_display_name',
        'dias_proposta_risco',
        'dias_pipeline_abandonado',
        'dias_aging_inflado',
        'dias_aprovacao_travada',
        'notificar_email',
        'email_notificacoes',
        'incluir_convite_calendario',
        'top_deals_por_friccao',
        'top_evidencias_por_friccao',
        'timezone',
        'cac_manual',
        'marketing_spend_monthly',
      ];
      const payload: Record<string, unknown> = {
        org_id: orgId,
        updated_at: new Date().toISOString(),
      };
      for (const k of allowed) {
        const v = (data as Record<string, unknown>)[k];
        if (v !== undefined) payload[k] = v;
      }
      await admin.from('org_config').upsert(payload, {
        onConflict: 'org_id',
        ignoreDuplicates: false,
      });
      await appendAuditLog(admin, {
        orgId,
        actorUserId: user.id,
        action: 'config.updated',
        entityType: 'org_config',
      });
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json(
        {
          error:
            'Execute as migrações de banco para habilitar configurações avançadas.',
        },
        { status: 503 }
      );
    }
  }

  if (section === 'crm') {
    const { provider, api_key, api_url, webhook_enabled, webhook_secret } =
      data as {
        provider?: string;
        api_key?: string;
        api_url?: string;
        webhook_enabled?: boolean;
        webhook_secret?: string;
      };
    const validProviders = [
      'piperun',
      'pipedrive',
      'hubspot',
      'generic',
      'n8n_webhook',
    ];
    if (!provider || !validProviders.includes(provider)) {
      return NextResponse.json({ error: 'Provider inválido' }, { status: 400 });
    }
    const upsert: Record<string, unknown> = {
      org_id: orgId,
      provider,
      updated_at: new Date().toISOString(),
    };
    if (api_key !== undefined) {
      upsert.api_key_encrypted = api_key ? encrypt(api_key) : null;
    }
    if (api_url !== undefined) upsert.api_url = api_url || null;
    if (webhook_enabled !== undefined) upsert.webhook_enabled = webhook_enabled;
    if (webhook_secret !== undefined) {
      upsert.webhook_secret = webhook_secret ? encrypt(webhook_secret) : null;
    }
    if (provider === 'n8n_webhook' || provider === 'generic') {
      upsert.webhook_enabled = true;
    }

    await admin.from('crm_integrations').upsert(upsert, {
      onConflict: 'org_id,provider',
      ignoreDuplicates: false,
    });
    await appendAuditLog(admin, {
      orgId,
      actorUserId: user.id,
      action: 'crm.integration.updated',
      entityType: 'crm_integrations',
      metadata: { provider },
    });
    return NextResponse.json({ ok: true });
  }

  if (section === 'plan') {
    const planId = String(data.plan_id ?? '').trim();
    if (!planId) {
      return NextResponse.json(
        { error: 'plan_id é obrigatório' },
        { status: 400 }
      );
    }
    const { data: plan } = await admin
      .from('plans')
      .select('id, name')
      .eq('id', planId)
      .eq('is_active', true)
      .maybeSingle();
    if (!plan) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }
    await admin.from('org_subscriptions').upsert(
      {
        org_id: orgId,
        plan_id: plan.id,
        status: 'active',
        period_start: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id', ignoreDuplicates: false }
    );
    await appendAuditLog(admin, {
      orgId,
      actorUserId: user.id,
      action: 'billing.plan.changed',
      entityType: 'org_subscriptions',
      metadata: { plan_id: plan.id, plan_name: plan.name },
    });
    return NextResponse.json({ ok: true });
  }

  if (section === 'api_key_create') {
    const name = String(data.name ?? '').trim();
    if (!name) {
      return NextResponse.json(
        { error: 'Nome da API key é obrigatório' },
        { status: 400 }
      );
    }
    const scopes = Array.isArray(data.scopes)
      ? data.scopes.map((s) => String(s))
      : ['ingest:write', 'reports:read'];
    const rawKey = `rfe_live_${randomBytes(24).toString('hex')}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 12);
    const { data: created, error } = await admin
      .from('org_api_keys')
      .insert({
        org_id: orgId,
        name,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        scopes,
        created_by: user.id,
      })
      .select('id, key_prefix')
      .single();
    if (error || !created) {
      return NextResponse.json(
        { error: error?.message ?? 'Falha ao criar API key' },
        { status: 500 }
      );
    }
    await appendAuditLog(admin, {
      orgId,
      actorUserId: user.id,
      action: 'api_key.created',
      entityType: 'org_api_keys',
      entityId: created.id,
      metadata: { name, key_prefix: created.key_prefix, scopes },
    });
    return NextResponse.json({
      ok: true,
      api_key: rawKey,
      key_prefix: created.key_prefix,
      message: 'Guarde esta chave agora. Ela não será exibida novamente.',
    });
  }

  if (section === 'api_key_revoke') {
    const id = String(data.id ?? '').trim();
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
    await admin
      .from('org_api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('org_id', orgId)
      .eq('id', id);
    await appendAuditLog(admin, {
      orgId,
      actorUserId: user.id,
      action: 'api_key.revoked',
      entityType: 'org_api_keys',
      entityId: id,
    });
    return NextResponse.json({ ok: true });
  }

  if (section === 'webhook_create') {
    const name = String(data.name ?? '').trim();
    const targetUrl = String(data.target_url ?? '').trim();
    const events = Array.isArray(data.events)
      ? data.events.map((e) => String(e))
      : ['report.generated', 'alert.triggered'];
    if (!name || !targetUrl) {
      return NextResponse.json(
        { error: 'name e target_url são obrigatórios' },
        { status: 400 }
      );
    }
    await admin.from('outbound_webhooks').insert({
      org_id: orgId,
      name,
      target_url: targetUrl,
      secret_encrypted: data.secret ? encrypt(String(data.secret)) : null,
      events,
      is_active: true,
      updated_at: new Date().toISOString(),
    });
    await appendAuditLog(admin, {
      orgId,
      actorUserId: user.id,
      action: 'webhook.created',
      entityType: 'outbound_webhooks',
      metadata: { name, target_url: targetUrl, events },
    });
    return NextResponse.json({ ok: true });
  }

  if (section === 'webhook_toggle') {
    const id = String(data.id ?? '').trim();
    const isActive = Boolean(data.is_active);
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
    await admin
      .from('outbound_webhooks')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('org_id', orgId)
      .eq('id', id);
    await appendAuditLog(admin, {
      orgId,
      actorUserId: user.id,
      action: 'webhook.toggled',
      entityType: 'outbound_webhooks',
      entityId: id,
      metadata: { is_active: isActive },
    });
    return NextResponse.json({ ok: true });
  }

  if (section === 'alert_channel_create') {
    const channelType = String(data.channel_type ?? '').trim();
    const target = String(data.target ?? '').trim();
    if (!channelType || !target) {
      return NextResponse.json(
        { error: 'channel_type e target são obrigatórios' },
        { status: 400 }
      );
    }
    await admin.from('alert_channels').insert({
      org_id: orgId,
      channel_type: channelType,
      target,
      is_active: true,
      config_json: (data.config_json as Record<string, unknown>) ?? {},
    });
    await appendAuditLog(admin, {
      orgId,
      actorUserId: user.id,
      action: 'alert_channel.created',
      entityType: 'alert_channels',
      metadata: { channel_type: channelType, target: maskTarget(target) },
    });
    return NextResponse.json({ ok: true });
  }

  if (section === 'alert_rule_create') {
    const ruleKey = String(data.rule_key ?? '').trim();
    if (!ruleKey) {
      return NextResponse.json(
        { error: 'rule_key é obrigatório' },
        { status: 400 }
      );
    }
    await admin.from('alert_rules').insert({
      org_id: orgId,
      rule_key: ruleKey,
      severity: String(data.severity ?? 'medium'),
      threshold:
        data.threshold != null ? Number(data.threshold) : null,
      enabled: data.enabled !== false,
      cooldown_minutes:
        data.cooldown_minutes != null ? Number(data.cooldown_minutes) : 30,
      channel_ids: Array.isArray(data.channel_ids)
        ? data.channel_ids.map((id) => String(id))
        : [],
    });
    await appendAuditLog(admin, {
      orgId,
      actorUserId: user.id,
      action: 'alert_rule.created',
      entityType: 'alert_rules',
      metadata: { rule_key: ruleKey },
    });
    return NextResponse.json({ ok: true });
  }

  if (section === 'report_schedule_create') {
    const name = String(data.name ?? '').trim();
    const frequency = String(data.frequency ?? 'weekly');
    const recipients = String(data.recipients ?? '').trim();
    if (!name || !recipients) {
      return NextResponse.json(
        { error: 'name e recipients são obrigatórios' },
        { status: 400 }
      );
    }
    const tz = String(data.timezone ?? 'America/Sao_Paulo');
    const hourUtc = data.hour_utc != null ? Number(data.hour_utc) : 12;
    const minuteUtc = data.minute_utc != null ? Number(data.minute_utc) : 0;
    const dayOfWeek = data.day_of_week != null ? Number(data.day_of_week) : null;
    const dayOfMonth = data.day_of_month != null ? Number(data.day_of_month) : null;
    const nextRunAt = computeNextRunAt(
      frequency as 'daily' | 'weekly' | 'monthly',
      dayOfWeek,
      dayOfMonth,
      hourUtc,
      minuteUtc,
      tz
    );
    await admin.from('report_schedules').insert({
      org_id: orgId,
      name,
      frequency,
      day_of_week: dayOfWeek,
      day_of_month: dayOfMonth,
      hour_utc: hourUtc,
      minute_utc: minuteUtc,
      timezone: tz,
      recipients,
      format: String(data.format ?? 'link'),
      is_active: true,
      next_run_at: nextRunAt,
      updated_at: new Date().toISOString(),
    });
    await appendAuditLog(admin, {
      orgId,
      actorUserId: user.id,
      action: 'report_schedule.created',
      entityType: 'report_schedules',
      metadata: { name, frequency },
    });
    return NextResponse.json({ ok: true });
  }

  if (section === 'report_schedule_update') {
    const id = String(data.id ?? '').trim();
    if (!id) {
      return NextResponse.json({ error: 'id do agendamento é obrigatório' }, { status: 400 });
    }
    const name = String(data.name ?? '').trim();
    const frequency = String(data.frequency ?? 'weekly');
    const recipients = String(data.recipients ?? '').trim();
    if (!name || !recipients) {
      return NextResponse.json(
        { error: 'name e recipients são obrigatórios' },
        { status: 400 }
      );
    }
    const tz = String(data.timezone ?? 'America/Sao_Paulo');
    const hourUtc = data.hour_utc != null ? Number(data.hour_utc) : 12;
    const minuteUtc = data.minute_utc != null ? Number(data.minute_utc) : 0;
    const dayOfWeek = data.day_of_week != null ? Number(data.day_of_week) : null;
    const dayOfMonth = data.day_of_month != null ? Number(data.day_of_month) : null;
    const isActive = data.is_active !== false;
    const format = String(data.format ?? 'link');
    const nextRunAt = computeNextRunAt(
      frequency as 'daily' | 'weekly' | 'monthly',
      dayOfWeek,
      dayOfMonth,
      hourUtc,
      minuteUtc,
      tz
    );
    const { error: updateError } = await admin
      .from('report_schedules')
      .update({
        name,
        frequency,
        day_of_week: dayOfWeek,
        day_of_month: dayOfMonth,
        hour_utc: hourUtc,
        minute_utc: minuteUtc,
        timezone: tz,
        recipients,
        format,
        is_active: isActive,
        next_run_at: nextRunAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('org_id', orgId);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    await appendAuditLog(admin, {
      orgId,
      actorUserId: user.id,
      action: 'report_schedule.updated',
      entityType: 'report_schedules',
      entityId: id,
      metadata: { name, frequency },
    });
    return NextResponse.json({ ok: true });
  }

  if (section === 'report_schedule_delete') {
    const id = String(data.id ?? '').trim();
    if (!id) {
      return NextResponse.json({ error: 'id do agendamento é obrigatório' }, { status: 400 });
    }
    const { error: deleteError } = await admin
      .from('report_schedules')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
    await appendAuditLog(admin, {
      orgId,
      actorUserId: user.id,
      action: 'report_schedule.deleted',
      entityType: 'report_schedules',
      entityId: id,
    });
    return NextResponse.json({ ok: true });
  }

  if (section === 'onboarding_step') {
    const stepKey = String(data.step_key ?? '').trim();
    if (!stepKey) {
      return NextResponse.json(
        { error: 'step_key obrigatório' },
        { status: 400 }
      );
    }
    const completed = data.completed !== false;
    await admin.from('org_onboarding_steps').upsert(
      {
        org_id: orgId,
        step_key: stepKey,
        completed_at: completed ? new Date().toISOString() : null,
        completed_by: completed ? user.id : null,
        metadata_json:
          (data.metadata_json as Record<string, unknown>) ?? {},
      },
      { onConflict: 'org_id,step_key', ignoreDuplicates: false }
    );
    await appendAuditLog(admin, {
      orgId,
      actorUserId: user.id,
      action: 'onboarding.step.updated',
      entityType: 'org_onboarding_steps',
      metadata: { step_key: stepKey, completed },
    });
    return NextResponse.json({ ok: true });
  }

  if (section === 'forecast_scenario_save') {
    const id = String(data.id ?? '').trim();
    const name = String(data.name ?? '').trim();
    if (!name) {
      return NextResponse.json({ error: 'name obrigatório' }, { status: 400 });
    }
    const isDefault = Boolean(data.is_default);
    if (isDefault) {
      await admin
        .from('forecast_scenarios')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq('org_id', orgId);
    }
    const payload = {
      org_id: orgId,
      name,
      assumptions_json: (data.assumptions_json as Record<string, unknown>) ?? {},
      is_default: isDefault,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    };
    if (id) {
      await admin.from('forecast_scenarios').update(payload).eq('id', id).eq('org_id', orgId);
    } else {
      await admin.from('forecast_scenarios').insert(payload);
    }
    await appendAuditLog(admin, {
      orgId,
      actorUserId: user.id,
      action: 'forecast_scenario.saved',
      entityType: 'forecast_scenarios',
      entityId: id || null,
      metadata: { name, is_default: isDefault },
    });
    return NextResponse.json({ ok: true });
  }

  if (section === 'quarterly_goal_upsert') {
    const year = Number(data.year);
    const quarter = Number(data.quarter);
    if (!year || !quarter) {
      return NextResponse.json(
        { error: 'year e quarter são obrigatórios' },
        { status: 400 }
      );
    }
    await admin.from('quarterly_goals').upsert(
      {
        org_id: orgId,
        year,
        quarter,
        target_revenue:
          data.target_revenue != null ? Number(data.target_revenue) : null,
        target_win_rate:
          data.target_win_rate != null ? Number(data.target_win_rate) : null,
        target_cycle_days:
          data.target_cycle_days != null ? Number(data.target_cycle_days) : null,
        notes: data.notes ? String(data.notes) : null,
      },
      { onConflict: 'org_id,year,quarter', ignoreDuplicates: false }
    );
    await appendAuditLog(admin, {
      orgId,
      actorUserId: user.id,
      action: 'quarterly_goal.upserted',
      entityType: 'quarterly_goals',
      metadata: { year, quarter },
    });
    return NextResponse.json({ ok: true });
  }

  if (section === 'retention_cohort_upsert') {
    const cohortMonth = String(data.cohort_month ?? '').trim();
    if (!cohortMonth) {
      return NextResponse.json(
        { error: 'cohort_month obrigatório' },
        { status: 400 }
      );
    }
    const segment = String(data.segment ?? '').trim();
    const customersStart = Number(data.customers_start ?? 0);
    const customersRetained = Number(data.customers_retained ?? 0);
    const retentionRate =
      customersStart > 0 ? (customersRetained / customersStart) * 100 : 0;
    await admin.from('retention_cohorts').upsert(
      {
        org_id: orgId,
        cohort_month: cohortMonth,
        segment,
        customers_start: customersStart,
        customers_retained: customersRetained,
        retention_rate: retentionRate,
        expansion_mrr:
          data.expansion_mrr != null ? Number(data.expansion_mrr) : null,
        churn_mrr: data.churn_mrr != null ? Number(data.churn_mrr) : null,
      },
      { onConflict: 'org_id,cohort_month,segment', ignoreDuplicates: false }
    );
    await appendAuditLog(admin, {
      orgId,
      actorUserId: user.id,
      action: 'retention_cohort.upserted',
      entityType: 'retention_cohorts',
      metadata: { cohort_month: cohortMonth, segment },
    });
    return NextResponse.json({ ok: true });
  }

  if (section === 'data_quality_record') {
    const sourceKind = String(data.source_kind ?? 'full');
    const score = Number(data.score ?? 0);
    await admin.from('data_quality_runs').insert({
      org_id: orgId,
      source_kind: sourceKind,
      score,
      issues_json: (data.issues_json as unknown[]) ?? [],
    });
    await appendAuditLog(admin, {
      orgId,
      actorUserId: user.id,
      action: 'data_quality.recorded',
      entityType: 'data_quality_runs',
      metadata: { source_kind: sourceKind, score },
    });
    return NextResponse.json({ ok: true });
  }

  if (section === 'usage_limit_override') {
    await admin.from('usage_limits').upsert(
      {
        org_id: orgId,
        seats_limit:
          data.seats_limit != null ? Number(data.seats_limit) : null,
        uploads_limit_30d:
          data.uploads_limit_30d != null
            ? Number(data.uploads_limit_30d)
            : null,
        active_deals_limit:
          data.active_deals_limit != null
            ? Number(data.active_deals_limit)
            : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id', ignoreDuplicates: false }
    );
    await appendAuditLog(admin, {
      orgId,
      actorUserId: user.id,
      action: 'usage_limit.overridden',
      entityType: 'usage_limits',
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Seção inválida' }, { status: 400 });
}
