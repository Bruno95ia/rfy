import type { AdminDbClientType } from '@/lib/supabase/admin';

export type LimitMetric = 'uploads_30d' | 'seats' | 'active_deals';
export type UsageMetric = LimitMetric | 'api_calls';

export interface OrgLimitCheckResult {
  ok: boolean;
  metric: LimitMetric;
  current: number;
  next: number;
  limit: number;
  planId: string;
  planName: string;
  message?: string;
}

interface PlanRow {
  id: string;
  name: string;
  seats_limit: number;
  uploads_limit_30d: number;
  active_deals_limit: number;
}

interface SubscriptionRow {
  org_id: string;
  plan_id: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled';
}

function mapLimitByMetric(
  metric: LimitMetric,
  plan: PlanRow,
  overrides: {
    seats_limit: number | null;
    uploads_limit_30d: number | null;
    active_deals_limit: number | null;
  } | null
): number {
  if (metric === 'seats') return overrides?.seats_limit ?? plan.seats_limit;
  if (metric === 'active_deals') {
    return overrides?.active_deals_limit ?? plan.active_deals_limit;
  }
  return overrides?.uploads_limit_30d ?? plan.uploads_limit_30d;
}

async function ensureSubscription(
  admin: AdminDbClientType,
  orgId: string
): Promise<SubscriptionRow> {
  const { data: existing } = await admin
    .from('org_subscriptions')
    .select('org_id, plan_id, status')
    .eq('org_id', orgId)
    .maybeSingle();
  if (existing) return existing as SubscriptionRow;

  const fallback: SubscriptionRow = {
    org_id: orgId,
    plan_id: 'starter',
    status: 'active',
  };
  await admin.from('org_subscriptions').upsert(fallback, {
    onConflict: 'org_id',
    ignoreDuplicates: false,
  });
  return fallback;
}

async function getPlan(admin: AdminDbClientType, planId: string): Promise<PlanRow> {
  const { data } = await admin
    .from('plans')
    .select('id, name, seats_limit, uploads_limit_30d, active_deals_limit')
    .eq('id', planId)
    .maybeSingle();
  if (data) return data as PlanRow;
  return {
    id: 'starter',
    name: 'Starter',
    seats_limit: 8,
    uploads_limit_30d: 120,
    active_deals_limit: 500,
  };
}

async function currentUsage(
  admin: AdminDbClientType,
  orgId: string,
  metric: LimitMetric
): Promise<number> {
  if (metric === 'uploads_30d') {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await admin
      .from('usage_events')
      .select('quantity')
      .eq('org_id', orgId)
      .eq('metric', 'uploads_30d')
      .gte('event_at', since);
    return (data ?? []).reduce((acc, row) => acc + (row.quantity ?? 0), 0);
  }
  if (metric === 'seats') {
    const { count } = await admin
      .from('org_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('org_id', orgId);
    return count ?? 0;
  }
  const { count } = await admin
    .from('opportunities')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('status', 'open');
  return count ?? 0;
}

export async function checkOrgLimit(
  admin: AdminDbClientType,
  orgId: string,
  metric: LimitMetric,
  increment = 1
): Promise<OrgLimitCheckResult> {
  const subscription = await ensureSubscription(admin, orgId);
  const plan = await getPlan(admin, subscription.plan_id);
  const { data: override } = await admin
    .from('usage_limits')
    .select('seats_limit, uploads_limit_30d, active_deals_limit')
    .eq('org_id', orgId)
    .maybeSingle();
  const limit = mapLimitByMetric(
    metric,
    plan,
    (override as { seats_limit: number | null; uploads_limit_30d: number | null; active_deals_limit: number | null } | null) ??
      null
  );
  const current = await currentUsage(admin, orgId, metric);
  const next = current + increment;
  const ok = next <= limit;

  const prettyMetric =
    metric === 'uploads_30d'
      ? 'uploads nos últimos 30 dias'
      : metric === 'seats'
        ? 'assentos'
        : 'deals ativos';

  return {
    ok,
    metric,
    current,
    next,
    limit,
    planId: plan.id,
    planName: plan.name,
    message: ok
      ? undefined
      : `Limite de ${prettyMetric} do plano ${plan.name} atingido (${current}/${limit}).`,
  };
}

export async function recordUsageEvent(
  admin: AdminDbClientType,
  orgId: string,
  metric: UsageMetric,
  quantity = 1,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await admin.from('usage_events').insert({
    org_id: orgId,
    metric,
    quantity,
    metadata_json: metadata,
  });
}

export async function appendAuditLog(
  admin: AdminDbClientType,
  payload: {
    orgId: string;
    actorUserId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
    ipAddress?: string | null;
  }
): Promise<void> {
  await admin.from('org_audit_logs').insert({
    org_id: payload.orgId,
    actor_user_id: payload.actorUserId ?? null,
    action: payload.action,
    entity_type: payload.entityType,
    entity_id: payload.entityId ?? null,
    metadata_json: payload.metadata ?? {},
    ip_address: payload.ipAddress ?? null,
  });
}
