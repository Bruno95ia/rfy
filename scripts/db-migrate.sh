#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.." || exit 1

usage() {
  cat <<'EOF'
Uso: bash scripts/db-migrate.sh [--up-to NOME_ARQUIVO.sql]

Aplica schema + migrations pendentes em Postgres via:
  1) psql local + DATABASE_URL, ou
  2) fallback automático para docker compose exec postgres psql.

Variáveis aceitas:
  DATABASE_URL   (default: postgresql://postgres:${POSTGRES_PASSWORD:-postgres}@localhost:5432/postgres)
EOF
}

UP_TO=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --up-to)
      [[ $# -lt 2 ]] && { echo "Erro: --up-to requer um valor."; exit 1; }
      UP_TO="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Erro: argumento desconhecido: $1"
      usage
      exit 1
      ;;
  esac
done

POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:${POSTGRES_PASSWORD}@localhost:5432/postgres}"

PSQL_MODE=""
if command -v psql >/dev/null 2>&1; then
  PSQL_MODE="host"
elif command -v docker >/dev/null 2>&1 && docker compose ps postgres >/dev/null 2>&1; then
  PSQL_MODE="docker"
else
  echo "psql e Docker indisponíveis. Tentando migrations via Node (DATABASE_URL em .env.local)..."
  if command -v node >/dev/null 2>&1 && [[ -f "$(dirname "$0")/db-migrate-node.js" ]]; then
    node "$(dirname "$0")/db-migrate-node.js" "$@" && exit 0
  fi
  echo "Erro: nem psql, nem Docker (postgres rodando), nem Node disponível para migrations."
  echo "  - Com Supabase: defina DATABASE_URL no .env.local e rode: npm run db:migrate"
  echo "  - Ou instale psql (Mac: brew install libpq) ou suba Docker e rode: npm run db:up"
  exit 1
fi

run_psql() {
  if [[ "$PSQL_MODE" == "host" ]]; then
    psql "$DATABASE_URL" "$@"
    return
  fi
  docker compose exec -T postgres psql -U postgres -d postgres "$@"
}

file_checksum() {
  local file="$1"
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | awk '{print $1}'
    return
  fi
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
    return
  fi
  echo "Erro: não foi possível calcular checksum (shasum/sha256sum ausente)."
  exit 1
}

sql_escape() {
  printf "%s" "$1" | sed "s/'/''/g"
}

if [[ "$PSQL_MODE" == "host" ]]; then
  echo "==> Banco alvo (DATABASE_URL): ${DATABASE_URL%%@*}@***"
else
  echo "==> Banco alvo: container docker 'postgres' (db: postgres)"
fi

mapfile -t MIGRATION_FILES < <(
  {
    printf '%s\n' "supabase/sql/schema.sql"
    find supabase/sql/migrations -maxdepth 1 -type f -name '*.sql' | sort
  } | sed '/^$/d'
)

if [[ ${#MIGRATION_FILES[@]} -eq 0 ]]; then
  echo "Nenhum arquivo de migração encontrado."
  exit 1
fi

run_psql -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
SQL

FOUND_UP_TO="false"
for file in "${MIGRATION_FILES[@]}"; do
  version="$(basename "$file")"
  checksum="$(file_checksum "$file")"
  version_sql="$(sql_escape "$version")"
  checksum_sql="$(sql_escape "$checksum")"

  existing_checksum="$(
    run_psql -v ON_ERROR_STOP=1 -At \
      -c "SELECT checksum FROM public.schema_migrations WHERE version = '$version_sql';"
  )"

  if [[ -n "$existing_checksum" ]]; then
    if [[ "$existing_checksum" != "$checksum" ]]; then
      echo "Erro: checksum divergente para $version."
      echo "Esperado no banco: $existing_checksum"
      echo "Arquivo atual:      $checksum"
      echo "Crie uma nova migração ao invés de editar uma já aplicada."
      exit 1
    fi
    echo "✓ $version (já aplicada)"
  else
    echo "→ Aplicando $version"
    {
      echo "BEGIN;"
      cat "$file"
      echo "INSERT INTO public.schema_migrations(version, checksum) VALUES ('$version_sql', '$checksum_sql');"
      echo "COMMIT;"
    } | run_psql -v ON_ERROR_STOP=1
    echo "✓ $version (ok)"
  fi

  if [[ -n "$UP_TO" && "$version" == "$UP_TO" ]]; then
    FOUND_UP_TO="true"
    break
  fi
done

if [[ -n "$UP_TO" && "$FOUND_UP_TO" != "true" ]]; then
  echo "Erro: arquivo definido em --up-to não encontrado: $UP_TO"
  exit 1
fi

echo "==> Migrações finalizadas com sucesso."
