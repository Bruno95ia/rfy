import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryMock = vi.fn();

vi.mock('@/lib/db', () => ({
  getPool: () => ({
    query: queryMock,
  }),
}));

describe('AdminDbClient query builder', () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('usa AND entre multiplos filtros eq em update', async () => {
    const { createAdminClient } = await import('@/lib/db/admin');
    const admin = createAdminClient();

    await admin
      .from('org_members')
      .update({ role: 'owner' })
      .eq('org_id', 'org-1')
      .eq('user_id', 'user-1');

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][0]).toBe(
      'UPDATE org_members SET role = $1 WHERE org_id = $2 AND user_id = $3'
    );
    expect(queryMock.mock.calls[0][1]).toEqual(['owner', 'org-1', 'user-1']);
  });

  it('permite consultar tabelas SUPHO novas e usa cast texto em filtros IN', async () => {
    const { createAdminClient } = await import('@/lib/db/admin');
    const admin = createAdminClient();

    await admin
      .from('supho_diagnostic_campaigns')
      .select('id')
      .in('id', ['campaign-1', 'campaign-2'])
      .order('id', { ascending: true });

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][0]).toBe(
      'SELECT id FROM supho_diagnostic_campaigns WHERE id::text = ANY($1::text[]) ORDER BY id ASC'
    );
    expect(queryMock.mock.calls[0][1]).toEqual([['campaign-1', 'campaign-2']]);
  });
});
