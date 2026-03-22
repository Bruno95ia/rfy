#!/usr/bin/env bash
# Para o container rfy-app (se estiver rodando), libera a porta 3000 e sobe a app em modo standalone no host.
# Uso: ./scripts/restart-app-on-host.sh
# Requer: sudo para docker (pare o container manualmente se preferir: sudo docker stop rfy-app)

set -e
cd "$(dirname "$0")/.."

echo "==> Parando container rfy-app (libera porta 3000)..."
sudo docker stop rfy-app 2>/dev/null || true
sleep 2

echo "==> Carregando .env.local e variáveis..."
[ -f .env.local ] && set -a && source .env.local && set +a
[ -f .env ] && set -a && source .env && set +a
export NODE_TLS_REJECT_UNAUTHORIZED="${NODE_TLS_REJECT_UNAUTHORIZED:-0}"

echo "==> Iniciando app na porta 3000 (standalone)..."
exec PORT=3000 NODE_ENV=production node .next/standalone/server.js
