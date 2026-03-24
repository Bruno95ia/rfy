/**
 * Correspondência flexível de cabeçalhos de planilha (CRM export, idiomas, nomes alternativos).
 */

export function normalizeHeaderKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function matchesHeader(header: string, alias: string): boolean {
  const h = header.trim();
  const a = alias.trim();
  if (h === a) return true;
  if (h.toLowerCase() === a.toLowerCase()) return true;
  const hn = normalizeHeaderKey(header);
  const an = normalizeHeaderKey(alias);
  if (hn === an) return true;
  if (hn.replace(/_/g, '') === an.replace(/_/g, '')) return true;
  return false;
}

/** Primeiro cabeçalho da lista que casa com algum alias (ordem dos aliases importa). */
export function findColumn(headers: string[], aliases: readonly string[]): string | null {
  for (const alias of aliases) {
    const found = headers.find((h) => matchesHeader(h, alias));
    if (found) return found;
  }
  return null;
}

export function createRowGetter(headers: string[]) {
  const cache = new Map<string, string | null>();

  return function get(row: Record<string, string>, aliases: readonly string[]): string | null {
    const key = aliases.join('\0');
    let col = cache.get(key);
    if (col === undefined) {
      col = findColumn(headers, aliases);
      cache.set(key, col);
    }
    if (!col) return null;
    const v = row[col];
    return v == null ? null : String(v);
  };
}
