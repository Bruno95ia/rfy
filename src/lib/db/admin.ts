/**
 * Cliente de acesso ao PostgreSQL que emula a API do Supabase (from/select/eq/insert/update/upsert).
 * Usado no servidor; substitui createAdminClient() do Supabase.
 * Retorno sempre { data, error } (e opcionalmente count para select com count: 'exact', head: true).
 */

import { getPool } from '@/lib/db';
import type { QueryResultRow } from 'pg';

export type DbError = { message: string };

type SelectOpts = { count?: 'exact'; head?: boolean };

interface QueryBuilder<T = QueryResultRow> {
  select(columns?: string, opts?: SelectOpts): QueryBuilder<T>;
  eq(column: string, value: unknown): QueryBuilder<T>;
  gte(column: string, value: unknown): QueryBuilder<T>;
  in(column: string, values: unknown[]): QueryBuilder<T>;
  order(column: string, opts?: { ascending?: boolean }): QueryBuilder<T>;
  limit(n: number): QueryBuilder<T>;
  single(): Promise<{ data: T | null; error: DbError | null }>;
  maybeSingle(): Promise<{ data: T | null; error: DbError | null }>;
  then(
    resolve: (value: { data: T[] | null; error: DbError | null; count?: number }) => void
  ): void;
}

interface InsertBuilder<T = QueryResultRow> {
  select(columns?: string): InsertBuilder<T>;
  single(): Promise<{ data: T | null; error: DbError | null }>;
}

interface UpdateBuilder {
  eq(column: string, value: unknown): UpdateBuilder;
}

const allowedTableNames = new Set([
  'orgs', 'org_members', 'org_invites', 'org_config', 'org_subscriptions', 'org_audit_logs',
  'org_onboarding_steps', 'org_api_keys', 'org_unit_economics', 'uploads', 'opportunities',
  'activities', 'reports', 'plans', 'usage_limits', 'usage_events', 'alert_channels', 'alert_rules',
  'alert_events', 'alerts', 'outbound_webhooks', 'report_schedules', 'data_quality_runs',
  'forecast_scenarios', 'quarterly_goals', 'retention_cohorts', 'crm_integrations',
  'supho_campaigns', 'supho_questions', 'supho_answers', 'supho_diagnostic_results', 'supho_diagnostic_result_respondents',
  'supho_paip_plans', 'metrics_status', 'app_users', 'app_sessions', 'form_invites',
]);

function safeTable(table: string): string {
  if (!allowedTableNames.has(table)) {
    throw new Error(`Table not allowed: ${table}`);
  }
  return table;
}

function safeColumn(c: string): string {
  if (!/^[a-z0-9_]+$/i.test(c)) throw new Error(`Invalid column: ${c}`);
  return c;
}

export function createAdminClient(): AdminDbClient {
  return new AdminDbClient();
}

export interface StorageApi {
  from(bucket: string): {
    upload(path: string, body: Buffer | Blob, opts?: { contentType?: string; upsert?: boolean }): Promise<{ error: DbError | null }>;
    download(path: string): Promise<{ data: Blob | null; error: DbError | null }>;
  };
}

/** Tipo do cliente admin (compatível com uso anterior de SupabaseClient). */
export type AdminDbClientType = InstanceType<typeof AdminDbClient>;

/** Admin client: from(table) + storage (fallback filesystem quando UPLOAD_DIR está definido). */
export class AdminDbClient {
  private pool = getPool();

  from<T = QueryResultRow>(table: string): QueryBuilder<T> & {
    insert(row: Record<string, unknown>): InsertBuilder<T>;
    update(row: Record<string, unknown>): UpdateBuilder;
    upsert(row: Record<string, unknown>, opts?: { onConflict?: string; ignoreDuplicates?: boolean }): Promise<{ data: unknown; error: DbError | null }>;
    delete(): QueryBuilder<T>;
  } {
    const t = safeTable(table);
    let selectCols: string | null = null;
    let countOnly = false;
    let headOnly = false;
    const conditions: { type: 'eq' | 'gte' | 'in'; col: string; val: unknown }[] = [];
    let orderCol: string | null = null;
    let orderAsc = true;
    let limitVal: number | null = null;
    let isDelete = false;
    let updateRow: Record<string, unknown> | null = null;
    let insertRow: Record<string, unknown> | null = null;
    let upsertRow: Record<string, unknown> | null = null;
    let upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } | null = null;

    const runSelect = async (): Promise<{ data: T[] | null; error: DbError | null; count?: number }> => {
      if (countOnly && headOnly) {
        const cols = selectCols || '*';
        const sel = cols === '*' ? 'count(*)' : `count(${safeColumn(cols.split(',')[0].trim())})`;
        let sql = `SELECT ${sel}::int AS count FROM ${t}`;
        const params: unknown[] = [];
        let idx = 1;
        for (const c of conditions) {
          const prefix = params.length === 0 ? ' WHERE ' : ' AND ';
          if (c.type === 'eq') {
            sql += `${prefix}${safeColumn(c.col)} = $${idx}`;
            params.push(c.val);
            idx++;
          } else if (c.type === 'gte') {
            sql += `${prefix}${safeColumn(c.col)} >= $${idx}`;
            params.push(c.val);
            idx++;
          } else if (c.type === 'in') {
            sql += `${prefix}${safeColumn(c.col)} = ANY($${idx}::text[])`;
            params.push(Array.isArray(c.val) ? c.val : [c.val]);
            idx++;
          }
        }
        const r = await this.pool.query<{ count: number }>(sql, params);
        return { data: null, error: null, count: r.rows[0]?.count ?? 0 };
      }
      const cols = selectCols || '*';
      let sql = `SELECT ${cols} FROM ${t}`;
      const params: unknown[] = [];
      let idx = 1;
      for (const c of conditions) {
        const prefix = params.length === 0 ? ' WHERE ' : ' AND ';
        if (c.type === 'eq') {
          sql += `${prefix}${safeColumn(c.col)} = $${idx}`;
          params.push(c.val);
          idx++;
        } else if (c.type === 'gte') {
          sql += `${prefix}${safeColumn(c.col)} >= $${idx}`;
          params.push(c.val);
          idx++;
        } else if (c.type === 'in') {
          sql += `${prefix}${safeColumn(c.col)} = ANY($${idx}::text[])`;
          params.push(Array.isArray(c.val) ? c.val : [c.val]);
          idx++;
        }
      }
      if (orderCol) sql += ` ORDER BY ${safeColumn(orderCol)} ${orderAsc ? 'ASC' : 'DESC'}`;
      if (limitVal != null) sql += ` LIMIT ${Math.max(1, Math.min(limitVal, 1000))}`;
      const r = await this.pool.query<T>(sql, params);
      return { data: r.rows, error: null };
    };

    const runInsert = async (): Promise<{ data: T | T[] | null; error: DbError | null }> => {
      if (!insertRow) return { data: null, error: { message: 'No insert row' } };
      const keys = Object.keys(insertRow).map((k) => safeColumn(k));
      const cols = keys.join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map((k) => insertRow![k]);
      let sql = `INSERT INTO ${t} (${cols}) VALUES (${placeholders})`;
      if (selectCols) sql += ` RETURNING ${selectCols}`;
      try {
        const r = await this.pool.query<T>(sql, values);
        if (selectCols && r.rows[0]) return { data: r.rows[0], error: null };
        return { data: r.rows.length ? r.rows : null, error: null };
      } catch (e) {
        return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
      }
    };

    const runInsertMany = async (rows: Record<string, unknown>[]): Promise<{ data: T | T[] | null; error: DbError | null }> => {
      if (rows.length === 0) return { data: null, error: null };
      const keys = Object.keys(rows[0]).map((k) => safeColumn(k));
      const cols = keys.join(', ');
      const placeholders = rows.map((_, rowIdx) => keys.map((_, colIdx) => `$${rowIdx * keys.length + colIdx + 1}`).join(', ')).join('), (');
      const values = rows.flatMap((row) => keys.map((k) => row[k]));
      const sql = `INSERT INTO ${t} (${cols}) VALUES (${placeholders})`;
      try {
        await this.pool.query(sql, values);
        return { data: null, error: null };
      } catch (e) {
        return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
      }
    };

    const runUpdate = async (): Promise<{ data: unknown; error: DbError | null }> => {
      if (!updateRow) return { error: { message: 'No update row' } };
      const setKeys = Object.keys(updateRow).filter((k) => updateRow![k] !== undefined);
      if (setKeys.length === 0) return { error: null };
      const setClause = setKeys.map((k, i) => `${safeColumn(k)} = $${i + 1}`).join(', ');
      const params = setKeys.map((k) => updateRow![k]);
      let idx = params.length + 1;
      let sql = `UPDATE ${t} SET ${setClause}`;
      for (const c of conditions) {
        if (c.type === 'eq') {
          sql += (idx === params.length + 1 ? ' WHERE ' : ' AND ') + `${safeColumn(c.col)} = $${idx}`;
          params.push(c.val);
          idx++;
        }
      }
      try {
        await this.pool.query(sql, params);
        return { error: null };
      } catch (e) {
        return { error: { message: e instanceof Error ? e.message : String(e) } };
      }
    };

    const runUpsert = async (): Promise<{ data: unknown; error: DbError | null }> => {
      if (!upsertRow) return { error: { message: 'No upsert row' } };
      const keys = Object.keys(upsertRow).map((k) => safeColumn(k));
      const cols = keys.join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map((k) => upsertRow![k]);
      const conflictCols = upsertOpts?.onConflict ?? 'id';
      const conflictColList = conflictCols.split(',').map((c) => safeColumn(c.trim())).join(', ');
      const conflictSet = new Set(conflictCols.split(',').map((c) => c.trim()));
      const updateSet = keys.filter((k) => !conflictSet.has(k));
      const doUpdate = upsertOpts?.ignoreDuplicates
        ? 'DO NOTHING'
        : updateSet.length
          ? `DO UPDATE SET ${updateSet.map((c) => `${c} = EXCLUDED.${c}`).join(', ')}`
          : 'DO NOTHING';
      const sql = `INSERT INTO ${t} (${cols}) VALUES (${placeholders}) ON CONFLICT (${conflictColList}) ${doUpdate}`;
      try {
        await this.pool.query(sql, values);
        return { error: null };
      } catch (e) {
        return { error: { message: e instanceof Error ? e.message : String(e) } };
      }
    };

    const runUpsertMany = async (rows: Record<string, unknown>[]): Promise<{ data: unknown; error: DbError | null }> => {
      if (rows.length === 0) return { error: null };
      const keys = Object.keys(rows[0]).map((k) => safeColumn(k));
      const cols = keys.join(', ');
      const conflictCols = upsertOpts?.onConflict ?? 'id';
      const conflictColList = conflictCols.split(',').map((c) => safeColumn(c.trim())).join(', ');
      const conflictSet = new Set(conflictCols.split(',').map((c) => c.trim()));
      const updateSet = keys.filter((k) => !conflictSet.has(k));
      const doUpdate = upsertOpts?.ignoreDuplicates
        ? 'DO NOTHING'
        : updateSet.length
          ? `DO UPDATE SET ${updateSet.map((c) => `${c} = EXCLUDED.${c}`).join(', ')}`
          : 'DO NOTHING';
      const placeholders = rows.map((_, rowIdx) => keys.map((_, colIdx) => `$${rowIdx * keys.length + colIdx + 1}`).join(', ')).join('), (');
      const values = rows.flatMap((row) => keys.map((k) => row[k]));
      const sql = `INSERT INTO ${t} (${cols}) VALUES (${placeholders}) ON CONFLICT (${conflictColList}) ${doUpdate}`;
      try {
        await this.pool.query(sql, values);
        return { error: null };
      } catch (e) {
        return { error: { message: e instanceof Error ? e.message : String(e) } };
      }
    };

    const runDelete = async (): Promise<{ data: unknown; error: DbError | null }> => {
      let sql = `DELETE FROM ${t}`;
      const params: unknown[] = [];
      let idx = 1;
      for (const c of conditions) {
        sql += (params.length === 0 ? ' WHERE ' : ' AND ') + `${safeColumn(c.col)} = $${idx}`;
        params.push(c.val);
        idx++;
      }
      try {
        await this.pool.query(sql, params);
        return { error: null };
      } catch (e) {
        return { error: { message: e instanceof Error ? e.message : String(e) } };
      }
    };

    const builder: Record<string, unknown> = {
      select(columns?: string, opts?: SelectOpts) {
        selectCols = columns ?? '*';
        countOnly = opts?.count === 'exact';
        headOnly = opts?.head === true;
        return builder as QueryBuilder<T>;
      },
      eq(column: string, value: unknown) {
        conditions.push({ type: 'eq', col: column, val: value });
        return builder as QueryBuilder<T>;
      },
      gte(column: string, value: unknown) {
        conditions.push({ type: 'gte', col: column, val: value });
        return builder as QueryBuilder<T>;
      },
      in(column: string, values: unknown[]) {
        conditions.push({ type: 'in', col: column, val: values });
        return builder as QueryBuilder<T>;
      },
      order(column: string, opts?: { ascending?: boolean }) {
        orderCol = column;
        orderAsc = opts?.ascending !== false;
        return builder as QueryBuilder<T>;
      },
      limit(n: number) {
        limitVal = n;
        return builder as QueryBuilder<T>;
      },
      async single() {
        limitVal = 1;
        const res = await runSelect();
        if (res.error) return { data: null, error: res.error };
        const row = (res.data && res.data[0]) ?? null;
        return { data: row as T | null, error: null };
      },
      async maybeSingle() {
        limitVal = 2;
        const res = await runSelect();
        if (res.error) return { data: null, error: res.error };
        const row = (res.data && res.data[0]) ?? null;
        return { data: row as T | null, error: null };
      },
      then(resolve: (v: { data: T[] | null; error: DbError | null; count?: number }) => void) {
        runSelect().then(resolve);
      },
      insert(rowOrRows: Record<string, unknown> | Record<string, unknown>[]) {
        const isArray = Array.isArray(rowOrRows);
        insertRow = isArray ? (rowOrRows[0] ?? {}) : rowOrRows;
        const run = async (): Promise<{ data: T | T[] | null; error: DbError | null }> => {
          if (isArray && (rowOrRows as Record<string, unknown>[]).length > 1) {
            return runInsertMany(rowOrRows as Record<string, unknown>[]);
          }
          return runInsert();
        };
        const insertBuilder = {
          select(columns?: string) {
            selectCols = columns ?? null;
            return insertBuilder;
          },
          async single() {
            return run() as Promise<{ data: T | null; error: DbError | null }>;
          },
          then(resolve: (v: { data: T | T[] | null; error: DbError | null }) => void) {
            return run().then(resolve);
          },
        };
        return insertBuilder as InsertBuilder<T> & { then(resolve: (v: { data: T | T[] | null; error: DbError | null }) => void): Promise<void> };
      },
      update(row: Record<string, unknown>) {
        updateRow = row;
        const updateBuilder: UpdateBuilder & { then(resolve: (v: { error: DbError | null }) => void): Promise<void> } = {
          eq(column: string, value: unknown) {
            conditions.push({ type: 'eq', col: column, val: value });
            return updateBuilder;
          },
          then(resolve: (v: { error: DbError | null }) => void) {
            return runUpdate().then(resolve) as Promise<void>;
          },
        };
        return updateBuilder;
      },
      async upsert(
        rowOrRows: Record<string, unknown> | Record<string, unknown>[],
        opts?: { onConflict?: string; ignoreDuplicates?: boolean }
      ) {
        upsertRow = Array.isArray(rowOrRows) ? rowOrRows[0] ?? {} : rowOrRows;
        upsertOpts = opts ?? null;
        if (Array.isArray(rowOrRows) && rowOrRows.length > 1) return runUpsertMany(rowOrRows);
        return runUpsert();
      },
      delete() {
        isDelete = true;
        return Object.assign(builder, {
          async then(resolve: (v: { data: null; error: DbError | null }) => void) {
            resolve(await runDelete());
          },
        });
      },
    };

    return builder as ReturnType<AdminDbClient['from']>;
  }

  get storage(): StorageApi {
    return createStorageApi();
  }
}

function createStorageApi(): StorageApi {
  const uploadDir = process.env.UPLOAD_DIR?.trim();
  return {
    from(bucket: string) {
      return {
        async upload(
          path: string,
          body: Buffer | Blob,
          opts?: { contentType?: string; upsert?: boolean }
        ): Promise<{ error: DbError | null }> {
          if (bucket !== 'uploads') {
            return { error: { message: 'Storage bucket não suportado sem Supabase. Use UPLOAD_DIR para fallback local.' } };
          }
          if (!uploadDir) {
            return { error: { message: 'UPLOAD_DIR não configurado. Defina para salvar uploads em disco (ou use Supabase Storage).' } };
          }
          try {
            const fs = await import('node:fs/promises');
            const pathMod = await import('node:path');
            const fullPath = pathMod.join(uploadDir, path);
            await fs.mkdir(pathMod.dirname(fullPath), { recursive: true });
            const buf = body instanceof Buffer ? body : Buffer.from(await (body as Blob).arrayBuffer());
            await fs.writeFile(fullPath, buf);
            return { error: null };
          } catch (e) {
            return { error: { message: e instanceof Error ? e.message : String(e) } };
          }
        },
        async download(path: string): Promise<{ data: Blob | null; error: DbError | null }> {
          if (!uploadDir) {
            return { data: null, error: { message: 'UPLOAD_DIR não configurado' } };
          }
          try {
            const fs = await import('node:fs/promises');
            const pathMod = await import('node:path');
            const fullPath = pathMod.join(uploadDir, path);
            const buf = await fs.readFile(fullPath);
            return { data: new Blob([buf]), error: null };
          } catch (e) {
            return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
          }
        },
      };
    },
  };
}