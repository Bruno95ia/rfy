/**
 * Dados para relatório executivo (CSV/PDF).
 * Busca último report, forecast e alertas recentes.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { computeRfySummary } from '@/lib/metrics/rfy-summary';

const AI_BASE = process.env.AI_SERVICE_URL ?? 'http://localhost:8001';
const AI_FETCH_TIMEOUT_MS = 20000;

export type ExecutiveData = {
  generated_at: string | null;
  rfy_index_pct: number | null;
  receita_confiavel_30d: number;
  receita_inflada: number;
  pipeline_declarado: number;
  rfy_source: 'ai' | 'fallback';
  top_decisions: Array<{ name: string; description: string; count: number }>;
  evolution_90d: string | null;
  alertas: Array<{ message: string; severity: string; created_at: string }>;
};

export async function getExecutiveData(
  admin: SupabaseClient,
  orgId: string
): Promise<ExecutiveData> {
  const { data: report } = await admin
    .from('reports')
    .select('generated_at, snapshot_json, frictions_json')
    .eq('org_id', orgId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const snapshot = (report?.snapshot_json as Record<string, unknown>) ?? {};
  const frictions = (report?.frictions_json as Array<Record<string, unknown>>) ?? [];
  const pipelineValueOpen = Number(snapshot?.pipeline_value_open) || 0;

  let forecastAdjusted: number | null = null;
  let pipelineBruto: number | null = null;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), AI_FETCH_TIMEOUT_MS);
    const res = await fetch(`${AI_BASE}/predict/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId }),
      signal: controller.signal,
    });
    clearTimeout(t);
    if (res.ok) {
      const data = (await res.json()) as { forecast_adjusted?: number; pipeline_bruto?: number };
      forecastAdjusted = data.forecast_adjusted ?? null;
      pipelineBruto = data.pipeline_bruto ?? null;
    } else {
      // eslint-disable-next-line no-console
      console.warn('[reports/executive-data] AI forecast retornou status não OK', {
        status: res.status,
        orgId,
      });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[reports/executive-data] AI forecast indisponível, usando fallback', {
      orgId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const summary = computeRfySummary({
    pipelineValueOpen,
    forecastAdjusted,
    pipelineBruto,
  });

  const top_decisions = frictions
    .slice(0, 3)
    .map((f) => ({
      name: String(f.name ?? ''),
      description: String(f.description ?? ''),
      count: Number(f.count ?? 0),
    }));

  const { data: alertRows } = await admin
    .from('alert_events')
    .select('payload_json, severity, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(10);

  const alertas = (alertRows ?? []).map((a) => ({
    message: (a.payload_json as Record<string, unknown>)?.message as string ?? a.severity,
    severity: a.severity,
    created_at: a.created_at,
  }));

  return {
    generated_at: report?.generated_at ?? null,
    rfy_index_pct: summary.rfyIndexPct,
    receita_confiavel_30d: summary.receitaConfiavel30d,
    receita_inflada: summary.receitaInflada,
    pipeline_declarado: summary.pipelineDeclarado,
    rfy_source: summary.source,
    top_decisions,
    evolution_90d: null,
    alertas,
  };
}

function escapeCsvCell(value: string): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildExecutiveCsv(data: ExecutiveData): string {
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
  return '\uFEFF' + rows.join('\r\n');
}
