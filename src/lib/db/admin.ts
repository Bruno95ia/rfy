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
  ilike(column: string, value: string): QueryBuilder<T>;
  is(column: string, value: null): QueryBuilder<T>;
  not(column: string, op: 'is', value: null): QueryBuilder<T>;
  order(column: string, opts?: { ascending?: boolean }): QueryBuilder<T>;
  limit(n: number): QueryBuilder<T>;
  offset(n: number): QueryBuilder<T>;
  range(from: number, to: number): QueryBuilder<T>;
  single(): Promise<{ data: T | null; error: DbError | null }>;
  maybeSingle(): Promise<{ data: T | null; error: DbError | null }>;
  then(
    resolve: (value: { data: T[] | null; error: DbError | null; count?: number }) => void
  ): void;
}

interface InsertBuilder<T = QueryResultRow> {
  select(columns?: string): InsertBuilder<T>;
  single(): Promise<{ data: T | null; error: DbError | null }>;
  then(resolve?: (value: { data: T | T[] | null; error: DbError | null }) => unknown): Promise<{ data: T | T[] | null; error: DbError | null }>;
}

interface UpdateBuilder<T = QueryResultRow> {
  eq(column: string, value: unknown): UpdateBuilder<T>;
  is(column: string, value: null): UpdateBuilder<T>;
  select(columns: string): UpdateBuilder<T>;
  single(): Promise<{ data: T | null; error: DbError | null }>;
  maybeSingle(): Promise<{ data: T | null; error: DbError | null }>;
}

const allowedTableNames = new Set([
  'orgs', 'org_members', 'org_invites', 'org_config', 'org_subscriptions', 'org_audit_logs',
  'org_onboarding_steps', 'org_api_keys', 'org_unit_economics', 'uploads', 'opportunities',
  'activities', 'reports', 'plans', 'usage_limits', 'usage_events', 'alert_channels', 'alert_rules',
  'alert_events', 'alerts', 'outbound_webhooks', 'report_schedules', 'data_quality_runs',
  'forecast_scenarios', 'quarterly_goals', 'retention_cohorts', 'crm_integrations',
  'supho_campaigns', 'supho_diagnostic_campaigns', 'supho_questions', 'supho_respondents',
  'supho_answers', 'supho_diagnostic_results', 'supho_diagnostic_result_respondents',
  'supho_paip_plans', 'metrics_status', 'app_users', 'app_sessions', 'form_invites',
  'org_icp_studies',
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

  from<T extends QueryResultRow = QueryResultRow>(table: string): QueryBuilder<T> & {
    insert(row: Record<string, unknown> | object | object[]): InsertBuilder<T>;
    update(row: Record<string, unknown>): UpdateBuilder<T>;
    upsert(row: Record<string, unknown> | object | object[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }): Promise<{ data: unknown; error: DbError | null }>;
    delete(): QueryBuilder<T>;
  } {
    const t = safeTable(table);
    let selectCols: string | null = null;
    let countOnly = false;
    let headOnly = false;
    const conditions: { type: 'eq' | 'gte' | 'in' | 'ilike' | 'is' | 'not'; col: string; val: unknown }[] = [];
    let orderCol: string | null = null;
    let orderAsc = true;
    let limitVal: number | null = null;
    let offsetVal: number | null = null;
    let isDelete = false;
    let updateRow: Record<string, unknown> | null = null;
    let insertRow: Record<string, unknown> | null = null;
    let upsertRow: Record<string, unknown> | null = null;
    let upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } | null = null;
    let updateReturningCols: string | null = null;

    const appendCondition = (
      sql: string,
      params: unknown[],
      nextIndex: number,
      hasWhere: boolean,
      condition: { type: 'eq' | 'gte' | 'in' | 'ilike' | 'is' | 'not'; col: string; val: unknown }
    ): { sql: string; params: unknown[]; nextIndex: number; hasWhere: boolean } => {
      const prefix = hasWhere ? ' AND ' : ' WHERE ';
      if (condition.type === 'eq') {
        return {
          sql: sql + `${prefix}${safeColumn(condition.col)} = $${nextIndex}`,
          params: [...params, condition.val],
          nextIndex: nextIndex + 1,
          hasWhere: true,
        };
      }
      if (condition.type === 'gte') {
        return {
          sql: sql + `${prefix}${safeColumn(condition.col)} >= $${nextIndex}`,
          params: [...params, condition.val],
          nextIndex: nextIndex + 1,
          hasWhere: true,
        };
      }
      if (condition.type === 'in') {
        return {
          sql: sql + `${prefix}${safeColumn(condition.col)}::text = ANY($${nextIndex}::text[])`,
          params: [...params, Array.isArray(condition.val) ? condition.val : [condition.val]],
          nextIndex: nextIndex + 1,
          hasWhere: true,
        };
      }
      if (condition.type === 'ilike') {
        return {
          sql: sql + `${prefix}${safeColumn(condition.col)} ILIKE $${nextIndex}`,
          params: [...params, condition.val],
          nextIndex: nextIndex + 1,
          hasWhere: true,
        };
      }
      if (condition.type === 'is' && condition.val === null) {
        return {
          sql: sql + `${prefix}${safeColumn(condition.col)} IS NULL`,
          params,
          nextIndex,
          hasWhere: true,
        };
      }
      if (condition.type === 'not' && condition.val === null) {
        return {
          sql: sql + `${prefix}${safeColumn(condition.col)} IS NOT NULL`,
          params,
          nextIndex,
          hasWhere: true,
        };
      }
      return { sql, params, nextIndex, hasWhere };
    };

    const runSelect = async (): Promise<{ data: T[] | null; error: DbError | null; count?: number }> => {
      if (countOnly && headOnly) {
        const cols = selectCols || '*';
        const sel = cols === '*' ? 'count(*)' : `count(${safeColumn(cols.split(',')[0].trim())})`;
        let sql = `SELECT ${sel}::int AS count FROM ${t}`;
        let params: unknown[] = [];
        let idx = 1;
        let hasWhere = false;
        for (const c of conditions) {
          ({ sql, params, nextIndex: idx, hasWhere } = appendCondition(
            sql,
            params,
            idx,
            hasWhere,
            c
          ));
        }
        const r = await this.pool.query<{ count: number }>(sql, params);
        return { data: null, error: null, count: r.rows[0]?.count ?? 0 };
      }
      const cols = selectCols || '*';
      let sql = `SELECT ${cols} FROM ${t}`;
      let params: unknown[] = [];
      let idx = 1;
      let hasWhere = false;
      for (const c of conditions) {
        ({ sql, params, nextIndex: idx, hasWhere } = appendCondition(
          sql,
          params,
          idx,
          hasWhere,
          c
        ));
      }
      if (orderCol) sql += ` ORDER BY ${safeColumn(orderCol)} ${orderAsc ? 'ASC' : 'DESC'}`;
      if (limitVal != null) sql += ` LIMIT ${Math.max(1, Math.min(limitVal, 1000))}`;
      if (offsetVal != null) sql += ` OFFSET ${Math.max(0, offsetVal)}`;
      const r = await this.pool.query(sql, params);
      const rows = r.rows as T[];
      let count: number | undefined;
      if (countOnly) {
        let countSql = `SELECT count(*)::int AS c FROM ${t}`;
        let countParams: unknown[] = [];
        let ci = 1;
        let countHasWhere = false;
        for (const c of conditions) {
          ({ sql: countSql, params: countParams, nextIndex: ci, hasWhere: countHasWhere } = appendCondition(
            countSql,
            countParams,
            ci,
            countHasWhere,
            c
          ));
        }
        const cr = await this.pool.query<{ c: number }>(countSql, countParams);
        count = cr.rows[0]?.c ?? 0;
      }
      return { data: rows, error: null, count };
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
        const r = await this.pool.query(sql, values);
        const outRows = r.rows as T[];
        if (selectCols && outRows[0]) return { data: outRows[0], error: null };
        return { data: outRows.length ? outRows : null, error: null };
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

    const runUpdate = async (): Promise<{ data: T | null; error: DbError | null }> => {
      if (!updateRow) return { data: null, error: { message: 'No update row' } };
      const setKeys = Object.keys(updateRow).filter((k) => updateRow![k] !== undefined);
      if (setKeys.length === 0) return { data: null, error: null };
      const setClause = setKeys.map((k, i) => `${safeColumn(k)} = $${i + 1}`).join(', ');
      let params = setKeys.map((k) => updateRow![k]);
      let idx = params.length + 1;
      let sql = `UPDATE ${t} SET ${setClause}`;
      let hasWhere = false;
      for (const c of conditions) {
        ({ sql, params, nextIndex: idx, hasWhere } = appendCondition(
          sql,
          params,
          idx,
          hasWhere,
          c
        ));
      }
      if (updateReturningCols) {
        sql += ` RETURNING ${updateReturningCols}`;
      }
      try {
        const r = await this.pool.query(sql, params);
        const row = updateReturningCols && r.rows[0] ? (r.rows[0] as T) : null;
        return { data: row, error: null };
      } catch (e) {
        return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
      }
    };

    const runUpsert = async (): Promise<{ data: null; error: DbError | null }> => {
      if (!upsertRow) return { data: null, error: { message: 'No upsert row' } };
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
        return { data: null, error: null };
      } catch (e) {
        return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
      }
    };

    const runUpsertMany = async (rows: Record<string, unknown>[]): Promise<{ data: null; error: DbError | null }> => {
      if (rows.length === 0) return { data: null, error: null };
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
        return { data: null, error: null };
      } catch (e) {
        return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
      }
    };

    const runDelete = async (): Promise<{ data: null; error: DbError | null }> => {
      let sql = `DELETE FROM ${t}`;
      let params: unknown[] = [];
      let idx = 1;
      let hasWhere = false;
      for (const c of conditions) {
        ({ sql, params, nextIndex: idx, hasWhere } = appendCondition(
          sql,
          params,
          idx,
          hasWhere,
          c
        ));
      }
      try {
        await this.pool.query(sql, params);
        return { data: null, error: null };
      } catch (e) {
        return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
      }
    };

    const builder: Record<string, unknown> = {
      select(columns?: string, opts?: SelectOpts) {
        selectCols = columns ?? '*';
        countOnly = opts?.count === 'exact';
        headOnly = opts?.head === true;
        return builder as unknown as QueryBuilder<T>;
      },
      eq(column: string, value: unknown) {
        conditions.push({ type: 'eq', col: column, val: value });
        return builder as unknown as QueryBuilder<T>;
      },
      gte(column: string, value: unknown) {
        conditions.push({ type: 'gte', col: column, val: value });
        return builder as unknown as QueryBuilder<T>;
      },
      in(column: string, values: unknown[]) {
        conditions.push({ type: 'in', col: column, val: values });
        return builder as unknown as QueryBuilder<T>;
      },
      ilike(column: string, value: string) {
        conditions.push({ type: 'ilike', col: column, val: value });
        return builder as unknown as QueryBuilder<T>;
      },
      is(column: string, value: null) {
        conditions.push({ type: 'is', col: column, val: null });
        return builder as unknown as QueryBuilder<T>;
      },
      not(column: string, _op: 'is', value: null) {
        conditions.push({ type: 'not', col: column, val: value });
        return builder as unknown as QueryBuilder<T>;
      },
      order(column: string, opts?: { ascending?: boolean }) {
        orderCol = column;
        orderAsc = opts?.ascending !== false;
        return builder as unknown as QueryBuilder<T>;
      },
      limit(n: number) {
        limitVal = n;
        return builder as unknown as QueryBuilder<T>;
      },
      offset(n: number) {
        offsetVal = n;
        return builder as unknown as QueryBuilder<T>;
      },
      range(from: number, to: number) {
        offsetVal = Math.max(0, from);
        limitVal = Math.max(1, Math.min(to - from + 1, 1000));
        return builder as unknown as QueryBuilder<T>;
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
      insert(rowOrRows: Record<string, unknown> | object | object[]) {
        const isArray = Array.isArray(rowOrRows);
        const raw = isArray ? (rowOrRows as object[]) : [rowOrRows as object];
        insertRow = isArray ? (raw[0] ?? {}) as Record<string, unknown> : (rowOrRows as Record<string, unknown>);
        const run = async (): Promise<{ data: T | T[] | null; error: DbError | null }> => {
          if (isArray && raw.length > 1) {
            return runInsertMany(raw as Record<string, unknown>[]);
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
            return run().then((r) => {
              resolve(r);
              return r;
            });
          },
        };
        return insertBuilder as InsertBuilder<T> & { then(resolve: (v: { data: T | T[] | null; error: DbError | null }) => void): Promise<void> };
      },
      update(row: Record<string, unknown>) {
        updateRow = row;
        const updateBuilder: UpdateBuilder<T> & { then(resolve: (v: { data: T | null; error: DbError | null }) => void): Promise<void> } = {
          eq(column: string, value: unknown) {
            conditions.push({ type: 'eq', col: column, val: value });
            return updateBuilder;
          },
          is(column: string, value: null) {
            conditions.push({ type: 'is', col: column, val: null });
            return updateBuilder;
          },
          select(columns: string) {
            updateReturningCols = columns;
            return updateBuilder;
          },
          async single() {
            const res = await runUpdate();
            if (res.error) return { data: null, error: res.error };
            if (res.data == null) return { data: null, error: { message: 'Not found' } };
            return { data: res.data, error: null };
          },
          async maybeSingle() {
            const res = await runUpdate();
            return { data: res.data ?? null, error: res.error };
          },
          then(resolve: (v: { data: T | null; error: DbError | null }) => void) {
            return runUpdate().then(resolve) as Promise<void>;
          },
        };
        return updateBuilder;
      },
      async upsert(
        rowOrRows: Record<string, unknown> | object | object[],
        opts?: { onConflict?: string; ignoreDuplicates?: boolean }
      ) {
        const arr = Array.isArray(rowOrRows) ? (rowOrRows as object[]) : [rowOrRows as object];
        upsertRow = (arr[0] ?? {}) as Record<string, unknown>;
        upsertOpts = opts ?? null;
        if (arr.length > 1) return runUpsertMany(arr as Record<string, unknown>[]);
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

    return builder as unknown as (QueryBuilder<T> & {
      insert(row: Record<string, unknown> | object | object[]): InsertBuilder<T>;
      update(row: Record<string, unknown>): UpdateBuilder<T>;
      upsert(row: Record<string, unknown> | object | object[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }): Promise<{ data: unknown; error: DbError | null }>;
      delete(): QueryBuilder<T>;
    });
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
