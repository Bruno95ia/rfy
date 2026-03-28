import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  requireApiAuth: vi.fn(async () => ({
    ok: true,
    user: { id: 'user-1', email: 'owner@example.com' },
  })),
  requireApiUserOrgAccess: vi.fn(async () => ({
    ok: true,
    user: { id: 'user-1', email: 'owner@example.com' },
    orgId: 'org-1',
  })),
  requireApiCampaignAccess: vi.fn(),
}));

const { createAdminClient } = await import('@/lib/supabase/admin');
const { requireApiCampaignAccess } = await import('@/lib/auth');
const { GET: getCampaigns, POST: postCampaign } = await import('@/app/api/supho/campaigns/route');
const { GET: getRespondents, POST: postRespondent } = await import('@/app/api/supho/respondents/route');
const { POST: postAnswers } = await import('@/app/api/supho/answers/route');
const { POST: postDiagnostic } = await import('@/app/api/supho/diagnostic/compute/route');

type CampaignRow = {
  id: string;
  org_id: string;
  name: string;
  status: string;
  created_at: string;
  started_at?: string | null;
  closed_at?: string | null;
};
type RespondentRow = {
  id: string;
  campaign_id: string;
  responded_at: string;
  created_at: string;
  role: string | null;
  time_area?: string | null;
  unit?: string | null;
};
type AnswerRow = { respondent_id: string; question_id: string; value: number };
type QuestionRow = {
  id: string;
  block: 'A' | 'B' | 'C';
  internal_weight: number;
  item_code: string | null;
};
type DiagnosticResultRow = Record<string, unknown>;

function createSelectBuilder<T extends Record<string, unknown>>(rows: T[]) {
  const filters: Array<(row: T) => boolean> = [];
  let orderBy: { column: string; ascending: boolean } | null = null;

  const apply = () => {
    const data = rows
      .filter((row) => filters.every((filter) => filter(row)))
      .map((row) => ({ ...row }));
    if (orderBy) {
      data.sort((a, b) => {
        const left = a[orderBy.column];
        const right = b[orderBy.column];
        if (left === right) return 0;
        return String(left).localeCompare(String(right), 'pt-BR', { numeric: true }) * (orderBy.ascending ? 1 : -1);
      });
    }
    return data;
  };

  const builder = {
    select() {
      return builder;
    },
    eq(column: string, value: unknown) {
      filters.push((row) => row[column] === value);
      return builder;
    },
    in(column: string, values: unknown[]) {
      const set = new Set(values.map((value) => String(value)));
      filters.push((row) => set.has(String(row[column])));
      return builder;
    },
    order(column: string, opts?: { ascending?: boolean }) {
      orderBy = { column, ascending: opts?.ascending !== false };
      return builder;
    },
    async single() {
      return { data: apply()[0] ?? null, error: null };
    },
    async maybeSingle() {
      return { data: apply()[0] ?? null, error: null };
    },
    then(resolve: (value: { data: T[]; error: null }) => void) {
      return Promise.resolve({ data: apply(), error: null }).then(resolve);
    },
  };

  return builder;
}

function createAdminStub(state: {
  campaigns: CampaignRow[];
  respondents: RespondentRow[];
  answers: AnswerRow[];
  questions: QuestionRow[];
  results: DiagnosticResultRow[];
}) {
  return {
    from(table: string) {
      if (table === 'supho_diagnostic_campaigns') {
        return {
          select() {
            return createSelectBuilder(state.campaigns);
          },
          insert(row: Omit<CampaignRow, 'id' | 'created_at'>) {
            const inserted: CampaignRow = {
              id: `campaign-${state.campaigns.length + 1}`,
              created_at: new Date().toISOString(),
              ...row,
            };
            state.campaigns.push(inserted);
            return {
              select() {
                return {
                  async single() {
                    return {
                      data: {
                        id: inserted.id,
                        name: inserted.name,
                        status: inserted.status,
                        created_at: inserted.created_at,
                      },
                      error: null,
                    };
                  },
                };
              },
            };
          },
        };
      }

      if (table === 'supho_respondents') {
        return {
          select() {
            return createSelectBuilder(state.respondents);
          },
          insert(row: Omit<RespondentRow, 'id' | 'created_at'>) {
            const inserted: RespondentRow = {
              id: `resp-${state.respondents.length + 1}`,
              created_at: new Date().toISOString(),
              ...row,
            };
            state.respondents.push(inserted);
            return {
              select() {
                return {
                  async single() {
                    return {
                      data: {
                        id: inserted.id,
                        campaign_id: inserted.campaign_id,
                        responded_at: inserted.responded_at,
                        created_at: inserted.created_at,
                      },
                      error: null,
                    };
                  },
                };
              },
            };
          },
        };
      }

      if (table === 'supho_answers') {
        return {
          select() {
            return createSelectBuilder(state.answers);
          },
          upsert(rows: AnswerRow[]) {
            for (const row of rows) {
              const existing = state.answers.find(
                (item) =>
                  item.respondent_id === row.respondent_id &&
                  item.question_id === row.question_id
              );
              if (existing) {
                existing.value = row.value;
              } else {
                state.answers.push({ ...row });
              }
            }
            return Promise.resolve({ data: null, error: null });
          },
        };
      }

      if (table === 'supho_questions') {
        return {
          select() {
            return createSelectBuilder(state.questions);
          },
        };
      }

      if (table === 'supho_diagnostic_results') {
        return {
          insert(row: DiagnosticResultRow) {
            state.results.push({ ...row });
            return Promise.resolve({ data: null, error: null });
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
                      limit() {
                        return Promise.resolve({ data: [], error: null });
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }

      if (table === 'org_config') {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return { data: { erp_integration_status: 'unknown' }, error: null };
                  },
                };
              },
            };
          },
        };
      }

      if (table === 'org_context_documents') {
        return {
          select() {
            return {
              eq() {
                return Promise.resolve({ data: [], error: null });
              },
            };
          },
        };
      }

      if (table === 'org_knowledge_files') {
        return {
          select() {
            return {
              eq() {
                return {
                  is() {
                    return Promise.resolve({ data: [], error: null });
                  },
                  eq() {
                    return Promise.resolve({ data: [], error: null });
                  },
                };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };
}

describe('SUPHO authenticated APIs', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('cria campanha, cadastra respondente, salva respostas e calcula diagnóstico', async () => {
    const state = {
      campaigns: [] as CampaignRow[],
      respondents: [] as RespondentRow[],
      answers: [] as AnswerRow[],
      questions: [
        { id: 'q-a', block: 'A', internal_weight: 1, item_code: 'A11' },
        { id: 'q-b', block: 'B', internal_weight: 1, item_code: 'B6' },
        { id: 'q-c', block: 'C', internal_weight: 1, item_code: 'A2' },
      ] as QuestionRow[],
      results: [] as DiagnosticResultRow[],
    };

    vi.mocked(createAdminClient).mockReturnValue(
      createAdminStub(state) as unknown as ReturnType<typeof createAdminClient>
    );
    vi.mocked(requireApiCampaignAccess).mockImplementation(async (campaignId: string) => {
      const campaign = state.campaigns.find((item) => item.id === campaignId) ?? null;
      if (!campaign) {
        return {
          ok: false,
          response: Response.json({ error: 'Campanha não encontrada' }, { status: 404 }),
        } as never;
      }
      return {
        ok: true,
        user: { id: 'user-1', email: 'owner@example.com' },
        orgId: campaign.org_id,
        campaign: { id: campaign.id, org_id: campaign.org_id },
      } as const;
    });

    const createCampaignRes = await postCampaign(
      new Request('http://localhost/api/supho/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Campanha de clima', status: 'open' }),
      }) as never
    );
    expect(createCampaignRes.status).toBe(200);
    const createdCampaign = await createCampaignRes.json();

    const listCampaignsRes = await getCampaigns(
      new Request('http://localhost/api/supho/campaigns') as never
    );
    expect(listCampaignsRes.status).toBe(200);
    const campaigns = await listCampaignsRes.json();
    expect(campaigns).toHaveLength(1);
    expect(campaigns[0]?.id).toBe(createdCampaign.id);

    const createRespondentRes = await postRespondent(
      new Request('http://localhost/api/supho/respondents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: createdCampaign.id }),
      }) as never
    );
    expect(createRespondentRes.status).toBe(200);
    const respondent = await createRespondentRes.json();

    const answersRes = await postAnswers(
      new Request('http://localhost/api/supho/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          respondent_id: respondent.id,
          answers: [
            { question_id: 'q-a', value: 4 },
            { question_id: 'q-b', value: 5 },
            { question_id: 'q-c', value: 3 },
          ],
        }),
      }) as never
    );
    expect(answersRes.status).toBe(200);

    const listRespondentsRes = await getRespondents(
      new Request(
        `http://localhost/api/supho/respondents?campaign_id=${encodeURIComponent(createdCampaign.id)}`
      ) as never
    );
    expect(listRespondentsRes.status).toBe(200);
    const respondents = await listRespondentsRes.json();
    expect(respondents).toHaveLength(1);

    const computeRes = await postDiagnostic(
      new Request('http://localhost/api/supho/diagnostic/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: createdCampaign.id }),
      }) as never
    );
    expect(computeRes.status).toBe(200);

    const computeBody = await computeRes.json();
    expect(computeBody.ok).toBe(true);
    expect(computeBody.result.sampleSize).toBe(1);
    expect(state.results).toHaveLength(1);
  });

  it('retorna 403 ao listar respondentes sem acesso à campanha', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      createAdminStub({
        campaigns: [],
        respondents: [],
        answers: [],
        questions: [],
        results: [],
      }) as unknown as ReturnType<typeof createAdminClient>
    );
    vi.mocked(requireApiCampaignAccess).mockResolvedValue({
      ok: false,
      response: Response.json({ error: 'Sem acesso a esta campanha' }, { status: 403 }),
    } as never);

    const res = await getRespondents(
      new Request('http://localhost/api/supho/respondents?campaign_id=campaign-1') as never
    );
    expect(res.status).toBe(403);
  });
});
