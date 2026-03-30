import { describe, expect, it } from 'vitest';
import { fetchCampaignByCanonicalName } from '@/lib/supho/maturidade-campaign';

function mockClient(rows: unknown[]) {
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                order() {
                  return Promise.resolve({ data: rows, error: null });
                },
              };
            },
          };
        },
      };
    },
  };
}

describe('fetchCampaignByCanonicalName', () => {
  it('escolhe campanha com nome exato (ignora maiúsculas)', async () => {
    const supabase = mockClient([
      { id: 'a', name: 'Nova campanha', status: 'open', updated_at: '2026-01-01T00:00:00.000Z', uploads_context_updated_at: null },
      { id: 'b', name: 'Foodtest', status: 'open', updated_at: '2026-03-01T00:00:00.000Z', uploads_context_updated_at: null },
    ]);
    const row = await fetchCampaignByCanonicalName(supabase, 'org-1', 'foodtest');
    expect(row?.id).toBe('b');
    expect(row?.name).toBe('Foodtest');
  });

  it('não confunde com "Campanha FoodTest"', async () => {
    const supabase = mockClient([
      { id: 'x', name: 'Campanha FoodTest', status: 'open', updated_at: '2026-01-01T00:00:00.000Z', uploads_context_updated_at: null },
    ]);
    const row = await fetchCampaignByCanonicalName(supabase, 'org-1', 'foodtest');
    expect(row).toBeNull();
  });
});
