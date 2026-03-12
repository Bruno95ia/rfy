import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeNextRunAt } from './next-run';

describe('computeNextRunAt', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-02-24T14:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('daily: próximo run é amanhã se já passou do horário', () => {
    const next = computeNextRunAt('daily', null, null, 12, 0, 'America/Sao_Paulo');
    expect(next).toMatch(/2025-02-25T12:00:00/);
  });

  it('weekly: avança para o dia da semana correto', () => {
    const next = computeNextRunAt('weekly', 1, null, 12, 0, 'America/Sao_Paulo');
    const d = new Date(next);
    expect(d.getUTCDay()).toBe(1);
  });

  it('monthly: avança para o dia do mês', () => {
    const next = computeNextRunAt('monthly', null, 15, 12, 0, 'America/Sao_Paulo');
    const d = new Date(next);
    expect(d.getUTCDate()).toBe(15);
  });
});
