import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuthAndOrgAccess } from '@/lib/auth';
import { getExecutiveData } from '@/lib/reports/executive-data';

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderExecutiveHtml(data: Awaited<ReturnType<typeof getExecutiveData>>): string {
  const generated = data.generated_at
    ? new Date(data.generated_at).toLocaleString('pt-BR')
    : '—';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Relatório Executivo RFY</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; color: #0f172a; margin: 24px auto; max-width: 920px; padding: 0 16px; }
    h1 { font-size: 26px; margin: 0; }
    h2 { font-size: 16px; margin: 0 0 8px; color: #334155; text-transform: uppercase; letter-spacing: .05em; }
    .meta { margin-top: 8px; color: #64748b; font-size: 13px; }
    .grid { margin-top: 18px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; background: #fff; }
    .metric { font-size: 24px; font-weight: 700; margin-top: 6px; }
    ul { margin: 0; padding-left: 18px; }
    li { margin: 6px 0; }
    .footer { margin-top: 20px; color: #64748b; font-size: 12px; }
    @media print { body { margin: 8px; } }
  </style>
</head>
<body>
  <h1>Relatório Executivo — RFY Index</h1>
  <p class="meta">Gerado em ${escapeHtml(generated)}</p>

  <div class="grid">
    <section class="card">
      <h2>1. RFY Index (30 dias)</h2>
      <div class="metric">${data.rfy_index_pct != null ? `${escapeHtml(data.rfy_index_pct.toFixed(1))}%` : '—'}</div>
    </section>

    <section class="card">
      <h2>2. Receita Confiável (30 dias)</h2>
      <div class="metric">R$ ${escapeHtml(data.receita_confiavel_30d.toLocaleString('pt-BR'))}</div>
    </section>

    <section class="card">
      <h2>3. Receita Inflada</h2>
      <div class="metric">R$ ${escapeHtml(data.receita_inflada.toLocaleString('pt-BR'))}</div>
    </section>

    <section class="card">
      <h2>4. Evolução 90 dias</h2>
      <div class="metric" style="font-size: 16px; font-weight: 600;">${escapeHtml(data.evolution_90d ?? 'Em implementação')}</div>
    </section>
  </div>

  <section class="card" style="margin-top: 12px;">
    <h2>5. Top 3 decisões/intervenções</h2>
    <ul>
      ${data.top_decisions.slice(0, 3).map((item) => `<li><strong>${escapeHtml(item.name || 'Intervenção prioritária')}</strong>: ${escapeHtml(item.description || 'Sem descrição')} (${item.count})</li>`).join('')}
      ${data.top_decisions.length === 0 ? '<li>Sem dados suficientes nesta janela.</li>' : ''}
    </ul>
  </section>

  <p class="footer">RFY calcula Receita Confiável sem depender da data de fechamento declarada no CRM.</p>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get('org_id');
  const auth = await requireAuthAndOrgAccess(orgId);
  if (!auth.ok) return auth.response;

  const formatParam = (req.nextUrl.searchParams.get('format') ?? 'html').toLowerCase();
  const format = formatParam === 'pdf' ? 'pdf' : formatParam === 'json' ? 'json' : 'html';

  const admin = createAdminClient();
  const data = await getExecutiveData(admin, auth.orgId);

  if (format === 'json') {
    return NextResponse.json(data);
  }

  const html = renderExecutiveHtml(data);
  const filename = format === 'pdf' ? 'relatorio-executivo.html' : 'relatorio-executivo.html';

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      ...(format === 'pdf' ? { 'X-RFY-Format': 'html-fallback' } : {}),
    },
  });
}
