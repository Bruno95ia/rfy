/**
 * Cliente admin de dados (PostgreSQL). Substitui Supabase SERVICE_ROLE.
 * Use somente no servidor. Não depende mais de SUPABASE_SERVICE_ROLE_KEY.
 */

export { createAdminClient } from '@/lib/db/admin';
export type { DbError, AdminDbClientType, UpdateResult, DeleteResult } from '@/lib/db/admin';
