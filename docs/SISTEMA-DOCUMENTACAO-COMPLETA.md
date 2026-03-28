# Documentação completa do sistema RFY (Revenue Friction Engine)

Este documento é a **referência técnica consolidada** da aplicação: arquitetura, módulos, rotas, dados, integrações e operação. Complementa (não substitui) os guias temáticos em `docs/` listados na [secção Documentação relacionada](#documentação-relacionada).

---

## 1. Visão geral

### 1.1 Propósito

O **RFY** é um SaaS **multi-tenant** para equipas de revenue e vendas: ingere dados de pipeline (CSV PipeRun, uploads, webhooks CRM), calcula métricas e fricções, expõe **dashboard** executivo, **relatórios**, **alertas**, **previsão** e, quando configurado, camadas de **IA** (forecast, benchmark, intervenções). O módulo **SUPHO** integra diagnóstico de maturidade, campanhas, rituais, PAIP e certificação no mesmo produto (`/app/supho/*`).

### 1.2 Stack principal

| Camada | Tecnologia |
|--------|------------|
| Frontend + API | **Next.js 16** (App Router), **React 19**, **TypeScript**, **Tailwind CSS 4** |
| Base de dados | **PostgreSQL** (pool `pg`; acesso servidor via cliente “admin” compatível com API estilo Supabase) |
| Auth | **Própria**: `app_users`, `app_sessions`, cookie `rfy_session`, hash **scrypt** |
| Jobs assíncronos | **Inngest** (opcional) |
| IA / ML | Serviço externo HTTP (**AI_SERVICE_URL**); opcional **Google AI** para ICP/copilot |
| Pagamentos | **Stripe** (checkout, webhook) |
| Rate limit | **Upstash Redis** (opcional) |
| E-mail | **Resend** (opcional) |
| Testes | **Vitest** (unit/integration), **Playwright** (E2E) |

### 1.3 Repositório e pastas relevantes

```
src/
  app/                    # App Router: páginas e Route Handlers
    (auth)/               # Login, signup, setup
    app/                  # Área autenticada (/app/*)
    api/                  # REST / JSON (77+ route.ts)
  components/             # UI reutilizável (layout, ui, etc.)
  lib/                    # Lógica de negócio, auth, db, CRM, SUPHO, métricas, IA
  types/                  # Tipos gerados (ex.: database.ts)
docs/                     # Documentação temática (metodologia, design, infra)
scripts/                  # DB, demo, migrações
tests/                    # unit, integration, e2e
```

---

## 2. Arquitetura de execução

### 2.1 Modelo de deploy

- Build **Next.js** com saída adequada a **standalone** (`start:standalone` copia `.next/static` e `public`).
- O servidor Node serve UI e **API routes** no mesmo processo (monólito).

### 2.2 Fluxo de pedido típico

1. Browser → rota `src/app/.../page.tsx` (RSC) ou cliente.
2. Dados sensíveis → **servidor** (`requireAuth`, `createAdminClient()`).
3. PostgreSQL via **`DATABASE_URL`** (e opcionalmente **`AI_DATABASE_URL`** para o serviço de IA em Python).
4. Trabalhos longos (pós-upload, relatórios) → **Inngest** quando configurado.

### 2.3 Cliente de base de dados

- **`createAdminClient()`** (`src/lib/supabase/admin.ts` → `src/lib/db/admin.ts`): emula `from().select().eq()...` com lista **allowlist** de tabelas (segurança).
- **`createClient()`** em `src/lib/supabase/server.ts`: cliente Supabase para leituras que ainda usam a stack Supabase onde aplicável; grande parte dos dados críticos migrou para PG direto.

### 2.4 Serviço de IA

- URL efetiva: **`getEffectiveAiServiceUrl()`** (`src/lib/ai-deployment.ts`) — alinha com **`AI_SERVICE_URL`** ou default local em desenvolvimento.
- Badge na shell: **`isAiServiceConfigured()`** (env explícita ou `NODE_ENV === 'development'`).
- Rotas proxy em `src/app/api/ai/*` chamam o serviço HTTP (health, forecast, benchmark, etc.).

---

## 3. Autenticação e organizações

### 3.1 Sessão

- Cookie **`rfy_session`** = UUID da linha em **`app_sessions`**.
- Funções centrais: `src/lib/auth-session.ts` (login, logout, `getCurrentUser`).
- Rotas protegidas: **`requireAuth()`** (`src/lib/auth.ts`) → redirect `/login`.

### 3.2 Organização (tenant)

- **`orgs`**, **`org_members`** (papel: `owner` | `admin` | `manager` | `viewer`).
- **`getOrgIdForUser`**: escolhe org por maior privilégio.
- **`getOrgMemberRole`**: papel efetivo; role em falta na linha → tratado como **`viewer`** (fallback).
- **`provisionOrgOnFirstLogin`**: cria org default e membership.
- Nome para UI: **`getOrgDisplayName(orgId)`** (`src/lib/org/display.ts`).

### 3.3 Convites e membros

- APIs em `src/app/api/org/members`, `org/invites`, `org/invites/[id]`, `org/invites/accept`.
- Restrições por papel alinhadas a `getOrgMemberRole` (gestores não promovem acima do permitido, etc.).

---

## 4. Área autenticada (UI)

### 4.1 Layout

- **`src/app/app/layout.tsx`**: sessão, org, `AppShell`, `aiActive`, nome da org.
- **`src/components/layout/AppShell.tsx`**: sidebar por categorias (Torre de Controle, Performance, SUPHO, Data), top bar (badge IA, upload CSV, tema, menu conta).

### 4.2 Mapa de rotas `/app` (principais)

| Rota | Função |
|------|--------|
| `/app/dashboard` | Control Deck RFY, relatório, SUPHO resumo, onboarding |
| `/app/reports`, `/app/forecast`, `/app/ai`, `/app/copilot-contas` | Performance e IA |
| `/app/supho/*` | Diagnóstico, maturidade, PAIP, rituais, certificação |
| `/app/uploads` | Uploads CSV |
| `/app/pessoas` | Pessoas da org |
| `/app/integracoes` | Hub de integrações |
| `/app/settings` | Configurações centrais |
| `/app/settings/contexto-organizacao` | Contexto para diagnóstico |
| `/app/settings/context-pack` | Context Pack |
| `/app/settings/conhecimento` | Repositório de conhecimento |

---

## 5. APIs HTTP (domínios)

Todas sob **`/api/*`**. Lista não exaustiva, agrupada por domínio:

| Domínio | Caminho base | Notas |
|---------|----------------|-------|
| Auth | `/api/auth/login`, `signup`, `signout`, `demo`, `callback` | Sessão cookie |
| Org | `/api/org/members`, `invites`, `people`, `knowledge`, `context-documents` | RBAC por rota |
| Upload | `/api/upload`, `reprocess` | Ficheiros, pipeline |
| Settings | `/api/settings` | Org, CRM, forecast, billing interno |
| Reports | `/api/reports/executivo`, `executive.csv`, `executive.xlsx`, `executive.pdf` | Exportações |
| Métricas | `/api/metrics/summary`, `status` | RFY summary, status |
| Alertas | `/api/alerts/*` | Regras, canais, eventos |
| IA | `/api/ai/forecast`, `benchmark`, `deal`, `interventions`, `train`, `status`, `icp-analysis`, `copilot-revenue` | Proxy para AI service |
| CRM | `/api/crm/webhook`, `piperun/webhook` | Entrada de dados |
| Integrações | `/api/integrations/piperun/*` | PipeRun |
| SUPHO | `/api/supho/*` | Campanhas, respostas, diagnóstico, rituais, certificação, import |
| Billing | `/api/billing/checkout`, `webhook`, `status` | Stripe |
| Admin | `/api/admin/users`, `reset-demo` | Plataforma |
| Inngest | `/api/inngest` | Webhook de funções |
| Demo | `/api/demo/*` | Templates e packs de demo |

Detalhes de contrato: ver cada `route.ts` (validação **Zod** onde aplicável).

---

## 6. Dados e tabelas (resumo)

O cliente admin permite um conjunto fixo de tabelas, incluindo entre outras:

- **Core SaaS**: `orgs`, `org_members`, `org_invites`, `org_config`, `org_subscriptions`, `org_audit_logs`, `app_users`, `app_sessions`
- **Pipeline**: `uploads`, `opportunities`, `activities`, `reports`
- **Produto**: `crm_integrations`, `forecast_scenarios`, `quarterly_goals`, `usage_limits`, `usage_events`
- **Alertas**: `alert_channels`, `alert_rules`, `alert_events`, `alerts`
- **Contexto**: `org_context_documents`, `org_knowledge_files`, `org_unit_economics`
- **SUPHO**: `supho_campaigns`, `supho_diagnostic_*`, `supho_answers`, `supho_rituals_*`, etc.

Schema e evolução: migrations em `scripts/` / SQL versionado (ver `npm run db:migrate*` no README).

---

## 7. Variáveis de ambiente

Referência: **`.env.example`** na raiz. Principais:

| Variável | Função |
|----------|--------|
| `DATABASE_URL` | PostgreSQL principal (obrigatório em produção) |
| `AI_DATABASE_URL` | Opcional; AI service pode usar base separada |
| `AI_SERVICE_URL` | URL do serviço de inferência (forecast, etc.) |
| `NEXT_PUBLIC_APP_URL` | URL pública (links, redirects) |
| `UPLOAD_DIR` | Diretório de uploads em disco |
| `ENCRYPTION_KEY` | Secrets (API keys, webhooks) |
| `GOOGLE_AI_API_KEY` | Recursos Gemini (ICP, copilot) |
| Stripe / Resend / Upstash / Inngest | Conforme `README.md` e `.env.example` |

---

## 8. Processamento de uploads e relatórios

- Upload → gravação + fila **Inngest** ou processamento conforme configuração.
- Relatórios e métricas: ver `src/lib/report-compute-persist.ts`, `metrics/compute.ts`, `alerts/evaluate.ts`.
- Política de dados/modelo: **`docs/DATA_AND_MODEL_POLICY.md`**.

---

## 9. Testes e qualidade

| Comando | Descrição |
|---------|-----------|
| `npm run lint` | ESLint em `src/` |
| `npm test` | Vitest com coverage |
| `npm run test:e2e` | Playwright |
| `npm run test:e2e:smoke` | Subconjunto crítico (auth + dashboard/SUPHO) |

Testes em `tests/unit`, `tests/integration`, `tests/e2e`.

---

## 10. Operação e infraestrutura

- **Docker / Postgres local**: `docs/DOCKER.md`, scripts `db:up`, `db:migrate`, `db:seed`.
- **AWS / deploy**: `docs/INFRAESTRUTURA_AWS.md`.
- **Backup**: `docs/BACKUP-RESTORE.md`, `docs/BACKUP_ESTRUTURA_*.md`.
- **Git**: `docs/GIT.md`.

---

## Documentação relacionada

| Documento | Conteúdo |
|-----------|----------|
| [README.md](../README.md) | Setup, scripts, primeiro uso |
| [descritivo-sistema-rfy.md](./descritivo-sistema-rfy.md) | Visão produto e jornada |
| [O_QUE_O_SAAS_OFERECE.md](./O_QUE_O_SAAS_OFERECE.md) | Oferta funcional |
| [SUPHO-METODOLOGIA.md](./SUPHO-METODOLOGIA.md), [SUPHO-INTEGRATION.md](./SUPHO-INTEGRATION.md) | SUPHO |
| [METRICAS_RFY_DEFINICOES.md](./METRICAS_RFY_DEFINICOES.md) | Métricas |
| [DATA_AND_MODEL_POLICY.md](./DATA_AND_MODEL_POLICY.md) | Política de dados/IA |
| [EXECUTIVE_DASHBOARD_ARCHITECTURE.md](./EXECUTIVE_DASHBOARD_ARCHITECTURE.md) | Dashboard executivo |
| [INTEGRACAO_PIPERUN.md](./INTEGRACAO_PIPERUN.md) | PipeRun |
| [design/](./design/) | Tokens, componentes, princípios UI |
| [context-pack/](./context-pack/) | Context Pack RFY |
| [contexto-organizacao/](./contexto-organizacao/) | Textos de contexto organizacional |

---

## 11. Manutenção deste documento

- Ao adicionar **domínios de API** ou **tabelas** centrais, atualizar as secções 5 e 6.
- Ao mudar **auth** ou **env obrigatórios**, atualizar secções 3 e 7.
- Versão da app: ver `package.json` (`name`, `version`).

---

*Última atualização: documento gerado como referência consolidada do repositório; alinhar com commits em caso de divergência estrutural.*
