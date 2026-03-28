import { describe, it, expect } from 'vitest';
import {
  cleanPiperunLine,
  parseBRLMoney,
  parseBRDate,
  parseBRDateTime,
  parsePiperunCsv,
} from './csv';

describe('cleanPiperunLine', () => {
  it('trim espaços', () => {
    expect(cleanPiperunLine('  abc  ')).toBe('abc');
  });
  it('remove aspas externas', () => {
    expect(cleanPiperunLine('"abc"')).toBe('abc');
  });
  it('substitui "" por "', () => {
    expect(cleanPiperunLine('"a""b""c"')).toBe('a"b"c');
  });
  it('linha complexa', () => {
    expect(cleanPiperunLine('  "R$ 1""234"  ')).toBe('R$ 1"234');
  });
});

describe('parseBRLMoney', () => {
  it('parse valor simples', () => {
    expect(parseBRLMoney('R$ 10.423,80')).toBe(10423.8);
  });
  it('parse sem R$', () => {
    expect(parseBRLMoney('1.234,56')).toBe(1234.56);
  });
  it('retorna null para vazio', () => {
    expect(parseBRLMoney('')).toBeNull();
    expect(parseBRLMoney(null)).toBeNull();
    expect(parseBRLMoney('   ')).toBeNull();
  });
  it('retorna null para inválido', () => {
    expect(parseBRLMoney('abc')).toBeNull();
  });
});

describe('parseBRDate', () => {
  it('parse DD/MM/YYYY', () => {
    expect(parseBRDate('08/01/2021')).toBe('2021-01-08');
  });
  it('retorna null para vazio', () => {
    expect(parseBRDate('')).toBeNull();
    expect(parseBRDate(null)).toBeNull();
  });
  it('retorna null para formato inválido', () => {
    expect(parseBRDate('2021-01-08')).toBeNull();
  });
});

describe('parseBRDateTime', () => {
  it('parse datetime completo', () => {
    expect(parseBRDateTime('08/01/2021 14:00:00')).toBe('2021-01-08T14:00:00Z');
  });
  it('sem hora: usa a data e normaliza para meio-dia UTC (compatível com parseDateFlexible)', () => {
    expect(parseBRDateTime('08/01/2021')).toBe('2021-01-08T12:00:00Z');
  });
});

describe('parsePiperunCsv', () => {
  it('retorna array vazio para conteúdo vazio', () => {
    expect(parsePiperunCsv('')).toEqual([]);
    expect(parsePiperunCsv('   \n  \n')).toEqual([]);
  });
  it('parse CSV simples com ;', () => {
    const result = parsePiperunCsv('A;B;C\n1;2;3');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(['A', 'B', 'C']);
    expect(result[1]).toEqual(['1', '2', '3']);
  });
  it('parse CSV com valores entre aspas', () => {
    const result = parsePiperunCsv('Hash;Empresa\nabc;Emp X');
    expect(result[0]).toEqual(['Hash', 'Empresa']);
    expect(result[1]).toEqual(['abc', 'Emp X']);
  });
});
