#!/usr/bin/env bash
# Sobe Postgres com Docker Compose, espera ficar saudável e aplica todas as migrations.
# Uso: bash scripts/docker-up-and-migrate.sh
# Requer: Docker ativo (docker compose disponível)

set -euo pipefail

cd "$(dirname "$0")/.." || exit 1

echo "==> Subindo Postgres (docker compose up -d postgres)..."
docker compose up -d postgres

echo "==> Aguardando Postgres ficar pronto..."
for i in {1..30}; do
  if docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
    echo "    Postgres pronto."
    break
  fi
  if [[ $i -eq 30 ]]; then
    echo "Erro: Postgres não respondeu a tempo."
    exit 1
  fi
  sleep 1
done

echo "==> Aplicando schema e migrations..."
bash scripts/db-migrate.sh

echo ""
echo "==> Concluído. Banco pronto em localhost:5432 (user: postgres, password: postgres)."
echo "    Para seed demo: DEMO_USER_ID=<uuid> npm run db:seed"
