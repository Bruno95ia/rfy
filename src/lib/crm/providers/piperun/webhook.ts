import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { normalizeStatus, normalizeValue, parseDate } from '@/lib/crm/validate';
import { dedupeByExternalId } from '@/lib/crm/dedupe';

export type PiperunOpportunityInput = {
  external_id: string;
  pipeline_name: string | null;
  stage_name: string | null;
  owner_name: string | null;
  owner_email: string | null;
  company_name: string | null;
  title: string | null;
  value: number | null;
  created_date: string | null;
  closed_date: string | null;
  status: 'open' | 'won' | 'lost';
};

export type PiperunActivityInput = {
  external_id: string;
  opportunity_external_id: string | null;
  type: string | null;
  title: string | null;
  owner: string | null;
  start_at: string | null;
  done_at: string | null;
  company_name: string | null;
  opportunity_title: string | null;
  opportunity_owner_name: string | null;
};

export type PiperunWebhookPayload = {
  org_id: string;
  opportunities: PiperunOpportunityInput[];
  activities: PiperunActivityInput[];
  warnings: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function toNonEmptyString(value: unknown): string | null {
  if (value == null) return null;
  const raw = String(value).trim();
  return raw === '' ? null : raw;
}

function getFirstString(
  source: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = toNonEmptyString(source[key]);
    if (value) return value;
  }
  return null;
}

function normalizeDateOnly(value: unknown): string | null {
  const parsed = parseDate(value);
  if (parsed) return parsed;

  const str = toNonEmptyString(value);
  if (!str) return null;
  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function normalizeDateTime(value: unknown): string | null {
  const str = toNonEmptyString(value);
  if (!str) return null;
  const date = new Date(str);
  if (!Number.isNaN(date.getTime())) return date.toISOString();
  const onlyDate = parseDate(str);
  if (onlyDate) return `${onlyDate}T00:00:00.000Z`;
  return null;
}

function ensureActivityExternalId(activity: {
  external_id: string | null;
  opportunity_external_id: string | null;
  type: string | null;
  title: string | null;
  owner: string | null;
  start_at: string | null;
  done_at: string | null;
}): string {
  if (activity.external_id) return activity.external_id;

  const seed = [
    activity.opportunity_external_id ?? '',
    activity.type ?? '',
    activity.title ?? '',
    activity.owner ?? '',
    activity.start_at ?? '',
    activity.done_at ?? '',
  ].join('||');

  const hash = createHash('sha256').update(seed).digest('hex').slice(0, 24);
  return `derived_${hash}`;
}

function parseOpportunity(
  row: Record<string, unknown>,
  index: number,
  warnings: string[]
): PiperunOpportunityInput | null {
  const externalId = getFirstString(row, ['id_externo', 'crm_hash', 'hash', 'id']);
  if (!externalId) {
    warnings.push(`opportunities[${index}] ignorada: id_externo ausente`);
    return null;
  }

  const { status } = normalizeStatus(
    getFirstString(row, ['status', 'situacao', 'situação'])
  );

  return {
    external_id: externalId,
    pipeline_name: getFirstString(row, ['pipeline_name', 'funil', 'pipeline']),
    stage_name: getFirstString(row, ['stage_name', 'etapa']),
    owner_name: getFirstString(row, ['owner_name', 'vendedor', 'responsavel', 'responsável']),
    owner_email: getFirstString(row, ['owner_email', 'vendedor_email', 'email_responsavel']),
    company_name: getFirstString(row, ['company_name', 'empresa', 'nome_fantasia']),
    title: getFirstString(row, ['title', 'titulo', 'título']),
    value: normalizeValue(row.valor ?? row.value),
    created_date: normalizeDateOnly(row.created_date ?? row.data_criacao ?? row.created_at),
    closed_date: normalizeDateOnly(row.closed_date ?? row.data_fechamento ?? row.closed_at),
    status,
  };
}

function parseActivity(
  row: Record<string, unknown>,
  index: number,
  warnings: string[]
): PiperunActivityInput | null {
  const opportunityExternalId = getFirstString(row, [
    'opportunity_id_externo',
    'opportunity_id_crm',
    'linked_opportunity_hash',
    'opportunity_hash',
    'opportunity_id',
  ]);

  const parsed = {
    external_id: getFirstString(row, ['id_externo', 'crm_activity_id', 'activity_id', 'id']),
    opportunity_external_id: opportunityExternalId,
    type: getFirstString(row, ['tipo', 'type']),
    title: getFirstString(row, ['title', 'titulo', 'título']),
    owner: getFirstString(row, ['owner', 'responsavel', 'responsável', 'vendedor']),
    start_at: normalizeDateTime(row.start_at ?? row.data_inicio),
    done_at: normalizeDateTime(row.done_at ?? row.data),
  };

  if (!parsed.opportunity_external_id && !parsed.title) {
    warnings.push(`activities[${index}] ignorada: sem vínculo com oportunidade e sem título`);
    return null;
  }

  return {
    external_id: ensureActivityExternalId(parsed),
    opportunity_external_id: parsed.opportunity_external_id,
    type: parsed.type,
    title: parsed.title,
    owner: parsed.owner,
    start_at: parsed.start_at,
    done_at: parsed.done_at,
    company_name: getFirstString(row, ['company_name', 'empresa', 'nome_fantasia']),
    opportunity_title: getFirstString(row, ['opportunity_title', 'oportunidade_titulo']),
    opportunity_owner_name: getFirstString(row, [
      'opportunity_owner_name',
      'oportunidade_vendedor',
      'oportunidade_responsavel',
    ]),
  };
}

export function parsePiperunWebhookPayload(payload: unknown): {
  ok: true;
  data: PiperunWebhookPayload;
} | {
  ok: false;
  errors: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(payload)) {
    return { ok: false, errors: ['Payload JSON inválido'] };
  }

  const orgId = getFirstString(payload, ['org_id', 'orgId']);
  if (!orgId) {
    errors.push('org_id obrigatório');
  }

  const opportunitiesRaw = Array.isArray(payload.opportunities) ? payload.opportunities : [];
  const activitiesRaw = Array.isArray(payload.activities) ? payload.activities : [];

  const opportunities: PiperunOpportunityInput[] = [];
  for (let i = 0; i < opportunitiesRaw.length; i += 1) {
    const item = opportunitiesRaw[i];
    if (!isRecord(item)) {
      warnings.push(`opportunities[${i}] ignorada: objeto inválido`);
      continue;
    }
    const parsed = parseOpportunity(item, i, warnings);
    if (parsed) opportunities.push(parsed);
  }

  const activities: PiperunActivityInput[] = [];
  for (let i = 0; i < activitiesRaw.length; i += 1) {
    const item = activitiesRaw[i];
    if (!isRecord(item)) {
      warnings.push(`activities[${i}] ignorada: objeto inválido`);
      continue;
    }
    const parsed = parseActivity(item, i, warnings);
    if (parsed) activities.push(parsed);
  }

  if (opportunities.length === 0 && activities.length === 0) {
    errors.push('Nenhum registro válido em opportunities/activities');
  }

  if (errors.length > 0 || !orgId) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      org_id: orgId,
      opportunities,
      activities,
      warnings,
    },
  };
}

export type PersistPiperunResult = {
  opportunities_processed: number;
  activities_processed: number;
  opportunities_duplicates: number;
  activities_duplicates: number;
};

export async function persistPiperunWebhookData(
  admin: SupabaseClient,
  payload: PiperunWebhookPayload
): Promise<PersistPiperunResult> {
  const dedupedOpps = dedupeByExternalId(
    payload.org_id,
    'opportunity',
    payload.opportunities,
    (opp) => opp.external_id
  );

  const dedupedActivities = dedupeByExternalId(
    payload.org_id,
    'activity',
    payload.activities,
    (activity) => activity.external_id
  );

  if (dedupedOpps.unique.length > 0) {
    await admin
      .from('opportunities')
      .upsert(
        dedupedOpps.unique.map((opp) => ({
          org_id: payload.org_id,
          crm_source: 'piperun_webhook',
          crm_hash: opp.external_id,
          pipeline_name: opp.pipeline_name,
          stage_name: opp.stage_name,
          owner_name: opp.owner_name,
          owner_email: opp.owner_email,
          company_name: opp.company_name,
          title: opp.title,
          value: opp.value,
          created_date: opp.created_date,
          closed_date: opp.closed_date,
          status: opp.status,
        })),
        {
          onConflict: 'org_id,crm_hash',
          ignoreDuplicates: false,
        }
      );
  }

  if (dedupedActivities.unique.length > 0) {
    await admin
      .from('activities')
      .upsert(
        dedupedActivities.unique.map((activity) => ({
          org_id: payload.org_id,
          crm_activity_id: activity.external_id,
          type: activity.type,
          title: activity.title,
          owner: activity.owner,
          start_at: activity.start_at,
          done_at: activity.done_at,
          opportunity_id_crm: activity.opportunity_external_id,
          linked_opportunity_hash: activity.opportunity_external_id,
          company_name: activity.company_name,
          opportunity_title: activity.opportunity_title,
          opportunity_owner_name: activity.opportunity_owner_name,
          link_confidence: activity.opportunity_external_id ? 'high' : 'none',
        })),
        {
          onConflict: 'org_id,crm_activity_id',
          ignoreDuplicates: false,
        }
      );
  }

  return {
    opportunities_processed: dedupedOpps.unique.length,
    activities_processed: dedupedActivities.unique.length,
    opportunities_duplicates: dedupedOpps.duplicateCount,
    activities_duplicates: dedupedActivities.duplicateCount,
  };
}
