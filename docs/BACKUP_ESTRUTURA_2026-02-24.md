# Backup da estrutura do projeto RFY

**Data do backup:** 2026-02-24

Este documento registra a estrutura de arquivos e pastas do projeto **RFY — Revenue Friction Engine** na data indicada, para referência futura.

---

## 1. Estrutura de diretórios e arquivos

*(Excluídos: `node_modules/`, `.next/`, `.git/`, `.cursor/`, `ai-service/.venv/`, `ai-service/.pytest_cache/`)*

```
RFY/
├── .env.example
├── .env.local
├── Dockerfile
├── README.md
├── docker-compose.yml
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── tsconfig.json
├── vitest.config.ts
│
├── docs/
│   ├── AI-BENCHMARK-SETUP.md
│   ├── AI-REVENUE-ENGINE-STRATEGIC.md
│   ├── ANALISE_QUALIDADE_CRM.md
│   ├── ARCHITECTURE-REVIEW-REVENUE-ENGINE.md
│   ├── BENCHMARK-INTELLIGENCE-AGENT.md
│   ├── DATA_AND_MODEL_POLICY.md
│   ├── DOCKER.md
│   ├── EXECUTIVE_DASHBOARD_ARCHITECTURE.md
│   ├── O_QUE_O_SAAS_OFERECE.md
│   ├── SAAS-FEATURES-ROADMAP.md
│   ├── SUPHO-INTEGRATION.md
│   ├── SUPHO-METODOLOGIA.md
│   └── feature-engineering.md
│
├── public/
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   ├── window.svg
│   └── logo/
│       ├── demo.html
│       ├── revenue-engine-symbol-black.svg
│       ├── revenue-engine-symbol-favicon.svg
│       ├── revenue-engine-symbol-white.svg
│       └── revenue-engine-symbol.svg
│
├── scripts/
│   ├── apply-migration-002.sh
│   ├── apply-migration-003.sh
│   ├── apply-migration-006.sh
│   ├── apply-migration-007.sh
│   ├── apply-migration-008.sh
│   ├── create-demo-admin.js
│   ├── db-down.sh
│   ├── db-migrate-node.js
│   ├── db-migrate.sh
│   ├── db-seed-demo-node.js
│   ├── db-seed-demo.sh
│   ├── db-up.sh
│   ├── dedupe-opportunities.js
│   ├── docker-up-and-migrate.sh
│   ├── seed-demo.sql
│   ├── setup.sh
│   ├── start-ai.sh
│   └── start-all.sh
│
├── supabase/
│   └── sql/
│       ├── schema.sql
│       └── migrations/
│           ├── 002_org_config_and_crm.sql
│           ├── 003_ai_benchmark_tables.sql
│           ├── 004_training_logs.sql
│           ├── 005_unit_economics_icp.sql
│           ├── 006_saas_core.sql
│           ├── 007_supho.sql
│           └── 008_supho_default_questions.sql
│
├── ai-service/
│   ├── .env
│   ├── Dockerfile
│   ├── pytest.ini
│   ├── requirements.txt
│   ├── artifacts/
│   │   ├── classifier_*.joblib
│   │   └── regressor_*.joblib
│   ├── tests/
│   │   ├── test_api_endpoints.py
│   │   ├── test_benchmark_privacy.py
│   │   └── test_feature_builder.py
│   ├── benchmark.py
│   ├── config.py
│   ├── db.py
│   ├── feature_builder.py
│   ├── intervention_engine.py
│   ├── main.py
│   ├── predictor.py
│   └── trainer.py
│
└── src/
    ├── app/
    │   ├── (auth)/
    │   │   ├── error.tsx
    │   │   ├── layout.tsx
    │   │   ├── login/page.tsx
    │   │   ├── setup/page.tsx
    │   │   └── signup/page.tsx
    │   ├── api/
    │   │   ├── admin/reset-demo/route.ts
    │   │   ├── ai/
    │   │   │   ├── benchmark/route.ts, route.test.ts
    │   │   │   ├── deal/route.ts
    │   │   │   ├── forecast/route.ts, route.test.ts
    │   │   │   ├── icp-analysis/route.ts
    │   │   │   ├── interventions/route.ts, route.test.ts
    │   │   │   ├── status/route.ts
    │   │   │   └── train/route.ts
    │   │   ├── auth/callback/route.ts
    │   │   ├── auth/signout/route.ts
    │   │   ├── crm/webhook/route.ts
    │   │   ├── demo/
    │   │   │   ├── template/atividades/route.ts
    │   │   │   ├── template/oportunidades/route.ts
    │   │   │   └── upload-pack/route.ts
    │   │   ├── inngest/route.ts
    │   │   ├── settings/route.ts
    │   │   ├── supho/
    │   │   │   ├── answers/route.ts
    │   │   │   ├── campaigns/route.ts
    │   │   │   ├── diagnostic/compute/route.ts
    │   │   │   ├── paip/plans/route.ts
    │   │   │   ├── questions/route.ts
    │   │   │   └── respondents/route.ts
    │   │   └── upload/route.ts
    │   ├── app/
    │   │   ├── dashboard/
    │   │   │   ├── AddToCalendarButton.tsx
    │   │   │   ├── DashboardClient.tsx
    │   │   │   ├── loading.tsx
    │   │   │   ├── page.tsx
    │   │   │   ├── components/
    │   │   │   │   ├── AIIntelligencePanel.tsx
    │   │   │   │   ├── AIStatusCard.tsx
    │   │   │   │   ├── BenchmarkBar.tsx
    │   │   │   │   ├── BottleneckPanel.tsx
    │   │   │   │   ├── ExecutiveCard.tsx
    │   │   │   │   ├── ExecutiveDecisionStrip.tsx
    │   │   │   │   ├── ExecutivePanel.tsx
    │   │   │   │   ├── ForecastComparison.tsx
    │   │   │   │   ├── InsightPanel.tsx
    │   │   │   │   ├── IntervencoesPrioritarias.tsx
    │   │   │   │   ├── InterventionCard.tsx
    │   │   │   │   ├── PremiumDataTable.tsx
    │   │   │   │   ├── PremiumTable.tsx
    │   │   │   │   ├── RevenuePositioning.tsx
    │   │   │   │   ├── RiskRankingTable.tsx
    │   │   │   │   ├── SellerIntelligenceTable.tsx
    │   │   │   │   ├── SuphoOverviewCard.tsx
    │   │   │   │   ├── UnitEconomicsICPCard.tsx
    │   │   │   │   ├── VsClusterCard.tsx
    │   │   │   │   ├── index.ts
    │   │   │   │   └── revenue-engine.ts
    │   │   ├── reports/
    │   │   │   ├── loading.tsx
    │   │   │   └── page.tsx
    │   │   ├── settings/
    │   │   │   ├── SettingsClient.tsx
    │   │   │   └── page.tsx
    │   │   ├── supho/
    │   │   │   ├── certificacao/page.tsx
    │   │   │   ├── diagnostico/
    │   │   │   │   ├── DiagnosticoClient.tsx
    │   │   │   │   └── page.tsx
    │   │   │   ├── maturidade/
    │   │   │   │   ├── MaturidadePanelClient.tsx
    │   │   │   │   ├── loading.tsx
    │   │   │   │   └── page.tsx
    │   │   │   ├── paip/
    │   │   │   │   ├── PAIPClient.tsx
    │   │   │   │   └── page.tsx
    │   │   │   └── rituais/page.tsx
    │   │   └── uploads/
    │   │       ├── DemoPackForm.tsx
    │   │       ├── UploadForm.tsx
    │   │       ├── UploadsList.tsx
    │   │       ├── loading.tsx
    │   │       └── page.tsx
    │   ├── error.tsx
    │   ├── globals.css
    │   ├── icon.svg
    │   ├── layout.tsx
    │   └── page.tsx
    │
    ├── components/
    │   ├── layout/
    │   │   ├── AppShell.tsx
    │   │   ├── DataTable.tsx
    │   │   ├── PageHeader.tsx
    │   │   └── StatCard.tsx
    │   ├── ui/
    │   │   ├── Logo.tsx
    │   │   ├── badge.tsx
    │   │   ├── button.tsx
    │   │   ├── card.tsx
    │   │   ├── input.tsx
    │   │   ├── skeleton.tsx
    │   │   ├── table.tsx
    │   │   └── use-toast.tsx
    │   └── UploadDropzone.tsx
    │
    ├── inngest/
    │   ├── client.ts
    │   └── functions/
    │       ├── compute-report.ts
    │       ├── index.ts
    │       ├── link-activities.ts
    │       ├── process-upload-activities.ts
    │       └── process-upload-opportunities.ts
    │
    ├── lib/
    │   ├── actions.ts
    │   ├── aiClient.ts
    │   ├── auth.ts
    │   ├── billing.ts
    │   ├── cn.ts
    │   ├── crypto.ts
    │   ├── ical.ts
    │   ├── ratelimit.ts
    │   ├── report-compute-persist.ts
    │   ├── storage.ts
    │   ├── upload-process.ts
    │   ├── proxy.ts
    │   ├── crm/validate.ts
    │   ├── metrics/
    │   │   ├── compute.ts
    │   │   ├── compute.test.ts
    │   │   └── unit-economics.ts
    │   ├── piperun/
    │   │   ├── csv.ts
    │   │   ├── csv.test.ts
    │   │   ├── normalize.ts
    │   │   └── normalize.test.ts
    │   ├── supabase/
    │   │   ├── admin.ts
    │   │   ├── client.ts
    │   │   └── server.ts
    │   └── supho/
    │       ├── calculations.ts
    │       ├── constants.ts
    │       ├── executive-text.ts
    │       └── index.ts
    │
    └── types/
        ├── database.ts
        └── supho.ts
```

---

## 2. Scripts do package.json

| Script | Comando | Descrição |
|--------|---------|-----------|
| `dev` | `next dev` | Servidor de desenvolvimento Next.js |
| `build` | `next build` | Build de produção |
| `start` | `next start` | Iniciar app em produção |
| `lint` | `eslint src` | Lint do código |
| `test` | `vitest run` | Testes (run once) |
| `test:watch` | `vitest` | Testes em watch |
| `inngest` | `npx inngest-cli@latest dev` | Dev server do Inngest |
| `setup` | `bash scripts/setup.sh` | Setup inicial |
| `db:up` | `bash scripts/db-up.sh` | Sobe Postgres (Docker) e aplica migrations |
| `db:docker:up` | `bash scripts/docker-up-and-migrate.sh` | Docker + migrate |
| `db:migrate` | `bash scripts/db-migrate.sh` | Aplica migrations (psql) |
| `db:migrate:node` | `node scripts/db-migrate-node.js` | Aplica migrations via Node |
| `db:seed` | `bash scripts/db-seed-demo.sh` | Seed demo (bash) |
| `db:down` | `bash scripts/db-down.sh` | Para Postgres |
| `db:migrate:saas` | `bash scripts/apply-migration-006.sh` | Aplica migração 006 (SaaS core) |
| `db:migrate:supho` | `bash scripts/apply-migration-007.sh` | Aplica migração 007 (SUPHO) |
| `db:migrate:supho-questions` | `bash scripts/apply-migration-008.sh` | Aplica migração 008 (questões SUPHO) |
| `db:seed:admin` | `node scripts/create-demo-admin.js` | Cria usuário demo admin e aplica seed |

---

## 3. Migrations (supabase/sql/migrations)

| Ordem | Arquivo | Conteúdo |
|-------|---------|----------|
| base | schema.sql | Schema inicial |
| 002 | 002_org_config_and_crm.sql | Org, config e CRM |
| 003 | 003_ai_benchmark_tables.sql | Tabelas IA e benchmark |
| 004 | 004_training_logs.sql | Logs de treinamento |
| 005 | 005_unit_economics_icp.sql | Unit economics e ICP |
| 006 | 006_saas_core.sql | Core SaaS (billing, RBAC, audit, alertas, webhooks, etc.) |
| 007 | 007_supho.sql | SUPHO (diagnóstico, PAIP, rituais, certificação) |
| 008 | 008_supho_default_questions.sql | Questões padrão SUPHO |

---

## 4. Rotas da aplicação (páginas)

| Caminho | Descrição |
|---------|-----------|
| `/` | Landing / home |
| `/login` | Login |
| `/signup` | Cadastro |
| `/setup` | Setup pós-cadastro |
| `/app/dashboard` | Dashboard principal |
| `/app/uploads` | Uploads (CSV) |
| `/app/reports` | Relatórios de fricções |
| `/app/settings` | Configurações |
| `/app/supho/diagnostico` | Diagnóstico SUPHO (campanhas) |
| `/app/supho/maturidade` | Painel de Maturidade SUPHO |
| `/app/supho/paip` | PAIP (Plano de Ação) |
| `/app/supho/rituais` | Rituais e cadência |
| `/app/supho/certificacao` | Certificação SUPHO |

---

## 5. Resumo de pastas principais

| Pasta | Conteúdo |
|-------|----------|
| `src/app` | Rotas Next.js (auth, app, api) |
| `src/app/(auth)` | Login, signup, setup |
| `src/app/api` | Rotas de API (upload, demo, admin, ai, supho, crm, settings, inngest) |
| `src/app/app` | Área logada: dashboard, uploads, reports, settings, supho |
| `src/components` | Componentes reutilizáveis (layout, ui, UploadDropzone) |
| `src/inngest` | Cliente e funções Inngest (processamento CSV, report) |
| `src/lib` | Lógica de negócio: auth, metrics, piperun, supho, upload-process, report-compute-persist |
| `src/types` | Tipos TypeScript (database, supho) |
| `supabase/sql` | Schema e migrations Postgres |
| `scripts` | Shell e Node para DB, seed, demo admin |
| `ai-service` | Serviço Python (FastAPI): forecast, benchmark, intervenções, treino |
| `docs` | Documentação do projeto |

---

*Backup gerado em 2026-02-24. Para atualizar, gere um novo documento com a mesma estrutura.*
