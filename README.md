# RFY - Revenue Friction Engine

MVP SaaS para análise de fricções de receita a partir de CSVs do PipeRun. Dashboard com métricas de pipeline, fricções e pillar scores.

## Stack

- **Next.js** (App Router) + TypeScript + Tailwind
- **Postgres** (local via Docker e/ou Supabase Cloud)
- **Supabase**: Auth + Storage (opcional no fluxo local de banco)
- **Inngest**: jobs assíncronos (parse CSV, linkagem, compute report)
- **Recharts**: gráficos no dashboard

## Setup Mac/Linux

### 1. Pré-requisitos

- Node.js >= 20
- npm ou yarn
- **Docker Desktop** (para Postgres local)

### 2. Postgres no Docker local (recomendado)

Com o **Docker Desktop aberto e rodando**:

```bash
npm run db:up
```

Esse comando:
- sobe o container Postgres (`docker compose up -d postgres`)
- espera o banco ficar saudável
- aplica schema + **todas** as migrations (incluindo SUPHO 007 e 008)

Depois (opcional), para popular com dados de demo:

```bash
npm run db:seed
```

Alternativa ao `db:up`:

```bash
npm run db:docker:up
```

### 3. Fluxo manual de banco

Aplicar só as migrations (com Postgres já rodando no Docker):

```bash
npm run db:migrate
```

Aplicar/reaplicar somente migrations pendentes:

```bash
npm run db:migrate
```

Aplicar explicitamente a base SaaS (migração 006):

```bash
npm run db:migrate:saas
```

Aplicar migração SUPHO (Diagnóstico, PAIP, Rituais, Certificação):

```bash
npm run db:migrate:supho
```

Popular o banco com dados de demonstração SaaS (dashboard, reports e settings):

```bash
npm run db:seed
```

Para vincular o seed ao seu usuário autenticado (owner da org demo):

```bash
DEMO_USER_ID=<uuid-do-seu-usuario> npm run db:seed
```

Parar serviços locais de dados:

```bash
npm run db:down
```

### 4. Configurar variáveis de ambiente

Se não existir `.env.local`:

```bash
cp .env.example .env.local
```

O `.env.example` já deixa **Postgres no Docker local** como padrão (`DATABASE_URL` e `AI_DATABASE_URL` em `localhost:5432`), define um `UPLOAD_DIR` local e um `ENCRYPTION_KEY` de desenvolvimento. O fluxo padrão de **login/signup não depende mais de Supabase**.

Mínimo para rodar localmente:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
AI_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
NEXT_PUBLIC_APP_URL=http://localhost:3000
AI_SERVICE_URL=http://localhost:8001
UPLOAD_DIR=.uploads
ENCRYPTION_KEY=<uma-string-com-16+-chars>
```

Se quiser usar storage local para uploads no Docker, o `docker-compose.yml` já monta `UPLOAD_DIR=/data/uploads`.

#### Supabase local/cloud (opcional)

Supabase deixou de ser obrigatório para o auth principal. Hoje ele só é útil para fluxos legados ou integrações externas específicas.

Se você ainda quiser usar Supabase local:

```bash
npx supabase start
```

O `supabase/config.toml` foi ajustado para desenvolvimento local (`localhost:3000`) e sem seed inexistente. Mesmo assim, o schema principal continua sendo aplicado pelos scripts em `supabase/sql/`.

Se optar por Supabase Cloud, trate `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` como variáveis opcionais.

### 5. Rodar aplicação

**Terminal 1 - Next.js:**

```bash
npm run dev
```

**Terminal 2 - Inngest (dev server):**

```bash
npm run inngest
```

O Inngest Dev Server roda em `http://localhost:8288` e descobre automaticamente as funções em `/api/inngest`.

### 6. Acessar o app

- App: `http://localhost:3000`
- Crie uma conta em `/signup` ou faça login em `/login`
- No primeiro login, uma org "Default" é criada automaticamente
- Faça upload de CSVs em **Uploads** (Oportunidades primeiro, depois Atividades)
- Veja o dashboard em **Dashboard**

#### Conta Admin e base de demonstração (tudo funcional)

Para ter base demo completa (relatórios, SUPHO, cenários, etc.):

1. **Execute as migrations antes** (Postgres no Docker ou Supabase): `npm run db:up` ou `npm run db:migrate`.
2. Faça signup/login normalmente na aplicação.
3. Use uploads de demonstração ou rode o seed com `DEMO_USER_ID=<uuid-do-app_users> npm run db:seed`.
4. Para **zerar e recarregar** a base de demonstração: em **Configurações**, use o botão **"Zerar e recarregar base de demonstração"**.

`npm run db:seed:admin` continua existindo apenas para cenários legados que ainda dependem de Supabase Admin API.

### 7. Migrations sem psql nem Docker (só Supabase)

Se você usa **Supabase** e não tem `psql` instalado nem Docker, as migrations podem rodar via Node:

1. No `.env.local`, defina `DATABASE_URL` com a connection string do Supabase (Settings → Database → URI).
2. Rode:
   ```bash
   npm run db:migrate
   ```
   O script tenta primeiro `psql` e Docker; se não estiverem disponíveis, usa o runner em Node (lê `DATABASE_URL` do `.env.local`).

   Ou diretamente:
   ```bash
   npm run db:migrate:node
   ```

### 8. Se quiser usar Supabase Cloud (opcional)

Banco e migrations já funcionam sem SQL Editor.  
Para usar Auth/Storage hospedados, preencha também:

```
NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Se usar upload via Supabase Storage, mantenha o bucket `uploads` criado. Caso contrário, defina `UPLOAD_DIR` para o fallback local em disco.

## SaaS Core implementado

A migração `006_saas_core.sql` adiciona:

- Billing: `plans`, `org_subscriptions`, `usage_limits`, `usage_events`
- RBAC em `org_members` com roles (`owner/admin/manager/viewer`)
- Auditoria: `org_audit_logs`
- Alertas multicanal: `alert_channels`, `alert_rules`, `alert_events`
- Segurança B2B: `org_api_keys`
- Integrações outbound: `outbound_webhooks`
- Relatórios agendados: `report_schedules`
- Onboarding: `org_onboarding_steps`
- Qualidade de dados: `data_quality_runs`
- Planejamento: `forecast_scenarios`, `quarterly_goals`
- Retenção/expansão: `retention_cohorts`

## Rodar com Docker (stack completa)

A aplicação usa **Docker Compose** com: app (Next.js), ai-service (Python), Postgres, Redis e MLflow.

### 1. Subir todos os serviços

```bash
docker compose up --build -d
```

- App: `http://localhost:3000`
- AI Service: `http://localhost:8001`
- Postgres: `localhost:5432` (usuário/senha: `postgres` por padrão)
- MLflow: `http://localhost:5001` (se `MLFLOW_HOST_PORT=5001`)

### 2. Variáveis de ambiente

Use `.env` ou exporte as variáveis antes de subir o Compose. O app em Docker recebe:

- `AI_SERVICE_URL=http://ai-service:8001` (já definido no compose)
- `COMPOSE_DATABASE_URL` e `COMPOSE_AI_DATABASE_URL` são opcionais; se ausentes, a stack usa o Postgres interno em `postgres:5432`
- `UPLOAD_DIR=/data/uploads` já vem configurado no compose com volume persistente
- `ENCRYPTION_KEY` deve ser sobrescrita fora de dev
- Variáveis Supabase são opcionais

### 3. Migrations com Docker

Com o Postgres já rodando (`docker compose up -d`), aplique o schema e as migrations **a partir do host** (com `psql` instalado ou usando o container):

```bash
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
npm run db:migrate
```

Para incluir SUPHO (Painel de Maturidade, Diagnóstico, PAIP):

```bash
npm run db:migrate:supho
```

Se não tiver `psql` no host, use o container Postgres:

```bash
docker compose exec -T postgres psql -U postgres -d postgres < supabase/sql/schema.sql
# Depois aplique cada migration em supabase/sql/migrations/ na ordem (001, 002, ... 007_supho.sql)
# Ou rode db-migrate.sh com DATABASE_URL apontando para localhost:5432.
```

### 4. Seed de demonstração (inclui SUPHO)

Após as migrations (incluindo 007):

```bash
DEMO_USER_ID=<uuid-do-usuario> npm run db:seed
```

Isso popula dashboard, reports e um resultado de diagnóstico SUPHO para o **Painel de Maturidade** em **SUPHO → Painel de Maturidade**.

### 5. Parar

```bash
docker compose down
```

Volumes (`postgres_data`, `ai-artifacts`, `mlflow-artifacts`) são mantidos. Use `docker compose down -v` para apagar volumes.

Detalhes em [docs/DOCKER.md](docs/DOCKER.md).

## Deploy na Vercel

1. Conecte o repositório à Vercel
2. Configure as env vars no painel da Vercel
3. Para produção com Inngest, registre o app em [inngest.com](https://inngest.com) e adicione `INNGEST_SIGNING_KEY` e `INNGEST_EVENT_KEY`

## Estrutura do projeto

```
src/
├── app/
│   ├── (auth)/login, signup
│   ├── app/dashboard, uploads, supho/maturidade
│   └── api/upload, inngest, auth, supho/diagnostic/compute
├── components/       # UploadDropzone, UI
├── lib/
│   ├── supabase/     # client, server, admin
│   ├── piperun/      # csv parse, normalize
│   ├── metrics/      # compute (frictions, scores)
│   ├── supho/        # ITSMO, diagnóstico, textos executivos
│   └── storage.ts
├── types/            # database, supho
└── inngest/          # client, functions
```

## Formatos CSV suportados (PipeRun)

- **Oportunidades**: Hash, Funil, Etapa, Valor de P&S (BRL), Datas DD/MM/YYYY, etc.
- **Atividades**: ID, Título, Concluído em, Nome fantasia (Empresa), etc.

Delimitador `;`, linhas entre aspas, aspas duplicadas `""`, moeda `R$ 10.423,80`, datas BR.

## Integração com CRM via n8n / Webhook

Para receber dados automaticamente do CRM (PipeRun, Pipedrive, HubSpot etc.):

1. Acesse **Configurações** → **Integração CRM**
2. Selecione **n8n / Webhook**
3. Copie a URL do webhook e o `org_id`
4. No n8n (ou Zapier, Make), crie um fluxo que:
   - Busca oportunidades e atividades do seu CRM
   - Formata no padrão esperado (ver exemplo em Configurações)
   - Envia POST para a URL com `org_id`, `opportunities`, `activities`
5. Opcional: configure um **Webhook Secret** e envie no header `X-Webhook-Secret`

O payload será processado e o report será recalculado automaticamente.

## Critérios de aceite

- [x] Login e signup
- [x] Upload de CSV
- [x] Parser robusto (;, aspas, BRL)
- [x] Dados no Postgres
- [x] Report gerado
- [x] Dashboard com pipeline_value_open, tabelas Proposta alto risco e Pipeline abandonado
