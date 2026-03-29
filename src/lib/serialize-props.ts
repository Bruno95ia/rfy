/**
 * Garante dados serializáveis em Server Components → Client Components (Next.js).
 * - pg devolve `Date` em timestamptz; `numeric` pode vir como string.
 * - `jsonb` já vem como objeto; evitamos referências não-plain.
 */
export function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  if (value == null) return new Date().toISOString();
  return String(value);
}

export function toPlainSerializable<T>(value: T): T {
  if (value === null || value === undefined) return value;
  try {
    return JSON.parse(
      JSON.stringify(value, (_k, v) => {
        if (v instanceof Date) return v.toISOString();
        if (typeof v === 'bigint') return v.toString();
        if (typeof v === 'function' || typeof v === 'symbol') return undefined;
        return v;
      })
    ) as T;
  } catch {
    if (Array.isArray(value)) return [] as T;
    return null as T;
  }
}

export function normalizeFrictionsJson(
  value: unknown
): Array<Record<string, unknown>> | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  return [];
}

export function normalizeSnapshotJson(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  return null;
}
