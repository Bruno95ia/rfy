/**
 * GET /api/reports/executive.xlsx?org_id=...
 * Exporta relatório executivo em Excel (XLSX).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuthAndOrgAccess } from '@/lib/auth';
import { getExecutiveData } from '@/lib/reports/executive-data';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get('org_id');
  const auth = await requireAuthAndOrgAccess(orgId);
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const data = await getExecutiveData(admin, auth.orgId);

  const summaryRows = [
    { Métrica: 'Data do relatório', Valor: data.generated_at ?? '' },
    { Métrica: 'RFY Index (%)', Valor: data.rfy_index_pct != null ? data.rfy_index_pct.toFixed(1) : '' },
    { Métrica: 'Receita confiável (30d)', Valor: data.receita_confiavel_30d.toLocaleString('pt-BR') },
    { Métrica: 'Receita inflada', Valor: data.receita_inflada.toLocaleString('pt-BR') },
    { Métrica: 'Pipeline declarado', Valor: data.pipeline_declarado.toLocaleString('pt-BR') },
  ];

  const decisionsRows = data.top_decisions.map((d, i) => ({
    '#': i + 1,
    Nome: d.name,
    Descrição: d.description,
    Quantidade: d.count,
  }));

  const alertsRows = data.alertas.map((a) => ({
    Mensagem: a.message,
    Gravidade: a.severity,
    Data: a.created_at,
  }));

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  const wsDecisions = XLSX.utils.json_to_sheet(decisionsRows);
  const wsAlerts = XLSX.utils.json_to_sheet(alertsRows);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');
  XLSX.utils.book_append_sheet(wb, wsDecisions, 'Top decisões');
  XLSX.utils.book_append_sheet(wb, wsAlerts, 'Alertas');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="relatorio-executivo.xlsx"',
    },
  });
}
