#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.." || exit 1

POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:${POSTGRES_PASSWORD}@localhost:5432/postgres}"

echo "=== Aplicando schema + migrações até 003 ==="
bash scripts/db-migrate.sh --up-to 003_ai_benchmark_tables.sql
