import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, mockPool, poolState, DB_MSG } = vi.hoisted(() => {
  const queryMock = vi.fn();
  const mockPool = { query: queryMock };
  const poolState = { current: mockPool as { query: typeof queryMock } | null };
  const DB_MSG =
    'Base de dados não configurada ou indisponível. Defina DATABASE_URL (veja .env.example).';
  return { queryMock, mockPool, poolState, DB_MSG };
});

vi.mock('@/lib/db', () => ({
  getPool: () => mockPool,
  getPoolOrNull: () => poolState.current,
  DB_UNAVAILABLE_MESSAGE: DB_MSG,
}));

describe('AdminDbClient query builder', () => {
  beforeEach(() => {
    poolState.current = mockPool;
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
    const sql = queryMock.mock.calls[0][0] as string;
    expect(sql).toEqual(expect.stringContaining('id::text = ANY'));
    expect(sql).toEqual(expect.stringContaining('ORDER BY id ASC'));
    expect(queryMock.mock.calls[0][1]).toEqual([['campaign-1', 'campaign-2']]);
  });

  it('sem pool disponivel retorna erro e nao executa query', async () => {
    poolState.current = null;
    const { createAdminClient } = await import('@/lib/db/admin');
    const admin = createAdminClient();

    const res = await admin.from('orgs').select('id').limit(1);

    expect(queryMock).not.toHaveBeenCalled();
    expect(res.data).toBeNull();
    expect(res.error?.message).toBe(DB_MSG);
  });
});
