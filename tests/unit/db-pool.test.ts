import { beforeEach, describe, expect, it, vi } from 'vitest';

const poolInstances: object[] = [];

vi.mock('pg', () => ({
  Pool: vi.fn(function MockPool() {
    const instance = {
      query: vi.fn(),
    };
    poolInstances.push(instance);
    return instance;
  }),
}));

describe('getPool', () => {
  beforeEach(() => {
    poolInstances.length = 0;
    delete (globalThis as { pool?: unknown }).pool;
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/postgres';
  });

  it('reutiliza o mesmo pool mesmo em ambiente de produção', async () => {
    process.env.NODE_ENV = 'production';
    const { getPool } = await import('@/lib/db');

    const poolA = getPool();
    const poolB = getPool();

    expect(poolA).toBe(poolB);
    expect(poolInstances).toHaveLength(1);
  });
});
