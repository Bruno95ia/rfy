/**
 * Cliente para a API PipeRun.
 * Usa api_url (base) + api_key (Bearer) armazenados em crm_integrations.
 */
import type { PipeRunConfig, PipeRunDealRaw, PipeRunActivityRaw } from './types';

const DEFAULT_BASE_PATH = '/api/v1';

function buildUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * Testa a conexão com a API PipeRun (GET leve para validar credenciais).
 * Tenta /me ou /opportunities?limit=1 ou /deals?limit=1.
 */
export async function testConnection(config: PipeRunConfig): Promise<{
  ok: boolean;
  message?: string;
}> {
  const { apiUrl, apiKey } = config;
  if (!apiUrl?.trim() || !apiKey?.trim()) {
    return { ok: false, message: 'api_url e api_key são obrigatórios' };
  }

  const pathsToTry = [
    `${DEFAULT_BASE_PATH}/me`,
    `${DEFAULT_BASE_PATH}/opportunities?limit=1`,
    `${DEFAULT_BASE_PATH}/deals?limit=1`,
    '/opportunities?limit=1',
    '/deals?limit=1',
  ];

  for (const path of pathsToTry) {
    const url = buildUrl(apiUrl, path);
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok || res.status === 404) {
        return { ok: true };
      }
      if (res.status === 401 || res.status === 403) {
        return { ok: false, message: 'Credenciais inválidas ou sem permissão' };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (path === pathsToTry[pathsToTry.length - 1]) {
        return { ok: false, message: `Falha ao conectar: ${msg}` };
      }
      continue;
    }
  }

  return { ok: true };
}

/**
 * Busca oportunidades/deals da API PipeRun (para sync incremental na Semana 2).
 * Retorna array de itens brutos; o chamador aplica mapDealToOpportunity.
 */
export async function fetchDeals(
  config: PipeRunConfig,
  options?: { since?: string; limit?: number }
): Promise<PipeRunDealRaw[]> {
  const { apiUrl, apiKey } = config;
  const limit = options?.limit ?? 500;
  const path = `${DEFAULT_BASE_PATH}/opportunities?limit=${limit}`;
  const url = buildUrl(apiUrl, path);
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    throw new Error(`PipeRun API error: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as unknown;
  if (Array.isArray(data)) return data as PipeRunDealRaw[];
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: PipeRunDealRaw[] }).data;
  }
  if (data && typeof data === 'object' && Array.isArray((data as { opportunities?: unknown }).opportunities)) {
    return (data as { opportunities: PipeRunDealRaw[] }).opportunities;
  }
  return [];
}

/**
 * Busca atividades da API PipeRun (para sync incremental na Semana 2).
 */
export async function fetchActivities(
  config: PipeRunConfig,
  options?: { since?: string; limit?: number }
): Promise<PipeRunActivityRaw[]> {
  const { apiUrl, apiKey } = config;
  const limit = options?.limit ?? 1000;
  const path = `${DEFAULT_BASE_PATH}/activities?limit=${limit}`;
  const url = buildUrl(apiUrl, path);
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    throw new Error(`PipeRun API error: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as unknown;
  if (Array.isArray(data)) return data as PipeRunActivityRaw[];
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: PipeRunActivityRaw[] }).data;
  }
  if (data && typeof data === 'object' && Array.isArray((data as { activities?: unknown }).activities)) {
    return (data as { activities: PipeRunActivityRaw[] }).activities;
  }
  return [];
}
