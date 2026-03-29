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
nohup ./scripts/restart-standalone-now.sh >> /tmp/rfy-standalone.log 2>&1 &
sleep 3
if ss -tlnp | grep -q ':3000'; then
  echo "OK: escuta em :3000"
  curl -sS -o /dev/null -w "HTTP %{http_code}\n" --max-time 5 http://127.0.0.1:3000/ || true
else
  echo "ERRO: nada em :3000 — veja /tmp/rfy-standalone.log"
  exit 1
fi
