import type { SupabaseClient } from '@supabase/supabase-js';

const AI_BASE = process.env.AI_SERVICE_URL ?? 'http://localhost:8001';
const AI_FETCH_TIMEOUT_MS = 20000;

export type AlertRuleRow = {
  id: string;
  org_id: string;
  rule_key: string;
  severity: string;
  threshold: number | null;
  enabled: boolean;
  cooldown_minutes: number;
  channel_ids: string[];
};

export type MetricsContext = {
  rfy_index_pct: number | null;
  receita_confiavel_30d: number;
  receita_inflada: number;
  pipeline_declarado: number;
  max_days_without_activity: number;
  generated_at: string | null;
};

export type CanonicalRuleType =
  | 'rfy_abaixo_do_limiar'
  | 'receita_inflada_acima_do_limiar'
  | 'pipeline_stagnation';

const RFY_RULE_KEYS = new Set(['rfy_index_below', 'rfy_abaixo_do_limiar']);
const INFLATED_RULE_KEYS = new Set([
  'receita_inflada_above',
  'receita_inflada_acima_do_limiar',
]);

function normalizeRuleType(ruleKey: string): CanonicalRuleType | null {
  if (RFY_RULE_KEYS.has(ruleKey)) return 'rfy_abaixo_do_limiar';
  if (INFLATED_RULE_KEYS.has(ruleKey)) return 'receita_inflada_acima_do_limiar';
  if (ruleKey === 'pipeline_stagnation') return 'pipeline_stagnation';
  return null;
}

async function getMetricsForOrg(
  admin: SupabaseClient,
  orgId: string
): Promise<MetricsContext> {
  const { data: report } = await admin
    .from('reports')
    .select('generated_at, snapshot_json')
    .eq('org_id', orgId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const snapshot = (report?.snapshot_json as Record<string, unknown>) ?? {};
  const pipelineValueOpen = Number(snapshot.pipeline_value_open) || 0;
  const maxDaysWithoutActivity =
    Number((snapshot as { max_days_without_activity?: number }).max_days_without_activity) || 0;

  let forecastAdjusted: number | null = null;
  let pipelineBruto: number | null = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_FETCH_TIMEOUT_MS);
    const response = await fetch(`${AI_BASE}/predict/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = (await response.json()) as {
        forecast_adjusted?: number;
        pipeline_bruto?: number;
      };
      forecastAdjusted = data.forecast_adjusted ?? null;
      pipelineBruto = data.pipeline_bruto ?? null;
    }
  } catch {
    // AI indisponível.
  }

  const declarado = pipelineBruto ?? pipelineValueOpen;
  const confiavel = forecastAdjusted ?? declarado * 0.7;
  const inflada = Math.max(0, declarado - confiavel);
  const rfyIndexPct =
    declarado > 0 && forecastAdjusted != null
      ? (forecastAdjusted / declarado) * 100
      : null;

  return {
    rfy_index_pct: rfyIndexPct,
    receita_confiavel_30d: confiavel,
    receita_inflada: inflada,
    pipeline_declarado: declarado,
    max_days_without_activity: maxDaysWithoutActivity,
    generated_at: report?.generated_at ?? null,
  };
}

export function evaluateRule(
  rule: AlertRuleRow,
  metrics: MetricsContext
): { triggered: boolean; payload: Record<string, unknown>; tipo: CanonicalRuleType | null } {
  const threshold = rule.threshold ?? 0;
  const tipo = normalizeRuleType(rule.rule_key);

  if (tipo === 'rfy_abaixo_do_limiar') {
    if (metrics.rfy_index_pct == null) {
      return { triggered: false, payload: {}, tipo };
    }
    return {
      triggered: metrics.rfy_index_pct < threshold,
      tipo,
      payload: {
        rfy_index_pct: metrics.rfy_index_pct,
        threshold,
        message: `RFY Index (${metrics.rfy_index_pct.toFixed(1)}%) está abaixo do limiar (${threshold}%).`,
      },
    };
  }

  if (tipo === 'receita_inflada_acima_do_limiar') {
    return {
      triggered: metrics.receita_inflada > threshold,
      tipo,
      payload: {
        receita_inflada: metrics.receita_inflada,
        threshold,
        message: `Receita Inflada (R$ ${metrics.receita_inflada.toLocaleString('pt-BR')}) está acima do limite (R$ ${threshold.toLocaleString('pt-BR')}).`,
      },
    };
  }

  if (tipo === 'pipeline_stagnation') {
    return {
      triggered: metrics.max_days_without_activity >= threshold,
      tipo,
      payload: {
        max_days_without_activity: metrics.max_days_without_activity,
        threshold,
        message: `Pipeline com estagnação: ${metrics.max_days_without_activity} dias sem movimento (limiar: ${threshold} dias).`,
      },
    };
  }

  return { triggered: false, payload: {}, tipo: null };
}

export type EvaluateAlertsResult = {
  events: { id: string; rule_id: string }[];
  opened: number;
  resolved: number;
};

function buildAlertTitle(tipo: CanonicalRuleType): string {
  if (tipo === 'rfy_abaixo_do_limiar') return 'RFY Index abaixo do limiar';
  if (tipo === 'receita_inflada_acima_do_limiar') return 'Receita Inflada acima do limiar';
  return 'Pipeline estagnado';
}

export async function evaluateAlertsForOrg(
  admin: SupabaseClient,
  orgId: string
): Promise<EvaluateAlertsResult> {
  const metrics = await getMetricsForOrg(admin, orgId);

  const { data: rules } = await admin
    .from('alert_rules')
    .select('id, org_id, rule_key, severity, threshold, enabled, cooldown_minutes, channel_ids')
    .eq('org_id', orgId)
    .eq('enabled', true);

  const events: { id: string; rule_id: string }[] = [];
  let opened = 0;
  let resolved = 0;

  for (const rawRule of rules ?? []) {
    const rule = rawRule as unknown as AlertRuleRow;
    const evaluated = evaluateRule(rule, metrics);
    if (!evaluated.tipo) continue;

    const { data: existingOpen } = await admin
      .from('alerts')
      .select('id')
      .eq('org_id', orgId)
      .eq('tipo', evaluated.tipo)
      .is('resolved_at', null)
      .maybeSingle();

    if (evaluated.triggered) {
      if (existingOpen) continue;

      const now = new Date().toISOString();
      const threshold = rule.threshold ?? 0;
      const metricValue =
        evaluated.tipo === 'rfy_abaixo_do_limiar'
          ? metrics.rfy_index_pct
          : evaluated.tipo === 'receita_inflada_acima_do_limiar'
            ? metrics.receita_inflada
            : metrics.max_days_without_activity;

      await admin.from('alerts').insert({
        org_id: orgId,
        rule_id: rule.id,
        tipo: evaluated.tipo,
        severidade: rule.severity,
        titulo: buildAlertTitle(evaluated.tipo),
        mensagem: String(evaluated.payload.message ?? 'Alerta acionado'),
        valor_atual: metricValue,
        limiar: threshold,
        metadata_json: {
          generated_at: metrics.generated_at,
          payload: evaluated.payload,
        },
        created_at: now,
      });

      const { data: eventInsert } = await admin
        .from('alert_events')
        .insert({
          org_id: orgId,
          rule_id: rule.id,
          severity: rule.severity,
          payload_json: {
            ...evaluated.payload,
            tipo: evaluated.tipo,
            generated_at: metrics.generated_at,
          },
          status: 'triggered',
        })
        .select('id')
        .single();

      if (eventInsert?.id) {
        events.push({ id: eventInsert.id, rule_id: rule.id });
      }
      opened += 1;
      continue;
    }

    if (existingOpen) {
      await admin
        .from('alerts')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', existingOpen.id);
      resolved += 1;
    }
  }

  return { events, opened, resolved };
}
