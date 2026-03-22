#!/usr/bin/env bash
# Para o processo na 3000, copia estáticos e sobe o standalone. Use após build.
set -e
cd "$(dirname "$0")/.."
echo "==> Liberando porta 3000..."
fuser -k 3000/tcp 2>/dev/null || true
sleep 2
echo "==> Copiando estáticos para standalone..."
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
[ -d public ] && cp -r public .next/standalone/ 2>/dev/null || true
echo "==> Iniciando servidor..."
exec ./scripts/start-standalone.sh
