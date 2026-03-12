#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.." || exit 1

echo "==> Parando serviços de dados..."
docker compose stop postgres redis mlflow 2>/dev/null || true
echo "✓ Serviços parados."

echo ""
echo "Se quiser remover dados locais também, execute:"
echo "docker compose down -v"
