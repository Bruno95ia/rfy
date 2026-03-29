/**
 * Resolve a campanha SUPHO considerada "atual" para o Painel de Maturidade:
 * prioriza campanhas abertas ou encerradas, ordenadas por updated_at (reflete uploads/síntese).
 */

export type CurrentCampaignForMaturity = {
  id: string;
  name: string;
  status: string;
  updated_at: string;
  uploads_context_updated_at: string | null;
};

/** Normaliza timestamptz vindo do driver (string, Date ou número). */
export function coerceIsoTimestamp(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return String(value);
}

function rowFrom(data: unknown): CurrentCampaignForMaturity | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  const id = o.id;
  const name = o.name;
  const status = o.status;
  const updated_at = coerceIsoTimestamp(o.updated_at);
  if (typeof id !== 'string' || typeof name !== 'string' || typeof status !== 'string') return null;
  if (!updated_at) return null;
  const uploadsRaw = o.uploads_context_updated_at;
  const uploads =
    uploadsRaw == null ? null : coerceIsoTimestamp(uploadsRaw) ?? String(uploadsRaw);
  return {
    id,
    name,
    status,
    updated_at,
    uploads_context_updated_at: uploads,
  };
}

/** Campanha mais recentemente atualizada entre open/closed; se não houver, a mais recente no geral (ex.: draft). */
export async function fetchCurrentCampaignForMaturity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cliente servidor custom (from → admin)
  supabase: any,
  orgId: string
): Promise<CurrentCampaignForMaturity | null> {
  const active = await supabase
    .from('supho_diagnostic_campaigns')
    .select('id, name, status, updated_at, uploads_context_updated_at')
    .eq('org_id', orgId)
    .in('status', ['open', 'closed'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const activeRow = rowFrom(active.data);
  if (activeRow) return activeRow;

  const any = await supabase
    .from('supho_diagnostic_campaigns')
    .select('id, name, status, updated_at, uploads_context_updated_at')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return rowFrom(any.data);
}

export function isUploadsContextNewerThanCompute(
  uploadsContextUpdatedAt: string | null,
  computedAtIso: string
): boolean {
  if (!uploadsContextUpdatedAt?.trim()) return false;
  const u = Date.parse(uploadsContextUpdatedAt);
  const c = Date.parse(computedAtIso);
  if (Number.isNaN(u) || Number.isNaN(c)) return false;
  return u > c;
}
