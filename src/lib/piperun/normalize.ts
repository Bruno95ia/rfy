/**
 * Normalização e mapeamento de colunas (PipeRun, HubSpot-style, Pipedrive-style, etc.) → schema DB
 */
import {
  parseMoneyFlexible,
  parseDateFlexible,
  parseDateTimeFlexible,
} from '@/lib/piperun/csv';
import { createRowGetter } from '@/lib/piperun/column-alias';

const OPP_HASH = [
  'Hash',
  'hash',
  'ID Oportunidade',
  'Deal ID',
  'Opportunity ID',
  'deal_id',
  'opportunity_id',
  'Record ID',
  'record_id',
  'Código',
  'Codigo',
] as const;

const OPP_PIPELINE = [
  'Funil',
  'Pipeline',
  'pipeline_name',
  'Deal Pipeline',
  'Pipeline Name',
  'Funil de vendas',
] as const;

const OPP_STAGE = [
  'Etapa',
  'Stage',
  'stage_name',
  'Deal Stage',
  'Etapa do negócio',
] as const;

const OPP_STAGE_TIMING = [
  'Lead-Timing da etapa',
  'Stage timing',
  'Dias na etapa',
  'Days in stage',
  'Tempo na etapa',
] as const;

const OPP_OWNER_EMAIL = [
  'Dono da oportunidade',
  'Owner email',
  'owner_email',
  'E-mail do responsável',
  'Email do dono',
] as const;

const OPP_OWNER_NAME = [
  'Nome do dono da oportunidade',
  'Owner name',
  'owner_name',
  'Responsável',
  'Nome do vendedor',
] as const;

const OPP_COMPANY = [
  'Nome fantasia (Empresa)',
  'Company',
  'Account name',
  'Empresa',
  'Conta',
  'Company name',
] as const;

const OPP_TITLE = [
  'Titulo',
  'Título da oportunidade',
  'Title',
  'Deal name',
  'Opportunity name',
  'Nome do negócio',
  'Título',
] as const;

const OPP_VALUE = [
  'Valor de P&S',
  'Amount',
  'Value',
  'Deal value',
  'Valor',
  'deal_amount',
] as const;

const OPP_CREATED = [
  'Data de cadastro',
  'Created date',
  'created_at',
  'Data de criação',
  'Create date',
] as const;

const OPP_CLOSED = [
  'Data de fechamento',
  'Close date',
  'closed_at',
  'Data fechamento',
] as const;

const OPP_STATUS = ['Status', 'Situação', 'Deal status', 'Estágio do negócio'] as const;

const OPP_TAGS = ['Tags', 'tags', 'Etiquetas'] as const;

const ACT_ID = [
  'ID',
  'Activity ID',
  'activity_id',
  'Código da atividade',
  'Codigo',
] as const;

const ACT_TYPE = ['Tipo', 'Type', 'activity_type', 'Categoria'] as const;

const ACT_TITLE = ['Título', 'Titulo', 'Title', 'Subject', 'Assunto'] as const;

const ACT_OWNER = ['Responsável', 'Owner', 'owner', 'Assigned to'] as const;

const ACT_DONE = ['Concluído em', 'Completed at', 'done_at', 'Data conclusão'] as const;

const ACT_START = ['Início', 'Start', 'start_at', 'Data início'] as const;

const ACT_DUE = ['Prazo', 'Due', 'due_at', 'Vencimento'] as const;

const ACT_CREATED = [
  'Data de criação',
  'Created at',
  'created_at',
  'Criado em',
] as const;

const ACT_STATUS = ['Status', 'Estado'] as const;

const ACT_OPP_ID = [
  'ID (Oportunidade)',
  'Opportunity ID',
  'opportunity_id',
  'Deal ID',
  'ID Oportunidade',
] as const;

const ACT_OPP_PIPELINE = [
  'Funil (Oportunidade)',
  'Pipeline (Opportunity)',
  'Deal pipeline',
] as const;

const ACT_OPP_STAGE = ['Etapa (Oportunidade)', 'Stage (Opportunity)', 'Deal stage'] as const;

const ACT_COMPANY = [
  'Nome fantasia (Empresa)',
  'Company',
  'Account name',
  'Empresa',
] as const;

const ACT_OPP_TITLE = [
  'Titulo (Oportunidade)',
  'Título (Oportunidade)',
  'Opportunity title',
  'Deal name',
] as const;

const ACT_OPP_OWNER = [
  'Nome do dono da oportunidade (Oportunidade)',
  'Owner (Opportunity)',
  'Deal owner',
] as const;

export type NormalizedOpportunity = {
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
};

export function mapStatusPipeRun(s: string | null): 'open' | 'won' | 'lost' {
  const v = (s ?? '').toLowerCase().trim();
  if (
    ['ganha', 'won', 'ganho', 'closed won', 'closed-won', 'fechada ganha', 'ganado'].some((x) =>
      v.includes(x)
    )
  )
    return 'won';
  if (
    ['perdida', 'lost', 'perdido', 'closed lost', 'closed-lost', 'fechada perdida'].some((x) =>
      v.includes(x)
    )
  )
    return 'lost';
  return 'open';
}

function parseStageTiming(raw: string | null): number | null {
  if (raw == null || raw.trim() === '') return null;
  const n = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

export function normalizeOpportunityRow(
  row: Record<string, string>,
  headers: string[]
): NormalizedOpportunity | null {
  const get = createRowGetter(headers);

  const hash = get(row, OPP_HASH)?.trim();
  if (!hash) return null;

  const statusRaw = get(row, OPP_STATUS);
  const title =
    get(row, OPP_TITLE) ?? '';

  const stageTimingRaw = get(row, OPP_STAGE_TIMING);
  const stageTiming = parseStageTiming(stageTimingRaw);

  return {
    crm_hash: hash,
    pipeline_name: get(row, OPP_PIPELINE)?.trim() || null,
    stage_name: get(row, OPP_STAGE)?.trim() || null,
    stage_timing_days: stageTiming,
    owner_email: get(row, OPP_OWNER_EMAIL)?.trim() || null,
    owner_name: get(row, OPP_OWNER_NAME)?.trim() || null,
    company_name: get(row, OPP_COMPANY)?.trim() || null,
    title: title.trim() || null,
    value: parseMoneyFlexible(get(row, OPP_VALUE)),
    created_date: parseDateFlexible(get(row, OPP_CREATED)),
    closed_date: parseDateFlexible(get(row, OPP_CLOSED)),
    status: mapStatusPipeRun(statusRaw),
    tags: get(row, OPP_TAGS)?.trim() || null,
  };
}

export type NormalizedActivity = {
  crm_activity_id: string | null;
  type: string | null;
  title: string | null;
  owner: string | null;
  start_at: string | null;
  due_at: string | null;
  done_at: string | null;
  created_at_crm: string | null;
  status: string | null;
  opportunity_id_crm: string | null;
  pipeline_name: string | null;
  stage_name: string | null;
  company_name: string | null;
  opportunity_title: string | null;
  opportunity_owner_name: string | null;
};

export function normalizeActivityRow(
  row: Record<string, string>,
  headers: string[]
): NormalizedActivity | null {
  const get = createRowGetter(headers);

  const id = get(row, ACT_ID);
  const title = get(row, ACT_TITLE);
  if (!id?.trim() && !title?.trim()) return null;

  const doneAtRaw = get(row, ACT_DONE);
  const startAtRaw = get(row, ACT_START);
  const dueAtRaw = get(row, ACT_DUE);

  return {
    crm_activity_id: id?.trim() || null,
    type: get(row, ACT_TYPE)?.trim() || null,
    title: title?.trim() || null,
    owner: get(row, ACT_OWNER)?.trim() || null,
    start_at: parseDateTimeFlexible(startAtRaw ?? doneAtRaw),
    due_at: parseDateTimeFlexible(dueAtRaw),
    done_at: parseDateTimeFlexible(doneAtRaw),
    created_at_crm: parseDateTimeFlexible(get(row, ACT_CREATED)),
    status: get(row, ACT_STATUS)?.trim() || null,
    opportunity_id_crm: get(row, ACT_OPP_ID)?.trim() || null,
    pipeline_name: get(row, ACT_OPP_PIPELINE)?.trim() || null,
    stage_name: get(row, ACT_OPP_STAGE)?.trim() || null,
    company_name: get(row, ACT_COMPANY)?.trim() || null,
    opportunity_title: get(row, ACT_OPP_TITLE)?.trim() || null,
    opportunity_owner_name: get(row, ACT_OPP_OWNER)?.trim() || null,
  };
}
