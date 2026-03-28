import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/billing', () => ({
  appendAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/email/send', () => ({
  sendInviteEmail: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return {
    ...actual,
    getOrgMemberRole: vi.fn(),
    getOrgIdForUser: vi.fn(),
    userHasOrgAccess: vi.fn(),
  };
});

const { createClient } = await import('@/lib/supabase/server');
const { getOrgMemberRole, getOrgIdForUser, userHasOrgAccess } = await import('@/lib/auth');
const { POST: postInvite } = await import('@/app/api/org/invites/route');

const ORG = '30000000-0000-4000-8000-000000000001';
const ACTOR = '10000000-0000-4000-8000-000000000001';

describe('POST /api/org/invites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: async () => ({
          data: { user: { id: ACTOR, email: 'gestor@example.com' } },
        }),
      },
    } as Awaited<ReturnType<typeof createClient>>);
    vi.mocked(getOrgIdForUser).mockResolvedValue(ORG);
    vi.mocked(userHasOrgAccess).mockResolvedValue(true);
  });

  it('gestor não pode criar convite com papel administrador', async () => {
    vi.mocked(getOrgMemberRole).mockResolvedValue('manager');

    const req = new NextRequest('http://localhost/api/org/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'novo@empresa.com',
        role: 'admin',
        org_id: ORG,
      }),
    });

    const res = await postInvite(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(String(body.error)).toMatch(/proprietário ou administrador/);
  });
});
