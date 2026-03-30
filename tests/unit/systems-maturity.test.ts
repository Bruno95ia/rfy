import { describe, expect, it } from 'vitest';
import { applyIpPenalty, applyIpPenaltyUnrounded } from '@/lib/supho/systems-maturity';

describe('applyIpPenaltyUnrounded', () => {
  it('aplica penalidade ao IP bruto (0–100) antes do arredondamento do pilar', () => {
    const rawIp = 50.444;
    const penalty = 6;
    const raw = applyIpPenaltyUnrounded(rawIp, penalty);
    expect(raw).toBeCloseTo(44.444, 5);
    const roundedFromRaw = applyIpPenalty(rawIp, penalty);
    expect(roundedFromRaw).toBe(Math.round(raw * 100) / 100);
  });

  it('penalidade sobre IP pilar já arredondado pode divergir do IP bruto (rota compute usa rawIp)', () => {
    const rawIpSurvey = 49.996;
    const ipPilarExibicao = Math.round(rawIpSurvey * 100) / 100;
    const penalty = 6;
    expect(ipPilarExibicao).toBe(50);
    expect(applyIpPenaltyUnrounded(rawIpSurvey, penalty)).not.toBe(
      applyIpPenaltyUnrounded(ipPilarExibicao, penalty)
    );
  });
});
