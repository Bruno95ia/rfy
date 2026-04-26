import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

vi.mock('@/lib/rfy/forecast-ai-payload', () => ({
  buildForecastAiRequestBody: vi.fn().mockResolvedValue({ org_id: 'org1' }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
    from: vi.fn(),
  }),
}));

vi.mock('@/lib/auth', () => ({
  requireAuthAndOrgAccess: vi.fn(),
}));

const { requireAuthAndOrgAccess } = await import('@/lib/auth');

async function makeRequest(body: { org_id?: string }) {
  return POST(
    new NextRequest('http://localhost/api/ai/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

describe('POST /api/ai/forecast', () => {
  beforeEach(() => {
    vi.mocked(requireAuthAndOrgAccess).mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('retorna 401 quando não autenticado', async () => {
    vi.mocked(requireAuthAndOrgAccess).mockResolvedValue({
      ok: false,
      response: Response.json({ error: 'Não autenticado' }, { status: 401 }),
    });
    const res = await makeRequest({ org_id: 'org1' });
    expect(res.status).toBe(401);
  });

  it('retorna 403 quando org_id sem acesso', async () => {
    vi.mocked(requireAuthAndOrgAccess).mockResolvedValue({
      ok: false,
      response: Response.json({ error: 'Sem permissão' }, { status: 403 }),
    });
    const res = await makeRequest({ org_id: 'org-outro' });
    expect(res.status).toBe(403);
  });

  it('retorna 200 com payload válido quando auth e org corretos', async () => {
    vi.mocked(requireAuthAndOrgAccess).mockResolvedValue({
      ok: true,
      orgId: 'org1',
    });
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          forecast_adjusted: 100000,
          pipeline_bruto: 120000,
          diferença_percentual: -16.7,
          n_deals: 50,
        }),
        { status: 200 }
      )
    );
    const res = await makeRequest({ org_id: 'org1' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.forecast_adjusted).toBe(100000);
  });
});
