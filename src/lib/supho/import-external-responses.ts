/**
 * Importação em lote de respostas SUPHO coletadas fora da RFY (Typeform, Google Forms, etc.).
 * Formato CSV longo: uma linha por (respondente × pergunta).
 * Delimitadores (; , tab |) e Excel (.xlsx/.xls) suportados.
 */
import { z } from 'zod';
import type { AdminDbClientType } from '@/lib/supabase/admin';
import {
  decodeBufferToUtf8String,
  parseFlexibleDelimited,
  parseExcelToMatrix,
  unfoldSingleColumnMatrix,
} from '@/lib/piperun/flexible-import';

export type SuphoImportAnswer = { question_id: string; value: number };

export type SuphoImportGroup = {
  groupKey: string;
  role: string;
  time_area: string | null;
  unit: string | null;
  answers: SuphoImportAnswer[];
};

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function normHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function getCell(row: Record<string, unknown>, aliases: string[]): string {
  const entries = Object.entries(row).map(([k, v]) => [normHeader(k), String(v ?? '').trim()] as const);
  const map = new Map(entries);
  for (const a of aliases) {
    const na = normHeader(a);
    const val = map.get(na);
    if (val !== undefined && val !== '') return val;
  }
  return '';
}

const RESPONDENT_ALIASES = [
  'respondent',
  'respondente',
  'role',
  'papel',
  'nome',
  'name',
  'respondente_nome',
  'email',
  'participant',
  'participante',
];
/** Só nomes inequívocos de coluna — evitar "question"/"pergunta" soltos (confundem cabeçalhos Google Forms). */
const QUESTION_ALIASES = [
  'question_id',
  'id_question',
  'pergunta_id',
  'id_pergunta',
  'id_da_pergunta',
  'qid',
];
const VALUE_ALIASES = ['value', 'valor', 'nota', 'score', 'pontuacao', 'pontuacao_likert', 'answer', 'resposta'];
const TIME_AREA_ALIASES = ['time_area', 'time', 'area', 'area_tempo'];
const UNIT_ALIASES = ['unit', 'unidade'];
const EXTERNAL_ALIASES = ['external_id', 'id_externo', 'grupo', 'group_id', 'respondent_key', 'chave'];

function stripCommentLines(raw: string): string {
  return raw
    .split(/\r?\n/)
    .filter((line) => {
      const t = line.trim();
      return t.length > 0 && !t.startsWith('#');
    })
    .join('\n');
}

function stripCommentRowsFromMatrix(rows: string[][]): string[][] {
  return rows.filter((r) => {
    const first = String(r[0] ?? '').trim();
    return first.length > 0 && !first.startsWith('#');
  });
}

/** Célula Likert 1–5 ou null se vazia/ inválida (aceita "4,0" / "4.0" de exportações). */
export function parseLikertCell(raw: unknown): number | null {
  const t = String(raw ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (Math.abs(n - rounded) > 1e-4) return null;
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
}

function columnLikertRatio(dataRows: string[][], colIdx: number): number {
  let ok = 0;
  let total = 0;
  for (const row of dataRows) {
    const cell = row[colIdx];
    if (cell === undefined) continue;
    const s = String(cell).trim();
    if (!s) continue;
    total += 1;
    if (parseLikertCell(s) !== null) ok += 1;
  }
  if (total === 0) return 0;
  return ok / total;
}

/** Cabeçalhos típicos de metadados (Google Forms / Luma) — não são colunas de pergunta. */
function isLikelyMetaHeader(header: string): boolean {
  const nh = normHeader(header);
  if (!nh) return false;
  const hints = [
    'carimbo',
    'timestamp',
    'datahora',
    'data_hora',
    'email',
    'e_mail',
    'endereco',
    'nome',
    'name',
    'sobrenome',
    'participant',
    'participante',
    'submission',
    'respondent',
    'telefone',
    'phone',
    'mobile',
    'celular',
    'cpf',
    'hora',
  ];
  for (const h of hints) {
    if (nh === h || nh.includes(h)) return true;
  }
  return false;
}

/** Remove colunas vazias à direita (Excel costuma alargar a grelha). */
function trimTrailingEmptyColumns(rows: string[][]): string[][] {
  if (rows.length === 0) return rows;
  let maxW = 0;
  for (const r of rows) {
    maxW = Math.max(maxW, r.length);
  }
  let last = -1;
  for (let c = maxW - 1; c >= 0; c--) {
    let any = false;
    for (const r of rows) {
      if (String(r[c] ?? '').trim() !== '') {
        any = true;
        break;
      }
    }
    if (any) {
      last = c;
      break;
    }
  }
  if (last < 0) return rows;
  return rows.map((r) => {
    const out = r.slice(0, last + 1);
    while (out.length < last + 1) out.push('');
    return out;
  });
}

/** True se existe coluna de ID de pergunta (formato longo). */
export function hasExplicitQuestionIdColumn(headers: string[]): boolean {
  const keys = new Set(headers.map((h) => normHeader(h)));
  for (const a of QUESTION_ALIASES) {
    if (keys.has(normHeader(a))) return true;
  }
  return false;
}

/**
 * Exportações Google/Luma: várias colunas, sem question_id — deve usar parseWideFormatMatrix, não o parser longo.
 */
export function shouldPreferWideFormat(rows: string[][]): boolean {
  const expanded = unfoldSingleColumnMatrix(rows);
  const data = stripCommentRowsFromMatrix(
    expanded.filter((r) => r.some((c) => String(c).trim() !== ''))
  );
  if (data.length < 2) return false;
  const headers = data[0]!.map((h) => String(h ?? '').trim());
  if (hasExplicitQuestionIdColumn(headers)) return false;
  const dataRows = data.slice(1);
  const firstQ = findFirstQuestionColumnIndex(headers, dataRows);
  return firstQ >= 0 && headers.length > firstQ;
}

/** Primeira coluna de notas (formato largo); vários limiares + fallback estilo Google (3 metadados). */
function findFirstQuestionColumnIndex(headers: string[], dataRows: string[][]): number {
  const w = headers.length;
  if (w === 0 || dataRows.length === 0) return -1;

  for (const minRatio of [0.55, 0.4, 0.28]) {
    for (let c = 0; c < w; c++) {
      if (columnLikertRatio(dataRows, c) >= minRatio) return c;
    }
  }

  let c = 0;
  while (c < w && isLikelyMetaHeader(headers[c] ?? '')) c += 1;
  if (c < w && columnLikertRatio(dataRows, c) >= 0.2) return c;

  if (w >= 4 && columnLikertRatio(dataRows, 3) >= 0.15) return 3;

  return -1;
}

function respondentFromWideMeta(
  row: string[],
  headers: string[],
  metaStart: number,
  metaEnd: number
): string {
  /** Preferir nome legível; e-mail fica em externalId para agrupamento. */
  for (let c = metaStart; c < metaEnd && c < headers.length; c++) {
    const nh = normHeader(headers[c] ?? '');
    if (
      nh.includes('nome') ||
      nh === 'name' ||
      nh.includes('participant') ||
      nh.includes('participante') ||
      nh.includes('respondent')
    ) {
      const v = String(row[c] ?? '').trim();
      if (v) return v;
    }
  }
  for (let c = metaStart; c < metaEnd && c < headers.length; c++) {
    const nh = normHeader(headers[c] ?? '');
    if (nh.includes('email') || nh === 'email' || nh.includes('e_mail')) {
      const v = String(row[c] ?? '').trim();
      if (v) return v;
    }
  }
  for (let c = metaStart; c < metaEnd && c < headers.length; c++) {
    const v = String(row[c] ?? '').trim();
    if (v) return v;
  }
  return '';
}

function externalIdFromWideMeta(
  row: string[],
  headers: string[],
  metaStart: number,
  metaEnd: number
): string {
  for (let c = metaStart; c < metaEnd && c < headers.length; c++) {
    const nh = normHeader(headers[c] ?? '');
    if (nh.includes('email') || nh === 'email' || nh.includes('e_mail')) {
      const v = String(row[c] ?? '').trim();
      if (v) return v;
    }
  }
  return '';
}

/**
 * Planilha “larga”: uma linha por respondente; colunas à esquerda = metadados (data, e-mail, nome);
 * colunas seguintes = notas 1–5 na mesma ordem das perguntas da campanha (UUIDs em `questionIdsOrdered`).
 */
export function parseWideFormatMatrix(
  rows: string[][],
  questionIdsOrdered: string[]
): { groups: SuphoImportGroup[]; errors: string[] } {
  const errors: string[] = [];
  const expanded = unfoldSingleColumnMatrix(rows);
  const data = stripCommentRowsFromMatrix(
    expanded.filter((r) => r.some((c) => String(c).trim() !== ''))
  );
  if (data.length < 2) {
    return { groups: [], errors: ['Arquivo precisa de cabeçalho e pelo menos uma linha de dados'] };
  }
  if (questionIdsOrdered.length === 0) {
    return { groups: [], errors: ['Campanha sem perguntas SUPHO para mapear colunas'] };
  }

  const rawHeaders = data[0]!.map((h) => String(h ?? '').trim());
  const rawRows = data.slice(1).map((row) => {
    const padded = (Array.isArray(row) ? [...row] : []).map((c) => String(c ?? ''));
    while (padded.length < rawHeaders.length) padded.push('');
    return padded;
  });
  const trimmed = trimTrailingEmptyColumns([rawHeaders, ...rawRows]);
  const headers = trimmed[0]!;
  const dataRows = trimmed.slice(1);

  const firstQ = findFirstQuestionColumnIndex(headers, dataRows);
  if (firstQ < 0) {
    return {
      groups: [],
      errors: [
        'Formato largo não reconhecido: não há colunas com notas 1–5. Use o formato longo (respondent, question_id, value) ou uma exportação tipo Google Forms.',
      ],
    };
  }

  const qCountFile = headers.length - firstQ;
  const nCampaign = questionIdsOrdered.length;
  /** Mais colunas no ficheiro que na campanha: ignora as extra. Menos: importa só as que existem (parcial). */
  const useCount = Math.min(qCountFile, nCampaign);
  const idsSlice = questionIdsOrdered.slice(0, useCount);

  if (useCount === 0) {
    return { groups: [], errors: ['Nenhuma coluna de pergunta após os metadados'] };
  }

  const groups: SuphoImportGroup[] = [];
  for (let r = 0; r < dataRows.length; r++) {
    const row = dataRows[r]!;
    const line = r + 2;
    let respondent = respondentFromWideMeta(row, headers, 0, firstQ);
    const ext = externalIdFromWideMeta(row, headers, 0, firstQ);
    if (!respondent) {
      respondent = ext.trim() ? ext : `Respondente (linha ${line})`;
    }
    const answers: SuphoImportAnswer[] = [];
    let rowOk = true;
    for (let i = 0; i < useCount; i++) {
      const col = firstQ + i;
      const rawCell = row[col];
      const likert = parseLikertCell(rawCell);
      if (likert === null) {
        if (String(rawCell ?? '').trim() === '') {
          continue;
        }
        errors.push(
          `Linha ${line}: coluna "${headers[col] ?? String(col)}" — valor deve ser inteiro de 1 a 5 (recebido: ${String(rawCell).slice(0, 40)})`
        );
        rowOk = false;
        break;
      }
      answers.push({ question_id: idsSlice[i]!, value: likert });
    }
    if (!rowOk) {
      continue;
    }
    if (answers.length === 0) {
      errors.push(`Linha ${line}: nenhuma nota 1–5 preenchida nas colunas de pergunta`);
      continue;
    }
    groups.push({
      groupKey: (ext || respondent).trim(),
      role: respondent,
      time_area: null,
      unit: null,
      answers,
    });
  }

  if (errors.length > 0) {
    return { groups: [], errors };
  }
  if (groups.length === 0) {
    return { groups: [], errors: ['Nenhuma linha válida no formato largo'] };
  }
  return { groups, errors: [] };
}

/** Matriz bruta (CSV/Excel) para tentar formato longo e largo. JSON → []. */
export function parseMatrixFromSuphoImportBuffer(buffer: Buffer, filename: string): string[][] {
  const name = filename.toLowerCase();
  if (isExcelFilename(name)) {
    const rows = parseExcelToMatrix(buffer);
    return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
  }
  const text = stripBom(decodeBufferToUtf8String(buffer));
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.includes('"campaign_id"')) {
    return [];
  }
  const withoutComments = stripCommentLines(text);
  if (!withoutComments.trim()) {
    return [];
  }
  return parseFlexibleDelimited(withoutComments);
}

/** IDs das perguntas da campanha na ordem do questionário (para formato largo). */
export async function getOrderedQuestionIdsForCampaign(
  admin: AdminDbClientType,
  campaign: { org_id: string; question_ids: string[] | null | undefined }
): Promise<string[]> {
  const orgId = campaign.org_id;
  const explicit = campaign.question_ids;
  if (Array.isArray(explicit) && explicit.length > 0) {
    return [...explicit];
  }
  const [rNull, rOrg] = await Promise.all([
    admin.from('supho_questions').select('id, sort_order').is('org_id', null).order('sort_order', { ascending: true }),
    admin.from('supho_questions').select('id, sort_order').eq('org_id', orgId).order('sort_order', { ascending: true }),
  ]);
  if (rNull.error) throw new Error(rNull.error.message);
  if (rOrg.error) throw new Error(rOrg.error.message);
  const byId = new Map<string, { id: string; sort_order: number | null }>();
  for (const row of (rNull.data ?? []) as Array<{ id: string; sort_order: number | null }>) {
    byId.set(row.id, row);
  }
  for (const row of (rOrg.data ?? []) as Array<{ id: string; sort_order: number | null }>) {
    byId.set(row.id, row);
  }
  return [...byId.values()]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((x) => x.id);
}

/** Cabeçalho na primeira linha; colunas com aliases (respondent, question_id, value, …). */
export function parseSuphoImportMatrix(rows: string[][]): { groups: SuphoImportGroup[]; errors: string[] } {
  const errors: string[] = [];
  const expanded = unfoldSingleColumnMatrix(rows);
  const data = stripCommentRowsFromMatrix(
    expanded.filter((r) => r.some((c) => String(c).trim() !== ''))
  );
  if (data.length < 2) {
    return { groups: [], errors: ['Arquivo precisa de cabeçalho e pelo menos uma linha de dados'] };
  }

  const headers = data[0]!.map((h) => String(h ?? '').trim());
  const records: Record<string, unknown>[] = data.slice(1).map((row) => {
    const o: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      if (h) o[h] = row[i] ?? '';
    });
    return o;
  });

  type Acc = {
    role: string;
    time_area: string | null;
    unit: string | null;
    answers: Map<string, number>;
  };
  const byGroup = new Map<string, Acc>();

  records.forEach((row, idx) => {
    const line = idx + 2;
    const respondent = getCell(row, RESPONDENT_ALIASES);
    const questionId = getCell(row, QUESTION_ALIASES);
    const valueRaw = getCell(row, VALUE_ALIASES);
    const externalId = getCell(row, EXTERNAL_ALIASES);
    const time_area = getCell(row, TIME_AREA_ALIASES) || null;
    const unit = getCell(row, UNIT_ALIASES) || null;

    if (!respondent) {
      errors.push(`Linha ${line}: coluna de respondente (respondent/role/nome) vazia`);
      return;
    }
    if (!questionId) {
      errors.push(
        `Linha ${line}: identificador da pergunta vazio (use coluna question_id, id_question, id_pergunta ou equivalente)`
      );
      return;
    }
    const value = Number(valueRaw.replace(',', '.'));
    if (!Number.isFinite(value) || value < 1 || value > 5 || !Number.isInteger(value)) {
      errors.push(`Linha ${line}: valor deve ser inteiro de 1 a 5 (recebido: ${valueRaw})`);
      return;
    }

    const groupKey = (externalId || respondent).trim();
    if (!groupKey) {
      errors.push(`Linha ${line}: chave de agrupamento vazia`);
      return;
    }

    if (!byGroup.has(groupKey)) {
      byGroup.set(groupKey, {
        role: respondent,
        time_area,
        unit,
        answers: new Map(),
      });
    } else {
      const acc = byGroup.get(groupKey)!;
      if (time_area && !acc.time_area) acc.time_area = time_area;
      if (unit && !acc.unit) acc.unit = unit;
    }

    byGroup.get(groupKey)!.answers.set(questionId, Math.round(value));
  });

  if (errors.length > 0) {
    return { groups: [], errors };
  }

  const groups: SuphoImportGroup[] = [];
  for (const [groupKey, acc] of byGroup) {
    const answers = [...acc.answers.entries()].map(([question_id, value]) => ({ question_id, value }));
    if (answers.length === 0) {
      errors.push(`Grupo "${groupKey}": sem respostas`);
      continue;
    }
    groups.push({
      groupKey,
      role: acc.role,
      time_area: acc.time_area,
      unit: acc.unit,
      answers,
    });
  }

  if (errors.length > 0) {
    return { groups: [], errors };
  }
  if (groups.length === 0) {
    return { groups: [], errors: ['Nenhum respondente válido nos dados importados'] };
  }

  return { groups, errors: [] };
}

export function parseSuphoImportCsv(csvBody: string): { groups: SuphoImportGroup[]; errors: string[] } {
  const raw = stripBom(csvBody);
  const withoutComments = stripCommentLines(raw);
  if (!withoutComments.trim()) {
    return { groups: [], errors: ['Arquivo vazio'] };
  }
  const rows = parseFlexibleDelimited(withoutComments);
  return parseSuphoImportMatrix(rows);
}

function isExcelFilename(name: string): boolean {
  const n = name.toLowerCase();
  return n.endsWith('.xlsx') || n.endsWith('.xls');
}

/**
 * Detecta JSON SUPHO ou planilha (texto com delimitador automático ou Excel).
 */
export function parseSuphoImportFromBuffer(
  buffer: Buffer,
  filename: string,
  options?: { mimeType?: string | null }
):
  | { ok: true; kind: 'json'; campaign_id: string; groups: SuphoImportGroup[] }
  | { ok: true; kind: 'tabular'; groups: SuphoImportGroup[] }
  | { ok: false; error: string } {
  const name = filename.toLowerCase();
  const mime = (options?.mimeType ?? '').toLowerCase();

  if (mime === 'application/json' || mime === 'text/json') {
    let json: unknown;
    try {
      json = JSON.parse(stripBom(buffer.toString('utf-8')));
    } catch {
      return { ok: false, error: 'JSON inválido' };
    }
    const parsed = parseSuphoImportJson(json);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    return { ok: true, kind: 'json', campaign_id: parsed.campaign_id, groups: parsed.groups };
  }

  if (name.endsWith('.json')) {
    let json: unknown;
    try {
      json = JSON.parse(stripBom(buffer.toString('utf-8')));
    } catch {
      return { ok: false, error: 'JSON inválido' };
    }
    const parsed = parseSuphoImportJson(json);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    return { ok: true, kind: 'json', campaign_id: parsed.campaign_id, groups: parsed.groups };
  }

  if (isExcelFilename(name)) {
    const matrix = parseMatrixFromSuphoImportBuffer(buffer, name);
    if (matrix.length === 0) {
      return { ok: false, error: 'Planilha vazia ou inválida' };
    }
    const parsed = parseSuphoImportMatrix(matrix);
    if (parsed.errors.length > 0) {
      return { ok: false, error: parsed.errors.slice(0, 8).join(' | ') };
    }
    return { ok: true, kind: 'tabular', groups: parsed.groups };
  }

  const text = stripBom(decodeBufferToUtf8String(buffer));
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.includes('"campaign_id"')) {
    try {
      const json = JSON.parse(text) as unknown;
      const parsed = parseSuphoImportJson(json);
      if (parsed.ok) {
        return { ok: true, kind: 'json', campaign_id: parsed.campaign_id, groups: parsed.groups };
      }
    } catch {
      /* segue como tabular */
    }
  }

  const matrix = parseMatrixFromSuphoImportBuffer(buffer, name);
  if (matrix.length === 0) {
    return { ok: false, error: 'Arquivo vazio' };
  }
  const parsed = parseSuphoImportMatrix(matrix);
  if (parsed.errors.length > 0) {
    return { ok: false, error: parsed.errors.slice(0, 8).join(' | ') };
  }
  return { ok: true, kind: 'tabular', groups: parsed.groups };
}

const jsonSchema = z.object({
  campaign_id: z.string().uuid(),
  responses: z
    .array(
      z.object({
        role: z.string().min(1),
        time_area: z.string().optional().nullable(),
        unit: z.string().optional().nullable(),
        external_id: z.string().optional().nullable(),
        answers: z
          .array(
            z.object({
              question_id: z.string().min(1),
              value: z.number().min(1).max(5),
            })
          )
          .min(1)
      })
    )
    .min(1),
});

export function parseSuphoImportJson(body: unknown):
  | { ok: true; campaign_id: string; groups: SuphoImportGroup[] }
  | { ok: false; error: string } {
  const parsed = jsonSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: 'JSON inválido: verifique campaign_id e responses[].role/answers' };
  }
  const { campaign_id, responses } = parsed.data;
  const groups: SuphoImportGroup[] = responses.map((r, i) => {
    const groupKey = (r.external_id?.trim() || r.role.trim() || `resp-${i}`).trim();
    const answers = r.answers.map((a) => ({
      question_id: a.question_id,
      value: Math.round(Number(a.value)),
    }));
    return {
      groupKey,
      role: r.role.trim(),
      time_area: r.time_area?.trim() ?? null,
      unit: r.unit?.trim() ?? null,
      answers,
    };
  });
  return { ok: true, campaign_id, groups };
}

/** Mesma regra que /api/forms/supho/respond: perguntas globais/org + restrição por campanha. */
export async function validateImportGroupsAgainstCampaign(
  admin: AdminDbClientType,
  campaign: { org_id: string; question_ids: string[] | null | undefined },
  groups: SuphoImportGroup[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const questionIds = [...new Set(groups.flatMap((g) => g.answers.map((a) => a.question_id)))];
  if (questionIds.length === 0) {
    return { ok: false, error: 'Nenhuma pergunta nas respostas' };
  }

  const [globalQuestions, orgQuestions] = await Promise.all([
    admin.from('supho_questions').select('id').in('id', questionIds).is('org_id', null),
    admin.from('supho_questions').select('id').in('id', questionIds).eq('org_id', campaign.org_id),
  ]);
  if (globalQuestions.error) {
    return { ok: false, error: globalQuestions.error.message };
  }
  if (orgQuestions.error) {
    return { ok: false, error: orgQuestions.error.message };
  }

  let validQuestionIds = new Set<string>();
  for (const row of (globalQuestions.data ?? []) as Array<{ id: string }>) validQuestionIds.add(row.id);
  for (const row of (orgQuestions.data ?? []) as Array<{ id: string }>) validQuestionIds.add(row.id);

  const campaignQuestionIds = campaign.question_ids;
  if (Array.isArray(campaignQuestionIds) && campaignQuestionIds.length > 0) {
    const allowedSet = new Set(campaignQuestionIds);
    validQuestionIds = new Set([...validQuestionIds].filter((id) => allowedSet.has(id)));
  }

  if (validQuestionIds.size !== questionIds.length) {
    return {
      ok: false,
      error:
        'Há perguntas desconhecidas, não permitidas para esta campanha ou fora do conjunto SUPHO da organização.',
    };
  }

  return { ok: true };
}

export async function persistSuphoImportGroups(
  admin: AdminDbClientType,
  campaignId: string,
  groups: SuphoImportGroup[]
): Promise<{ respondents: number; answerRows: number }> {
  let respondents = 0;
  let answerRows = 0;
  const now = new Date().toISOString();

  for (const g of groups) {
    const { data: respondent, error: respError } = await admin
      .from('supho_respondents')
      .insert({
        campaign_id: campaignId,
        role: g.role,
        time_area: g.time_area,
        unit: g.unit,
        responded_at: now,
      })
      .select('id')
      .single();

    if (respError || !respondent) {
      throw new Error(respError?.message ?? 'Falha ao criar respondente');
    }
    respondents += 1;

    const rows = g.answers.map((a) => ({
      respondent_id: (respondent as { id: string }).id,
      question_id: a.question_id,
      value: a.value,
    }));

    const { error: insertError } = await admin.from('supho_answers').upsert(rows, {
      onConflict: 'respondent_id,question_id',
      ignoreDuplicates: false,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }
    answerRows += rows.length;
  }

  return { respondents, answerRows };
}
