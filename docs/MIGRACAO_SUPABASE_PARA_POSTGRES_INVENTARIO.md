# FASE 1 — Inventário: dependências Supabase → PostgreSQL

## 1. Classificação por categoria

### Auth
- **src/lib/auth.ts**: `createClient()` + `supabase.auth.getUser()`, `createAdminClient()` para org_members/orgs.
- **src/app/api/auth/callback/route.ts**: `exchangeCodeForSession(code)` (magic link).
- **src/app/api/auth/signout/route.ts**: `supabase.auth.signOut()`.
- **src/app/(auth)/login/page.tsx**: `createClient()` + `supabase.auth.signInWithPassword({ email, password })`.
- **src/app/(auth)/signup/page.tsx**: `createClient()` + `supabase.auth.signUp({ email, password, options })`.
- **src/app/invite/accept/page.tsx**: `createClient()` + `supabase.auth.getUser()`.
- **src/proxy.ts**: `createServerClient()` + `supabase.auth.getUser()` para proteger /app e redirecionar.
- **src/app/page.tsx**: `createClient()` + `supabase.auth.getUser()`; redirect /setup se sem NEXT_PUBLIC_SUPABASE_URL.
- **src/app/dashboard/page.tsx**: `createClient()` + `supabase.auth.getUser()`.
- Todas as rotas API que checam auth: `createClient()` + `getUser()`.

### Sessão / cookies
- **@supabase/ssr**: `createServerClient` / `createBrowserClient` gerenciam cookies de sessão Supabase.
- **src/lib/supabase/server.ts**: usa `cookies()` do Next e `setAll`/`getAll` para sessão.

### SSR client
- **src/lib/supabase/server.ts**: `createClient()` exige `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; usado em páginas server e API routes.

### Browser client
- **src/lib/supabase/client.ts**: `createBrowserClient()`; usado em login, signup, invite/accept (client-side auth).

### Admin operations
- **src/lib/supabase/admin.ts**: `createAdminClient()` exige `SUPABASE_SERVICE_ROLE_KEY`.
- Usado em: auth.ts (provisionOrgOnFirstLogin, getOrgIdForUser, userHasOrgAccess, getOrgMemberRole), storage.ts, upload/route, usage/track, settings, reports executive pdf/csv, supho/*, simulations/rfy, admin/reset-demo, inngest (process-upload-*, link-activities, compute-report, report-schedules-send, alerts-evaluate, piperun-sync), libs: billing, report-compute-persist, recompute-report, metrics/status, alerts/evaluate, crm/providers/piperun/webhook, upload-process.

### Storage
- **src/lib/storage.ts**: `createAdminClient().storage.from('uploads').download(storagePath)`.
- **src/app/api/upload/route.ts**: `admin.storage.from('uploads').upload(filename, buffer, { contentType, upsert })`.

### Setup / onboarding
- **src/app/(auth)/setup/page.tsx**: texto e ENV para Supabase local/cloud; checklist “Bucket uploads criado”, “Schema e migrations”, variáveis Supabase.
- **src/app/page.tsx**: redirect para /setup se `!process.env.NEXT_PUBLIC_SUPABASE_URL`.

### Rotas API (auth + dados)
- **api/usage/track, api/upload, api/settings, api/supho/**, **api/org/**, **api/integrations/piperun/**, **api/demo/upload-pack, api/admin/reset-demo**: `createClient()` + `getUser()` e/ou `createAdminClient()` + `.from()`.
- **api/auth/callback, api/auth/signout**: 100% Supabase Auth.

### Páginas server-side
- **src/app/page.tsx, dashboard/page.tsx, app/layout.tsx, app/dashboard/page.tsx, app/uploads/page.tsx, app/reports/page.tsx, app/settings/page.tsx, app/supho/paip/maturidade/diagnostico/page.tsx, app/copilot-contas/page.tsx, invite/accept/page.tsx**: todas usam `createClient()` e `supabase.auth.getUser()` e/ou `supabase.from(...)`.

### Testes
- **tests/unit/metrics-status.test.ts, reports-executive-data.test.ts, alerts-recalc.test.ts**: tipo `SupabaseClient` e mocks de admin.
- **tests/integration/piperun-webhook.test.ts, crm-webhook.test.ts**: `vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))`.

---

## 2. Pontos críticos que impedem o app sem Supabase

1. **Autenticação**: todo login/signup/sessão depende de Supabase Auth (getUser, signInWithPassword, signUp, signOut, exchangeCodeForSession). Sem isso, nenhuma rota protegida funciona.
2. **Middleware/proxy**: `src/proxy.ts` usa `createServerClient` + `getUser()` para decidir redirect /login vs /app; sem Supabase não há “usuário” e tudo vai para /setup ou /login.
3. **Variáveis obrigatórias**: `getEnv()` em client.ts, server.ts e admin.ts lança se `NEXT_PUBLIC_SUPABASE_*` ou `SUPABASE_SERVICE_ROLE_KEY` ausentes; app quebra antes de rodar.
4. **Leitura do usuário no server**: todas as páginas e APIs que precisam do “usuário atual” chamam `supabase.auth.getUser()`. Sem substituição por sessão própria (ex.: cookie + tabela `app_sessions` + `app_users`), não há identidade.
5. **Acesso a dados**: hoje o código usa `supabase.from('org_members')`, `.from('orgs')`, etc. O backend real é PostgreSQL (DATABASE_URL); Supabase JS é só cliente HTTP para PostgREST. É preciso uma camada que fale com o Postgres diretamente (ex.: `pg`) mantendo o mesmo contrato (por exemplo `{ data, error }`) ou refatorar para queries explícitas.
6. **Storage**: upload e download de CSVs usam Supabase Storage. Para rodar sem Supabase é necessário fallback (ex.: filesystem ou S3) com TODO documentado.
7. **Setup**: a tela /setup fala só de Supabase; precisa falar de DATABASE_URL e opcionalmente storage/local.
8. **Script create-demo-admin.js**: cria usuário via `admin.auth.admin.createUser` e org via `admin.from('orgs')`; precisa criar usuário em `app_users` e sessão/org via PostgreSQL.

---

## 3. Resumo dos arquivos a alterar (principais)

| Arquivo | Uso Supabase |
|--------|----------------|
| src/lib/supabase/client.ts | Browser client (auth) |
| src/lib/supabase/server.ts | SSR client (auth + from) |
| src/lib/supabase/admin.ts | Admin client (from + storage) |
| src/lib/auth.ts | requireAuth, provisionOrg, getOrgId, requireAuthAndOrgAccess, userHasOrgAccess, getOrgMemberRole |
| src/lib/storage.ts | getObjectBody (storage.download) |
| src/proxy.ts | createServerClient + getUser |
| src/app/page.tsx | redirect setup, createClient + getUser |
| src/app/(auth)/login/page.tsx | signInWithPassword |
| src/app/(auth)/signup/page.tsx | signUp |
| src/app/(auth)/setup/page.tsx | Conteúdo Supabase |
| src/app/dashboard/page.tsx, app/layout.tsx, app/dashboard/page.tsx, app/uploads/page.tsx, app/reports/page.tsx, app/settings/page.tsx, app/supho/*/page.tsx, app/copilot-contas/page.tsx | createClient + getUser + from() |
| src/app/invite/accept/page.tsx | createClient + getUser |
| src/app/api/auth/* | callback, signout |
| src/app/api/upload/route.ts | getUser + admin.from + storage.upload |
| src/app/api/settings/route.ts, api/usage/track, api/supho/**, api/org/**, api/integrations/piperun/*, api/demo/upload-pack, api/admin/reset-demo, api/reports/executive.*, api/simulations/rfy | createClient/createAdminClient + getUser/from |
| inngest/functions/* | createAdminClient |
| src/lib/billing.ts, report-compute-persist.ts, recompute-report.ts, metrics/status.ts, alerts/evaluate.ts, crm/providers/piperun/webhook.ts, upload-process.ts | admin: SupabaseClient |
| scripts/create-demo-admin.js | Supabase auth.admin + from('orgs') |
| tests (unit + integration) | Mocks e tipos Supabase |

---

Este inventário orienta a FASE 2 (nova camada de autenticação e dados) e a FASE 3 (refatoração funcional).
