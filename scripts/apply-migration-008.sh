#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.." || exit 1

POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:${POSTGRES_PASSWORD}@localhost:5432/postgres}"

echo "=== Aplicando migrações até 008 (perguntas padrão SUPHO) ==="
bash scripts/db-migrate.sh --up-to 008_supho_default_questions.sql
