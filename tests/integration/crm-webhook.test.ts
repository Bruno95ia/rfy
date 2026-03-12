import { describe, it, expect, vi, beforeEach } from 'vitest';

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

vi.mock('@/inngest/client', () => ({
  inngest: {
    send: vi.fn(async () => {}),
  },
}));

const { createAdminClient } = await import('@/lib/supabase/admin');
const { checkRateLimit } = await import('@/lib/ratelimit');
const { inngest } = await import('@/inngest/client');
const { POST } = await import('@/app/api/crm/webhook/route');

type InsertedRow = Record<string, unknown>;

function createAdminStub(storage: {
  opportunities: InsertedRow[];
  activities: InsertedRow[];
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
                    return Promise.resolve({ data: [] });
                  },
                };
              },
            };
          },
        };
      }

      if (table === 'org_api_keys') {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      maybeSingle: async () => ({ data: null }),
                    };
                  },
                };
              },
            };
          },
          update() {
            return {
              eq() {
                return Promise.resolve({ data: null });
              },
            };
          },
        };
      }

      if (table === 'opportunities') {
        return {
          upsert(rows: InsertedRow[], _opts?: unknown) {
            storage.opportunities.push(...rows);
            return Promise.resolve({ data: rows });
          },
        };
      }

      if (table === 'activities') {
        return {
          insert(rows: InsertedRow[]) {
            storage.activities.push(...rows);
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

describe('POST /api/crm/webhook', () => {
  it('processa oportunidades e atividades válidas e persiste no banco (mock)', async () => {
    const storage = { opportunities: [] as InsertedRow[], activities: [] as InsertedRow[] };
    vi.mocked(createAdminClient).mockReturnValue(
      createAdminStub(storage) as unknown as ReturnType<typeof createAdminClient>
    );
    vi.mocked(checkRateLimit).mockResolvedValue({ limited: false });

    const payload = {
      org_id: 'org-1',
      opportunities: [
        {
          crm_hash: 'deal-1',
          pipeline_name: 'Vendas',
          stage_name: 'Proposta',
          owner_email: 'vendedor@example.com',
          value: 1000,
          status: 'ganha',
        },
      ],
      activities: [
        {
          crm_activity_id: 'act-1',
          type: 'call',
          title: 'Ligação de follow-up',
          linked_opportunity_hash: 'deal-1',
        },
      ],
    };

    const request = new Request('http://localhost/api/crm/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.processed.opportunities).toBe(1);
    expect(body.processed.activities).toBe(1);

    expect(storage.opportunities).toHaveLength(1);
    expect(storage.opportunities[0]?.crm_hash).toBe('deal-1');
    expect(storage.opportunities[0]?.status).toBe('won');
    expect(storage.opportunities[0]?.value).toBe(1000);

    expect(storage.activities).toHaveLength(1);
    expect(storage.activities[0]?.crm_activity_id).toBe('act-1');
    expect(storage.activities[0]?.linked_opportunity_hash).toBe('deal-1');

    expect(inngest.send).toHaveBeenCalledWith({
      name: 'report/compute',
      data: { orgId: 'org-1' },
    });
  });

  it('responde 400 quando org_id está ausente', async () => {
    const request = new Request('http://localhost/api/crm/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opportunities: [] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('org_id obrigatório');
  });

  it('responde 429 quando rate limit é atingido', async () => {
    const storage = { opportunities: [] as InsertedRow[], activities: [] as InsertedRow[] };
    vi.mocked(createAdminClient).mockReturnValue(
      createAdminStub(storage) as unknown as ReturnType<typeof createAdminClient>
    );
    vi.mocked(checkRateLimit).mockResolvedValue({ limited: true });

    const request = new Request('http://localhost/api/crm/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: 'org-1', opportunities: [] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toContain('Muitas requisições');
  });
});

