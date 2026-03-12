/**
 * Mapeia respostas da API PipeRun para o formato normalizado RFY (opportunities/activities).
 * Reutiliza normalizeValue, normalizeStatus e parseDate de @/lib/crm/validate.
 */
import {
  normalizeValue,
  normalizeStatus,
  parseDate,
} from '@/lib/crm/validate';
import type {
  PipeRunDealRaw,
  PipeRunActivityRaw,
  NormalizedOpportunityRow,
  NormalizedActivityRow,
} from './types';

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

/** Mapeia status da API para open | won | lost (compatível com CSV PipeRun: ganha/perdida/aberta). */
function mapStatus(raw: string | null): 'open' | 'won' | 'lost' {
  const v = (raw ?? '').toLowerCase().trim();
  if (v === 'ganha' || v === 'won') return 'won';
  if (v === 'perdida' || v === 'lost') return 'lost';
  const { status } = normalizeStatus(raw);
  return status;
}

/**
 * Converte um deal/oportunidade da API PipeRun para linha normalizada (opportunities).
 */
export function mapDealToOpportunity(d: PipeRunDealRaw): NormalizedOpportunityRow | null {
  const hash =
    str(d.hash) ?? str(d.id) ?? str(d.crm_hash) ?? null;
  if (!hash) return null;

  const valueRaw = d.value ?? d.valor;
  const value = normalizeValue(valueRaw);
  const statusRaw = str(d.status) ?? null;
  const status = mapStatus(statusRaw);

  const created = parseDate(d.created_date) ?? null;
  const closed = parseDate(d.closed_date) ?? null;

  const stageTiming = num(d.stage_timing_days) ?? num((d as Record<string, unknown>).stage_timing_days) ?? null;

  return {
    crm_hash: hash,
    pipeline_name: str(d.pipeline_name ?? d.funil) ?? null,
    stage_name: str(d.stage_name ?? d.etapa) ?? null,
    stage_timing_days: stageTiming,
    owner_email: str(d.owner_email) ?? null,
    owner_name: str(d.owner_name) ?? null,
    company_name: str(d.company_name) ?? null,
    title: str(d.title ?? d.titulo) ?? null,
    value,
    created_date: created,
    closed_date: closed,
    status,
    tags: str((d as Record<string, unknown>).tags) ?? null,
  };
}

/**
 * Converte uma atividade da API PipeRun para linha normalizada (activities).
 */
export function mapActivityToActivity(
  a: PipeRunActivityRaw,
  opportunityHash?: string | null
): NormalizedActivityRow | null {
  const id = str(a.id ?? a.crm_activity_id);
  const linkHash =
    str(a.linked_opportunity_hash) ?? str(a.opportunity_id) ?? opportunityHash ?? null;
  if (!id && !str(a.title ?? a.titulo)) return null;

  return {
    crm_activity_id: id,
    type: str(a.type) ?? null,
    title: str(a.title ?? a.titulo) ?? null,
    owner: str(a.owner) ?? null,
    start_at: parseDate(a.start_at) ?? null,
    due_at: parseDate((a as Record<string, unknown>).due_at) ?? null,
    done_at: parseDate(a.done_at) ?? null,
    created_at_crm: parseDate(a.created_at ?? (a as Record<string, unknown>).created_at_crm) ?? null,
    opportunity_id_crm: str(a.opportunity_id ?? (a as Record<string, unknown>).opportunity_id_crm) ?? null,
    linked_opportunity_hash: linkHash,
    company_name: str(a.company_name) ?? null,
    opportunity_title: str(a.opportunity_title) ?? null,
    opportunity_owner_name: str((a as Record<string, unknown>).opportunity_owner_name) ?? null,
  };
}
