import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  requireApiUserOrgAccess: vi.fn(async () => ({
    ok: true,
    user: { id: 'user-1', email: 'owner@example.com' },
    orgId: 'org-1',
  })),
}));

const { createAdminClient } = await import('@/lib/supabase/admin');
const { GET: getTemplates, POST: postTemplate } = await import(
  '@/app/api/supho/rituals/templates/route'
);

type TemplateRow = {
  id: string;
  org_id: string;
  type: string;
  cadence: string | null;
  default_agenda: string | null;
  created_at: string;
};

function createTemplatesStub(templates: TemplateRow[]) {
  return {
    from(table: string) {
      if (table !== 'supho_ritual_templates') {
        throw new Error(`Unexpected table ${table}`);
      }
      return {
        select(_columns: string) {
          return {
            eq(_col: string, value: unknown) {
              const filtered = templates.filter((t) => t.org_id === value);
              return {
                order(_col: string, _opts?: { ascending?: boolean }) {
                  const sorted = [...filtered].sort((a, b) =>
                    a.type.localeCompare(b.type)
                  );
                  return {
                    then(resolve: (v: { data: TemplateRow[] | null; error: null }) => void) {
                      Promise.resolve({ data: sorted, error: null }).then(resolve);
                    },
                  };
                },
              };
            },
            order(_col: string, _opts?: { ascending?: boolean }) {
              const sorted = [...templates].sort((a, b) =>
                a.type.localeCompare(b.type)
              );
              return {
                then(resolve: (v: { data: TemplateRow[] | null; error: null }) => void) {
                  Promise.resolve({ data: sorted, error: null }).then(resolve);
                },
              };
            },
          };
        },
        insert(row: Omit<TemplateRow, 'id' | 'created_at'>) {
          const created: TemplateRow = {
            id: `tpl-${templates.length + 1}`,
            created_at: new Date().toISOString(),
            ...row,
          };
          templates.push(created);
          const result = {
            select(_columns: string) {
              return {
                single() {
                  return Promise.resolve({
                    data: {
                      id: created.id,
                      type: created.type,
                      cadence: created.cadence,
                      default_agenda: created.default_agenda,
                      created_at: created.created_at,
                    },
                    error: null,
                  });
                },
              };
            },
          };
          result.then = (resolve: (v: unknown) => void) =>
            Promise.resolve(undefined).then(() => resolve({ data: null, error: null }));
          return result;
        },
      };
    },
  };
}

describe('SUPHO rituals templates API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('GET retorna templates existentes da org', async () => {
    const templates: TemplateRow[] = [
      {
        id: 'tpl-1',
        org_id: 'org-1',
        type: 'checkin_weekly',
        cadence: 'Semanal',
        default_agenda: 'Check-in semanal.',
        created_at: new Date().toISOString(),
      },
    ];
    vi.mocked(createAdminClient).mockReturnValue(
      createTemplatesStub(templates) as never
    );

    const res = await getTemplates(
      new Request('http://localhost/api/supho/rituals/templates') as never
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      id: 'tpl-1',
      type: 'checkin_weekly',
      cadence: 'Semanal',
      default_agenda: 'Check-in semanal.',
    });
  });

  it('POST cria template com type válido e retorna o criado', async () => {
    const templates: TemplateRow[] = [];
    vi.mocked(createAdminClient).mockReturnValue(
      createTemplatesStub(templates) as never
    );

    const res = await postTemplate(
      new Request('http://localhost/api/supho/rituals/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'feedback_monthly',
          cadence: 'Mensal',
          default_agenda: 'Feedback mensal customizado.',
        }),
      }) as never
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({
      type: 'feedback_monthly',
      cadence: 'Mensal',
      default_agenda: 'Feedback mensal customizado.',
    });
    expect(data.id).toBeDefined();
    expect(data.created_at).toBeDefined();
    expect(templates).toHaveLength(1);
    expect(templates[0].org_id).toBe('org-1');
  });

  it('POST retorna 400 sem type', async () => {
    const templates: TemplateRow[] = [];
    vi.mocked(createAdminClient).mockReturnValue(
      createTemplatesStub(templates) as never
    );

    const res = await postTemplate(
      new Request('http://localhost/api/supho/rituals/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cadence: 'Semanal' }),
      }) as never
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('type');
  });

  it('POST retorna 400 com type inválido', async () => {
    const templates: TemplateRow[] = [];
    vi.mocked(createAdminClient).mockReturnValue(
      createTemplatesStub(templates) as never
    );

    const res = await postTemplate(
      new Request('http://localhost/api/supho/rituals/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'invalid_type' }),
      }) as never
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('type');
  });

  it('POST retorna 400 com body JSON inválido', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      createTemplatesStub([]) as never
    );

    const res = await postTemplate(
      new Request('http://localhost/api/supho/rituals/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      }) as never
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});
