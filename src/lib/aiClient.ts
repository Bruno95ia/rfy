/**
 * Cliente para o AI Service (inferência, forecast, benchmark, intervenções).
 * Usa NEXT_PUBLIC_AI_SERVICE_URL ou AI_SERVICE_URL (server-side).
 */

const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') return '';
  return process.env.AI_SERVICE_URL ?? 'http://localhost:8001';
};

export type PredictDealResponse = {
  p_win?: number;
  risk_delay?: number;
  expected_close_days?: number;
  model_version?: string | null;
  fallback?: string | null;
  error?: string;
};

export type PredictForecastResponse = {
  forecast_adjusted?: number;
  pipeline_bruto?: number;
  diferença_percentual?: number;
  breakdown?: Record<string, number>;
  n_deals?: number;
  fallback?: boolean;
  /** Data & Model Policy: confiança do forecast para esta base */
  forecast_confidence?: 'high' | 'low';
  /** Mensagem quando confiança baixa (ex.: modelo não treinado, poucos deals) */
  data_quality_warning?: string | null;
};

export type BenchmarkMetricDiff = {
  org_value: number;
  cluster_median: number;
  cluster_p25: number;
  cluster_p75: number;
  pct_diff_vs_median: number;
  percentile: 'below' | 'at' | 'above';
  n_orgs: number;
};

export type BenchmarkCompanyResponse = {
  status: 'ok' | 'insufficient_peers' | 'no_cluster' | 'no_data' | 'org_not_found';
  cluster_id?: number;
  cycle_vs_cluster?: string;
  winrate_vs_cluster?: string;
  proposal_delay_vs_cluster?: string;
  percentile_cycle?: number;
  diffs?: Record<string, BenchmarkMetricDiff>;
  message?: string;
};

export type InterventionItem = {
  deal_id: string;
  company: string;
  impact_score: number;
  recommended_action: string;
  /** Probabilidade de fechamento (0–1); usado na priorização e explicabilidade */
  p_win?: number;
  /** Breve explicação do porquê da priorização (valor em risco, P(win), dias parados) */
  impact_rationale?: string;
  value?: number;
  days_without_activity?: number;
  stage_name?: string;
};

async function fetchAi<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getBaseUrl();
  const url = base ? `${base}${path}` : path;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `AI Service: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function predictDeal(dealId: string, orgId: string): Promise<PredictDealResponse> {
  const base = getBaseUrl();
  const path = base ? '/predict/deal' : '/api/ai/deal';
  return fetchAi<PredictDealResponse>(path, {
    method: 'POST',
    body: JSON.stringify({ deal_id: dealId, org_id: orgId }),
  });
}

export async function predictForecast(orgId: string): Promise<PredictForecastResponse> {
  const base = getBaseUrl();
  const path = base ? '/predict/forecast' : '/api/ai/forecast';
  return fetchAi<PredictForecastResponse>(path, {
    method: 'POST',
    body: JSON.stringify({ org_id: orgId }),
  });
}

export async function getBenchmark(orgId: string): Promise<BenchmarkCompanyResponse> {
  const base = getBaseUrl();
  const path = base ? '/benchmark/company' : '/api/ai/benchmark';
  return fetchAi<BenchmarkCompanyResponse>(path, {
    method: 'POST',
    body: JSON.stringify({ org_id: orgId }),
  });
}

/** Alias para benchmarkCompany (compatibilidade) */
export const benchmarkCompany = getBenchmark;

export async function getInterventions(orgId: string): Promise<InterventionItem[]> {
  const base = getBaseUrl();
  const path = base ? '/predict/interventions' : '/api/ai/interventions';
  return fetchAi<InterventionItem[]>(path, {
    method: 'POST',
    body: JSON.stringify({ org_id: orgId }),
  });
}

export async function healthCheck(): Promise<{ status: string }> {
  return fetchAi<{ status: string }>('/health');
}

/** Status agregado do AI Service: health + lista de modelos (via /api/ai/status) */
export type AIStatusResponse = {
  health: string;
  service?: string;
  models: Array<{
    model_name: string;
    version: string;
    trained_at: string | null;
    metrics: Record<string, unknown>;
  }>;
  models_available: boolean;
  error?: string;
};

/** Chamar do cliente (dashboard). Faz request à API Next.js com org_id. */
export async function getAIStatus(orgId: string): Promise<AIStatusResponse> {
  const url = `/api/ai/status?org_id=${encodeURIComponent(orgId)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error((await res.text()) || `Status: ${res.status}`);
  return res.json() as Promise<AIStatusResponse>;
}

/** Dispara treinamento do modelo (servidor envia AI_TRAIN_SECRET). Chamar do cliente. */
export type TrainResponse = {
  ok?: boolean;
  run_id?: string;
  metrics?: Record<string, unknown>;
  classifier_path?: string;
  regressor_path?: string | null;
  error?: string;
};

export async function triggerTrain(orgId: string): Promise<TrainResponse> {
  const res = await fetch('/api/ai/train', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ org_id: orgId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data?.error as string) || `Status: ${res.status}`);
  return data as TrainResponse;
}

export type ICPAnalysisResponse = {
  icp_summary: string;
  icp_study: { empresas_analisadas?: Array<{ segmento_inferido?: string; padrao?: string; valor_medio?: number; win_rate_segmento?: number; recomendacao?: string }> };
  generated_at: string;
};

export async function getICPAnalysis(orgId: string): Promise<ICPAnalysisResponse> {
  return fetchAi<ICPAnalysisResponse>('/api/ai/icp-analysis', {
    method: 'POST',
    body: JSON.stringify({ org_id: orgId }),
  });
}
