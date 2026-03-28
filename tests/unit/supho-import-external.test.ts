import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  parseSuphoImportCsv,
  parseSuphoImportFromBuffer,
  parseSuphoImportMatrix,
} from '@/lib/supho/import-external-responses';

describe('parseSuphoImportCsv', () => {
  const qid = '550e8400-e29b-41d4-a716-446655440000';

  it('aceita cabeçalho id_question (exportações comuns)', () => {
    const csv = `respondent;id_question;value\nMaria;${qid};4\n`;
    const { groups, errors } = parseSuphoImportCsv(csv);
    expect(errors).toEqual([]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.answers).toEqual([{ question_id: qid, value: 4 }]);
  });

  it('continua aceitando question_id', () => {
    const csv = `respondent,question_id,value\nJoão,${qid},5\n`;
    const { groups, errors } = parseSuphoImportCsv(csv);
    expect(errors).toEqual([]);
    expect(groups[0]!.answers[0]).toEqual({ question_id: qid, value: 5 });
  });
});

describe('parseSuphoImportMatrix (Excel coluna A)', () => {
  const qid = '550e8400-e29b-41d4-a716-446655440000';

  it('desdobra quando cada linha lógica do CSV está numa única célula (modelo RFY aberto no Excel)', () => {
    const matrix = [[`respondent,question_id,value`], [`Maria,${qid},4`]];
    const { groups, errors } = parseSuphoImportMatrix(matrix);
    expect(errors).toEqual([]);
    expect(groups[0]!.answers).toEqual([{ question_id: qid, value: 4 }]);
  });

  it('desdobra coluna A mesmo com células B/C vazias (Excel alarga a grelha)', () => {
    const matrix = [
      ['respondent,question_id,value', ''],
      [`Maria,${qid},4`, ''],
    ];
    const { groups, errors } = parseSuphoImportMatrix(matrix);
    expect(errors).toEqual([]);
    expect(groups[0]!.answers[0]).toEqual({ question_id: qid, value: 4 });
  });

  it('ignora linhas # comentário entre cabeçalho e dados (como no modelo baixado)', () => {
    const matrix = [
      [`respondent,question_id,value`],
      ['# Uma linha por resposta. external_id opcional.'],
      ['# question_id = UUID (veja /api/supho/questions). value = 1 a 5.'],
      [`Thiago,${qid},5`],
    ];
    const { groups, errors } = parseSuphoImportMatrix(matrix);
    expect(errors).toEqual([]);
    expect(groups[0]!.answers[0]).toEqual({ question_id: qid, value: 5 });
  });
});

describe('parseSuphoImportFromBuffer (.xlsx real)', () => {
  const qid = '550e8400-e29b-41d4-a716-446655440000';

  it('importa .xlsx com CSV lógico na coluna A (fluxo igual ao upload)', () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['respondent,question_id,value'],
      [`Maria,${qid},4`],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Respostas');
    const buf = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer);

    const r = parseSuphoImportFromBuffer(buf, 'Diagnostico.xlsx');
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error(r.error);
    expect(r.kind).toBe('tabular');
    expect(r.groups[0]!.answers[0]).toEqual({ question_id: qid, value: 4 });
  });

  it('importa CSV em UTF-16 LE (Excel “CSV Unicode”)', () => {
    const csv = `respondent,question_id,value\nMaria,${qid},4\n`;
    const body = Buffer.from(csv, 'utf16le');
    const buf = Buffer.concat([Buffer.from([0xff, 0xfe]), body]);
    const r = parseSuphoImportFromBuffer(buf, 'export.csv');
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error(r.error);
    expect(r.groups[0]!.answers[0]).toEqual({ question_id: qid, value: 4 });
  });
});
