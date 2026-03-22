import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiUserOrgAccess } from '@/lib/auth';

/** GET: dossiê do run em HTML para impressão (Salvar como PDF). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const auth = await requireApiUserOrgAccess(null);
  if (!auth.ok) return auth.response;

  const { runId } = await params;
  const admin = createAdminClient();

  const { data: run } = await admin
    .from('supho_certification_runs')
    .select('id, run_at, level, valid_until, maintenance_plan_json')
    .eq('id', runId)
    .eq('org_id', auth.orgId)
    .single();

  if (!run) return NextResponse.json({ error: 'Run não encontrado' }, { status: 404 });

  const { data: evidences } = await admin
    .from('supho_certification_evidences')
    .select('criterion_id, score, evidence_url, notes')
    .eq('run_id', runId);

  const criterionIds = [...new Set((evidences ?? []).map((e) => (e as { criterion_id: string }).criterion_id))];
  const { data: criteria } = criterionIds.length > 0
    ? await admin.from('supho_certification_criteria').select('id, dimension, criterion_text, max_score').in('id', criterionIds)
    : { data: [] };
  type CriterionRow = { id: string; dimension?: string; criterion_text?: string; max_score?: number };
  const criteriaMap = new Map((criteria ?? []).map((c) => [(c as CriterionRow).id, c as CriterionRow]));

  const levelLabels: Record<string, string> = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro' };
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Dossiê Certificação SUPHO — ${levelLabels[run.level] ?? run.level}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; color: #1e293b; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .meta { color: #64748b; font-size: 0.875rem; margin-bottom: 2rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; text-align: left; }
    th { background: #f1f5f9; }
    @media print { body { padding: 1rem; } }
  </style>
</head>
<body>
  <h1>Dossiê de Certificação SUPHO</h1>
  <p class="meta">Nível: ${levelLabels[run.level] ?? run.level} | Data do run: ${new Date(run.run_at).toLocaleString('pt-BR')}${run.valid_until ? ` | Válido até: ${run.valid_until}` : ''}</p>
  <h2>Evidências por critério</h2>
  <table>
    <thead><tr><th>Dimensão</th><th>Critério</th><th>Pontuação (0–3)</th><th>Evidência / URL</th><th>Notas</th></tr></thead>
    <tbody>
      ${(evidences ?? []).map((e) => {
        const ev = e as { criterion_id: string; score: number; evidence_url: string | null; notes: string | null };
        const c = criteriaMap.get(ev.criterion_id) as { dimension?: string; criterion_text?: string; max_score?: number } | undefined;
        return `<tr>
          <td>${c?.dimension ?? '—'}</td>
          <td>${c?.criterion_text ?? '—'}</td>
          <td>${ev.score}</td>
          <td>${ev.evidence_url ? `<a href="${ev.evidence_url}">Link</a>` : '—'}</td>
          <td>${ev.notes ?? '—'}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
  <p class="meta" style="margin-top: 2rem;">Para salvar como PDF: use Imprimir (Ctrl+P) → Salvar como PDF.</p>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
