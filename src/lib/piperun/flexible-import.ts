/**
 * Importação flexível: delimitador automático, CSV/TSV/TXT e Excel (.xlsx/.xls).
 */
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

/** Mesma lógica que em csv.ts (evita import circular). */
function cleanPiperunLine(line: string): string {
  let cleaned = line.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }
  cleaned = cleaned.replace(/""/g, '"');
  return cleaned;
}

const DELIMITERS = [';', ',', '\t', '|'] as const;

function scoreParsedMatrix(matrix: string[][]): number {
  if (matrix.length < 2) return -1;
  const widths = matrix.map((r) => r.length);
  const maxW = Math.max(...widths, 1);
  const consistent = widths.filter((w) => w === maxW).length / matrix.length;
  return matrix.length * consistent * (maxW > 1 ? maxW : 0.1);
}

/**
 * Detecta o melhor delimitador e devolve a matriz de células (linha 0 = cabeçalhos).
 */
export function parseFlexibleDelimited(rawContent: string): string[][] {
  const lines = rawContent.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  const content = lines.map(cleanPiperunLine).join('\n');
  if (!content.trim()) return [];

  let best: string[][] | null = null;
  let bestScore = -1;

  for (const delimiter of DELIMITERS) {
    try {
      const parsed = parse(content, {
        delimiter,
        relax_column_count: true,
        skip_empty_lines: true,
        relax_quotes: true,
        quote: '"',
        escape: '"',
        bom: true,
      }) as string[][];

      const trimmed = parsed.map((row) => row.map((c) => (c ?? '').trim()));
      const s = scoreParsedMatrix(trimmed);
      if (s > bestScore) {
        bestScore = s;
        best = trimmed;
      }
    } catch {
      // tenta próximo delimitador
    }
  }

  if (best && best.length >= 2) return best;

  // fallback: ponto e vírgula (PipeRun legado)
  const fallback = parse(content, {
    delimiter: ';',
    relax_column_count: true,
    skip_empty_lines: true,
    relax_quotes: true,
    quote: '"',
    escape: '"',
    bom: true,
  }) as string[][];
  return fallback.map((row) => row.map((c) => (c ?? '').trim()));
}

function isExcelName(name: string): boolean {
  const n = name.toLowerCase();
  return n.endsWith('.xlsx') || n.endsWith('.xls');
}

/** Primeira folha do Excel → matriz de strings (mesmo formato que CSV). */
export function parseExcelToMatrix(buffer: Buffer): string[][] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const name = wb.SheetNames[0];
  if (!name) return [];
  const sheet = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[][];
  return rows.map((r) =>
    (Array.isArray(r) ? r : []).map((cell) => {
      if (cell == null) return '';
      if (cell instanceof Date) return cell.toISOString().slice(0, 10);
      return String(cell).trim();
    })
  );
}

/**
 * Converte upload (buffer + nome) para matriz de linhas.
 * Suporta .csv/.txt/.tsv (texto) e .xlsx/.xls.
 */
export function parseUploadBufferToRows(buffer: Buffer, filename: string): string[][] {
  const lower = filename.toLowerCase();
  if (isExcelName(lower)) {
    const matrix = parseExcelToMatrix(buffer);
    return matrix.filter((row) => row.some((c) => String(c).trim() !== ''));
  }
  const text = buffer.toString('utf-8');
  return parseFlexibleDelimited(text);
}
