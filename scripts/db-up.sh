#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.." || exit 1

POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:${POSTGRES_PASSWORD}@localhost:5432/postgres}"

DOCKER_OK=false
if command -v docker >/dev/null 2>&1; then
  echo "==> Subindo Postgres local (Docker)..."
  if docker compose up -d postgres 2>/dev/null; then
    echo "==> Aguardando Postgres ficar saudável..."
    for i in $(seq 1 40); do
      if docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
        echo "✓ Postgres pronto."
        DOCKER_OK=true
        break
      fi
      if [[ "$i" -eq 40 ]]; then
        echo "Erro: timeout ao aguardar Postgres."
        exit 1
      fi
      sleep 2
    done
  else
    echo ""
    echo "⚠ Não foi possível subir o Postgres com Docker."
    echo "  Mensagem comum: \"Cannot connect to the Docker daemon\" = Docker Desktop não está rodando."
    echo ""
    echo "  Para usar Postgres no Docker local:"
    echo "  1) Abra o Docker Desktop e aguarde iniciar por completo."
    echo "  2) Rode de novo: npm run db:up"
    echo ""
    exit 1
  fi
else
  echo "⚠ Docker não encontrado. Para Postgres local é necessário o Docker."
  echo "  Instale o Docker Desktop e rode: npm run db:up"
  exit 1
fi

echo "==> Aplicando schema e migrations..."
bash scripts/db-migrate.sh

echo "==> Banco pronto."
echo "DATABASE_URL: ${DATABASE_URL}"
