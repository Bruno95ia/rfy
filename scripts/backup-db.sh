#!/usr/bin/env bash
# Backup do Postgres (local ou remoto) via DATABASE_URL.
# Uso: ./scripts/backup-db.sh [diretório_de_saída]
# Saída: backup_YYYYMMDD_HHMMSS.sql.gz
set -euo pipefail

cd "$(dirname "$0")/.." || exit 1

OUT_DIR="${1:-.}"
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/postgres}"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump não encontrado. Instale o client PostgreSQL (postgresql-client)."
  exit 1
fi

STAMP=$(date +%Y%m%d_%H%M%S)
FILE="${OUT_DIR}/backup_${STAMP}.sql.gz"
mkdir -p "$OUT_DIR"

echo "==> Backup em $FILE"
pg_dump "$DATABASE_URL" --no-owner --no-acl | gzip -9 > "$FILE"
echo "✓ Concluído. Tamanho: $(du -h "$FILE" | cut -f1)"
