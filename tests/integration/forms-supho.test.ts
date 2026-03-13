import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  requireApiAuth: vi.fn(async () => ({
    ok: true,
    user: { id: 'user-1', email: 'owner@example.com' },
  })),
  requireApiCampaignAccess: vi.fn(async (campaignId: string) => ({
    ok: true,
    user: { id: 'user-1', email: 'owner@example.com' },
    orgId: 'org-1',
    campaign: { id: campaignId, org_id: 'org-1' },
  })),
}));

vi.mock('@/lib/email/send', () => ({
  sendFormInviteEmail: vi.fn(async () => ({ ok: true })),
}));

const { createAdminClient } = await import('@/lib/supabase/admin');
const { requireApiCampaignAccess } = await import('@/lib/auth');
const { sendFormInviteEmail } = await import('@/lib/email/send');
const { POST: postInvites } = await import('@/app/api/forms/invites/route');
const { GET: getFormInfo } = await import('@/app/api/forms/supho/info/route');
const { POST: postFormResponse } = await import('@/app/api/forms/supho/respond/route');

type InviteRow = {
  id: string;
  email: string;
  name: string | null;
  token: string;
  form_slug: string;
  status: string;
  sent_at?: string | null;
  responded_at?: string | null;
};

type CampaignRow = { id: string; org_id: string; name: string };
type QuestionRow = {
  id: string;
  org_id: string | null;
  block: string | null;
  internal_weight: number | null;
  question_text: string | null;
  item_code: string | null;
  sort_order: number | null;
};
type RespondentRow = {
  id: string;
  campaign_id: string;
  role: string | null;
  responded_at: string;
  created_at: string;
};
type AnswerRow = { respondent_id: string; question_id: string; value: number };

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
        if (left == null) return orderBy.ascending ? -1 : 1;
        if (right == null) return orderBy.ascending ? 1 : -1;
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
    is(column: string, value: null) {
      filters.push((row) => (value === null ? row[column] == null : row[column] === value));
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

function createUpdateBuilder<T extends Record<string, unknown>>(rows: T[], payload: Partial<T>) {
  const filters: Array<(row: T) => boolean> = [];

  const apply = () => {
    for (const row of rows) {
      if (filters.every((filter) => filter(row))) {
        Object.assign(row, payload);
      }
    }
    return { data: null, error: null };
  };

  const builder = {
    eq(column: string, value: unknown) {
      filters.push((row) => row[column] === value);
      return builder;
    },
    then(resolve: (value: { data: null; error: null }) => void) {
      return Promise.resolve(apply()).then(resolve);
    },
  };

  return builder;
}

function createAdminStub(state: {
  invites: InviteRow[];
  campaigns: CampaignRow[];
  questions: QuestionRow[];
  respondents: RespondentRow[];
  answers: AnswerRow[];
}) {
  return {
    from(table: string) {
      if (table === 'form_invites') {
        return {
          select() {
            return createSelectBuilder(state.invites);
          },
          insert(row: Omit<InviteRow, 'id'>) {
            state.invites.push({
              id: `invite-${state.invites.length + 1}`,
              ...row,
            });
            return Promise.resolve({ data: null, error: null });
          },
          update(payload: Partial<InviteRow>) {
            return createUpdateBuilder(state.invites, payload);
          },
        };
      }

      if (table === 'supho_diagnostic_campaigns') {
        return {
          select() {
            return createSelectBuilder(state.campaigns);
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

      if (table === 'supho_respondents') {
        return {
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
                    return { data: { id: inserted.id }, error: null };
                  },
                };
              },
            };
          },
        };
      }

      if (table === 'supho_answers') {
        return {
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

      throw new Error(`Unexpected table ${table}`);
    },
  };
}

describe('SUPHO forms', () => {
  const baseState = () => ({
    invites: [
      {
        id: 'invite-1',
        email: 'ana@example.com',
        name: 'Ana',
        token: 'token-1',
        form_slug: 'supho-campaign-1',
        status: 'sent',
      },
    ] as InviteRow[],
    campaigns: [{ id: 'campaign-1', org_id: 'org-1', name: 'Diagnóstico Q1' }] as CampaignRow[],
    questions: [
      {
        id: 'q-global',
        org_id: null,
        block: 'A',
        internal_weight: 1,
        question_text: 'Pergunta global',
        item_code: 'A1',
        sort_order: 1,
      },
      {
        id: 'q-org',
        org_id: 'org-1',
        block: 'B',
        internal_weight: 2,
        question_text: 'Pergunta da organização',
        item_code: 'B1',
        sort_order: 2,
      },
    ] as QuestionRow[],
    respondents: [] as RespondentRow[],
    answers: [] as AnswerRow[],
  });

  beforeEach(() => {
    vi.resetAllMocks();
    const state = baseState();
    vi.mocked(createAdminClient).mockReturnValue(
      createAdminStub(state) as unknown as ReturnType<typeof createAdminClient>
    );
  });

  it('cria convite autenticado e envia email', async () => {
    const req = new Request('http://localhost/api/forms/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        form_slug: 'supho-campaign-1',
        form_name: 'Diagnóstico SUPHO',
        respondents: [{ email: 'novo@example.com', name: 'Novo' }],
      }),
    });

    const res = await postInvites(req as never);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(1);
    expect(body.failed).toEqual([]);
    expect(requireApiCampaignAccess).toHaveBeenCalledWith('campaign-1');
    expect(sendFormInviteEmail).toHaveBeenCalledTimes(1);
  });

  it('abre formulário público com perguntas globais e da organização', async () => {
    const req = new Request(
      'http://localhost/api/forms/supho/info?token=token-1&slug=supho-campaign-1'
    );

    const res = await getFormInfo(req as never);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.respondentName).toBe('Ana');
    expect(body.questions).toHaveLength(2);
    expect(body.questions.map((question: { id: string }) => question.id)).toEqual([
      'q-global',
      'q-org',
    ]);
  });

  it('bloqueia link já respondido e persistência duplicada', async () => {
    const state = baseState();
    vi.mocked(createAdminClient).mockReturnValue(
      createAdminStub(state) as unknown as ReturnType<typeof createAdminClient>
    );

    const firstResponse = await postFormResponse(
      new Request('http://localhost/api/forms/supho/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'token-1',
          slug: 'supho-campaign-1',
          answers: [
            { question_id: 'q-global', value: 4 },
            { question_id: 'q-org', value: 5 },
          ],
        }),
      }) as never
    );

    expect(firstResponse.status).toBe(200);
    expect(state.respondents).toHaveLength(1);
    expect(state.answers).toHaveLength(2);
    expect(state.invites[0]?.status).toBe('answered');

    const secondResponse = await postFormResponse(
      new Request('http://localhost/api/forms/supho/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'token-1',
          slug: 'supho-campaign-1',
          answers: [{ question_id: 'q-global', value: 3 }],
        }),
      }) as never
    );

    expect(secondResponse.status).toBe(400);
    const secondBody = await secondResponse.json();
    expect(secondBody.error).toContain('já foi utilizado');
  });

  it('rejeita payload com pergunta desconhecida', async () => {
    const res = await postFormResponse(
      new Request('http://localhost/api/forms/supho/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'token-1',
          slug: 'supho-campaign-1',
          answers: [{ question_id: 'q-inexistente', value: 4 }],
        }),
      }) as never
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('perguntas desconhecidas');
  });
});
