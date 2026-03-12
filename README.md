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

O `.env.example` já deixa **Postgres no Docker local** como padrão (`DATABASE_URL` e `AI_DATABASE_URL` em `localhost:5432`). O **login** usa Supabase Auth: você precisa de URL e chaves do Supabase.

#### Opção A – Dev 100% local (Auth + Postgres sem Supabase Cloud)

Para não depender do Supabase em nuvem (projeto pausado, rede, etc.), use o **Supabase local** (Auth + Postgres em Docker):

1. Inicie o Supabase local:
   ```bash
   npx supabase start
   ```
2. Copie as variáveis que o comando exibe (ou rode `npx supabase status`) e preencha no `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` → use a **API URL** (ex.: `http://127.0.0.1:54321`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → **anon key**
   - `SUPABASE_SERVICE_ROLE_KEY` → **service_role key**
   - `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`
   - `AI_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`
3. Aplique migrations e crie o usuário demo:
   ```bash
   npm run supabase:local
   ```
4. Rode o app (`npm run dev`) e faça login com **admin@demo.rfy.local** / **Adminrv**.

Supabase Studio local: http://127.0.0.1:54323

**Se o login não funciona:** rode na raiz do projeto (com Docker rodando):

```bash
npm run supabase:local
```

O script sobe o Supabase local, aplica as migrations e mostra as linhas para colar no `.env.local`. Copie essas linhas para o `.env.local`, **reinicie o servidor** (`Ctrl+C` e `npm run dev` de novo) e tente logar com **admin@demo.rfy.local** / **Adminrv**.

#### Opção B – Postgres no Docker + Supabase Cloud (Auth)

Se você usa **apenas** o Postgres do `docker-compose` (porta 5432), o login continua indo para o **Supabase em nuvem**. Preencha no `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (do projeto em supabase.com)
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` e `AI_DATABASE_URL` podem apontar para `localhost:5432` (Postgres do Docker).

Mínimo para dev com Postgres no Docker + Supabase Cloud:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
AI_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
AI_SERVICE_URL=http://localhost:8001
NEXT_PUBLIC_APP_URL=http://localhost:3000
# + variáveis Supabase (Auth) do projeto em supabase.com
```

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

Para ter login pronto e base demo completa (relatórios, SUPHO, cenários, etc.):

1. **Execute as migrations antes** (Postgres no Docker ou Supabase): `npm run db:up` ou `npm run db:migrate`.
2. Configure `.env.local` com `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `DATABASE_URL` (ou `AI_DATABASE_URL`).
3. Execute **uma vez**:
   ```bash
   npm run db:seed:admin
   ```
   Isso cria o usuário **admin@demo.rfy.local** (senha **Adminrv**), a organização "Admin Demo" e aplica o seed completo.
4. Acesse `/login`, use a dica "Demo" (ou preencha email e senha acima) e entre.
5. Para **zerar e recarregar** a base de demonstração: em **Configurações**, use o botão **"Zerar e recarregar base de demonstração"**.

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

Se usar upload via Supabase Storage, mantenha o bucket `uploads` criado.

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

Crie `.env.local` na raiz (ou use env no `docker-compose.yml`). O app em Docker recebe:

- `AI_SERVICE_URL=http://ai-service:8001` (já definido no compose)
- `DATABASE_URL` — para o Postgres do compose use `postgresql://postgres:postgres@postgres:5432/postgres`
- Para **Auth** (login/signup), configure Supabase no `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

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
