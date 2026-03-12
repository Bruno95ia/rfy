/**
 * GET /api/reports/executive.csv?org_id=...
 * Exporta relatório executivo em CSV (RFY Index, Confiável/Inflada, Top 3 decisões, alertas).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuthAndOrgAccess } from '@/lib/auth';
import { getExecutiveData } from '@/lib/reports/executive-data';

function escapeCsvCell(value: string): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get('org_id');
  const auth = await requireAuthAndOrgAccess(orgId);
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const data = await getExecutiveData(admin, auth.orgId);

  const rows: string[] = [
    'Métrica,Valor',
    `Data do relatório,${escapeCsvCell(data.generated_at ?? '')}`,
    `RFY Index (%),${data.rfy_index_pct != null ? data.rfy_index_pct.toFixed(1) : ''}`,
    `Receita confiável (30d),${data.receita_confiavel_30d.toLocaleString('pt-BR')}`,
    `Receita inflada,${data.receita_inflada.toLocaleString('pt-BR')}`,
    `Pipeline declarado,${data.pipeline_declarado.toLocaleString('pt-BR')}`,
    '',
    'Top 3 decisões,Nome,Descrição,Quantidade',
    ...data.top_decisions.map((d, i) =>
      [i + 1, escapeCsvCell(d.name), escapeCsvCell(d.description), d.count].join(',')
    ),
    '',
    'Alertas,Mensagem,Gravidade,Data',
    ...data.alertas.map((a) =>
      [escapeCsvCell(a.message), escapeCsvCell(a.severity), escapeCsvCell(a.created_at)].join(',')
    ),
  ];

  const csv = '\uFEFF' + rows.join('\r\n');
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="relatorio-executivo.csv"',
    },
  });
}
