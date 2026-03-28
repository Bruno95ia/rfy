/**
 * Parser robusto para CSV do PipeRun.
 * - Delimitador: ;
 * - Linhas embrulhadas em aspas
 * - Aspas duplicadas "" dentro dos valores
 * - Moeda BRL: "R$ 10.423,80"
 * - Datas BR: DD/MM/YYYY e DD/MM/YYYY HH:MM:SS
 */
import { parseFlexibleDelimited } from '@/lib/piperun/flexible-import';

/**
 * Limpa uma linha do CSV PipeRun antes de parsear.
 * - trim
 * - se começa e termina com ", remove
 * - substitui "" por "
 */
export function cleanPiperunLine(line: string): string {
  let cleaned = line.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }
  cleaned = cleaned.replace(/""/g, '"');
  return cleaned;
}

/**
 * Parse de valor monetário: BRL (R$ 1.234,56), USD (1,234.56), número simples.
 */
export function parseMoneyFlexible(value: string | null): number | null {
  if (value == null || value.trim() === '') return null;
  const s = value
    .trim()
    .replace(/^\s*R\$\s*/i, '')
    .replace(/^\s*[$€£]\s*/, '')
    .replace(/\s/g, '');
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  let n: string;
  if (hasComma && hasDot) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      n = s.replace(/\./g, '').replace(',', '.');
    } else {
      n = s.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    const parts = s.split(',');
    if (parts.length === 2 && parts[1]!.length > 0 && parts[1]!.length <= 2) {
      n = s.replace(/\./g, '').replace(',', '.');
    } else {
      n = s.replace(/,/g, '');
    }
  } else if (hasDot && !hasComma) {
    const parts = s.split('.');
    if (parts.length === 2 && parts[1]!.length <= 2) {
      n = s;
    } else {
      n = s.replace(/\./g, '');
    }
  } else {
    n = s.replace(/\./g, '').replace(',', '.');
  }
  const num = parseFloat(n);
  return Number.isNaN(num) ? null : num;
}

export function parseBRLMoney(value: string | null): number | null {
  return parseMoneyFlexible(value);
}

/**
 * Parse de data BR: "08/01/2021" -> "2021-01-08" (ISO). Formato DD/MM/AAAA.
 */
export function parseBRDate(value: string | null): string | null {
  if (value == null || value.trim() === '') return null;
  const cleaned = value.trim();
  const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  const d = day!.padStart(2, '0');
  const m = month!.padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/** ISO, BR (DD/MM/YYYY) ou US (MM/DD quando segundo > 12). */
export function parseDateFlexible(value: string | null): string | null {
  if (value == null || value.trim() === '') return null;
  const t = value.trim();
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const slash = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) {
    const [, a, b, y] = slash;
    const ai = parseInt(a!, 10);
    const bi = parseInt(b!, 10);
    if (bi > 12) return `${y}-${String(bi).padStart(2, '0')}-${String(ai).padStart(2, '0')}`;
    if (ai > 12) return `${y}-${String(ai).padStart(2, '0')}-${String(bi).padStart(2, '0')}`;
    return parseBRDate(value);
  }
  return null;
}

/**
 * Parse de datetime BR ou ISO parcial: ex. "08/01/2021 14:00:00" ou "2021-01-08 14:00" -> ISO em UTC com sufixo Z.
 * Quando não há componente de hora (apenas data, via `parseDateFlexible`), o resultado usa meio-dia UTC (`T12:00:00Z`),
 * alinhado ao restante do parsing flexível de datas na importação.
 */
export function parseBRDateTime(value: string | null): string | null {
  if (value == null || value.trim() === '') return null;
  const cleaned = value.trim();
  const iso = cleaned.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/
  );
  if (iso) {
    const [, y, mo, d, h, min, sec] = iso;
    const ss = (sec ?? '0').padStart(2, '0');
    return `${y}-${mo}-${d}T${h!.padStart(2, '0')}:${min!.padStart(2, '0')}:${ss}Z`;
  }
  const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
  if (!match) {
    const dOnly = parseDateFlexible(cleaned);
    return dOnly ? `${dOnly}T12:00:00Z` : null;
  }
  const [, day, month, year, h, min, sec] = match;
  const d = day.padStart(2, '0');
  const m = month.padStart(2, '0');
  const hh = h.padStart(2, '0');
  const mm = min.padStart(2, '0');
  const ss = sec.padStart(2, '0');
  return `${year}-${m}-${d}T${hh}:${mm}:${ss}Z`;
}

/** Data/hora BR, ISO ou só data. */
export function parseDateTimeFlexible(value: string | null): string | null {
  if (value == null || value.trim() === '') return null;
  const t = value.trim();
  if (/^\d{4}-\d{2}-\d{2}[T\s]/.test(t)) {
    return parseBRDateTime(t);
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d/.test(t)) {
    return parseBRDateTime(t);
  }
  const d = parseDateFlexible(t);
  return d ? `${d}T12:00:00Z` : null;
}

/**
 * Parse de planilha/tabular: delimitador detectado automaticamente (; , tab |).
 * Compatível com export PipeRun (;) e outros CRMs.
 */
export function parsePiperunCsv(rawContent: string): string[][] {
  return parseFlexibleDelimited(rawContent);
}
