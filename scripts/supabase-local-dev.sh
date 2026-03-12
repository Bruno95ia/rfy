#!/usr/bin/env bash
# Dev local: Postgres no Docker (5432) para dados + Supabase local só para Auth.
# Uso: npm run supabase:local

set -e
cd "$(dirname "$0")/.."

POSTGRES_URL="postgresql://postgres:${POSTGRES_PASSWORD:-postgres}@127.0.0.1:5432/postgres"

echo "==> Postgres no Docker (porta 5432)..."
if ! command -v docker >/dev/null 2>&1; then
  echo "    Docker não encontrado. Instale o Docker Desktop e rode o script de novo."
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "    O Docker daemon não está rodando."
  echo "    Abra o Docker Desktop, espere iniciar e rode: npm run supabase:local"
  exit 1
fi
if ! docker compose ps postgres 2>/dev/null | grep -q "Up"; then
  echo "    Subindo Postgres (docker compose up -d postgres)..."
  docker compose up -d postgres
  echo "    Aguardando Postgres..."
  for i in $(seq 1 30); do
    if docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then break; fi
    [ "$i" -eq 30 ] && { echo "    Timeout."; exit 1; }
    sleep 1
  done
fi

echo ""
echo "==> Supabase local (só Auth)..."
if ! npx supabase status >/dev/null 2>&1; then
  echo "    Iniciando Supabase local (Auth em Docker)..."
  npx supabase start
fi

echo ""
echo "==> Cole no .env.local (substitua as variáveis Supabase se já existirem):"
echo ""
STATUS=$(npx supabase status 2>/dev/null) || true
API_URL=$(echo "$STATUS" | grep -E "API URL" | sed -n 's/.*: *//p' | head -1)
ANON_KEY=$(echo "$STATUS" | grep -E "anon key" | sed -n 's/.*: *//p' | head -1)
SERVICE_ROLE=$(echo "$STATUS" | grep -E "service_role key" | sed -n 's/.*: *//p' | head -1)
if [ -n "$API_URL" ] && [ -n "$ANON_KEY" ]; then
  echo "NEXT_PUBLIC_SUPABASE_URL=$API_URL"
  echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY"
  echo "SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE:-cole_a_service_role_key_do_supabase_status}"
  echo "DATABASE_URL=$POSTGRES_URL"
  echo "AI_DATABASE_URL=$POSTGRES_URL"
  echo ""
  echo "    (Copie as linhas acima para o .env.local e reinicie: npm run dev)"
else
  echo "    Rode: npx supabase status"
  echo "    Copie API URL, anon key e service_role key para o .env.local."
  echo "    DATABASE_URL=$POSTGRES_URL"
  echo "    AI_DATABASE_URL=$POSTGRES_URL"
fi
echo ""

export DATABASE_URL="${DATABASE_URL:-$POSTGRES_URL}"
export AI_DATABASE_URL="${AI_DATABASE_URL:-$DATABASE_URL}"

echo "==> Aplicando schema e migrations no Postgres (porta 5432)..."
npm run db:migrate:node

echo ""
echo "==> Criando usuário demo (admin@demo.rfy.local / Adminrv)..."
echo "    (Requer NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local)"
if npm run db:seed:admin 2>/dev/null; then
  echo "    Demo criado com sucesso."
else
  echo "    Se falhou: adicione ao .env.local a API URL e as keys do 'npx supabase status' e rode: npm run db:seed:admin"
fi

echo ""
echo "==> Pronto. Banco: Postgres Docker (5432). Auth: Supabase local."
echo "    Studio: http://127.0.0.1:54323"
echo "    App: npm run dev → http://localhost:3000"
echo "    Login: admin@demo.rfy.local / Adminrv"
