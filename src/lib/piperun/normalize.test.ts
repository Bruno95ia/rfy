import { describe, it, expect } from 'vitest';
import {
  mapStatusPipeRun,
  normalizeOpportunityRow,
  normalizeActivityRow,
} from './normalize';

describe('mapStatusPipeRun', () => {
  it('mapeia ganha -> won', () => {
    expect(mapStatusPipeRun('ganha')).toBe('won');
  });
  it('mapeia perdida -> lost', () => {
    expect(mapStatusPipeRun('perdida')).toBe('lost');
  });
  it('default open', () => {
    expect(mapStatusPipeRun('aberta')).toBe('open');
    expect(mapStatusPipeRun(null)).toBe('open');
    expect(mapStatusPipeRun('')).toBe('open');
  });
});

describe('normalizeOpportunityRow', () => {
  it('retorna null sem Hash', () => {
    const row = { Funil: 'X', Etapa: 'Y' };
    const headers = ['Funil', 'Etapa'];
    expect(normalizeOpportunityRow(row, headers)).toBeNull();
  });
  it('normaliza linha completa', () => {
    const row = {
      Hash: 'abc123',
      Funil: 'Vendas',
      Etapa: 'Proposta',
      'Dono da oportunidade': 'a@b.com',
      'Nome fantasia (Empresa)': 'Emp X',
      Titulo: 'Deal 1',
      'Valor de P&S': 'R$ 50.000,00',
      'Data de cadastro': '15/01/2025',
      Status: 'aberta',
    };
    const headers = Object.keys(row);
    const result = normalizeOpportunityRow(row, headers);
    expect(result).not.toBeNull();
    expect(result!.crm_hash).toBe('abc123');
    expect(result!.pipeline_name).toBe('Vendas');
    expect(result!.stage_name).toBe('Proposta');
    expect(result!.company_name).toBe('Emp X');
    expect(result!.value).toBe(50000);
    expect(result!.status).toBe('open');
  });
});

describe('normalizeActivityRow', () => {
  it('normaliza com ID', () => {
    const row = {
      ID: 'act1',
      Título: 'Call',
      'Concluído em': '01/02/2025 14:00:00',
      'Nome fantasia (Empresa)': 'Emp X',
    };
    const headers = Object.keys(row);
    const result = normalizeActivityRow(row, headers);
    expect(result).not.toBeNull();
    expect(result!.crm_activity_id).toBe('act1');
    expect(result!.title).toBe('Call');
    expect(result!.company_name).toBe('Emp X');
  });
});
