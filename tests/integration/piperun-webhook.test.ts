import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/crypto', () => ({
  decrypt: vi.fn((value: string) => value),
}));

vi.mock('@/lib/billing', () => ({
  appendAuditLog: vi.fn(async () => {}),
  recordUsageEvent: vi.fn(async () => {}),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkRateLimit: vi.fn(async () => ({ limited: false })),
}));

vi.mock('@/lib/recompute-report', () => ({
  dispatchReportRecompute: vi.fn(async () => ({ mode: 'queued' })),
}));

vi.mock('@/lib/metrics/status', () => ({
  touchMetricsStatus: vi.fn(async () => ({
    org_id: 'org-1',
    version: 2,
    last_updated_at: '2026-02-24T15:00:00.000Z',
  })),
}));

const { createAdminClient } = await import('@/lib/supabase/admin');
const { checkRateLimit } = await import('@/lib/ratelimit');
const { dispatchReportRecompute } = await import('@/lib/recompute-report');
const { POST } = await import('@/app/api/crm/piperun/webhook/route');

type Row = Record<string, unknown>;

function createAdminStub(storage: {
  opportunities: Map<string, Row>;
  activities: Map<string, Row>;
  syncStatus: { status: string | null; error: string | null };
}) {
  return {
    from(table: string) {
      if (table === 'orgs') {
        return {
          select() {
            return {
              eq() {
                return {
                  single: async () => ({ data: { id: 'org-1' } }),
                };
              },
            };
          },
        };
      }

      if (table === 'crm_integrations') {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      eq() {
                        return {
                          maybeSingle: async () => ({
                            data: {
                              id: 'int-1',
                              webhook_secret: 'segredo-teste',
                              is_active: true,
                            },
                          }),
                        };
                      },
                    };
                  },
                };
              },
            };
          },
          update(payload: { last_sync_status?: string; last_sync_error?: string | null }) {
            storage.syncStatus.status = payload.last_sync_status ?? null;
            storage.syncStatus.error = payload.last_sync_error ?? null;
            return {
              eq() {
                return {
                  eq() {
                    return Promise.resolve({ data: null });
                  },
                };
              },
            };
          },
        };
      }

      if (table === 'opportunities') {
        return {
          upsert(rows: Row[]) {
            for (const row of rows) {
              const key = `${String(row.org_id)}::${String(row.crm_hash)}`;
              storage.opportunities.set(key, row);
            }
            return Promise.resolve({ data: rows });
          },
        };
      }

      if (table === 'activities') {
        return {
          upsert(rows: Row[]) {
            for (const row of rows) {
              const key = `${String(row.org_id)}::${String(row.crm_activity_id)}`;
              storage.activities.set(key, row);
            }
            return Promise.resolve({ data: rows });
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('POST /api/crm/piperun/webhook', () => {
  it('ingere payload válido, deduplica e registra sincronização', async () => {
    const storage = {
      opportunities: new Map<string, Row>(),
      activities: new Map<string, Row>(),
      syncStatus: { status: null as string | null, error: null as string | null },
    };

    vi.mocked(createAdminClient).mockReturnValue(
      createAdminStub(storage) as unknown as ReturnType<typeof createAdminClient>
    );
    vi.mocked(checkRateLimit).mockResolvedValue({ limited: false });

    const payload = {
      org_id: 'org-1',
      opportunities: [
        {
          id_externo: 'deal-1',
          etapa: 'Proposta',
          valor: 12000,
          status: 'ganha',
        },
      ],
      activities: [
        {
          id_externo: 'act-1',
          opportunity_id_externo: 'deal-1',
          tipo: 'call',
          data: '2026-02-24T10:30:00Z',
        },
      ],
    };

    const buildRequest = () =>
      new Request('http://localhost/api/crm/piperun/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': 'segredo-teste',
      },
      body: JSON.stringify(payload),
    });

    const res = await POST(buildRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.processed.opportunities).toBe(1);
    expect(body.processed.activities).toBe(1);
    expect(body.metrics_status.version).toBe(2);

    expect(storage.opportunities.size).toBe(1);
    expect(storage.activities.size).toBe(1);
    expect(storage.syncStatus.status).toBe('ok');
    expect(dispatchReportRecompute).toHaveBeenCalledTimes(1);

    const resRepeat = await POST(buildRequest());
    expect(resRepeat.status).toBe(200);
    expect(storage.opportunities.size).toBe(1);
    expect(storage.activities.size).toBe(1);
  });

  it('retorna 400 para payload inválido', async () => {
    const req = new Request('http://localhost/api/crm/piperun/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opportunities: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('retorna 401 quando segredo do webhook está incorreto', async () => {
    const storage = {
      opportunities: new Map<string, Row>(),
      activities: new Map<string, Row>(),
      syncStatus: { status: null as string | null, error: null as string | null },
    };

    vi.mocked(createAdminClient).mockReturnValue(
      createAdminStub(storage) as unknown as ReturnType<typeof createAdminClient>
    );

    const req = new Request('http://localhost/api/crm/piperun/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': 'segredo-invalido',
      },
      body: JSON.stringify({
        org_id: 'org-1',
        opportunities: [{ id_externo: 'deal-1', status: 'aberta' }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
