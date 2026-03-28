import { describe, expect, it } from 'vitest';
import { METRICS_DEFINITION_VERSION } from '@/lib/metrics/definitions';

describe('METRICS_DEFINITION_VERSION', () => {
  it('is semver aligned with DB default and migration 020', () => {
    expect(METRICS_DEFINITION_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(METRICS_DEFINITION_VERSION).toBe('1.0.0');
  });
});
