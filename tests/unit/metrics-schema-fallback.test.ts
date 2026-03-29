import { describe, expect, it } from 'vitest';
import { isMissingMetricsDefinitionColumnError } from '@/lib/metrics/schema-fallback';

describe('isMissingMetricsDefinitionColumnError', () => {
  it('detecta coluna inexistente (Postgres)', () => {
    expect(
      isMissingMetricsDefinitionColumnError(
        'column "metrics_definition_version" of relation "reports" does not exist'
      )
    ).toBe(true);
    expect(isMissingMetricsDefinitionColumnError('42703: undefined_column')).toBe(true);
  });

  it('ignora outros erros', () => {
    expect(isMissingMetricsDefinitionColumnError('connection refused')).toBe(false);
    expect(isMissingMetricsDefinitionColumnError(undefined)).toBe(false);
  });
});
