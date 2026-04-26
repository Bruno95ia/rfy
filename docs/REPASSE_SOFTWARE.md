# Repasse do software RFY — guia único para quem assume o projeto

**Objetivo:** permitir que outra pessoa (desenvolvedor, tech lead ou responsável por produto técnico) **entenda o sistema, rode localmente, saiba onde mexer e quais riscos existem**, sem depender de conversas informais.  
**Data de elaboração:** abril de 2026  
**Base:** `README.md`, `docs/*.md`, `.env.example`, estrutura de `src/` e avaliações de prontidão já documentadas.

---

## Sumário

1. [O que é, em uma página](#1-o-que-é-em-uma-página)
2. [Estado real do produto: pronto para quê](#2-estado-real-do-produto-pronto-para-quê)
3. [Arquitetura técnica resumida](#3-arquitetura-técnica-resumida)
4. [Mapa do repositório (onde está cada coisa)](#4-mapa-do-repositório-onde-está-cada-coisa)
5. [Primeiro dia: colocar o ambiente no ar](#5-primeiro-dia-colocar-o-ambiente-no-ar)
6. [Variáveis de ambiente e segredos](#6-variáveis-de-ambiente-e-segredos)
7. [Banco de dados e migrations](#7-banco-de-dados-e-migrations)
8. [Fluxos que você precisa conhecer](#8-fluxos-que-você-precisa-conhecer)
9. [Serviço de IA (Python)](#9-serviço-de-ia-python)
10. [Jobs assíncronos (Inngest)](#10-jobs-assíncronos-inngest)
11. [Integrações CRM e webhooks](#11-integrações-crm-e-webhooks)
12. [Multi-tenant, limites e cobrança](#12-multi-tenant-limites-e-cobrança)
13. [Testes e qualidade](#13-testes-e-qualidade)
14. [Deploy e produção](#14-deploy-e-produção)
15. [Operação: backup, logs, incidentes](#15-operação-backup-logs-incidentes)
16. [Dívidas técnicas e riscos conhecidos](#16-dívidas-técnicas-e-riscos-conhecidos)
17. [Documentação complementar (leitura por perfil)](#17-documentação-complementar-leitura-por-perfil)
18. [Checklist de handoff (quem entrega × quem recebe)](#18-checklist-de-handoff-quem-entrega--quem-recebe)

---

## 1. O que é, em uma página

| Item | Descrição |
|------|-----------|
| **Nome** | RFY — *Revenue Friction Engine* (pacote npm `rfy-revenue-friction-engine`). |
| **Tipo** | SaaS B2B multi-tenant: **governança empresarial** — receita confiável (pipeline **PipeRun** / webhook) **e** maturidade organizacional (**SUPHO**). |
| **Estrela do produto** | **SUPHO** (IC, IH, IP → **ITSMO**): diagnóstico, Painel de Maturidade, PAIP, rituais, certificação; hero do dashboard exibe ITSMO ao lado do RFY Index (`DashboardHero`). |
| **Motor quantitativo** | **RFY Index** e **Receita Confiável / Inflada** (30 dias); serviço de IA opcional para forecast. |
| **Stack principal** | Next.js (App Router) + Postgres + Supabase Auth + Inngest; serviço Python opcional para ML/forecast; Docker Compose para stack completa. |

Documento mestre (visão + **parte funcional** + técnico): [`DOCUMENTACAO_COMPLETA_RFY.md`](DOCUMENTACAO_COMPLETA_RFY.md) — especialmente a [secção 4 — Parte funcional consolidada](DOCUMENTACAO_COMPLETA_RFY.md#4-parte-funcional-consolidada). O arquivo [`O_QUE_O_SAAS_OFERECE.md`](O_QUE_O_SAAS_OFERECE.md) repete o catálogo funcional em formato longo e aponta para o consolidado.

---

## 2. Estado real do produto: pronto para quê

Síntese alinhada a [`AVALIACAO_PRONTO_PARA_VENDA.md`](AVALIACAO_PRONTO_PARA_VENDA.md) e [`O_QUE_FALTA_RFY.md`](O_QUE_FALTA_RFY.md):

| Cenário | Viável? | Observação |
|---------|---------|------------|
| **Demo / POC / piloto com cobrança manual** | Sim | Login, upload, dashboard, relatórios, SUPHO, configurações; conta demo e seeds. |
| **Produção com cobrança automática (cartão/assinatura)** | Não sem trabalho | Falta gateway (Stripe/Pagar.me), ciclo de vida de assinatura e bloqueio por inadimplência. |
| **Enterprise “caixa forte”** | Parcial | RBAC, auditoria, API keys e webhooks existem; falta hardening operacional (backups automatizados testados, observabilidade de produto, etc.). |

**O que funciona bem para assumir o código:** núcleo de métricas, ingestão, relatórios, SUPHO com migrations 007/008, limites de uso em uploads, Inngest para recomputo de relatório.

**O que não pode ser ignorado:** política de modelo de IA global (ver secção 9 e `DATA_AND_MODEL_POLICY.md`); gaps de UI em erro/env; billing ainda não é real.

---

## 3. Arquitetura técnica resumida

```
[Browser] → Next.js (UI + Route Handlers /api/*)
                ↓
         PostgreSQL (dados de negócio, multi-tenant por org_id)
                ↑
         Supabase Auth (sessão; service role só no servidor)

Upload / Webhook → persistência → Inngest (report/compute) ou recálculo síncrono

Next.js /api/ai/* → proxy para AI Service (Python) em http://localhost:8001 (dev)
```

- **Fonte de verdade dos dados:** Postgres (`DATABASE_URL`). `AI_DATABASE_URL` pode apontar para o mesmo banco em dev.
- **Auth:** sempre Supabase (nuvem ou stack local `npx supabase start`).
- **Processamento pesado de CSV:** Inngest em dev (`npm run inngest`) e em prod (projeto Inngest + env keys).

---

## 4. Mapa do repositório (onde está cada coisa)

| Caminho | Conteúdo |
|---------|----------|
| `src/app/` | Rotas: `(auth)`, marketing, `app/*` (área logada), `api/*`. |
| `src/lib/metrics/` | Cálculo de snapshot, fricções, relatórios. |
| `src/lib/piperun/` | Parse e normalização de CSV. |
| `src/lib/supho/` | Diagnóstico SUPHO, textos executivos, fórmulas. |
| `src/lib/reports/` | Dados executivos / executive-data para dashboard. |
| `src/inngest/` | Funções Inngest (ex.: processamento pós-upload). |
| `supabase/sql/` | `schema.sql` + migrations `001`…`008` (SaaS core + SUPHO + perguntas). |
| `scripts/` | `db-up`, `db-migrate`, seed, backup, supabase local. |
| `ai-service/` | API Python (forecast, treino, etc.). |
| `docker-compose.yml` | App + ai-service + postgres + redis + mlflow. |

Testes: `npm test` (Vitest), `npm run test:e2e` (Playwright).

---

## 5. Primeiro dia: colocar o ambiente no ar

**Pré-requisitos:** Node ≥ 20, Docker Desktop (para Postgres local), conta/projeto Supabase **ou** Supabase local.

### Caminho mínimo recomendado (README)

1. `cp .env.example .env.local` e preencher Supabase + `DATABASE_URL` (Postgres Docker `localhost:5432`).
2. `npm install`
3. `npm run db:up` — sobe Postgres e aplica schema + migrations.
4. `npm run db:seed:admin` — cria **admin@demo.rfy.local** / **Adminrv** e org demo (requer envs corretas).
5. Terminal A: `npm run dev` (porta 3000).
6. Terminal B: `npm run inngest` (porta 8288) — necessário para jobs de CSV em dev.

### Dev 100% local (sem Supabase na nuvem)

Seguir [`DEV_LOCAL_SUPABASE.md`](DEV_LOCAL_SUPABASE.md) + `npm run supabase:local`.

### Stack Docker completa

`docker compose up --build -d` — ver [`DOCKER.md`](DOCKER.md). Aplicar migrations a partir do host com `DATABASE_URL=...@localhost:5432` e `npm run db:migrate`.

---

## 6. Variáveis de ambiente e segredos

Referência canônica: **`.env.example`** (na raiz).

| Área | Variáveis-chave |
|------|-----------------|
| Auth | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Banco | `DATABASE_URL`, `AI_DATABASE_URL` |
| App | `NEXT_PUBLIC_APP_URL`, `ENCRYPTION_KEY` (API keys / secrets em DB) |
| IA | `AI_SERVICE_URL`, opcional `AI_TRAIN_SECRET`, `MLFLOW_*` |
| Jobs prod | `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY` |
| E-mail | `RESEND_API_KEY`, `ALERT_*`, `INVITE_*` |
| Rate limit | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |

**Regra:** nunca commitar `.env` / `.env.local`. Produção: secrets no provedor (Vercel, AWS Secrets Manager, etc.).

---

## 7. Banco de dados e migrations

- **Schema inicial:** `supabase/sql/schema.sql`.
- **Migrations incrementais:** `supabase/sql/migrations/` na ordem numérica.
- **006 — SaaS core:** planos, assinaturas, limites, RBAC estendido, auditoria, alertas, API keys, webhooks, etc. (lista no `README.md`).
- **007 — SUPHO:** diagnóstico, PAIP, rituais, certificação (tabelas).
- **008 — Perguntas padrão SUPHO** para diagnóstico.

Comandos úteis: `npm run db:migrate`, `npm run db:migrate:saas`, `npm run db:migrate:supho`, `npm run db:migrate:supho-questions`. Sem `psql` local: o script pode usar Docker/Node conforme README.

**Backup / restore:** [`BACKUP-RESTORE.md`](BACKUP-RESTORE.md) e `scripts/backup-db.sh`.

---

## 8. Fluxos que você precisa conhecer

1. **Signup/login** → Supabase → sessão → rotas `src/app/app/*` com escopo de `org_id`.
2. **Upload CSV** → `POST /api/upload` (ou demo pack) → gravação → evento Inngest ou processamento síncrono → `reports` atualizado → dashboard consome snapshot/API de métricas.
3. **Métricas RFY** — implementação e fórmulas: [`METRICAS_RFY_DEFINICOES.md`](METRICAS_RFY_DEFINICOES.md); código em `src/app/api/metrics/summary/`, `src/lib/reports/executive-data.ts`. Fallback **0,7** quando IA indisponível; RFY Index % pode ser `null` sem forecast.
4. **SUPHO** — campanhas e respostas → `POST /api/supho/diagnostic/compute` → resultados no Painel de Maturidade.

---

## 9. Serviço de IA (Python)

- **Repo:** pasta `ai-service/`; imagem Docker no compose; porta **8001** no host.
- **Uso:** Next faz proxy em `/api/ai/*` para treino, forecast, benchmark, intervenções, etc.
- **Política de dados:** leia [`DATA_AND_MODEL_POLICY.md`](DATA_AND_MODEL_POLICY.md) — modelo **global** (treino pode usar todas as orgs); implicações de privacidade e benchmark.

---

## 10. Jobs assíncronos (Inngest)

- **Dev:** `npm run inngest` — UI em `http://localhost:8288`.
- **Prod:** registrar app no Inngest e configurar `INNGEST_*` na Vercel.
- **Handler:** `POST /api/inngest` — funções em `src/inngest/`.

---

## 11. Integrações CRM e webhooks

| Integração | Documentação |
|------------|----------------|
| Webhook genérico | README + `O_QUE_O_SAAS_OFERECE` (payload opportunities/activities) |
| PipeRun dedicado | [`INTEGRACAO_PIPERUN.md`](INTEGRACAO_PIPERUN.md) — endpoint `/api/crm/piperun/webhook`, header `X-Webhook-Secret` |

Sempre validar `org_id` e permissões; rate limit em rotas sensíveis.

---

## 12. Multi-tenant, limites e cobrança

- Isolamento lógico por **`org_id`** nas tabelas e APIs.
- **Planos e limites:** tabelas `plans`, `usage_limits`, `org_subscriptions`; checagens em upload (HTTP 402 se exceder).
- **Cobrança real:** **não implementada** — assinatura “ativa” sem pagamento até integrar gateway; ver `O_QUE_FALTA_RFY.md` e `PLANOS_POR_TEMA.md` tema Billing.

---

## 13. Testes e qualidade

- `npm run lint` — ESLint em `src` (em pastas sincronizadas com OneDrive ou disco rede o comando pode demorar vários minutos).
- `npm test` / `npm run test:watch` — Vitest com cobertura.
- `npm run test:e2e` — Playwright (fluxo completo ainda é lacuna parcial segundo docs).

### 13.1 Validação mínima antes de PR ou deploy

Ordem recomendada:

1. `npm install` — garantir dependências (sem `node_modules` completo, `next build` pode falhar com *module not found* para pacotes já listados no `package.json`).
2. `npm run build` — compilação de produção + checagem TypeScript do projeto Next.
3. `npm test` — suite Vitest (unitário + integração leve em `tests/` e `src/**/*.test.ts`).

Se `npm run build` ou `npm test` falharem, corrija antes de integrar em `main`; ver também [`GIT.md`](GIT.md) e o modelo opcional [`COMMIT_MESSAGE_TEMPLATE.txt`](COMMIT_MESSAGE_TEMPLATE.txt) para mensagens de commit.

---

## 14. Deploy e produção

- **App:** Vercel (ou equivalente) conectado ao repositório; envs no painel.
- **Inngest:** produção requer keys e URL pública estável.
- **Postgres:** Supabase gerenciado, RDS, ou outro; rodar migrations no ambiente.
- **AWS (futuro):** blueprint em [`INFRAESTRUTURA_AWS.md`](INFRAESTRUTURA_AWS.md) — ECS, ALB, RDS, ECR, etc.; não é IaC pronta, é referência.

---

## 15. Operação: backup, logs, incidentes

- **Backup:** automatizar `scripts/backup-db.sh` + teste de restore periódico (documentado como lacuna em `O_QUE_FALTA_RFY`).
- **Git:** branch `main`; fluxo em [`GIT.md`](GIT.md).
- **Incidentes típicos:** IA fora do ar (fallback de métricas), Inngest não rodando em dev (CSV não processa assincronamente), env faltando (quebra em runtime — melhoria documentada).

---

## 16. Dívidas técnicas e riscos conhecidos

Resumo de [`O_QUE_FALTA_RFY.md`](O_QUE_FALTA_RFY.md) e [`ANALISE_MELHORIAS_SISTEMA.md`](ANALISE_MELHORIAS_SISTEMA.md):

| Tema | Risco / dívida |
|------|----------------|
| Billing | Sem receita recorrente automática; plano é “fictício” operacionalmente. |
| Observabilidade | Pouco tracking de produto; backups não automatizados por padrão. |
| UX de erro | Alguns fetches podem falhar silenciosamente; validar ao tocar nas telas. |
| Env | Falta de validação centralizada de `process.env` em alguns pontos. |
| IA | Modelo global; revisar compliance antes de escalar clientes enterprise. |
| Docs vs código | Algumas narrativas de produto descrevem features “completas” enquanto parte é roadmap — conferir `src/` ao planejar marketing. |

---

## 17. Documentação complementar (leitura por perfil)

| Perfil | Prioridade de leitura |
|--------|------------------------|
| **Dev assumindo o repo** | `README.md` → `REPASSE_SOFTWARE.md` (este) → `DOCKER.md` → `METRICAS_RFY_DEFINICOES.md` → `DATA_AND_MODEL_POLICY.md` |
| **Produto / negócio** | `O_QUE_O_SAAS_OFERECE.md`, `APRESENTACAO_SAAS_RFY.md`, `REESTRUTURACAO_ESTRATEGICA_RFY_INDEX.md` |
| **SUPHO / metodologia** | `SUPHO-INTEGRATION.md`, `SUPHO-METODOLOGIA.md` |
| **Vendas / due diligence** | `AVALIACAO_PRONTO_PARA_VENDA.md`, `SAAS-FEATURES-ROADMAP.md` |
| **Design** | `docs/design/*.md` |
| **Infra / migração cloud** | `PREPARACAO_MIGRACAO_INFRAESTRUTURA.md` (Opus Tech / hyperscaler) → `INFRAESTRUTURA_AWS.md` → `BACKUP-RESTORE.md` |

Índice geral: [`DOCUMENTACAO_COMPLETA_RFY.md`](DOCUMENTACAO_COMPLETA_RFY.md) — seção 18 lista todos os arquivos.

---

## 18. Checklist de handoff (quem entrega × quem recebe)

### Quem **entrega** deve garantir

- [ ] Acesso ao repositório Git (remote, branch `main`).
- [ ] Lista de ambientes (dev, staging, prod) e quem paga cada serviço (Vercel, Supabase, Inngest, domínio, Resend, etc.).
- [ ] **Não** enviar segredos por chat sem canal seguro; preferir cofre de senhas ou rotação pós-repasse.
- [ ] Conta Inngest e projeto Supabase identificados (ou processo para criar novos).
- [ ] Última versão conhecida que **builda** (`npm run build`) e testes que devem passar.

### Quem **recebe** deve fazer na primeira semana

- [ ] Clonar repo, `npm install`, subir stack local (secção 5).
- [ ] Logar com demo ou criar usuário e validar: dashboard → upload → relatório.
- [ ] Rodar testes (`npm test`) e entender falhas existentes.
- [ ] Ler secções 7–9 deste documento e `DATA_AND_MODEL_POLICY.md`.
- [ ] Abrir issue ou nota interna com dúvidas e itens deste checklist que não puderam ser concluídos.

---

*Fim do guia de repasse. Para atualizações futuras, edite este arquivo e, se necessário, a secção correspondente em `DOCUMENTACAO_COMPLETA_RFY.md`.*
