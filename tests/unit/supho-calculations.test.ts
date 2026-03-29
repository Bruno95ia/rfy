import { describe, expect, it } from 'vitest';
import {
  computeITSMO,
  computeITSMOFromUnroundedPillars,
} from '@/lib/supho/calculations';

describe('ITSMO', () => {
  it('computeITSMOFromUnroundedPillars compõe a partir de pilares em precisão plena', () => {
    const rawIc = 50.444;
    const rawIh = 50.445;
    const rawIp = 50.446;
    const fromRaw = computeITSMOFromUnroundedPillars(rawIc, rawIh, rawIp);
    const ic = Math.round(rawIc * 100) / 100;
    const ih = Math.round(rawIh * 100) / 100;
    const ip = Math.round(rawIp * 100) / 100;
    const fromRounded = computeITSMO(ic, ih, ip);
    expect(fromRaw).not.toBe(fromRounded);
    expect(fromRaw).toBe(
      Math.round((rawIc * 0.4 + rawIh * 0.35 + rawIp * 0.25) * 100) / 100
    );
  });
});
