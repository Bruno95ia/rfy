import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiUserOrgAccess } from '@/lib/auth';

/** GET: exporta plano PAIP em HTML para impressão (Salvar como PDF) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;

  const { planId } = await params;
  const admin = createAdminClient();

  const { data: plan } = await admin
    .from('supho_paip_plans')
    .select('id, name, status, period_start, period_end, created_at')
    .eq('id', planId)
    .eq('org_id', auth.orgId)
    .single();

  if (!plan) return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });

  const { data: gaps } = await admin
    .from('supho_paip_gaps')
    .select('id, description')
    .eq('plan_id', planId)
    .order('created_at');

  const gapIds = (gaps ?? []).map((g: { id: string }) => g.id);
  const { data: objectives } = gapIds.length > 0
    ? await admin
        .from('supho_paip_objectives')
        .select('id, gap_id, objective_text')
        .in('gap_id', gapIds)
        .order('created_at')
    : { data: [] };

  const objectiveIds = (objectives ?? []).map((o: { id: string }) => o.id);
  const { data: krs } = objectiveIds.length > 0
    ? await admin.from('supho_paip_krs').select('id, objective_id, kr_text, target_value').in('objective_id', objectiveIds).order('created_at')
    : { data: [] };

  const krIds = (krs ?? []).map((k: { id: string }) => k.id);
  const { data: actions } = krIds.length > 0
    ? await admin.from('supho_paip_actions').select('id, kr_id, action_5w2h, owner_id, due_at, status').in('kr_id', krIds).order('due_at')
    : { data: [] };

  const objectivesWithKrs = (objectives ?? []).map((obj: { id: string; gap_id: string; objective_text: string }) => ({
    ...obj,
    krs: (krs ?? []).filter((k: { objective_id: string }) => k.objective_id === obj.id).map((k: { id: string; kr_text: string; target_value: string | null }) => ({
      ...k,
      actions: (actions ?? []).filter((a: { kr_id: string }) => a.kr_id === k.id),
    })),
  }));

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>PAIP — ${plan.name}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; color: #1e293b; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .meta { color: #64748b; font-size: 0.875rem; margin-bottom: 1.5rem; }
    h2 { font-size: 1.1rem; margin-top: 1.5rem; }
    ul { margin: 0.5rem 0; padding-left: 1.5rem; }
    .gap, .obj, .kr { margin: 0.75rem 0; padding-left: 1rem; border-left: 3px solid #e2e8f0; }
    @media print { body { padding: 1rem; } }
  </style>
</head>
<body>
  <h1>${plan.name}</h1>
  <p class="meta">Status: ${plan.status} | Período: ${plan.period_start ?? '—'} a ${plan.period_end ?? '—'} | Exportado em ${new Date().toLocaleString('pt-BR')}</p>
  <h2>Gaps</h2>
  ${(gaps ?? []).length ? `<ul>${(gaps ?? []).map((g: { description: string | null }) => `<li>${g.description ?? '—'}</li>`).join('')}</ul>` : '<p>Nenhum gap registrado.</p>'}
  <h2>Objetivos, KRs e Ações</h2>
  ${objectivesWithKrs.map((obj: { objective_text: string; krs: Array<{ kr_text: string; target_value: string | null; actions: Array<{ action_5w2h: string | null; owner_id: string | null; due_at: string | null; status: string }> }> }) => `
  <div class="obj">
    <strong>${obj.objective_text}</strong>
    ${obj.krs.map((kr: { kr_text: string; target_value: string | null; actions: Array<{ action_5w2h: string | null; owner_id: string | null; due_at: string | null; status: string }> }) => `
    <div class="kr">
      <strong>KR:</strong> ${kr.kr_text}${kr.target_value != null ? ` (${kr.target_value})` : ''}
      ${kr.actions.length ? `<ul>${kr.actions.map((a: { action_5w2h: string | null; owner_id: string | null; due_at: string | null; status: string }) => `<li>${a.action_5w2h ?? '—'} ${a.due_at ? `— ${a.due_at}` : ''} [${a.status}]</li>`).join('')}</ul>` : ''}
    </div>
    `).join('')}
  </div>
  `).join('')}
  <p class="meta" style="margin-top: 2rem;">Para salvar como PDF: Imprimir (Ctrl+P) → Salvar como PDF.</p>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
