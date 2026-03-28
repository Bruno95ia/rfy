import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/lib/supabase/admin';
import { getOrgIdForUser } from '@/lib/auth';

function mockOrgMembersResponse(rows: { org_id: string; role: string | null }[]) {
  vi.mocked(createAdminClient).mockReturnValue({
    from(table: string) {
      expect(table).toBe('org_members');
      return {
        select() {
          return {
            eq(_col: string, _val: string) {
              return Promise.resolve({
                data: rows,
                error: null,
              });
            },
          };
        },
      };
    },
  } as ReturnType<typeof createAdminClient>);
}

describe('getOrgIdForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna null quando não há membros', async () => {
    mockOrgMembersResponse([]);
    await expect(getOrgIdForUser('user-1')).resolves.toBeNull();
  });

  it('prefere organização em que o papel é mais elevado (owner > admin > manager > viewer)', async () => {
    mockOrgMembersResponse([
      { org_id: '11111111-1111-1111-1111-111111111111', role: 'viewer' },
      { org_id: '22222222-2222-2222-2222-222222222222', role: 'admin' },
      { org_id: '33333333-3333-3333-3333-333333333333', role: 'manager' },
    ]);
    await expect(getOrgIdForUser('user-1')).resolves.toBe('22222222-2222-2222-2222-222222222222');
  });

  it('com mesmo peso de papel, desempata por org_id (ordem lexical)', async () => {
    mockOrgMembersResponse([
      { org_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', role: 'manager' },
      { org_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', role: 'manager' },
    ]);
    await expect(getOrgIdForUser('user-1')).resolves.toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  });

  it('trata role ausente como viewer', async () => {
    mockOrgMembersResponse([{ org_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', role: null }]);
    await expect(getOrgIdForUser('user-1')).resolves.toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  });
});
