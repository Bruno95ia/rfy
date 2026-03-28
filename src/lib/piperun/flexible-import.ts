/**
 * Importação flexível: delimitador automático, CSV/TSV/TXT e Excel (.xlsx/.xls).
 */
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

/**
 * Decodifica buffer de CSV exportado pelo Excel (UTF-8, UTF-16 LE/BE com BOM).
 * Sem isso, UTF-16 vira lixo em toString('utf-8') e o cabeçalho não casa com question_id.
 */
export function decodeBufferToUtf8String(buffer: Buffer): string {
  if (buffer.length >= 2) {
    const b0 = buffer[0];
    const b1 = buffer[1];
    if (b0 === 0xff && b1 === 0xfe) {
      return buffer.slice(2).toString('utf16le');
    }
    if (b0 === 0xfe && b1 === 0xff) {
      const body = Buffer.from(buffer.slice(2));
      if (body.length % 2 !== 0) return buffer.toString('utf-8');
      for (let i = 0; i < body.length; i += 2) {
        const a = body[i]!;
        body[i] = body[i + 1]!;
        body[i + 1] = a;
      }
      return body.toString('utf16le');
    }
  }
  return buffer.toString('utf-8');
}

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
  if (matrix.length === 0) return -1;
  const maxW = Math.max(...matrix.map((r) => r.length), 0);
  if (maxW < 2) return -1;
  /** Uma linha física com várias colunas (ex.: única linha de CSV) ainda é válida para escolher delimitador. */
  if (matrix.length === 1) return maxW * 100;
  const widths = matrix.map((r) => r.length);
  const consistent = widths.filter((w) => w === maxW).length / matrix.length;
  return matrix.length * consistent * maxW;
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

  if (best && best.length >= 1 && best[0].length >= 2) return best;

  // fallback: vírgula (comum em CSV) e depois ponto e vírgula (PipeRun legado)
  for (const delimiter of [',', ';'] as const) {
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
      if (trimmed.length >= 1 && trimmed[0].length >= 2) return trimmed;
    } catch {
      /* próximo */
    }
  }
  try {
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
  } catch {
    return [];
  }
}

/**
 * Excel costuma colar o CSV inteiro na coluna A (uma célula = uma linha lógica do CSV).
 * Junta essas linhas e re-parseia como CSV/TSV real para obter colunas separadas.
 */
export function unfoldSingleColumnMatrix(rows: string[][]): string[][] {
  const nonEmpty = rows.filter((r) => r.some((c) => String(c).trim() !== ''));
  if (nonEmpty.length === 0) return rows;

  const countNonEmpty = (r: string[]) => r.filter((c) => String(c).trim() !== '').length;
  const maxNonEmptyPerRow = Math.max(...nonEmpty.map(countNonEmpty), 0);
  /** Várias colunas com conteúdo = planilha “normal” (respondent | question_id | value). */
  if (maxNonEmptyPerRow > 1) return rows;

  /** Uma célula com texto por linha (resto vazio ou omitido) — CSV inteiro na coluna A. */
  const lines: string[] = [];
  for (const r of nonEmpty) {
    const nonempty = r.filter((c) => String(c).trim() !== '');
    const cell = nonempty.length >= 1 ? String(nonempty[0]).trim() : '';
    if (!cell) continue;
    if (cell.startsWith('#')) continue;
    lines.push(cell);
  }
  if (lines.length < 2) return rows;

  const text = lines.join('\n');
  const parsed = parseFlexibleDelimited(text);
  if (parsed.length >= 2 && parsed[0].length >= 2) return parsed;
  return rows;
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
    const filtered = matrix.filter((row) => row.some((c) => String(c).trim() !== ''));
    return unfoldSingleColumnMatrix(filtered);
  }
  const text = decodeBufferToUtf8String(buffer);
  return parseFlexibleDelimited(text);
}
