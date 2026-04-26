# RFY — Documentação consolidada do software

**Nome do pacote:** `rfy-revenue-friction-engine` (versão `0.1.0`)  
**Última consolidação:** abril de 2026  
**Escopo:** visão de produto, **especificação funcional completa** (fluxos, telas, configurações, APIs de produto), arquitetura técnica, dados, operações e roadmap — fundido a partir de `docs/`, `README.md` e código.

**Posicionamento atual (2026):** o **SUPHO** (maturidade organizacional — ITSMO, pilares IC/IH/IP, diagnóstico, PAIP, rituais e certificação) é a **estrela do produto**: diferenciação metodológica, narrativa comercial principal e presença fixa no **hero do dashboard** ao lado do RFY Index. O **RFY Index** e o motor de **Receita Confiável / Inflada** são o **motor quantitativo** que mede o pipeline e prioriza ações; o SUPHO explica **por que** a organização sustém (ou não) aquele patamar e **como evoluir** com plano e governança.

A **parte funcional** deste arquivo consolida o catálogo que antes estava principalmente em `O_QUE_O_SAAS_OFERECE.md`. Detalhes de fórmulas, deploy e metodologia extensa continuam nos documentos citados no [índice](#18-índice-dos-documentos-de-origem).

---

## Sumário

1. [O que é o RFY](#1-o-que-é-o-rfy)
2. [Proposta de valor e posicionamento](#2-proposta-de-valor-e-posicionamento)
3. [Arquitetura do produto (camadas)](#3-arquitetura-do-produto-camadas)
4. [Parte funcional consolidada](#4-parte-funcional-consolidada)
5. [Métricas centrais e implementação](#5-métricas-centrais-e-implementação)
6. [Módulo SUPHO (diagnóstico e maturidade)](#6-módulo-supho-diagnóstico-e-maturidade)
7. [Stack técnica](#7-stack-técnica)
8. [Estrutura do repositório](#8-estrutura-do-repositório)
9. [Dados, modelo de IA e multi-tenant](#9-dados-modelo-de-ia-e-multi-tenant)
10. [Ingestão de dados e integrações](#10-ingestão-de-dados-e-integrações)
11. [SaaS: schema, RBAC e recursos B2B](#11-saas-schema-rbac-e-recursos-b2b)
12. [Ambientes, Docker e deploy](#12-ambientes-docker-e-deploy)
13. [Infraestrutura AWS (planejada)](#13-infraestrutura-aws-planejada)
14. [Operação: backup, Git, segurança de segredos](#14-operação-backup-git-segurança-de-segredos)
15. [Dashboard e UX executiva](#15-dashboard-e-ux-executiva)
16. [Roadmap, lacunas e temas de implementação](#16-roadmap-lacunas-e-temas-de-implementação)
17. [Páginas e rotas da aplicação](#17-páginas-e-rotas-da-aplicação)
18. [Índice dos documentos de origem](#18-índice-dos-documentos-de-origem)
19. [Repasse do software para outra pessoa](#19-repasse-do-software-para-outra-pessoa)

---

## 1. O que é o RFY

O **RFY (Revenue Friction Engine)** é uma **plataforma de governança empresarial** que combina (1) **métricas de receita confiável** a partir do pipeline (CRM / **PipeRun**) e (2) o **SUPHO**, metodologia própria de **maturidade organizacional** (Cultura, Humano, Performance → **ITSMO**).

- **RFY Index** e **Receita Confiável / Inflada** respondem *“quanto da receita podemos confiar nos próximos 30 dias?”* — com previsão (IA ou heurística) sem depender só da data de fechamento declarada no CRM.
- **SUPHO** responde *“por que estamos nesse patamar e como evoluir?”* — com diagnóstico, Painel de Maturidade, **PAIP** (plano 90–180 dias), rituais e trilha de certificação.

Na interface, o **dashboard** trata os dois eixos como **pares no hero**: bloco principal do **RFY Index** e cartão **SUPHO · Maturidade (ITSMO)** com link direto para o Painel de Maturidade (`DashboardHero`).

---

## 2. Proposta de valor e posicionamento

| Conceito | Definição |
|----------|-----------|
| **SUPHO (estrela do produto)** | Diferencial metodológico: diagnóstico IC/IH/IP, **ITSMO**, níveis de maturidade, gaps, PAIP, rituais e certificação; simulador de impacto da maturidade sobre o RFY (API `/api/simulations/rfy`). É o argumento central de **venda e retenção** (“governança que sustenta a receita”). |
| **RFY Index (30 dias)** | Percentual de receita considerada estatisticamente confiável em relação à receita declarada/esperada para a janela de 30 dias — **motor quantitativo** visível no hero. |
| **Receita Confiável (30d)** | Montante em R$ que o modelo considera realizável nos próximos 30 dias. |
| **Receita Declarada (30d)** | Baseline a partir do CRM ou do modelo (`pipeline_bruto` / pipeline aberto). |
| **Receita Inflada** | Diferença entre o declarado e o confiável — expectativa que pode não se materializar. |

**Regra de ouro de produto:** receita confiável medida com rigor **e** maturidade organizacional explicada com profundidade — o cliente vê **número + maturidade** já na primeira dobra do dashboard; em seguida, decisões, alertas e análises avançadas.

**Nota histórica:** o arquivo `REESTRUTURACAO_ESTRATEGICA_RFY_INDEX.md` descreve uma fase em que o topo da página priorizava só o RFY Index e relegava SUPHO a áreas secundárias. A **evolução atual do produto** integrou o **ITSMO no hero** e reforçou o SUPHO como narrativa principal; use este documento e o código como referência de **posicionamento vigente**.

---

## 3. Arquitetura do produto (camadas)

1. **Experiência central (hero)** — **RFY Index** + **SUPHO (ITSMO)** lado a lado; leitura rápida e próxima decisão.
2. **Verdade da receita** — Receita Confiável/Inflada, KPIs, evolução e benchmark (quando houver dados).
3. **Execução** — intervenções priorizadas, Deal Intelligence, saúde do pipeline.
4. **Profundidade SUPHO** — Diagnóstico, Painel de Maturidade, PAIP, rituais, certificação; simulações de impacto.
5. **Governança operacional** — configurações, integrações, alertas, API keys, relatórios agendados.

---

## 4. Parte funcional consolidada

Esta secção descreve **o que o usuário e o integrador podem fazer** na plataforma: fluxos, telas, parâmetros e contratos de API voltados a produto. Complementa as secções técnicas posteriores (métricas, banco, deploy).

### 4.1 Autenticação, organizações e acesso

| Recurso | Descrição |
|--------|-----------|
| Login | Email e senha via Supabase Auth; após sucesso, redirecionamento ao dashboard. |
| Cadastro (signup) | Criação de conta; no primeiro login costuma ser criada a organização **Default**. |
| Conta demo | **admin@demo.rfy.local** / **Adminrv**; botão “Demo” na tela de login (quando existir). |
| Setup | Rota `/setup` quando variáveis Supabase não estão configuradas. |
| Papéis | `owner`, `admin`, `manager`, `viewer` em `org_members`. |
| Convites | Aceite via `/invite/accept` com token. |

### 4.2 Dashboard (Torre de Controle)

**Implementação:** `DashboardClient.tsx`, `components/make/DashboardHero`, etc.

**Hero (primeira dobra):**

- **RFY Index (30d)** — percentual de Receita Confiável; variação % e benchmark quando disponíveis; aviso se forecast usa **fallback** (IA indisponível).
- **SUPHO · Maturidade** — **ITSMO** (0–100), nível (Reativo → Evolutivo), foco no pilar mais fraco; link para `/app/supho/maturidade`; estado vazio convida a iniciar diagnóstico.
- **Período** — filtro (7d / 30d / 90d / mês / trimestre / ano).
- **Próxima decisão** — primeira intervenção sugerida (título, ação, valor, prioridade).

**Grade de KPIs:** Receita Confiável (30d), Receita Inflada, Evolução RFY (pode exibir “Em implementação” conforme dados), Alertas ativos.

**Decisões e alertas:** lista de decisões prioritárias; cartões de alertas abertos com opção de resolver.

**Área avançada (expansível):** âncoras para — Posicionamento de receita no mercado; Intervenções; Receita declarada vs confiável; Deal Intelligence; **SUPHO** (card resumido `SuphoOverviewCard`); Painel executivo detalhado; Unit Economics / ICP; Inteligência IA; gargalo e vendedores; status da IA.

**Blocos funcionais adicionais (quando aplicável):** foco em distorção prioritária; comparação declarado vs confiável; tabelas de risco por etapa e por vendedor; saúde do pipeline; oportunidades por etapa; navegação rápida entre seções.

### 4.3 Uploads e ingestão

- Envio de CSV **Oportunidades** e **Atividades** (formato **PipeRun**: delimitador `;`, aspas, datas DD/MM/YYYY, moeda R$).
- **Upload unitário** (um tipo por vez) ou **pacote demo** (duas planilhas) — processamento via **Inngest** ou fallback síncrono.
- **Templates** — download via `GET /api/demo/template/oportunidades` e `.../atividades`.
- **Histórico** — status (ok / processando / erro) e mensagens de falha.
- Pós-processamento: atualização de relatório e dashboard; no **pacote demo**, criação de campanha SUPHO de diagnóstico.

### 4.4 Relatórios

- Lista de **distorções** (Receita Inflada) com nome, descrição, ocorrências, impacto em R$, participação no total, severidade (Crítico / Alto / Moderado).
- **Ação recomendada** por tipo de distorção.
- **Evidências** — deals ligados (empresa, título, valor, dias sem atividade).
- **Plano de ação** — priorização (ex.: top 3 distorções).
- Pilares de impacto (higiene, pós-proposta, etc.), receita recuperável, redução de ciclo quando calculados.
- Export **CSV / PDF** (conforme implementação).
- Link para uploads quando ainda não há relatório.

### 4.5 SUPHO — jornada funcional (estrela do produto)

- **Diagnóstico** — campanhas, respondentes, perguntas (Likert), cálculo de IC, IH, IP, **ITSMO**, nível, gaps C–H e C–P, subíndices (ISE, IPT, ICL); resultado no Painel de Maturidade e no hero.
- **Painel de Maturidade** — radar IC/IH/IP, textos executivos, perfil predominante, pilar em foco.
- **Simulador de impacto** — relação maturidade ↔ RFY / Receita Confiável (API de simulação quando disponível na UI).
- **PAIP** — planos 90–180 dias, objetivos e KRs ligados ao diagnóstico.
- **Rituais** — cadência (check-in, performance, feedback, governança); estrutura de dados preparada.
- **Certificação** — níveis Bronze / Prata / Ouro, critérios e evidências; estrutura em banco.

*Papel do SUPHO:* explicar causas estruturais da receita e dar plano de evolução — **par** do RFY Index na experiência (hero), não módulo oculto.

### 4.6 Configurações

Organização típica por abas: **Visão geral**, **SaaS**, **Organização**, **Integrações**.

| Área | Conteúdo funcional |
|------|---------------------|
| Visão geral | Nome da org, `org_id`, plano e **limites de uso** (assentos, uploads/30d, deals), uso atual, status da integração CRM. |
| SaaS | Planos, assinatura, onboarding, **API keys** (prefixo, escopos, revogação), **webhooks outbound**, canais e **regras de alerta**, **relatórios agendados**, cenários de forecast, **metas trimestrais**, **qualidade de dados**, **cohorts** de retenção. |
| Organização | Limiares de distorção (proposta em risco, pipeline abandonado, aging, aprovação), notificações e timezone, convites em calendário, quantidade de evidências no relatório/dashboard, **CAC** e marketing para unit economics. |
| Integrações | Provedores (PipeRun CSV, Pipedrive, HubSpot, n8n/webhook, API genérica), URL de webhook, `org_id`, secret opcional, exemplo de payload. |
| Demonstração | **Zerar e recarregar base demo** (owner/admin) — reset via API de admin + seed. |

### 4.7 Integrações de dados

- **Webhook genérico:** `POST /api/crm/webhook` — `org_id`, `opportunities`, `activities`; header opcional `X-Webhook-Secret`.
- **PipeRun dedicado:** `POST /api/crm/piperun/webhook` — validação por segredo em `crm_integrations` (ver `INTEGRACAO_PIPERUN.md`).
- Pós-ingestão: sincronização, `metrics_status`, recálculo de relatório (fila ou síncrono).

### 4.8 APIs REST (referência de produto)

| Método e rota | Descrição |
|----------------|-----------|
| `POST /api/upload` | Upload de CSV (oportunidades ou atividades). |
| `POST /api/demo/upload-pack` | Pacote demo (dois CSVs). |
| `GET /api/demo/template/oportunidades` | Template CSV oportunidades. |
| `GET /api/demo/template/atividades` | Template CSV atividades. |
| `POST /api/admin/reset-demo` | Zerar/recarregar demo (admin). |
| `POST /api/crm/webhook` | Ingestão CRM genérica. |
| `GET/POST /api/settings` | Ler/gravar configurações por seção. |
| `POST /api/inngest` | Handler Inngest (jobs). |
| `POST /api/ai/train` | Disparar treino do modelo. |
| `GET /api/ai/status` | Status do modelo. |
| `GET /api/ai/forecast` | Forecast de pipeline. |
| `GET /api/ai/benchmark` | Benchmark. |
| `GET /api/ai/interventions` | Intervenções sugeridas. |
| `GET /api/ai/icp-analysis` | Análise de ICP. |
| `GET/POST /api/ai/deal` | Dados/análise por deal. |
| `GET /api/metrics/summary` | Resumo RFY (índice, confiável, inflada). |
| `POST /api/simulations/rfy` | Simulação de impacto (ex.: maturidade). |
| **SUPHO** | `campaigns`, `respondents`, `questions`, `answers`, `POST .../diagnostic/compute`, `paip/plans`, etc. |

*Rotas internas e administrativas adicionais podem existir — validar em `src/app/api/`.*

### 4.9 Personas e casos de uso

| Persona | Principais recursos |
|---------|---------------------|
| CEO / Conselho | RFY Index, **SUPHO (ITSMO)** no hero, Receita Confiável/Inflada, evolução, Top 3 decisões, benchmark. |
| Gestor comercial | Intervenções, Deal Intelligence, saúde do pipeline, relatórios, análise detalhada. |
| Liderança / RH / enablement | Diagnóstico SUPHO, simulador, PAIP, rituais, certificação. |
| Operação | Uploads, templates, webhooks, limiares. |
| Admin / IT | Plano, API keys, webhooks outbound, alertas, cenários, metas, reset demo. |

### 4.10 Marketing e jurídico

- **Preços** — `/precos`.
- **Termos de uso** e **Política de privacidade** — `/termos`, `/privacidade` (LGPD).

### 4.11 Fluxo de valor (resumo)

1. **Autenticar** → 2. **Ingerir dados** (CSV ou webhook) → 3. **Dashboard** com RFY Index + SUPHO no hero → 4. **Relatório** de distorções e **Diagnóstico SUPHO** (campanha → Painel de Maturidade → PAIP).

*Ambientes, Docker e variáveis de deploy:* ver [secção 12](#12-ambientes-docker-e-deploy).

---

## 5. Métricas centrais e implementação

Fonte normativa: `docs/METRICAS_RFY_DEFINICOES.md` e código em `src/app/api/metrics/summary/route.ts`, `src/lib/reports/executive-data.ts`.

**Comportamento atual (resumo):**

- **Receita declarada (30d):** `pipelineBruto ?? pipelineValueOpen`.
- **Receita confiável (30d):** se o AI retorna `forecast_adjusted`, usa esse valor; senão, **fallback** = declarado × **0,7** (`FALLBACK_FACTOR`).
- **Receita inflada:** `max(0, declarado - confiável)`.
- **RFY Index (%):** `(forecast_adjusted / declarado) * 100` quando há forecast; caso contrário o índice percentual pode ser **`null`** (UI deve comunicar uso de estimativa heurística).

O documento `REESTRUTURACAO_ESTRATEGICA_RFY_INDEX.md` descreve o **modelo teórico completo** (P(win), P(close in 30d | win), baseline neutro sem data manipulável do CRM). A implementação atual **aproxima** isso via serviço de IA agregado.

---

## 6. SUPHO — módulo central (diagnóstico e maturidade)

*Jornada e funcionalidades de negócio:* ver **secção 4.5** acima. Abaixo: **implementação técnica** e referências de código.

O **SUPHO** não é um “add-on” opcional na narrativa atual: é o **diferencial metodológico** do RFY (venda, onboarding e expansão). Tecnicamente, concentra-se em `src/lib/supho/`, rotas `/app/supho/*` e APIs `/api/supho/*`.

**Pilares:** IC (Cultura), IH (Humano), IP (Performance). **ITSMO** = índice geral ponderado (ex.: 0,40 / 0,35 / 0,25). **Níveis:** Reativo → Evolutivo (faixas 0–100).

**Presença no dashboard:** o último resultado de diagnóstico alimenta o **hero** (score, nível, foco) e a seção `#supho` (`SuphoOverviewCard`). Dados vêm do servidor (ex.: `suphoResult` na página do dashboard).

**Fluxo no app:**

- **Diagnóstico** (`/app/supho/diagnostico`): campanhas, respondentes, perguntas (migração 008 — perguntas padrão), cálculo via `POST /api/supho/diagnostic/compute`.
- **Painel de Maturidade** (`/app/supho/maturidade`): radar, textos executivos (`src/lib/supho/executive-text.ts`).
- **PAIP** (`/app/supho/paip`): planos 90–180 dias (`supho_paip_plans`).
- **Rituais** e **Certificação**: páginas e tabelas preparadas na migração 007+.
- **Simulação RFY × maturidade:** `POST /api/simulations/rfy` (parâmetros como `improve_supho_by`).

Fórmulas Likert 1→5 para 0–100, gaps ΔC-H e ΔC-P, subíndices ISE, IPT, ICL — ver `SUPHO-INTEGRATION.md`.

**Testes:** fluxo mínimo login → dashboard → SUPHO coberto em `tests/e2e/dashboard-supho.spec.ts`.

---

## 7. Stack técnica

| Camada | Tecnologia |
|--------|------------|
| Frontend / BFF | **Next.js 16** (App Router), **React 19**, **TypeScript**, **Tailwind CSS 4** |
| Banco | **PostgreSQL** (Docker local ou Supabase) |
| Auth / Storage | **Supabase** (Auth; Storage opcional para uploads) |
| Jobs | **Inngest** |
| Gráficos | **Recharts** |
| Rate limit | **Upstash Redis** (opcional) |
| E-mail / outros | **Resend**, **Google AI** (conforme env), **OpenAI** client no bundle para fluxos de IA |
| Testes | **Vitest**, **Playwright** |
| AI Service (opcional) | **Python** em Docker — porta **8001**; **MLflow** para experimentos; **Redis** |

---

## 8. Estrutura do repositório

```
src/
├── app/                 # Rotas App Router: (auth), app/*, api/*
├── components/          # UI, uploads
├── lib/
│   ├── supabase/        # client, server, admin
│   ├── piperun/         # parse/normalize CSV
│   ├── metrics/         # compute, snapshot
│   ├── supho/           # diagnóstico, textos executivos
│   └── storage.ts
├── types/
└── inngest/             # funções Inngest

supabase/sql/            # schema.sql + migrations 001…008
scripts/                 # db, seed, backup, supabase local
ai-service/              # serviço Python (Docker)
```

---

## 9. Dados, modelo de IA e multi-tenant

Política detalhada: `docs/DATA_AND_MODEL_POLICY.md`.

**Estado atual (v1):**

- Modelo **global** treinado com oportunidades de **todas** as orgs (sem filtro obrigatório por `org_id` no trainer).
- Inferência filtra por **`org_id`** nos dados, mas compartilha o **mesmo artefato** de modelo.
- Implicações: padrões de um cliente podem influenciar previsões de outro; benchmark exige **k-anonymity** (ex.: ≥ 5 pares).

**Evoluções possíveis:** modelo por tenant, híbrido, versionamento na API (`model_version`), consentimento explícito para treino global.

---

## 10. Ingestão de dados e integrações

- **CSV PipeRun:** campos de oportunidades (Hash, Funil, Etapa, Valor P&S, datas…) e atividades (ID, título, datas, empresa…).
- **Webhook:** ingestão JSON → persistência → recálculo de relatório (Inngest `report/compute` ou síncrono).
- **PipeRun dedicado:** deduplicação por `org_id` + ids externos; atualização de `crm_integrations` e `metrics_status`.

---

## 11. SaaS: schema, RBAC e recursos B2B

A migração **`006_saas_core.sql`** (ver `README.md`) introduz entre outros:

- **Billing:** `plans`, `org_subscriptions`, `usage_limits`, `usage_events`
- **RBAC** em `org_members`
- **Auditoria:** `org_audit_logs`
- **Alertas:** `alert_channels`, `alert_rules`, `alert_events`
- **API keys B2B:** `org_api_keys`
- **Webhooks outbound:** `outbound_webhooks`
- **Relatórios agendados:** `report_schedules`
- **Onboarding:** `org_onboarding_steps`
- **Qualidade de dados:** `data_quality_runs`
- **Planejamento:** `forecast_scenarios`, `quarterly_goals`
- **Retenção:** `retention_cohorts`

*Billing com gateway real (Stripe/Pagar.me) consta como P0 no roadmap — ver seção 16.*

---

## 12. Ambientes, Docker e deploy

### Desenvolvimento local

- **Node ≥ 20**; `npm run dev` (app em **3000**).
- **Inngest dev:** `npm run inngest` (**8288**).
- **Postgres:** `npm run db:up` ou `docker compose`; migrations com `npm run db:migrate`.
- **Supabase 100% local:** `npx supabase start` + `npm run supabase:local` — ver `DEV_LOCAL_SUPABASE.md`.

### Docker Compose (stack completa)

Serviços: **Next**, **ai-service**, **postgres**, **redis**, **mlflow**. Portas típicas: app **3000**, AI **8001**, Postgres **5432**, Redis **6379**, MLflow **5001** (`MLFLOW_HOST_PORT`).

Variáveis críticas: `DATABASE_URL`, `AI_DATABASE_URL`, `AI_SERVICE_URL`, chaves Supabase, URLs de app e keys Inngest em produção.

### Deploy

- **Vercel** para o frontend/API Routes; registrar app no **Inngest** com `INNGEST_SIGNING_KEY` e `INNGEST_EVENT_KEY`.

---

## 13. Infraestrutura AWS (planejada)

O arquivo `docs/INFRAESTRUTURA_AWS.md` descreve alvo de produção: **VPC**, **ECS Fargate** (Next + AI service), **ALB**, **RDS PostgreSQL**, **ECR**, **S3**, **Secrets Manager**, **Route 53**, **ACM**, **CloudWatch** — com dimensionamento por fases (A/B/C). Não substitui um Terraform/CDK concreto; é o blueprint arquitetural.

---

## 14. Operação: backup, Git, segurança de segredos

- **Backup:** `scripts/backup-db.sh` + `pg_dump`; política em `BACKUP-RESTORE.md`.
- **Git:** branch `main`; não commitar `.env`, `.env.local`, chaves — ver `GIT.md`.
- **Segredos:** usar `.env.example` como template; produção via Secret Manager ou env do provedor.

---

## 15. Dashboard e UX executiva

`EXECUTIVE_DASHBOARD_ARCHITECTURE.md` define princípios: decisão antes de decoração; intervenções com valor em R$; seção colapsável para análise detalhada; evitar jargão de ML na interface.

**Estado implementado (Figma Make / componentes `make`):** o **hero** combina **RFY Index** e **SUPHO · Maturidade (ITSMO)** na mesma dobra — reforço visual do posicionamento “receita + maturidade”. KPIs, decisões, alertas e bloco “Avançado” desdobram o restante; para perfil executivo, a navegação avançada coloca **SUPHO** cedo na ordem de âncoras.

`REESTRUTURACAO_ESTRATEGICA_RFY_INDEX.md` contém decisões de produto de uma **fase anterior** (SUPHO fora do fluxo principal do topo). Para **UX e narrativa atuais**, prevalecem este documento e o código do `DashboardHero`.

---

## 16. Roadmap, lacunas e temas de implementação

**Roadmap SaaS** (`SAAS-FEATURES-ROADMAP.md`): billing real (P0), RBAC/convites reforçado, observabilidade de produto, alertas operacionais, backups automatizados testados; depois multi-tenant hardening, integrações nativas, onboarding guiado, etc.

**Planos por tema** (`PLANOS_POR_TEMA.md`): billing, observabilidade, robustez de UI/env, validação Zod, E2E, etc.

**Avaliação comercial** (`AVALIACAO_PRONTO_PARA_VENDA.md` e relacionados): documentos de due diligence interna — consultar para estado “go-to-market”.

---

## 17. Páginas e rotas da aplicação

| Rota | Função |
|------|--------|
| `/` | Landing |
| `/login`, `/signup`, `/setup` | Auth |
| `/invite/accept` | Aceite de convite |
| `/precos` | Planos públicos |
| `/termos`, `/privacidade` | Jurídico |
| `/app/dashboard` | Dashboard principal |
| `/app/uploads` | Uploads |
| `/app/reports` | Relatórios |
| `/app/settings` | Configurações |
| `/app/integracoes` | Integrações |
| `/app/copilot-contas` | Copiloto (feature) |
| `/app/supho/diagnostico`, `maturidade`, `paip`, `rituais`, `certificacao` | SUPHO |

---

## 18. Índice dos documentos de origem

| Documento | Conteúdo principal |
|-----------|-------------------|
| `README.md` | Setup, scripts npm, Docker, critérios de aceite |
| `O_QUE_O_SAAS_OFERECE.md` | Catálogo funcional — **conteúdo incorporado na [secção 4](#4-parte-funcional-consolidada)**; mantido como arquivo legado/alinhamento |
| `APRESENTACAO_SAAS_RFY.md` | Narrativa executiva curta |
| `REESTRUTURACAO_ESTRATEGICA_RFY_INDEX.md` | Posicionamento, modelo RFY Index, ritual, roadmap 12 meses |
| `EXECUTIVE_DASHBOARD_ARCHITECTURE.md` | Princípios de UX do dashboard |
| `METRICAS_RFY_DEFINICOES.md` | Fórmulas e implementação atual do resumo de métricas |
| `DATA_AND_MODEL_POLICY.md` | Política de dados e modelos ML |
| `SUPHO-INTEGRATION.md`, `SUPHO-METODOLOGIA.md`, `COMO_FUNCIONA_METODOLOGIA_SUPHO.md` | Metodologia SUPHO |
| `SUPHO-PROMPT-QUESTIONARIO-GPT.md` | Prompts de questionário |
| `INTEGRACAO_PIPERUN.md` | Webhook PipeRun |
| `DEV_LOCAL_SUPABASE.md` | Supabase offline |
| `DOCKER.md` | Compose, portas, migrations |
| `INFRAESTRUTURA_AWS.md` | Blueprint AWS |
| `PREPARACAO_MIGRACAO_INFRAESTRUTURA.md` | Checklist e plano por fases para migração de infraestrutura (cloud padrão, incl. **Opus Tech** / Smart IT) |
| `BACKUP-RESTORE.md` | Backup/restore Postgres |
| `GIT.md` | Fluxo Git |
| `SAAS-FEATURES-ROADMAP.md` | Roadmap de features |
| `PLANOS_POR_TEMA.md` | Planos de trabalho por tema |
| `O_QUE_FALTA_RFY.md` | Lacunas |
| `INTEGRACAO_PIPERUN.md` | API PipeRun |
| `AI-REVENUE-ENGINE-STRATEGIC.md`, `AI-BENCHMARK-SETUP.md`, `ARCHITECTURE-REVIEW-REVENUE-ENGINE.md` | Estratégia IA e revenue engine |
| `DASHBOARD-SEGMENTACAO-POR-PERFIL.md` | Segmentação de dashboard |
| `design/*.md` | Design system (tokens, princípios, componentes) |
| `BENCHMARK-INTELLIGENCE-AGENT.md`, `COPILOTO-RECEITA-VISAO-VENDEDOR.md` | Agentes / copiloto |
| `ANALISE_MELHORIAS_SISTEMA.md`, `ANALISE_QUALIDADE_CRM.md` | Análises |
| `feature-engineering.md` | Feature engineering |
| `BACKUP_ESTRUTURA_2026-02-24.md` | Registro de backup de estrutura |
| `REPASSE_SOFTWARE.md` | **Guia único de repasse** (onboarding de quem assume o projeto) |

---

## 19. Repasse do software para outra pessoa

Para transferir o projeto a outro desenvolvedor ou responsável técnico — incluindo o que está pronto, o que falta, como rodar, variáveis, fluxos críticos, deploy, riscos e checklist de handoff — use o documento dedicado:

**[`docs/REPASSE_SOFTWARE.md`](REPASSE_SOFTWARE.md)**

Ele consolida leitura de `README`, `O_QUE_FALTA_RFY`, `AVALIACAO_PRONTO_PARA_VENDA`, políticas de dados/IA, Docker, backups e índice de leitura por perfil. O guia incorpora o posicionamento **SUPHO como estrela** + **RFY como motor quantitativo**, alinhado a este documento.

---


