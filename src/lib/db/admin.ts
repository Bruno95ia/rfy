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
  ilike(column: string, pattern: string): QueryBuilder<T>;
  is(column: string, value: null): QueryBuilder<T>;
  not(column: string, op: 'is', value: null): QueryBuilder<T>;
  order(column: string, opts?: { ascending?: boolean }): QueryBuilder<T>;
  limit(n: number): QueryBuilder<T>;
  range(from: number, to: number): QueryBuilder<T>;
  single(): Promise<{ data: T | null; error: DbError | null }>;
  maybeSingle(): Promise<{ data: T | null; error: DbError | null }>;
  then(
    resolve: (value: { data: T[] | null; error: DbError | null; count?: number }) => void
  ): void;
}

interface InsertBuilder<T = QueryResultRow> extends PromiseLike<{ data: T | T[] | null; error: DbError | null }> {
  select(columns?: string): InsertBuilder<T>;
  single(): Promise<{ data: T | null; error: DbError | null }>;
}

/** Resultado de update().eq() quando usado com await. */
export type UpdateResult = { error: DbError | null };

/** Resultado de delete().eq() quando usado com await. */
export type DeleteResult = { error: DbError | null };

interface UpdateBuilder extends PromiseLike<UpdateResult> {
  eq(column: string, value: unknown): UpdateBuilder;
  is(column: string, value: null): UpdateBuilder;
}

const allowedTableNames = new Set([
  'orgs', 'org_members', 'org_invites', 'org_config', 'org_subscriptions', 'org_audit_logs',
  'org_onboarding_steps', 'org_api_keys', 'org_unit_economics', 'uploads', 'opportunities',
  'activities', 'reports', 'plans', 'usage_limits', 'usage_events', 'alert_channels', 'alert_rules',
  'alert_events', 'alerts', 'outbound_webhooks', 'report_schedules', 'data_quality_runs',
  'forecast_scenarios', 'quarterly_goals', 'retention_cohorts', 'crm_integrations',
  'supho_campaigns',
  'supho_diagnostic_campaigns',
  'supho_respondents',
  'supho_questions',
  'supho_answers',
  'supho_diagnostic_results',
  'supho_diagnostic_result_respondents',
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

  from<T extends QueryResultRow = QueryResultRow>(table: string): QueryBuilder<T> & {
    insert(rowOrRows: Record<string, unknown> | Record<string, unknown>[]): InsertBuilder<T>;
    update(row: Record<string, unknown>): UpdateBuilder;
    upsert(rowOrRows: Record<string, unknown> | Record<string, unknown>[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }): Promise<{ data: unknown; error: DbError | null }>;
    delete(): QueryBuilder<T> & PromiseLike<DeleteResult>;
  } {
    const t = safeTable(table);
    let selectCols: string | null = null;
    let countOnly = false;
    let headOnly = false;
    const conditions: { type: 'eq' | 'gte' | 'in' | 'ilike' | 'is' | 'not_null'; col: string; val: unknown }[] = [];
    let orderCol: string | null = null;
    let orderAsc = true;
    let limitVal: number | null = null;
    let offsetVal: number | null = null;
    let countExact = false;
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
            sql += `${prefix}${safeColumn(c.col)}::text = ANY($${idx}::text[])`;
            params.push(Array.isArray(c.val) ? c.val : [c.val]);
            idx++;
          } else if (c.type === 'ilike') {
            sql += `${prefix}${safeColumn(c.col)} ILIKE $${idx}`;
            params.push(c.val);
            idx++;
          } else if (c.type === 'is' && c.val === null) {
            sql += `${prefix}${safeColumn(c.col)} IS NULL`;
          } else if (c.type === 'not_null') {
            sql += `${prefix}${safeColumn(c.col)} IS NOT NULL`;
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
            sql += `${prefix}${safeColumn(c.col)}::text = ANY($${idx}::text[])`;
            params.push(Array.isArray(c.val) ? c.val : [c.val]);
            idx++;
          } else if (c.type === 'ilike') {
            sql += `${prefix}${safeColumn(c.col)} ILIKE $${idx}`;
            params.push(c.val);
            idx++;
          } else if (c.type === 'is' && c.val === null) {
            sql += `${prefix}${safeColumn(c.col)} IS NULL`;
          } else if (c.type === 'not_null') {
            sql += `${prefix}${safeColumn(c.col)} IS NOT NULL`;
          }
        }
      if (orderCol) sql += ` ORDER BY ${safeColumn(orderCol)} ${orderAsc ? 'ASC' : 'DESC'}`;
      if (offsetVal != null && offsetVal > 0) sql += ` OFFSET ${offsetVal}`;
      if (limitVal != null) sql += ` LIMIT ${Math.max(1, Math.min(limitVal, 1000))}`;
      let count: number | undefined;
      if (countExact) {
        let countSql = `SELECT count(*)::int AS c FROM ${t}`;
        const countParams: unknown[] = [];
        let ci = 1;
        for (const c of conditions) {
          const prefix = countParams.length === 0 ? ' WHERE ' : ' AND ';
          if (c.type === 'eq') {
            countSql += `${prefix}${safeColumn(c.col)} = $${ci}`;
            countParams.push(c.val);
            ci++;
          } else if (c.type === 'gte') {
            countSql += `${prefix}${safeColumn(c.col)} >= $${ci}`;
            countParams.push(c.val);
            ci++;
          } else if (c.type === 'in') {
            countSql += `${prefix}${safeColumn(c.col)}::text = ANY($${ci}::text[])`;
            countParams.push(Array.isArray(c.val) ? c.val : [c.val]);
            ci++;
          } else if (c.type === 'ilike') {
            countSql += `${prefix}${safeColumn(c.col)} ILIKE $${ci}`;
            countParams.push(c.val);
            ci++;
          } else if (c.type === 'is' && c.val === null) {
            countSql += `${prefix}${safeColumn(c.col)} IS NULL`;
          } else if (c.type === 'not_null') {
            countSql += `${prefix}${safeColumn(c.col)} IS NOT NULL`;
          }
        }
        const cr = await this.pool.query<{ c: number }>(countSql, countParams);
        count = cr.rows[0]?.c ?? 0;
      }
      const r = await this.pool.query<T>(sql, params);
      return { data: r.rows, error: null, count };
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
      if (!updateRow) return { data: null, error: { message: 'No update row' } };
      const setKeys = Object.keys(updateRow).filter((k) => updateRow![k] !== undefined);
      if (setKeys.length === 0) return { data: null, error: null };
      const setClause = setKeys.map((k, i) => `${safeColumn(k)} = $${i + 1}`).join(', ');
      const params = setKeys.map((k) => updateRow![k]);
      let idx = params.length + 1;
      let sql = `UPDATE ${t} SET ${setClause}`;
      let whereStarted = false;
      for (const c of conditions) {
        if (c.type === 'eq') {
          sql += (!whereStarted ? ' WHERE ' : ' AND ') + `${safeColumn(c.col)} = $${idx}`;
          whereStarted = true;
          params.push(c.val);
          idx++;
        } else if (c.type === 'is' && c.val === null) {
          sql += (!whereStarted ? ' WHERE ' : ' AND ') + `${safeColumn(c.col)} IS NULL`;
          whereStarted = true;
        }
      }
      try {
        await this.pool.query(sql, params);
        return { data: null, error: null };
      } catch (e) {
        return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
      }
    };

    const runUpsert = async (): Promise<{ data: unknown; error: DbError | null }> => {
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

    const runUpsertMany = async (rows: Record<string, unknown>[]): Promise<{ data: unknown; error: DbError | null }> => {
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
        return { data: null, error: null };
      } catch (e) {
        return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
      }
    };

    const builder: Record<string, unknown> = {
      select(columns?: string, opts?: SelectOpts) {
        selectCols = columns ?? '*';
        countOnly = opts?.count === 'exact' && opts?.head === true;
        headOnly = opts?.head === true;
        countExact = opts?.count === 'exact' && !headOnly;
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
      ilike(column: string, pattern: string) {
        conditions.push({ type: 'ilike', col: column, val: pattern });
        return builder as unknown as QueryBuilder<T>;
      },
      is(column: string, value: null) {
        conditions.push({ type: 'is', col: column, val: value });
        return builder as unknown as QueryBuilder<T>;
      },
      not(column: string, _op: 'is', value: null) {
        if (value === null) conditions.push({ type: 'not_null', col: column, val: null });
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
      range(from: number, to: number) {
        offsetVal = Math.max(0, from);
        limitVal = Math.max(1, to - from + 1);
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
        const updateBuilder: UpdateBuilder = {
          eq(column: string, value: unknown) {
            conditions.push({ type: 'eq', col: column, val: value });
            return updateBuilder;
          },
          is(column: string, value: null) {
            conditions.push({ type: 'is', col: column, val: value });
            return updateBuilder;
          },
          then<TResult1 = UpdateResult, TResult2 = never>(
            onfulfilled?: ((value: UpdateResult) => TResult1 | PromiseLike<TResult1>) | null,
            onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
          ): PromiseLike<TResult1 | TResult2> {
            return runUpdate().then(
              (v) => {
                const result: UpdateResult = { error: v.error };
                return onfulfilled ? onfulfilled(result) : (result as unknown as TResult1);
              },
              onrejected
            ) as PromiseLike<TResult1 | TResult2>;
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
          async then(resolve: (v: DeleteResult) => void) {
            resolve(await runDelete());
          },
        });
      },
    };

    return builder as unknown as (QueryBuilder<T> & {
      insert(rowOrRows: Record<string, unknown> | Record<string, unknown>[]): InsertBuilder<T>;
      update(row: Record<string, unknown>): UpdateBuilder;
      upsert(rowOrRows: Record<string, unknown> | Record<string, unknown>[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }): Promise<{ data: unknown; error: DbError | null }>;
      delete(): QueryBuilder<T> & PromiseLike<DeleteResult>;
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