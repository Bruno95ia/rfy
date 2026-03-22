/**
 * Importação em lote de respostas SUPHO coletadas fora da RFY (Typeform, Google Forms, etc.).
 * Formato CSV longo: uma linha por (respondente × pergunta).
 */
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import type { AdminDbClientType } from '@/lib/supabase/admin';

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

const RESPONDENT_ALIASES = ['respondent', 'respondente', 'role', 'papel', 'nome', 'name', 'respondente_nome'];
const QUESTION_ALIASES = ['question_id', 'pergunta_id', 'question', 'pergunta', 'id_pergunta', 'qid'];
const VALUE_ALIASES = ['value', 'valor', 'nota', 'score', 'pontuacao', 'pontuacao_likert'];
const TIME_AREA_ALIASES = ['time_area', 'time', 'area', 'area_tempo'];
const UNIT_ALIASES = ['unit', 'unidade'];
const EXTERNAL_ALIASES = ['external_id', 'id_externo', 'grupo', 'group_id', 'respondent_key', 'chave'];

export function parseSuphoImportCsv(csvBody: string): { groups: SuphoImportGroup[]; errors: string[] } {
  const errors: string[] = [];
  const raw = stripBom(csvBody);
  const withoutComments = raw
    .split(/\r?\n/)
    .filter((line) => {
      const t = line.trim();
      return t.length > 0 && !t.startsWith('#');
    })
    .join('\n');

  if (!withoutComments.trim()) {
    return { groups: [], errors: ['Arquivo CSV vazio'] };
  }

  let records: Record<string, unknown>[];
  try {
    records = parse(withoutComments, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as Record<string, unknown>[];
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { groups: [], errors: [`CSV inválido: ${msg}`] };
  }

  if (records.length === 0) {
    return { groups: [], errors: ['Nenhuma linha de dados no CSV'] };
  }

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
      errors.push(`Linha ${line}: question_id vazio`);
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
    return { groups: [], errors: ['Nenhum respondente válido no CSV'] };
  }

  return { groups, errors: [] };
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
