import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/lib/supabase/admin';
import { getOrgMemberRole, userHasMinimumOrgRole } from '@/lib/auth';

function mockOrgMemberRow(data: { role?: string | null } | null, error?: { message: string } | null) {
  vi.mocked(createAdminClient).mockReturnValue({
    from(table: string) {
      expect(table).toBe('org_members');
      return {
        select() {
          return {
            eq() {
              return {
                eq() {
                  return {
                    maybeSingle: () => Promise.resolve({ data, error: error ?? null }),
                  };
                },
              };
            },
          };
        },
      };
    },
  } as ReturnType<typeof createAdminClient>);
}

describe('getOrgMemberRole — fallback quando role ausente na linha', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna null quando não existe linha de membro', async () => {
    mockOrgMemberRow(null);
    await expect(getOrgMemberRole('u1', 'o1')).resolves.toBeNull();
  });

  it('retorna viewer quando a linha existe mas role é null', async () => {
    mockOrgMemberRow({ role: null });
    await expect(getOrgMemberRole('u1', 'o1')).resolves.toBe('viewer');
  });

  it('retorna viewer quando role é string inválida', async () => {
    mockOrgMemberRow({ role: 'unknown_role' });
    await expect(getOrgMemberRole('u1', 'o1')).resolves.toBe('viewer');
  });

  it('userHasMinimumOrgRole é false para viewer quando mínimo é manager', async () => {
    mockOrgMemberRow({ role: null });
    await expect(userHasMinimumOrgRole('u1', 'o1', 'manager')).resolves.toBe(false);
  });

  it('userHasMinimumOrgRole é true para viewer quando mínimo é viewer', async () => {
    mockOrgMemberRow({ role: null });
    await expect(userHasMinimumOrgRole('u1', 'o1', 'viewer')).resolves.toBe(true);
  });
});
