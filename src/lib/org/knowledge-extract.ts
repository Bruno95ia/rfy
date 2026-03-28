/**
 * Extração de texto para o repositório Conhecimento (diagnóstico SUPHO).
 * PDF, DOCX e planilhas Excel passam a alimentar o contexto interno com o conteúdo extraído.
 */
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

/** Limite de leitura do ficheiro antes de tentar extração (evita picos de memória). */
export const MAX_EXTRACT_INPUT_BYTES = 28 * 1024 * 1024;

const MAX_SHEETS = 15;

function isPdf(mime: string | null, filename: string): boolean {
  return mime === 'application/pdf' || /\.pdf$/i.test(filename);
}

function isDocx(mime: string | null, filename: string): boolean {
  return (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    /\.docx$/i.test(filename)
  );
}

function isExcelWorkbook(mime: string | null, filename: string): boolean {
  if (/\.xlsx$/i.test(filename)) return true;
  if (/\.xls$/i.test(filename) && !/\.xlsx$/i.test(filename)) return true;
  if (!mime) return false;
  return (
    mime === 'application/vnd.ms-excel' ||
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}

export type ExtractOutcome =
  | { ok: true; text: string; format: 'pdf' | 'docx' | 'spreadsheet' }
  | { ok: false };

/**
 * Tenta extrair texto de PDF, DOCX ou Excel a partir do buffer já carregado.
 */
export async function extractPlainTextFromBuffer(
  buf: Buffer,
  mimeType: string | null,
  filename: string
): Promise<ExtractOutcome> {
  if (buf.length > MAX_EXTRACT_INPUT_BYTES) {
    return { ok: false };
  }

  if (isPdf(mimeType, filename)) {
    const parser = new PDFParse({ data: new Uint8Array(buf) });
    try {
      const result = await parser.getText();
      const text = (result.text ?? '').trim();
      return text ? { ok: true, text, format: 'pdf' } : { ok: false };
    } catch {
      return { ok: false };
    } finally {
      try {
        await parser.destroy();
      } catch {
        /* ignore */
      }
    }
  }

  if (isDocx(mimeType, filename)) {
    try {
      const result = await mammoth.extractRawText({ buffer: buf });
      const text = (result.value ?? '').trim();
      return text ? { ok: true, text, format: 'docx' } : { ok: false };
    } catch {
      return { ok: false };
    }
  }

  if (isExcelWorkbook(mimeType, filename)) {
    try {
      const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
      const parts: string[] = [];
      const names = wb.SheetNames ?? [];
      const n = Math.min(names.length, MAX_SHEETS);
      for (let i = 0; i < n; i++) {
        const name = names[i];
        const sheet = wb.Sheets[name];
        if (!sheet) continue;
        parts.push(`### ${name}\n`);
        parts.push(XLSX.utils.sheet_to_csv(sheet));
      }
      if (names.length > MAX_SHEETS) {
        parts.push(`\n[… ${names.length - MAX_SHEETS} folha(s) omitidas.]`);
      }
      const text = parts.join('\n').trim();
      return text ? { ok: true, text, format: 'spreadsheet' } : { ok: false };
    } catch {
      return { ok: false };
    }
  }

  return { ok: false };
}
