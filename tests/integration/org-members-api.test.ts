import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/billing', () => ({
  appendAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return {
    ...actual,
    requireApiUserOrgAccess: vi.fn(),
    getOrgMemberRole: vi.fn(),
  };
});

const { createAdminClient } = await import('@/lib/supabase/admin');
const { requireApiUserOrgAccess, getOrgMemberRole } = await import('@/lib/auth');
const { PATCH } = await import('@/app/api/org/members/route');

describe('PATCH /api/org/members', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const testOrgId = '30000000-0000-4000-8000-000000000001';
    vi.mocked(requireApiUserOrgAccess).mockResolvedValue({
      ok: true,
      user: { id: '10000000-0000-4000-8000-000000000001', email: 'actor@example.com' },
      orgId: testOrgId,
    });
    vi.mocked(createAdminClient).mockReturnValue({
      from() {
        return {
          update() {
            return {
              eq() {
                return {
                  eq: () => Promise.resolve({ error: null }),
                };
              },
            };
          },
        };
      },
    } as ReturnType<typeof createAdminClient>);
  });

  it('gestor não pode promover alguém a administrador', async () => {
    vi.mocked(getOrgMemberRole).mockImplementation(async (userId: string) => {
      if (userId === '10000000-0000-4000-8000-000000000001') return 'manager';
      if (userId === '20000000-0000-4000-8000-000000000001') return 'viewer';
      return null;
    });

    const req = new NextRequest(
      'http://localhost/api/org/members?org_id=30000000-0000-4000-8000-000000000001',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: '20000000-0000-4000-8000-000000000001',
          role: 'admin',
        }),
      }
    );

    const res = await PATCH(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(String(body.error)).toMatch(/Gestores só podem definir/);
  });

  it('gestor pode definir viewer ou manager para outro utilizador', async () => {
    vi.mocked(getOrgMemberRole).mockImplementation(async (userId: string) => {
      if (userId === '10000000-0000-4000-8000-000000000001') return 'manager';
      if (userId === '20000000-0000-4000-8000-000000000001') return 'viewer';
      return null;
    });

    const req = new NextRequest(
      'http://localhost/api/org/members?org_id=30000000-0000-4000-8000-000000000001',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: '20000000-0000-4000-8000-000000000001',
          role: 'manager',
        }),
      }
    );

    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, role: 'manager' });
  });
});
