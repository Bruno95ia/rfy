import { describe, expect, it } from 'vitest';
import {
  coerceIsoTimestamp,
  isUploadsContextNewerThanCompute,
} from '@/lib/supho/maturidade-campaign';

describe('coerceIsoTimestamp', () => {
  it('aceita Date', () => {
    const d = new Date('2026-06-01T12:00:00.000Z');
    expect(coerceIsoTimestamp(d)).toBe('2026-06-01T12:00:00.000Z');
  });

  it('aceita string ISO', () => {
    expect(coerceIsoTimestamp('2026-01-15T10:00:00.000Z')).toBe('2026-01-15T10:00:00.000Z');
  });

  it('retorna null para null', () => {
    expect(coerceIsoTimestamp(null)).toBeNull();
  });
});

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
