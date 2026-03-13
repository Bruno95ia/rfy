/**
 * Acesso ao PostgreSQL via DATABASE_URL.
 * Substitui o uso de Supabase client para dados; auth própria em auth-session.ts.
 */

import { Pool, type QueryResultRow } from 'pg';

const globalForDb = globalThis as unknown as { pool: Pool | undefined };

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? process.env.AI_DATABASE_URL;
  if (!url || !url.trim()) {
    throw new Error(
      'DATABASE_URL (ou AI_DATABASE_URL) não configurado. Defina em .env.local (veja .env.example).'
    );
  }
  return url.trim();
}

export function getPool(): Pool {
  if (globalForDb.pool) return globalForDb.pool;
  const pool = new Pool({
    connectionString: getDatabaseUrl(),
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  globalForDb.pool = pool;
  return pool;
}

export type QueryResult<T extends QueryResultRow = QueryResultRow> = {
  rows: T[];
  rowCount: number | null;
};

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const pool = getPool();
  const result = await pool.query<T>(sql, params);
  return { rows: result.rows, rowCount: result.rowCount };
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const { rows } = await query<T>(sql, params);
  return rows[0] ?? null;
}
