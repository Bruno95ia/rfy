import type { AdminDbClientType } from '@/lib/supabase/admin';
import type { createClient } from '@/lib/supabase/server';

/**
 * Admin Postgres ou wrapper SSR (`createClient`): mesma cadeia `.from()` do `AdminDbClient`.
 * Não inclui `SupabaseClient` JS (assinatura `.from()` incompatível na união).
 */
export type PaipDbClient = AdminDbClientType | Awaited<ReturnType<typeof createClient>>;

/**
 * Taxa de execução PAIP = ações concluídas / total (plano ativo da org).
 * Retorna null se não houver ações cadastradas.
 */
export async function getPaipExecutionRate(
  supabase: PaipDbClient,
  orgId: string
): Promise<number | null> {
  const { data: plans } = await supabase
    .from('supho_paip_plans')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'active');

  const planIds = (plans ?? []).map((p) => p.id as string);
  if (planIds.length === 0) return null;

  const { data: gaps } = await supabase
    .from('supho_paip_gaps')
    .select('id')
    .in('plan_id', planIds);
  const gapIds = (gaps ?? []).map((g) => g.id as string);
  if (gapIds.length === 0) return null;

  const { data: objectives } = await supabase
    .from('supho_paip_objectives')
    .select('id')
    .in('gap_id', gapIds);
  const objectiveIds = (objectives ?? []).map((o) => o.id as string);
  if (objectiveIds.length === 0) return null;

  const { data: krs } = await supabase
    .from('supho_paip_krs')
    .select('id')
    .in('objective_id', objectiveIds);
  const krIds = (krs ?? []).map((k) => k.id as string);
  if (krIds.length === 0) return null;

  const { data: actions } = await supabase
    .from('supho_paip_actions')
    .select('status')
    .in('kr_id', krIds);

  const rows = actions ?? [];
  if (rows.length === 0) return null;

  const done = rows.filter((a) => a.status === 'done').length;
  return done / rows.length;
}
