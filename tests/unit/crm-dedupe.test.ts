import { describe, expect, it } from 'vitest';
import { buildRecordDedupeKey, dedupeByExternalId } from '@/lib/crm/dedupe';

describe('crm dedupe', () => {
  it('monta chave de deduplicação por org + tipo + id externo', () => {
    const key = buildRecordDedupeKey('Org-1', 'Deal-123', 'opportunity');
    expect(key).toBe('org-1::opportunity::deal-123');
  });

  it('remove duplicados por id externo', () => {
    const input = [
      { external: 'A', value: 1 },
      { external: 'a', value: 2 },
      { external: 'B', value: 3 },
    ];

    const result = dedupeByExternalId('org-1', 'opportunity', input, (row) => row.external);

    expect(result.unique).toHaveLength(2);
    expect(result.duplicateCount).toBe(1);
    expect(result.unique[0]?.value).toBe(1);
    expect(result.unique[1]?.value).toBe(3);
  });
});
