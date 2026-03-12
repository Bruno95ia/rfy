/**
 * Normalização e mapeamento de colunas PipeRun → schema DB
 */
import {
  parseBRLMoney,
  parseBRDate,
  parseBRDateTime,
} from '@/lib/piperun/csv';

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
  if (v === 'ganha') return 'won';
  if (v === 'perdida') return 'lost';
  return 'open';
}

export function normalizeOpportunityRow(
  row: Record<string, string>,
  headers: string[]
): NormalizedOpportunity | null {
  const get = (key: string): string | null => {
    const col = headers.find((h) => h.trim() === key);
    return col ? (row[col] ?? null) : null;
  };

  const hash = get('Hash')?.trim();
  if (!hash) return null;

  const statusRaw = get('Status') ?? get('Situação');
  const title =
    get('Titulo') ?? get('Título da oportunidade') ?? get('Titulo') ?? '';

  const stageTimingRaw = get('Lead-Timing da etapa');
  const stageTiming = stageTimingRaw
    ? parseFloat(stageTimingRaw.replace(/\./g, '').replace(',', '.'))
    : null;

  return {
    crm_hash: hash,
    pipeline_name: get('Funil') || null,
    stage_name: get('Etapa') || null,
    stage_timing_days: Number.isNaN(stageTiming!) ? null : stageTiming,
    owner_email: get('Dono da oportunidade')?.trim() || null,
    owner_name: get('Nome do dono da oportunidade')?.trim() || null,
    company_name: get('Nome fantasia (Empresa)') || null,
    title: title || null,
    value: parseBRLMoney(get('Valor de P&S')),
    created_date: parseBRDate(get('Data de cadastro')),
    closed_date: parseBRDate(get('Data de fechamento')),
    status: mapStatusPipeRun(statusRaw),
    tags: get('Tags') || null,
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
  const get = (key: string): string | null => {
    const col = headers.find((h) => h.trim() === key);
    return col ? (row[col] ?? null) : null;
  };

  const id = get('ID');
  if (!id?.trim() && !get('Titulo')) return null;

  const doneAtRaw = get('Concluído em');
  const startAtRaw = get('Início');
  const dueAtRaw = get('Prazo');

  return {
    crm_activity_id: get('ID') || null,
    type: get('Tipo') || null,
    title: get('Título') || null,
    owner: get('Responsável') || null,
    start_at: parseBRDateTime(startAtRaw ?? doneAtRaw) || null,
    due_at: parseBRDateTime(dueAtRaw) || null,
    done_at: parseBRDateTime(doneAtRaw) || null,
    created_at_crm: parseBRDateTime(get('Data de criação')) || null,
    status: get('Status') || null,
    opportunity_id_crm: get('ID (Oportunidade)') || null,
    pipeline_name: get('Funil (Oportunidade)') || null,
    stage_name: get('Etapa (Oportunidade)') || null,
    company_name: get('Nome fantasia (Empresa)') || null,
    opportunity_title: get('Titulo (Oportunidade)') || null,
    opportunity_owner_name: get('Nome do dono da oportunidade (Oportunidade)') || null,
  };
}
