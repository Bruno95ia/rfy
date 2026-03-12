# Rodar RFY com Docker

Stack: **Next.js (app)** + **AI Service (Python)** + **Postgres** + **Redis** + **MLflow**.

O projeto está ajustado para **Postgres no Docker local**: use `DATABASE_URL` e `AI_DATABASE_URL` apontando para `localhost:5432` (ver `.env.example`).

## Pré-requisitos

- **Docker Desktop** instalado e rodando
- Arquivo `.env.local` na raiz (copie de `.env.example`) com:
  - **Postgres local:** `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres` e `AI_DATABASE_URL` igual (já vêm no exemplo)
  - **Auth:** Supabase em `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

## Comandos

| Comando | Descrição |
|--------|------------|
| `docker compose up --build -d` | Sobe app, ai-service, postgres, redis, mlflow em background |
| `docker compose up --build` | Sobe e exibe logs no terminal |
| `docker compose ps` | Lista serviços e status |
| `docker compose logs -f app` | Logs do Next.js |
| `docker compose logs -f ai-service` | Logs do AI Service |
| `docker compose down` | Para serviços (volumes mantidos) |
| `docker compose down -v` | Para e remove volumes |

## Portas

| Serviço | Porta padrão | Variável |
|---------|--------------|----------|
| App (Next.js) | 3000 | — |
| AI Service | 8001 | — |
| Postgres | 5432 | — |
| Redis | 6379 | — |
| MLflow | 5001 | `MLFLOW_HOST_PORT` |

## Migrations (Postgres no Docker local)

Com o **Docker Desktop rodando**, use um único comando para subir o Postgres e aplicar todas as migrations (schema + 002 … 008, incluindo SUPHO):

```bash
npm run db:up
```

Se o Postgres já estiver no ar (ex.: `docker compose up -d postgres`), aplique só as migrations:

```bash
npm run db:migrate
```

Não é preciso ter `psql` instalado: o script usa o próprio container para rodar as migrations.

2. Sem `psql` no host: use um runner que monte o projeto e rode `scripts/db-migrate.sh` com `DATABASE_URL` apontando para `postgres:5432` (rede interna Docker). Exemplo com run one-off:
   ```bash
   docker compose run --rm -e DATABASE_URL=postgresql://postgres:postgres@postgres:5432/postgres app sh -c "apk add --no-cache postgresql-client && bash scripts/db-migrate.sh && bash scripts/apply-migration-007.sh"
   ```
   (O image `app` é Node; pode não ter `bash`/`psql`. Nesse caso, rode as migrations no host com `DATABASE_URL=...@localhost:5432`.)

## Seed demo (incluindo SUPHO)

Após aplicar todas as migrations (incluindo `007_supho.sql`):

```bash
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
DEMO_USER_ID=<uuid-do-seu-usuario> npm run db:seed
```

O seed insere uma campanha e um resultado de diagnóstico SUPHO para a org demo. Em **SUPHO → Painel de Maturidade** o radar e os textos executivos aparecem.

## Auth com Supabase

O app usa Supabase para login. No Docker, mantenha no `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

O `docker-compose.yml` passa `env_file: .env.local` para o serviço `app`. Assim o Next.js consegue autenticar usuários e acessar o banco (se o Supabase estiver configurado como backend) ou apenas Auth (se o banco for o Postgres do compose).

## Banco: Supabase vs Postgres do Compose

- **Supabase (cloud):** Auth + Postgres hospedado. Defina `DATABASE_URL` e `AI_DATABASE_URL` com a connection string do projeto. Migrations podem ser aplicadas no host com essa URL.
- **Postgres do compose:** Use `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres` após `docker compose up -d`. Auth continua via Supabase (NEXT_PUBLIC_*); dados ficam no Postgres local.

## SUPHO

- Migração: `007_supho.sql` (tabelas de diagnóstico, PAIP, rituais, certificação).
- Script: `npm run db:migrate:supho` ou `bash scripts/apply-migration-007.sh`.
- Painel: **SUPHO → Painel de Maturidade** (`/app/supho/maturidade`).
- Cálculo de resultado: `POST /api/supho/diagnostic/compute` com `{ "campaign_id": "..." }` (requer campanha com respondentes e respostas).
