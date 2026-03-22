#!/usr/bin/env bash
# Sobe a app Next.js (standalone) na porta 3000, acessível pelo IP.
# Copia .next/static e public para o standalone para que CSS/JS carreguem.
# Uso: ./scripts/start-standalone.sh   ou   nohup ./scripts/start-standalone.sh > .next-standalone.log 2>&1 &

set -e
cd "$(dirname "$0")/.."

# Standalone não inclui estáticos por padrão; copiar para evitar 404 em CSS/JS
if [ -d .next/static ] && [ -d .next/standalone/.next ]; then
  cp -r .next/static .next/standalone/.next/
fi
if [ -d public ]; then
  cp -r public .next/standalone/ 2>/dev/null || true
fi

[ -f .env ] && set -a && source .env && set +a
[ -f .env.local ] && set -a && source .env.local && set +a
export NODE_TLS_REJECT_UNAUTHORIZED="${NODE_TLS_REJECT_UNAUTHORIZED:-0}"
export PORT=3000
export NODE_ENV=production

echo "Iniciando em http://0.0.0.0:3000 (acessível pelo IP)"
exec node .next/standalone/server.js
