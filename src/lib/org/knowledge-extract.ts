/**
 * Extração de texto para o repositório Conhecimento (diagnóstico SUPHO).
 * PDF, Word (.doc/.docx/.docm), RTF, ODT, Excel — alimentam o contexto interno com o conteúdo extraído.
 */
import { PDFParse } from 'pdf-parse';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import WordExtractor from 'word-extractor';
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
    mime === 'application/vnd.ms-word.document.macroEnabled.12' ||
    /\.docx$/i.test(filename) ||
    /\.docm$/i.test(filename)
  );
}

/** Word 97–2003 (.doc) — OLE, não OOXML. */
function isLegacyWordDoc(mime: string | null, filename: string): boolean {
  if (/\.docx$/i.test(filename) || /\.docm$/i.test(filename)) return false;
  if (mime === 'application/msword') return true;
  return /\.doc$/i.test(filename);
}

function isRtf(mime: string | null, filename: string): boolean {
  return (
    mime === 'application/rtf' ||
    mime === 'text/rtf' ||
    mime === 'application/x-rtf' ||
    /\.rtf$/i.test(filename)
  );
}

function isOdt(mime: string | null, filename: string): boolean {
  return (
    mime === 'application/vnd.oasis.opendocument.text' ||
    /\.odt$/i.test(filename)
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

/** RTF simples: remove control words e decodifica \'hh / \\u — suficiente para texto corrido. */
export function extractRtfPlainText(rtf: string): string {
  const t = rtf.trim();
  if (!/\{\\rtf/i.test(t)) return '';
  let s = t;
  s = s.replace(/\\'([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  s = s.replace(/\\u(-?\d+)\s*\\?/gi, (_, n) => {
    const code = parseInt(n, 10);
    if (code < 0) return String.fromCharCode(65536 + code);
    return String.fromCharCode(code);
  });
  s = s.replace(/\{\\\*[^}]*\}/g, ' ');
  s = s.replace(/\{[^}]*\}/g, ' ');
  s = s.replace(/\\[a-z]+\d* ?/gi, ' ');
  s = s.replace(/\\[{}]/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

async function extractOdtText(buf: Buffer): Promise<string | null> {
  try {
    const zip = await JSZip.loadAsync(buf);
    const content = zip.file('content.xml');
    if (!content) return null;
    const xml = await content.async('string');
    const text = xml
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
    return text || null;
  } catch {
    return null;
  }
}

export type ExtractOutcome =
  | { ok: true; text: string; format: 'pdf' | 'docx' | 'word' | 'spreadsheet' | 'rtf' | 'odt' }
  | { ok: false };

/**
 * Tenta extrair texto de PDF, Word (DOC/DOCX/…), RTF, ODT ou Excel a partir do buffer já carregado.
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

  if (isLegacyWordDoc(mimeType, filename)) {
    try {
      const extractor = new WordExtractor();
      const doc = await extractor.extract(buf);
      const body = (doc.getBody() ?? '').trim();
      if (body) return { ok: true, text: body, format: 'word' };
      return { ok: false };
    } catch {
      return { ok: false };
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

  if (isRtf(mimeType, filename)) {
    const raw = buf.toString('latin1');
    const text = extractRtfPlainText(raw);
    return text ? { ok: true, text, format: 'rtf' } : { ok: false };
  }

  if (isOdt(mimeType, filename)) {
    const text = await extractOdtText(buf);
    return text ? { ok: true, text, format: 'odt' } : { ok: false };
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
