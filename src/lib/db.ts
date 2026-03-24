/**
 * Acesso ao PostgreSQL via DATABASE_URL.
 * Substitui o uso de Supabase client para dados; auth própria em auth-session.ts.
 */

import { Pool, type QueryResultRow } from 'pg';

const globalForDb = globalThis as unknown as { pool: Pool | undefined };

/** Mensagem alinhada ao cliente admin quando não há pool. */
export const DB_UNAVAILABLE_MESSAGE =
  'Base de dados não configurada ou indisponível. Defina DATABASE_URL (veja .env.example).';

export function getDatabaseUrlOrNull(): string | null {
  const url = process.env.DATABASE_URL ?? process.env.AI_DATABASE_URL;
  if (!url || !url.trim()) return null;
  return url.trim();
}

function getPoolConfigForUrl(connectionString: string): ConstructorParameters<typeof Pool>[0] {
  const config: ConstructorParameters<typeof Pool>[0] = {
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  };
  if (connectionString.includes('sslmode=require') || connectionString.includes('ssl=true')) {
    config.ssl = {
      rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true',
    };
  }
  return config;
}

/**
 * Pool compartilhado ou null se DATABASE_URL não existir (UI/API podem degradar sem lançar).
 */
export function getPoolOrNull(): Pool | null {
  const url = getDatabaseUrlOrNull();
  if (!url) return null;
  if (globalForDb.pool) return globalForDb.pool;
  const pool = new Pool(getPoolConfigForUrl(url));
  globalForDb.pool = pool;
  return pool;
}

/** Obrigatório para login/sessão: falha com mensagem clara se não houver URL. */
export function getPool(): Pool {
  const pool = getPoolOrNull();
  if (!pool) {
    throw new Error(
      'DATABASE_URL (ou AI_DATABASE_URL) não configurado. Defina em .env.local (veja .env.example).'
    );
  }
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
