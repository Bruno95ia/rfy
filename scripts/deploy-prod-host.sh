#!/usr/bin/env bash
# Deploy na VM (EC2): pull, build, reinicia Next em modo standalone na porta 3000.
# Uso: ./scripts/deploy-prod-host.sh
# Depois do restart, logs: tail -f /tmp/rfy-standalone.log

set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> git pull"
git pull origin main

echo "==> npm ci"
npm ci

echo "==> npm run build"
npm run build

echo "==> reiniciando standalone (porta 3000)"
# Síncrono: restart valida porta livre + health check; evita EADDRINUSE com processo antigo + deploy “OK” com build velho.
./scripts/restart-standalone-now.sh >> /tmp/rfy-standalone.log 2>&1
curl -sS -o /dev/null -w "HTTP %{http_code}\n" --max-time 5 http://127.0.0.1:3000/ || true
