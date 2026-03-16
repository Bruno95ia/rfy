import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiUserOrgAccess } from '@/lib/auth';

/**
 * GET: Índice de Ritmo SUPHO — assiduidade (rituais realizados no prazo) e execução (decisões concluídas).
 * Retorna score 0–100 e métricas.
 */
export async function GET() {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const { data: templateRows } = await admin
    .from('supho_ritual_templates')
    .select('id')
    .eq('org_id', auth.orgId);
  const templateIds = (templateRows ?? []).map((t: { id: string }) => t.id);
  if (templateIds.length === 0) {
    return NextResponse.json({
      score: 0,
      assiduidade_pct: 0,
      execucao_pct: 0,
      total_rituais: 0,
      realizados: 0,
      total_decisoes: 0,
      decisoes_concluidas: 0,
    });
  }

  const since = new Date();
  since.setMonth(since.getMonth() - 3);

  const { data: rituals } = await admin
    .from('supho_rituals')
    .select('id, scheduled_at, conducted_at')
    .in('template_id', templateIds)
    .gte('scheduled_at', since.toISOString());

  const totalRituais = rituals?.length ?? 0;
  const realizados = (rituals ?? []).filter((r: { conducted_at: string | null }) => r.conducted_at != null).length;
  const assiduidadePct = totalRituais > 0 ? Math.round((realizados / totalRituais) * 100) : 0;

  const ritualIds = (rituals ?? []).map((r: { id: string }) => r.id);
  let totalDecisoes = 0;
  let decisoesConcluidas = 0;

  if (ritualIds.length > 0) {
    const { data: decisions } = await admin
      .from('supho_ritual_decisions')
      .select('status')
      .in('ritual_id', ritualIds);
    totalDecisoes = decisions?.length ?? 0;
    decisoesConcluidas = (decisions ?? []).filter((d: { status: string }) => d.status === 'done').length;
  }

  const execucaoPct = totalDecisoes > 0 ? Math.round((decisoesConcluidas / totalDecisoes) * 100) : 100;
  const score = Math.round((assiduidadePct + execucaoPct) / 2);

  return NextResponse.json({
    score: Math.min(100, Math.max(0, score)),
    assiduidade_pct: assiduidadePct,
    execucao_pct: execucaoPct,
    total_rituais: totalRituais,
    realizados,
    total_decisoes: totalDecisoes,
    decisoes_concluidas: decisoesConcluidas,
  });
}
