/**
 * Validações de qualidade para dados do CRM (webhook e uso interno).
 * Usado para detectar inconsistências, outliers e campos inválidos sem alterar dados.
 * Ver docs/ANALISE_QUALIDADE_CRM.md.
 */

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

/** Status aceitos no sistema; variantes pt-BR mapeáveis */
const STATUS_MAP: Record<string, 'open' | 'won' | 'lost'> = {
  open: 'open',
  won: 'won',
  lost: 'lost',
  aberta: 'open',
  ganha: 'won',
  perdida: 'lost',
  fechada: 'open', // genérico
};

const VALID_STATUS = new Set<string>(['open', 'won', 'lost']);
const MAX_REASONABLE_VALUE = 1e12;

/**
 * Valida e normaliza value monetário: >= 0, finito; caso contrário null.
 */
export function normalizeValue(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  if (n > MAX_REASONABLE_VALUE) return null;
  return n;
}

/**
 * Valida e normaliza status para 'open' | 'won' | 'lost'.
 * Retorna o status normalizado e se era desconhecido (warning).
 */
export function normalizeStatus(
  status: unknown
): { status: 'open' | 'won' | 'lost'; unknownValue?: string } {
  const raw = (status ?? '').toString().toLowerCase().trim();
  if (!raw) return { status: 'open' };
  const mapped = STATUS_MAP[raw];
  if (mapped) return { status: mapped };
  if (VALID_STATUS.has(raw)) return { status: raw as 'open' | 'won' | 'lost' };
  return { status: 'open', unknownValue: raw };
}

/**
 * Valida data em formato ISO (YYYY-MM-DD) ou apenas ano-mês-dia.
 */
export function parseDate(value: unknown): string | null {
  if (value == null || String(value).trim() === '') return null;
  const s = String(value).trim();
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) {
    const [, d, m, y] = br;
    return `${y}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`;
  }
  return null;
}

/**
 * Valida uma oportunidade do payload do webhook.
 * Acumula errors (bloqueantes) e warnings (informativos).
 */
export function validateOpportunity(
  o: Record<string, unknown>,
  index: number
): { errors: string[]; warnings: string[]; normalized?: { value: number | null; status: 'open' | 'won' | 'lost' } } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const hash = o?.crm_hash != null ? String(o.crm_hash).trim() : '';
  if (!hash) {
    errors.push(`[${index}] crm_hash obrigatório`);
    return { errors, warnings };
  }

  const { status, unknownValue } = normalizeStatus(o?.status);
  if (unknownValue) {
    warnings.push(`[${index}] status desconhecido "${unknownValue}" mapeado para "open"`);
  }

  const value = normalizeValue(o?.value);
  if (o?.value != null && o?.value !== '' && value === null) {
    const v = o.value;
    if (typeof v === 'number' && (v < 0 || !Number.isFinite(v))) {
      warnings.push(`[${index}] value inválido (${v}) ignorado`);
    } else if (typeof v === 'number' && v > MAX_REASONABLE_VALUE) {
      warnings.push(`[${index}] value muito alto (${v}) ignorado`);
    }
  }

  const created = parseDate(o?.created_date);
  const closed = parseDate(o?.closed_date);
  if (created && closed) {
    if (closed < created) {
      warnings.push(`[${index}] closed_date (${closed}) anterior a created_date (${created})`);
    }
  }

  return {
    errors,
    warnings,
    normalized: { value, status },
  };
}

/**
 * Valida lista de oportunidades do webhook.
 */
export function validateOpportunities(
  opportunities: unknown[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const arr = Array.isArray(opportunities) ? opportunities : [];

  arr.forEach((o, i) => {
    if (o == null || typeof o !== 'object') {
      errors.push(`[${i}] oportunidade deve ser um objeto`);
      return;
    }
    const res = validateOpportunity(o as Record<string, unknown>, i);
    errors.push(...res.errors);
    warnings.push(...res.warnings);
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valida uma atividade do payload (campos mínimos para link ou exibição).
 */
export function validateActivity(
  a: Record<string, unknown>,
  index: number
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const hasLink =
    (a?.linked_opportunity_hash != null && String(a.linked_opportunity_hash).trim() !== '') ||
    (a?.opportunity_id_crm != null && String(a.opportunity_id_crm).trim() !== '');

  if (!hasLink) {
    warnings.push(
      `[${index}] atividade sem linked_opportunity_hash nem opportunity_id_crm será ignorada pelo webhook atual`
    );
  }

  return { errors, warnings };
}

/**
 * Valida lista de atividades do webhook.
 */
export function validateActivities(activities: unknown[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const arr = Array.isArray(activities) ? activities : [];

  arr.forEach((a, i) => {
    if (a != null && typeof a === 'object') {
      const res = validateActivity(a as Record<string, unknown>, i);
      errors.push(...res.errors);
      warnings.push(...res.warnings);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valida payload completo do webhook (org_id, opportunities, activities).
 */
export function validateWebhookPayload(body: {
  org_id?: unknown;
  opportunities?: unknown;
  activities?: unknown;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const orgId = body?.org_id ?? (body as { orgId?: unknown }).orgId;
  if (orgId == null || typeof orgId !== 'string' || orgId.trim() === '') {
    errors.push('org_id obrigatório');
  }

  const oppResult = validateOpportunities(
    Array.isArray(body?.opportunities) ? body.opportunities : []
  );
  const actResult = validateActivities(
    Array.isArray(body?.activities) ? body.activities : []
  );

  errors.push(...oppResult.errors, ...actResult.errors);
  warnings.push(...oppResult.warnings, ...actResult.warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
