/**
 * GET /api/reports/executive.pdf?org_id=...
 * Retorna relatório executivo em HTML otimizado para impressão (Salvar como PDF no navegador).
 * Evita dependências nativas em ambiente serverless.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuthAndOrgAccess } from '@/lib/auth';
import { getExecutiveData } from '@/lib/reports/executive-data';

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get('org_id');
  const auth = await requireAuthAndOrgAccess(orgId);
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const data = await getExecutiveData(admin, auth.orgId);

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relatório Executivo RFY</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #1e293b; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .meta { color: #64748b; font-size: 0.875rem; margin-bottom: 1.5rem; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #e2e8f0; }
    th { font-weight: 600; color: #475569; }
    .section { margin-top: 1.5rem; }
    .section h2 { font-size: 1.1rem; margin-bottom: 0.5rem; color: #334155; }
    ul { padding-left: 1.25rem; }
    li { margin: 0.25rem 0; }
    @media print { body { margin: 1rem; } }
  </style>
</head>
<body>
  <h1>Relatório Executivo — RFY</h1>
  <p class="meta">Gerado em ${escapeHtml(data.generated_at ? new Date(data.generated_at).toLocaleString('pt-BR') : '')}</p>

  <table>
    <tr><th>Métrica</th><th>Valor</th></tr>
    <tr><td>RFY Index (%)</td><td>${data.rfy_index_pct != null ? escapeHtml(data.rfy_index_pct.toFixed(1)) : '—'}</td></tr>
    <tr><td>Receita confiável (30d)</td><td>R$ ${escapeHtml(data.receita_confiavel_30d.toLocaleString('pt-BR'))}</td></tr>
    <tr><td>Receita inflada</td><td>R$ ${escapeHtml(data.receita_inflada.toLocaleString('pt-BR'))}</td></tr>
    <tr><td>Pipeline declarado</td><td>R$ ${escapeHtml(data.pipeline_declarado.toLocaleString('pt-BR'))}</td></tr>
  </table>

  <div class="section">
    <h2>Top 3 decisões</h2>
    <ul>
      ${data.top_decisions.map((d) => `<li><strong>${escapeHtml(d.name)}</strong>: ${escapeHtml(d.description)} (${d.count})</li>`).join('')}
      ${data.top_decisions.length === 0 ? '<li>Nenhuma</li>' : ''}
    </ul>
  </div>

  <div class="section">
    <h2>Alertas recentes</h2>
    <ul>
      ${data.alertas.map((a) => `<li>[${escapeHtml(a.severity)}] ${escapeHtml(a.message)} — ${escapeHtml(new Date(a.created_at).toLocaleString('pt-BR'))}</li>`).join('')}
      ${data.alertas.length === 0 ? '<li>Nenhum</li>' : ''}
    </ul>
  </div>

  <p class="meta" style="margin-top: 2rem;">Para salvar como PDF: use Imprimir (Ctrl+P) → Salvar como PDF.</p>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': 'inline; filename="relatorio-executivo.html"',
    },
  });
}
