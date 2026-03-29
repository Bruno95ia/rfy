import { describe, expect, it } from 'vitest';
import { isUploadsContextNewerThanCompute } from '@/lib/supho/maturidade-campaign';

describe('isUploadsContextNewerThanCompute', () => {
  it('retorna false quando não há data de uploads', () => {
    expect(isUploadsContextNewerThanCompute(null, '2026-01-01T12:00:00.000Z')).toBe(false);
    expect(isUploadsContextNewerThanCompute('', '2026-01-01T12:00:00.000Z')).toBe(false);
  });

  it('retorna true quando a síntese de uploads é posterior ao cálculo', () => {
    expect(
      isUploadsContextNewerThanCompute('2026-03-02T10:00:00.000Z', '2026-03-01T10:00:00.000Z')
    ).toBe(true);
  });

  it('retorna false quando o cálculo é igual ou posterior à síntese', () => {
    expect(
      isUploadsContextNewerThanCompute('2026-03-01T10:00:00.000Z', '2026-03-01T10:00:00.000Z')
    ).toBe(false);
    expect(
      isUploadsContextNewerThanCompute('2026-03-01T10:00:00.000Z', '2026-03-02T10:00:00.000Z')
    ).toBe(false);
  });
});
