/**
 * Parser robusto para CSV do PipeRun.
 * - Delimitador: ;
 * - Linhas embrulhadas em aspas
 * - Aspas duplicadas "" dentro dos valores
 * - Moeda BRL: "R$ 10.423,80"
 * - Datas BR: DD/MM/YYYY e DD/MM/YYYY HH:MM:SS
 */
import { parse } from 'csv-parse/sync';

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
 * Parse de valor monetário BRL: "R$ 10.423,80" -> 10423.80
 */
export function parseBRLMoney(value: string | null): number | null {
  if (value == null || value.trim() === '') return null;
  const cleaned = value.trim().replace(/^R\$\s*/, '').replace(/\s/g, '');
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(normalized);
  return Number.isNaN(num) ? null : num;
}

/**
 * Parse de data BR: "08/01/2021" -> "2021-01-08" (ISO)
 */
export function parseBRDate(value: string | null): string | null {
  if (value == null || value.trim() === '') return null;
  const cleaned = value.trim();
  const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  const d = day.padStart(2, '0');
  const m = month.padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Parse de datetime BR: "08/01/2021 14:00:00" -> ISO com timezone UTC
 */
export function parseBRDateTime(value: string | null): string | null {
  if (value == null || value.trim() === '') return null;
  const cleaned = value.trim();
  const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
  if (!match) return parseBRDate(cleaned); // fallback para só data
  const [, day, month, year, h, min, sec] = match;
  const d = day.padStart(2, '0');
  const m = month.padStart(2, '0');
  const hh = h.padStart(2, '0');
  const mm = min.padStart(2, '0');
  const ss = sec.padStart(2, '0');
  return `${year}-${m}-${d}T${hh}:${mm}:${ss}Z`;
}

/**
 * Parse completo do CSV PipeRun.
 * Cada linha pode estar como string única entre aspas.
 */
export function parsePiperunCsv(rawContent: string): string[][] {
  const lines = rawContent.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  const cleanedLines = lines.map(cleanPiperunLine);
  const content = cleanedLines.join('\n');

  const parsed = parse(content, {
    delimiter: ';',
    relax_column_count: true,
    skip_empty_lines: true,
    relax_quotes: true,
    quote: '"',
    escape: '"',
  }) as string[][];

  return parsed.map((row) => row.map((cell) => (cell ?? '').trim()));
}
